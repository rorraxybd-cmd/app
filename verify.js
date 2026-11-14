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
    showToast("Code generated!");
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
    showToast("Verified & Account Restored!");
    
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
