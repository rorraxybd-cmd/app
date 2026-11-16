// verify.js - Professional Verification & Profile Module
let generatedOtpCode = "", tempVerifyPhone = "", tempVerifyName = "", userDeviceIp = "Unknown";
let isVerifiedSession = localStorage.getItem('message_verified_v18') === 'true';

const RESERVED_USERNAMES = ['rorraxy', 'mrmasudar', 'admin', 'support', 'message'];

let savedProfiles = JSON.parse(localStorage.getItem('message_profiles_v18') || 'null') || [{
    name: "rorraxy.com",
    phone: "+8801538187301",
    username: "rorraxy.com",
    themeColor: "emerald",
    avatar: "https://pub-e1469a425020465cb5f7971065e07a62.r2.dev/logo.jpg"
}];

async function populateVerifyCountryDropdown() {
    const select = document.getElementById('vCountrySelect');
    if (!select) return;
    let detectedCountryCode = '880'; 

    try {
        const ipRes = await fetch('https://ipapi.co/json/');
        if (ipRes.ok) {
            const ipData = await ipRes.json();
            userDeviceIp = ipData.ip || 'Unknown';
            const countryName = ipData.country_name;
            if (typeof GLOBAL_CONTINENTS_DATA !== 'undefined') {
                for (const cont of GLOBAL_CONTINENTS_DATA) {
                    const found = cont.countries.find(c => c.name.toLowerCase() === countryName?.toLowerCase());
                    if (found) {
                        detectedCountryCode = found.code;
                        break;
                    }
                }
            }
        }
    } catch (e) {}

    if (typeof GLOBAL_CONTINENTS_DATA !== 'undefined' && Array.isArray(GLOBAL_CONTINENTS_DATA)) {
        let html = '';
        GLOBAL_CONTINENTS_DATA.forEach(continent => {
            continent.countries.forEach(c => {
                const isSelected = (c.code === detectedCountryCode) ? 'selected' : '';
                html += `<option value="+${c.code}|10" ${isSelected}>${c.flag} +${c.code}</option>`;
            });
        });
        select.innerHTML = html;
    } else {
        select.innerHTML = `<option value="+880|10" selected>🇧🇩 +880</option>`;
    }
    updatePhoneValidation();
}

function getCountryInfo(phone) {
    const p = String(phone || '').replace(/[\s\-\(\)]/g, '');
    if (typeof GLOBAL_CONTINENTS_DATA !== 'undefined') {
        for (const cont of GLOBAL_CONTINENTS_DATA) {
            for (const c of cont.countries) {
                if (p.startsWith('+' + c.code) || p.startsWith(c.code)) {
                    return { code: '+' + c.code, name: c.name, flag: c.flag };
                }
            }
        }
    }
    return { code: 'OTHER', name: 'Global', flag: '🌐' };
}

function getActiveProfile() { return savedProfiles[0]; }
function saveProfiles() { localStorage.setItem('message_profiles_v18', JSON.stringify(savedProfiles)); }
function normPhone(p) { return String(p || '').replace(/[\s\-\(\)]/g, ''); }

function updatePhoneValidation() {
    const select = document.getElementById('vCountrySelect'), phoneInput = document.getElementById('vPhoneInput');
    if (!select || !phoneInput) return;
    const val = select.value.split('|');
    phoneInput.maxLength = val[1] || 10;
    phoneInput.placeholder = "1700000000";
}

async function submitVerifyStep1() {
    const nameInput = document.getElementById('vFullName');
    const selectEl = document.getElementById('vCountrySelect');
    const phoneInput = document.getElementById('vPhoneInput');

    const name = nameInput ? nameInput.value.trim() : '';
    const selectData = selectEl ? selectEl.value.split('|') : ['+880', '10'];
    const countryCode = selectData[0];
    const phone = phoneInput ? phoneInput.value.trim() : '';

    if (!name) { 
        if (typeof showToast === 'function') showToast("দয়া করে আপনার পুরো নাম লিখুন", true);
        return; 
    }
    if (!phone || phone.length < 6) { 
        if (typeof showToast === 'function') showToast("সঠিক ফোন নম্বর দিন", true);
        return; 
    }

    tempVerifyName = name; 
    tempVerifyPhone = countryCode + phone;
    generatedOtpCode = Math.floor(100000 + Math.random() * 900000).toString();

    try {
        await fetch('/api/chat?action=send_magic_link', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ display_name: tempVerifyName, phone: tempVerifyPhone, magic_code: generatedOtpCode, ip: userDeviceIp })
        });
    } catch (e) {}

    const step1El = document.getElementById('verifyStep1');
    const step2El = document.getElementById('verifyStep2');
    if (step1El) step1El.classList.add('hidden');
    if (step2El) step2El.classList.remove('hidden');
    
    const otpInput = document.getElementById('vOtpInput');
    if (otpInput) otpInput.value = generatedOtpCode;

    if (typeof showToast === 'function') showToast("ভেরিফিকেশন কোড অটো-ফিল করা হয়েছে");
}

async function submitVerifyStep2() {
    const otpEl = document.getElementById('vOtpInput');
    const entered = otpEl ? otpEl.value.trim() : '';
    
    if (entered !== generatedOtpCode) { 
        if (typeof showToast === 'function') showToast("ভুল কোড দেওয়া হয়েছে", true); 
        return; 
    }

    const cleanVerifyPhone = normPhone(tempVerifyPhone);
    let localContacts = JSON.parse(localStorage.getItem('message_contacts_v18') || '[]');
    const existingContact = localContacts.find(c => normPhone(c.phone) === cleanVerifyPhone);

    isVerifiedSession = true;
    localStorage.setItem('message_verified_v18', 'true');

    if (!existingContact) {
        localContacts.push({
            name: tempVerifyName,
            phone: cleanVerifyPhone,
            avatar: "https://pub-508ef1e45bab487aadde85a1dba202c4.r2.dev/im1024.jpg",
            isOnline: true,
            appUser: true
        });
        localStorage.setItem('message_contacts_v18', JSON.stringify(localContacts));
    }

    savedProfiles[0] = {
        name: tempVerifyName,
        phone: cleanVerifyPhone,
        username: 'user_' + Math.floor(1000 + Math.random() * 9000),
        themeColor: "emerald",
        avatar: "https://pub-508ef1e45bab487aadde85a1dba202c4.r2.dev/im1024.jpg"
    };
    saveProfiles();

    if (typeof confetti === 'function') confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
    
    const overlay = document.getElementById('verifyOverlay');
    if (overlay) overlay.style.display = 'none';
    
    if (typeof showToast === 'function') showToast("সফলভাবে কানেক্ট হয়েছে!");
    
    if (typeof initAppAfterVerification === 'function') {
        initAppAfterVerification();
    } else if (typeof switchTab === 'function') {
        switchTab('contact');
    }
}

function shareProfileLink() {
    const profile = getActiveProfile();
    const profileUrl = `https://chat.rorraxy.com/${profile.username || 'user'}`;
    
    if (navigator.share) {
        navigator.share({
            title: 'MESSAGE by rorraxy.com',
            url: profileUrl
        }).catch(() => {});
    } else {
        navigator.clipboard.writeText(profileUrl).then(() => {
            if (typeof showToast === 'function') showToast(`কপি হয়েছে: ${profileUrl}`);
        }).catch(() => {
            if (typeof showToast === 'function') showToast("লিংক কপি করতে ব্যর্থ হয়েছে", true);
        });
    }
}

function renderProfileView(isEditing = false) {
    const profile = getActiveProfile();
    const sidebarList = document.getElementById('sidebarContentList');
    if (!sidebarList) return;

    const phoneStr = profile.phone || '';
    const maskedPhone = phoneStr.length > 6 ? phoneStr.substring(0, 5) + '******' + phoneStr.slice(-2) : phoneStr;

    sidebarList.innerHTML = `
        <div class="p-4 space-y-4 max-w-md mx-auto pb-24">
            <div class="text-center space-y-3 theme-card p-6 rounded-3xl border border-amber-400/10">
                <div class="relative w-24 h-24 mx-auto">
                    <img id="profileAvatarPreview" src="${profile.avatar}" class="w-24 h-24 rounded-full object-cover bg-black border-2 border-amber-400/40">
                    <label class="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-pink-600 hover:bg-pink-500 text-white flex items-center justify-center cursor-pointer shadow-md hover:scale-110 transition" title="Change Photo">
                        <i class="fa-solid fa-camera text-xs"></i>
                        <input type="file" accept="image/*" class="hidden" onchange="handleProfileAvatarChange(this)">
                    </label>
                </div>
                <div>
                    <h3 class="text-base font-bold gold-gradient-text">${profile.name}</h3>
                    <p class="text-[11px] text-gray-400 mt-1 flex items-center justify-center space-x-1">
                        <i class="fa-solid fa-phone text-amber-300"></i>
                        <span class="tracking-wider">${maskedPhone}</span>
                        <span class="text-[10px] text-emerald-400 font-semibold ml-1">Verified</span>
                    </p>
                </div>

                <div class="pt-2">
                    <button onclick="shareProfileLink()" class="w-full py-3.5 px-4 rounded-2xl theme-input hover:border-pink-500/50 transition cursor-pointer flex items-center justify-center">
                        <span class="text-xs font-extrabold pink-gradient-text tracking-wider uppercase">Share Profile</span>
                    </button>
                </div>
            </div>

            <div class="space-y-4 theme-card p-6 rounded-3xl border border-amber-400/10">
                <div class="flex items-center justify-between border-b border-white/10 pb-2">
                    <h4 class="text-xs font-bold gold-gradient-text uppercase tracking-wider">Profile Information</h4>
                    <button onclick="renderProfileView(${!isEditing})" class="text-[11px] text-amber-300 hover:underline font-semibold flex items-center space-x-1 cursor-pointer">
                        <i class="fa-solid ${isEditing ? 'fa-xmark' : 'fa-pen-to-square'}"></i>
                        <span>${isEditing ? 'বাতিল' : 'এডিট প্রোফাইল'}</span>
                    </button>
                </div>

                ${!isEditing ? `
                    <div class="space-y-3 pt-2 text-xs text-gray-300">
                        <div class="flex justify-between items-center py-2 border-b border-white/5">
                            <span class="text-gray-400 font-medium">Full Name</span>
                            <span class="font-bold text-white">${profile.name}</span>
                        </div>
                        <div class="flex justify-between items-center py-2 border-b border-white/5">
                            <span class="text-gray-400 font-medium">Username</span>
                            <span class="font-bold text-amber-300">@${profile.username}</span>
                        </div>
                    </div>
                ` : `
                    <div class="space-y-3.5 pt-1">
                        <div class="space-y-1.5">
                            <label class="text-[10px] font-bold tracking-wider text-gray-300 uppercase">FULL NAME</label>
                            <input type="text" id="editDisplayName" value="${profile.name}" class="w-full theme-input text-xs px-4 py-3.5 rounded-xl text-white focus:outline-none border border-amber-400/10">
                        </div>

                        <div class="space-y-1.5">
                            <label class="text-[10px] font-bold tracking-wider text-gray-300 uppercase">USERNAME</label>
                            <input type="text" id="editUsername" value="${profile.username}" class="w-full theme-input text-xs px-4 py-3.5 rounded-xl text-white focus:outline-none border border-amber-400/10" placeholder="username">
                        </div>

                        <button onclick="saveProfileSettings()" class="w-full py-3.5 gold-btn text-xs rounded-xl font-extrabold cursor-pointer mt-2 transition hover:brightness-110 uppercase tracking-wider">
                            SAVE CHANGES
                        </button>
                    </div>
                `}
            </div>
        </div>
    `;
}

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

            if (typeof showToast === 'function') showToast("প্রোফাইল ছবি সেভ হয়েছে");
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

async function saveProfileSettings() {
    const nameInput = document.getElementById('editDisplayName');
    const userSelectInput = document.getElementById('editUsername');

    if (!nameInput || !userSelectInput) return;

    const newName = nameInput.value.trim();
    const newUsername = userSelectInput.value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    
    if (!newName) { if (typeof showToast === 'function') showToast("নাম খালি রাখা যাবে না", true); return; }
    if (RESERVED_USERNAMES.includes(newUsername)) { if (typeof showToast === 'function') showToast("এই ইউজারনেমটি সংরক্ষিত", true); return; }

    const profile = getActiveProfile();
    profile.name = newName;
    if (newUsername) profile.username = newUsername;
    saveProfiles();

    if (typeof showToast === 'function') showToast("প্রোফাইল আপডেট সফল হয়েছে!");
    renderProfileView(false);
}
