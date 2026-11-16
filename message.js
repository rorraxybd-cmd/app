// message.js - Professional Chat & Media Messaging Module (All-in-One Complete & Optimized)
let chatPollInterval = null;
let localMessageStore = JSON.parse(localStorage.getItem('salaam_messages_v18') || '{}');
let deletedMessageIds = JSON.parse(localStorage.getItem('salaam_deleted_ids_v18') || '[]');
let chatClearTimestamps = JSON.parse(localStorage.getItem('salaam_clear_ts_v18') || '{}');

function persistMessages() { 
    localStorage.setItem('salaam_messages_v18', JSON.stringify(localMessageStore)); 
}

function normPhone(p) {
    return String(p || '').replace(/[\s\-\(\)\+]/g, '');
}

function getActiveProfile() {
    try {
        const profiles = JSON.parse(localStorage.getItem('message_profiles_v18') || '[{}]');
        return profiles[0] || { phone: '' };
    } catch (e) {
        return { phone: '' };
    }
}

function escapeHtml(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function toggleSendButton() {
    const inp = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');
    if (!inp || !sendBtn) return;
    
    // সেন্ড বাটন সবসময় দৃশ্যমান ও সক্রিয় রাখার জন্য flex ক্লাস নিশ্চিত করা হলো
    sendBtn.classList.remove('hidden');
    sendBtn.classList.add('flex');
}

// ইনপুটে কিছু লেখার সাথে সাথেই টগল চালু করা
document.addEventListener('DOMContentLoaded', () => {
    const inp = document.getElementById('messageInput');
    if (inp) {
        inp.addEventListener('input', toggleSendButton);
    }
});

async function sendTextMessage() {
    if (!currentActiveRecipient) {
        if (typeof showToast === 'function') showToast("কোনো চ্যাট সিলেক্ট করা নেই!", true);
        return;
    }
    const inp = document.getElementById('messageInput');
    const text = inp.value.trim();
    if (!text) return;
    inp.value = '';
    toggleSendButton();
    
    const key = normPhone(currentActiveRecipient.phone), me = normPhone(getActiveProfile().phone);
    if (!localMessageStore[key]) localMessageStore[key] = [];
    
    const msgId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    const msg = { id: msgId, phone_number: me, message_text: text, media_url: '', type: 'text', timestamp: Date.now() };
    localMessageStore[key].push(msg);
    loadMessages();
    persistMessages();

    try {
        const res = await fetch('/api/chat?action=send_chat_message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sender_phone: me, receiver_phone: key, message_text: text, media_url: '', message_type: 'text' })
        });
        const data = await res.json();
        if (data.success && data.message_id) {
            msg.id = data.message_id;
            persistMessages();
        }
    } catch (e) {}
}

// -------------------------------------------------------------
// FILE & MEDIA TRANSFER LOGIC (Integrated from transfer.js)
// -------------------------------------------------------------
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
            const msg = {
                id: msgId,
                phone_number: me,
                message_text: file.name,
                media_url: base64Data,
                type: fileType, // 'image', 'video', 'audio', 'file'
                timestamp: Date.now()
            };

            localMessageStore[key].push(msg);
            loadMessages();
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
                        message_type: fileType,
                        file_size: file.size
                    })
                });
                const data = await res.json();
                if (data.success && data.message_id) {
                    msg.id = data.message_id;
                    persistMessages();
                }
            } catch (err) {
                if (typeof showToast === 'function') showToast("মিডিয়া আপলোড ব্যর্থ হয়েছে", true);
            }
        };
        reader.readAsDataURL(file);
    });
    
    fileInputElem.value = '';
}

// ফুলস্ক্রিন ইমেজ বা ভিডিও প্রিভিউ লাইটবক্স মোডাল
function openMediaLightbox(mediaUrl, mediaType) {
    let existingModal = document.getElementById('mediaLightboxModal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.id = 'mediaLightboxModal';
    modal.className = 'fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-4';
    
    let contentHtml = '';
    if (mediaType === 'image') {
        contentHtml = `<img src="${mediaUrl}" class="max-w-full max-h-[85vh] rounded-2xl object-contain border border-amber-400/30 shadow-2xl">`;
    } else if (mediaType === 'video') {
        contentHtml = `<video src="${mediaUrl}" controls autoplay class="max-w-full max-h-[85vh] rounded-2xl border border-amber-400/30 shadow-2xl"></video>`;
    }

    modal.innerHTML = `
        <div class="absolute top-4 right-4 flex items-center space-x-3 z-50">
            <a href="${mediaUrl}" download class="px-4 py-2 rounded-xl gold-btn text-xs font-bold flex items-center space-x-2 shadow-lg cursor-pointer">
                <i class="fa-solid fa-download"></i> <span>ডাউনলোড</span>
            </a>
            <button onclick="document.getElementById('mediaLightboxModal').remove()" class="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition">
                <i class="fa-solid fa-xmark text-lg"></i>
            </button>
        </div>
        <div class="w-full h-full flex items-center justify-center p-2" onclick="document.getElementById('mediaLightboxModal').remove()">
            <div onclick="event.stopPropagation()">
                ${contentHtml}
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// সার্ভার থেকে স্টোরেজ বাঁচাতে ডাউনলোড করার পর অটো রিমুভ অপ্টিমাইজেশন
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

async function fetchMessagesFromCloud() {
    if (!currentActiveRecipient) return;
    const me = normPhone(getActiveProfile().phone);
    const key = normPhone(currentActiveRecipient.phone);
    try {
        const res = await fetch(`/api/chat?action=get_chat_messages&phone=${encodeURIComponent(key)}&my_phone=${encodeURIComponent(me)}`);
        if (res.ok) {
            const data = await res.json();
            if (data.success && Array.isArray(data.messages)) {
                if (!localMessageStore[key]) localMessageStore[key] = [];
                let updated = false;
                const clearTs = chatClearTimestamps[key] || 0;

                data.messages.forEach(m => {
                    const sender = normPhone(m.sender_phone);
                    const mId = m.id || ('m_' + (m.timestamp || Date.now()));
                    const mTimestamp = m.timestamp || Date.now();
                    
                    if (mTimestamp <= clearTs || deletedMessageIds.includes(mId)) return;

                    const mText = (m.message_text || '').trim();
                    const mUrl = m.media_url && m.media_url !== 'undefined' ? m.media_url : '';
                    const mType = m.message_type || (mUrl ? (mUrl.startsWith('data:video/') ? 'video' : (mUrl.startsWith('data:image/') ? 'image' : 'file')) : 'text');
                    
                    const exists = localMessageStore[key].some(existing => 
                        (existing.id && existing.id === mId) || 
                        (normPhone(existing.phone_number) === sender && (existing.message_text || '').trim() === mText && (existing.media_url || '') === mUrl)
                    );

                    if (!exists && (mText || mUrl)) {
                        localMessageStore[key].push({
                            id: mId,
                            phone_number: sender,
                            message_text: mText,
                            media_url: mUrl,
                            type: mType,
                            timestamp: mTimestamp
                        });
                        updated = true;
                    }
                });
                if (updated) { persistMessages(); loadMessages(); }
            }
        }
    } catch (e) {}
}

function startChatPolling() {
    if (chatPollInterval) clearInterval(chatPollInterval);
    chatPollInterval = setInterval(() => { if (currentActiveRecipient) fetchMessagesFromCloud(); }, 2000);
}

function deleteSingleMessage(key, index) {
    if (localMessageStore[key] && localMessageStore[key][index]) {
        const msg = localMessageStore[key][index];
        if (msg.id) {
            if (!deletedMessageIds.includes(msg.id)) {
                deletedMessageIds.push(msg.id);
                localStorage.setItem('salaam_deleted_ids_v18', JSON.stringify(deletedMessageIds));
            }
            fetch('/api/chat?action=delete_message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message_id: msg.id })
            }).catch(e => {});
        }
        localMessageStore[key].splice(index, 1);
        persistMessages();
        loadMessages();
        if (typeof showToast === 'function') showToast("ডিলিট সফল হয়েছে");
    }
}

function confirmClearChatHistory() {
    if (!currentActiveRecipient) return;
    const key = normPhone(currentActiveRecipient.phone);
    
    chatClearTimestamps[key] = Date.now();
    localStorage.setItem('salaam_clear_ts_v18', JSON.stringify(chatClearTimestamps));

    if (localMessageStore[key]) {
        localMessageStore[key].forEach(m => {
            if (m.id && !deletedMessageIds.includes(m.id)) {
                deletedMessageIds.push(m.id);
            }
        });
        localStorage.setItem('salaam_deleted_ids_v18', JSON.stringify(deletedMessageIds));
    }
    delete localMessageStore[key];
    persistMessages();
    loadMessages();
    if (typeof showToast === 'function') showToast("চ্যাট হিস্ট্রি ক্লিয়ার করা হয়েছে");
}

function loadMessages() {
    const container = document.getElementById('chatMessages');
    if (!container || !currentActiveRecipient) return;
    const key = normPhone(currentActiveRecipient.phone);
    const clearTs = chatClearTimestamps[key] || 0;
    let msgs = localMessageStore[key] || [];
    
    msgs = msgs.filter(m => !(m.timestamp <= clearTs || (m.id && deletedMessageIds.includes(m.id))));
    localMessageStore[key] = msgs;
    persistMessages();

    if (msgs.length === 0) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center space-y-3 max-w-xs text-center m-auto">
                <div class="w-14 h-14 rounded-2xl theme-card flex items-center justify-center border border-amber-400/20 shadow-lg">
                    <svg class="w-7 h-7 text-amber-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                </div>
                <p class="text-sm font-bold gold-gradient-text">কোনো মেসেজ নেই</p>
                <p class="text-[11px] text-gray-400">${escapeHtml(currentActiveRecipient.name)} এর সাথে মেসেজ বা কল শুরু করুন।</p>
            </div>`;
        return;
    }

    container.innerHTML = msgs.map((m, idx) => {
        const isMe = normPhone(m.phone_number) === normPhone(getActiveProfile().phone);
        let contentHtml = '';
        const timeStr = new Date(m.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        if (m.type === 'text' || !m.media_url) {
            contentHtml = `
            <div class="flex flex-col space-y-1">
                <p class="text-xs text-white leading-relaxed break-words">${escapeHtml(m.message_text || '')}</p>
                <div class="flex items-center justify-end space-x-1.5 mt-0.5">
                    <span class="text-[9px] text-gray-400 font-medium">${timeStr}</span>
                    <button onclick="deleteSingleMessage('${key}', ${idx})" class="text-red-400/70 hover:text-red-400 text-[9px] cursor-pointer" title="Delete"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>`;
        } else {
            if (m.type === 'image') {
                contentHtml = `
                <div class="relative group my-1">
                    <img src="${m.media_url}" onclick="openMediaLightbox('${m.media_url}', 'image')" class="rounded-xl max-w-xs max-h-52 object-cover border border-white/10 shadow-md cursor-pointer hover:opacity-95 transition" title="বড় করে দেখতে ক্লিক করুন">
                    <div class="absolute top-2 right-2 flex space-x-1.5 bg-black/60 backdrop-blur-sm rounded-lg p-1.5">
                        <a href="${m.media_url}" download="${escapeHtml(m.message_text || 'image.jpg')}" onclick="autoDeleteAfterDownload('${key}', ${idx})" class="p-1 text-amber-300 hover:text-white text-xs cursor-pointer" title="ডাউনলোড"><i class="fa-solid fa-download"></i></a>
                        <button onclick="deleteSingleMessage('${key}', ${idx})" class="p-1 text-red-400 hover:text-red-300 text-xs cursor-pointer" title="ডিলিট"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>`;
            } else if (m.type === 'video') {
                contentHtml = `
                <div class="relative my-1">
                    <video src="${m.media_url}" controls onclick="openMediaLightbox('${m.media_url}', 'video')" class="rounded-xl max-w-xs max-h-52 border border-white/10 shadow-md"></video>
                    <div class="absolute top-2 right-2 flex space-x-1.5 bg-black/60 backdrop-blur-sm rounded-lg p-1.5">
                        <a href="${m.media_url}" download="${escapeHtml(m.message_text || 'video.mp4')}" onclick="autoDeleteAfterDownload('${key}', ${idx})" class="p-1 text-amber-300 hover:text-white text-xs cursor-pointer" title="ডাউনলোড"><i class="fa-solid fa-download"></i></a>
                        <button onclick="deleteSingleMessage('${key}', ${idx})" class="p-1 text-red-400 hover:text-red-300 text-xs cursor-pointer" title="ডিলিট"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>`;
            } else if (m.type === 'audio') {
                contentHtml = `
                <div class="flex flex-col space-y-2 p-2 my-1">
                    <audio src="${m.media_url}" controls class="w-full max-w-xs"></audio>
                    <div class="flex items-center justify-between text-[10px] text-gray-300 px-1">
                        <span><i class="fa-solid fa-microphone mr-1 text-amber-300"></i> ভয়েস মেসেজ</span>
                        <div class="flex space-x-2">
                            <a href="${m.media_url}" download="voice.mp3" onclick="autoDeleteAfterDownload('${key}', ${idx})" class="text-amber-300 hover:underline"><i class="fa-solid fa-download"></i> ডাউনলোড</a>
                            <button onclick="deleteSingleMessage('${key}', ${idx})" class="text-red-400 hover:text-red-300"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </div>
                </div>`;
            } else {
                contentHtml = `
                <div class="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/10 my-1 space-x-3">
                    <div class="flex items-center space-x-2 min-w-0">
                        <i class="fa-solid fa-file-pdf text-amber-300 text-lg shrink-0"></i>
                        <span class="text-xs underline text-amber-300 truncate max-w-[140px] font-medium" title="${escapeHtml(m.message_text)}">${escapeHtml(m.message_text || 'Document')}</span>
                    </div>
                    <div class="flex space-x-2 shrink-0">
                        <a href="${m.media_url}" download="${escapeHtml(m.message_text || 'document.pdf')}" onclick="autoDeleteAfterDownload('${key}', ${idx})" class="p-1.5 rounded-lg bg-white/10 text-amber-300 hover:text-white text-xs cursor-pointer" title="ডাউনলোড"><i class="fa-solid fa-download"></i></a>
                        <button onclick="deleteSingleMessage('${key}', ${idx})" class="p-1.5 rounded-lg bg-white/10 text-red-400 hover:text-red-300 text-xs cursor-pointer" title="ডিলিট"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>`;
            }
        }

        return `
        <div class="flex flex-col ${isMe ? 'items-end' : 'items-start'} my-1.5 px-2">
            <div class="max-w-[80%] px-3.5 py-2.5 rounded-2xl ${isMe ? 'chat-bubble-me' : 'chat-bubble-them'} shadow-lg relative">
                ${contentHtml}
            </div>
        </div>`;
    }).join('');
    container.scrollTop = container.scrollHeight;
}
```[cite: 10, 11, 12]
