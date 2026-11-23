// functions/api/_push.js
// Web Push VAPID + AES-GCM encryption (no external deps — pure Cloudflare Workers)

function b64uToBytes(b64) {
    const pad = '='.repeat((4 - b64.length % 4) % 4);
    const s = (b64 + pad).replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(s);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return arr;
}

function bytesToB64u(bytes) {
    let bin = '';
    const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function importVapidKeys(pubB64, privB64) {
    const pub = b64uToBytes(pubB64);
    const priv = b64uToBytes(privB64);
    const jwk = {
        kty: 'EC', crv: 'P-256', ext: true,
        x: bytesToB64u(pub.slice(1, 33)),
        y: bytesToB64u(pub.slice(33, 65)),
        d: bytesToB64u(priv)
    };
    const privateKey = await crypto.subtle.importKey(
        'jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']
    );
    return { privateKey, pubBytes: pub };
}

async function makeVapidJwt(audience, subject, privateKey) {
    const header = bytesToB64u(new TextEncoder().encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
    const now = Math.floor(Date.now() / 1000);
    const payload = bytesToB64u(new TextEncoder().encode(JSON.stringify({
        aud: audience, exp: now + 43200, sub: subject
    })));
    const signingInput = header + '.' + payload;
    const sig = await crypto.subtle.sign(
        { name: 'ECDSA', hash: 'SHA-256' },
        privateKey,
        new TextEncoder().encode(signingInput)
    );
    return signingInput + '.' + bytesToB64u(sig);
}

async function encryptPayload(payload, p256dh, auth) {
    const payloadBytes = new TextEncoder().encode(payload);
    const receiverPub = b64uToBytes(p256dh);
    const authSecret = b64uToBytes(auth);

    const localKP = await crypto.subtle.generateKey(
        { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']
    );
    const receiverKey = await crypto.subtle.importKey(
        'raw', receiverPub, { name: 'ECDH', namedCurve: 'P-256' }, false, []
    );
    const shared = await crypto.subtle.deriveBits(
        { name: 'ECDH', public: receiverKey }, localKP.privateKey, 256
    );
    const localPub = new Uint8Array(await crypto.subtle.exportKey('raw', localKP.publicKey));

    const salt = crypto.getRandomValues(new Uint8Array(16));
    const authInfo = new TextEncoder().encode('WebPush: info\x00');
    const info = new Uint8Array(authInfo.length + receiverPub.length + localPub.length);
    info.set(authInfo, 0);
    info.set(receiverPub, authInfo.length);
    info.set(localPub, authInfo.length + receiverPub.length);

    const sharedKey = await crypto.subtle.importKey('raw', shared, 'HKDF', false, ['deriveBits']);
    const ikm = await crypto.subtle.deriveBits(
        { name: 'HKDF', hash: 'SHA-256', salt: authSecret, info }, sharedKey, 256
    );
    const ikmKey = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
    const cek = await crypto.subtle.deriveBits(
        { name: 'HKDF', hash: 'SHA-256', salt, info: new TextEncoder().encode('Content-Encoding: aes128gcm\x00') },
        ikmKey, 128
    );
    const nonce = await crypto.subtle.deriveBits(
        { name: 'HKDF', hash: 'SHA-256', salt, info: new TextEncoder().encode('Content-Encoding: nonce\x00') },
        ikmKey, 96
    );

    const padded = new Uint8Array(payloadBytes.length + 2);
    padded.set(payloadBytes, 0);
    padded[payloadBytes.length] = 2;

    const cekKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
    const ct = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: nonce, tagLength: 128 }, cekKey, padded
    );

    const rs = new Uint8Array(4);
    new DataView(rs.buffer).setUint32(0, 4096, false);

    const out = new Uint8Array(16 + 4 + 1 + localPub.length + ct.byteLength);
    out.set(salt, 0);
    out.set(rs, 16);
    out[20] = localPub.length;
    out.set(localPub, 21);
    out.set(new Uint8Array(ct), 21 + localPub.length);
    return out;
}

export async function sendPush(env, subscription, payloadObj) {
    if (!subscription || !subscription.endpoint || !subscription.keys) {
        return { ok: false, error: 'Invalid subscription' };
    }
    if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) {
        return { ok: false, error: 'VAPID keys not configured' };
    }

    try {
        const { endpoint, keys } = subscription;
        const aud = new URL(endpoint).origin;
        const { privateKey, pubBytes } = await importVapidKeys(env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
        const jwt = await makeVapidJwt(aud, env.VAPID_SUBJECT || 'mailto:admin@rorraxy.com', privateKey);
        const body = await encryptPayload(JSON.stringify(payloadObj), keys.p256dh, keys.auth);

        const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `vapid t=${jwt}, k=${bytesToB64u(pubBytes)}`,
                'Content-Encoding': 'aes128gcm',
                'Content-Type': 'application/octet-stream',
                'TTL': '60',
                'Urgency': 'high'
            },
            body
        });

        return { ok: res.ok, status: res.status };
    } catch (e) {
        return { ok: false, error: e.message };
    }
}
