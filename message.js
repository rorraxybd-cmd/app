// message.js - Professional Chat & Media Messaging Module (Final)
let chatPollInterval = null;
let localMessageStore = JSON.parse(localStorage.getItem('salaam_messages_v18') || '{}');
let deletedMessageIds = JSON.parse(localStorage.getItem('salaam_deleted_ids_v18') || '[]');
let chatClearTimestamps = JSON.parse(localStorage.getItem('salaam_clear_ts_v18') || '{}');

function persistMessages() { localStorage.setItem('salaam_messages_v18', JSON.stringify(localMessageStore)); }

async function sendTextMessage() {
    if (!currentActiveRecipient) return;
    const inp = document.getElementById('messageInput');
    const text = inp.value.trim();
    if (!text) return;
    inp.value = '';
    
    const key = normPhone(currentActiveRecipient.phone), me = normPhone(getActiveProfile().phone);
    if (!localMessageStore[key]) localMessageStore[key] = [];
    
    const msgId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    const msg = { id: msgId, phone_number: me, message_text: text, media_url: '', type: 'text', timestamp: Date.now() };
    localMessageStore[key].push(msg);
    loadMessages();
    persistMessages();

    try {
        await fetch('/api/chat?action=send_chat_message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sender_phone: me, receiver_phone: key, message_text: text, media_url: '', message_type: 'text' })
        });
    } catch (e) {}
}

async function handleUniversalFileUpload(fileInputElem) {
    const files = fileInputElem.files;
    if (!files || files.length === 0 || !currentActiveRecipient) return;

    Array.from(files).forEach(file => {
        if (file.size > 25 * 1024 * 1024) {
            if (typeof showToast === 'function') showToast("ফাইলের সাইজ ২৫ মেগাবাইটের কম হতে হবে", true);
            return;
        }

        let fileType = 'file';
        if (file.type.startsWith('image/')) fileType = 'image';
        else if (file.type.startsWith('video/')) fileType = 'video';
        else if (file.type.startsWith('audio/')) fileType = 'audio';

        const reader = new FileReader();
        reader.onload = async function(e) {
            const base64Data = e.target.result;
            const me = normPhone(getActiveProfile().phone);
            const key = normPhone(currentActiveRecipient.phone);
            if (!localMessageStore[key]) localMessageStore[key] = [];

            const msgId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
            const msg = { id: msgId, phone_number: me, message_text: file.name, media_url: base64Data, type: fileType, timestamp: Date.now() };

            localMessageStore[key].push(msg);
            loadMessages();
            persistMessages();

            try {
                await fetch('/api/chat?action=send_chat_message', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sender_phone: me, receiver_phone: key, message_text: file.name, media_url: base64Data, message_type: fileType, file_size: file.size })
                });
            } catch (err) {}
        };
        reader.readAsDataURL(file);
    });
    fileInputElem.value = '';
}

function openMediaLightbox(mediaUrl, mediaType) {
    document.getElementById('mediaLightboxModal')?.remove();
    const modal = document.createElement('div');
    modal.id = 'mediaLightboxModal';
    modal.className = 'fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-4';
    
    let contentHtml = mediaType === 'image' ? `<img src="${mediaUrl}" class="max-w-full max-h-[85vh] rounded-2xl object-contain border border-amber-400/30">` : `<video src="${mediaUrl}" controls autoplay class="max-w-full max-h-[85vh] rounded-2xl border border-amber-400/30"></video>`;

    modal.innerHTML = `
        <div class="absolute top-4 right-4 flex items-center space-x-3 z-50">
            <a href="${mediaUrl}" download class="px-4 py-2 rounded-xl gold-btn text-xs font-bold flex items-center space-x-2 shadow-lg cursor-pointer"><i class="fa-solid fa-download"></i> <span>ডাউনলোড</span></a>
            <button onclick="document.getElementById('mediaLightboxModal').remove()" class="w-10 h-10 rounded-xl bg-white/10 text-white flex items-center justify-center cursor-pointer"><i class="fa-solid fa-xmark text-lg"></i></button>
        </div>
        <div class="w-full h-full flex items-center justify-center p-2" onclick="document.getElementById('mediaLightboxModal').remove()">
            <div onclick="event.stopPropagation()">${contentHtml}</div>
        </div>
    `;
    document.body.appendChild(modal);
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
            loadMessages();
            if (typeof showToast === 'function') showToast("ডাউনলোড সম্পন্ন হয়েছে ও সার্ভার স্টোরেজ খালি করা হয়েছে");
        }
    }, 1000);
}

function loadMessages() {
    const container = document.getElementById('chatMessages');
    if (!container || !currentActiveRecipient) return;
    const key = normPhone(currentActiveRecipient.phone);
    const clearTs = chatClearTimestamps[key] || 0;
    let msgs = (localMessageStore[key] || []).filter(m => !(m.timestamp <= clearTs || (m.id && deletedMessageIds.includes(m.id))));
    
    if (msgs.length === 0) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center space-y-3 max-w-xs text-center m-auto">
                <p class="text-sm font-bold gold-gradient-text">কোনো মেসেজ নেই</p>
                <p class="text-[11px] text-gray-400">মেসেজ বা কল শুরু করুন।</p>
            </div>`;
        return;
    }

    container.innerHTML = msgs.map((m, idx) => {
        const isMe = normPhone(m.phone_number) === normPhone(getActiveProfile().phone);
        const timeStr = new Date(m.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        let contentHtml = `<p class="text-xs text-white break-words">${escapeHtml(m.message_text || '')}</p>`;
        
        if (m.media_url) {
            if (m.type === 'image') {
                contentHtml = `<img src="${m.media_url}" onclick="openMediaLightbox('${m.media_url}', 'image')" class="rounded-xl max-w-xs max-h-52 object-cover cursor-pointer">`;
            } else if (m.type === 'video') {
                contentHtml = `<video src="${m.media_url}" controls class="rounded-xl max-w-xs max-h-52"></video>`;
            }
        }

        return `
        <div class="flex flex-col ${isMe ? 'items-end' : 'items-start'} my-1.5 px-2">
            <div class="max-w-[80%] px-3.5 py-2.5 rounded-2xl ${isMe ? 'chat-bubble-me' : 'chat-bubble-them'} shadow-lg relative">
                ${contentHtml}
                <span class="text-[9px] text-gray-400 block text-right mt-1">${timeStr}</span>
            </div>
        </div>`;
    }).join('');
    container.scrollTop = container.scrollHeight;
}
