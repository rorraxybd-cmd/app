let currentTab = 'contact', currentActiveRecipient = null;
let currentCallType = 'audio', activeCallPeer = null, isCallActive = false;
let callRingInterval = null, activeAudioCtx = null, callPollInterval = null, chatPollInterval = null;
let callTimerInterval = null, callSeconds = 0;
let peerConnection = null, localStream = null, remoteStream = null;
let isMicMuted = false, lastHandledSignalTs = 0;

let callHistoryNotifications = JSON.parse(localStorage.getItem('salaam_call_notifications') || '[]');
let localMessageStore = JSON.parse(localStorage.getItem('salaam_messages_v18') || '{}');
let deviceContacts = JSON.parse(localStorage.getItem('salaam_contacts_v18') || 'null') || [
    { name: "rorraxy Support", phone: "+8801538187301", appUser: true, isOnline: true, lastMsg: "Official Support Team", avatar: "https://pub-508ef1e45bab487aadde85a1dba202c4.r2.dev/rorraxyfree/mr%20masudar%20logo%20(3).png", hidePhone: true }
];

const RTC_CONFIG = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

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
    setTimeout(() => { switchTab('contact'); }, 100);
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
        if (typeof renderProfileView === 'function') renderProfileView(); 
    } else {
        if (sb) sb.style.display = 'block';
        const searchInput = document.getElementById('searchInput');
        if (searchInput) searchInput.value = '';
        if (tab === 'chat') renderChatStories();
        else { syncGlobalNetworkUsers(); renderDeviceContacts(); }
    }
    
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
    toggleSendButton();
    
    const key = normPhone(currentActiveRecipient.phone), me = normPhone(getActiveProfile().phone);
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
    const me = normPhone(getActiveProfile().phone);
    const key = normPhone(currentActiveRecipient.phone);
    try {
        const res = await fetch(`/api/chat?action=get_chat_messages&phone=${encodeURIComponent(key)}&my_phone=${encodeURIComponent(me)}`);
        if (res.ok) {
            const data = await res.json();
            if (data.success && Array.isArray(data.messages)) {
                if (!localMessageStore[key]) localMessageStore[key] = [];
                let updated = false;
                data.messages.forEach(m => {
                    const sender = normPhone(m.sender_phone);
                    const mText = (m.message_text || '').trim();
                    const mUrl = m.media_url && m.media_url !== 'undefined' ? m.media_url : '';
                    const mType = mUrl ? (mUrl.startsWith('data:video/') ? 'video' : 'image') : 'text';
                    
                    const exists = localMessageStore[key].some(existing => 
                        normPhone(existing.phone_number) === sender &&
                        (existing.message_text || '').trim() === mText && 
                        (existing.media_url || '') === mUrl
                    );

                    if (!exists && (mText || mUrl)) {
                        localMessageStore[key].push({
                            id: 'm_' + Date.now() + Math.random(),
                            phone_number: sender,
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
    chatPollInterval = setInterval(() => { if (currentActiveRecipient) fetchMessagesFromCloud(); }, 3000);
}

// ==========================================
// রিয়েল-টাইম অডিও ও ফুল-স্ক্রিন ভিডিও কলিং (WebRTC)
// ==========================================

function startContinuousRinging() {
    stopContinuousRinging();
    const playTone = () => {
        try {
            if (!activeAudioCtx) activeAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
            if (activeAudioCtx.state === 'suspended') activeAudioCtx.resume();
            const osc = activeAudioCtx.createOscillator();
            const gain = activeAudioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(480, activeAudioCtx.currentTime);
            gain.gain.setValueAtTime(0.15, activeAudioCtx.currentTime);
            osc.connect(gain);
            gain.connect(activeAudioCtx.destination);
            osc.start();
            osc.stop(activeAudioCtx.currentTime + 0.6);
        } catch (e) {}
    };
    playTone();
    callRingInterval = setInterval(playTone, 1800);
}

function stopContinuousRinging() {
    if (callRingInterval) {
        clearInterval(callRingInterval);
        callRingInterval = null;
    }
}

function startCallDurationTimer() {
    stopCallDurationTimer();
    callSeconds = 0;
    callTimerInterval = setInterval(() => {
        callSeconds++;
        const mins = String(Math.floor(callSeconds / 60)).padStart(2, '0');
        const secs = String(callSeconds % 60).padStart(2, '0');
        const lbl = document.getElementById('callStatusLabel');
        if (lbl) lbl.innerText = `Connected • ${mins}:${secs}`;
    }, 1000);
}

function stopCallDurationTimer() {
    if (callTimerInterval) {
        clearInterval(callTimerInterval);
        callTimerInterval = null;
    }
}

async function setupLocalMedia(mode) {
    try {
        if (localStream) {
            localStream.getTracks().forEach(t => t.stop());
        }
        // উন্নত অডিও (Echo Cancellation সহ) ও ভিডিও পারমিশন
        localStream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
            video: mode === 'video' ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false
        });
        
        const localVid = document.getElementById('callLocalVideo');
        const videoContainer = document.getElementById('videoStreamsBox');
        if (mode === 'video' && localVid && videoContainer) {
            videoContainer.classList.remove('hidden');
            localVid.srcObject = localStream;
        }
        return localStream;
    } catch (err) {
        showToast("Camera or Microphone permission denied", true);
        return null;
    }
}

function createPeerConnection(peerPhone) {
    if (peerConnection) {
        peerConnection.close();
    }
    peerConnection = new RTCPeerConnection(RTC_CONFIG);

    if (localStream) {
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });
    }

    peerConnection.ontrack = (event) => {
        const remoteVid = document.getElementById('callRemoteVideo');
        const remoteAud = document.getElementById('callRemoteAudio');
        if (event.streams && event.streams[0]) {
            remoteStream = event.streams[0];
            if (remoteVid) {
                remoteVid.srcObject = remoteStream;
                remoteVid.play().catch(e => {});
            }
            if (remoteAud) {
                remoteAud.srcObject = remoteStream;
                remoteAud.play().catch(e => {});
            }
        }
    };

    return peerConnection;
}

// কল শুরু করা (Caller)
async function startWhatsAppCall(mode) {
    if (!currentActiveRecipient) {
        showToast("Select a contact first", true);
        return;
    }
    const myPhone = normPhone(getActiveProfile().phone);
    const peerPhone = normPhone(currentActiveRecipient.phone);

    if (myPhone === peerPhone) {
        showToast("You cannot call your own number", true);
        return;
    }

    currentCallType = mode;
    activeCallPeer = currentActiveRecipient;
    isCallActive = true;

    renderCallModal(activeCallPeer.name, activeCallPeer.avatar, `Calling ${activeCallPeer.name}...`, mode, false);
    startContinuousRinging();

    const stream = await setupLocalMedia(mode);
    const pc = createPeerConnection(peerPhone);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    await new Promise(resolve => {
        if (pc.iceGatheringState === 'complete') resolve();
        else {
            const checkIce = () => {
                if (pc.iceGatheringState === 'complete') {
                    pc.removeEventListener('icegatheringstatechange', checkIce);
                    resolve();
                }
            };
            pc.addEventListener('icegatheringstatechange', checkIce);
            setTimeout(resolve, 1500);
        }
    });

    try {
        await fetch('/api/chat?action=send_call_signal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                caller_phone: myPhone,
                receiver_phone: peerPhone,
                call_type: mode,
                status: 'ringing',
                rtc_data: pc.localDescription
            })
        });
    } catch (e) {}
}

// কল রিসিভ করা (Receiver)
async function acceptWhatsAppCall() {
    if (!activeCallPeer) return;
    stopContinuousRinging();
    isCallActive = true;
    startCallDurationTimer();
    showToast("Call Connected!");

    const myPhone = normPhone(getActiveProfile().phone);
    const peerPhone = normPhone(activeCallPeer.phone);

    updateInCallButtons();

    await setupLocalMedia(currentCallType);
    const pc = createPeerConnection(peerPhone);

    if (window.pendingIncomingOffer) {
        await pc.setRemoteDescription(new RTCSessionDescription(window.pendingIncomingOffer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        await new Promise(resolve => {
            if (pc.iceGatheringState === 'complete') resolve();
            else {
                const checkIce = () => {
                    if (pc.iceGatheringState === 'complete') {
                        pc.removeEventListener('icegatheringstatechange', checkIce);
                        resolve();
                    }
                };
                pc.addEventListener('icegatheringstatechange', checkIce);
                setTimeout(resolve, 1500);
            }
        });

        try {
            await fetch('/api/chat?action=send_call_signal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    caller_phone: myPhone,
                    receiver_phone: peerPhone,
                    call_type: currentCallType,
                    status: 'answered',
                    rtc_data: pc.localDescription
                })
            });
        } catch (e) {}
    }
}

// কল কেটে দেওয়া বা ক্যানসেল করা
async function endWhatsAppCall() {
    stopContinuousRinging();
    stopCallDurationTimer();
    isCallActive = false;
    window.pendingIncomingOffer = null;

    if (localStream) {
        localStream.getTracks().forEach(t => t.stop());
        localStream = null;
    }
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }

    const modal = document.getElementById('whatsAppCallModal');
    if (modal) modal.remove();

    const myPhone = normPhone(getActiveProfile().phone);
    const peerPhone = activeCallPeer ? normPhone(activeCallPeer.phone) : '';
    activeCallPeer = null;

    if (peerPhone) {
        try {
            await fetch('/api/chat?action=send_call_signal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    caller_phone: myPhone,
                    receiver_phone: peerPhone,
                    call_type: currentCallType,
                    status: 'ended'
                })
            });
        } catch (e) {}
    }
    showToast("Call Ended");
}

// অডিও থেকে ভিডিও কলে সুইচ করা (বা ফুল-স্ক্রিন মোড)
async function toggleVideoSwitch() {
    const newMode = currentCallType === 'audio' ? 'video' : 'audio';
    currentCallType = newMode;
    
    const badge = document.getElementById('callTypeBadge');
    if (badge) badge.innerText = `${newMode} call`;

    const videoBox = document.getElementById('videoStreamsBox');
    if (newMode === 'video') {
        if (videoBox) videoBox.classList.remove('hidden');
        await setupLocalMedia('video');
        if (peerConnection && localStream) {
            const videoTrack = localStream.getVideoTracks()[0];
            const sender = peerConnection.getSenders().find(s => s.track && s.track.kind === 'video');
            if (sender && videoTrack) sender.replaceTrack(videoTrack);
            else if (videoTrack) peerConnection.addTrack(videoTrack, localStream);
        }
        showToast("Switched to Video Fullscreen");
    } else {
        if (videoBox) videoBox.classList.add('hidden');
        if (localStream) localStream.getVideoTracks().forEach(t => t.stop());
        showToast("Switched to Audio Call");
    }
}

// মাইক্রোফোন মিউট টগল
function toggleMicMute() {
    if (!localStream) return;
    isMicMuted = !isMicMuted;
    localStream.getAudioTracks().forEach(t => t.enabled = !isMicMuted);
    const btn = document.getElementById('muteMicBtn');
    if (btn) {
        btn.innerHTML = isMicMuted ? `<i class="fa-solid fa-microphone-slash text-red-400"></i>` : `<i class="fa-solid fa-microphone"></i>`;
    }
    showToast(isMicMuted ? "Microphone Muted" : "Microphone Unmuted");
}

// ফুল-স্ক্রিন হোয়াটসঅ্যাপ স্টাইল কল মডাল
function renderCallModal(peerName, avatarUrl, statusText, mode, isIncoming) {
    let existing = document.getElementById('whatsAppCallModal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'whatsAppCallModal';
    // সম্পূর্ণ স্ক্রিন জুড়ে ফিক্সড লেআউট
    modal.className = 'fixed inset-0 z-50 bg-black/95 backdrop-blur-lg flex flex-col items-center justify-between p-6';
    
    modal.innerHTML = `
        <!-- ওপরের হেডার তথ্য -->
        <div class="w-full max-w-md flex justify-between items-center text-center pt-4">
            <span id="callTypeBadge" class="px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-[11px] font-bold uppercase tracking-wider">${mode} call</span>
            <p id="callStatusLabel" class="text-xs text-gray-300 font-medium">${statusText}</p>
            <div class="w-16"></div>
        </div>

        <!-- মূল প্রোফাইল অথবা ফুল-স্ক্রিন ভিডিও ডিসপ্লে -->
        <div class="flex-1 flex flex-col items-center justify-center w-full max-w-2xl relative my-auto">
            <div id="callerInfoBox" class="${mode === 'video' ? 'hidden' : 'flex'} flex-col items-center space-y-4">
                <img src="${avatarUrl || 'https://pub-508ef1e45bab487aadde85a1dba202c4.r2.dev/rorraxyfree/mr%20masudar%20logo%20(3).png'}" class="w-28 h-28 rounded-full object-cover border-4 border-amber-400/60 shadow-2xl animate-pulse bg-black">
                <h2 class="text-2xl font-extrabold gold-gradient-text tracking-wide">${peerName}</h2>
            </div>

            <!-- ফুল-স্ক্রিন ভিডিও বক্স -->
            <div id="videoStreamsBox" class="${mode === 'video' ? 'flex' : 'hidden'} w-full h-[65dvh] bg-black rounded-3xl overflow-hidden border border-white/10 relative shadow-2xl">
                <video id="callRemoteVideo" autoplay playsinline class="w-full h-full object-cover"></video>
                <video id="callLocalVideo" autoplay muted playsinline class="w-28 h-36 object-cover rounded-2xl border-2 border-amber-400/60 absolute bottom-4 right-4 bg-gray-900 shadow-xl"></video>
            </div>
            <audio id="callRemoteAudio" autoplay></audio>
        </div>

        <!-- নিচের কন্ট্রোল বাটনসমূহ -->
        <div id="callControlButtons" class="w-full max-w-md flex justify-center items-center space-x-6 pb-6">
            ${isIncoming ? `
                <button type="button" onclick="acceptWhatsAppCall()" class="px-8 py-4 rounded-full bg-green-600 hover:bg-green-700 text-white font-bold text-sm cursor-pointer shadow-xl transition flex items-center space-x-2">
                    <i class="fa-solid fa-phone text-lg"></i><span>Receive</span>
                </button>
                <button type="button" onclick="endWhatsAppCall()" class="px-8 py-4 rounded-full bg-red-600 hover:bg-red-700 text-white font-bold text-sm cursor-pointer shadow-xl transition flex items-center space-x-2">
                    <i class="fa-solid fa-phone-slash text-lg"></i><span>Decline</span>
                </button>
            ` : `
                <button type="button" id="muteMicBtn" onclick="toggleMicMute()" class="w-12 h-12 rounded-full theme-input hover:brightness-125 text-white flex items-center justify-center shadow-lg cursor-pointer" title="Mute">
                    <i class="fa-solid fa-microphone"></i>
                </button>
                <button type="button" onclick="toggleVideoSwitch()" class="w-12 h-12 rounded-full theme-input hover:brightness-125 text-amber-300 flex items-center justify-center shadow-lg cursor-pointer" title="Video Switch">
                    <i class="fa-solid fa-video"></i>
                </button>
                <button type="button" onclick="endWhatsAppCall()" class="px-8 py-4 rounded-full bg-red-600 hover:bg-red-700 text-white font-bold text-sm cursor-pointer shadow-xl transition flex items-center space-x-2">
                    <i class="fa-solid fa-phone-slash text-lg"></i><span>End Call</span>
                </button>
            `}
        </div>
    `;
    document.body.appendChild(modal);
}

function updateInCallButtons() {
    const box = document.getElementById('callControlButtons');
    const infoBox = document.getElementById('callerInfoBox');
    if (infoBox && currentCallType === 'video') infoBox.classList.add('hidden');
    
    if (!box) return;
    box.innerHTML = `
        <button type="button" id="muteMicBtn" onclick="toggleMicMute()" class="w-12 h-12 rounded-full theme-input hover:brightness-125 text-white flex items-center justify-center shadow-lg cursor-pointer" title="Mute">
            <i class="fa-solid fa-microphone"></i>
        </button>
        <button type="button" onclick="toggleVideoSwitch()" class="w-12 h-12 rounded-full theme-input hover:brightness-125 text-amber-300 flex items-center justify-center shadow-lg cursor-pointer" title="Video Switch">
            <i class="fa-solid fa-video"></i>
        </button>
        <button type="button" onclick="endWhatsAppCall()" class="px-8 py-4 rounded-full bg-red-600 hover:bg-red-700 text-white font-bold text-sm cursor-pointer shadow-xl transition flex items-center space-x-2">
            <i class="fa-solid fa-phone-slash text-lg"></i><span>End Call</span>
        </button>
    `;
}

// ইনকামিং কল পোলিং (মডাল বারবার রেন্ডার হওয়া রোধ করা হয়েছে)
function startIncomingCallPolling() {
    if (callPollInterval) clearInterval(callPollInterval);
    callPollInterval = setInterval(async () => {
        const myPhone = normPhone(getActiveProfile().phone);
        if (!myPhone) return;

        try {
            const res = await fetch(`/api/chat?action=check_call_signal&phone=${encodeURIComponent(myPhone)}`);
            if (res.ok) {
                const data = await res.json();
                
                if (!data.signal || !data.signal.magic_code) {
                    if (isCallActive && callSeconds > 0) {
                        endWhatsAppCall();
                    }
                    return;
                }

                let sig = null;
                try { sig = JSON.parse(data.signal.magic_code); } catch (e) { return; }
                if (!sig || !sig.ts) return;

                // নতুন রিং হলে তবেই মডাল ওপেন হবে (বারবার রিফ্রেশ হবে না)
                const modal = document.getElementById('whatsAppCallModal');
                if (sig.status === 'ringing' && !isCallActive && !modal && sig.ts > lastHandledSignalTs) {
                    lastHandledSignalTs = sig.ts;
                    const callerPhone = normPhone(sig.caller);
                    if (callerPhone === myPhone) return;

                    const callerContact = deviceContacts.find(c => normPhone(c.phone) === callerPhone) || { name: callerPhone, phone: callerPhone };
                    activeCallPeer = callerContact;
                    currentCallType = sig.type || 'audio';
                    window.pendingIncomingOffer = sig.rtc;

                    startContinuousRinging();
                    renderCallModal(callerContact.name, callerContact.avatar, `Incoming ${currentCallType} call...`, currentCallType, true);
                } 
                else if (sig.status === 'answered' && isCallActive && sig.ts > lastHandledSignalTs) {
                    lastHandledSignalTs = sig.ts;
                    stopContinuousRinging();
                    if (!callTimerInterval) {
                        startCallDurationTimer();
                        showToast("Call Connected!");
                    }
                    if (peerConnection && sig.rtc && peerConnection.signalingState !== 'stable') {
                        await peerConnection.setRemoteDescription(new RTCSessionDescription(sig.rtc));
                    }
                }
            }
        } catch (e) {}
    }, 2000);
}

// ==========================================
// চ্যাট ও ইউজার ইন্টারফেস হেল্পারসমূহ
// ==========================================

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
        const isMe = normPhone(m.phone_number) === normPhone(getActiveProfile().phone);
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
    if (container.querySelector('.m-auto')) container.innerHTML = '';
    const isMe = normPhone(m.phone_number) === normPhone(getActiveProfile().phone);
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
        .replace(/"/g, '&quot;')
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
    showToast("Notifications: " + callHistoryNotifications.length + " calls recorded");
}

function openLiveBroadcastModal() {
    showToast("Live broadcast starting...");
}

function renderChatStories() {
    const sidebarList = document.getElementById('sidebarContentList');
    if (!sidebarList) return;
    const keys = Object.keys(localMessageStore);
    if (keys.length === 0) {
        sidebarList.innerHTML = `<div class="p-6 text-center text-xs text-gray-400">No active chats yet.</div>`;
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
