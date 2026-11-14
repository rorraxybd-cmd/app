const CLOUD_SIZE_LIMIT_MB = 50; 

async function handleUniversalFileUpload(input) {
    if (!currentActiveRecipient || !input.files.length) return;
    const key = normPhone(currentActiveRecipient.phone), me = getActiveProfile().phone;
    if (!localMessageStore[key]) localMessageStore[key] = [];

    for (const f of input.files) {
        const fileSizeMB = f.size / (1024 * 1024);

        if (fileSizeMB <= CLOUD_SIZE_LIMIT_MB) {
            await uploadFileViaCloudStorage(f, key, me);
        } else {
            showToast(`Large file (${fileSizeMB.toFixed(1)}MB). Initiating direct P2P transfer...`);
            await initiateP2PFileTransfer(f, key);
        }
    }
    input.value = '';
}

async function uploadFileViaCloudStorage(file, recipientKey, senderPhone) {
    const type = file.type.startsWith('image/') ? 'image' : (file.type.startsWith('video/') ? 'video' : 'file');
    const reader = new FileReader();
    
    reader.onload = async e => {
        const mediaUrl = e.target.result;
        const msg = { id: 'm_' + Date.now() + Math.random(), phone_number: senderPhone, message_text: file.name, media_url: mediaUrl, type };
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

async function initiateP2PFileTransfer(file, recipientKey) {
    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    const channel = pc.createDataChannel("salaam-p2p-file", { ordered: true });
    
    channel.binaryType = "arraybuffer";
    channel.onopen = () => {
        showToast("P2P Tunnel connected! Sending file directly...");
        const CHUNK_SIZE = 16384;
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
}
