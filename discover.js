// discover.js - Global Directory, Contacts & Smart Local Caching Module
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

let selectedDiscoverCountry = null;

function normPhone(p) { return String(p || '').replace(/[\s\-\(\)\+]/g, ''); }

function renderAvatarBadge(name, avatarUrl, sizeClass = "w-10 h-10 text-sm") {
    const initial = (name || 'U').trim().charAt(0).toUpperCase();
    if (avatarUrl && avatarUrl.trim() !== '') {
        return `<img src="${avatarUrl}" class="${sizeClass} rounded-full object-cover bg-black shrink-0">`;
    }
    return `<div class="${sizeClass} rounded-full gold-btn flex items-center justify-center font-extrabold text-[#030305] shrink-0">${initial}</div>`;
}

function openChat(phone, name, avatar = '') {
    const cleanTargetPhone = normPhone(phone);
    const recipient = { phone: cleanTargetPhone, name, avatar };
    window.currentActiveRecipient = recipient;

    const workspace = document.getElementById('workspaceSection');
    if (workspace) {
        workspace.classList.remove('hidden');
        if (window.innerWidth < 768) {
            workspace.className = "fixed inset-0 z-40 flex flex-col bg-[#030305] h-[100dvh]";
        } else {
            workspace.style.display = 'flex';
            workspace.classList.add('flex-col');
        }
    }

    const chatHeader = document.getElementById('activeChatHeader');
    if (chatHeader) {
        chatHeader.classList.remove('hidden');
        chatHeader.style.display = 'flex';

        const existingActions = document.getElementById('headerWhatsAppCallActions');
        if (existingActions) existingActions.remove();

        const callActions = document.createElement('div');
        callActions.id = 'headerWhatsAppCallActions';
        callActions.className = 'flex items-center space-x-2 ml-auto shrink-0';
        callActions.innerHTML = `
            <button onclick="startWhatsAppCall('audio')" class="text-amber-300 hover:text-white p-2 cursor-pointer transition" title="Audio Call">
                <i class="fa-solid fa-phone text-sm"></i>
            </button>
            <button onclick="startWhatsAppCall('video')" class="text-amber-300 hover:text-white p-2 cursor-pointer transition" title="Video Call">
                <i class="fa-solid fa-video text-sm"></i>
            </button>
            <button onclick="deleteAllChatMessages()" class="text-red-400 hover:text-white p-2 cursor-pointer transition" title="Delete All Messages">
                <i class="fa-solid fa-trash-can text-sm"></i>
            </button>
        `;
        chatHeader.appendChild(callActions);
    }

    const chatInput = document.getElementById('chatInputBar');
    if (chatInput) { chatInput.classList.remove('hidden'); chatInput.style.display = 'flex'; }

    const titleEl = document.getElementById('activeChatTitle');
    if (titleEl) titleEl.innerText = name;

    const avatarEl = document.getElementById('activeChatAvatar');
    if (avatarEl) {
        avatarEl.src = (avatar && avatar.trim() !== '') ? avatar : 'https://pub-508ef1e45bab487aadde85a1dba202c4.r2.dev/im1024.jpg';
        avatarEl.style.display = 'block';
    }

    if (typeof loadMessages === 'function') loadMessages();
    if (typeof fetchMessagesFromCloud === 'function') fetchMessagesFromCloud();
    if (typeof startChatPolling === 'function') startChatPolling();

    if (window.innerWidth < 768) {
        document.getElementById('sidebarSection')?.classList.add('hidden');
        document.getElementById('bottomNavBar')?.classList.add('hidden');
    }
}

function renderDiscoverDirectory(searchQuery = '') {
    const listContainer = document.getElementById('sidebarContentList');
    if (!listContainer) return;

    if (selectedDiscoverCountry) {
        renderCountryContactsView(selectedDiscoverCountry);
        return;
    }

    const q = searchQuery.toLowerCase().trim();
    // লোকাল স্টোরেজ থেকে ক্যাশ করা কন্টাক্ট ডেটা ব্যবহার করা হচ্ছে (ফ্রি কোটা সুরক্ষিত রাখতে)
    const allUsers = Array.isArray(window.GLOBAL_CLOUD_USERS) ? window.GLOBAL_CLOUD_USERS : JSON.parse(localStorage.getItem('message_contacts_v18') || '[]');

    let html = `
        <div class="p-3 space-y-3">
            <div class="flex items-center space-x-2 theme-input px-3.5 py-2.5 rounded-2xl">
                <input type="text" id="discoverCountrySearch" placeholder="Search country..." value="${searchQuery}" class="w-full bg-transparent text-xs focus:outline-none text-white placeholder-gray-500" oninput="renderDiscoverDirectory(this.value)">
                <i class="fa-solid fa-magnifying-glass text-amber-300 text-xs"></i>
            </div>
            <div class="p-4 rounded-2xl text-center theme-card">
                <h2 class="text-xs font-bold gold-gradient-text uppercase tracking-wider">Global Network Directory</h2>
                <p class="text-[10px] text-gray-400 mt-1">Total Active Global Members: <span class="text-amber-300 font-bold">${allUsers.length}</span></p>
            </div>
    `;

    GLOBAL_CONTINENTS_DATA.forEach(continent => {
        const filteredCountries = continent.countries.filter(c => c.name.toLowerCase().includes(q));
        if (filteredCountries.length === 0) return;

        html += `
            <div class="rounded-2xl p-3 theme-card space-y-2">
                <div class="text-xs font-bold gold-gradient-text pb-1.5">${continent.title}</div>
                <div class="grid grid-cols-2 gap-2">
        `;

        filteredCountries.forEach(country => {
            const countryUsers = allUsers.filter(u => {
                const info = typeof getCountryInfo === 'function' ? getCountryInfo(u.phone) : { name: '' };
                return (info.name && info.name.toLowerCase() === country.name.toLowerCase()) || normPhone(u.phone).startsWith(country.code);
            });

            const count = countryUsers.length;
            const badgeText = count > 0 ? `${count} Active` : `+${country.code}`;

            html += `
                <div class="p-3 rounded-2xl cursor-pointer flex flex-col items-center text-center bg-white/5 hover:bg-white/10 transition" onclick="openDiscoverCountry('${country.flag}', '${country.name.replace(/'/g, "\\'")}', '${country.code}')">
                    <span class="text-2xl emoji-flag">${country.flag}</span>
                    <span class="text-xs font-bold text-white mt-1 truncate w-full">${country.name}</span>
                    <span class="text-[9px] px-2 py-0.5 rounded-full mt-1 bg-amber-400/10 text-amber-300 font-semibold">${badgeText}</span>
                </div>
            `;
        });

        html += `</div></div>`;
    });

    html += `</div>`;
    listContainer.innerHTML = html;
}

function openDiscoverCountry(flag, countryName, dialCode) {
    selectedDiscoverCountry = { flag, name: countryName, code: dialCode };
    renderCountryContactsView(selectedDiscoverCountry);
}

function backToDiscoverContinents() {
    selectedDiscoverCountry = null;
    renderDiscoverDirectory();
}

function renderCountryContactsView(countryObj, searchQuery = '') {
    const listContainer = document.getElementById('sidebarContentList');
    if (!listContainer) return;

    const allUsers = Array.isArray(window.GLOBAL_CLOUD_USERS) ? window.GLOBAL_CLOUD_USERS : JSON.parse(localStorage.getItem('message_contacts_v18') || '[]');

    const matchedUsers = allUsers.filter(u => {
        const info = typeof getCountryInfo === 'function' ? getCountryInfo(u.phone) : { name: '' };
        const isMatchCountry = (info.name && info.name.toLowerCase() === countryObj.name.toLowerCase()) || normPhone(u.phone).startsWith(countryObj.code);
        const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) || String(u.username || '').toLowerCase().includes(searchQuery.toLowerCase());
        return isMatchCountry && matchesSearch;
    });

    let usersHtml = matchedUsers.length === 0 ? `
        <div class="flex flex-col items-center justify-center p-8 text-center space-y-3 theme-card rounded-2xl mt-2">
            <span class="text-4xl emoji-flag">${countryObj.flag}</span>
            <p class="text-xs font-bold gold-gradient-text">No members found in ${countryObj.name}</p>
        </div>
    ` : matchedUsers.map(c => {
        const isOnline = c.isOnline === true || c.isOnline === 1;
        const statusColor = isOnline ? 'bg-[#2ed573]' : 'bg-transparent';
        const avatarHtml = renderAvatarBadge(c.name, c.avatar, "w-10 h-10 text-sm");
        const safeName = c.name.replace(/'/g, "\\'");
        return `
        <div class="flex justify-between items-center px-4 py-3 my-1.5 hover:bg-white/5 rounded-2xl theme-card cursor-pointer" onclick="openChat('${c.phone}', '${safeName}', '${c.avatar || ''}')">
            <div class="flex items-center space-x-3 flex-1 min-w-0">
                <div class="relative shrink-0">
                    ${avatarHtml}
                    ${isOnline ? `<span class="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-black ${statusColor}"></span>` : ''}
                </div>
                <div class="min-w-0 flex-1 pr-2">
                    <div class="flex items-center space-x-1.5">
                        <span class="text-xs font-semibold gold-gradient-text truncate">${c.name}</span>
                        <span class="text-sm emoji-flag shrink-0">${countryObj.flag}</span>
                    </div>
                    <p class="text-[10px] text-gray-400 truncate">@${c.username || 'user'}</p>
                </div>
            </div>
            <div class="flex items-center space-x-2 shrink-0 pl-1">
                <button onclick="event.stopPropagation(); openChat('${c.phone}', '${safeName}', '${c.avatar || ''}')" class="p-2 text-amber-300 hover:text-white cursor-pointer" title="Message"><i class="fa-solid fa-message text-xs"></i></button>
                <button onclick="event.stopPropagation(); openChat('${c.phone}', '${safeName}', '${c.avatar || ''}'); startWhatsAppCall('audio')" class="p-2 text-amber-300 hover:text-white cursor-pointer" title="Call"><i class="fa-solid fa-phone text-xs"></i></button>
            </div>
        </div>`;
    }).join('');

    listContainer.innerHTML = `
        <div class="pb-16 p-3 space-y-3">
            <button onclick="backToDiscoverContinents()" class="flex items-center space-x-2 text-xs font-bold text-amber-300 px-3 py-1.5 rounded-2xl bg-amber-400/10 cursor-pointer">
                <i class="fa-solid fa-arrow-left"></i> <span>All Countries</span>
            </button>
            <div class="flex items-center justify-between px-3 py-2.5 rounded-2xl theme-card">
                <div class="flex items-center space-x-2.5">
                    <span class="text-2xl emoji-flag">${countryObj.flag}</span>
                    <div>
                        <h3 class="text-xs font-bold gold-gradient-text">${countryObj.name}</h3>
                        <p class="text-[9px] text-gray-400">Direct cross-border connection</p>
                    </div>
                </div>
                <span class="text-[10px] font-bold text-amber-300 px-2.5 py-1 rounded-full bg-amber-400/10">${matchedUsers.length} Contacts</span>
            </div>
            ${usersHtml}
        </div>
    `;
}

function renderContactsView(searchQuery = '') {
    const listContainer = document.getElementById('sidebarContentList');
    if (!listContainer) return;

    // লোকাল স্টোরেজ থেকে ইনস্ট্যান্ট লোড হবে (নো রিকোয়েস্ট ল্যাগ)
    const allUsers = Array.isArray(window.GLOBAL_CLOUD_USERS) ? window.GLOBAL_CLOUD_USERS : JSON.parse(localStorage.getItem('message_contacts_v18') || '[]');
    const q = searchQuery.toLowerCase().trim();

    const filteredContacts = allUsers.filter(c =>
        c.name.toLowerCase().includes(q) ||
        String(c.username || '').toLowerCase().includes(q) ||
        normPhone(c.phone).includes(q)
    );

    let contactsHtml = filteredContacts.length === 0 ? `
        <div class="flex flex-col items-center justify-center p-8 text-center space-y-3 theme-card rounded-2xl mt-4">
            <i class="fa-solid fa-address-book text-3xl text-amber-300"></i>
            <p class="text-xs font-bold gold-gradient-text">No contacts found</p>
        </div>
    ` : filteredContacts.map(c => {
        const isOnline = c.isOnline === true || c.isOnline === 1;
        const statusColor = isOnline ? 'bg-[#2ed573]' : 'bg-transparent';
        const countryInfo = typeof getCountryInfo === 'function' ? getCountryInfo(c.phone) : { flag: '🌐' };
        const avatarHtml = renderAvatarBadge(c.name, c.avatar, "w-10 h-10 text-sm");
        const safeName = c.name.replace(/'/g, "\\'");

        return `
        <div class="flex justify-between items-center px-4 py-3 my-1.5 hover:bg-white/5 rounded-2xl theme-card cursor-pointer" onclick="openChat('${c.phone}', '${safeName}', '${c.avatar || ''}')">
            <div class="flex items-center space-x-3 flex-1 min-w-0">
                <div class="relative shrink-0">
                    ${avatarHtml}
                    ${isOnline ? `<span class="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-black ${statusColor}"></span>` : ''}
                </div>
                <div class="min-w-0 flex-1 pr-2">
                    <div class="flex items-center space-x-1.5">
                        <span class="text-xs font-semibold gold-gradient-text truncate">${c.name}</span>
                        <span class="text-sm emoji-flag shrink-0">${countryInfo.flag}</span>
                    </div>
                    <p class="text-[10px] text-gray-400 truncate">@${c.username || 'user'}</p>
                </div>
            </div>
            <div class="flex items-center space-x-2 shrink-0">
                <button onclick="event.stopPropagation(); openChat('${c.phone}', '${safeName}', '${c.avatar || ''}')" class="p-2 text-amber-300 hover:text-white cursor-pointer" title="Message"><i class="fa-solid fa-message text-xs"></i></button>
                <button onclick="event.stopPropagation(); openChat('${c.phone}', '${safeName}', '${c.avatar || ''}'); startWhatsAppCall('audio')" class="p-2 text-amber-300 hover:text-white cursor-pointer" title="Call"><i class="fa-solid fa-phone text-xs"></i></button>
            </div>
        </div>`;
    }).join('');

    listContainer.innerHTML = `
        <div class="pb-20 p-3 space-y-3">
            <div class="flex items-center justify-between px-1">
                <h3 class="text-xs font-bold gold-gradient-text uppercase tracking-wider">Contacts Directory (${filteredContacts.length})</h3>
            </div>
            <div class="flex items-center space-x-2 theme-input px-3.5 py-2.5 rounded-2xl">
                <input type="text" id="contactSearchInput" placeholder="Search by name, username or phone..." value="${searchQuery}" class="w-full bg-transparent text-xs focus:outline-none text-white placeholder-gray-500" oninput="renderContactsView(this.value)">
                <i class="fa-solid fa-magnifying-glass text-amber-300 text-xs"></i>
            </div>
            ${contactsHtml}
        </div>
    `;
}

function compressAvatarImage(file, maxSize = 180, quality = 0.72) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(event) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxSize) {
                        height *= maxSize / width;
                        width = maxSize;
                    }
                } else {
                    if (height > maxSize) {
                        width *= maxSize / height;
                        height = maxSize;
                    }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.onerror = reject;
            img.src = event.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

async function handleProfileLogoUpload(input) {
    const file = input.files && input.files[0];
    if (!file) return;

    try {
        const compressedBase64 = await compressAvatarImage(file, 180, 0.72);
        let profiles = JSON.parse(localStorage.getItem('message_profiles_v18') || '[{}]');
        profiles[0].avatar = compressedBase64;
        localStorage.setItem('message_profiles_v18', JSON.stringify(profiles));
        if (typeof savedProfiles !== 'undefined') savedProfiles[0].avatar = compressedBase64;

        renderProfileView(false);

        const res = await fetch('/api/chat?action=register_or_update_user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...profiles[0], avatar: compressedBase64, is_edit: true })
        });
        if (res.ok) {
            if (typeof fetchCloudContacts === 'function') await fetchCloudContacts();
            if (typeof showToast === 'function') showToast("Profile photo synced to cloud!");
        }
    } catch (err) {
        if (typeof showToast === 'function') showToast("Failed to upload photo", true);
    }
}

function renderProfileView(isEditing = false) {
    const listContainer = document.getElementById('sidebarContentList');
    if (!listContainer) return;

    let profiles = JSON.parse(localStorage.getItem('message_profiles_v18') || '[{}]');
    let profile = profiles[0] || {};
    const displayName = profile.name || 'User';
    const username = profile.username || ('user_' + normPhone(profile.phone));
    const avatarUrl = profile.avatar || '';
    const avatarHtml = renderAvatarBadge(displayName, avatarUrl, "w-24 h-24 text-3xl mx-auto");

    if (!isEditing) {
        listContainer.innerHTML = `
            <div class="p-4 space-y-4 pb-20">
                <div class="flex items-center justify-between">
                    <h3 class="text-xs font-bold gold-gradient-text uppercase tracking-wider">Settings & Profile</h3>
                    <button onclick="renderProfileView(true)" class="px-3 py-1.5 rounded-xl gold-btn text-[10px] font-extrabold cursor-pointer">
                        <i class="fa-solid fa-pen text-xs"></i> Edit Profile
                    </button>
                </div>
                <div class="theme-card p-6 rounded-3xl text-center space-y-4">
                    <div class="relative w-24 h-24 mx-auto">
                        ${avatarHtml}
                        <label class="absolute bottom-0 right-0 w-8 h-8 rounded-full gold-btn flex items-center justify-center cursor-pointer shadow-md" title="Upload Photo">
                            <i class="fa-solid fa-camera text-xs text-[#030305]"></i>
                            <input type="file" accept="image/*" class="hidden" onchange="handleProfileLogoUpload(this)">
                        </label>
                    </div>
                    <div>
                        <h2 class="text-base font-bold gold-gradient-text">${displayName}</h2>
                        <p class="text-xs text-gray-400 mt-0.5">@${username}</p>
                        <p class="text-[10px] text-amber-300/70 mt-1">+${normPhone(profile.phone)}</p>
                    </div>
                    <button onclick="shareMyProfile('${username}')" class="w-full py-3.5 rounded-2xl gold-btn text-xs font-extrabold cursor-pointer flex items-center justify-center space-x-2 mt-2">
                        <i class="fa-solid fa-share-nodes text-xs"></i> <span>Share Profile</span>
                    </button>
                </div>
            </div>
        `;
    } else {
        listContainer.innerHTML = `
            <div class="p-4 space-y-4 pb-20">
                <div class="flex items-center justify-between">
                    <h3 class="text-xs font-bold gold-gradient-text uppercase tracking-wider">Edit Profile</h3>
                    <button onclick="renderProfileView(false)" class="text-gray-400 hover:text-white text-xs cursor-pointer">Cancel</button>
                </div>
                <div class="theme-card p-5 rounded-3xl space-y-4">
                    <div class="relative w-24 h-24 mx-auto">
                        ${avatarHtml}
                        <label class="absolute bottom-0 right-0 w-8 h-8 rounded-full gold-btn flex items-center justify-center cursor-pointer shadow-md" title="Upload Photo">
                            <i class="fa-solid fa-camera text-xs text-[#030305]"></i>
                            <input type="file" accept="image/*" class="hidden" onchange="handleProfileLogoUpload(this)">
                        </label>
                    </div>
                    <div class="space-y-1">
                        <label class="text-[10px] font-bold text-amber-300 uppercase">Full Name</label>
                        <input type="text" id="editNameInput" value="${displayName}" class="w-full theme-input text-xs px-3.5 py-3 rounded-2xl text-white focus:outline-none">
                    </div>
                    <div class="space-y-1">
                        <label class="text-[10px] font-bold text-amber-300 uppercase">Username</label>
                        <input type="text" id="editUsernameInput" value="${username}" class="w-full theme-input text-xs px-3.5 py-3 rounded-2xl text-white focus:outline-none">
                    </div>
                    <button onclick="saveProfileChanges()" class="w-full py-3.5 gold-btn text-xs font-extrabold rounded-2xl cursor-pointer uppercase tracking-wider mt-2">
                        Save Changes
                    </button>
                </div>
            </div>
        `;
    }
}

async function saveProfileChanges() {
    const name = document.getElementById('editNameInput')?.value.trim();
    const username = document.getElementById('editUsernameInput')?.value.trim().replace(/^@+/, '');

    if (!name || !username) {
        if (typeof showToast === 'function') showToast("Name and username cannot be empty", true);
        return;
    }

    let profiles = JSON.parse(localStorage.getItem('message_profiles_v18') || '[{}]');
    profiles[0].name = name;
    profiles[0].username = username;
    localStorage.setItem('message_profiles_v18', JSON.stringify(profiles));
    if (typeof savedProfiles !== 'undefined') {
        savedProfiles[0].name = name;
        savedProfiles[0].username = username;
    }

    renderProfileView(false);

    try {
        const res = await fetch('/api/chat?action=register_or_update_user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...profiles[0], is_edit: true })
        });
        if (res.ok) {
            if (typeof fetchCloudContacts === 'function') await fetchCloudContacts();
            if (typeof showToast === 'function') showToast("Profile updated & synced globally!");
        }
    } catch (e) {}
}

function shareMyProfile(username) {
    const cleanUser = String(username || '').replace(/^@+/, '');
    const shareUrl = `https://chat.rorraxy.com/${cleanUser}`;
    if (navigator.share) {
        navigator.share({ url: shareUrl }).catch(() => {});
    } else {
        navigator.clipboard.writeText(shareUrl);
        if (typeof showToast === 'function') showToast("Profile link copied!");
    }
}
