// verify.js - Professional Verification & Profile Module (Complete 200+ Countries & Sync)
let generatedOtpCode = "", tempVerifyPhone = "", tempVerifyName = "", userDeviceIp = "Unknown";
let isVerifiedSession = localStorage.getItem('message_verified_v18') === 'true';

const RESERVED_USERNAMES = ['rorraxy', 'mrmasudar', 'admin', 'support', 'message'];

// প্রায় ২০০+ দেশের পতাকা এবং কান্ট্রি কোডের সম্পূর্ণ ডেটাসেট
const GLOBAL_CONTINENTS_DATA = [
    {
        id: "asia",
        title: "🌏 Asia",
        countries: [
            { flag: "🇦🇫", name: "Afghanistan", code: "93" }, { flag: "🇦🇲", name: "Armenia", code: "374" },
            { flag: "🇦🇿", name: "Azerbaijan", code: "994" }, { flag: "🇧🇭", name: "Bahrain", code: "973" },
            { flag: "🇧🇩", name: "Bangladesh", code: "880" }, { flag: "🇧🇹", name: "Bhutan", code: "975" },
            { flag: "🇧🇳", name: "Brunei", code: "673" }, { flag: "🇰🇭", name: "Cambodia", code: "855" },
            { flag: "🇨🇳", name: "China", code: "86" }, { flag: "🇨🇾", name: "Cyprus", code: "357" },
            { flag: "🇬🇪", name: "Georgia", code: "995" }, { flag: "🇮🇳", name: "India", code: "91" },
            { flag: "🇮🇩", name: "Indonesia", code: "62" }, { flag: "🇮🇷", name: "Iran", code: "98" },
            { flag: "🇮🇶", name: "Iraq", code: "964" }, { flag: "🇮🇱", name: "Israel", code: "972" },
            { flag: "🇯🇵", name: "Japan", code: "81" }, { flag: "🇯🇴", name: "Jordan", code: "962" },
            { flag: "🇰🇿", name: "Kazakhstan", code: "7" }, { flag: "🇰🇼", name: "Kuwait", code: "965" },
            { flag: "🇰🇬", name: "Kyrgyzstan", code: "996" }, { flag: "🇱🇦", name: "Laos", code: "856" },
            { flag: "🇱🇧", name: "Lebanon", code: "961" }, { flag: "🇲🇾", name: "Malaysia", code: "60" },
            { flag: "🇲🇻", name: "Maldives", code: "960" }, { flag: "🇲🇳", name: "Mongolia", code: "976" },
            { flag: "🇲🇲", name: "Myanmar", code: "95" }, { flag: "🇳🇵", name: "Nepal", code: "977" },
            { flag: "🇰🇵", name: "North Korea", code: "850" }, { flag: "🇴🇲", name: "Oman", code: "968" },
            { flag: "🇵🇰", name: "Pakistan", code: "92" }, { flag: "🇵🇸", name: "Palestine", code: "970" },
            { flag: "🇵🇭", name: "Philippines", code: "63" }, { flag: "🇶🇦", name: "Qatar", code: "974" },
            { flag: "🇸🇦", name: "Saudi Arabia", code: "966" }, { flag: "🇸🇬", name: "Singapore", code: "65" },
            { flag: "🇰🇷", name: "South Korea", code: "82" }, { flag: "🇱🇰", name: "Sri Lanka", code: "94" },
            { flag: "🇸🇾", name: "Syria", code: "963" }, { flag: "🇹🇼", name: "Taiwan", code: "886" },
            { flag: "🇹🇯", name: "Tajikistan", code: "992" }, { flag: "🇹🇭", name: "Thailand", code: "66" },
            { flag: "🇹🇱", name: "Timor-Leste", code: "670" }, { flag: "🇹🇷", name: "Turkey", code: "90" },
            { flag: "🇹🇲", name: "Turkmenistan", code: "993" }, { flag: "🇦🇪", name: "United Arab Emirates", code: "971" },
            { flag: "🇺🇿", name: "Uzbekistan", code: "998" }, { flag: "🇻🇳", name: "Vietnam", code: "84" },
            { flag: "🇾🇪", name: "Yemen", code: "967" }
        ]
    },
    {
        id: "europe",
        title: "🇪🇺 Europe",
        countries: [
            { flag: "🇦🇱", name: "Albania", code: "355" }, { flag: "🇦🇩", name: "Andorra", code: "376" },
            { flag: "🇦🇹", name: "Austria", code: "43" }, { flag: "🇧🇾", name: "Belarus", code: "375" },
            { flag: "🇧🇪", name: "Belgium", code: "32" }, { flag: "🇧🇦", name: "Bosnia & Herzegovina", code: "387" },
            { flag: "🇧🇬", name: "Bulgaria", code: "359" }, { flag: "🇭🇷", name: "Croatia", code: "385" },
            { flag: "🇨🇿", name: "Czech Republic", code: "420" }, { flag: "🇩🇰", name: "Denmark", code: "45" },
            { flag: "🇪🇪", name: "Estonia", code: "372" }, { flag: "🇫🇮", name: "Finland", code: "358" },
            { flag: "🇫🇷", name: "France", code: "33" }, { flag: "🇩🇪", name: "Germany", code: "49" },
            { flag: "🇬🇷", name: "Greece", code: "30" }, { flag: "🇭🇺", name: "Hungary", code: "36" },
            { flag: "🇮🇸", name: "Iceland", code: "354" }, { flag: "🇮🇪", name: "Ireland", code: "353" },
            { flag: "🇮🇹", name: "Italy", code: "39" }, { flag: "🇱🇻", name: "Latvia", code: "371" },
            { flag: "🇱🇹", name: "Lithuania", code: "370" }, { flag: "🇱🇺", name: "Luxembourg", code: "352" },
            { flag: "🇲🇹", name: "Malta", code: "356" }, { flag: "🇲🇩", name: "Moldova", code: "373" },
            { flag: "🇲🇨", name: "Monaco", code: "377" }, { flag: "🇲🇪", name: "Montenegro", code: "382" },
            { flag: "🇳🇱", name: "Netherlands", code: "31" }, { flag: "🇲🇰", name: "North Macedonia", code: "389" },
            { flag: "🇳🇴", name: "Norway", code: "47" }, { flag: "🇵🇱", name: "Poland", code: "48" },
            { flag: "🇵🇹", name: "Portugal", code: "351" }, { flag: "🇷🇴", name: "Romania", code: "40" },
            { flag: "🇷🇺", name: "Russia", code: "7" }, { flag: "🇸🇲", name: "San Marino", code: "378" },
            { flag: "🇷🇸", name: "Serbia", code: "381" }, { flag: "🇸🇰", name: "Slovakia", code: "421" },
            { flag: "🇸🇮", name: "Slovenia", code: "386" }, { flag: "🇪🇸", name: "Spain", code: "34" },
            { flag: "🇸🇪", name: "Sweden", code: "46" }, { flag: "🇨🇭", name: "Switzerland", code: "41" },
            { flag: "🇺🇦", name: "Ukraine", code: "380" }, { flag: "🇬🇧", name: "United Kingdom", code: "44" },
            { flag: "🇻🇦", name: "Vatican City", code: "379" }
        ]
    },
    {
        id: "north-america",
        title: "🌎 North America",
        countries: [
            { flag: "🇦🇬", name: "Antigua & Barbuda", code: "1268" }, { flag: "🇧🇸", name: "Bahamas", code: "1242" },
            { flag: "🇧🇧", name: "Barbados", code: "1246" }, { flag: "🇧🇿", name: "Belize", code: "501" },
            { flag: "🇨🇦", name: "Canada", code: "1" }, { flag: "🇨🇷", name: "Costa Rica", code: "506" },
            { flag: "🇨🇺", name: "Cuba", code: "53" }, { flag: "🇩🇲", name: "Dominica", code: "1767" },
            { flag: "🇩🇴", name: "Dominican Republic", code: "1809" }, { flag: "🇸🇻", name: "El Salvador", code: "503" },
            { flag: "🇬🇩", name: "Grenada", code: "1473" }, { flag: "🇬🇹", name: "Guatemala", code: "502" },
            { flag: "🇭🇹", name: "Haiti", code: "509" }, { flag: "🇭🇳", name: "Honduras", code: "504" },
            { flag: "🇯🇲", name: "Jamaica", code: "1876" }, { flag: "🇲🇽", name: "Mexico", code: "52" },
            { flag: "🇳🇮", name: "Nicaragua", code: "505" }, { flag: "🇵🇦", name: "Panama", code: "507" },
            { flag: "🇰🇳", name: "Saint Kitts & Nevis", code: "1869" }, { flag: "🇱🇨", name: "Saint Lucia", code: "1758" },
            { flag: "🇻🇨", name: "St. Vincent & Grenadines", code: "1784" }, { flag: "🇹🇹", name: "Trinidad & Tobago", code: "1868" },
            { flag: "🇺🇸", name: "United States", code: "1" }
        ]
    },
    {
        id: "south-america",
        title: "🌎 South America",
        countries: [
            { flag: "🇦🇷", name: "Argentina", code: "54" }, { flag: "🇧🇴", name: "Bolivia", code: "591" },
            { flag: "🇧🇷", name: "Brazil", code: "55" }, { flag: "🇨🇱", name: "Chile", code: "56" },
            { flag: "🇨🇴", name: "Colombia", code: "57" }, { flag: "🇪🇨", name: "Ecuador", code: "593" },
            { flag: "🇬🇾", name: "Guyana", code: "592" }, { flag: "🇵🇾", name: "Paraguay", code: "595" },
            { flag: "🇵🇪", name: "Peru", code: "51" }, { flag: "🇸🇷", name: "Suriname", code: "597" },
            { flag: "🇺🇾", name: "Uruguay", code: "598" }, { flag: "🇻🇪", name: "Venezuela", code: "58" }
        ]
    },
    {
        id: "africa",
        title: "🌍 Africa",
        countries: [
            { flag: "🇩🇿", name: "Algeria", code: "213" }, { flag: "🇦🇴", name: "Angola", code: "244" },
            { flag: "🇧🇯", name: "Benin", code: "229" }, { flag: "🇧🇼", name: "Botswana", code: "267" },
            { flag: "🇧🇫", name: "Burkina Faso", code: "226" }, { flag: "🇧🇮", name: "Burundi", code: "257" },
            { flag: "🇨🇲", name: "Cameroon", code: "237" }, { flag: "🇨🇻", name: "Cape Verde", code: "238" },
            { flag: "🇨🇫", name: "Central African Republic", code: "236" }, { flag: "🇹🇩", name: "Chad", code: "235" },
            { flag: "🇰🇲", name: "Comoros", code: "269" }, { flag: "🇨🇬", name: "Congo", code: "242" },
            { flag: "🇩🇯", name: "Djibouti", code: "253" }, { flag: "🇪🇬", name: "Egypt", code: "20" },
            { flag: "🇬🇶", name: "Equatorial Guinea", code: "240" }, { flag: "🇪🇷", name: "Eritrea", code: "291" },
            { flag: "🇸🇿", name: "Eswatini", code: "268" }, { flag: "🇪🇹", name: "Ethiopia", code: "251" },
            { flag: "🇬🇦", name: "Gabon", code: "241" }, { flag: "🇬🇲", name: "Gambia", code: "220" },
            { flag: "🇬🇭", name: "Ghana", code: "233" }, { flag: "🇬🇳", name: "Guinea", code: "224" },
            { flag: "🇨🇮", name: "Ivory Coast", code: "225" }, { flag: "🇰🇪", name: "Kenya", code: "254" },
            { flag: "🇱🇸", name: "Lesotho", code: "266" }, { flag: "🇱🇷", name: "Liberia", code: "231" },
            { flag: "🇱🇾", name: "Libya", code: "218" }, { flag: "🇲🇬", name: "Madagascar", code: "261" },
            { flag: "🇲🇼", name: "Malawi", code: "265" }, { flag: "🇲🇱", name: "Mali", code: "223" },
            { flag: "🇲🇷", name: "Mauritania", code: "222" }, { flag: "🇲🇺", name: "Mauritius", code: "230" },
            { flag: "🇲🇦", name: "Morocco", code: "212" }, { flag: "🇲🇿", name: "Mozambique", code: "258" },
            { flag: "🇳🇦", name: "Namibia", code: "264" }, { flag: "🇳🇪", name: "Niger", code: "227" },
            { flag: "🇳🇬", name: "Nigeria", code: "234" }, { flag: "🇷🇼", name: "Rwanda", code: "250" },
            { flag: "🇸🇳", name: "Senegal", code: "221" }, { flag: "🇸🇨", name: "Seychelles", code: "248" },
            { flag: "🇸🇱", name: "Sierra Leone", code: "232" }, { flag: "🇸🇴", name: "Somalia", code: "252" },
            { flag: "🇿🇦", name: "South Africa", code: "27" }, { flag: "🇸🇸", name: "South Sudan", code: "211" },
            { flag: "🇸🇩", name: "Sudan", code: "249" }, { flag: "🇹🇿", name: "Tanzania", code: "255" },
            { flag: "🇹🇬", name: "Togo", code: "228" }, { flag: "🇹🇳", name: "Tunisia", code: "216" },
            { flag: "🇺🇬", name: "Uganda", code: "256" }, { flag: "🇿🇲", name: "Zambia", code: "260" },
            { flag: "🇿🇼", name: "Zimbabwe", code: "263" }
        ]
    },
    {
        id: "oceania",
        title: "🌊 Oceania",
        countries: [
            { flag: "🇦🇺", name: "Australia", code: "61" }, { flag: "🇫🇯", name: "Fiji", code: "679" },
            { flag: "🇰🇮", name: "Kiribati", code: "686" }, { flag: "🇲🇭", name: "Marshall Islands", code: "692" },
            { flag: "🇫🇲", name: "Micronesia", code: "691" }, { flag: "🇳🇷", name: "Nauru", code: "674" },
            { flag: "🇳🇿", name: "New Zealand", code: "64" }, { flag: "🇵🇼", name: "Palau", code: "680" },
            { flag: "🇵🇬", name: "Papua New Guinea", code: "675" }, { flag: "🇼🇸", name: "Samoa", code: "685" },
            { flag: "🇸🇧", name: "Solomon Islands", code: "677" }, { flag: "🇹🇴", name: "Tonga", code: "676" },
            { flag: "🇹🇻", name: "Tuvalu", code: "688" }, { flag: "🇻🇺", name: "Vanuatu", code: "678" }
        ]
    }
];

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
            for (const cont of GLOBAL_CONTINENTS_DATA) {
                const found = cont.countries.find(c => c.name.toLowerCase() === countryName?.toLowerCase());
                if (found) {
                    detectedCountryCode = found.code;
                    break;
                }
            }
        }
    } catch (e) {}

    let html = '';
    GLOBAL_CONTINENTS_DATA.forEach(continent => {
        continent.countries.forEach(c => {
            const isSelected = (c.code === detectedCountryCode) ? 'selected' : '';
            html += `<option value="+${c.code}|10" ${isSelected}>${c.flag} +${c.code}</option>`;
        });
    });
    select.innerHTML = html;
    updatePhoneValidation();
}

function getCountryInfo(phone) {
    const p = String(phone || '').replace(/[\s\-\(\)]/g, '');
    for (const cont of GLOBAL_CONTINENTS_DATA) {
        for (const c of cont.countries) {
            if (p.startsWith('+' + c.code) || p.startsWith(c.code)) {
                return { code: '+' + c.code, name: c.name, flag: c.flag };
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
