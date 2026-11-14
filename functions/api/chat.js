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
        if (request.method === 'GET' && action === 'get_global_users') {
            const { results } = await env.chat.prepare(
                "SELECT phone_number, display_name, username, avatar_url, is_online, is_live FROM chat_master_system WHERE record_type = 'user' AND is_verified = 1 ORDER BY updated_at DESC LIMIT 500"
            ).all();
            return new Response(JSON.stringify({ success: true, users: results || [] }), { headers: corsHeaders });
        }

        if (request.method === 'GET' && action === 'get_user_profile') {
            const phone = url.searchParams.get('phone');
            const user = await env.chat.prepare(
                "SELECT display_name, username, avatar_url, is_live FROM chat_master_system WHERE record_type = 'user' AND phone_number = ?"
            ).bind(phone).first();
            return new Response(JSON.stringify({ success: true, user: user || null }), { headers: corsHeaders });
        }

        if (request.method === 'POST' && action === 'send_call_signal') {
            const body = await request.json();
            const { caller_phone, receiver_phone, call_type, status } = body;
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
            const callId = 'call_' + receiver_phone;
            
            await env.chat.prepare(
                `INSERT OR REPLACE INTO chat_master_system (id, record_type, phone_number, recipient_phone, display_name, magic_code, is_verified, is_online, expires_at, updated_at) 
                 VALUES (?, 'call_signal', ?, ?, ?, ?, 1, 1, ?, CURRENT_TIMESTAMP)`
            ).bind(callId, caller_phone, receiver_phone, caller_phone, `${call_type}:${status}`, expiresAt).run();

            return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
        }

        if (request.method === 'GET' && action === 'check_call_signal') {
            const phone = url.searchParams.get('phone');
            const res = await env.chat.prepare(
                "SELECT display_name, magic_code FROM chat_master_system WHERE record_type = 'call_signal' AND recipient_phone = ?"
            ).bind(phone).first();

            return new Response(JSON.stringify({ success: true, signal: res || null }), { headers: corsHeaders });
        }

        if (request.method === 'POST' && action === 'send_chat_message') {
            const body = await request.json();
            const { sender_phone, receiver_phone, message_text, media_url, message_type, file_size } = body;
            
            const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
            const payload = `${message_type || 'text'}:${message_text || ''}:${media_url || ''}`;

            await env.chat.prepare(
                `INSERT INTO chat_master_system (id, record_type, phone_number, recipient_phone, display_name, magic_code, message_text, media_url, message_status, file_size, expires_at, is_verified, is_online, updated_at) 
                 VALUES (?, 'chat_msg', ?, ?, ?, ?, ?, ?, 'sent', ?, ?, 1, 1, CURRENT_TIMESTAMP)`
            ).bind(
                'msg_' + Date.now() + Math.random(), 
                sender_phone, 
                receiver_phone, 
                sender_phone, 
                payload, 
                message_text || '', 
                media_url || '', 
                file_size || 0,
                expiresAt
            ).run();

            return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
        }

        if (request.method === 'GET' && action === 'get_chat_messages') {
            const phone = url.searchParams.get('phone');
            const myPhone = url.searchParams.get('my_phone');
            
            const { results } = await env.chat.prepare(
                "SELECT phone_number as sender_phone, magic_code as payload, media_url, message_text, created_at FROM chat_master_system WHERE record_type = 'chat_msg' AND ((phone_number = ? AND recipient_phone = ?) OR (phone_number = ? AND recipient_phone = ?)) ORDER BY updated_at ASC"
            ).bind(phone, myPhone, myPhone, phone).all();

            return new Response(JSON.stringify({ success: true, messages: results || [] }), { headers: corsHeaders });
        }

        if (request.method === 'POST' && action === 'send_magic_link') {
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

            return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
        }

        if (request.method === 'POST' && action === 'verify_magic_code') {
            const body = await request.json();
            const { phone, magic_code, unique_id, ip, contacts_json } = body;
            const clientIp = (ip && ip !== 'Detecting...' && ip !== 'Unknown') ? ip : (request.headers.get('CF-Connecting-IP') || 'Unknown');
            const userId = 'user_' + phone;

            await env.chat.prepare(
                `UPDATE chat_master_system 
                 SET is_verified = 1, unique_id = ?, ip_address = ?, contacts_json = ?, is_online = 1, updated_at = CURRENT_TIMESTAMP 
                 WHERE id = ? AND magic_code = ? AND record_type = 'user'`
            ).bind(unique_id || 'usr_' + Date.now(), clientIp, contacts_json || '[]', userId, magic_code).run();

            return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
        }

        if (request.method === 'POST' && action === 'update_profile') {
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
            return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
        }

        if (request.method === 'POST' && action === 'set_live_status') {
            const body = await request.json();
            const { phone, is_live } = body;
            const userId = 'user_' + phone;
            await env.chat.prepare(
                "UPDATE chat_master_system SET is_live = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND record_type = 'user'"
            ).bind(is_live ? 1 : 0, userId).run();
            return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
        }

        return new Response(JSON.stringify({ success: false, error: 'Invalid action' }), { status: 400, headers: corsHeaders });

    } catch (err) {
        return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: corsHeaders });
    }
}
