let currentUserEmail = '';
let currentPhone = '';
let generatedMagicCode = '';
let userDeviceIp = 'Detecting...';

function showCustomNotify(message, isSuccess = true) {
    const modal = document.getElementById('customNotifyModal');
    if (!modal) return;
    const txt = document.getElementById('notifyModalText');
    const icon = document.getElementById('notifyModalIcon');
    if (txt) txt.innerText = message;
    if (icon) {
        icon.innerHTML = isSuccess
            ? '<i class="fa-solid fa-circle-check"></i>'
            : '<i class="fa-solid fa-circle-exclamation" style="color:#ff4d4d;"></i>';
    }
    modal.style.display = 'flex';
}

function closeCustomNotify() {
    const modal = document.getElementById('customNotifyModal');
    if (modal) modal.style.display = 'none';
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

// ধাপ ১: ইমেইল, মোবাইল ও ৬-ডিজিট কোড ব্যাকএন্ডে (chat.js) পাঠানো
document.addEventListener('DOMContentLoaded', () => {
    autoDetectIpAndCountry();

    const magicLinkForm = document.getElementById('magicLinkForm');
    if (magicLinkForm) {
        magicLinkForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('userEmail').value.trim().toLowerCase();
            const rawPhone = document.getElementById('userPhone').value.trim();
            const fullPhone = document.getElementById('countryDialCode').value + rawPhone;
            const statusEl = document.getElementById('formStatus');
            const btn = document.getElementById('sendLinkBtn');

            if (!email || !isAuthenticEmail(email)) {
                if (statusEl) {
                    statusEl.innerText = "Please enter an authentic email (Gmail, Apple, Outlook, Yahoo).";
                    statusEl.className = "status-msg error";
                    statusEl.style.display = "block";
                }
                return;
            }

            if (!rawPhone || rawPhone.length < 5) {
                if (statusEl) {
                    statusEl.innerText = "Please enter a valid mobile number.";
                    statusEl.className = "status-msg error";
                    statusEl.style.display = "block";
                }
                return;
            }

            if (statusEl) statusEl.style.display = "none";
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<span>SENDING 6-DIGIT CODE...</span>';
            }

            currentUserEmail = email;
            currentPhone = fullPhone;
            generatedMagicCode = Math.floor(100000 + Math.random() * 900000).toString();

            try {
                await fetch('/api/chat?action=send_magic_link', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: currentUserEmail,
                        phone: currentPhone,
                        magic_code: generatedMagicCode,
                        ip: userDeviceIp
                    })
                });

                const verSec = document.getElementById('verificationSection');
                const codeSec = document.getElementById('magicCodeVerifySection');
                const dispCode = document.getElementById('displayMagicCode');

                if (verSec) verSec.style.display = 'none';
                if (codeSec) codeSec.style.display = 'block';
                if (dispCode) dispCode.innerText = generatedMagicCode;

                showCustomNotify("6-DIGIT CODE GENERATED SUCCESSFULLY!", true);
            } catch (err) {
                showCustomNotify("Failed to send code. Please try again.", false);
            } finally {
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = '<span>6-DIGIT CODE</span> <i class="fa-solid fa-circle-check btn-tick-icon"></i>';
                }
            }
        });
    }

    // ধাপ ২: কোড ভেরিফিকেশন সাবমিট
    const otpVerifyForm = document.getElementById('otpVerifyForm');
    if (otpVerifyForm) {
        otpVerifyForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const enteredCode = document.getElementById('inputMagicCode').value.trim();
            const statusEl = document.getElementById('otpStatusMsg');
            const btn = document.getElementById('verifyOtpBtn');

            if (enteredCode !== generatedMagicCode) {
                if (statusEl) {
                    statusEl.innerText = "INVALID 6-DIGIT CODE. PLEASE TRY AGAIN.";
                    statusEl.className = "status-msg error";
                    statusEl.style.display = "block";
                }
                return;
            }

            if (statusEl) statusEl.style.display = "none";
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<span>VERIFYING & AUTHORIZING...</span>';
            }

            const emailPrefix = currentUserEmail.split('@')[0].replace(/[^a-z0-9]/gi, '').substring(0, 7);
            const randomHash = Math.random().toString(36).substring(2, 8);
            const uniqueVerifiedId = `${emailPrefix}_${randomHash}_${Date.now().toString(36).slice(-3)}`;

            try {
                const res = await fetch('/api/chat?action=verify_magic_code', {
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
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = '<span>AUTHORIZE & VERIFY</span> <i class="fa-solid fa-circle-check btn-tick-icon"></i>';
                }
            }
        });
    }

    if (localStorage.getItem('rorraxy_magic_verified') === 'true') {
        showVerifiedState(
            localStorage.getItem('rorraxy_verified_email') || '',
            localStorage.getItem('rorraxy_verified_phone') || '',
            localStorage.getItem('rorraxy_verified_id') || '',
            localStorage.getItem('rorraxy_user_ip') || userDeviceIp
        );
    }
});

function autoFillMagicCode() {
    const inputCode = document.getElementById('inputMagicCode');
    if (inputCode) inputCode.value = generatedMagicCode;
    const form = document.getElementById('otpVerifyForm');
    if (form) form.dispatchEvent(new Event('submit'));
}

function showVerifiedState(email, phone, verifiedId, ip) {
    const verSec = document.getElementById('verificationSection');
    const codeSec = document.getElementById('magicCodeVerifySection');
    const succSec = document.getElementById('verifiedSuccessSection');

    if (verSec) verSec.style.display = 'none';
    if (codeSec) codeSec.style.display = 'none';
    if (succSec) succSec.style.display = 'block';

    const emailTxt = document.getElementById('verifiedEmailText');
    const phoneTxt = document.getElementById('verifiedPhoneText');
    const idTxt = document.getElementById('verifiedIdText');
    const ipTxt = document.getElementById('verifiedIpText');

    if (emailTxt) emailTxt.innerText = email;
    if (phoneTxt) phoneTxt.innerText = phone;
    if (idTxt) idTxt.innerText = verifiedId;
    if (ipTxt) ipTxt.innerText = ip;
}

function resetVerification() {
    localStorage.removeItem('rorraxy_magic_verified');
    const succSec = document.getElementById('verifiedSuccessSection');
    const codeSec = document.getElementById('magicCodeVerifySection');
    const verSec = document.getElementById('verificationSection');

    if (succSec) succSec.style.display = 'none';
    if (codeSec) codeSec.style.display = 'none';
    if (verSec) verSec.style.display = 'block';

    const form1 = document.getElementById('magicLinkForm');
    const form2 = document.getElementById('otpVerifyForm');
    if (form1) form1.reset();
    if (form2) form2.reset();
}
