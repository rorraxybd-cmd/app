// transfer.js - Professional File & Media Transfer Module

async function handleMediaUpload(fileInputElem, type) {
    const file = fileInputElem.files[0];
    if (!file || !currentActiveRecipient) return;

    if (file.size > 15 * 1024 * 1024) {
        if (typeof showToast === 'function') showToast("File size should be less than 15MB", true);
        return;
    }

    const reader = new FileReader();
    reader.onload = async function(e) {
        const base64Data = e.target.result;
        const me = normPhone(getActiveProfile().phone);
        const key = normPhone(currentActiveRecipient.phone);
        
        if (!localMessageStore[key]) localMessageStore[key] = [];

        const msgId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
        const msg = {
            id: msgId,
            phone_number: me,
            message_text: file.name,
            media_url: base64Data,
            type: type, // 'image', 'video', 'file'
            timestamp: Date.now()
        };

        localMessageStore[key].push(msg);
        if (typeof loadMessages === 'function') loadMessages();
        persistMessages();

        try {
            const res = await fetch('/api/chat?action=send_chat_message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sender_phone: me,
                    receiver_phone: key,
                    message_text: file.name,
                    media_url: base64Data,
                    message_type: type,
                    file_size: file.size
                })
            });
            const data = await res.json();
            if (data.success && data.message_id) {
                msg.id = data.message_id;
                persistMessages();
            }
        } catch (err) {
            if (typeof showToast === 'function') showToast("Failed to upload media", true);
        }
    };
    reader.readAsDataURL(file);
}

async function autoDeleteAfterDownload(key, index) {
    setTimeout(async () => {
        if (localMessageStore[key] && localMessageStore[key][index]) {
            const msg = localMessageStore[key][index];
            if (msg.id) {
                if (!deletedMessageIds.includes(msg.id)) {
                    deletedMessageIds.push(msg.id);
                    localStorage.setItem('salaam_deleted_ids_v18', JSON.stringify(deletedMessageIds));
                }
                try {
                    await fetch('/api/chat?action=download_and_delete_media', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ message_id: msg.id })
                    });
                } catch (e) {}
            }
            localMessageStore[key].splice(index, 1);
            persistMessages();
            if (typeof loadMessages === 'function') loadMessages();
            if (typeof showToast === 'function') showToast("Downloaded & removed from server");
        }
    }, 1000);
}
