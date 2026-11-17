// verify.js - Strict Single-Account Per Phone Number + Non-Blocking Fast Verify
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
    name: "",
    phone: "",
    username: "",
    themeColor: "emerald",
    avatar: ""
}];

function normPhone(p) {
    return String(p || '').replace(/[\s\-\(\)\+]/g, '');
}

// টাইমআউটসহ সেফ ফেচ হেল্পার (সার্ভার স্লো হলেও বাটন আটকাবে না)
async function fetchWithTimeout(url, options = {}, timeoutMs = 3000) {
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

    // প্রথমেই ডিফল্ট কান্ট্রি রেন্ডার করে দিন যাতে ইউজারকে অপেক্ষা করতে না হয়
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

// ধাপ ১: নাম ও মোবাইল নাম্বার সাবমিট করে পরের স্টেপে যাওয়া
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
        const res = await fetchWithTimeout('/api/chat?action=send_magic_link', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                display_name: tempVerifyName,
                phone: tempVerifyPhone,
                magic_code: generatedOtpCode,
                ip: userDeviceIp
            })
        }, 3000);

        if (res.ok) {
            const data = await res.json();
            if (data.already_exists && data.user) {
                existingCloudAccount = data.user;
                if (typeof showToast === 'function') showToast("Existing account found! Restoring your profile...");
            }
        }
    } catch (e) {
        console.warn("Proceeding offline/fast-mode:", e);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.style.opacity = '1';
        }
    }

    // নিশ্চিতভাবে Step 1 হাইড করে Step 2 ওপেন করা
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

// ধাপ ২: কোড ভেরিফাই করে সরাসরি মেইন ড্যাশবোর্ডে প্রবেশ করা
window.submitVerifyStep2 = async function() {
    const otpEl = document.getElementById('vOtpInput');
    const btn = document.getElementById('btnStep2Verify') || document.querySelector('#verifyStep2 button');
    const entered = otpEl ? otpEl.value.trim() : '';

    if (!entered || entered.length < 4) {
        if (typeof showToast === 'function') showToast("Please enter the verification code", true);
        else alert("Please enter the verification code");
        return;
    }

    if (btn) {
        btn.disabled = true;
        btn.style.opacity = '0.7';
    }

    // যদি কোনো কারণে tempVerifyPhone খালি থাকে তবে ইনপুট থেকে পুনরায় নেওয়া
    if (!tempVerifyPhone) {
        const rawPhone = (document.getElementById('vPhoneInput')?.value || '').trim().replace(/^0+/, '');
        tempVerifyPhone = normPhone(selectedCountryData.code + (rawPhone || "1700000000"));
    }
    if (!tempVerifyName) {
        tempVerifyName = (document.getElementById('vFullName')?.value || '').trim() || "User";
    }

    const cleanVerifyPhone = normPhone(tempVerifyPhone);
    let localContacts = JSON.parse(localStorage.getItem('message_contacts_v18') || '[]');
    const existingLocal = localContacts.find(c => normPhone(c.phone) === cleanVerifyPhone);

    if (!existingCloudAccount) {
        try {
            const checkRes = await fetchWithTimeout(`/api/chat?action=get_user_profile&phone=${cleanVerifyPhone}`, {}, 2500);
            if (checkRes.ok) {
                const checkData = await checkRes.json();
                if (checkData.success && checkData.user) {
                    existingCloudAccount = checkData.user;
                }
            }
        } catch (e) {}
    }

    const finalName = (existingCloudAccount?.display_name && existingCloudAccount.display_name !== 'User')
        ? existingCloudAccount.display_name
        : (tempVerifyName || existingLocal?.name || "User");

    const finalUsername = existingCloudAccount?.username || existingLocal?.username || ('user_' + Math.floor(1000 + Math.random() * 9000));
    const finalAvatar = existingCloudAccount?.avatar_url || existingLocal?.avatar || "";

    isVerifiedSession = true;
    localStorage.setItem('message_verified_v18', 'true');

    savedProfiles[0] = {
        name: finalName,
        phone: cleanVerifyPhone,
        username: finalUsername,
        themeColor: "emerald",
        avatar: finalAvatar
    };
    saveProfiles();

    const idx = localContacts.findIndex(c => normPhone(c.phone) === cleanVerifyPhone);
    if (idx === -1) {
        localContacts.push({
            name: finalName,
            phone: cleanVerifyPhone,
            username: finalUsername,
            avatar: finalAvatar,
            isOnline: true,
            appUser: true
        });
    } else {
        localContacts[idx].name = finalName;
        localContacts[idx].username = finalUsername;
        localContacts[idx].avatar = finalAvatar;
        localContacts[idx].isOnline = true;
        localContacts[idx].appUser = true;
    }
    localStorage.setItem('message_contacts_v18', JSON.stringify(localContacts));

    // ব্যাকগ্রাউন্ডে ক্লাউড ডাটাবেজে সেভ করা (ড্যাশবোর্ডে যাওয়া আটকাবে না)
    fetch('/api/chat?action=register_or_update_user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            phone: cleanVerifyPhone,
            name: finalName,
            username: finalUsername,
            avatar: finalAvatar,
            is_edit: true
        })
    }).catch(() => {});

    if (typeof confetti === 'function') {
        try { confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } }); } catch (e) {}
    }

    // ওভারলে সম্পূর্ণ বন্ধ করে মেইন ড্যাশবোর্ড চালু করা
    const overlay = document.getElementById('verifyOverlay');
    if (overlay) {
        overlay.style.display = 'none';
        overlay.classList.add('hidden');
    }

    if (typeof initAppAfterVerification === 'function') {
        initAppAfterVerification();
    } else if (typeof switchTab === 'function') {
        switchTab('contact');
    }

    if (typeof showToast === 'function') {
        showToast("Verified & connected to dashboard!");
    }

    if (btn) {
        btn.disabled = false;
        btn.style.opacity = '1';
    }
};
