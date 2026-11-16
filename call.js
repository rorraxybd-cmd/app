// call.js - Professional Audio & Video Calling Module with WhatsApp Style (100% English & Fully Fixed)
let currentCallType = 'audio', activeCallPeer = null, isCallActive = false;
let callRingInterval = null, activeAudioCtx = null, callPollInterval = null;
let callTimerInterval = null, callSeconds = 0;
let peerConnection = null, localStream = null, remoteStream = null;
let isMicMuted = false, isSpeakerOn = true, lastHandledSignalTs = 0;

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
            if (remoteAud) { 
                remoteAud.srcObject = remoteStream; 
                remoteAud.muted = !isSpeakerOn;
                remoteAud.play().catch(e => {}); 
            }
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
    if (btn) btn.className = `w-12 h-12 rounded-full flex items-center justify-center cursor-pointer transition ${isMicMuted ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-white hover:bg-white/20'}`;
}

function toggleSpeaker() {
    isSpeakerOn = !isSpeakerOn;
    const remoteAud = document.getElementById('callRemoteAudio');
    if (remoteAud) remoteAud.muted = !isSpeakerOn;
    const btn = document.getElementById('speakerBtn');
    if (btn) btn.className = `w-12 h-12 rounded-full flex items-center justify-center cursor-pointer transition ${!isSpeakerOn ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-white hover:bg-white/20'}`;
    if (typeof showToast === 'function') showToast(isSpeakerOn ? "Speaker ON" : "Speaker OFF");
}

async function switchCallMode() {
    currentCallType = currentCallType === 'audio' ? 'video' : 'audio';
    const badge = document.getElementById('callTypeBadge');
    if (badge) badge.innerText = `${currentCallType} call`;
    
    await setupLocalMedia(currentCallType);
    const videoStreamsBox = document.getElementById('videoStreamsBox');
    const callerInfoBox = document.getElementById('callerInfoBox');
    
    if (currentCallType === 'video') {
        if (videoStreamsBox) videoStreamsBox.classList.remove('hidden');
        if (callerInfoBox) callerInfoBox.classList.add('hidden');
    } else {
        if (videoStreamsBox) videoStreamsBox.classList.add('hidden');
        if (callerInfoBox) callerInfoBox.classList.remove('hidden');
    }
    
    if (typeof showToast === 'function') showToast(`Switched to ${currentCallType} call`);
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
                <img src="${avatarUrl || 'https://pub-508ef1e45bab487aadde85a1dba202c4.r2.dev/rorraxyfree/mr%20masudar%20logo%20(3).png'}" class="w-32 h-32 rounded-full object-cover bg-black shadow-2xl border-2 border-amber-400/20">
                <h2 class="text-2xl font-extrabold text-white tracking-wide">${peerName}</h2>
            </div>
        </div>
        <div id="videoStreamsBox" class="${mode === 'video' ? 'flex' : 'hidden'} absolute inset-0 w-full h-full bg-black z-0 overflow-hidden">
            <video id="callRemoteVideo" autoplay playsinline class="w-full h-full object-cover"></video>
            <video id="callLocalVideo" autoplay muted playsinline class="w-28 h-36 object-cover rounded-2xl absolute bottom-24 right-4 bg-gray-900 cursor-pointer transition-all z-20 shadow-2xl border border-white/10"></video>
        </div>
        <audio id="callRemoteAudio" autoplay></audio>
        <div class="w-full flex justify-center items-center z-30 pb-8 pointer-events-auto">
            <div id="callControlButtons" class="flex items-center space-x-6">
                ${isIncoming ? `
                    <button type="button" onclick="endWhatsAppCall()" class="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center cursor-pointer shadow-lg transition"><i class="fa-solid fa-phone-slash text-xl"></i></button>
                    <button type="button" onclick="acceptWhatsAppCall()" class="w-16 h-16 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center cursor-pointer shadow-lg animate-bounce transition"><i class="fa-solid fa-phone text-xl"></i></button>
                ` : `
                    <button type="button" id="muteMicBtn" onclick="toggleMicMute()" class="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition"><i class="fa-solid fa-microphone text-lg"></i></button>
                    <button type="button" id="speakerBtn" onclick="toggleSpeaker()" class="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition"><i class="fa-solid fa-volume-high text-lg"></i></button>
                    <button type="button" onclick="switchCallMode()" class="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition" title="Switch Audio/Video"><i class="fa-solid fa-video text-lg"></i></button>
                    <button type="button" onclick="endWhatsAppCall()" class="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center cursor-pointer shadow-lg transition"><i class="fa-solid fa-phone-slash text-xl"></i></button>
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
        <button type="button" id="muteMicBtn" onclick="toggleMicMute()" class="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition"><i class="fa-solid fa-microphone text-lg"></i></button>
        <button type="button" id="speakerBtn" onclick="toggleSpeaker()" class="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition"><i class="fa-solid fa-volume-high text-lg"></i></button>
        <button type="button" onclick="switchCallMode()" class="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition" title="Switch Audio/Video"><i class="fa-solid fa-video text-lg"></i></button>
        <button type="button" onclick="endWhatsAppCall()" class="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center cursor-pointer shadow-lg transition"><i class="fa-solid fa-phone-slash text-xl"></i></button>
    `;
}
