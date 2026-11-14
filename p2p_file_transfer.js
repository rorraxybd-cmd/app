const CLOUD_SIZE_LIMIT_MB = 50; 

// ৪৮ ঘণ্টা (48 hours) পুরনো মেসেজ ও এটাচমেন্ট অটো রিমুভ করার ফাংশন
function cleanupExpiredMessages() {
    const EXPIRATION_TIME = 48 * 60 * 60 * 1000; // ৪৮ ঘণ্টা মিলিসেকেন্ডে
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

// ইউনিভার্সাল ফাইল আপলোড হ্যান্ডলার (ক্লাউড বনাম P2P রাউটিং)
async function handleUniversalFileUpload(input) {
    if (!currentActiveRecipient || !input.files.length) return;
    const key = normPhone(currentActiveRecipient.phone), me = getActiveProfile().phone;
    if (!localMessageStore[key]) localMessageStore[key] = [];

    for (const f of input.files) {
        const fileSizeMB = f.size / (1024 * 1024);

        if (fileSizeMB <= CLOUD_SIZE_LIMIT_MB) {
            // ৫০ এমবির নিচে হলে ক্লাউড স্টোরেজ ও ইমেজ কম্প্রেশন
            await uploadFileViaCloudStorage(f, key, me);
        } else {
            // ৫০ এমবি থেকে কয়েক জিবি (GB) পর্যন্ত ফাইল হলে সরাসরি P2P ট্রান্সফার
            showToast(`Large file (${fileSizeMB.toFixed(1)}MB). Initiating direct P2P transfer...`, true);
            await initiateP2PFileTransfer(f, key);
        }
    }
    input.value = '';
}

async function uploadFileViaCloudStorage(file, recipientKey, senderPhone) {
    const isImage = file.type.startsWith('image/');
    const type = isImage ? 'image' : (file.type.startsWith('video/') ? 'video' : 'file');
    
    // ছবি হলে কম্প্রেস করে সর্বনিম্ন KB-তে নামিয়ে আনা
    if (isImage) {
        compressAndSendImage(file, recipientKey, senderPhone);
        return;
    }

    const reader = new FileReader();
    reader.onload = async e => {
        const mediaUrl = e.target.result;
        const msg = { 
            id: 'm_' + Date.now() + Math.random(), 
            phone_number: senderPhone, 
            message_text: file.name, 
            media_url: mediaUrl, 
            type,
            timestamp: Date.now() 
        };
        localMessageStore[recipientKey].push(msg);
        appendBubble(msg);
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
            const MAX_DIM = 500;
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
            
            // হাই কোয়ালিটি রেখে KB-তে রূপান্তর
            const compressedUrl = canvas.toDataURL('image/jpeg', 0.8);
            const msg = { 
                id: 'm_' + Date.now() + Math.random(), 
                phone_number: senderPhone, 
                message_text: file.name, 
                media_url: compressedUrl, 
                type: 'image',
                timestamp: Date.now() 
            };
            localMessageStore[recipientKey].push(msg);
            appendBubble(msg);
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

// নিখুঁত P2P ডেটা চ্যানেল ফাইল ট্রান্সফার (বড় ফাইলের জন্য সার্ভার স্টোরেজ বাইপাস)
async function initiateP2PFileTransfer(file, recipientKey) {
    try {
        const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
        const channel = pc.createDataChannel("salaam-p2p-file", { ordered: true });
        
        channel.binaryType = "arraybuffer";
        channel.onopen = () => {
            showToast("P2P Tunnel connected! Sending large file directly...");
            const CHUNK_SIZE = 16384; // ১৬KB চংক সাইজ
            const reader = new FileReader();
            let offset = 0;

            reader.onload = e => {
                channel.send(e.target.result);
                offset += e.target.result.byteLength;
                if (offset < file.size) {
                    readNextChunk();
                } else {
                    showToast("P2P File Transfer Completed Successfully!");
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
        showToast("P2P transfer failed. Try smaller file.", true);
    }
}
