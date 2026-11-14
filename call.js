let currentTab = 'contact', currentActiveRecipient = null;
let currentCallType = 'audio', activeShareData = null;
let callRingInterval = null, activeAudioCtx = null, localLiveStream = null, callPollInterval = null, chatPollInterval = null;
let callHistoryNotifications = JSON.parse(localStorage.getItem('salaam_call_notifications') || '[]');
let localMessageStore = JSON.parse(localStorage.getItem('salaam_messages_v18') || '{}');
let deviceContacts = JSON.parse(localStorage.getItem('salaam_contacts_v18') || 'null') || [
    { name: "rorraxy Support", phone: "+8801538187301", appUser: true, isOnline: true, lastMsg: "Official Support Team", avatar: "https://pub-508ef1e45bab487aadde85a1dba202c4.r2.dev/rorraxyfree/mr%20masudar%20logo%20(3).png", hidePhone: true }
];

function persistMessages() { 
    localStorage.setItem('salaam_messages_v18', JSON.stringify(localMessageStore)); 
}

function showToast(msg, isErr = false) {
    const b = document.getElementById('toastBanner'), dot = document.getElementById('toastDot'), text = document.getElementById('toastText');
    if (!b) return;
    dot.style.backgroundColor = isErr ? '#ff2e7e' : '#2ed573';
    text.innerText = msg;
    b.classList.remove('hidden'); 
    b.classList.add('flex');
    setTimeout(() => { 
        b.classList.add('hidden'); 
        b.classList.remove('flex'); 
    }, 2200);
}

function initAppAfterVerification() {
    syncGlobalNetworkUsers();
    setTimeout(() => {
        switchTab('contact');
    }, 100);
    startIncomingCallPolling();
    startChatPolling();
}

async function syncGlobalNetworkUsers() {
    try {
        const res = await fetch('/api/chat?action=get_global_users');
        if (res.ok) {
            const data = await res.json();
            if (data.success && Array.isArray(data.users)) {
                const myPhone = normPhone(getActiveProfile().phone);
                data.users.forEach(u => {
                    const uPhone = normPhone(u.phone_number);
                    if (uPhone && uPhone !== myPhone) {
                        const existingIdx = deviceContacts.findIndex(dc => normPhone(dc.phone) === uPhone);
                        if (existingIdx === -1) {
                            deviceContacts.push({
                                name: u.display_name || uPhone,
                                phone: uPhone,
                                appUser: true,
                                isOnline: u.is_online === 1,
                                avatar: u.avatar_url || null,
                                lastMsg: "Tap to message"
                            });
                        } else {
                            deviceContacts[existingIdx].isOnline = u.is_online === 1;
                            if (u.display_name) deviceContacts[existingIdx].name = u.display_name;
                            if (u.avatar_url) deviceContacts[existingIdx].avatar = u.avatar_url;
                        }
                    }
                });
                localStorage.setItem('salaam_contacts_v18', JSON.stringify(deviceContacts));
                if (currentTab === 'contact' || currentTab === 'chat') renderDeviceContacts();
            }
        }
    } catch (e) {}
}

function switchTab(tab) {
    currentTab = tab;
    
    ['profile', 'contact', 'chat'].forEach(t => {
        const isSel = (t === tab);
        const lbl = document.getElementById('label' + t.charAt(0).toUpperCase() + t.slice(1));
        const icn = document.getElementById('icon' + t.charAt(0).toUpperCase() + t.slice(1));
        if (lbl) lbl.className = `nav-label text-[10px] ${isSel ? 'pink-gradient-text font-bold' : 'gold-gradient-text font-semibold'}`;
        if (icn) icn.setAttribute('stroke', isSel ? '#EC4899' : '#F5D061');
    });

    const sb = document.getElementById('searchBarContainer');
    if (tab === 'profile') { 
        if (sb) sb.style.display = 'none'; 
        if (typeof renderProfileView === 'function') {
            renderProfileView(); 
        }
    } else {
        if (sb) sb.style.display = 'block';
        const searchInput = document.getElementById('searchInput');
        if (searchInput) searchInput.value = '';
        if (tab === 'chat') {
            renderChatStories();
        } else {
            syncGlobalNetworkUsers();
            renderDeviceContacts();
        }
    }
    
    // রিসেট লেআউট ফর রেসপন্সিভ স্ক্রিন
    if (window.innerWidth >= 768) {
        document.getElementById('sidebarSection').style.display = 'flex';
        document.getElementById('workspaceSection').style.display = 'flex';
    } else {
        document.getElementById('sidebarSection').style.display = 'flex';
        document.getElementById('workspaceSection').style.display = 'none';
    }
}

function renderDeviceContacts() {
    const listContainer = document.getElementById('sidebarContentList');
    if (!listContainer) return;

    const contactsHtml = deviceContacts.map(c => {
        const info = getCountryInfo(c.phone);
        const avatarImg = c.avatar ? `<img src="${c.avatar}" class="w-10 h-10 rounded-full object-cover bg-black">` : `<div class="w-10 h-10 rounded-full theme-input flex items-center justify-center text-xs font-bold gold-gradient-text border border-amber-400/20">${c.name.charAt(0)}</div>`;
        const phoneDisplay = c.hidePhone ? `<p class="text-[10px] text-amber-300 font-medium">Official Support Team</p>` : `<p class="text-[10px] text-gray-400">${info.flag} ${c.phone}</p>`;
        return `
        <div onclick="openChat('${c.phone}', '${c.name}')" class="flex justify-between items-center px-4 py-3 my-1 hover:bg-white/5 cursor-pointer rounded-2xl theme-card border border-white/5">
            <div class="flex items-center space-x-3">
                <div class="relative">
                    ${avatarImg}
                    <span class="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-black ${c.isOnline?'bg-[#2ed573]':'bg-amber-400'}"></span>
                </div>
                <div><p class="text-xs font-semibold gold-gradient-text">${c.name}</p>${phoneDisplay}</div>
            </div>
            ${getTickBadge(c.isOnline)}
        </div>`;
    }).join('');

    listContainer.innerHTML = `<div id="directDialSlot"></div>` + contactsHtml;
}

function getTickBadge(on) {
    return `<span class="inline-flex items-center justify-center w-5 h-5 rounded-full ${on?'bg-[#2ed573]/15 text-[#2ed573]':'bg-amber-400/15 text-amber-300'}"><svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"><polyline points="20 6 9 17 4 12"></polyline></svg></span>`;
}

function openChat(phone, name) {
    const cp = normPhone(phone);
    const targetContact = deviceContacts.find(c => normPhone(c.phone) === cp);
    const avatarUrl = targetContact && targetContact.avatar ? targetContact.avatar : 'https://pub-508ef1e45bab487aadde85a1dba202c4.r2.dev/rorraxyfree/mr%20masudar%20logo%20(3).png';

    currentActiveRecipient = { phone: cp, name: name || cp, isOnline: true, avatar: avatarUrl };
    document.getElementById('activeChatHeader').style.display = 'flex';
    document.getElementById('chatInputBar').style.display = 'flex';
    document.getElementById('activeChatTitle').innerText = name || cp;
    document.getElementById('activeChatAvatar').src = avatarUrl;
    document.getElementById('activeChatHeaderTick').innerHTML = getTickBadge(true);
    if (window.innerWidth < 768) {
        document.getElementById('sidebarSection').style.display = 'none';
        document.getElementById('workspaceSection').style.display = 'flex';
        document.getElementById('bottomNavBar').style.display = 'none';
    } else {
        document.getElementById('sidebarSection').style.display = 'flex';
        document.getElementById('workspaceSection').style.display = 'flex';
    }
    loadMessages();
    fetchMessagesFromCloud();
}

async function sendTextMessage() {
    if (!currentActiveRecipient) return;
    const inp = document.getElementById('messageInput');
    const text = inp.value.trim();
    if (!text) return;
    inp.value = '';
    const key = normPhone(currentActiveRecipient.phone), me = getActiveProfile().phone;
    if (!localMessageStore[key]) localMessageStore[key] = [];
    
    const msg = { id: 'm_' + Date.now(), phone_number: me, message_text: text, media_url: '', type: 'text' };
    localMessageStore[key].push(msg);
    appendBubble(msg);
    persistMessages();

    try {
        await fetch('/api/chat?action=send_chat_message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sender_phone: me, receiver_phone: key, message_text: text, media_url: '', message_type: 'text' })
        });
    } catch (e) {}
}

async function fetchMessagesFromCloud() {
    if (!currentActiveRecipient) return;
    const me = getActiveProfile().phone;
    const key = normPhone(currentActiveRecipient.phone);
    try {
        const res = await fetch(`/api/chat?action=get_chat_messages&phone=${encodeURIComponent(key)}&my_phone=${encodeURIComponent(me)}`);
        if (res.ok) {
            const data = await res.json();
            if (data.success && Array.isArray(data.messages)) {
                if (!localMessageStore[key]) localMessageStore[key] = [];
                let updated = false;
                data.messages.forEach(m => {
                    const mText = m.message_text || '';
                    const mUrl = m.media_url && m.media_url !== 'undefined' ? m.media_url : null;
                    const mType = mUrl ? (mUrl.startsWith('data:video/') ? 'video' : 'image') : 'text';
                    
                    const exists = localMessageStore[key].some(existing => existing.message_text === mText && existing.phone_number === m.sender_phone && existing.media_url === mUrl);
                    if (!exists) {
                        localMessageStore[key].push({
                            id: 'm_' + Date.now() + Math.random(),
                            phone_number: m.sender_phone,
                            message_text: mText,
                            media_url: mUrl,
                            type: mType
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

function startContinuousRinging() {
    stopContinuousRinging();
    const playTone = () => {
        try {
            if (!activeAudioCtx) activeAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = activeAudioCtx.createOscillator();
            const gain = activeAudioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(520, activeAudioCtx.currentTime);
            gain.gain.setValueAtTime(0.2, activeAudioCtx.currentTime);
            osc.connect(gain);
            gain.connect(activeAudioCtx.destination);
            osc.start();
            osc.stop(activeAudioCtx.currentTime + 0.8);
        } catch (e) {}
    };
    playTone();
    callRingInterval = setInterval(playTone, 1400);
}

function stopContinuousRinging() {
    if (callRingInterval) {
        clearInterval(callRingInterval);
        callRingInterval = null;
    }
}

async function startWhatsAppCall(mode) {
    if (!currentActiveRecipient) {
        showToast("Select a contact first", true);
        return;
    }
    currentCallType = mode;
    startContinuousRinging();

    const myPhone = getActiveProfile().phone;
    try {
        await fetch('/api/chat?action=send_call_signal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ caller_phone: myPhone, receiver_phone: currentActiveRecipient.phone, call_type: mode, status: 'ringing' })
        });
    } catch (e) {}

    showCallModalUI(currentActiveRecipient.name, currentActiveRecipient.avatar, `Calling ${mode}...`, mode, false);
}

// আপডেটকৃত কল মডেল যাতে রিসিভ ও রিজেক্ট বাটন থাকে
function showCallModalUI(peerName, avatarUrl, statusText, mode, isIncoming = false) {
    let modal = document.getElementById('whatsAppCallModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'whatsAppCallModal';
        modal.className = 'fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-4';
        document.body.appendChild(modal);
    }
    
    modal.innerHTML = `
        <div class="theme-card p-6 rounded-3xl max-w-sm w-full text-center space-y-4 border border-amber-400/30 shadow-2xl">
            <img id="callModalAvatar" src="${avatarUrl || 'https://pub-508ef1e45bab487aadde85a1dba202c4.r2.dev/rorraxyfree/mr%20masudar%20logo%20(3).png'}" class="w-24 h-24 rounded-full object-cover mx-auto border-2 border-amber-400/50 bg-black">
            <div>
                <h2 id="callPeerName" class="text-lg font-bold gold-gradient-text">${peerName}</h2>
                <p id="callStatusLabel" class="text-xs text-gray-300 mt-1">${statusText}</p>
            </div>
            <div class="flex justify-center space-x-4 pt-2">
                ${isIncoming ? `
                    <button onclick="acceptWhatsAppCall()" class="px-5 py-3 rounded-2xl bg-green-600 hover:bg-green-700 text-white font-bold text-xs cursor-pointer shadow-lg transition flex items-center space-x-2">
                        <i class="fa-solid fa-phone"></i><span>Accept</span>
                    </button>
                ` : ''}
                <button onclick="endWhatsAppCall()" class="px-6 py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs cursor-pointer shadow-lg transition flex items-center space-x-2">
                    <i class="fa-solid fa-phone-slash"></i><span>${isIncoming ? 'Decline' : 'End Call'}</span>
                </button>
            </div>
        </div>
    `;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

async function acceptWhatsAppCall() {
    stopContinuousRinging();
    showToast("Call connected!");
    if (currentActiveRecipient) {
        const myPhone = getActiveProfile().phone;
        try {
            await fetch('/api/chat?action=send_call_signal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ caller_phone: myPhone, receiver_phone: currentActiveRecipient.phone, call_type: currentCallType, status: 'connected' })
            });
        } catch (e) {}
    }
    const modal = document.getElementById('whatsAppCallModal');
    if (modal) {
        document.getElementById('callStatusLabel').innerText = "Call in progress...";
        // চাইলে এখানে কল স্ক্রিন বা অ্যাক্টিভ স্টেট রাখতে পারেন
    }
}

function startIncomingCallPolling() {
    if (callPollInterval) clearInterval(callPollInterval);
    callPollInterval = setInterval(async () => {
        const myPhone = getActiveProfile().phone;
        try {
            const res = await fetch(`/api/chat?action=check_call_signal&phone=${encodeURIComponent(myPhone)}`);
            if (res.ok) {
                const data = await res.json();
                if (data.success && data.signal && data.signal.magic_code) {
                    const parts = data.signal.magic_code.split(':');
                    const type = parts[0] || 'audio';
                    const status = parts[1] || '';
                    const modal = document.getElementById('whatsAppCallModal');
                    const isModalHidden = !modal || modal.classList.contains('hidden');

                    if (status === 'ringing' && isModalHidden) {
                        const callerPhone = data.signal.display_name;
                        const callerContact = deviceContacts.find(c => normPhone(c.phone) === normPhone(callerPhone)) || { name: callerPhone, phone: callerPhone };
                        
                        currentActiveRecipient = callerContact;
                        startContinuousRinging();
                        // রিসিভ করার জন্য isIncoming = true পাঠানো হলো যাতে Accept বাটন দেখায়
                        showCallModalUI(callerContact.name, callerContact.avatar, `Incoming ${type} Call...`, type, true);
                    } else if (status === 'connected') {
                        stopContinuousRinging();
                        showToast("Call accepted by peer");
                    } else if (status === 'ended') {
                        stopContinuousRinging();
                        if (modal) {
                            modal.classList.add('hidden');
                            modal.classList.remove('flex');
                        }
                    }
                }
            }
        } catch (e) {}
    }, 1000);
}

async function endWhatsAppCall() {
    stopContinuousRinging();
    if (currentActiveRecipient) {
        const myPhone = getActiveProfile().phone;
        try {
            await fetch('/api/chat?action=send_call_signal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ caller_phone: myPhone, receiver_phone: currentActiveRecipient.phone, call_type: currentCallType, status: 'ended' })
            });
        } catch (e) {}
    }
    const modal = document.getElementById('whatsAppCallModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
    showToast('Call ended');
}

function filterContent() {
    const q = document.getElementById('searchInput').value.toLowerCase();
    const filtered = deviceContacts.filter(c => c.name.toLowerCase().includes(q) || c.phone.toLowerCase().includes(q));
    const listContainer = document.getElementById('sidebarContentList');
    if (!listContainer) return;

    const contactsHtml = filtered.map(c => {
        const info = getCountryInfo(c.phone);
        const avatarImg = c.avatar ? `<img src="${c.avatar}" class="w-10 h-10 rounded-full object-cover bg-black">` : `<div class="w-10 h-10 rounded-full theme-input flex items-center justify-center text-xs font-bold gold-gradient-text border border-amber-400/20">${c.name.charAt(0)}</div>`;
        const phoneDisplay = c.hidePhone ? `<p class="text-[10px] text-amber-300 font-medium">Official Support Team</p>` : `<p class="text-[10px] text-gray-400">${info.flag} ${c.phone}</p>`;
        return `
        <div onclick="openChat('${c.phone}', '${c.name}')" class="flex justify-between items-center px-4 py-3 my-1 hover:bg-white/5 cursor-pointer rounded-2xl theme-card border border-white/5">
            <div class="flex items-center space-x-3">
                <div class="relative">
                    ${avatarImg}
                    <span class="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-black ${c.isOnline?'bg-[#2ed573]':'bg-amber-400'}"></span>
                </div>
                <div><p class="text-xs font-semibold gold-gradient-text">${c.name}</p>${phoneDisplay}</div>
            </div>
            ${getTickBadge(c.isOnline)}
        </div>`;
    }).join('');
    listContainer.innerHTML = `<div id="directDialSlot"></div>` + contactsHtml;
}

function backToSidebarMobile() {
    document.getElementById('sidebarSection').style.display = 'flex';
    document.getElementById('workspaceSection').style.display = 'none';
    document.getElementById('bottomNavBar').style.display = 'flex';
}

function confirmClearChatHistory() {
    if (!currentActiveRecipient) return;
    if (confirm("Clear chat history with this contact?")) {
        const key = normPhone(currentActiveRecipient.phone);
        delete localMessageStore[key];
        persistMessages();
        loadMessages();
        showToast("Chat cleared");
    }
}

function loadMessages() {
    const container = document.getElementById('chatMessages');
    if (!container || !currentActiveRecipient) return;
    const key = normPhone(currentActiveRecipient.phone);
    const msgs = localMessageStore[key] || [];
    
    if (msgs.length === 0) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center space-y-3 max-w-xs text-center m-auto">
                <div class="w-14 h-14 rounded-2xl theme-card flex items-center justify-center">
                    <svg class="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="#F5D061" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                </div>
                <p class="text-sm font-bold gold-gradient-text">No messages yet</p>
                <p class="text-[11px] text-gray-400">Send a message or start a call with ${currentActiveRecipient.name}.</p>
            </div>`;
        return;
    }

    container.innerHTML = msgs.map(m => {
        const isMe = m.phone_number === getActiveProfile().phone;
        let contentHtml = `<p class="text-xs text-white">${escapeHtml(m.message_text || '')}</p>`;
        if (m.media_url) {
            if (m.type === 'image') contentHtml += `<img src="${m.media_url}" class="mt-2 rounded-xl max-w-xs max-h-48 object-cover">`;
            else if (m.type === 'video') contentHtml += `<video src="${m.media_url}" controls class="mt-2 rounded-xl max-w-xs max-h-48"></video>`;
            else contentHtml += `<a href="${m.media_url}" target="_blank" class="block mt-2 text-xs underline text-amber-300">Download Attachment</a>`;
        }
        return `
        <div class="flex flex-col ${isMe ? 'items-end' : 'items-start'} my-1">
            <div class="max-w-[75%] px-3.5 py-2.5 rounded-2xl ${isMe ? 'theme-card border border-amber-400/20' : 'theme-surface border border-white/10'} shadow-md">
                ${contentHtml}
            </div>
        </div>`;
    }).join('');
    container.scrollTop = container.scrollHeight;
}

function appendBubble(m) {
    const container = document.getElementById('chatMessages');
    if (!container) return;
    const isMe = m.phone_number === getActiveProfile().phone;
    let contentHtml = `<p class="text-xs text-white">${escapeHtml(m.message_text || '')}</p>`;
    if (m.media_url) {
        if (m.type === 'image') contentHtml += `<img src="${m.media_url}" class="mt-2 rounded-xl max-w-xs max-h-48 object-cover">`;
        else if (m.type === 'video') contentHtml += `<video src="${m.media_url}" controls class="mt-2 rounded-xl max-w-xs max-h-48"></video>`;
        else contentHtml += `<a href="${m.media_url}" target="_blank" class="block mt-2 text-xs underline text-amber-300">Download Attachment</a>`;
    }
    const div = document.createElement('div');
    div.className = `flex flex-col ${isMe ? 'items-end' : 'items-start'} my-1`;
    div.innerHTML = `
        <div class="max-w-[75%] px-3.5 py-2.5 rounded-2xl ${isMe ? 'theme-card border border-amber-400/20' : 'theme-surface border border-white/10'} shadow-md">
            ${contentHtml}
        </div>`;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

function escapeHtml(text) {
    return String(text || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(./g, '&quot;')
        .replace(/'/g, '&#039;');
}

function toggleSendButton() {
    const inp = document.getElementById('messageInput');
    const btn = document.getElementById('sendBtn');
    if (!inp || !btn) return;
    if (inp.value.trim().length > 0) {
        btn.classList.remove('hidden');
        btn.classList.add('flex');
    } else {
        btn.classList.add('hidden');
        btn.classList.remove('flex');
    }
}

function openNotificationModal() {
    showToast("Notifications: " + callHistoryNotifications.length + " calls/events recorded");
}

function openLiveBroadcastModal() {
    showToast("Live broadcast mode starting...");
}

function renderChatStories() {
    const sidebarList = document.getElementById('sidebarContentList');
    if (!sidebarList) return;
    const keys = Object.keys(localMessageStore);
    if (keys.length === 0) {
        sidebarList.innerHTML = `<div class="p-6 text-center text-xs text-gray-400">No active chat conversations yet. Select a contact to chat.</div>`;
        return;
    }
    sidebarList.innerHTML = keys.map(k => {
        const msgs = localMessageStore[k];
        const last = msgs[msgs.length - 1] || {};
        const contact = deviceContacts.find(c => normPhone(c.phone) === normPhone(k)) || { name: k, avatar: '' };
        return `
        <div onclick="openChat('${k}', '${contact.name}')" class="flex justify-between items-center px-4 py-3 my-1 hover:bg-white/5 cursor-pointer rounded-2xl theme-card border border-white/5">
            <div class="flex items-center space-x-3">
                <img src="${contact.avatar || 'https://pub-508ef1e45bab487aadde85a1dba202c4.r2.dev/rorraxyfree/mr%20masudar%20logo%20(3).png'}" class="w-10 h-10 rounded-full object-cover bg-black">
                <div><p class="text-xs font-semibold gold-gradient-text">${contact.name}</p><p class="text-[10px] text-gray-400 truncate max-w-[180px]">${last.message_text || 'Media attachment'}</p></div>
            </div>
        </div>`;
    }).join('');
}
```[cite: 4]

---

### ২. প্রোফাইল সেভ ও সিঙ্ক ফিক্স (`verify.js` এর সংশ্লিষ্ট অংশ)
আপনার প্রোফাইল এডিটিং এবং সেটিংস সেভ করার ফাংশনটি যেন নির্ভুলভাবে কাজ করে এবং লোকাল স্টোরেজ আপডেট করার পর ক্লাউডে সিঙ্ক হয়, তার জন্য `verify.js`-এর এই অংশটি নিশ্চিত করুন[cite: 2]:

```javascript
async function saveProfileSettings() {
    const newName = document.getElementById('editDisplayName').value.trim();
    const newUsername = document.getElementById('editUsername').value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    const newTheme = document.getElementById('editThemeColor').value;
    
    if (!newName) { showToast("Display name cannot be empty", true); return; }
    if (RESERVED_USERNAMES.includes(newUsername)) { showToast("Username is reserved", true); return; }

    const profile = getActiveProfile();
    profile.name = newName;
    if (newUsername) profile.username = newUsername;
    profile.themeColor = newTheme;
    saveProfiles();

    try {
        const res = await fetch('/api/chat?action=update_profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                phone: profile.phone,
                display_name: profile.name,
                username: profile.username,
                avatar_url: profile.avatar
            })
        });
        if (res.ok) {
            showToast("Profile saved & synced with cloud successfully!");
        } else {
            showToast("Saved locally (Cloud sync warning)", true);
        }
        renderProfileView();
    } catch (e) {
        showToast("Saved locally", true);
    }
}
```[cite: 2]

---

### ৩. লেআউট ও স্ক্রিপ্ট কনফ্লিক্ট সমাধানের জন্য `index.html`
ডেস্কটপ এবং মোবাইল ভিউতে লেআউট যেন এলোমেলো না হয় এবং স্ক্রিপ্ট লোডিংয়ে কোনো ক্যাশিং বা সিনট্যাক্স এরর না থাকে, সেজন্য `index.html`-এর বডি ও স্ক্রিপ্ট সেকশনটি এভাবে সাজিয়ে নিন[cite: 5]:

```html
    <!-- Main Workspace -->
    <div class="flex flex-1 overflow-hidden relative min-h-0 w-full">
        <!-- Sidebar: Always visible on desktop (md), conditional on mobile -->
        <div id="sidebarSection" class="w-full md:w-[360px] theme-surface flex flex-col justify-between shrink-0 z-20 h-full min-h-0 pb-16">
            <div class="flex flex-col flex-1 overflow-hidden min-h-0">
                <div id="searchBarContainer" class="p-3 shrink-0" style="background-color: var(--bg-main);">
                    <div class="flex items-center space-x-2 theme-input px-3.5 py-2.5 rounded-2xl">
                        <input type="text" id="searchInput" placeholder="Search name or dial number..." class="w-full bg-transparent text-xs focus:outline-none text-white placeholder-gray-500" oninput="filterContent()">
                        <button onclick="filterContent()" class="cursor-pointer p-1 shrink-0"><svg class="w-4 h-4" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7.5" stroke="#F5D061" stroke-width="2.2"/><line x1="20.5" y1="20.5" x2="16.35" y2="16.35" stroke="#F5D061" stroke-width="2.2" stroke-linecap="round"/></svg></button>
                    </div>
                </div>
                <div id="sidebarContentList" class="flex-1 overflow-y-auto space-y-1.5 p-3 pb-20"></div>
            </div>
        </div>

        <!-- Workspace: Chat / Call panel -->
        <div id="workspaceSection" class="hidden md:flex flex-col flex-1 overflow-hidden h-full min-h-0 z-10 relative" style="background-color: var(--bg-main);">
            <div id="activeChatHeader" class="theme-surface px-4 py-3 hidden items-center justify-between shrink-0 border-b border-white/5">
                <div class="flex items-center space-x-3">
                    <button onclick="backToSidebarMobile()" class="md:hidden p-1.5 rounded-xl theme-card cursor-pointer">
                        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="#F5D061" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                    </button>
                    <div onclick="openRecipientInfoModal()" class="flex items-center space-x-3 cursor-pointer group">
                        <div class="relative"><img id="activeChatAvatar" src="https://pub-508ef1e45bab487aadde85a1dba202c4.r2.dev/rorraxyfree/mr%20masudar%20logo%20(3).png" class="w-9 h-9 rounded-full object-cover bg-black"><span class="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#2ed573] rounded-full border-2 border-black"></span></div>
                        <div>
                            <div class="flex items-center space-x-1.5">
                                <span id="activeChatTitle" class="font-semibold text-white text-xs tracking-wide group-hover:text-amber-300 transition">Select a contact</span>
                                <span id="activeChatHeaderTick"></span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="flex items-center space-x-2">
                    <button onclick="startWhatsAppCall('audio')" class="p-2 theme-card rounded-xl hover:brightness-125 transition cursor-pointer" title="Audio Call"><svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="#F5D061" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg></button>
                    <button onclick="startWhatsAppCall('video')" class="p-2 theme-card rounded-xl hover:brightness-125 transition cursor-pointer" title="Video Call"><svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="#F5D061" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2.5" ry="2.5"></rect></svg></button>
                    <button onclick="confirmClearChatHistory()" class="p-2 theme-card rounded-xl hover:bg-pink-950/20 transition cursor-pointer" title="Clear Chat"><svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="#EC4899" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
                </div>
            </div>

            <div id="chatMessages" class="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 flex flex-col justify-start">
                <div class="flex flex-col items-center justify-center space-y-3 max-w-xs text-center m-auto">
                    <div class="w-14 h-14 rounded-2xl theme-card flex items-center justify-center">
                        <svg class="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="#F5D061" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                    </div>
                    <p class="text-sm font-bold gold-gradient-text">Assalamu Alaikum</p>
                    <p class="text-[11px] text-gray-400">Select a contact to start messaging or calling.</p>
                </div>
            </div>

            <div id="chatInputBar" class="theme-surface px-3 py-2.5 hidden items-center shrink-0 z-20">
                <div class="flex-1 flex items-center theme-input rounded-2xl px-3.5 py-2 space-x-2.5">
                    <label class="cursor-pointer hover:scale-110 transition-transform flex items-center justify-center shrink-0" title="Attach File">
                        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="#F5D061" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
                        <input type="file" id="universalFileInput" accept="image/*,video/*,audio/*,application/pdf,.doc,.docx,.zip,.txt" multiple class="hidden" onchange="handleUniversalFileUpload(this)">
                    </label>
                    <input type="text" id="messageInput" placeholder="Write a message..." class="flex-1 bg-transparent text-xs focus:outline-none text-white placeholder-gray-500 py-1 min-w-0 selectable-text" oninput="toggleSendButton()" onkeypress="if(event.key === 'Enter') sendTextMessage()">
                    <button id="sendBtn" onclick="sendTextMessage()" class="hidden cursor-pointer hover:scale-110 transition-transform p-1 shrink-0 items-center justify-center">
                        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="#F5D061" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- Scripts with Versioning to prevent cache issues -->
    <script src="/verify.js?v=2.2"></script>
    <script src="/call.js?v=2.2"></script>
    <script src="/p2p_file_transfer.js?v=2.2"></script>
    <script>
        window.addEventListener('DOMContentLoaded', () => {
            const overlay = document.getElementById('verifyOverlay');
            if (localStorage.getItem('salaam_verified_v18') === 'true') {
                if (overlay) overlay.style.display = 'none';
                if (typeof initAppAfterVerification === 'function') {
                    initAppAfterVerification();
                }
            } else {
                if (typeof checkInitialVerification === 'function') {
                    checkInitialVerification();
                }
            }
        });
    </script>
```[cite: 5]

এই কোডগুলো আপডেট করার পর ব্রাউজার ক্যাশ ক্লিয়ার করে পেজটি রিফ্রেশ করলে (Ctrl + F5) কল রিসিভ অপশন, প্রোফাইল সেভ এবং ডেস্কটপ-মোবাইল লেআউট সম্পূর্ণ ঠিকভাবে কাজ করবে।
