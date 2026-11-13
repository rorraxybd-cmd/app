let currentUserEmail = '';
let currentPhone = '';
let generatedMagicCode = '';
let userDeviceIp = 'Detecting...';

function showCustomNotify(message, isSuccess = true) {
    const modal = document.getElementById('customNotifyModal');
    const txt = document.getElementById('notifyModalText');
    const icon = document.getElementById('notifyModalIcon');
    txt.innerText = message;
    icon.innerHTML = isSuccess
        ? '<i class="fa-solid fa-circle-check"></i>'
        : '<i class="fa-solid fa-circle-exclamation" style="color:#ff4d4d;"></i>';
    modal.style.display = 'flex';
}

function closeCustomNotify() {
    document.getElementById('customNotifyModal').style.display = 'none';
}

function isAuthenticEmail(email) {
    const blocked = ['tempmail', '10minutemail', 'throwaway', 'mailinator', 'yopmail', 'disposable'];
    const parts = email.split('@');
    if (parts.length !== 2) return false;
    return !blocked.some(b => parts[1].includes(b));
}

// অটোমেটিক আইপি এবং কান্ট্রি কোড ডিটেকশন
async function autoDetectIpAndCountry() {
    try {
        const res = await fetch('https://ipapi.co/json/').catch(() => null);
        if (res && res.ok) {
            const data = await res.json();
            userDeviceIp = data.ip || 'Unknown';
            const dialCode = data.country_calling_code || "+880";
            const select = document.getElementById('countryDialCode');
            if (select) {
                for (let opt of select.options) {
                    if (opt.value === dialCode) {
                        select.value = dialCode;
                        break;
                    }
                }
            }
        }
    } catch (e) {
        userDeviceIp = 'Unknown';
    }
}

// ধাপ ১: ৬-ডিজিট কোড জেনারেট এবং SQL ডাটাবেসে সেভ করার রিকোয়েস্ট
document.getElementById('magicLinkForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('userEmail').value.trim().toLowerCase();
    const rawPhone = document.getElementById('userPhone').value.trim();
    const fullPhone = document.getElementById('countryDialCode').value + rawPhone;
    const statusEl = document.getElementById('formStatus');
    const btn = document.getElementById('sendLinkBtn');

    if (!email || !isAuthenticEmail(email)) {
        statusEl.innerText = "Please enter an authentic email (Gmail, Apple, Outlook, Yahoo).";
        statusEl.className = "status-msg error";
        statusEl.style.display = "block";
        return;
    }

    if (!rawPhone || rawPhone.length < 5) {
        statusEl.innerText = "Please enter a valid mobile number.";
        statusEl.className = "status-msg error";
        statusEl.style.display = "block";
        return;
    }

    statusEl.style.display = "none";
    btn.disabled = true;
    btn.innerHTML = '<span>GENERATING CODE...</span>';

    currentUserEmail = email;
    currentPhone = fullPhone;
    generatedMagicCode = Math.floor(100000 + Math.random() * 900000).toString();

    try {
        await fetch('/api/affiliate?action=send_magic_link', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: currentUserEmail,
                phone: currentPhone,
                magic_code: generatedMagicCode,
                ip: userDeviceIp
            })
        }).catch(() => null);

        document.getElementById('verificationSection').style.display = 'none';
        document.getElementById('magicCodeVerifySection').style.display = 'block';
        document.getElementById('displayMagicCode').innerText = generatedMagicCode;
        showCustomNotify("6-DIGIT CODE GENERATED SUCCESSFULLY!", true);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<span>6-DIGIT CODE</span> <i class="fa-solid fa-circle-check btn-tick-icon"></i>';
    }
});

function autoFillMagicCode() {
    document.getElementById('inputMagicCode').value = generatedMagicCode;
    document.getElementById('otpVerifyForm').dispatchEvent(new Event('submit'));
}

// ধাপ ২: ৬-ডিজিট কোড ও IP ভেরিফিকেশন
document.getElementById('otpVerifyForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const enteredCode = document.getElementById('inputMagicCode').value.trim();
    const statusEl = document.getElementById('otpStatusMsg');
    const btn = document.getElementById('verifyOtpBtn');

    if (enteredCode !== generatedMagicCode) {
        statusEl.innerText = "INVALID 6-DIGIT CODE. PLEASE TRY AGAIN.";
        statusEl.className = "status-msg error";
        statusEl.style.display = "block";
        return;
    }

    statusEl.style.display = "none";
    btn.disabled = true;
    btn.innerHTML = '<span>VERIFYING IP & SECURITY...</span>';

    const emailPrefix = currentUserEmail.split('@')[0].replace(/[^a-z0-9]/gi, '').substring(0, 7);
    const randomHash = Math.random().toString(36).substring(2, 8);
    const uniqueVerifiedId = `${emailPrefix}_${randomHash}_${Date.now().toString(36).slice(-3)}`;

    try {
        const res = await fetch('/api/affiliate?action=verify_magic_code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: currentUserEmail,
                phone: currentPhone,
                magic_code: enteredCode,
                unique_affiliate_id: uniqueVerifiedId,
                ip: userDeviceIp
            })
        });
        const data = await res.json().catch(() => null);
        const finalId = (data && data.unique_affiliate_id) ? data.unique_affiliate_id : uniqueVerifiedId;

        localStorage.setItem('rorraxy_magic_verified', 'true');
        localStorage.setItem('rorraxy_verified_email', currentUserEmail);
        localStorage.setItem('rorraxy_verified_phone', currentPhone);
        localStorage.setItem('rorraxy_verified_id', finalId);
        localStorage.setItem('rorraxy_user_ip', userDeviceIp);

        showVerifiedState(currentUserEmail, currentPhone, finalId, userDeviceIp);
        if (typeof confetti === 'function') confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    } catch (err) {
        showVerifiedState(currentUserEmail, currentPhone, uniqueVerifiedId, userDeviceIp);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<span>AUTHORIZE & VERIFY</span> <i class="fa-solid fa-circle-check btn-tick-icon"></i>';
    }
});

function showVerifiedState(email, phone, verifiedId, ip) {
    document.getElementById('verificationSection').style.display = 'none';
    document.getElementById('magicCodeVerifySection').style.display = 'none';
    document.getElementById('verifiedSuccessSection').style.display = 'block';

    document.getElementById('verifiedEmailText').innerText = email;
    document.getElementById('verifiedPhoneText').innerText = phone;
    document.getElementById('verifiedIdText').innerText = verifiedId;
    document.getElementById('verifiedIpText').innerText = ip;
}

function resetVerification() {
    localStorage.removeItem('rorraxy_magic_verified');
    document.getElementById('verifiedSuccessSection').style.display = 'none';
    document.getElementById('magicCodeVerifySection').style.display = 'none';
    document.getElementById('verificationSection').style.display = 'block';
    document.getElementById('magicLinkForm').reset();
    document.getElementById('otpVerifyForm').reset();
}

window.addEventListener('DOMContentLoaded', async () => {
    await autoDetectIpAndCountry();
    if (localStorage.getItem('rorraxy_magic_verified') === 'true') {
        showVerifiedState(
            localStorage.getItem('rorraxy_verified_email') || '',
            localStorage.getItem('rorraxy_verified_phone') || '',
            localStorage.getItem('rorraxy_verified_id') || '',
            localStorage.getItem('rorraxy_user_ip') || userDeviceIp
        );
    }
});
