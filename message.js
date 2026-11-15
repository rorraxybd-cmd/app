// message.js - Professional Chat & Messaging Module
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
    
    if (inp.value.trim().length > 0) {
        sendBtn.classList.remove('hidden');
        sendBtn.classList.add('flex');
    } else {
        sendBtn.classList.add('hidden');
        sendBtn.classList.remove('flex');
    }
}

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
    chatPollInterval = setInterval(() => { if (currentActiveRecipient) fetchMessagesFromCloud(); }, 3000);
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
        if (typeof showToast === 'function') showToast("Deleted successfully");
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
    if (typeof showToast === 'function') showToast("Chat cleared successfully");
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
                <p class="text-sm font-bold gold-gradient-text">No messages yet</p>
                <p class="text-[11px] text-gray-400">Send a message or start a call with ${escapeHtml(currentActiveRecipient.name)}.</p>
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
                contentHtml = `<div class="relative group my-1">
                    <img src="${m.media_url}" class="rounded-xl max-w-xs max-h-52 object-cover border border-white/10 shadow-md">
                    <div class="absolute top-2 right-2 flex space-x-1.5 bg-black/50 backdrop-blur-sm rounded-lg p-1">
                        <a href="${m.media_url}" download="image.jpg" class="p-1 text-amber-300 hover:text-white text-xs cursor-pointer" title="Download"><i class="fa-solid fa-download"></i></a>
                        <button onclick="deleteSingleMessage('${key}', ${idx})" class="p-1 text-red-400 hover:text-red-300 text-xs cursor-pointer" title="Delete"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>`;
            } else if (m.type === 'video') {
                contentHtml = `<div class="relative my-1">
                    <video src="${m.media_url}" controls class="rounded-xl max-w-xs max-h-52 border border-white/10 shadow-md"></video>
                    <div class="absolute top-2 right-2 flex space-x-1.5 bg-black/50 backdrop-blur-sm rounded-lg p-1">
                        <a href="${m.media_url}" download="video.mp4" class="p-1 text-amber-300 hover:text-white text-xs cursor-pointer" title="Download"><i class="fa-solid fa-download"></i></a>
                        <button onclick="deleteSingleMessage('${key}', ${idx})" class="p-1 text-red-400 hover:text-red-300 text-xs cursor-pointer" title="Delete"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>`;
            } else {
                contentHtml = `<div class="flex items-center justify-between p-2.5 rounded-xl bg-black/40 border border-white/10 my-1 space-x-3">
                    <span class="text-xs underline text-amber-300 truncate max-w-[150px]"><i class="fa-solid fa-file mr-1"></i> ${escapeHtml(m.message_text || 'File')}</span>
                    <div class="flex space-x-2 shrink-0">
                        <a href="${m.media_url}" download class="p-1 text-amber-300 hover:text-white text-xs cursor-pointer"><i class="fa-solid fa-download"></i></a>
                        <button onclick="deleteSingleMessage('${key}', ${idx})" class="p-1 text-red-400 hover:text-red-300 text-xs cursor-pointer"><i class="fa-solid fa-trash"></i></button>
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
