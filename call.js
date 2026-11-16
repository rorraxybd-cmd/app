// call.js - Professional Audio & Video Calling Module with Real-Time WebRTC (Final)
let currentCallType = 'audio', activeCallPeer = null, isCallActive = false;
let callRingInterval = null, activeAudioCtx = null, callPollInterval = null;
let callTimerInterval = null, callSeconds = 0;
let peerConnection = null, localStream = null, remoteStream = null;
let isMicMuted = false, lastHandledSignalTs = 0, isLocalMain = false;

const DEFAULT_RTC_CONFIG = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

async function getDynamicRTCConfig() {
    try {
        const res = await fetch('/api/call-credentials');
        const data = await res.json();
        if (data.success && data.iceServers) {
            return Array.isArray(data.iceServers) ? { iceServers: data.iceServers } : { iceServers: data.iceServers.iceServers || DEFAULT_RTC_CONFIG.iceServers };
        }
    } catch (e) {}
    return DEFAULT_RTC_CONFIG;
}

function startContinuousRinging() {
    stopContinuousRinging();
    const playTone = () => {
        try {
            if (!activeAudioCtx) activeAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
            if (activeAudioCtx.state === 'suspended') activeAudioCtx.resume();
            const osc = activeAudioCtx.createOscillator();
            const gain = activeAudioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(440, activeAudioCtx.currentTime);
            gain.gain.setValueAtTime(0.1, activeAudioCtx.currentTime);
            osc.connect(gain);
            gain.connect(activeAudioCtx.destination);
            osc.start();
            osc.stop(activeAudioCtx.currentTime + 0.5);
        } catch (e) {}
    };
    playTone();
    callRingInterval = setInterval(playTone, 2000);
}

function stopContinuousRinging() {
    if (callRingInterval) { clearInterval(callRingInterval); callRingInterval = null; }
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
    if (callTimerInterval) { clearInterval(callTimerInterval); callTimerInterval = null; }
}

async function setupLocalMedia(mode) {
    try {
        if (localStream) localStream.getTracks().forEach(t => t.stop());
        localStream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
            video: mode === 'video' ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } : false
        });
        applyVideoStreamsToDom();
        return localStream;
    } catch (err) {
        if (typeof showToast === 'function') showToast("Microphone or Camera permission required", true);
        return null;
    }
}

function applyVideoStreamsToDom() {
    const remoteVid = document.getElementById('callRemoteVideo');
    const localVid = document.getElementById('callLocalVideo');
    if (remoteVid && remoteStream) { remoteVid.srcObject = remoteStream; remoteVid.play().catch(e => {}); }
    if (localVid && localStream) { localVid.srcObject = localStream; localVid.muted = true; localVid.play().catch(e => {}); }
}

async function createPeerConnection(peerPhone) {
    if (peerConnection) peerConnection.close();
    const rtcConfig = await getDynamicRTCConfig();
    peerConnection = new RTCPeerConnection(rtcConfig);

    if (localStream) {
        localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
    }

    peerConnection.onicecandidate = async (event) => {
        if (event.candidate) {
            const myPhone = normPhone(getActiveProfile().phone);
            try {
                await fetch('/api/chat?action=send_call_signal', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ caller_phone: myPhone, receiver_phone: peerPhone, call_type: currentCallType, status: 'ice', rtc_data: event.candidate })
                });
            } catch (e) {}
        }
    };

    peerConnection.ontrack = (event) => {
        const remoteAud = document.getElementById('callRemoteAudio');
        if (event.streams && event.streams[0]) {
            remoteStream = event.streams[0];
            applyVideoStreamsToDom();
            if (remoteAud) { remoteAud.srcObject = remoteStream; remoteAud.play().catch(e => {}); }
        }
    };
    return peerConnection;
}

async function startWhatsAppCall(mode) {
    if (!currentActiveRecipient) {
        if (typeof showToast === 'function') showToast("Select a contact first", true);
        return;
    }
    const myPhone = normPhone(getActiveProfile().phone);
    const peerPhone = normPhone(currentActiveRecipient.phone);
    if (myPhone === peerPhone) {
        if (typeof showToast === 'function') showToast("You cannot call your own number", true);
        return;
    }

    currentCallType = mode;
    activeCallPeer = currentActiveRecipient;
    isCallActive = true;

    renderCallModal(activeCallPeer.name, activeCallPeer.avatar, `Calling ${activeCallPeer.name}...`, mode, false);
    startContinuousRinging();

    await setupLocalMedia(mode);
    const pc = await createPeerConnection(peerPhone);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    try {
        await fetch('/api/chat?action=send_call_signal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ caller_phone: myPhone, receiver_phone: peerPhone, call_type: mode, status: 'ringing', rtc_data: pc.localDescription })
        });
    } catch (e) {}
}

async function acceptWhatsAppCall() {
    if (!activeCallPeer) return;
    stopContinuousRinging();
    isCallActive = true;
    startCallDurationTimer();
    if (typeof showToast === 'function') showToast("Call Connected!");

    const myPhone = normPhone(getActiveProfile().phone);
    const peerPhone = normPhone(activeCallPeer.phone);
    updateInCallButtons();

    await setupLocalMedia(currentCallType);
    const pc = await createPeerConnection(peerPhone);

    if (window.pendingIncomingOffer) {
        await pc.setRemoteDescription(new RTCSessionDescription(window.pendingIncomingOffer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        try {
            await fetch('/api/chat?action=send_call_signal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ caller_phone: myPhone, receiver_phone: peerPhone, call_type: currentCallType, status: 'answered', rtc_data: pc.localDescription })
            });
        } catch (e) {}
    }
}

async function endWhatsAppCall() {
    stopContinuousRinging();
    stopCallDurationTimer();
    isCallActive = false;
    window.pendingIncomingOffer = null;

    if (localStream) { localStream.getTracks().forEach(t => t.stop()); localStream = null; }
    if (peerConnection) { peerConnection.close(); peerConnection = null; }

    document.getElementById('whatsAppCallModal')?.remove();
    const myPhone = normPhone(getActiveProfile().phone);
    const peerPhone = activeCallPeer ? normPhone(activeCallPeer.phone) : '';
    activeCallPeer = null;

    if (peerPhone) {
        try {
            await fetch('/api/chat?action=send_call_signal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ caller_phone: myPhone, receiver_phone: peerPhone, call_type: currentCallType, status: 'ended' })
            });
        } catch (e) {}
    }
    if (typeof showToast === 'function') showToast("Call Ended");
}

function toggleMicMute() {
    if (!localStream) return;
    isMicMuted = !isMicMuted;
    localStream.getAudioTracks().forEach(t => t.enabled = !isMicMuted);
    const btn = document.getElementById('muteMicBtn');
    if (btn) btn.innerHTML = isMicMuted ? `<i class="fa-solid fa-microphone-slash text-red-400 text-xl"></i>` : `<i class="fa-solid fa-microphone text-xl"></i>`;
}

function renderCallModal(peerName, avatarUrl, statusText, mode, isIncoming) {
    document.getElementById('whatsAppCallModal')?.remove();
    const modal = document.createElement('div');
    modal.id = 'whatsAppCallModal';
    modal.className = 'fixed inset-0 z-50 bg-[#030305] flex flex-col justify-between p-6 overflow-hidden';
    
    modal.innerHTML = `
        <div class="w-full flex justify-between items-center z-30 pt-2">
            <span id="callTypeBadge" class="text-amber-300 text-xs font-semibold uppercase tracking-wider">${mode} call</span>
            <p id="callStatusLabel" class="text-xs text-gray-400 font-medium">${statusText}</p>
            <div class="w-16"></div>
        </div>
        <div class="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
            <div id="callerInfoBox" class="${mode === 'video' ? 'hidden' : 'flex'} flex-col items-center space-y-4 pointer-events-auto">
                <img src="${avatarUrl || 'https://pub-508ef1e45bab487aadde85a1dba202c4.r2.dev/rorraxyfree/mr%20masudar%20logo%20(3).png'}" class="w-32 h-32 rounded-full object-cover bg-black">
                <h2 class="text-2xl font-extrabold text-white tracking-wide">${peerName}</h2>
            </div>
        </div>
        <div id="videoStreamsBox" class="${mode === 'video' ? 'flex' : 'hidden'} absolute inset-0 w-full h-full bg-black z-0 overflow-hidden">
            <video id="callRemoteVideo" autoplay playsinline class="w-full h-full object-cover"></video>
            <video id="callLocalVideo" autoplay muted playsinline class="w-28 h-36 object-cover rounded-2xl absolute bottom-24 right-4 bg-gray-900 cursor-pointer transition-all z-20"></video>
        </div>
        <audio id="callRemoteAudio" autoplay></audio>
        <div class="w-full flex justify-center items-center z-30 pb-8 pointer-events-auto">
            <div id="callControlButtons" class="flex items-center space-x-8">
                ${isIncoming ? `
                    <button type="button" onclick="endWhatsAppCall()" class="w-16 h-16 rounded-full bg-red-600 text-white flex items-center justify-center cursor-pointer"><i class="fa-solid fa-phone-slash text-xl"></i></button>
                    <button type="button" onclick="acceptWhatsAppCall()" class="w-16 h-16 rounded-full bg-green-600 text-white flex items-center justify-center cursor-pointer animate-bounce"><i class="fa-solid fa-phone text-xl"></i></button>
                ` : `
                    <button type="button" id="muteMicBtn" onclick="toggleMicMute()" class="w-12 h-12 rounded-full text-white flex items-center justify-center cursor-pointer"><i class="fa-solid fa-microphone text-xl"></i></button>
                    <button type="button" onclick="endWhatsAppCall()" class="w-16 h-16 rounded-full bg-red-600 text-white flex items-center justify-center cursor-pointer"><i class="fa-solid fa-phone-slash text-xl"></i></button>
                `}
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    applyVideoStreamsToDom();
}

function updateInCallButtons() {
    const box = document.getElementById('callControlButtons');
    const infoBox = document.getElementById('callerInfoBox');
    if (infoBox && currentCallType === 'video') infoBox.classList.add('hidden');
    if (!box) return;
    box.innerHTML = `
        <button type="button" id="muteMicBtn" onclick="toggleMicMute()" class="w-12 h-12 rounded-full text-white flex items-center justify-center cursor-pointer"><i class="fa-solid fa-microphone text-xl"></i></button>
        <button type="button" onclick="endWhatsAppCall()" class="w-16 h-16 rounded-full bg-red-600 text-white flex items-center justify-center cursor-pointer"><i class="fa-solid fa-phone-slash text-xl"></i></button>
    `;
}
```[cite: 2]

---

### ৪. `message.js` (চ্যাট, মিডিয়া আপলোড ও অটো-ডিলিশন মডিউল)
এই মডিউলটিতে রিয়েল-টাইম চ্যাট পোলিং, ২৫ মেগাবাইট পর্যন্ত ফাইল/মিডিয়া আপলোড, এবং ডাউনলোড হওয়ার পর সার্ভার স্টোরেজ খালি করার ফিচার রয়েছে।

```javascript
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
