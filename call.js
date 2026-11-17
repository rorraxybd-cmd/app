// call.js - Fixed Full-Duplex WebRTC Audio/Video Streaming & Sound Delivery (Optimized)
let currentCallType = 'audio', activeCallPeer = null, isCallActive = false;
let callRingInterval = null, activeAudioCtx = null, callPollInterval = null;
let callTimerInterval = null, callSeconds = 0;
let peerConnection = null, localStream = null, remoteStream = null;
let isMicMuted = false, isSpeakerOn = true;
let handledSignalIds = new Set();
let isVideoSwapped = false;
let currentFacingMode = 'user';
let pendingIceCandidates = [];

const DEFAULT_RTC_CONFIG = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
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
            osc.frequency.setValueAtTime(520, activeAudioCtx.currentTime);
            osc.frequency.setValueAtTime(660, activeAudioCtx.currentTime + 0.25);
            gain.gain.setValueAtTime(0.25, activeAudioCtx.currentTime);
            osc.connect(gain);
            gain.connect(activeAudioCtx.destination);
            osc.start();
            osc.stop(activeAudioCtx.currentTime + 0.55);
            if (navigator.vibrate) navigator.vibrate([400, 200, 400]);
        } catch (e) {}
    };
    playTone();
    callRingInterval = setInterval(playTone, 1800);
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
        if (lbl) lbl.innerText = `${mins}:${secs}`;
    }, 1000);
}

function stopCallDurationTimer() {
    if (callTimerInterval) { clearInterval(callTimerInterval); callTimerInterval = null; }
}

function startIncomingCallPolling() {
    if (callPollInterval) clearInterval(callPollInterval);
    callPollInterval = setInterval(checkIncomingCallSignals, 1500); // পোলিং ইন্টারভাল অপ্টিমাইজড
}

async function checkIncomingCallSignals() {
    const myPhone = normPhone(getActiveProfile().phone);
    if (!myPhone) return;

    try {
        const res = await fetch(`/api/chat?action=get_call_signals&receiver_phone=${myPhone}`);
        if (!res.ok) return;
        const data = await res.json();
        const signals = data.signals || (data.signal ? [data.signal] : []);
        if (!Array.isArray(signals) || signals.length === 0) return;

        for (const sig of signals) {
            const sigId = String(sig.id || `${sig.caller_phone}_${sig.status}_${sig.timestamp}`);
            if (handledSignalIds.has(sigId)) continue;

            const callerPhone = normPhone(sig.caller_phone);
            if (!callerPhone || callerPhone === myPhone) continue;

            const sigTime = sig.timestamp ? Number(sig.timestamp) : (sig.created_at ? new Date(sig.created_at).getTime() : Date.now());
            if (Date.now() - sigTime > 25000) {
                handledSignalIds.add(sigId);
                continue;
            }

            if (sig.status === 'ringing' && !isCallActive) {
                handledSignalIds.add(sigId);
                let localContacts = Array.isArray(window.GLOBAL_CLOUD_USERS) ? window.GLOBAL_CLOUD_USERS : JSON.parse(localStorage.getItem('message_contacts_v18') || '[]');
                const found = localContacts.find(c => normPhone(c.phone) === callerPhone);
                activeCallPeer = {
                    phone: callerPhone,
                    name: found?.name || callerPhone,
                    avatar: found?.avatar || ''
                };
                currentCallType = sig.call_type || 'audio';
                window.pendingIncomingOffer = typeof sig.rtc_data === 'string' ? JSON.parse(sig.rtc_data) : sig.rtc_data;
                pendingIceCandidates = [];
                isCallActive = true;

                renderCallModal(activeCallPeer.name, activeCallPeer.avatar, 'Incoming Call...', currentCallType, true);
                startContinuousRinging();
                saveCallHistoryLog(activeCallPeer.name, activeCallPeer.phone, currentCallType, 'Incoming');

                if ('Notification' in window && Notification.permission === 'granted') {
                    new Notification(`Incoming ${currentCallType} call`, {
                        body: `${activeCallPeer.name} is calling you...`,
                        icon: 'https://pub-508ef1e45bab487aadde85a1dba202c4.r2.dev/im1024.jpg'
                    });
                }
            } else if (sig.status === 'answered' && isCallActive && peerConnection) {
                handledSignalIds.add(sigId);
                stopContinuousRinging();
                startCallDurationTimer();
                const ans = typeof sig.rtc_data === 'string' ? JSON.parse(sig.rtc_data) : sig.rtc_data;
                if (ans && !peerConnection.currentRemoteDescription) {
                    await peerConnection.setRemoteDescription(new RTCSessionDescription(ans));
                    for (const cand of pendingIceCandidates) {
                        await peerConnection.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
                    }
                    pendingIceCandidates = [];
                }
            } else if (sig.status === 'ice') {
                handledSignalIds.add(sigId);
                const cand = typeof sig.rtc_data === 'string' ? JSON.parse(sig.rtc_data) : sig.rtc_data;
                if (cand) {
                    if (peerConnection && peerConnection.remoteDescription) {
                        await peerConnection.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
                    } else {
                        pendingIceCandidates.push(cand);
                    }
                }
            } else if (sig.status === 'ended' && isCallActive) {
                handledSignalIds.add(sigId);
                cleanupCallLocalState("Call Ended");
            }
        }
    } catch (e) {}
}

async function setupLocalMedia(mode) {
    try {
        if (localStream) localStream.getTracks().forEach(t => t.stop());
        localStream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
            video: mode === 'video' ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: currentFacingMode } : false
        });
        applyVideoStreamsToDom();
        return localStream;
    } catch (err) {
        if (typeof showToast === 'function') showToast("Camera/Microphone permission required", true);
        return null;
    }
}

function applyVideoStreamsToDom() {
    const mainVid = document.getElementById('callMainVideo');
    const pipVid = document.getElementById('callPipVideo');
    if (!mainVid || !pipVid) return;

    if (!isVideoSwapped) {
        mainVid.srcObject = remoteStream || localStream;
        mainVid.muted = !remoteStream;
        pipVid.srcObject = localStream;
        pipVid.muted = true;
    } else {
        mainVid.srcObject = localStream;
        mainVid.muted = true;
        pipVid.srcObject = remoteStream || localStream;
        pipVid.muted = !remoteStream;
    }

    mainVid.play().catch(() => {});
    pipVid.play().catch(() => {});
}

function toggleSwapVideoScreens() {
    isVideoSwapped = !isVideoSwapped;
    applyVideoStreamsToDom();
}

async function flipVideoCamera() {
    if (currentCallType !== 'video') {
        await switchCallMode();
        return;
    }
    currentFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
    const newStream = await setupLocalMedia('video');
    if (newStream && peerConnection) {
        const videoTrack = newStream.getVideoTracks()[0];
        const sender = peerConnection.getSenders().find(s => s.track && s.track.kind === 'video');
        if (sender && videoTrack) sender.replaceTrack(videoTrack);
    }
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
                    body: JSON.stringify({
                        caller_phone: myPhone,
                        receiver_phone: peerPhone,
                        call_type: currentCallType,
                        status: 'ice',
                        rtc_data: event.candidate,
                        timestamp: Date.now()
                    })
                });
            } catch (e) {}
        }
    };

    peerConnection.ontrack = (event) => {
        let remoteAud = document.getElementById('callRemoteAudio');
        if (!remoteAud) {
            remoteAud = document.createElement('audio');
            remoteAud.id = 'callRemoteAudio';
            remoteAud.autoplay = true;
            document.body.appendChild(remoteAud);
        }
        if (event.streams && event.streams[0]) {
            remoteStream = event.streams[0];
            remoteAud.srcObject = remoteStream;
            remoteAud.muted = false;
            remoteAud.play().catch(err => console.log("Audio play allowed:", err));
            applyVideoStreamsToDom();
        }
    };

    return peerConnection;
}

async function startWhatsAppCall(mode) {
    if (!window.currentActiveRecipient) {
        if (typeof showToast === 'function') showToast("Select a contact first", true);
        return;
    }
    const myPhone = normPhone(getActiveProfile().phone);
    const peerPhone = normPhone(window.currentActiveRecipient.phone);
    if (myPhone === peerPhone) {
        if (typeof showToast === 'function') showToast("Cannot call your own number", true);
        return;
    }

    currentCallType = mode;
    activeCallPeer = window.currentActiveRecipient;
    isCallActive = true;
    isVideoSwapped = false;
    pendingIceCandidates = [];

    renderCallModal(activeCallPeer.name, activeCallPeer.avatar, 'Calling...', mode, false);
    startContinuousRinging();
    saveCallHistoryLog(activeCallPeer.name, peerPhone, mode, 'Outgoing');

    await setupLocalMedia(mode);
    const pc = await createPeerConnection(peerPhone);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    try {
        await fetch('/api/chat?action=send_call_signal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                caller_phone: myPhone,
                receiver_phone: peerPhone,
                call_type: mode,
                status: 'ringing',
                rtc_data: pc.localDescription,
                timestamp: Date.now()
            })
        });
    } catch (e) {}
}

async function acceptWhatsAppCall() {
    if (!activeCallPeer) return;
    stopContinuousRinging();
    isCallActive = true;
    startCallDurationTimer();

    const myPhone = normPhone(getActiveProfile().phone);
    const peerPhone = normPhone(activeCallPeer.phone);
    updateInCallButtons();

    await setupLocalMedia(currentCallType);
    const pc = await createPeerConnection(peerPhone);

    if (window.pendingIncomingOffer) {
        await pc.setRemoteDescription(new RTCSessionDescription(window.pendingIncomingOffer));
        for (const cand of pendingIceCandidates) {
            await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
        }
        pendingIceCandidates = [];

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        try {
            await fetch('/api/chat?action=send_call_signal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    caller_phone: myPhone,
                    receiver_phone: peerPhone,
                    call_type: currentCallType,
                    status: 'answered',
                    rtc_data: pc.localDescription,
                    timestamp: Date.now()
                })
            });
        } catch (e) {}
    }
}

function cleanupCallLocalState(toastMsg) {
    stopContinuousRinging();
    stopCallDurationTimer();
    isCallActive = false;
    window.pendingIncomingOffer = null;
    remoteStream = null;
    pendingIceCandidates = [];
    if (localStream) { localStream.getTracks().forEach(t => t.stop()); localStream = null; }
    if (peerConnection) { peerConnection.close(); peerConnection = null; }
    document.getElementById('whatsAppCallModal')?.remove();
    document.getElementById('callRemoteAudio')?.remove();
    activeCallPeer = null;
    if (toastMsg && typeof showToast === 'function') showToast(toastMsg);
}

async function endWhatsAppCall() {
    const myPhone = normPhone(getActiveProfile().phone);
    const peerPhone = activeCallPeer ? normPhone(activeCallPeer.phone) : '';
    cleanupCallLocalState("Call Ended");

    if (peerPhone) {
        try {
            await fetch('/api/chat?action=send_call_signal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    caller_phone: myPhone,
                    receiver_phone: peerPhone,
                    call_type: currentCallType,
                    status: 'ended',
                    timestamp: Date.now()
                })
            });
        } catch (e) {}
    }
}

function toggleMicMute() {
    if (!localStream) return;
    isMicMuted = !isMicMuted;
    localStream.getAudioTracks().forEach(t => t.enabled = !isMicMuted);
    const btn = document.getElementById('muteMicBtn');
    if (btn) btn.className = `w-[52px] h-[52px] rounded-full flex items-center justify-center cursor-pointer transition ${isMicMuted ? 'bg-red-500/30 text-red-400' : 'bg-white/15 text-white'}`;
}

function toggleSpeaker() {
    isSpeakerOn = !isSpeakerOn;
    const remoteAud = document.getElementById('callRemoteAudio');
    if (remoteAud) remoteAud.muted = !isSpeakerOn;
    const btn = document.getElementById('speakerBtn');
    if (btn) btn.className = `w-[52px] h-[52px] rounded-full flex items-center justify-center cursor-pointer transition ${!isSpeakerOn ? 'bg-red-500/30 text-red-400' : 'bg-white/15 text-white'}`;
    if (typeof showToast === 'function') showToast(isSpeakerOn ? "Speaker ON" : "Speaker OFF");
}

async function switchCallMode() {
    currentCallType = currentCallType === 'audio' ? 'video' : 'audio';
    const newStream = await setupLocalMedia(currentCallType);
    if (newStream && peerConnection) {
        const videoTrack = newStream.getVideoTracks()[0];
        if (videoTrack) {
            const sender = peerConnection.getSenders().find(s => s.track && s.track.kind === 'video');
            if (sender) sender.replaceTrack(videoTrack);
            else peerConnection.addTrack(videoTrack, newStream);
        }
    }
    const videoStreamsBox = document.getElementById('videoStreamsBox');
    const callerInfoBox = document.getElementById('callerInfoBox');

    if (currentCallType === 'video') {
        if (videoStreamsBox) videoStreamsBox.classList.remove('hidden');
        if (callerInfoBox) callerInfoBox.classList.add('hidden');
    } else {
        if (videoStreamsBox) videoStreamsBox.classList.add('hidden');
        if (callerInfoBox) callerInfoBox.classList.remove('hidden');
    }
}

function renderCallModal(peerName, avatarUrl, statusText, mode, isIncoming) {
    document.getElementById('whatsAppCallModal')?.remove();
    document.getElementById('callRemoteAudio')?.remove();

    const initial = (peerName || 'U').trim().charAt(0).toUpperCase();
    const avatarHtml = avatarUrl && avatarUrl.trim() !== ''
        ? `<img src="${avatarUrl}" class="w-28 h-28 rounded-full object-cover bg-black shadow-2xl border-2 border-amber-400/30">`
        : `<div class="w-28 h-28 rounded-full gold-btn flex items-center justify-center text-4xl font-extrabold text-[#030305] shadow-2xl">${initial}</div>`;

    const modal = document.createElement('div');
    modal.id = 'whatsAppCallModal';
    modal.className = 'fixed inset-0 z-50 bg-[#030305] flex flex-col justify-between overflow-hidden select-none';

    modal.innerHTML = `
        <div class="w-full flex justify-center items-center z-30 pt-6 px-4 pointer-events-none">
            <span id="callStatusLabel" class="px-4 py-1.5 rounded-full bg-black/50 backdrop-blur-md text-xs font-semibold gold-gradient-text tracking-wider">${statusText}</span>
        </div>
        <div class="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none px-4">
            <div id="callerInfoBox" class="${mode === 'video' ? 'hidden' : 'flex'} flex-col items-center space-y-4 pointer-events-auto text-center">
                ${avatarHtml}
                <h2 class="text-xl font-bold text-white tracking-wide">${peerName}</h2>
            </div>
        </div>
        <div id="videoStreamsBox" class="${mode === 'video' ? 'block' : 'hidden'} fixed inset-0 w-full h-full bg-black z-0 overflow-hidden">
            <video id="callMainVideo" autoplay playsinline class="w-full h-full object-cover"></video>
            <div onclick="toggleSwapVideoScreens()" class="w-28 h-40 rounded-2xl absolute bottom-28 right-4 bg-gray-900 cursor-pointer overflow-hidden z-20 shadow-2xl" title="Tap to switch view">
                <video id="callPipVideo" autoplay muted playsinline class="w-full h-full object-cover"></video>
            </div>
        </div>
        <audio id="callRemoteAudio" autoplay></audio>
        <div class="w-full flex justify-center items-center z-30 pb-8 px-4 pointer-events-auto">
            <div id="callControlButtons" class="flex items-center justify-center space-x-4 bg-black/60 backdrop-blur-md px-5 py-3.5 rounded-full shadow-2xl">
                ${isIncoming ? `
                    <button type="button" onclick="endWhatsAppCall()" class="w-[52px] h-[52px] rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center cursor-pointer shadow-lg transition"><i class="fa-solid fa-phone-slash text-lg"></i></button>
                    <button type="button" onclick="acceptWhatsAppCall()" class="w-[52px] h-[52px] rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center cursor-pointer shadow-lg animate-bounce transition"><i class="fa-solid fa-phone text-lg"></i></button>
                ` : `
                    <button type="button" id="muteMicBtn" onclick="toggleMicMute()" class="w-[52px] h-[52px] rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center cursor-pointer transition"><i class="fa-solid fa-microphone text-lg"></i></button>
                    <button type="button" id="speakerBtn" onclick="toggleSpeaker()" class="w-[52px] h-[52px] rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center cursor-pointer transition"><i class="fa-solid fa-volume-high text-lg"></i></button>
                    <button type="button" onclick="flipVideoCamera()" class="w-[52px] h-[52px] rounded-full bg-white/15 hover:bg-white/25 text-amber-300 flex items-center justify-center cursor-pointer transition" title="Flip Camera / Video"><i class="fa-solid fa-camera-rotate text-lg"></i></button>
                    <button type="button" onclick="endWhatsAppCall()" class="w-[52px] h-[52px] rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center cursor-pointer shadow-lg transition"><i class="fa-solid fa-phone-slash text-lg"></i></button>
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
        <button type="button" id="muteMicBtn" onclick="toggleMicMute()" class="w-[52px] h-[52px] rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center cursor-pointer transition"><i class="fa-solid fa-microphone text-lg"></i></button>
        <button type="button" id="speakerBtn" onclick="toggleSpeaker()" class="w-[52px] h-[52px] rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center cursor-pointer transition"><i class="fa-solid fa-volume-high text-lg"></i></button>
        <button type="button" onclick="flipVideoCamera()" class="w-[52px] h-[52px] rounded-full bg-white/15 hover:bg-white/25 text-amber-300 flex items-center justify-center cursor-pointer transition" title="Flip Camera / Video"><i class="fa-solid fa-camera-rotate text-lg"></i></button>
        <button type="button" onclick="endWhatsAppCall()" class="w-[52px] h-[52px] rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center cursor-pointer shadow-lg transition"><i class="fa-solid fa-phone-slash text-lg"></i></button>
    `;
}

function saveCallHistoryLog(name, phone, type, direction) {
    let logs = JSON.parse(localStorage.getItem('salaam_call_logs_v18') || '[]');
    logs.unshift({ name, phone, type, direction, time: Date.now() });
    if (logs.length > 50) logs = logs.slice(0, 50);
    localStorage.setItem('salaam_call_logs_v18', JSON.stringify(logs));
}

function renderCallsHistoryView() {
    const listContainer = document.getElementById('sidebarContentList');
    if (!listContainer) return;

    let logs = JSON.parse(localStorage.getItem('salaam_call_logs_v18') || '[]');
    let localContacts = Array.isArray(window.GLOBAL_CLOUD_USERS) ? window.GLOBAL_CLOUD_USERS : JSON.parse(localStorage.getItem('message_contacts_v18') || '[]');

    const html = logs.length === 0
        ? `<div class="p-8 text-center theme-card rounded-2xl mt-4"><p class="text-xs font-bold gold-gradient-text">No call logs yet</p></div>`
        : logs.map(l => {
            const timeStr = new Date(l.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const safeName = (l.name || l.phone).replace(/'/g, "\\'");
            
            const matchedContact = localContacts.find(c => normPhone(c.phone) === normPhone(l.phone));
            const avatarUrl = matchedContact?.avatar || '';
            const initial = (l.name || 'U').trim().charAt(0).toUpperCase();

            const avatarEl = avatarUrl && avatarUrl.trim() !== ''
                ? `<img src="${avatarUrl}" class="w-10 h-10 rounded-full object-cover shrink-0 border border-amber-400/20">`
                : `<div class="w-10 h-10 rounded-full gold-btn flex items-center justify-center font-extrabold text-[#030305] shrink-0">${initial}</div>`;

            return `
            <button type="button" onclick="openChat('${l.phone}', '${safeName}', '${avatarUrl}')" class="w-full flex justify-between items-center px-4 py-3 my-1.5 theme-card rounded-2xl cursor-pointer hover:bg-white/5 text-left">
                <div class="flex items-center space-x-3 min-w-0 flex-1">
                    ${avatarEl}
                    <div class="min-w-0 flex-1">
                        <p class="text-xs font-bold gold-gradient-text truncate">${l.name}</p>
                        <p class="text-[10px] text-gray-400 truncate">${l.direction} • ${l.type.toUpperCase()} • ${timeStr}</p>
                    </div>
                </div>
                <span onclick="event.stopPropagation(); openChat('${l.phone}', '${safeName}', '${avatarUrl}'); startWhatsAppCall('${l.type}')" class="w-9 h-9 rounded-full bg-white/5 text-amber-300 flex items-center justify-center cursor-pointer shrink-0 ml-2">
                    <i class="fa-solid ${l.type === 'video' ? 'fa-video' : 'fa-phone'} text-xs"></i>
                </span>
            </button>`;
        }).join('');

    listContainer.innerHTML = `<div class="p-3 space-y-3 pb-20"><h3 class="text-xs font-bold gold-gradient-text uppercase tracking-wider">Recent Chats & Calls</h3>${html}</div>`;
}
