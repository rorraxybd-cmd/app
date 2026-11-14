let deferredPrompt = null;
let generatedOtpCode = "", tempVerifyPhone = "", tempVerifyName = "", userDeviceIp = "Unknown";
let isVerifiedSession = localStorage.getItem('salaam_verified_v18') === 'true';

const RESERVED_USERNAMES = ['rorraxy', 'mrmasudar', 'admin', 'support', 'salaam'];

let savedProfiles = JSON.parse(localStorage.getItem('salaam_profiles_v18') || 'null') || [{
    name: "User",
    phone: "+8801700000000",
    username: "user_" + Math.floor(1000 + Math.random() * 9000),
    privacy: "public",
    avatar: "https://pub-508ef1e45bab487aadde85a1dba202c4.r2.dev/rorraxyfree/mr%20masudar%20logo%20(3).png"
}];

const COUNTRY_MAP = [
    { code: '+880', name: 'Bangladesh', flag: '🇧🇩' },
    { code: '+966', name: 'Saudi Arabia', flag: '🇸🇦' },
    { code: '+971', name: 'UAE', flag: '🇦🇪' },
    { code: '+91', name: 'India', flag: '🇮🇳' },
    { code: '+92', name: 'Pakistan', flag: '🇵🇰' },
    { code: '+1', name: 'USA / Canada', flag: '🇺🇸' },
    { code: '+44', name: 'UK', flag: '🇬🇧' }
];

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    document.getElementById('pwaInstallContainer')?.classList.remove('hidden');
});

async function installPWAApp() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult.outcome === 'accepted') {
            document.getElementById('pwaInstallContainer')?.classList.add('hidden');
        }
        deferredPrompt = null;
    }
    document.getElementById('pwaInstallContainer')?.classList.add('hidden');
    document.getElementById('verifyStep1').style.display = 'block';
    updatePhoneValidation();
}

function getCountryInfo(phone) {
    const p = String(phone || '').replace(/[\s\-\(\)]/g, '');
    for (const c of COUNTRY_MAP) {
        if (p.startsWith(c.code)) return c;
    }
    return { code: 'OTHER', name: 'Global', flag: '🌍' };
}

function getActiveProfile() { return savedProfiles[0]; }
function saveProfiles() { localStorage.setItem('salaam_profiles_v18', JSON.stringify(savedProfiles)); }
function normPhone(p) { return String(p || '').replace(/[\s\-\(\)]/g, ''); }

async function detectUserIp() {
    try {
        const res = await fetch('https://ipapi.co/json/').catch(() => null);
        if (res && res.ok) { let data = await res.json(); userDeviceIp = data.ip || 'Unknown'; }
    } catch (e) { userDeviceIp = 'Unknown'; }
}

function updatePhoneValidation() {
    const select = document.getElementById('vCountrySelect'), phoneInput = document.getElementById('vPhoneInput');
    if (!select || !phoneInput) return;
    const val = select.value.split('|');
    phoneInput.maxLength = val[1];
    phoneInput.placeholder = "Enter " + val[1] + " digits";
}

async function submitVerifyStep1() {
    const name = document.getElementById('vFullName').value.trim();
    const selectData = document.getElementById('vCountrySelect').value.split('|');
    const countryCode = selectData[0], requiredLen = parseInt(selectData[1], 10);
    const phone = document.getElementById('vPhoneInput').value.trim();

    if (!name) { showToast("Please enter your full name", true); return; }
    if (!phone || phone.length < requiredLen - 1) { showToast(`Enter valid number (${requiredLen} digits)`, true); return; }

    tempVerifyName = name; tempVerifyPhone = countryCode + phone;
    generatedOtpCode = Math.floor(100000 + Math.random() * 900000).toString();

    if (userDeviceIp === "Unknown" || userDeviceIp === "Detecting...") { await detectUserIp(); }

    try {
        await fetch('/api/chat?action=send_magic_link', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ display_name: tempVerifyName, phone: tempVerifyPhone, magic_code: generatedOtpCode, ip: userDeviceIp })
        });
    } catch (e) {}

    document.getElementById('verifyStep1').style.display = 'none';
    document.getElementById('verifyStep2').style.display = 'block';
    document.getElementById('vDisplayCode').innerText = generatedOtpCode;
    showToast("Verification code ready");
}

function autoFillOtp() { document.getElementById('vOtpInput').value = generatedOtpCode; }

async function submitVerifyStep2() {
    const entered = document.getElementById('vOtpInput').value.trim();
    if (entered !== generatedOtpCode) { showToast("Invalid code", true); return; }

    isVerifiedSession = true;
    localStorage.setItem('salaam_verified_v18', 'true');
    
    try {
        const res = await fetch(`/api/chat?action=get_user_profile&phone=${encodeURIComponent(tempVerifyPhone)}`);
        if (res.ok) {
            const data = await res.json();
            if (data.success && data.user) {
                savedProfiles[0] = {
                    name: data.user.display_name || tempVerifyName,
                    phone: tempVerifyPhone,
                    username: data.user.username || ('user_' + Math.floor(1000 + Math.random() * 9000)),
                    privacy: "public",
                    avatar: data.user.avatar_url || "https://pub-508ef1e45bab487aadde85a1dba202c4.r2.dev/rorraxyfree/mr%20masudar%20logo%20(3).png"
                };
                saveProfiles();
            } else {
                const p = getActiveProfile();
                p.name = tempVerifyName; p.phone = tempVerifyPhone;
                saveProfiles();
            }
        }
    } catch (e) {
        const p = getActiveProfile();
        p.name = tempVerifyName; p.phone = tempVerifyPhone;
        saveProfiles();
    }

    if (userDeviceIp === "Unknown" || userDeviceIp === "Detecting...") { await detectUserIp(); }

    try {
        await fetch('/api/chat?action=verify_magic_code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: tempVerifyPhone, magic_code: entered, ip: userDeviceIp, unique_id: 'usr_' + Date.now(), contacts_json: JSON.stringify([]) })
        });
    } catch (e) {}

    if (typeof confetti === 'function') confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
    document.getElementById('verifyOverlay').style.display = 'none';
    showToast("Verified & Connected");
    
    if (typeof initAppAfterVerification === 'function') initAppAfterVerification();
}

function checkInitialVerification() {
    detectUserIp();
    if (!isVerifiedSession) {
        document.getElementById('verifyOverlay').style.display = 'flex';
        if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
            document.getElementById('pwaInstallContainer')?.classList.add('hidden');
            document.getElementById('verifyStep1').style.display = 'block';
            updatePhoneValidation();
        }
    } else {
        document.getElementById('verifyOverlay').style.display = 'none';
        if (typeof initAppAfterVerification === 'function') initAppAfterVerification();
    }
}

function renderProfileView() {
    const profile = getActiveProfile();
    const sidebarList = document.getElementById('sidebarContentList');
    if (!sidebarList) return;

    sidebarList.innerHTML = `
        <div class="p-3 space-y-4">
            <div class="text-center space-y-2 theme-card p-4 rounded-2xl border border-white/5">
                <div class="relative w-20 h-20 mx-auto">
                    <img id="profileAvatarPreview" src="${profile.avatar}" class="w-20 h-20 rounded-full object-cover border-2 border-amber-400/50 bg-black">
                    <label class="absolute bottom-0 right-0 w-7 h-7 rounded-full pink-btn flex items-center justify-center cursor-pointer shadow-md" title="Change Photo">
                        <i class="fa-solid fa-camera text-[11px]"></i>
                        <input type="file" accept="image/*" class="hidden" onchange="handleProfileAvatarChange(this)">
                    </label>
                </div>
                <div>
                    <h3 class="text-sm font-bold gold-gradient-text">${profile.name}</h3>
                    <p class="text-[11px] text-gray-400 font-medium">${profile.phone}</p>
                    <span class="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-[#2ed573]/15 text-[#2ed573] text-[10px] font-semibold">Verified Account</span>
                </div>
            </div>

            <div class="space-y-3 theme-card p-4 rounded-2xl border border-white/5">
                <div class="space-y-1">
                    <label class="text-[10px] font-bold tracking-wider gold-gradient-text">DISPLAY NAME</label>
                    <input type="text" id="editDisplayName" value="${profile.name}" class="w-full theme-input text-xs px-3.5 py-2.5 rounded-xl text-white focus:outline-none border border-white/10">
                </div>
                <div class="space-y-1">
                    <label class="text-[10px] font-bold tracking-wider gold-gradient-text">USERNAME</label>
                    <input type="text" id="editUsername" value="${profile.username}" class="w-full theme-input text-xs px-3.5 py-2.5 rounded-xl text-white focus:outline-none border border-white/10" placeholder="username">
                </div>
                <button onclick="saveProfileSettings()" class="w-full py-3 gold-btn text-xs rounded-xl font-bold cursor-pointer shadow-lg mt-1">
                    SAVE & SYNC PROFILE
                </button>
            </div>
        </div>
    `;
}

function handleProfileAvatarChange(input) {
    if (!input.files || !input.files[0]) return;
    const reader = new FileReader();
    reader.onload = async e => {
        const avatarDataUrl = e.target.result;
        const profile = getActiveProfile();
        profile.avatar = avatarDataUrl;
        saveProfiles();
        document.getElementById('profileAvatarPreview').src = avatarDataUrl;

        try {
            await fetch('/api/chat?action=update_profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: profile.phone, avatar_url: avatarDataUrl })
            });
            showToast("Profile photo updated");
        } catch (err) {}
    };
    reader.readAsDataURL(input.files[0]);
}

async function saveProfileSettings() {
    const newName = document.getElementById('editDisplayName').value.trim();
    const newUsername = document.getElementById('editUsername').value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    
    if (!newName) { showToast("Display name cannot be empty", true); return; }
    if (RESERVED_USERNAMES.includes(newUsername)) { showToast("Username is reserved", true); return; }

    const profile = getActiveProfile();
    profile.name = newName;
    if (newUsername) profile.username = newUsername;
    saveProfiles();

    try {
        await fetch('/api/chat?action=update_profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                phone: profile.phone,
                display_name: profile.name,
                username: profile.username,
                avatar_url: profile.avatar
            })
        });
        showToast("Profile synced with cloud");
        renderProfileView();
    } catch (e) {
        showToast("Saved locally", true);
    }
}
