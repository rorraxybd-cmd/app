let currentTab = 'contact', currentActiveRecipient = null;
let currentCallType = 'audio', activeShareData = null;
let callRingInterval = null, activeAudioCtx = null, localLiveStream = null, callPollInterval = null, chatPollInterval = null;
let callHistoryNotifications = JSON.parse(localStorage.getItem('salaam_call_notifications') || '[]');
let localMessageStore = JSON.parse(localStorage.getItem('salaam_messages_v18') || '{}');
let deviceContacts = JSON.parse(localStorage.getItem('salaam_contacts_v18') || 'null') || [
    { name: "rorraxy Support", phone: "+8801538187301", appUser: true, isOnline: true, lastMsg: "Official Support Team", avatar: "https://pub-508ef1e45bab487aadde85a1dba202c4.r2.dev/rorraxyfree/mr%20masudar%20logo%20(3).png", hidePhone: true }
];

function persistMessages() { localStorage.setItem('salaam_messages_v18', JSON.stringify(localMessageStore)); }

function showToast(msg, isErr = false) {
    const b = document.getElementById('toastBanner'), dot = document.getElementById('toastDot'), text = document.getElementById('toastText');
    if (!b) return;
    dot.style.backgroundColor = isErr ? '#ff2e7e' : '#2ed573';
    text.innerText = msg;
    b.classList.remove('hidden'); b.classList.add('flex');
    setTimeout(() => { b.classList.add('hidden'); b.classList.remove('flex'); }, 2200);
}

function initAppAfterVerification() {
    syncGlobalNetworkUsers();
    switchTab('contact');
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
    if (!isVerifiedSession) { checkInitialVerification(); return; }
    currentTab = tab;
    ['profile', 'contact', 'chat'].forEach(t => {
        const isSel = (t === tab);
        const lbl = document.getElementById('label' + t.charAt(0).toUpperCase() + t.slice(1));
        const icn = document.getElementById('icon' + t.charAt(0).toUpperCase() + t.slice(1));
        if (lbl) lbl.className = `nav-label text-[10px] ${isSel ? 'pink-gradient-text font-bold' : 'gold-gradient-text font-semibold'}`;
        if (icn) icn.setAttribute('stroke', isSel ? '#EC4899' : '#F5D061');
    });

    const sb = document.getElementById('searchBarContainer');
    if (tab === 'profile') { sb.style.display = 'none'; renderProfileView(); }
    else {
        sb.style.display = 'block';
        document.getElementById('searchInput').value = '';
        if (tab === 'chat') renderChatStories();
        else {
            syncGlobalNetworkUsers();
            renderDeviceContacts();
        }
    }
    if (window.innerWidth < 768) {
        document.getElementById('sidebarSection').style.display = 'flex';
        document.getElementById('workspaceSection').style.display = 'none';
    }
}

function renderDeviceContacts() {
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

    document.getElementById('sidebarContentList').innerHTML = `<div id="directDialSlot"></div>` + contactsHtml;
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
    
    const msg = { id: 'm_' + Date.now(), phone_number: me, message_text: text, type: 'text' };
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
                    const [mType, mText, mUrl] = (m.payload || '').split(':');
                    const exists = localMessageStore[key].some(existing => existing.message_text === mText && existing.phone_number === m.sender_phone);
                    if (!exists) {
                        localMessageStore[key].push({
                            id: 'm_' + Date.now() + Math.random(),
                            phone_number: m.sender_phone,
                            message_text: mText || '',
                            media_url: mUrl && mUrl !== 'undefined' ? mUrl : null,
                            type: mType || 'text'
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
    chatPollInterval = setInterval(() => { if (currentActiveRecipient && isVerifiedSession) fetchMessagesFromCloud(); }, 2000);
}

function startIncomingCallPolling() {
    if (callPollInterval) clearInterval(callPollInterval);
    callPollInterval = setInterval(async () => {
        if (!isVerifiedSession) return;
        const myPhone = getActiveProfile().phone;
        try {
            const res = await fetch(`/api/chat?action=check_call_signal&phone=${encodeURIComponent(myPhone)}`);
            if (res.ok) {
                const data = await res.json();
                if (data.success && data.signal && data.signal.magic_code) {
                    const [type, status] = data.signal.magic_code.split(':');
                    if (status === 'ringing' && document.getElementById('whatsAppCallModal').classList.contains('hidden')) {
                        const callerPhone = data.signal.display_name;
                        const callerContact = deviceContacts.find(c => normPhone(c.phone) === normPhone(callerPhone)) || { name: callerPhone, phone: callerPhone };
                        currentActiveRecipient = callerContact;
                        document.getElementById('callPeerName').innerText = callerContact.name;
                        document.getElementById('callStatusLabel').innerText = `Incoming ${type} Call...`;
                        document.getElementById('whatsAppCallModal').classList.remove('hidden');
                        document.getElementById('whatsAppCallModal').classList.add('flex');
                    } else if (status === 'ended') {
                        document.getElementById('whatsAppCallModal').classList.add('hidden');
                        document.getElementById('whatsAppCallModal').classList.remove('flex');
                    }
                }
            }
        } catch (e) {}
    }, 1000);
}
