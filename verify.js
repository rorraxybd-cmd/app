let currentTab = 'contact', currentActiveRecipient = null, confirmCallback = null, deferredPrompt = null;
let generatedOtpCode = "", tempVerifyPhone = "", tempVerifyName = "", userDeviceIp = "Detecting...";

// PWA App Install Handler
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const container = document.getElementById('pwaInstallContainer');
    if (container) container.classList.remove('hidden');
});

function installPWAApp() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                document.getElementById('pwaInstallContainer')?.classList.add('hidden');
            }
            deferredPrompt = null;
        });
    } else {
        showToast("Use browser menu and tap 'Add to Home Screen' to install.", false);
    }
}

let currentTheme = localStorage.getItem('salaam_theme') || 'black';
let globalSoundEnabled = localStorage.getItem('salaam_sound_on') !== 'false';
let callHistoryNotifications = JSON.parse(localStorage.getItem('salaam_call_notifications') || '[]');
let localMessageStore = JSON.parse(localStorage.getItem('salaam_messages_v12') || '{}');
let isVerifiedSession = localStorage.getItem('salaam_verified_v12') === 'true';

const DEFAULT_PROFILES = [{
    name: "Masudar Rahman",
    phone: "+8801700000000",
    username: "mrmasudar",
    privacy: "public",
    avatar: "https://pub-508ef1e45bab487aadde85a1dba202c4.r2.dev/im.jpg"
}];

let savedProfiles = JSON.parse(localStorage.getItem('salaam_profiles_v12') || 'null') || DEFAULT_PROFILES;
let deviceContacts = JSON.parse(localStorage.getItem('salaam_contacts_v12') || 'null') || [
    { name: "rorraxy", phone: "+8801711111111", appUser: true, isOnline: true, lastMsg: "" },
    { name: "Mamun Rashid", phone: "+8801800000000", appUser: true, isOnline: true, lastMsg: "" }
];

function getActiveProfile() { return savedProfiles[0]; }
function saveProfiles() { localStorage.setItem('salaam_profiles_v12', JSON.stringify(savedProfiles)); }
function saveContacts() { localStorage.setItem('salaam_contacts_v12', JSON.stringify(deviceContacts)); }
function normPhone(p) { return String(p || '').replace(/[\s\-\(\)]/g, ''); }

function persistMessages() {
    localStorage.setItem('salaam_messages_v12', JSON.stringify(localMessageStore));
}

function showToast(msg, isErr = false) {
    const b = document.getElementById('toastBanner');
    const dot = document.getElementById('toastDot');
    const text = document.getElementById('toastText');
    if (!b) return;
    dot.style.backgroundColor = isErr ? '#ff2e7e' : '#2ed573';
    text.innerText = msg;
    b.classList.remove('hidden');
    b.classList.add('flex');
    setTimeout(() => { b.classList.add('hidden'); b.classList.remove('flex'); }, 2200);
}

function updatePhoneValidation() {
    const select = document.getElementById('vCountrySelect');
    const phoneInput = document.getElementById('vPhoneInput');
    if (!select || !phoneInput) return;
    const val = select.value.split('|');
    phoneInput.maxLength = val[1];
    phoneInput.placeholder = "Enter " + val[1] + " digits number";
}

async function detectUserIp() {
    try {
        const res = await fetch('https://ipapi.co/json/').catch(() => null);
        if (res && res.ok) {
            const data = await res.json();
            userDeviceIp = data.ip || 'Unknown';
        }
    } catch (e) { userDeviceIp = 'Unknown'; }
}

function checkInitialVerification() {
    detectUserIp();
    if (!isVerifiedSession) {
        document.getElementById('verifyOverlay').style.display = 'flex';
        updatePhoneValidation();
    } else {
        document.getElementById('verifyOverlay').style.display = 'none';
        switchTab('contact');
    }
}

async function submitVerifyStep1() {
    const name = document.getElementById('vFullName').value.trim();
    const selectData = document.getElementById('vCountrySelect').value.split('|');
    const countryCode = selectData[0];
    const requiredLen = parseInt(selectData[1], 10);
    const phone = document.getElementById('vPhoneInput').value.trim();

    if (!name) { showToast("Please enter your full name", true); return; }
    if (!phone || phone.length < requiredLen - 1) {
        showToast(`Please enter a valid number (${requiredLen} digits)`, true);
        return;
    }

    tempVerifyName = name;
    tempVerifyPhone = countryCode + phone;
    generatedOtpCode = Math.floor(100000 + Math.random() * 900000).toString();

    try {
        await fetch('/api/chat?action=send_magic_link', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                display_name: tempVerifyName,
                phone: tempVerifyPhone,
                magic_code: generatedOtpCode,
                ip: userDeviceIp
            })
        });
    } catch (e) {}

    document.getElementById('verifyStep1').style.display = 'none';
    document.getElementById('verifyStep2').style.display = 'block';
    document.getElementById('vDisplayCode').innerText = generatedOtpCode;
    showToast("6-digit verification code generated!");
}

function autoFillOtp() {
    document.getElementById('vOtpInput').value = generatedOtpCode;
}

async function submitVerifyStep2() {
    const entered = document.getElementById('vOtpInput').value.trim();
    if (entered !== generatedOtpCode) { showToast("Invalid verification code", true); return; }

    isVerifiedSession = true;
    localStorage.setItem('salaam_verified_v12', 'true');
    const p = getActiveProfile();
    p.name = tempVerifyName;
    p.phone = tempVerifyPhone;
    saveProfiles();

    try {
        await fetch('/api/chat?action=verify_magic_code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                phone: tempVerifyPhone,
                magic_code: entered,
                ip: userDeviceIp,
                unique_affiliate_id: 'user_' + Date.now()
            })
        });
    } catch (e) {}

    if (typeof confetti === 'function') confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
    document.getElementById('verifyOverlay').style.display = 'none';
    showToast("Verified & Authorized Successfully!");
    switchTab('contact');
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
        tab === 'chat' ? renderChatStories() : renderDeviceContacts();
    }
    if (window.innerWidth < 768) {
        document.getElementById('sidebarSection').style.display = 'flex';
        document.getElementById('workspaceSection').style.display = 'none';
    }
}

function applyTheme(t) {
    currentTheme = t;
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem('salaam_theme', t);
    if (currentTab === 'profile') renderProfileView();
}

function renderProfileView() {
    const p = getActiveProfile();
    document.getElementById('sidebarContentList').innerHTML = `
        <div class="p-3 space-y-3 text-xs pb-20 animate-list-item">
            <div class="flex flex-col items-center space-y-3 pb-3 theme-card p-5 rounded-2xl relative border border-white/5">
                <span class="absolute top-3 right-3 px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-[#2ed573]">VERIFIED</span>
                <img src="${p.avatar}" class="w-20 h-20 rounded-full object-cover bg-black border border-amber-400/30">
                <div class="text-center"><p class="font-bold text-sm gold-gradient-text">${p.name}</p><p class="text-[11px] text-amber-300">@${p.username}</p></div>
            </div>

            <div class="space-y-3 theme-card p-4 rounded-2xl border border-white/5">
                <div class="flex justify-between items-center"><span class="font-bold gold-gradient-text">Account Details</span><button onclick="let f=document.getElementById('editBox'); f.style.display=f.style.display==='block'?'none':'block'" class="text-[11px] pink-gradient-text font-semibold cursor-pointer">Edit Profile</button></div>
                <p class="flex justify-between text-gray-400">Phone: <span class="text-amber-300">${p.phone}</span></p>
            </div>

            <div id="editBox" class="space-y-2.5 theme-card p-4 rounded-2xl hidden border border-white/5">
                <label class="text-[10px] text-amber-300 font-bold block">Update Name & Username</label>
                <input type="text" id="eName" value="${p.name}" placeholder="Full Name" class="w-full theme-input text-xs px-3 py-2.5 rounded-xl text-white">
                <input type="text" id="eUsername" value="${p.username}" placeholder="Username" class="w-full theme-input text-xs px-3 py-2.5 rounded-xl text-white">
                <button onclick="p.name=document.getElementById('eName').value;p.username=document.getElementById('eUsername').value;saveProfiles();renderProfileView();showToast('Profile Updated')" class="gold-btn w-full py-2.5 rounded-xl text-xs font-bold cursor-pointer">Save Changes</button>
            </div>

            <div class="space-y-2 theme-card p-4 rounded-2xl border border-white/5">
                <div class="flex items-center justify-between"><span class="font-bold gold-gradient-text">Theme</span><span class="text-[10px] text-gray-400">${currentTheme === 'black' ? 'Pure Black' : 'Emerald'}</span></div>
                <div class="grid grid-cols-2 gap-2">
                    <button onclick="applyTheme('black')" class="py-2 px-3 rounded-xl text-[11px] font-semibold flex items-center justify-center space-x-2 transition cursor-pointer ${currentTheme === 'black' ? 'bg-amber-500/20 text-white' : 'bg-black/50 text-gray-400'}"><span>Pure Black</span></button>
                    <button onclick="applyTheme('emerald')" class="py-2 px-3 rounded-xl text-[11px] font-semibold flex items-center justify-center space-x-2 transition cursor-pointer ${currentTheme === 'emerald' ? 'bg-emerald-500/20 text-white' : 'bg-[#04120b]/70 text-gray-400'}"><span>Emerald</span></button>
                </div>
            </div>
        </div>`;
}

function getTickBadge(on) {
    return `<span class="inline-flex items-center justify-center w-5 h-5 rounded-full ${on?'bg-[#2ed573]/15 text-[#2ed573]':'bg-amber-400/15 text-amber-300'}"><svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></span>`;
}

function renderDeviceContacts() {
    document.getElementById('sidebarContentList').innerHTML = deviceContacts.map(c => `
        <div onclick="openChat('${c.phone}', '${c.name}')" class="animate-list-item flex justify-between items-center px-4 py-3 my-1 hover:bg-white/5 cursor-pointer rounded-2xl theme-card border border-white/5">
            <div class="flex items-center space-x-3">
                <div class="relative w-10 h-10 rounded-full theme-card flex items-center justify-center text-xs font-bold gold-gradient-text">${c.name.charAt(0)}<span class="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-black ${c.isOnline?'bg-[#2ed573]':'bg-amber-400'}"></span></div>
                <div><p class="text-xs font-semibold gold-gradient-text">${c.name}</p><p class="text-[10px] text-gray-400">${c.phone}</p></div>
            </div>
            ${getTickBadge(c.isOnline)}
        </div>`).join('');
}

function renderChatStories() {
    document.getElementById('sidebarContentList').innerHTML = deviceContacts.filter(c => c.appUser).map(c => {
        const msgs = localMessageStore[c.phone] || [];
        const last = msgs.length ? (msgs[msgs.length - 1].type === 'image' ? 'Photo' : (msgs[msgs.length - 1].type === 'video' ? 'Video' : msgs[msgs.length - 1].message_text)) : c.lastMsg;
        return `
        <div onclick="openChat('${c.phone}', '${c.name}')" class="animate-list-item px-4 py-3 my-1 hover:bg-white/5 cursor-pointer flex items-center justify-between rounded-2xl theme-card border border-white/5">
            <div class="flex items-center space-x-3 flex-1 min-w-0">
                <div class="relative"><img src="https://pub-508ef1e45bab487aadde85a1dba202c4.r2.dev/im.jpg" class="w-10 h-10 rounded-full object-cover"><span class="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-black ${c.isOnline?'bg-[#2ed573]':'bg-amber-400'}"></span></div>
                <div class="flex-1 min-w-0"><span class="font-semibold text-xs gold-gradient-text truncate block">${c.name}</span><p class="text-[11px] text-gray-400 truncate">${last || 'Tap to message'}</p></div>
            </div>
            ${getTickBadge(c.isOnline)}
        </div>`;
    }).join('');
}

function filterContent() {
    const q = document.getElementById('searchInput').value.toLowerCase();
    document.querySelectorAll('#sidebarContentList > div').forEach(el => {
        el.style.display = el.innerText.toLowerCase().includes(q) ? 'flex' : 'none';
    });
}

function openChat(phone, name) {
    const cp = normPhone(phone);
    currentActiveRecipient = { phone: cp, name: name || cp, isOnline: true };
    document.getElementById('activeChatHeader').style.display = 'flex';
    document.getElementById('chatInputBar').style.display = 'flex';
    document.getElementById('activeChatTitle').innerText = name || cp;
    document.getElementById('activeChatHeaderTick').innerHTML = getTickBadge(true);
    if (window.innerWidth < 768) {
        document.getElementById('sidebarSection').style.display = 'none';
        document.getElementById('workspaceSection').style.display = 'flex';
        document.getElementById('bottomNavBar').style.display = 'none';
    }
    loadMessages(true);
}

function backToSidebarMobile() {
    document.getElementById('sidebarSection').style.display = 'flex';
    document.getElementById('workspaceSection').style.display = 'none';
    document.getElementById('bottomNavBar').style.display = 'flex';
}

function toggleSendButton() {
    const t = document.getElementById('messageInput').value.trim();
    const b = document.getElementById('sendBtn');
    t.length ? (b.classList.remove('hidden'), b.classList.add('flex')) : (b.classList.add('hidden'), b.classList.remove('flex'));
}

async function sendTextMessage() {
    if (!currentActiveRecipient) return;
    const inp = document.getElementById('messageInput');
    const text = inp.value.trim();
    if (!text) return;
    inp.value = '';
    toggleSendButton();
    const key = normPhone(currentActiveRecipient.phone);
    const me = getActiveProfile().phone;
    if (!localMessageStore[key]) localMessageStore[key] = [];
    const msg = { id: 'm_' + Date.now(), phone_number: me, message_text: text, type: 'text' };
    localMessageStore[key].push(msg);
    appendBubble(msg, localMessageStore[key].length - 1, true);
    persistMessages();
    if (currentTab === 'chat') renderChatStories();
    scrollChatToBottom();
}

async function sendFilesDirectly(input) {
    if (!currentActiveRecipient || !input.files.length) return;
    const key = normPhone(currentActiveRecipient.phone);
    const me = getActiveProfile().phone;
    if (!localMessageStore[key]) localMessageStore[key] = [];
    for (const f of input.files) {
        const type = f.type.startsWith('image/') ? 'image' : (f.type.startsWith('video/') ? 'video' : 'file');
        await new Promise(res => {
            const r = new FileReader();
            r.onload = e => {
                const msg = { id: 'm_' + Date.now() + Math.random(), phone_number: me, message_text: f.name, media_url: e.target.result, type };
                localMessageStore[key].push(msg);
                appendBubble(msg, localMessageStore[key].length - 1, true);
                res();
            };
            r.readAsDataURL(f);
        });
    }
    input.value = '';
    persistMessages();
    if (currentTab === 'chat') renderChatStories();
    scrollChatToBottom();
}

function appendBubble(msg, idx, animate = false) {
    const c = document.getElementById('chatMessages');
    if (c.querySelector('.empty-placeholder')) c.innerHTML = '';
    const isMe = msg.phone_number === getActiveProfile().phone;
    const div = document.createElement('div');
    div.className = `max-w-[85%] md:max-w-sm p-3 rounded-2xl text-xs relative selectable-text ${animate ? 'animate-msg' : ''} ${isMe ? 'self-end text-white rounded-br-sm ml-auto chat-bubble-me' : 'self-start text-white rounded-bl-sm mr-auto chat-bubble-them'}`;

    let html = '';
    if (msg.type === 'image') {
        html = `<div class="space-y-2"><img src="${msg.media_url}" onload="scrollChatToBottom()" class="max-h-64 w-full rounded-xl object-cover"><div class="flex justify-between items-center px-1"><a href="${msg.media_url}" download="${msg.message_text}" class="text-[11px] pink-gradient-text font-semibold hover:underline">Download Image</a></div></div>`;
    } else if (msg.type === 'video') {
        html = `<div class="space-y-2"><video src="${msg.media_url}" controls class="max-h-64 w-full rounded-xl object-cover"></video><div class="flex justify-between items-center px-1"><a href="${msg.media_url}" download="${msg.message_text}" class="text-[11px] pink-gradient-text font-semibold hover:underline">Download Video</a></div></div>`;
    } else if (msg.type === 'file') {
        html = `<div class="flex items-center justify-between space-x-3"><span class="truncate font-medium text-amber-300"><i class="fa-solid fa-file mr-1.5"></i>${msg.message_text}</span><a href="${msg.media_url}" download="${msg.message_text}" class="gold-btn px-2.5 py-1 rounded-lg text-[10px]">Download</a></div>`;
    } else {
        html = `<p class="whitespace-pre-wrap break-words selectable-text">${msg.message_text}</p>`;
    }
    div.innerHTML = html;
    c.appendChild(div);
}

function loadMessages(animate = false) {
    if (!currentActiveRecipient) return;
    const c = document.getElementById('chatMessages');
    const msgs = localMessageStore[currentActiveRecipient.phone] || [];
    c.innerHTML = '';
    if (msgs.length) {
        msgs.forEach((m, i) => appendBubble(m, i, animate && i === msgs.length - 1));
        scrollChatToBottom();
    } else {
        c.innerHTML = `<div class="empty-placeholder flex flex-col items-center justify-center space-y-3 text-center m-auto"><p class="text-sm font-bold gold-gradient-text">Start Conversation</p></div>`;
    }
}

function scrollChatToBottom() {
    const c = document.getElementById('chatMessages');
    if (c) requestAnimationFrame(() => c.scrollTop = c.scrollHeight);
}

function confirmClearChatHistory() {
    showCustomConfirmModal("Clear all chat history?", (confirmed) => {
        if (confirmed && currentActiveRecipient) {
            localMessageStore[currentActiveRecipient.phone] = [];
            persistMessages();
            loadMessages();
            showToast('Chat cleared');
        }
    });
}

function showCustomConfirmModal(text, callback) {
    document.getElementById('confirmModalText').innerText = text;
    document.getElementById('customConfirmModal').classList.remove('hidden');
    document.getElementById('customConfirmModal').classList.add('flex');
    confirmCallback = callback;
}

function closeConfirmModal(res) {
    document.getElementById('customConfirmModal').classList.add('hidden');
    document.getElementById('customConfirmModal').classList.remove('flex');
    if (confirmCallback) confirmCallback(res);
    confirmCallback = null;
}

function startWhatsAppCall(mode) {
    if (!currentActiveRecipient) return;
    callHistoryNotifications.unshift({ text: `${mode === 'video' ? 'Video' : 'Audio'} call with ${currentActiveRecipient.name}`, time: Date.now() });
    document.getElementById('whatsAppCallModal').classList.remove('hidden');
    document.getElementById('whatsAppCallModal').classList.add('flex');
    document.getElementById('callPeerName').innerText = currentActiveRecipient.name;
}

function endWhatsAppCall() {
    document.getElementById('whatsAppCallModal').classList.add('hidden');
    document.getElementById('whatsAppCallModal').classList.remove('flex');
    showToast('Call ended');
}

function openRecipientInfoModal() {
    if (!currentActiveRecipient) return;
    document.getElementById('infoModalName').innerText = currentActiveRecipient.name;
    document.getElementById('infoModalPhoneContainer').innerHTML = `<span class="text-xs text-amber-300 font-medium">${currentActiveRecipient.phone}</span><button onclick="navigator.clipboard.writeText('${currentActiveRecipient.phone}');showToast('Copied!')" class="gold-btn px-3 py-1 rounded-xl text-[10px] cursor-pointer">Copy</button>`;
    document.getElementById('recipientInfoModal').classList.remove('hidden');
    document.getElementById('recipientInfoModal').classList.add('flex');
}
function closeRecipientInfoModal() { document.getElementById('recipientInfoModal').classList.add('hidden'); document.getElementById('recipientInfoModal').classList.remove('flex'); }

function openNotificationModal() {
    const list = document.getElementById('modalNotifList');
    document.getElementById('modalNotifCountBadge').innerText = callHistoryNotifications.length;
    list.innerHTML = callHistoryNotifications.length ? callHistoryNotifications.map(n => `<div class="text-[11px] bg-black/40 p-2.5 rounded-xl border border-white/5">${n.text}</div>`).join('') : `<p class="text-xs text-gray-400 text-center py-4">No notifications</p>`;
    document.getElementById('notificationModal').classList.remove('hidden');
    document.getElementById('notificationModal').classList.add('flex');
}
function closeNotificationModal() { document.getElementById('notificationModal').classList.add('hidden'); document.getElementById('notificationModal').classList.remove('flex'); }
function clearAllNotifications() { callHistoryNotifications = []; closeNotificationModal(); showToast('All notifications cleared'); }

window.addEventListener('DOMContentLoaded', () => {
    applyTheme(currentTheme);
    checkInitialVerification();
});
