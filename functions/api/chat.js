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
                const { results } = await env.chat.prepare(
                    "SELECT phone_number, display_name, username, avatar_url, is_online, is_live FROM chat_master_system WHERE record_type = 'user' AND is_verified = 1 ORDER BY updated_at DESC LIMIT 500"
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
                const { caller_phone, receiver_phone, call_type, status, rtc_data } = body;
                const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
                const callId = 'call_' + receiver_phone;
                const signalPayload = JSON.stringify({ caller: caller_phone, type: call_type, status, rtc: rtc_data || null, ts: Date.now() });

                await env.chat.prepare(
                    `INSERT OR REPLACE INTO chat_master_system (id, record_type, phone_number, recipient_phone, display_name, magic_code, is_verified, is_online, expires_at, updated_at) 
                     VALUES (?, 'call_signal', ?, ?, ?, ?, 1, 1, ?, CURRENT_TIMESTAMP)`
                ).bind(callId, caller_phone, receiver_phone, caller_phone, signalPayload, expiresAt).run();

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
                const { sender_phone, receiver_phone, message_text, media_url, message_type } = body;
                
                const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
                const payload = `${message_type || 'text'}:${message_text || ''}:${media_url || ''}`;
                const msgId = 'msg_' + Date.now() + '_' + Math.random();

                await env.chat.prepare(
                    `INSERT INTO chat_master_system (id, record_type, phone_number, recipient_phone, display_name, magic_code, message_text, media_url, message_status, expires_at, is_verified, is_online, updated_at) 
                     VALUES (?, 'chat_msg', ?, ?, ?, ?, ?, ?, 'sent', ?, 1, 1, CURRENT_TIMESTAMP)`
                ).bind(
                    msgId, sender_phone, receiver_phone, sender_phone, payload, 
                    message_text || '', media_url || '', expiresAt
                ).run();

                return jsonResponse({ success: true, message_id: msgId }, corsHeaders);
            }

            case 'get_chat_messages': {
                if (request.method !== 'GET') break;
                const phone = url.searchParams.get('phone');
                const myPhone = url.searchParams.get('my_phone');
                
                const { results } = await env.chat.prepare(
                    "SELECT id, phone_number as sender_phone, magic_code as payload, media_url, message_text, created_at FROM chat_master_system WHERE record_type = 'chat_msg' AND ((phone_number = ? AND recipient_phone = ?) OR (phone_number = ? AND recipient_phone = ?)) ORDER BY updated_at ASC"
                ).bind(phone, myPhone, myPhone, phone).all();

                return jsonResponse({ success: true, messages: results || [] }, corsHeaders);
            }

            case 'clear_chat_history': {
                if (request.method !== 'POST') break;
                const body = await request.json();
                const { sender_phone, receiver_phone } = body;

                await env.chat.prepare(
                    "DELETE FROM chat_master_system WHERE record_type = 'chat_msg' AND ((phone_number = ? AND recipient_phone = ?) OR (phone_number = ? AND recipient_phone = ?))"
                ).bind(sender_phone, receiver_phone, receiver_phone, sender_phone).run();

                return jsonResponse({ success: true }, corsHeaders);
            }

            case 'delete_single_message': {
                if (request.method !== 'POST') break;
                const body = await request.json();
                const { message_id } = body;

                if (message_id) {
                    await env.chat.prepare(
                        "DELETE FROM chat_master_system WHERE id = ?"
                    ).bind(message_id).run();
                }
                return jsonResponse({ success: true }, corsHeaders);
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
