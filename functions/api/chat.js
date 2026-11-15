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

    try {
        switch (action) {
            case 'get_global_users': {
                if (request.method !== 'GET') break;
                // is_verified ফিল্টারটি উঠিয়ে দেওয়া হয়েছে যাতে সব রেজিস্টার্ড ইউজার কন্টাক্ট লিস্টে শো করে
                const { results } = await env.chat.prepare(
                    "SELECT phone_number, display_name, username, avatar_url, is_online, is_live FROM chat_master_system WHERE record_type = 'user' ORDER BY updated_at DESC LIMIT 500"
                ).all();
                return jsonResponse({ success: true, users: results || [] }, corsHeaders);
            }

            case 'get_user_profile': {
                if (request.method !== 'GET') break;
                const phone = url.searchParams.get('phone');
                const user = await env.chat.prepare(
                    "SELECT display_name, username, avatar_url, is_live FROM chat_master_system WHERE record_type = 'user' AND phone_number = ?"
                ).bind(phone).first();
                return jsonResponse({ success: true, user: user || null }, corsHeaders);
            }

            case 'send_call_signal': {
                if (request.method !== 'POST') break;
                const body = await request.json();
                const { caller_phone, receiver_phone, call_type, status } = body;
                const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
                const callId = 'call_' + receiver_phone;
                
                await env.chat.prepare(
                    `INSERT OR REPLACE INTO chat_master_system (id, record_type, phone_number, recipient_phone, display_name, magic_code, is_verified, is_online, expires_at, updated_at) 
                     VALUES (?, 'call_signal', ?, ?, ?, ?, 1, 1, ?, CURRENT_TIMESTAMP)`
                ).bind(callId, caller_phone, receiver_phone, caller_phone, `${call_type}:${status}`, expiresAt).run();

                return jsonResponse({ success: true }, corsHeaders);
            }

            case 'check_call_signal': {
                if (request.method !== 'GET') break;
                const phone = url.searchParams.get('phone');
                const res = await env.chat.prepare(
                    "SELECT display_name, magic_code FROM chat_master_system WHERE record_type = 'call_signal' AND recipient_phone = ?"
                ).bind(phone).first();

                return jsonResponse({ success: true, signal: res || null }, corsHeaders);
            }

            case 'send_chat_message': {
                if (request.method !== 'POST') break;
                const body = await request.json();
                const { sender_phone, receiver_phone, message_text, media_url, message_type, file_size } = body;
                
                const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
                const payload = `${message_type || 'text'}:${message_text || ''}:${media_url || ''}`;
                const msgId = 'msg_' + Date.now() + Math.random();

                await env.chat.prepare(
                    `INSERT INTO chat_master_system (id, record_type, phone_number, recipient_phone, display_name, magic_code, message_text, media_url, message_status, file_size, expires_at, is_verified, is_online, updated_at) 
                     VALUES (?, 'chat_msg', ?, ?, ?, ?, ?, ?, 'sent', ?, ?, 1, 1, CURRENT_TIMESTAMP)`
                ).bind(
                    msgId, 
                    sender_phone, 
                    receiver_phone, 
                    sender_phone, 
                    payload, 
                    message_text || '', 
                    media_url || '', 
                    file_size || 0,
                    expiresAt
                ).run();

                return jsonResponse({ success: true, message_id: msgId }, corsHeaders);
            }

            case 'get_chat_messages': {
                if (request.method !== 'GET') break;
                const phone = url.searchParams.get('phone');
                const myPhone = url.searchParams.get('my_phone');
                
                const { results } = await env.chat.prepare(
                    `SELECT id, phone_number as sender_phone, magic_code as payload, media_url, message_text, created_at 
                     FROM chat_master_system 
                     WHERE record_type = 'chat_msg' 
                     AND datetime(expires_at) > datetime('now') 
                     AND ((phone_number = ? AND recipient_phone = ?) OR (phone_number = ? AND recipient_phone = ?)) 
                     ORDER BY updated_at ASC`
                ).bind(phone, myPhone, myPhone, phone).all();

                return jsonResponse({ success: true, messages: results || [] }, corsHeaders);
            }

            case 'delete_message': {
                if (request.method !== 'POST') break;
                const body = await request.json();
                const { message_id } = body;

                if (!message_id) {
                    return jsonResponse({ success: false, error: 'Message ID is required' }, corsHeaders, 400);
                }

                await env.chat.prepare(
                    "DELETE FROM chat_master_system WHERE id = ? AND record_type = 'chat_msg'"
                ).bind(message_id).run();

                return jsonResponse({ success: true, message: 'Message deleted from server' }, corsHeaders);
            }

            case 'download_and_delete_media': {
                if (request.method !== 'POST') break;
                const body = await request.json();
                const { message_id } = body;

                if (!message_id) {
                    return jsonResponse({ success: false, error: 'Message ID is required' }, corsHeaders, 400);
                }

                await env.chat.prepare(
                    "DELETE FROM chat_master_system WHERE id = ? AND record_type = 'chat_msg'"
                ).bind(message_id).run();

                return jsonResponse({ success: true, message: 'Downloaded and removed from server successfully' }, corsHeaders);
            }

            case 'send_magic_link': {
                if (request.method !== 'POST') break;
                const body = await request.json();
                const { display_name, phone, magic_code, ip } = body;
                const clientIp = (ip && ip !== 'Detecting...' && ip !== 'Unknown') ? ip : (request.headers.get('CF-Connecting-IP') || 'Unknown');
                const defaultUsername = 'user_' + Math.floor(1000 + Math.random() * 9000);
                const userId = 'user_' + phone;

                const existing = await env.chat.prepare(
                    "SELECT username, avatar_url FROM chat_master_system WHERE record_type = 'user' AND phone_number = ?"
                ).bind(phone).first();

                const finalUsername = existing && existing.username ? existing.username : defaultUsername;

                await env.chat.prepare(
                    `INSERT INTO chat_master_system (id, record_type, phone_number, display_name, username, magic_code, ip_address, is_verified, is_online) 
                     VALUES (?, 'user', ?, ?, ?, ?, ?, 0, 1)
                     ON CONFLICT(id) DO UPDATE SET magic_code = ?, display_name = COALESCE(?, display_name), ip_address = ?`
                ).bind(userId, phone, display_name || 'User', finalUsername, magic_code, clientIp, magic_code, display_name, clientIp).run();

                return jsonResponse({ success: true }, corsHeaders);
            }

            case 'verify_magic_code': {
                if (request.method !== 'POST') break;
                const body = await request.json();
                const { phone, magic_code, unique_id, ip, contacts_json } = body;
                const clientIp = (ip && ip !== 'Detecting...' && ip !== 'Unknown') ? ip : (request.headers.get('CF-Connecting-IP') || 'Unknown');
                const userId = 'user_' + phone;

                await env.chat.prepare(
                    `UPDATE chat_master_system 
                     SET is_verified = 1, unique_id = ?, ip_address = ?, contacts_json = ?, is_online = 1, updated_at = CURRENT_TIMESTAMP 
                     WHERE id = ? AND magic_code = ? AND record_type = 'user'`
                ).bind(unique_id || 'usr_' + Date.now(), clientIp, contacts_json || '[]', userId, magic_code).run();

                return jsonResponse({ success: true }, corsHeaders);
            }

            case 'update_profile': {
                if (request.method !== 'POST') break;
                const body = await request.json();
                const { phone, display_name, username, avatar_url } = body;
                if (phone) {
                    const userId = 'user_' + phone;
                    await env.chat.prepare(
                        `UPDATE chat_master_system 
                         SET display_name = COALESCE(?, display_name), username = COALESCE(?, username), avatar_url = COALESCE(?, avatar_url), updated_at = CURRENT_TIMESTAMP 
                         WHERE id = ? AND record_type = 'user'`
                    ).bind(display_name || null, username || null, avatar_url || null, userId).run();
                }
                return jsonResponse({ success: true }, corsHeaders);
            }

            case 'set_live_status': {
                if (request.method !== 'POST') break;
                const body = await request.json();
                const { phone, is_live } = body;
                const userId = 'user_' + phone;
                await env.chat.prepare(
                    "UPDATE chat_master_system SET is_live = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND record_type = 'user'"
                ).bind(is_live ? 1 : 0, userId).run();
                return jsonResponse({ success: true }, corsHeaders);
            }

            default:
                return jsonResponse({ success: false, error: 'Invalid action' }, corsHeaders, 400);
        }

        return jsonResponse({ success: false, error: 'Invalid request method for this action' }, corsHeaders, 405);

    } catch (err) {
        return jsonResponse({ success: false, error: err.message }, corsHeaders, 500);
    }
}

function jsonResponse(data, headers, status = 200) {
    return new Response(JSON.stringify(data), { status, headers });
}
