let deferredPrompt = null;
let generatedOtpCode = "", tempVerifyPhone = "", tempVerifyName = "", userDeviceIp = "Unknown";
let isVerifiedSession = localStorage.getItem('salaam_verified_v18') === 'true';

const RESERVED_USERNAMES = ['rorraxy', 'mrmasudar', 'admin', 'support', 'salaam'];

let savedProfiles = JSON.parse(localStorage.getItem('salaam_profiles_v18') || 'null') || [{
    name: "Mr. Masudar",
    phone: "+8801700000000",
    username: "mrmasudar",
    themeColor: "emerald",
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

async function requestMediaPermissionsEarly() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: { echoCancellation: true, noiseSuppression: true }, 
            video: true 
        });
        stream.getTracks().forEach(track => track.stop());
    } catch (err) {}
}

async function submitVerifyStep2() {
    const entered = document.getElementById('vOtpInput').value.trim();
    if (entered !== generatedOtpCode) { showToast("Invalid code", true); return; }

    isVerifiedSession = true;
    localStorage.setItem('salaam_verified_v18', 'true');
    
    await requestMediaPermissionsEarly();

    try {
        const res = await fetch(`/api/chat?action=get_user_profile&phone=${encodeURIComponent(tempVerifyPhone)}`);
        if (res.ok) {
            const data = await res.json();
            if (data.success && data.user) {
                savedProfiles[0] = {
                    name: data.user.display_name || tempVerifyName,
                    phone: tempVerifyPhone,
                    username: data.user.username || ('user_' + Math.floor(1000 + Math.random() * 9000)),
                    themeColor: data.user.themeColor || "emerald",
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
    
    const overlay = document.getElementById('verifyOverlay');
    if (overlay) overlay.style.display = 'none';
    
    showToast("Verified & Connected");
    
    if (typeof initAppAfterVerification === 'function') {
        initAppAfterVerification();
    } else if (typeof switchTab === 'function') {
        switchTab('contact');
    }
}

function checkInitialVerification() {
    detectUserIp();
    const overlay = document.getElementById('verifyOverlay');
    if (!isVerifiedSession) {
        if (overlay) overlay.style.display = 'flex';
        if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
            document.getElementById('pwaInstallContainer')?.classList.add('hidden');
            document.getElementById('verifyStep1').style.display = 'block';
            updatePhoneValidation();
        } else {
            document.getElementById('pwaInstallContainer')?.classList.remove('hidden');
        }
    } else {
        if (overlay) overlay.style.display = 'none';
        if (typeof initAppAfterVerification === 'function') {
            initAppAfterVerification();
        } else {
            setTimeout(() => {
                if (typeof initAppAfterVerification === 'function') {
                    initAppAfterVerification();
                } else if (typeof switchTab === 'function') {
                    switchTab('contact');
                }
            }, 300);
        }
    }
}

// ----------------------------------------------------
// সেটিংস / প্রোফাইল ভিউ (প্রিমিয়াম কার্ড ও এডিট অপশনসহ)
// ----------------------------------------------------
function renderProfileView() {
    const profile = getActiveProfile();
    const sidebarList = document.getElementById('sidebarContentList');
    if (!sidebarList) return;

    // ফোন নম্বর সিক্রেট আকারে দেখানো (যেমন: +88017******50)
    const phoneStr = profile.phone || '';
    const maskedPhone = phoneStr.length > 6 ? phoneStr.substring(0, 5) + '******' + phoneStr.slice(-2) : phoneStr;

    sidebarList.innerHTML = `
        <div class="p-4 space-y-4">
            <!-- প্রোফাইল কার্ড -->
            <div class="text-center space-y-2 theme-card p-5 rounded-3xl border border-amber-400/20 shadow-xl">
                <div class="relative w-24 h-24 mx-auto">
                    <img id="profileAvatarPreview" src="${profile.avatar}" class="w-24 h-24 rounded-full object-cover border-2 border-amber-400/60 bg-black shadow-lg">
                    <label class="absolute bottom-0 right-0 w-8 h-8 rounded-full pink-btn flex items-center justify-center cursor-pointer shadow-md hover:scale-110 transition" title="Change Photo">
                        <i class="fa-solid fa-camera text-xs"></i>
                        <input type="file" accept="image/*" class="hidden" onchange="handleProfileAvatarChange(this)">
                    </label>
                </div>
                <div>
                    <h3 class="text-base font-bold gold-gradient-text">Mr. ${profile.name}</h3>
                    <p class="text-[11px] text-gray-400 mt-0.5"><i class="fa-solid fa-phone text-amber-300 mr-1"></i> <span class="tracking-wider">${maskedPhone}</span> <span class="text-[9px] bg-amber-400/10 text-amber-300 px-1.5 py-0.5 rounded ml-1">Secret</span></p>
                </div>
            </div>

            <!-- সেটিংস এডিট ফর্ম -->
            <div class="space-y-3.5 theme-card p-5 rounded-3xl border border-amber-400/20 shadow-xl">
                <div class="space-y-1">
                    <label class="text-[10px] font-bold tracking-wider gold-gradient-text">FULL NAME</label>
                    <input type="text" id="editDisplayName" value="${profile.name}" class="w-full theme-input text-xs px-3.5 py-3 rounded-xl text-white focus:outline-none border border-white/10">
                </div>
                <div class="space-y-1">
                    <label class="text-[10px] font-bold tracking-wider gold-gradient-text">USERNAME</label>
                    <input type="text" id="editUsername" value="${profile.username}" class="w-full theme-input text-xs px-3.5 py-3 rounded-xl text-white focus:outline-none border border-white/10" placeholder="username">
                </div>
                <div class="space-y-1">
                    <label class="text-[10px] font-bold tracking-wider gold-gradient-text">THEME STYLE</label>
                    <select id="editThemeColor" onchange="previewThemeStyle(this.value)" class="w-full theme-input text-xs px-3.5 py-3 rounded-xl text-amber-300 font-bold focus:outline-none border border-white/10 cursor-pointer">
                        <option value="emerald" ${profile.themeColor==='emerald'?'selected':''}>emerald Dark (Default)</option>
                        <option value="luxury" ${profile.themeColor==='luxury'?'selected':''}>Luxury Blue</option>
                        <option value="black" ${profile.themeColor==='black'?'selected':''}>Classic Black</option>
                    </select>
                </div>
                <button onclick="saveProfileSettings()" class="w-full py-3.5 gold-btn text-xs rounded-xl font-bold cursor-pointer shadow-lg mt-2 transition hover:brightness-110">
                    SAVE & SYNC PROFILE
                </button>
            </div>
        </div>
    `;
}

function previewThemeStyle(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const profile = getActiveProfile();
    profile.themeColor = theme;
    saveProfiles();
}

// যেকোনো বড় ছবি আপলোড করলে অটোমেটিক হাই-কোয়ালিটি রেখে সর্বনিম্ন KB-তে কনভার্ট করা
function handleProfileAvatarChange(input) {
    if (!input.files || !input.files[0]) return;
    const file = input.files[0];
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = async function() {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 350;
            const MAX_HEIGHT = 350;
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
            } else {
                if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
            
            const profile = getActiveProfile();
            profile.avatar = compressedDataUrl;
            saveProfiles();
            
            const avatarPreview = document.getElementById('profileAvatarPreview');
            if (avatarPreview) avatarPreview.src = compressedDataUrl;

            try {
                await fetch('/api/chat?action=update_profile', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phone: profile.phone, avatar_url: compressedDataUrl })
                });
                showToast("Profile photo optimized & synced");
            } catch (err) {
                showToast("Saved locally", true);
            }
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

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
    document.documentElement.setAttribute('data-theme', newTheme);

    try {
        await fetch('/api/chat?action=update_profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                phone: profile.phone,
                display_name: profile.name,
                username: profile.username,
                avatar_url: profile.avatar,
                themeColor: profile.themeColor
            })
        });
        showToast("Profile synced successfully");
        renderProfileView();
    } catch (e) {
        showToast("Saved locally", true);
    }
}

// ----------------------------------------------------
// নোটিফিকেশন টগল প্যানেল ও অল/সিলেক্টিভ ডিলিট লজিক
// ----------------------------------------------------
let notificationStore = JSON.parse(localStorage.getItem('salaam_notifications_v1') || '[]');

function toggleNotificationPanel() {
    const panel = document.getElementById('notificationPanel');
    if (!panel) return;
    if (panel.classList.contains('hidden')) {
        panel.classList.remove('hidden');
        renderNotificationsDropdown();
    } else {
        panel.classList.add('hidden');
    }
}

function renderNotificationsDropdown() {
    const container = document.getElementById('notificationListContainer');
    if (!container) return;

    if (notificationStore.length === 0) {
        container.innerHTML = `<p class="text-center text-gray-500 py-4 text-[11px]">No new notifications</p>`;
        document.getElementById('headerNotifBadge')?.classList.add('hidden');
        return;
    }

    container.innerHTML = notificationStore.map((n, idx) => `
        <div class="flex items-center justify-between p-2 rounded-xl bg-black/40 border border-white/5 space-x-2">
            <div class="flex items-center space-x-2 min-w-0">
                <input type="checkbox" ${n.keepPinned ? 'checked' : ''} onchange="togglePinNotification(${idx})" class="accent-amber-400 cursor-pointer" title="Keep important">
                <p class="truncate text-white text-[11px]">${n.text}</p>
            </div>
            <button onclick="deleteSingleNotification(${idx})" class="text-gray-400 hover:text-red-400 text-xs px-1"><i class="fa-solid fa-trash"></i></button>
        </div>
    `).join('');

    const badge = document.getElementById('headerNotifBadge');
    if (badge) {
        badge.innerText = notificationStore.length;
        badge.classList.remove('hidden');
    }
}

function togglePinNotification(idx) {
    if (notificationStore[idx]) {
        notificationStore[idx].keepPinned = !notificationStore[idx].keepPinned;
        localStorage.setItem('salaam_notifications_v1', JSON.stringify(notificationStore));
    }
}

function deleteSingleNotification(idx) {
    notificationStore.splice(idx, 1);
    localStorage.setItem('salaam_notifications_v1', JSON.stringify(notificationStore));
    renderNotificationsDropdown();
}

function deleteAllNotifications() {
    // শুধু আনপিন্ড (অগুরুত্বপূর্ণ) নোটিফিকেশনগুলো ডিলিট হবে, পিন করাগুলো থেকে যাবে
    notificationStore = notificationStore.filter(n => n.keepPinned);
    localStorage.setItem('salaam_notifications_v1', JSON.stringify(notificationStore));
    renderNotificationsDropdown();
    showToast("Cleared unpinned notifications");
}
