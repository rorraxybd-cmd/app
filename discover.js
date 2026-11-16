// discover.js - Global Directory & Contacts Sync Module (Final & Duplicate-Proof)
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
    }
];

let selectedDiscoverCountry = null;

function openChat(phone, name, avatar = '') {
    const recipient = { phone, name, avatar };
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
    if (chatHeader) { chatHeader.classList.remove('hidden'); chatHeader.style.display = 'flex'; }

    const chatInput = document.getElementById('chatInputBar');
    if (chatInput) { chatInput.classList.remove('hidden'); chatInput.style.display = 'flex'; }

    const titleEl = document.getElementById('activeChatTitle');
    if (titleEl) titleEl.innerText = name;

    const avatarEl = document.getElementById('activeChatAvatar');
    if (avatarEl && avatar) avatarEl.src = avatar;

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
    let deviceContacts = JSON.parse(localStorage.getItem('message_contacts_v18') || '[]');
    const allUsers = deviceContacts.filter(c => !c.isOfficialSupport && c.phone !== '8801538187301');

    let html = `
        <div class="discover-wrapper p-3 space-y-3">
            <div class="flex items-center space-x-2 theme-input px-3.5 py-2.5 rounded-xl border border-amber-400/20">
                <input type="text" id="discoverCountrySearch" placeholder="Search country name..." value="${searchQuery}" class="w-full bg-transparent text-xs focus:outline-none text-white placeholder-gray-500" oninput="renderDiscoverDirectory(this.value)">
                <i class="fa-solid fa-magnifying-glass text-amber-300 text-xs"></i>
            </div>
            <div class="theme-card p-4 rounded-2xl border border-amber-400/20 text-center">
                <h2 class="text-xs font-bold gold-gradient-text uppercase tracking-wider">Global Network Directory</h2>
                <p class="text-[10px] text-gray-400 mt-1">Select any country to connect directly across borders</p>
            </div>
    `;

    GLOBAL_CONTINENTS_DATA.forEach(continent => {
        const filteredCountries = continent.countries.filter(c => c.name.toLowerCase().includes(q));
        if (filteredCountries.length === 0) return;

        html += `
            <div class="theme-card rounded-2xl p-3 border border-white/5 space-y-2">
                <div class="text-xs font-bold gold-gradient-text border-b border-white/10 pb-1.5">${continent.title}</div>
                <div class="grid grid-cols-2 gap-2">
        `;

        filteredCountries.forEach(country => {
            const countryUsers = allUsers.filter(u => {
                const info = typeof getCountryInfo === 'function' ? getCountryInfo(u.phone) : { name: '' };
                return (info.name && info.name.toLowerCase() === country.name.toLowerCase()) || String(u.phone || '').replace(/[\s\-\(\)]/g, '').startsWith(country.code);
            });

            const count = countryUsers.length;
            const badgeText = count > 0 ? `${count} Active` : `+${country.code}`;

            html += `
                <div class="p-3 rounded-xl border border-amber-400/20 cursor-pointer flex flex-col items-center text-center bg-white/5 hover:bg-white/10 transition" onclick="openDiscoverCountry('${country.flag}', '${country.name.replace(/'/g, "\\'")}', '${country.code}')">
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

    let usersHtml = matchedUsers.length === 0 ? `
        <div class="flex flex-col items-center justify-center p-8 text-center space-y-3 theme-card rounded-2xl border border-white/5 mt-2">
            <span class="text-4xl">${countryObj.flag}</span>
            <p class="text-xs font-bold gold-gradient-text">${countryObj.name} এ কোনো সদস্য পাওয়া যায়নি</p>
        </div>
    ` : matchedUsers.map(c => {
        const isOnline = c.isOnline === true || c.isOnline === 1;
        const statusColor = isOnline ? 'bg-[#2ed573]' : 'bg-[#ff4757]';
        const avatarImg = c.avatar ? `<img src="${c.avatar}" class="w-10 h-10 rounded-full object-cover bg-black shrink-0">` : `<div class="w-10 h-10 rounded-full theme-input flex items-center justify-center text-xs font-bold gold-gradient-text border border-amber-400/20 shrink-0">${c.name.charAt(0)}</div>`;
        const safeName = c.name.replace(/'/g, "\\'");
        return `
        <div class="flex justify-between items-center px-4 py-3 my-1.5 hover:bg-white/5 rounded-2xl theme-card border border-white/5 cursor-pointer" onclick="openChat('${c.phone}', '${safeName}', '${c.avatar || ''}')">
            <div class="flex items-center space-x-3 flex-1 min-w-0">
                <div class="relative shrink-0">
                    ${avatarImg}
                    <span class="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-black ${statusColor}"></span>
                </div>
                <div class="min-w-0 flex-1 pr-2">
                    <p class="text-xs font-semibold gold-gradient-text truncate flex items-center space-x-1.5">
                        <span>${c.name}</span>
                        <span class="text-sm">${countryObj.flag}</span>
                    </p>
                    <p class="text-[10px] text-gray-400">${isOnline ? 'Online' : 'Offline'}</p>
                </div>
            </div>
            <div class="flex items-center space-x-1.5 shrink-0 pl-1">
                <button onclick="event.stopPropagation(); openChat('${c.phone}', '${safeName}', '${c.avatar || ''}')" class="p-2 theme-card rounded-xl border border-amber-400/20"><i class="fa-solid fa-message text-amber-300 text-xs"></i></button>
                <button onclick="event.stopPropagation(); openChat('${c.phone}', '${safeName}', '${c.avatar || ''}'); startWhatsAppCall('audio')" class="p-2 theme-card rounded-xl border border-amber-400/20"><i class="fa-solid fa-phone text-amber-300 text-xs"></i></button>
                <button onclick="event.stopPropagation(); openChat('${c.phone}', '${safeName}', '${c.avatar || ''}'); startWhatsAppCall('video')" class="p-2 theme-card rounded-xl border border-amber-400/20"><i class="fa-solid fa-video text-amber-300 text-xs"></i></button>
            </div>
        </div>`;
    }).join('');

    listContainer.innerHTML = `
        <div class="pb-16 p-3 space-y-3">
            <button onclick="backToDiscoverContinents()" class="flex items-center space-x-2 text-xs font-bold text-amber-300 px-3 py-1.5 rounded-xl bg-amber-400/10 cursor-pointer border border-amber-400/20">
                <i class="fa-solid fa-arrow-left"></i> <span>সকল দেশ</span>
            </button>
            <div class="flex items-center justify-between px-3 py-2.5 rounded-2xl theme-card border border-amber-400/20">
                <div class="flex items-center space-x-2.5">
                    <span class="text-2xl">${countryObj.flag}</span>
                    <div>
                        <h3 class="text-xs font-bold gold-gradient-text">${countryObj.name}</h3>
                        <p class="text-[9px] text-gray-400">ডাইরেক্ট ক্রস-বর্ডার কানেکশন</p>
                    </div>
                </div>
                <span class="text-[10px] font-bold text-amber-300 px-2.5 py-1 rounded-full bg-amber-400/10">${matchedUsers.length} কন্টাক্ট</span>
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
    const filteredContacts = localContacts.filter(c => c.name.toLowerCase().includes(q));
    let contactsHtml = filteredContacts.length === 0 ? `
        <div class="flex flex-col items-center justify-center p-8 text-center space-y-3 theme-card rounded-2xl border border-white/5 mt-4">
            <i class="fa-solid fa-address-book text-3xl text-amber-300"></i>
            <p class="text-xs font-bold gold-gradient-text">কোনো কন্টাক্ট পাওয়া যায়নি</p>
        </div>
    ` : filteredContacts.map(c => {
        const isOnline = c.isOnline === true || c.isOnline === 1;
        const statusColor = isOnline ? 'bg-[#2ed573]' : 'bg-[#ff4757]';
        const countryInfo = typeof getCountryInfo === 'function' ? getCountryInfo(c.phone) : { flag: '🌐' };
        const avatarImg = c.avatar ? `<img src="${c.avatar}" class="w-10 h-10 rounded-full object-cover bg-black shrink-0">` : `<div class="w-10 h-10 rounded-full theme-input flex items-center justify-center text-xs font-bold gold-gradient-text border border-amber-400/20 shrink-0">${c.name.charAt(0)}</div>`;
        const safeName = c.name.replace(/'/g, "\\'");
        return `
        <div class="flex justify-between items-center px-4 py-3 my-1.5 hover:bg-white/5 rounded-2xl theme-card border border-white/5 cursor-pointer" onclick="openChat('${c.phone}', '${safeName}', '${c.avatar || ''}')">
            <div class="flex items-center space-x-3 flex-1 min-w-0">
                <div class="relative shrink-0">
                    ${avatarImg}
                    <span class="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-black ${statusColor}"></span>
                </div>
                <div class="min-w-0 flex-1 pr-2">
                    <p class="text-xs font-semibold gold-gradient-text truncate flex items-center space-x-1.5">
                        <span>${c.name}</span>
                        <span class="text-sm">${countryInfo.flag}</span>
                    </p>
                    <p class="text-[10px] text-gray-400">${isOnline ? 'Online' : 'Offline'}</p>
                </div>
            </div>
            <div class="flex items-center space-x-1.5 shrink-0">
                <button onclick="event.stopPropagation(); openChat('${c.phone}', '${safeName}', '${c.avatar || ''}')" class="p-2 theme-card rounded-xl border border-amber-400/20"><i class="fa-solid fa-message text-amber-300 text-xs"></i></button>
                <button onclick="event.stopPropagation(); openChat('${c.phone}', '${safeName}', '${c.avatar || ''}'); startWhatsAppCall('audio')" class="p-2 theme-card rounded-xl border border-amber-400/20"><i class="fa-solid fa-phone text-amber-300 text-xs"></i></button>
                <button onclick="event.stopPropagation(); openChat('${c.phone}', '${safeName}', '${c.avatar || ''}'); startWhatsAppCall('video')" class="p-2 theme-card rounded-xl border border-amber-400/20"><i class="fa-solid fa-video text-amber-300 text-xs"></i></button>
            </div>
        </div>`;
    }).join('');

    listContainer.innerHTML = `
        <div class="pb-20 p-3 space-y-3">
            <div class="flex items-center justify-between">
                <h3 class="text-xs font-bold gold-gradient-text uppercase tracking-wider">Contacts Directory</h3>
                <button onclick="openAddContactModal()" class="px-3 py-1.5 rounded-xl gold-btn text-[10px] font-extrabold flex items-center space-x-1.5 cursor-pointer shadow-md">
                    <i class="fa-solid fa-user-plus text-xs"></i> <span>নতুন যোগ করুন</span>
                </button>
            </div>
            <div class="flex items-center space-x-2 theme-input px-3.5 py-2.5 rounded-xl border border-amber-400/20">
                <input type="text" id="contactSearchInput" placeholder="নাম দিয়ে কন্টাক্ট খুঁজুন..." value="${searchQuery}" class="w-full bg-transparent text-xs focus:outline-none text-white placeholder-gray-500" oninput="renderContactsView(this.value)">
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
                <h3 class="text-sm font-bold gold-gradient-text uppercase tracking-wider">নতুন কন্টাক্ট যোগ করুন</h3>
                <button onclick="document.getElementById('addContactModalOverlay').remove()" class="text-gray-400 hover:text-white cursor-pointer"><i class="fa-solid fa-xmark text-sm"></i></button>
            </div>
            <div class="space-y-3">
                <div class="space-y-1">
                    <label class="text-[10px] font-bold text-amber-300 uppercase">কন্টাক্টের নাম</label>
                    <input type="text" id="newContactNameInput" placeholder="পূর্ণ নাম লিখুন" class="w-full theme-input text-xs px-3.5 py-3 rounded-xl text-white placeholder-gray-500 focus:outline-none border border-amber-400/20">
                </div>
                <div class="space-y-1">
                    <label class="text-[10px] font-bold text-amber-300 uppercase">ফোন নম্বর</label>
                    <input type="tel" id="newContactPhoneInput" placeholder="+8801700000000" class="w-full theme-input text-xs px-3.5 py-3 rounded-xl text-white placeholder-gray-500 focus:outline-none border border-amber-400/20">
                </div>
                <button onclick="saveNewContactFromModal()" class="w-full py-3.5 gold-btn text-xs rounded-xl font-extrabold cursor-pointer shadow-lg mt-2 uppercase tracking-wider">
                    কন্টাক্ট সেভ করুন
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
    if (!name || !phone) {
        if (typeof showToast === 'function') showToast("নাম এবং ফোন নম্বর উভয়ই দিন", true);
        return;
    }
    let localContacts = JSON.parse(localStorage.getItem('message_contacts_v18') || '[]');
    const cleanPhone = String(phone).replace(/[\s\-\(\)\+]/g, '');

    const existingIndex = localContacts.findIndex(c => String(c.phone || '').replace(/[\s\-\(\)\+]/g, '') === cleanPhone);
    if (existingIndex !== -1) {
        if (typeof showToast === 'function') showToast("এই ফোন নম্বরটি ইতিমধ্যে কন্টাক্ট লিস্টে রয়েছে!", true);
        return;
    }
    localContacts.push({ name: name, phone: cleanPhone, avatar: "", isOnline: false, appUser: false });
    localStorage.setItem('message_contacts_v18', JSON.stringify(localContacts));
    document.getElementById('addContactModalOverlay')?.remove();
    if (typeof showToast === 'function') showToast("কন্টাক্ট সফলভাবে সংরক্ষিত হয়েছে!");
    renderContactsView();
}
