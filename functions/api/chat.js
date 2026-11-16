export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    const cleanPhone = (p) => String(p || '').replace(/[\s\-\(\)\+]/g, '');

    try {
        switch (action) {
            // ১. সব ইউজার কন্টাক্ট লিস্টে অটো-সিঙ্ক করার জন্য (ডুপ্লিকেট মুক্ত)
            case 'get_global_users': {
                if (request.method !== 'GET') break;
                const { results } = await env.chat.prepare(
                    "SELECT phone_number, display_name, username, avatar_url, is_online, is_live FROM chat_master_system WHERE record_type = 'user' ORDER BY updated_at DESC LIMIT 1000"
                ).all();

                // একই নাম্বারে পুরনো ডুপ্লিকেট থাকলে শুধু লেটেস্টটি ফিল্টার করে পাঠানো
                const uniqueMap = new Map();
                (results || []).forEach(u => {
                    const p = cleanPhone(u.phone_number);
                    if (p && !uniqueMap.has(p)) {
                        uniqueMap.set(p, { ...u, phone_number: p });
                    }
                });

                return jsonResponse({ success: true, users: Array.from(uniqueMap.values()) }, corsHeaders);
            }

            // ২. নির্দিষ্ট ফোন নাম্বারে আগে থেকে অ্যাকাউন্ট আছে কি না তা চেক করা (Strict 1 Account Per Number)
            case 'get_user_profile': {
                if (request.method !== 'GET') break;
                const phone = cleanPhone(url.searchParams.get('phone'));
                if (!phone) return jsonResponse({ success: false, user: null }, corsHeaders);

                const user = await env.chat.prepare(
                    "SELECT phone_number, display_name, username, avatar_url, is_live, is_verified FROM chat_master_system WHERE record_type = 'user' AND (phone_number = ? OR phone_number = ?)"
                ).bind(phone, '+' + phone).first();

                return jsonResponse({ success: true, user: user || null }, corsHeaders);
            }

            // ৩. ওটিপি কোড পাঠানো ও ডাটাবেজে একক অ্যাকাউন্ট লক করা
            case 'send_magic_link': {
                if (request.method !== 'POST') break;
                const body = await request.json();
                const phone = cleanPhone(body.phone);
                const display_name = (body.display_name || 'User').trim();
                const magic_code = String(body.magic_code || '');
                const clientIp = (body.ip && body.ip !== 'Unknown') ? body.ip : (request.headers.get('CF-Connecting-IP') || 'Unknown');

                if (!phone) return jsonResponse({ success: false, error: 'Phone required' }, corsHeaders, 400);

                // চেক করা এই নাম্বারে আগে থেকেই কোনো অ্যাকাউন্ট আছে কি না
                const existing = await env.chat.prepare(
                    "SELECT id, display_name, username, avatar_url FROM chat_master_system WHERE record_type = 'user' AND (phone_number = ? OR phone_number = ?) LIMIT 1"
                ).bind(phone, '+' + phone).first();

                const userId = 'user_' + phone;
                const finalUsername = existing?.username || ('user_' + Math.floor(1000 + Math.random() * 9000));
                const finalName = existing?.display_name || display_name;
                const finalAvatar = existing?.avatar_url || '';

                await env.chat.prepare(
                    `INSERT INTO chat_master_system (id, record_type, phone_number, display_name, username, avatar_url, magic_code, ip_address, is_verified, is_online, updated_at) 
                     VALUES (?, 'user', ?, ?, ?, ?, ?, ?, 1, 1, CURRENT_TIMESTAMP)
                     ON CONFLICT(id) DO UPDATE SET 
                        phone_number = excluded.phone_number,
                        magic_code = excluded.magic_code,
                        ip_address = excluded.ip_address,
                        is_online = 1,
                        updated_at = CURRENT_TIMESTAMP`
                ).bind(userId, phone, finalName, finalUsername, finalAvatar, magic_code, clientIp).run();

                return jsonResponse({
                    success: true,
                    already_exists: !!existing,
                    user: {
                        phone_number: phone,
                        display_name: finalName,
                        username: finalUsername,
                        avatar_url: finalAvatar
                    }
                }, corsHeaders);
            }

            // ৪. ভেরিফাই বা প্রোফাইল আপডেট (এক নাম্বারে কখনোই দ্বিতীয় অ্যাকাউন্ট হবে না)
            case 'register_or_update_user':
            case 'update_profile': {
                if (request.method !== 'POST') break;
                const body = await request.json();
                const phone = cleanPhone(body.phone || body.phone_number);
                if (!phone) return jsonResponse({ success: false, error: 'Phone required' }, corsHeaders, 400);

                const userId = 'user_' + phone;
                const existing = await env.chat.prepare(
                    "SELECT display_name, username, avatar_url FROM chat_master_system WHERE record_type = 'user' AND (id = ? OR phone_number = ? OR phone_number = ?) LIMIT 1"
                ).bind(userId, phone, '+' + phone).first();

                const isProfileEdit = body.is_edit === true;
                const finalName = isProfileEdit
                    ? (body.name || body.display_name || existing?.display_name || 'User')
                    : (existing?.display_name || body.name || body.display_name || 'User');

                const finalUsername = isProfileEdit
                    ? (body.username || existing?.username || ('user_' + Math.floor(1000 + Math.random() * 9000)))
                    : (existing?.username || body.username || ('user_' + Math.floor(1000 + Math.random() * 9000)));

                const finalAvatar = (body.avatar !== undefined && body.avatar !== '')
                    ? body.avatar
                    : (body.avatar_url || existing?.avatar_url || '');

                await env.chat.prepare(
                    `INSERT INTO chat_master_system (id, record_type, phone_number, display_name, username, avatar_url, is_verified, is_online, updated_at) 
                     VALUES (?, 'user', ?, ?, ?, ?, 1, 1, CURRENT_TIMESTAMP)
                     ON CONFLICT(id) DO UPDATE SET 
                        phone_number = excluded.phone_number,
                        display_name = excluded.display_name,
                        username = excluded.username,
                        avatar_url = excluded.avatar_url,
                        is_verified = 1,
                        is_online = 1,
                        updated_at = CURRENT_TIMESTAMP`
                ).bind(userId, phone, finalName, finalUsername, finalAvatar).run();

                return jsonResponse({
                    success: true,
                    user: {
                        phone_number: phone,
                        display_name: finalName,
                        username: finalUsername,
                        avatar_url: finalAvatar
                    }
                }, corsHeaders);
            }

            // ৫. রিয়েল-টাইম কল সিগন্যাল পাঠানো (WebRTC Offer, Answer, ICE, Ended সহ)
            case 'send_call_signal': {
                if (request.method !== 'POST') break;
                const body = await request.json();
                const caller_phone = cleanPhone(body.caller_phone);
                const receiver_phone = cleanPhone(body.receiver_phone);
                const { call_type, status, rtc_data, timestamp } = body;

                const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
                const sigId = status === 'ice'
                    ? `call_ice_${receiver_phone}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
                    : `call_${receiver_phone}_${status}`;

                const payloadJson = JSON.stringify({
                    call_type: call_type || 'audio',
                    status: status || 'ringing',
                    rtc_data: rtc_data || null,
                    timestamp: timestamp || Date.now()
                });

                await env.chat.prepare(
                    `INSERT OR REPLACE INTO chat_master_system (id, record_type, phone_number, recipient_phone, display_name, magic_code, message_text, is_verified, is_online, expires_at, updated_at) 
                     VALUES (?, 'call_signal', ?, ?, ?, ?, ?, 1, 1, ?, CURRENT_TIMESTAMP)`
                ).bind(sigId, caller_phone, receiver_phone, caller_phone, `${call_type}:${status}`, payloadJson, expiresAt).run();

                return jsonResponse({ success: true }, corsHeaders);
            }

            // ৬. রিসিভারের জন্য ইনকামিং কল ও WebRTC সিগন্যাল চেক করা
            case 'get_call_signals':
            case 'check_call_signal': {
                if (request.method !== 'GET') break;
                const receiverPhone = cleanPhone(url.searchParams.get('receiver_phone') || url.searchParams.get('phone'));
                if (!receiverPhone) return jsonResponse({ success: true, signals: [] }, corsHeaders);

                const { results } = await env.chat.prepare(
                    `SELECT id, phone_number as caller_phone, recipient_phone, magic_code, message_text, created_at 
                     FROM chat_master_system 
                     WHERE record_type = 'call_signal' 
                     AND recipient_phone = ? 
                     AND datetime(expires_at) > datetime('now')
                     ORDER BY updated_at ASC LIMIT 25`
                ).bind(receiverPhone).all();

                const signals = (results || []).map(row => {
                    let parsed = {};
                    try { parsed = JSON.parse(row.message_text || '{}'); } catch (e) {}
                    const [cType, cStatus] = String(row.magic_code || 'audio:ringing').split(':');
                    return {
                        id: row.id,
                        caller_phone: cleanPhone(row.caller_phone),
                        receiver_phone: cleanPhone(row.recipient_phone),
                        call_type: parsed.call_type || cType || 'audio',
                        status: parsed.status || cStatus || 'ringing',
                        rtc_data: parsed.rtc_data || null,
                        timestamp: parsed.timestamp || (row.created_at ? new Date(row.created_at).getTime() : Date.now())
                    };
                });

                return jsonResponse({ success: true, signals, signal: signals[signals.length - 1] || null }, corsHeaders);
            }

            // ৭. চ্যাট মেসেজ পাঠানো (টেক্সট, অডিও, ভিডিও, PDF)
            case 'send_chat_message': {
                if (request.method !== 'POST') break;
                const body = await request.json();
                const sender_phone = cleanPhone(body.sender_phone);
                const receiver_phone = cleanPhone(body.receiver_phone);
                const { id, message_text, media_url, message_type, file_size, timestamp } = body;

                const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
                const msgId = id || ('msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6));

                await env.chat.prepare(
                    `INSERT OR REPLACE INTO chat_master_system (id, record_type, phone_number, recipient_phone, display_name, magic_code, message_text, media_url, message_status, file_size, expires_at, is_verified, is_online, updated_at) 
                     VALUES (?, 'chat_msg', ?, ?, ?, ?, ?, ?, 'sent', ?, ?, 1, 1, CURRENT_TIMESTAMP)`
                ).bind(
                    msgId,
                    sender_phone,
                    receiver_phone,
                    String(timestamp || Date.now()),
                    message_type || 'text',
                    message_text || '',
                    media_url || '',
                    file_size || 0,
                    expiresAt
                ).run();

                return jsonResponse({ success: true, message_id: msgId }, corsHeaders);
            }

            // ৮. রিয়েল-টাইম মেসেজ রিসিভ করা (উভয় প্রান্তের জন্য)
            case 'get_chat_messages': {
                if (request.method !== 'GET') break;
                const userPhone = cleanPhone(url.searchParams.get('user_phone') || url.searchParams.get('my_phone'));
                const peerPhone = cleanPhone(url.searchParams.get('peer_phone') || url.searchParams.get('phone'));

                if (!userPhone) return jsonResponse({ success: true, messages: [] }, corsHeaders);

                let queryRes;
                if (peerPhone) {
                    queryRes = await env.chat.prepare(
                        `SELECT id, phone_number as sender_phone, recipient_phone as receiver_phone, display_name as ts, magic_code as message_type, media_url, message_text, created_at 
                         FROM chat_master_system 
                         WHERE record_type = 'chat_msg' 
                         AND datetime(expires_at) > datetime('now') 
                         AND ((phone_number = ? AND recipient_phone = ?) OR (phone_number = ? AND recipient_phone = ?)) 
                         ORDER BY updated_at ASC LIMIT 200`
                    ).bind(userPhone, peerPhone, peerPhone, userPhone).all();
                } else {
                    queryRes = await env.chat.prepare(
                        `SELECT id, phone_number as sender_phone, recipient_phone as receiver_phone, display_name as ts, magic_code as message_type, media_url, message_text, created_at 
                         FROM chat_master_system 
                         WHERE record_type = 'chat_msg' 
                         AND datetime(expires_at) > datetime('now') 
                         AND (phone_number = ? OR recipient_phone = ?) 
                         ORDER BY updated_at ASC LIMIT 300`
                    ).bind(userPhone, userPhone).all();
                }

                const messages = (queryRes.results || []).map(m => ({
                    id: m.id,
                    sender_phone: cleanPhone(m.sender_phone),
                    receiver_phone: cleanPhone(m.receiver_phone),
                    message_type: m.message_type || 'text',
                    message_text: m.message_text || '',
                    media_url: m.media_url || '',
                    timestamp: Number(m.ts) || (m.created_at ? new Date(m.created_at).getTime() : Date.now())
                }));

                return jsonResponse({ success: true, messages }, corsHeaders);
            }

            // ৯. সিঙ্গেল মেসেজ ডিলিট করা
            case 'delete_message': {
                if (request.method !== 'POST') break;
                const body = await request.json();
                const { message_id } = body;
                if (!message_id) return jsonResponse({ success: false, error: 'Message ID is required' }, corsHeaders, 400);

                await env.chat.prepare(
                    "DELETE FROM chat_master_system WHERE id = ? AND record_type = 'chat_msg'"
                ).bind(message_id).run();

                return jsonResponse({ success: true }, corsHeaders);
            }

            // ----------------------------------------------------
            // ১০. অ্যাডমিন প্যানেল এন্ডপয়েন্টস (Admin Endpoints)
            // ----------------------------------------------------
            
            // অ্যাডমিন: সব রেজিস্টার্ড ইউজারের তালিকা দেখা
            case 'admin_get_all_users': {
                if (request.method !== 'GET') break;
                const { results } = await env.chat.prepare(
                    "SELECT id, phone_number, display_name, username, avatar_url, is_verified, is_online, updated_at FROM chat_master_system WHERE record_type = 'user' ORDER BY updated_at DESC"
                ).all();
                return jsonResponse({ success: true, users: results || [] }, corsHeaders);
            }

            // অ্যাডমিন: নির্দিষ্ট ইউজার বা ফেক অ্যাকাউন্ট ডিলিট করা
            case 'admin_delete_user': {
                if (request.method !== 'POST') break;
                const body = await request.json();
                const phone = cleanPhone(body.phone || body.phone_number);
                if (!phone) return jsonResponse({ success: false, error: 'Phone required' }, corsHeaders, 400);

                await env.chat.prepare(
                    "DELETE FROM chat_master_system WHERE record_type = 'user' AND (phone_number = ? OR phone_number = ?)"
                ).bind(phone, '+' + phone).run();

                return jsonResponse({ success: true, message: 'User deleted successfully' }, corsHeaders);
            }

            // অ্যাডমিন: এক ক্লিকে ডাটাবেজের সমস্ত ডুপ্লিকেট ইউজার চিরতরে মুছে ফেলা
            case 'admin_clean_duplicate_users': {
                if (request.method !== 'POST') break;
                await env.chat.prepare(
                    `DELETE FROM chat_master_system 
                     WHERE record_type = 'user' 
                     AND rowid NOT IN (
                         SELECT MAX(rowid) 
                         FROM chat_master_system 
                         WHERE record_type = 'user' 
                         GROUP BY phone_number
                     )`
                ).run();

                return jsonResponse({ success: true, message: 'All duplicate users cleaned successfully' }, corsHeaders);
            }

            default:
                return jsonResponse({ success: false, error: 'Invalid action' }, corsHeaders, 400);
        }

        return jsonResponse({ success: false, error: 'Invalid request method' }, corsHeaders, 405);
    } catch (err) {
        return jsonResponse({ success: false, error: err.message }, corsHeaders, 500);
    }
}

function jsonResponse(data, headers, status = 200) {
    return new Response(JSON.stringify(data), { status, headers });
}
