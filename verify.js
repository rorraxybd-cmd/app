// verify.js - Strict Phone-Number Centric Single Account Verification
let generatedOtpCode = "", tempVerifyPhone = "", tempVerifyName = "", userDeviceIp = "Unknown";
let isVerifiedSession = localStorage.getItem('message_verified_v18') === 'true';
let selectedCountryData = { flag: "🇧🇩", name: "Bangladesh", code: "880" };
let existingCloudAccount = null;

const GLOBAL_VERIFY_CONTINENTS = [
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
    }
];

let savedProfiles = JSON.parse(localStorage.getItem('message_profiles_v18') || 'null') || [{
    name: "",
    phone: "",
    username: "",
    themeColor: "emerald",
    avatar: ""
}];

function normPhone(p) {
    return String(p || '').replace(/[\s\-\(\)\+]/g, '');
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 4500) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(timer);
        return res;
    } catch (err) {
        clearTimeout(timer);
        throw err;
    }
}

async function populateVerifyCountryDropdown() {
    const container = document.getElementById('vCountrySelectContainer');
    if (!container) return;

    renderCountrySelectorUI();

    try {
        const ipRes = await fetchWithTimeout('https://ipapi.co/json/', {}, 2500);
        if (ipRes.ok) {
            const ipData = await ipRes.json();
            userDeviceIp = ipData.ip || 'Unknown';
            const countryName = ipData.country_name;
            for (const cont of GLOBAL_VERIFY_CONTINENTS) {
                const found = cont.countries.find(c => c.name.toLowerCase() === countryName?.toLowerCase());
                if (found) {
                    selectedCountryData = found;
                    renderCountrySelectorUI();
                    break;
                }
            }
        }
    } catch (e) {}
}

function renderCountrySelectorUI() {
    let parentContainer = document.getElementById('vCountrySelectContainer');
    if (!parentContainer) return;

    let existingWrapper = document.getElementById('customCountrySelectWrapper');
    if (existingWrapper) existingWrapper.remove();

    const wrapper = document.createElement('div');
    wrapper.id = 'customCountrySelectWrapper';
    wrapper.className = 'relative w-full';

    wrapper.innerHTML = `
        <div id="countryDropdownBtn" onclick="toggleCountryDropdownModal()" class="w-full theme-input text-xs px-4 py-3.5 rounded-xl text-amber-300 font-bold flex items-center justify-between cursor-pointer border border-amber-400/20">
            <div class="flex items-center space-x-2.5">
                <span class="text-lg emoji-flag">${selectedCountryData.flag}</span>
                <span class="text-white">${selectedCountryData.name} (+${selectedCountryData.code})</span>
            </div>
            <i class="fa-solid fa-chevron-down text-amber-300 text-xs"></i>
        </div>

        <div id="countryDropdownModal" class="hidden absolute top-full left-0 right-0 mt-2 theme-card border border-amber-400/30 rounded-2xl shadow-2xl z-50 overflow-hidden max-h-72 flex flex-col">
            <div class="p-2.5 border-b border-white/10 bg-black/50 sticky top-0 z-10">
                <input type="text" id="countrySearchBox" placeholder="Search country" oninput="filterCountryList(this.value)" class="w-full theme-input text-xs px-3 py-2 rounded-xl text-white focus:outline-none border border-amber-400/20">
            </div>
            <div id="countryListScrollArea" class="overflow-y-auto p-1.5 space-y-2 flex-1 max-h-60">
                ${generateCountryListHtml()}
            </div>
        </div>
    `;

    parentContainer.appendChild(wrapper);
    updatePhoneValidation();
}

function generateCountryListHtml(searchQuery = '') {
    let html = '';
    const q = searchQuery.toLowerCase().trim();

    GLOBAL_VERIFY_CONTINENTS.forEach(continent => {
        const filtered = continent.countries.filter(c => c.name.toLowerCase().includes(q) || c.code.includes(q));
        if (filtered.length === 0) return;

        html += `<div class="px-2 py-1 text-[10px] font-bold text-amber-400/80 uppercase tracking-wider">${continent.title}</div>`;
        filtered.forEach(c => {
            const isSelected = c.code === selectedCountryData.code && c.name === selectedCountryData.name;
            html += `
                <div onclick="selectCountryItem('${c.flag}', '${c.name.replace(/'/g, "\\'")}', '${c.code}')" class="flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer hover:bg-white/10 transition ${isSelected ? 'bg-amber-400/20 text-amber-300 font-bold' : 'text-white font-medium'}">
                    <div class="flex items-center space-x-2.5">
                        <span class="text-base emoji-flag">${c.flag}</span>
                        <span class="text-xs">${c.name}</span>
                    </div>
                    <span class="text-xs text-amber-300 font-bold">+${c.code}</span>
                </div>
            `;
        });
    });
    return html;
}

function toggleCountryDropdownModal() {
    const modal = document.getElementById('countryDropdownModal');
    if (!modal) return;
    if (modal.classList.contains('hidden')) {
        modal.classList.remove('hidden');
        document.getElementById('countrySearchBox')?.focus();
    } else {
        modal.classList.add('hidden');
    }
}

function filterCountryList(val) {
    const scrollArea = document.getElementById('countryListScrollArea');
    if (scrollArea) scrollArea.innerHTML = generateCountryListHtml(val);
}

function selectCountryItem(flag, name, code) {
    selectedCountryData = { flag, name, code };
    document.getElementById('countryDropdownModal')?.classList.add('hidden');
    renderCountrySelectorUI();
}

window.addEventListener('click', (e) => {
    const wrapper = document.getElementById('customCountrySelectWrapper');
    if (wrapper && !wrapper.contains(e.target)) {
        document.getElementById('countryDropdownModal')?.classList.add('hidden');
    }
});

if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', populateVerifyCountryDropdown);
} else {
    populateVerifyCountryDropdown();
}

function getCountryInfo(phone) {
    const p = normPhone(phone);
    for (const cont of GLOBAL_VERIFY_CONTINENTS) {
        for (const c of cont.countries) {
            if (p.startsWith(c.code)) {
                return { code: '+' + c.code, name: c.name, flag: c.flag };
            }
        }
    }
    return { code: 'OTHER', name: 'Global', flag: '🌐' };
}

function getActiveProfile() { return savedProfiles[0]; }
function saveProfiles() { localStorage.setItem('message_profiles_v18', JSON.stringify(savedProfiles)); }

function updatePhoneValidation() {
    const phoneInput = document.getElementById('vPhoneInput');
    if (!phoneInput) return;
    phoneInput.placeholder = selectedCountryData.code === '880' ? "1700000000" : "Enter phone number";
}

window.submitVerifyStep1 = async function() {
    const nameInput = document.getElementById('vFullName');
    const phoneInput = document.getElementById('vPhoneInput');
    const btn = document.getElementById('btnStep1Continue') || document.querySelector('#verifyStep1 button');

    const name = nameInput ? nameInput.value.trim() : '';
    let rawPhone = phoneInput ? phoneInput.value.trim().replace(/^0+/, '') : '';

    if (!name) {
        if (typeof showToast === 'function') showToast("Please enter your full name", true);
        else alert("Please enter your full name");
        nameInput?.focus();
        return;
    }
    if (!rawPhone || rawPhone.length < 5) {
        if (typeof showToast === 'function') showToast("Please enter a valid phone number", true);
        else alert("Please enter a valid phone number");
        phoneInput?.focus();
        return;
    }

    if (btn) {
        btn.disabled = true;
        btn.style.opacity = '0.7';
    }

    tempVerifyName = name;
    tempVerifyPhone = normPhone(selectedCountryData.code + rawPhone);
    generatedOtpCode = Math.floor(100000 + Math.random() * 900000).toString();
    existingCloudAccount = null;

    try {
        sessionStorage.setItem('temp_verify_name', tempVerifyName);
        sessionStorage.setItem('temp_verify_phone', tempVerifyPhone);
    } catch (e) {}

    try {
        const res = await fetchWithTimeout('/api/chat?action=send_magic_link', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                display_name: tempVerifyName,
                phone: tempVerifyPhone,
                magic_code: generatedOtpCode,
                ip: userDeviceIp
            })
        }, 5000);

        if (res.ok) {
            const data = await res.json();
            if (data.user) {
                existingCloudAccount = data.user;
                if (data.already_exists && typeof showToast === 'function') {
                    showToast("Existing profile restored from cloud!");
                }
            }
        }
    } catch (e) {}

    if (btn) {
        btn.disabled = false;
        btn.style.opacity = '1';
    }

    const step1El = document.getElementById('verifyStep1');
    const step2El = document.getElementById('verifyStep2');

    if (step1El) {
        step1El.style.display = 'none';
        step1El.classList.add('hidden');
    }
    if (step2El) {
        step2El.style.display = 'block';
        step2El.classList.remove('hidden');
    }

    const otpInput = document.getElementById('vOtpInput');
    if (otpInput) {
        otpInput.value = generatedOtpCode;
    }
};

window.submitVerifyStep2 = async function() {
    const otpEl = document.getElementById('vOtpInput');
    const entered = otpEl ? otpEl.value.trim() : '';

    if (!entered || entered.length < 4) {
        if (typeof showToast === 'function') showToast("Please enter the verification code", true);
        else alert("Please enter the verification code");
        return;
    }

    if (!tempVerifyPhone) {
        tempVerifyPhone = sessionStorage.getItem('temp_verify_phone') || '';
    }
    if (!tempVerifyPhone) {
        const rawPhone = (document.getElementById('vPhoneInput')?.value || '').trim().replace(/^0+/, '');
        tempVerifyPhone = normPhone(selectedCountryData.code + (rawPhone || "1700000000"));
    }

    if (!tempVerifyName) {
        tempVerifyName = sessionStorage.getItem('temp_verify_name') || '';
    }
    if (!tempVerifyName) {
        tempVerifyName = (document.getElementById('vFullName')?.value || '').trim() || "User";
    }

    const cleanVerifyPhone = normPhone(tempVerifyPhone);

    // ক্লাউড থেকে পার্মানেন্ট অ্যাকাউন্ট ফেচ করা
    if (!existingCloudAccount) {
        try {
            const checkRes = await fetchWithTimeout(`/api/chat?action=get_user_profile&phone=${cleanVerifyPhone}&_t=${Date.now()}`, {}, 3500);
            if (checkRes.ok) {
                const checkData = await checkRes.json();
                if (checkData.user) existingCloudAccount = checkData.user;
            }
        } catch (e) {}
    }

    const cloudUser = existingCloudAccount;
    // যদি ডাটাবেজে অলরেডি নাম থাকে, তবে সেটাই প্রাধান্য পাবে, নতুন ভুল নাম দিয়ে ওভাররাইট হবে না
    const finalName = (cloudUser?.display_name && cloudUser.display_name !== 'User') ? cloudUser.display_name : (tempVerifyName || "User");
    const finalUsername = cloudUser?.username || ('user_' + cleanVerifyPhone);
    const finalAvatar = cloudUser?.avatar_url || "";

    localStorage.setItem('message_verified_v18', 'true');

    savedProfiles[0] = {
        name: finalName,
        phone: cleanVerifyPhone,
        username: finalUsername,
        themeColor: "emerald",
        avatar: finalAvatar
    };
    saveProfiles();

    try {
        await fetchWithTimeout('/api/chat?action=register_or_update_user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                phone: cleanVerifyPhone,
                name: finalName,
                username: finalUsername,
                avatar: finalAvatar,
                is_edit: false
            })
        }, 4000);
    } catch (e) {}

    const overlay = document.getElementById('verifyOverlay');
    if (overlay) {
        overlay.style.display = 'none';
        overlay.remove();
    }

    if (typeof initAppAfterVerification === 'function') {
        initAppAfterVerification();
    } else if (typeof switchTab === 'function') {
        switchTab('contact');
    } else {
        window.location.reload();
    }
};
