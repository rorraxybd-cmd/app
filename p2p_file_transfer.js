const CLOUD_SIZE_LIMIT_MB = 50; 

function cleanupExpiredMessages() {
    const EXPIRATION_TIME = 48 * 60 * 60 * 1000; 
    const now = Date.now();
    let updated = false;

    for (const key in localMessageStore) {
        if (Array.isArray(localMessageStore[key])) {
            const originalLen = localMessageStore[key].length;
            localMessageStore[key] = localMessageStore[key].filter(m => {
                if (!m.timestamp) return true;
                return (now - m.timestamp) < EXPIRATION_TIME;
            });
            if (localMessageStore[key].length !== originalLen) {
                updated = true;
            }
        }
    }
    if (updated) {
        persistMessages();
    }
}

async function handleUniversalFileUpload(input) {
    if (!currentActiveRecipient || !input.files.length) return;
    const key = normPhone(currentActiveRecipient.phone), me = getActiveProfile().phone;
    if (!localMessageStore[key]) localMessageStore[key] = [];

    for (const f of input.files) {
        const fileSizeMB = f.size / (1024 * 1024);

        if (fileSizeMB <= CLOUD_SIZE_LIMIT_MB) {
            await uploadFileViaCloudStorage(f, key, me);
        } else {
            showToast(`Large file (${fileSizeMB.toFixed(1)}MB). Initiating direct P2P transfer...`, true);
            await initiateP2PFileTransfer(f, key);
        }
    }
    input.value = '';
}

async function uploadFileViaCloudStorage(file, recipientKey, senderPhone) {
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    const isAudio = file.type.startsWith('audio/');
    
    let type = 'file';
    if (isImage) type = 'image';
    else if (isVideo) type = 'video';
    else if (isAudio) type = 'audio';

    if (isImage) {
        compressAndSendImage(file, recipientKey, senderPhone);
        return;
    }

    const reader = new FileReader();
    reader.onload = async e => {
        const mediaUrl = e.target.result;
        const msgId = 'm_' + Date.now() + '_' + Math.random();
        const msg = { 
            id: msgId, 
            phone_number: senderPhone, 
            message_text: file.name, 
            media_url: mediaUrl, 
            type,
            timestamp: Date.now() 
        };
        localMessageStore[recipientKey].push(msg);
        loadMessages();
        persistMessages();

        try {
            await fetch('/api/chat?action=send_chat_message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sender_phone: senderPhone, receiver_phone: recipientKey, message_text: file.name, media_url: mediaUrl, message_type: type, file_size: file.size })
            });
        } catch (err) {}
    };
    reader.readAsDataURL(file);
}

function compressAndSendImage(file, recipientKey, senderPhone) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = async function() {
            const canvas = document.createElement('canvas');
            const MAX_DIM = 600;
            let width = img.width, height = img.height;
            if (width > height) {
                if (width > MAX_DIM) { height *= MAX_DIM / width; width = MAX_DIM; }
            } else {
                if (height > MAX_DIM) { width *= MAX_DIM / height; height = MAX_DIM; }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            const compressedUrl = canvas.toDataURL('image/jpeg', 0.82);
            const msgId = 'm_' + Date.now() + '_' + Math.random();
            const msg = { 
                id: msgId, 
                phone_number: senderPhone, 
                message_text: file.name, 
                media_url: compressedUrl, 
                type: 'image',
                timestamp: Date.now() 
            };
            localMessageStore[recipientKey].push(msg);
            loadMessages();
            persistMessages();

            try {
                await fetch('/api/chat?action=send_chat_message', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sender_phone: senderPhone, receiver_phone: recipientKey, message_text: file.name, media_url: compressedUrl, message_type: 'image', file_size: file.size })
                });
            } catch (err) {}
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

async function initiateP2PFileTransfer(file, recipientKey) {
    const recipient = deviceContacts.find(c => normPhone(c.phone) === normPhone(recipientKey));
    if (!recipient || !recipient.isOnline) {
        showToast("প্রাপক (Receiver) বর্তমানে অফলাইনে আছেন। P2P ফাইল পাঠানোর জন্য তাকে অনলাইনে থাকতে হবে।", true);
        return;
    }

    try {
        showToast("Establishing direct P2P connection...");
        const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
        
        pc.oniceconnectionstatechange = () => {
            if (pc.iceconnectionstate === 'failed' || pc.iceconnectionstate === 'disconnected') {
                showToast("P2P কানেকশন স্থাপন করা যায়নি। প্রাপক হয়তো চ্যাট স্ক্রিন থেকে বের হয়ে গেছেন।", true);
            }
        };

        const channel = pc.createDataChannel("salaam-p2p-file", { ordered: true });
        
        channel.binaryType = "arraybuffer";
        channel.onopen = () => {
            showToast("P2P টানেল সংযুক্ত হয়েছে! সরাসরি ফাইল পাঠানো হচ্ছে...");
            const CHUNK_SIZE = 16384;
            const reader = new FileReader();
            let offset = 0;

            reader.onload = e => {
                channel.send(e.target.result);
                offset += e.target.result.byteLength;
                if (offset < file.size) {
                    readNextChunk();
                } else {
                    showToast("P2P ফাইল ট্রান্সফার সফলভাবে সম্পন্ন হয়েছে!");
                }
            };

            function readNextChunk() {
                const slice = file.slice(offset, offset + CHUNK_SIZE);
                reader.readAsArrayBuffer(slice);
            }
            readNextChunk();
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
    } catch (err) {
        showToast("P2P ট্রান্সফারে ত্রুটি ঘটেছে। আবার চেষ্টা করুন।", true);
    }
}
