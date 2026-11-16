// call.js - Professional Audio & Video Calling Module with Cloudflare TURN Integration
let currentCallType = 'audio', activeCallPeer = null, isCallActive = false;
let callRingInterval = null, activeAudioCtx = null, callPollInterval = null;
let callTimerInterval = null, callSeconds = 0;
let peerConnection = null, localStream = null, remoteStream = null;
let isMicMuted = false, lastHandledSignalTs = 0;
let isLocalMain = false;

// ডিফল্ট স্টান সার্ভার (ফ্যালব্যাক হিসেবে কাজ করবে)
const DEFAULT_RTC_CONFIG = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
    ]
};

// ক্লাউডফ্লেয়ার টার্ন ক্রেডেনশিয়াল ডাইনামিক ফেচ করার ফাংশন
async function getDynamicRTCConfig() {
    try {
        const res = await fetch('/api/call-credentials');
        const data = await res.json();
        if (data.success && data.iceServers) {
            if (Array.isArray(data.iceServers)) {
                return { iceServers: data.iceServers };
            } else if (data.iceServers.iceServers) {
                return { iceServers: data.iceServers.iceServers };
            }
        }
    } catch (e) {
        console.warn("Using default STUN servers due to TURN fetch error:", e);
    }
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
        localStream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
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
    
    if (remoteVid && remoteStream) {
        remoteVid.srcObject = remoteStream;
        remoteVid.play().catch(e => {});
    }
    if (localVid && localStream) {
        localVid.srcObject = localStream;
        localVid.muted = true;
        localVid.play().catch(e => {});
    }
}

function toggleVideoSwap() {
    isLocalMain = !isLocalMain;
    const remoteVid = document.getElementById('callRemoteVideo');
    const localVid = document.getElementById('callLocalVideo');
    if (!remoteVid || !localVid) return;

    if (isLocalMain) {
        localVid.className = "w-full h-full object-cover";
        remoteVid.className = "w-28 h-36 object-cover rounded-2xl border-2 border-amber-400/60 absolute bottom-24 right-4 bg-gray-900 shadow-2xl cursor-pointer hover:scale-105 transition-all z-20";
        localVid.onclick = null;
        remoteVid.onclick = toggleVideoSwap;
    } else {
        remoteVid.className = "w-full h-full object-cover";
        localVid.className = "w-28 h-36 object-cover rounded-2xl border-2 border-amber-400/60 absolute bottom-24 right-4 bg-gray-900 shadow-2xl cursor-pointer hover:scale-105 transition-all z-20";
        remoteVid.onclick = null;
        localVid.onclick = toggleVideoSwap;
    }
}

async function createPeerConnection(peerPhone) {
    if (peerConnection) {
        peerConnection.close();
    }

    const rtcConfig = await getDynamicRTCConfig();
    peerConnection = new RTCPeerConnection(rtcConfig);

    if (localStream) {
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });
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
                        rtc_data: event.candidate
                    })
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
    if (typeof showToast === 'function') showToast("Call Ended");
}

async function toggleVideoSwitch() {
    const newMode = currentCallType === 'audio' ? 'video' : 'audio';
    currentCallType = newMode;
    
    const badge = document.getElementById('callTypeBadge');
    if (badge) badge.innerText = `${newMode} call`;

    const videoBox = document.getElementById('videoStreamsBox');
    const infoBox = document.getElementById('callerInfoBox');

    if (newMode === 'video') {
        if (videoBox) videoBox.classList.remove('hidden');
        if (infoBox) infoBox.classList.add('hidden');
        
        await setupLocalMedia('video');
        
        if (peerConnection && localStream) {
            const videoTrack = localStream.getVideoTracks()[0];
            const senders = peerConnection.getSenders();
            let videoSender = senders.find(s => s.track && s.track.kind === 'video');
            
            if (videoSender && videoTrack) {
                videoSender.replaceTrack(videoTrack);
            } else if (videoTrack) {
                peerConnection.addTrack(videoTrack, localStream);
            }

            try {
                const offer = await peerConnection.createOffer();
                await peerConnection.setLocalDescription(offer);
                const myPhone = normPhone(getActiveProfile().phone);
                const peerPhone = normPhone(activeCallPeer.phone);
                await fetch('/api/chat?action=send_call_signal', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        caller_phone: myPhone,
                        receiver_phone: peerPhone,
                        call_type: 'video',
                        status: 'answered',
                        rtc_data: peerConnection.localDescription
                    })
                });
            } catch (e) {}
        }
        if (typeof showToast === 'function') showToast("Switched to Video Mode");
    } else {
        if (videoBox) videoBox.classList.add('hidden');
        if (infoBox) infoBox.classList.remove('hidden');
        
        if (localStream) {
            localStream.getVideoTracks().forEach(t => t.stop());
        }
        if (peerConnection) {
            const senders = peerConnection.getSenders();
            const videoSender = senders.find(s => s.track && s.track.kind === 'video');
            if (videoSender) {
                peerConnection.removeTrack(videoSender);
            }
        }
        if (typeof showToast === 'function') showToast("Switched to Audio Mode");
    }
}

function toggleMicMute() {
    if (!localStream) return;
    isMicMuted = !isMicMuted;
    localStream.getAudioTracks().forEach(t => t.enabled = !isMicMuted);
    const btn = document.getElementById('muteMicBtn');
    if (btn) {
        btn.innerHTML = isMicMuted ? `<i class="fa-solid fa-microphone-slash text-red-400"></i>` : `<i class="fa-solid fa-microphone"></i>`;
    }
    if (typeof showToast === 'function') showToast(isMicMuted ? "Muted" : "Unmuted");
}

function renderCallModal(peerName, avatarUrl, statusText, mode, isIncoming) {
    let existing = document.getElementById('whatsAppCallModal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'whatsAppCallModal';
    modal.className = 'fixed inset-0 z-50 bg-[#030305] flex flex-col justify-between p-6 overflow-hidden';
    
    modal.innerHTML = `
        <div class="w-full flex justify-between items-center z-30 pt-2">
            <span id="callTypeBadge" class="px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-[11px] font-bold uppercase tracking-wider">${mode} call</span>
            <p id="callStatusLabel" class="text-xs text-gray-300 font-medium">${statusText}</p>
            <div class="w-16"></div>
        </div>

        <div class="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
            <div id="callerInfoBox" class="${mode === 'video' ? 'hidden' : 'flex'} flex-col items-center space-y-4 pointer-events-auto">
                <img src="${avatarUrl || 'https://pub-508ef1e45bab487aadde85a1dba202c4.r2.dev/rorraxyfree/mr%20masudar%20logo%20(3).png'}" class="w-32 h-32 rounded-full object-cover border-4 border-amber-400/60 shadow-2xl animate-pulse bg-black">
                <h2 class="text-2xl font-extrabold gold-gradient-text tracking-wide">${peerName}</h2>
            </div>
        </div>

        <div id="videoStreamsBox" class="${mode === 'video' ? 'flex' : 'hidden'} absolute inset-0 w-full h-full bg-black z-0 overflow-hidden">
            <video id="callRemoteVideo" autoplay playsinline class="w-full h-full object-cover"></video>
            <video id="callLocalVideo" autoplay muted playsinline class="w-28 h-36 object-cover rounded-2xl border-2 border-amber-400/60 absolute bottom-24 right-4 bg-gray-900 shadow-2xl cursor-pointer hover:scale-105 transition-all z-20" onclick="toggleVideoSwap()"></video>
        </div>
        <audio id="callRemoteAudio" autoplay></audio>

        <div class="w-full flex justify-center items-center z-30 pb-8 pointer-events-auto">
            <div id="callControlButtons" class="flex items-center space-x-6 bg-black/60 backdrop-blur-md px-8 py-4 rounded-full border border-white/10 shadow-2xl">
                ${isIncoming ? `
                    <button type="button" onclick="endWhatsAppCall()" class="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-2xl cursor-pointer transform hover:scale-110 transition" title="Decline Call">
                        <i class="fa-solid fa-phone-slash text-xl"></i>
                    </button>
                    <button type="button" onclick="acceptWhatsAppCall()" class="w-16 h-16 rounded-full bg-green-600 hover:bg-green-500 text-white flex items-center justify-center shadow-2xl cursor-pointer transform hover:scale-110 transition animate-bounce" title="Accept Call">
                        <i class="fa-solid fa-phone text-xl"></i>
                    </button>
                ` : `
                    <button type="button" id="muteMicBtn" onclick="toggleMicMute()" class="w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center shadow-lg cursor-pointer transition transform hover:scale-110" title="Mute">
                        <i class="fa-solid fa-microphone text-lg"></i>
                    </button>
                    <button type="button" onclick="toggleVideoSwitch()" class="w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 text-amber-300 flex items-center justify-center shadow-lg cursor-pointer transition transform hover:scale-110" title="Video Switch">
                        <i class="fa-solid fa-video text-lg"></i>
                    </button>
                    <button type="button" onclick="endWhatsAppCall()" class="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-2xl cursor-pointer transform hover:scale-110 transition" title="End Call">
                        <i class="fa-solid fa-phone-slash text-xl"></i>
                    </button>
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
        <button type="button" id="muteMicBtn" onclick="toggleMicMute()" class="w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center shadow-lg cursor-pointer transition transform hover:scale-110" title="Mute">
            <i class="fa-solid fa-microphone text-lg"></i>
        </button>
        <button type="button" onclick="toggleVideoSwitch()" class="w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 text-amber-300 flex items-center justify-center shadow-lg cursor-pointer transition transform hover:scale-110" title="Video Switch">
            <i class="fa-solid fa-video text-lg"></i>
        </button>
        <button type="button" onclick="endWhatsAppCall()" class="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-2xl cursor-pointer transform hover:scale-110 transition" title="End Call">
            <i class="fa-solid fa-phone-slash text-xl"></i>
        </button>
    `;
}

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

                if (Date.now() - sig.ts > 20000) return;

                const modal = document.getElementById('whatsAppCallModal');
                
                if (sig.status === 'ice' && isCallActive && peerConnection && sig.rtc) {
                    if (sig.ts > lastHandledSignalTs) {
                        try {
                            await peerConnection.addIceCandidate(new RTCIceCandidate(sig.rtc));
                        } catch (e) {}
                    }
                    return;
                }

                if (sig.status === 'ringing' && !isCallActive && !modal && sig.ts > lastHandledSignalTs) {
                    lastHandledSignalTs = sig.ts;
                    const callerPhone = normPhone(sig.caller);
                    if (callerPhone === myPhone) return;

                    let deviceContacts = JSON.parse(localStorage.getItem('message_contacts_v18') || '[]');
                    let callerContact = deviceContacts.find(c => normPhone(c.phone) === callerPhone);
                    if (!callerContact) {
                        callerContact = { name: callerPhone, phone: callerPhone, appUser: true, isOnline: true };
                        deviceContacts.push(callerContact);
                        localStorage.setItem('message_contacts_v18', JSON.stringify(deviceContacts));
                    }

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
                        if (typeof showToast === 'function') showToast("Call Connected!");
                    }
                    if (peerConnection && sig.rtc && peerConnection.signalingState !== 'stable') {
                        await peerConnection.setRemoteDescription(new RTCSessionDescription(sig.rtc));
                    }
                }
            }
        } catch (e) {}
    }, 2000);
}
