// message.js - Real-Time Sync with Smart Visibility API, Clean Media & Profile Avatars
let chatPollInterval = null;
let globalMsgSyncInterval = null;
let localMessageStore = JSON.parse(localStorage.getItem('message_messages_v18') || '{}');
let deletedMessageIds = JSON.parse(localStorage.getItem('message_deleted_ids_v18') || '[]');
let mediaRecorder = null;
let recordedAudioChunks = [];
let isRecordingVoice = false;
let voiceRecordTimer = null;
let voiceSeconds = 0;

function persistMessages() {
    try { localStorage.setItem('message_messages_v18', JSON.stringify(localMessageStore)); } catch (e) {}
}

function normPhone(p) {
    return String(p || '').replace(/[\s\-\(\)\+]/g, '');
}

function getActiveProfile() {
    try { return JSON.parse(localStorage.getItem('message_profiles_v18') || '[{}]')[0] || { phone: '' }; } catch (e) { return { phone: '' }; }
}

function escapeHtml(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function triggerPushAlert(title, body) {
    try {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, {
                body: body,
                icon: 'https://pub-508ef1e45bab487aadde85a1dba202c4.r2.dev/im1024.jpg',
                vibrate: [300, 100, 300]
            });
        }
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        if (ctx.state === 'suspended') ctx.resume();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
    } catch (e) {}
}

async function fetchMessagesFromCloud() {
    if (document.hidden) return;

    const me = normPhone(getActiveProfile().phone);
    if (!me) return;

    try {
        const peer = window.currentActiveRecipient ? normPhone(window.currentActiveRecipient.phone) : '';
        const url = peer
            ? `/api/chat?action=get_chat_messages&user_phone=${me}&peer_phone=${peer}`
            : `/api/chat?action=get_chat_messages&user_phone=${me}`;

        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();
        const incomingList = data.messages || data.data || [];
        if (!Array.isArray(incomingList)) return;

        let hasNew = false;
        let hasNewForActive = false;

        incomingList.forEach(item => {
            const msgId = String(item.id || item.message_id || `${item.sender_phone}_${item.created_at || item.timestamp}`);
            if (deletedMessageIds.includes(msgId)) return;

            const sender = normPhone(item.sender_phone || item.phone_number);
            const receiver = normPhone(item.receiver_phone);
            const chatPartner = sender === me ? receiver : sender;
            if (!chatPartner) return;

            if (!localMessageStore[chatPartner]) localMessageStore[chatPartner] = [];
            const existingMsg = localMessageStore[chatPartner].find(m => String(m.id) === msgId);

            if (!existingMsg) {
                const msgObj = {
                    id: msgId,
                    phone_number: sender,
                    message_text: item.message_text || '',
                    media_url: item.media_url || '',
                    type: item.message_type || item.type || 'text',
                    status: 'delivered',
                    timestamp: item.timestamp ? Number(item.timestamp) : (item.created_at ? new Date(item.created_at).getTime() : Date.now())
                };
                localMessageStore[chatPartner].push(msgObj);
                hasNew = true;

                if (sender !== me) {
                    if (peer && chatPartner === peer) hasNewForActive = true;
                    triggerPushAlert("New Message", msgObj.type === 'text' ? msgObj.message_text : `New ${msgObj.type} received`);
                }
            } else if (existingMsg.status !== 'delivered') {
                existingMsg.status = 'delivered';
                hasNew = true;
            }
        });

        if (hasNew) {
            persistMessages();
            if (hasNewForActive || window.currentActiveRecipient) {
                loadMessages();
            }
            const activeTabChat = document.getElementById('labelChat');
            if (activeTabChat && activeTabChat.classList.contains('gold-gradient-text')) {
                renderChatHistoryList();
            }
        }
    } catch (e) {}
}

function startChatPolling() {
    if (chatPollInterval) clearInterval(chatPollInterval);
    fetchMessagesFromCloud();
    chatPollInterval = setInterval(fetchMessagesFromCloud, 2500);
}

function startGlobalMessageSync() {
    if (globalMsgSyncInterval) clearInterval(globalMsgSyncInterval);
    fetchMessagesFromCloud();
    globalMsgSyncInterval = setInterval(fetchMessagesFromCloud, 5000);
}

document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
        fetchMessagesFromCloud();
    }
});

async function sendTextMessage() {
    if (!window.currentActiveRecipient) {
        if (typeof showToast === 'function') showToast("Select a contact first!", true);
        return;
    }
    const inp = document.getElementById('messageInput');
    const text = inp ? inp.value.trim() : '';
    if (!text) return;
    inp.value = '';

    const key = normPhone(window.currentActiveRecipient.phone);
    const me = normPhone(getActiveProfile().phone);
    if (!localMessageStore[key]) localMessageStore[key] = [];

    const msgId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    const msg = { id: msgId, phone_number: me, message_text: text, media_url: '', type: 'text', status: 'sending', timestamp: Date.now() };
    localMessageStore[key].push(msg);
    loadMessages();
    persistMessages();

    try {
        const res = await fetch('/api/chat?action=send_chat_message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: msgId,
                sender_phone: me,
                receiver_phone: key,
                message_text: text,
                media_url: '',
                message_type: 'text',
                timestamp: msg.timestamp
            })
        });
        if (res.ok) {
            msg.status = 'delivered';
            persistMessages();
            loadMessages();
        }
    } catch (e) {}
}

async function toggleVoiceRecording() {
    if (!window.currentActiveRecipient) {
        if (typeof showToast === 'function') showToast("Select a contact first!", true);
        return;
    }

    const micBtn = document.getElementById('voiceRecordBtn');
    const micIcon = document.getElementById('voiceRecordIcon');
    const msgInp = document.getElementById('messageInput');

    if (isRecordingVoice && mediaRecorder) {
        mediaRecorder.stop();
        isRecordingVoice = false;
        clearInterval(voiceRecordTimer);
        if (msgInp) { msgInp.placeholder = "Type a message..."; msgInp.disabled = false; }
        if (micBtn) micBtn.classList.remove('bg-red-600', 'text-white', 'animate-pulse');
        if (micIcon) { micIcon.className = 'fa-solid fa-microphone text-sm'; }
        return;
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        recordedAudioChunks = [];
        mediaRecorder = new MediaRecorder(stream);

        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) recordedAudioChunks.push(e.data);
        };

        mediaRecorder.onstop = async () => {
            stream.getTracks().forEach(t => t.stop());
            const audioBlob = new Blob(recordedAudioChunks, { type: 'audio/webm' });
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64Audio = reader.result;
                const me = normPhone(getActiveProfile().phone);
                const key = normPhone(window.currentActiveRecipient.phone);
                if (!localMessageStore[key]) localMessageStore[key] = [];
                const msgId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
                const msg = {
                    id: msgId,
                    phone_number: me,
                    message_text: `Voice Note (${voiceSeconds}s)`,
                    media_url: base64Audio,
                    type: 'audio',
                    status: 'sending',
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
                            id: msgId,
                            sender_phone: me,
                            receiver_phone: key,
                            message_text: msg.message_text,
                            media_url: base64Audio,
                            message_type: 'audio',
                            timestamp: msg.timestamp
                        })
                    });
                    if (res.ok) {
                        msg.status = 'delivered';
                        persistMessages();
                        loadMessages();
                    }
                } catch (err) {}
            };
            reader.readAsDataURL(audioBlob);
        };

        mediaRecorder.start();
        isRecordingVoice = true;
        voiceSeconds = 0;
        if (msgInp) { msgInp.value = ""; msgInp.placeholder = "Recording 0:00... Tap stop to send"; msgInp.disabled = true; }
        voiceRecordTimer = setInterval(() => {
            voiceSeconds++;
            const mins = Math.floor(voiceSeconds / 60);
            const secs = String(voiceSeconds % 60).padStart(2, '0');
            if (msgInp) msgInp.placeholder = `Recording ${mins}:${secs}... Tap stop to send`;
        }, 1000);

        if (micBtn) micBtn.classList.add('bg-red-600', 'text-white', 'animate-pulse');
        if (micIcon) { micIcon.className = 'fa-solid fa-stop text-sm'; }
    } catch (err) {
        if (typeof showToast === 'function') showToast("Microphone access denied", true);
    }
}

function compressVideoToCompactKB(file) {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.muted = true;
        video.playsInline = true;
        video.src = URL.createObjectURL(file);

        video.onloadedmetadata = () => {
            if (video.duration > 40) {
                URL.revokeObjectURL(video.src);
                reject("Video must be maximum 40 seconds!");
                return;
            }
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject("Failed to read video file");
            reader.readAsDataURL(file);
        };
        video.onerror = () => reject("Invalid video format");
    });
}

function compressImageToCompactKB(file) {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = URL.createObjectURL(file);
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const maxDim = 1080;
            const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
            canvas.width = Math.round(img.width * scale);
            canvas.height = Math.round(img.height * scale);
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            URL.revokeObjectURL(img.src);
            resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
    });
}

async function handleUniversalFileUpload(fileInputElem) {
    const files = fileInputElem.files;
    if (!files || files.length === 0 || !window.currentActiveRecipient) return;

    for (const file of Array.from(files)) {
        let fileType = 'file';
        if (file.type.startsWith('image/')) fileType = 'image';
        else if (file.type.startsWith('video/')) fileType = 'video';
        else if (file.type.startsWith('audio/')) fileType = 'audio';
        else if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) fileType = 'pdf';

        try {
            let finalDataUrl = '';
            if (fileType === 'video') {
                if (typeof showToast === 'function') showToast("Preparing video...");
                finalDataUrl = await compressVideoToCompactKB(file);
            } else if (fileType === 'image') {
                finalDataUrl = await compressImageToCompactKB(file);
            } else {
                if (file.size > 900 * 1024) {
                    if (typeof showToast === 'function') showToast("File size must be under 900KB", true);
                    continue;
                }
                finalDataUrl = await new Promise((res) => {
                    const r = new FileReader();
                    r.onload = () => res(r.result);
                    r.readAsDataURL(file);
                });
            }

            const me = normPhone(getActiveProfile().phone);
            const key = normPhone(window.currentActiveRecipient.phone);
            if (!localMessageStore[key]) localMessageStore[key] = [];
            const msgId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
            const msg = {
                id: msgId,
                phone_number: me,
                message_text: file.name,
                media_url: finalDataUrl,
                type: fileType,
                status: 'sending',
                timestamp: Date.now()
            };
            localMessageStore[key].push(msg);
            loadMessages();
            persistMessages();

            const res = await fetch('/api/chat?action=send_chat_message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: msgId,
                    sender_phone: me,
                    receiver_phone: key,
                    message_text: file.name,
                    media_url: finalDataUrl,
                    message_type: fileType,
                    timestamp: msg.timestamp
                })
            });
            if (res.ok) {
                msg.status = 'delivered';
                persistMessages();
                loadMessages();
                if (typeof showToast === 'function') showToast("Sent successfully!");
            }
        } catch (err) {
            if (typeof showToast === 'function') showToast(typeof err === 'string' ? err : "Failed to process file", true);
        }
    }
    fileInputElem.value = '';
}

function openMediaLightbox(msgId) {
    if (!window.currentActiveRecipient) return;
    const key = normPhone(window.currentActiveRecipient.phone);
    const msg = (localMessageStore[key] || []).find(m => String(m.id) === String(msgId));
    if (!msg || !msg.media_url) return;

    document.getElementById('mediaLightboxModal')?.remove();
    const modal = document.createElement('div');
    modal.id = 'mediaLightboxModal';
    modal.className = 'fixed inset-0 z-50 bg-black/95 flex flex-col justify-between p-4';

    let viewerContent = '';
    if (msg.type === 'image') {
        viewerContent = `<img src="${msg.media_url}" class="max-w-full max-h-[78vh] rounded-2xl object-contain mx-auto">`;
    } else if (msg.type === 'video') {
        viewerContent = `<video src="${msg.media_url}" controls autoplay playsinline class="max-w-full max-h-[78vh] rounded-2xl mx-auto"></video>`;
    } else if (msg.type === 'pdf') {
        viewerContent = `<iframe src="${msg.media_url}" class="w-full h-[78vh] rounded-2xl bg-white"></iframe>`;
    } else {
        viewerContent = `<div class="text-center p-8 theme-card rounded-3xl"><i class="fa-solid fa-file text-4xl text-amber-300 mb-3"></i><p class="text-sm font-bold text-white">Document File</p></div>`;
    }

    modal.innerHTML = `
        <div class="flex items-center justify-between py-2">
            <span class="text-xs font-bold gold-gradient-text">Media Viewer</span>
            <button onclick="document.getElementById('mediaLightboxModal').remove()" class="w-9 h-9 rounded-full bg-white/10 text-white flex items-center justify-center cursor-pointer">
                <i class="fa-solid fa-xmark"></i>
            </button>
        </div>
        <div class="flex-1 flex items-center justify-center overflow-hidden my-2">
            ${viewerContent}
        </div>
        <div class="flex items-center justify-center space-x-4 pb-4">
            <a href="${msg.media_url}" download="media_file" class="px-5 py-2.5 rounded-full bg-white/10 text-white text-xs font-bold flex items-center space-x-2">
                <i class="fa-solid fa-download text-amber-300"></i> <span>Download</span>
            </a>
            <button onclick="document.getElementById('mediaLightboxModal').remove()" class="px-5 py-2.5 rounded-full gold-btn text-xs font-extrabold cursor-pointer">
                Close
            </button>
        </div>
    `;
    document.body.appendChild(modal);
}

let longPressTimer = null;
function handleMsgTouchStart(msgId) {
    longPressTimer = setTimeout(() => {
        showSingleDeleteAction(msgId);
    }, 550);
}
function handleMsgTouchEnd() {
    if (longPressTimer) clearTimeout(longPressTimer);
}

function showSingleDeleteAction(msgId) {
    document.getElementById('singleDeleteModal')?.remove();
    const modal = document.createElement('div');
    modal.id = 'singleDeleteModal';
    modal.className = 'fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4';
    modal.innerHTML = `
        <div class="theme-card rounded-3xl p-5 w-full max-w-xs text-center space-y-4">
            <p class="text-xs font-bold gold-gradient-text uppercase tracking-wider">Message Options</p>
            <button onclick="deleteSingleMessage('${msgId}')" class="w-full py-3 rounded-2xl bg-red-600 text-white text-xs font-bold flex items-center justify-center space-x-2 cursor-pointer">
                <i class="fa-solid fa-trash"></i> <span>Delete For Everyone</span>
            </button>
            <button onclick="document.getElementById('singleDeleteModal').remove()" class="w-full py-2.5 rounded-2xl bg-white/10 text-gray-300 text-xs font-semibold cursor-pointer">
                Cancel
            </button>
        </div>
    `;
    document.body.appendChild(modal);
}

async function deleteSingleMessage(msgId) {
    document.getElementById('singleDeleteModal')?.remove();
    if (!window.currentActiveRecipient) return;
    const key = normPhone(window.currentActiveRecipient.phone);
    if (!deletedMessageIds.includes(String(msgId))) {
        deletedMessageIds.push(String(msgId));
        localStorage.setItem('message_deleted_ids_v18', JSON.stringify(deletedMessageIds));
    }
    if (localMessageStore[key]) {
        localMessageStore[key] = localMessageStore[key].filter(m => String(m.id) !== String(msgId));
        persistMessages();
        loadMessages();
    }
    if (typeof showToast === 'function') showToast("Message deleted");

    try {
        await fetch('/api/chat?action=delete_message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message_id: msgId })
        });
    } catch (e) {}
}

function deleteAllChatMessages() {
    if (!window.currentActiveRecipient) return;
    const key = normPhone(window.currentActiveRecipient.phone);
    const msgs = localMessageStore[key] || [];
    if (msgs.length === 0) {
        if (typeof showToast === 'function') showToast("Chat is already empty");
        return;
    }

    document.getElementById('allDeleteConfirmModal')?.remove();
    const modal = document.createElement('div');
    modal.id = 'allDeleteConfirmModal';
    modal.className = 'fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4';
    modal.innerHTML = `
        <div class="theme-card rounded-3xl p-5 w-full max-w-xs text-center space-y-4">
            <i class="fa-solid fa-trash-can text-2xl text-red-500"></i>
            <h4 class="text-sm font-bold text-white">Delete All Messages?</h4>
            <p class="text-[11px] text-gray-400">All chat history will be permanently removed.</p>
            <div class="flex space-x-2 pt-1">
                <button onclick="document.getElementById('allDeleteConfirmModal').remove()" class="flex-1 py-2.5 rounded-2xl bg-white/10 text-gray-300 text-xs font-semibold cursor-pointer">Cancel</button>
                <button onclick="confirmDeleteAllChat()" class="flex-1 py-2.5 rounded-2xl bg-red-600 text-white text-xs font-bold cursor-pointer">Delete All</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

async function confirmDeleteAllChat() {
    document.getElementById('allDeleteConfirmModal')?.remove();
    if (!window.currentActiveRecipient) return;
    const key = normPhone(window.currentActiveRecipient.phone);
    const msgsToDelete = [...(localMessageStore[key] || [])];

    msgsToDelete.forEach(m => {
        if (!deletedMessageIds.includes(String(m.id))) deletedMessageIds.push(String(m.id));
    });
    localStorage.setItem('message_deleted_ids_v18', JSON.stringify(deletedMessageIds));
    localMessageStore[key] = [];
    persistMessages();
    loadMessages();
    if (typeof showToast === 'function') showToast("All messages deleted");
}

function renderChatHistoryList() {
    const listContainer = document.getElementById('sidebarContentList');
    if (!listContainer) return;

    let localContacts = Array.isArray(window.GLOBAL_CLOUD_USERS) ? window.GLOBAL_CLOUD_USERS : JSON.parse(localStorage.getItem('message_contacts_v18') || '[]');
    let chatKeys = Object.keys(localMessageStore).filter(k => (localMessageStore[k] || []).length > 0);
    let chatsHtml = '';

    if (chatKeys.length === 0) {
        chatsHtml = `<div class="p-8 text-center theme-card rounded-2xl mt-4"><p class="text-xs font-bold gold-gradient-text">No chat history yet</p></div>`;
    } else {
        chatsHtml = chatKeys.map(key => {
            const msgs = localMessageStore[key] || [];
            const lastMsg = msgs[msgs.length - 1] || {};
            const lastTime = lastMsg.timestamp ? new Date(lastMsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
            
            let contact = localContacts.find(c => normPhone(c.phone) === normPhone(key)) || { name: key, phone: key, avatar: '' };
            const safeName = (contact.name || key).replace(/'/g, "\\'");
            const avatarUrl = contact.avatar || '';
            const initial = (contact.name || 'U').trim().charAt(0).toUpperCase();

            const avatarEl = avatarUrl && avatarUrl.trim() !== ''
                ? `<img src="${avatarUrl}" class="w-10 h-10 rounded-full object-cover shrink-0 border border-amber-400/20">`
                : `<div class="w-10 h-10 rounded-full gold-btn flex items-center justify-center font-extrabold text-[#030305] shrink-0">${initial}</div>`;

            let previewText = lastMsg.type === 'image' ? 'Photo' : lastMsg.type === 'video' ? 'Video' : lastMsg.type === 'audio' ? 'Voice Note' : lastMsg.type === 'pdf' ? 'PDF Document' : lastMsg.message_text;

            return `
            <div class="flex justify-between items-center px-4 py-3 my-1.5 hover:bg-white/5 rounded-2xl theme-card cursor-pointer" onclick="openChat('${contact.phone}', '${safeName}', '${avatarUrl}')">
                <div class="flex items-center space-x-3 min-w-0 flex-1">
                    ${avatarEl}
                    <div class="min-w-0 flex-1">
                        <div class="flex justify-between items-center">
                            <p class="text-xs font-semibold gold-gradient-text truncate">${contact.name}</p>
                            <span class="text-[9px] text-gray-500 shrink-0 ml-2">${lastTime}</span>
                        </div>
                        <p class="text-[10px] text-gray-400 truncate mt-0.5">${escapeHtml(previewText || '')}</p>
                    </div>
                </div>
            </div>`;
        }).join('');
    }

    listContainer.innerHTML = `<div class="p-3 space-y-3 pb-20"><h3 class="text-xs font-bold gold-gradient-text uppercase tracking-wider">Recent Chats</h3>${chatsHtml}</div>`;
}

function loadMessages() {
    const container = document.getElementById('chatMessages');
    if (!container || !window.currentActiveRecipient) return;
    const key = normPhone(window.currentActiveRecipient.phone);
    let msgs = localMessageStore[key] || [];

    if (msgs.length === 0) {
        container.innerHTML = `<div class="m-auto text-center space-y-1"><p class="text-sm font-bold gold-gradient-text">No messages yet</p><p class="text-[10px] text-gray-500">Send text, voice, video, image or PDF</p></div>`;
        return;
    }

    container.innerHTML = msgs.map(m => {
        const isMe = normPhone(m.phone_number) === normPhone(getActiveProfile().phone);
        const timeStr = new Date(m.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const tickHtml = isMe ? (m.status === 'delivered' ? `<span class="text-[10px] text-amber-300 font-bold">✓✓</span>` : `<span class="text-[10px] text-gray-400">✓</span>`) : '';
        let contentHtml = `<p class="text-xs text-white break-words leading-relaxed">${escapeHtml(m.message_text || '')}</p>`;

        if (m.media_url && m.type === 'image') {
            contentHtml = `
                <div class="space-y-1">
                    <img src="${m.media_url}" onclick="openMediaLightbox('${m.id}')" class="rounded-xl w-full max-w-[240px] max-h-64 object-cover cursor-pointer shadow-md">
                </div>`;
        } else if (m.media_url && m.type === 'video') {
            contentHtml = `
                <div class="space-y-1">
                    <video src="${m.media_url}" controls playsinline preload="metadata" class="rounded-xl w-full max-w-[260px] max-h-64 bg-black shadow-md"></video>
                </div>`;
        } else if (m.media_url && m.type === 'audio') {
            contentHtml = `
                <div class="space-y-1 min-w-[210px]">
                    <audio src="${m.media_url}" controls class="w-full h-9"></audio>
                </div>`;
        } else if (m.media_url && m.type === 'pdf') {
            contentHtml = `
                <div onclick="openMediaLightbox('${m.id}')" class="flex items-center space-x-3 p-3 rounded-2xl bg-black/40 border border-amber-400/20 cursor-pointer hover:bg-black/60 transition min-w-[210px]">
                    <i class="fa-solid fa-file-pdf text-red-500 text-2xl shrink-0"></i>
                    <div class="min-w-0 flex-1">
                        <p class="text-xs font-bold text-white truncate">PDF Document File</p>
                        <p class="text-[9px] text-amber-300 mt-0.5">Tap to view / download</p>
                    </div>
                </div>`;
        }

        return `
        <div class="flex flex-col ${isMe ? 'items-end' : 'items-start'} my-1.5 px-1 select-none"
             ontouchstart="handleMsgTouchStart('${m.id}')" ontouchend="handleMsgTouchEnd()"
             onmousedown="handleMsgTouchStart('${m.id}')" onmouseup="handleMsgTouchEnd()" onmouseleave="handleMsgTouchEnd()">
            <div class="max-w-[82%] px-3 py-2 rounded-2xl ${isMe ? 'chat-bubble-me' : 'chat-bubble-them'} relative group shadow-sm">
                ${contentHtml}
                <div class="flex items-center justify-end space-x-1.5 mt-1">
                    <span class="text-[9px] text-gray-400">${timeStr}</span>
                    ${tickHtml}
                </div>
            </div>
        </div>`;
    }).join('');

    container.scrollTop = container.scrollHeight;
}
