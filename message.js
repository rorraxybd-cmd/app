// message.js - Professional Chat & Media Messaging Module (100% English & Clean UI)
let chatPollInterval = null;
let localMessageStore = JSON.parse(localStorage.getItem('salaam_messages_v18') || '{}');
let deletedMessageIds = JSON.parse(localStorage.getItem('salaam_deleted_ids_v18') || '[]');
let chatClearTimestamps = JSON.parse(localStorage.getItem('salaam_clear_ts_v18') || '{}');

function persistMessages() { localStorage.setItem('salaam_messages_v18', JSON.stringify(localMessageStore)); }
function normPhone(p) { return String(p || '').replace(/[\s\-\(\)\+]/g, ''); }
function getActiveProfile() {
    try { return JSON.parse(localStorage.getItem('message_profiles_v18') || '[{}]')[0] || { phone: '' }; } catch (e) { return { phone: '' }; }
}
function escapeHtml(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

async function sendTextMessage() {
    if (!currentActiveRecipient) { if (typeof showToast === 'function') showToast("No chat selected!", true); return; }
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
        if (file.size > 25 * 1024 * 1024) { if (typeof showToast === 'function') showToast("File size must be under 25MB", true); return; }
        let fileType = file.type.startsWith('image/') ? 'image' : (file.type.startsWith('video/') ? 'video' : (file.type.startsWith('audio/') ? 'audio' : 'file'));

        const reader = new FileReader();
        reader.onload = async function(e) {
            const me = normPhone(getActiveProfile().phone), key = normPhone(currentActiveRecipient.phone);
            if (!localMessageStore[key]) localMessageStore[key] = [];
            const msgId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
            const msg = { id: msgId, phone_number: me, message_text: file.name, media_url: e.target.result, type: fileType, timestamp: Date.now() };
            localMessageStore[key].push(msg);
            loadMessages();
            persistMessages();
            try {
                await fetch('/api/chat?action=send_chat_message', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sender_phone: me, receiver_phone: key, message_text: file.name, media_url: e.target.result, message_type: fileType, file_size: file.size })
                });
            } catch (err) {}
        };
        reader.readAsDataURL(file);
    });
    fileInputElem.value = '';
}

function renderChatHistoryList() {
    const listContainer = document.getElementById('sidebarContentList');
    if (!listContainer) return;

    let localContacts = JSON.parse(localStorage.getItem('message_contacts_v18') || '[]');
    let chatKeys = Object.keys(localMessageStore);
    let chatsHtml = '';

    if (chatKeys.length === 0) {
        chatsHtml = `<div class="p-8 text-center theme-card rounded-2xl mt-4"><p class="text-xs font-bold gold-gradient-text">No chat history</p></div>`;
    } else {
        chatsHtml = chatKeys.map(key => {
            const msgs = localMessageStore[key] || [];
            const lastMsg = msgs[msgs.length - 1] || {};
            let contact = localContacts.find(c => normPhone(c.phone) === normPhone(key)) || { name: key, phone: key, avatar: '' };
            const safeName = (contact.name || key).replace(/'/g, "\\'");
            return `
            <div class="flex justify-between items-center px-4 py-3 my-1.5 hover:bg-white/5 rounded-2xl theme-card cursor-pointer" onclick="openChat('${contact.phone}', '${safeName}', '${contact.avatar || ''}')">
                <div class="flex items-center space-x-3">
                    <img src="${contact.avatar || 'https://pub-508ef1e45bab487aadde85a1dba202c4.r2.dev/im1024.jpg'}" class="w-10 h-10 rounded-full object-cover">
                    <div>
                        <p class="text-xs font-semibold gold-gradient-text">${contact.name}</p>
                        <p class="text-[10px] text-gray-400">${escapeHtml(lastMsg.message_text || 'Media')}</p>
                    </div>
                </div>
            </div>`;
        }).join('');
    }

    listContainer.innerHTML = `<div class="p-3 space-y-3 pb-20"><h3 class="text-xs font-bold gold-gradient-text uppercase">Recent Chats</h3>${chatsHtml}</div>`;
}

function loadMessages() {
    const container = document.getElementById('chatMessages');
    if (!container || !currentActiveRecipient) return;
    const key = normPhone(currentActiveRecipient.phone);
    let msgs = localMessageStore[key] || [];

    if (msgs.length === 0) {
        container.innerHTML = `<div class="m-auto text-center"><p class="text-sm font-bold gold-gradient-text">No messages yet</p></div>`;
        return;
    }

    container.innerHTML = msgs.map(m => {
        const isMe = normPhone(m.phone_number) === normPhone(getActiveProfile().phone);
        const timeStr = new Date(m.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        let contentHtml = `<p class="text-xs text-white break-words">${escapeHtml(m.message_text || '')}</p>`;
        if (m.media_url && m.type === 'image') contentHtml = `<img src="${m.media_url}" class="rounded-xl max-w-xs max-h-52 object-cover">`;

        return `<div class="flex flex-col ${isMe ? 'items-end' : 'items-start'} my-1.5 px-2">
            <div class="max-w-[80%] px-3.5 py-2.5 rounded-2xl ${isMe ? 'chat-bubble-me' : 'chat-bubble-them'} shadow-lg">
                ${contentHtml}
                <span class="text-[9px] text-gray-400 block text-right mt-1">${timeStr}</span>
            </div>
        </div>`;
    }).join('');
    container.scrollTop = container.scrollHeight;
}
