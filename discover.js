// discover.js - Global Directory & Contacts Sync Module (Fixed Chat Input Bar)
const GLOBAL_CONTINENTS_DATA = [
    {
        id: "asia",
        title: "🌏 Asia (49 Countries)",
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
        title: "🇪🇺 Europe (43 Countries)",
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
        title: "🌎 North America (23 Countries)",
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
        title: "🌎 South America (12 Countries)",
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
        title: "🌍 Africa (51 Countries)",
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
        title: "🌊 Oceania (14 Countries)",
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

function openChat(phone, name, avatar = '') {
    const recipient = { phone, name, avatar };
    window.currentActiveRecipient = recipient;

    const tabs = ['Profile', 'Discover', 'Contact', 'Chat', 'Calls'];
    tabs.forEach(t => {
        const icon = document.getElementById('icon' + t);
        const label = document.getElementById('label' + t);
        if (icon) {
            icon.classList.remove('text-[#EC4899]');
            icon.classList.add('text-amber-300');
            icon.style.stroke = '#F5D061';
        }
        if (label) {
            label.classList.remove('pink-gradient-text', 'font-bold');
            label.classList.add('gold-gradient-text', 'font-semibold');
        }
    });

    const activeIcon = document.getElementById('iconChat');
    const activeLabel = document.getElementById('labelChat');
    if (activeIcon) {
        activeIcon.classList.remove('text-amber-300');
        activeIcon.classList.add('text-[#EC4899]');
        activeIcon.style.stroke = '#EC4899';
    }
    if (activeLabel) {
        activeLabel.classList.remove('gold-gradient-text', 'font-semibold');
        activeLabel.classList.add('pink-gradient-text', 'font-bold');
    }

    const workspace = document.getElementById('workspaceSection');
    if (workspace) {
        workspace.classList.remove('hidden');
        workspace.style.display = 'flex';
    }

    // Fixed: removed 'hidden' class from chatHeader and chatInputBar so they show up properly
    const chatHeader = document.getElementById('activeChatHeader');
    if (chatHeader) {
        chatHeader.classList.remove('hidden');
        chatHeader.style.display = 'flex';
    }

    const chatInput = document.getElementById('chatInputBar');
    if (chatInput) {
        chatInput.classList.remove('hidden');
        chatInput.style.display = 'flex';
    }

    const titleEl = document.getElementById('activeChatTitle');
    if (titleEl) titleEl.innerText = name;

    const avatarEl = document.getElementById('activeChatAvatar');
    if (avatarEl && avatar) avatarEl.src = avatar;

    if (typeof loadMessages === 'function') loadMessages();
    if (typeof fetchMessagesFromCloud === 'function') fetchMessagesFromCloud();
    if (typeof startChatPolling === 'function') startChatPolling();

    if (window.innerWidth < 768) {
        const sidebar = document.getElementById('sidebarSection');
        if (sidebar) sidebar.classList.add('hidden');
        
        const bottomNav = document.getElementById('bottomNavBar');
        if (bottomNav) bottomNav.classList.add('hidden');
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
    let deviceContacts = JSON.parse(localStorage.getItem('message_contacts_v18') || '[]');
    const allUsers = deviceContacts.filter(c => !c.isOfficialSupport && c.phone !== '8801538187301');

    let html = `
        <div class="discover-wrapper p-3 space-y-3">
            <div class="flex items-center space-x-2 theme-input px-3.5 py-2.5 rounded-2xl">
                <input type="text" id="discoverCountrySearch" placeholder="Search country name..." value="${searchQuery}" class="w-full bg-transparent text-xs focus:outline-none text-white placeholder-gray-500" oninput="renderDiscoverDirectory(this.value)">
                <i class="fa-solid fa-magnifying-glass text-amber-300 text-xs"></i>
            </div>
            <div class="discover-hero mb-2">
                <h2 class="discover-hero-title">Global Network Directory</h2>
                <p class="discover-hero-sub">Select any country to connect directly across borders</p>
            </div>
    `;

    GLOBAL_CONTINENTS_DATA.forEach(continent => {
        const filteredCountries = continent.countries.filter(c => c.name.toLowerCase().includes(q));
        if (filteredCountries.length === 0) return;

        html += `
            <div class="discover-continent-box mb-3">
                <div class="discover-continent-header">
                    <span>${continent.title}</span>
                </div>
                <div class="discover-countries-grid grid grid-cols-2 gap-2">
        `;

        filteredCountries.forEach(country => {
            const countryUsers = allUsers.filter(u => {
                const info = typeof getCountryInfo === 'function' ? getCountryInfo(u.phone) : { name: '' };
                return (info.name && info.name.toLowerCase() === country.name.toLowerCase()) || String(u.phone || '').replace(/[\s\-\(\)]/g, '').startsWith(country.code);
            });

            const count = countryUsers.length;
            const badgeText = count > 0 ? `${count} Active` : `+${country.code}`;

            html += `
                <div class="discover-country-card p-3 rounded-xl border border-amber-400/20 cursor-pointer flex flex-col items-center text-center bg-white/5 hover:bg-white/10 transition" onclick="openDiscoverCountry('${country.flag}', '${country.name.replace(/'/g, "\\'")}', '${country.code}')">
                    <span class="text-2xl">${country.flag}</span>
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

    let deviceContacts = JSON.parse(localStorage.getItem('message_contacts_v18') || '[]');
    const allUsers = deviceContacts.filter(c => !c.isOfficialSupport && c.phone !== '8801538187301');
    
    const matchedUsers = allUsers.filter(u => {
        const info = typeof getCountryInfo === 'function' ? getCountryInfo(u.phone) : { name: '' };
        const isMatchCountry = (info.name && info.name.toLowerCase() === countryObj.name.toLowerCase()) || String(u.phone || '').replace(/[\s\-\(\)]/g, '').startsWith(countryObj.code);
        const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase());
        return isMatchCountry && matchesSearch;
    });

    let usersHtml = '';
    if (matchedUsers.length === 0) {
        usersHtml = `
            <div class="flex flex-col items-center justify-center p-8 text-center space-y-3 theme-card rounded-2xl border border-white/5 mt-2">
                <span class="text-4xl">${countryObj.flag}</span>
                <p class="text-xs font-bold gold-gradient-text">No active members found in ${countryObj.name}</p>
                <p class="text-[10px] text-gray-400">Anyone joining MESSAGE from ${countryObj.name} will appear here automatically.</p>
            </div>
        `;
    } else {
        usersHtml = matchedUsers.map(c => {
            const isOnline = c.isOnline === true || c.isOnline === 1 || c.isOnline === "1";
            const statusColor = isOnline ? 'bg-[#2ed573]' : 'bg-[#ff4757]';
            const statusText = isOnline ? '<span class="text-[#2ed573] font-semibold">Online</span>' : '<span class="text-gray-400">Offline</span>';

            const avatarImg = c.avatar ? `<img src="${c.avatar}" class="w-10 h-10 rounded-full object-cover bg-black">` : `<div class="w-10 h-10 rounded-full theme-input flex items-center justify-center text-xs font-bold gold-gradient-text border border-amber-400/20">${c.name.charAt(0)}</div>`;
            const safeName = c.name.replace(/'/g, "\\'");
            return `
            <div class="flex justify-between items-center px-4 py-3 my-1.5 hover:bg-white/5 rounded-2xl theme-card border border-white/5 cursor-pointer" onclick="openChat('${c.phone}', '${safeName}', '${c.avatar || ''}')">
                <div class="flex items-center space-x-3 flex-1 min-w-0">
                    <div class="relative shrink-0">
                        ${avatarImg}
                        <span class="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-black ${statusColor}"></span>
                    </div>
                    <div class="min-w-0">
                        <p class="text-xs font-semibold gold-gradient-text truncate">${c.name}</p>
                        <div class="flex items-center space-x-1.5 text-[10px]">
                            <span>${countryObj.flag} ${countryObj.name}</span>
                            <span>•</span>
                            ${statusText}
                        </div>
                    </div>
                </div>
                <div class="flex items-center space-x-2 shrink-0 pl-2">
                    <button onclick="event.stopPropagation(); openChat('${c.phone}', '${safeName}', '${c.avatar || ''}')" class="p-2 theme-card rounded-xl hover:brightness-125 transition cursor-pointer border border-amber-400/20" title="Chat">
                        <svg class="w-4 h-4 text-amber-300" viewBox="0 0 24 24" fill="none" stroke="#F5D061" stroke-width="2.2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                    </button>
                    <button onclick="event.stopPropagation(); openChat('${c.phone}', '${safeName}', '${c.avatar || ''}'); startWhatsAppCall('audio')" class="p-2 theme-card rounded-xl hover:brightness-125 transition cursor-pointer border border-amber-400/20" title="Audio Call">
                        <svg class="w-4 h-4 text-amber-300" viewBox="0 0 24 24" fill="none" stroke="#F5D061" stroke-width="2.2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                    </button>
                    <button onclick="event.stopPropagation(); openChat('${c.phone}', '${safeName}', '${c.avatar || ''}'); startWhatsAppCall('video')" class="p-2 theme-card rounded-xl hover:brightness-125 transition cursor-pointer border border-amber-400/20" title="Video Call">
                        <svg class="w-4 h-4 text-amber-300" viewBox="0 0 24 24" fill="none" stroke="#F5D061" stroke-width="2.2"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2.5" ry="2.5"></rect></svg>
                    </button>
                </div>
            </div>`;
        }).join('');
    }

    listContainer.innerHTML = `
        <div class="pb-16 p-3 space-y-3">
            <button onclick="backToDiscoverContinents()" class="discover-back-btn flex items-center space-x-2 text-xs font-bold text-amber-300 px-3 py-1.5 rounded-xl bg-amber-400/10 cursor-pointer">
                <i class="fa-solid fa-arrow-left"></i> <span>All Countries</span>
            </button>
            <div class="flex items-center justify-between px-3 py-2 rounded-xl bg-white/5 border border-amber-400/20">
                <div class="flex items-center space-x-2">
                    <span class="text-xl">${countryObj.flag}</span>
                    <div>
                        <h3 class="text-xs font-bold gold-gradient-text">${countryObj.name}</h3>
                        <p class="text-[9px] text-gray-400">Direct Cross-Border Connection</p>
                    </div>
                </div>
                <span class="text-[10px] font-bold text-amber-300 px-2 py-0.5 rounded-full bg-amber-400/10">${matchedUsers.length} Contacts</span>
            </div>
            <div class="flex items-center space-x-2 theme-input px-3.5 py-2.5 rounded-2xl">
                <input type="text" id="countryMemberSearch" placeholder="Search members in ${countryObj.name}..." value="${searchQuery}" class="w-full bg-transparent text-xs focus:outline-none text-white placeholder-gray-500" oninput="renderCountryContactsView(selectedDiscoverCountry, this.value)">
                <i class="fa-solid fa-magnifying-glass text-amber-300 text-xs"></i>
            </div>
            ${usersHtml}
        </div>
    `;
}

function renderContactsView(searchQuery = '') {
    const listContainer = document.getElementById('sidebarContentList');
    if (!listContainer) return;

    let localContacts = JSON.parse(localStorage.getItem('message_contacts_v18') || '[]');
    const q = searchQuery.toLowerCase().trim();

    const filteredContacts = localContacts.filter(c => 
        c.name.toLowerCase().includes(q)
    );

    let contactsHtml = '';
    if (filteredContacts.length === 0) {
        contactsHtml = `
            <div class="flex flex-col items-center justify-center p-8 text-center space-y-3 theme-card rounded-2xl border border-white/5 mt-4">
                <i class="fa-solid fa-address-book text-3xl text-amber-300"></i>
                <p class="text-xs font-bold gold-gradient-text">No contacts found</p>
                <p class="text-[10px] text-gray-400">Add a new contact or wait for global users to sync automatically.</p>
            </div>
        `;
    } else {
        contactsHtml = filteredContacts.map(c => {
            const isOnline = c.isOnline === true || c.isOnline === 1 || c.isOnline === "1";
            const statusColor = isOnline ? 'bg-[#2ed573]' : 'bg-[#ff4757]';
            const statusText = isOnline ? '<span class="text-[#2ed573] font-semibold">Online</span>' : '<span class="text-gray-400">Offline</span>';

            const countryInfo = typeof getCountryInfo === 'function' ? getCountryInfo(c.phone) : { flag: '🌐', name: 'Global' };
            const avatarImg = c.avatar ? `<img src="${c.avatar}" class="w-10 h-10 rounded-full object-cover bg-black">` : `<div class="w-10 h-10 rounded-full theme-input flex items-center justify-center text-xs font-bold gold-gradient-text border border-amber-400/20">${c.name.charAt(0)}</div>`;
            const safeName = c.name.replace(/'/g, "\\'");
            
            return `
            <div class="flex justify-between items-center px-4 py-3 my-1.5 hover:bg-white/5 rounded-2xl theme-card border border-white/5 cursor-pointer" onclick="openChat('${c.phone}', '${safeName}', '${c.avatar || ''}')">
                <div class="flex items-center space-x-3 flex-1 min-w-0">
                    <div class="relative shrink-0">
                        ${avatarImg}
                        <span class="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-black ${statusColor}"></span>
                    </div>
                    <div class="min-w-0">
                        <p class="text-xs font-semibold gold-gradient-text truncate">${c.name}</p>
                        <div class="flex items-center space-x-1.5 text-[10px]">
                            <span>${countryInfo.flag} ${countryInfo.name}</span>
                            <span>•</span>
                            ${statusText}
                        </div>
                    </div>
                </div>
                <div class="flex items-center space-x-2 shrink-0">
                    <button onclick="event.stopPropagation(); openChat('${c.phone}', '${safeName}', '${c.avatar || ''}')" class="p-2 theme-card rounded-xl hover:brightness-125 transition cursor-pointer border border-amber-400/20" title="Chat">
                        <svg class="w-4 h-4 text-amber-300" viewBox="0 0 24 24" fill="none" stroke="#F5D061" stroke-width="2.2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                    </button>
                    <button onclick="event.stopPropagation(); openChat('${c.phone}', '${safeName}', '${c.avatar || ''}'); startWhatsAppCall('audio')" class="p-2 theme-card rounded-xl hover:brightness-125 transition cursor-pointer border border-amber-400/20" title="Audio Call">
                        <svg class="w-4 h-4 text-amber-300" viewBox="0 0 24 24" fill="none" stroke="#F5D061" stroke-width="2.2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                    </button>
                    <button onclick="event.stopPropagation(); openChat('${c.phone}', '${safeName}', '${c.avatar || ''}'); startWhatsAppCall('video')" class="p-2 theme-card rounded-xl hover:brightness-125 transition cursor-pointer border border-amber-400/20" title="Video Call">
                        <svg class="w-4 h-4 text-amber-300" viewBox="0 0 24 24" fill="none" stroke="#F5D061" stroke-width="2.2"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2.5" ry="2.5"></rect></svg>
                    </button>
                </div>
            </div>`;
        }).join('');
    }

    listContainer.innerHTML = `
        <div class="pb-20 p-3 space-y-3">
            <div class="flex items-center justify-between">
                <h3 class="text-xs font-bold gold-gradient-text uppercase tracking-wider">Contacts Directory</h3>
                <button onclick="openAddContactModal()" class="px-3 py-1.5 rounded-xl gold-btn text-[10px] font-extrabold flex items-center space-x-1.5 cursor-pointer shadow-md">
                    <i class="fa-solid fa-user-plus text-xs"></i> <span>Add New</span>
                </button>
            </div>
            <div class="flex items-center space-x-2 theme-input px-3.5 py-2.5 rounded-2xl">
                <input type="text" id="contactSearchInput" placeholder="Search contact by name..." value="${searchQuery}" class="w-full bg-transparent text-xs focus:outline-none text-white placeholder-gray-500" oninput="renderContactsView(this.value)">
                <i class="fa-solid fa-magnifying-glass text-amber-300 text-xs"></i>
            </div>
            ${contactsHtml}
        </div>
    `;
}

function openAddContactModal() {
    let existingModal = document.getElementById('addContactModalOverlay');
    if (existingModal) existingModal.remove();

    const overlay = document.createElement('div');
    overlay.id = 'addContactModalOverlay';
    overlay.className = 'fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4';
    
    overlay.innerHTML = `
        <div class="theme-card border border-amber-400/40 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div class="flex justify-between items-center border-b border-white/10 pb-2">
                <h3 class="text-sm font-bold gold-gradient-text uppercase tracking-wider">Add New Contact</h3>
                <button onclick="document.getElementById('addContactModalOverlay').remove()" class="text-gray-400 hover:text-white cursor-pointer"><i class="fa-solid fa-xmark text-sm"></i></button>
            </div>
            <div class="space-y-3">
                <div class="space-y-1">
                    <label class="text-[10px] font-bold text-amber-300 uppercase">Contact Name</label>
                    <input type="text" id="newContactNameInput" placeholder="Enter full name" class="w-full theme-input text-xs px-3.5 py-3 rounded-xl text-white placeholder-gray-500 focus:outline-none">
                </div>
                <div class="space-y-1">
                    <label class="text-[10px] font-bold text-amber-300 uppercase">Phone Number (with Country Code)</label>
                    <input type="tel" id="newContactPhoneInput" placeholder="+8801700000000" class="w-full theme-input text-xs px-3.5 py-3 rounded-xl text-white placeholder-gray-500 focus:outline-none">
                </div>
                <button onclick="saveNewContactFromModal()" class="w-full py-3.5 gold-btn text-xs rounded-xl font-extrabold cursor-pointer shadow-lg mt-2 uppercase tracking-wider">
                    SAVE CONTACT
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
}

function saveNewContactFromModal() {
    const nameInput = document.getElementById('newContactNameInput');
    const phoneInput = document.getElementById('newContactPhoneInput');
    if (!nameInput || !phoneInput) return;

    const name = nameInput.value.trim();
    const phone = phoneInput.value.trim();

    if (!name) {
        if (typeof showToast === 'function') showToast("Please enter contact name", true);
        return;
    }
    if (!phone) {
        if (typeof showToast === 'function') showToast("Please enter phone number", true);
        return;
    }

    let localContacts = JSON.parse(localStorage.getItem('message_contacts_v18') || '[]');
    const cleanPhone = phone.replace(/[\s\-\(\)\+]/g, '');

    const exists = localContacts.find(c => String(c.phone || '').replace(/[\s\-\(\)\+]/g, '') === cleanPhone);
    if (exists) {
        if (typeof showToast === 'function') showToast("This phone number already exists in your contacts!", true);
        return;
    }

    localContacts.push({
        name: name,
        phone: cleanPhone,
        avatar: "",
        isOnline: false,
        appUser: false
    });

    localStorage.setItem('message_contacts_v18', JSON.stringify(localContacts));
    document.getElementById('addContactModalOverlay')?.remove();
    if (typeof showToast === 'function') showToast("Contact added successfully!");
    renderContactsView();
}
