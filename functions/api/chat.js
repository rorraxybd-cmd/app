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
                "SELECT phone_number, display_name, username, avatar_url, is_online FROM chat_master_system WHERE record_type = 'user' AND is_verified = 1 ORDER BY updated_at DESC LIMIT 200"
            ).all();
            return new Response(JSON.stringify({ success: true, users: results || [] }), { headers: corsHeaders });
        }

        // Get Existing User Profile by Phone (Account Recovery on Re-login)
        if (request.method === 'GET' && action === 'get_user_profile') {
            const phone = url.searchParams.get('phone');
            const user = await env.chat.prepare(
                "SELECT display_name, username, avatar_url FROM chat_master_system WHERE record_type = 'user' AND phone_number = ?"
            ).bind(phone).first();
            return new Response(JSON.stringify({ success: true, user: user || null }), { headers: corsHeaders });
        }

        // Send Call Signal
        if (request.method === 'POST' && action === 'send_call_signal') {
            const body = await request.json();
            const { caller_phone, receiver_phone, call_type, status } = body;
            
            await env.chat.prepare(
                `INSERT INTO chat_master_system (id, record_type, phone_number, display_name, magic_code, is_verified, is_online, updated_at) 
                 VALUES (?, 'call_signal', ?, ?, ?, 1, 1, CURRENT_TIMESTAMP)
                 ON CONFLICT(phone_number) DO UPDATE SET display_name = ?, magic_code = ?, updated_at = CURRENT_TIMESTAMP`
            ).bind('call_' + receiver_phone, receiver_phone, caller_phone, `${call_type}:${status}`, caller_phone, `${call_type}:${status}`).run();

            return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
        }

        // Check Call Signal
        if (request.method === 'GET' && action === 'check_call_signal') {
            const phone = url.searchParams.get('phone');
            const res = await env.chat.prepare(
                "SELECT display_name, magic_code FROM chat_master_system WHERE record_type = 'call_signal' AND phone_number = ?"
            ).bind(phone).first();

            return new Response(JSON.stringify({ success: true, signal: res || null }), { headers: corsHeaders });
        }

        // Send Chat Message to D1 Database
        if (request.method === 'POST' && action === 'send_chat_message') {
            const body = await request.json();
            const { sender_phone, receiver_phone, message_text, media_url, message_type } = body;
            
            await env.chat.prepare(
                `INSERT INTO chat_master_system (id, record_type, phone_number, display_name, magic_code, is_verified, is_online, updated_at) 
                 VALUES (?, 'chat_msg', ?, ?, ?, 1, 1, CURRENT_TIMESTAMP)`
            ).bind('msg_' + Date.now() + Math.random(), receiver_phone, sender_phone, `${message_type || 'text'}:${message_text || ''}:${media_url || ''}`).run();

            return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
        }

        // Get Chat Messages from D1 Database
        if (request.method === 'GET' && action === 'get_chat_messages') {
            const phone = url.searchParams.get('phone');
            const { results } = await env.chat.prepare(
                "SELECT display_name as sender_phone, magic_code as payload FROM chat_master_system WHERE record_type = 'chat_msg' AND phone_number = ? ORDER BY updated_at ASC"
            ).bind(phone).all();

            return new Response(JSON.stringify({ success: true, messages: results || [] }), { headers: corsHeaders });
        }

        if (request.method === 'POST' && action === 'send_magic_link') {
            const body = await request.json();
            const { display_name, phone, magic_code, ip } = body;
            const clientIp = (ip && ip !== 'Detecting...' && ip !== 'Unknown') ? ip : (request.headers.get('CF-Connecting-IP') || 'Unknown');
            const defaultUsername = 'user_' + Math.floor(1000 + Math.random() * 9000);

            const existing = await env.chat.prepare(
                "SELECT username, avatar_url FROM chat_master_system WHERE record_type = 'user' AND phone_number = ?"
            ).bind(phone).first();

            const finalUsername = existing && existing.username ? existing.username : defaultUsername;

            await env.chat.prepare(
                `INSERT INTO chat_master_system (id, record_type, phone_number, display_name, username, magic_code, ip_address, is_verified, is_online) 
                 VALUES (?, 'user', ?, ?, ?, ?, ?, 0, 1)
                 ON CONFLICT(phone_number) DO UPDATE SET magic_code = ?, display_name = COALESCE(?, display_name), ip_address = ?`
            ).bind('user_' + Date.now(), phone, display_name || 'User', finalUsername, magic_code, clientIp, magic_code, display_name, clientIp).run();

            return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
        }

        if (request.method === 'POST' && action === 'verify_magic_code') {
            const body = await request.json();
            const { phone, magic_code, unique_id, ip, contacts_json } = body;
            const clientIp = (ip && ip !== 'Detecting...' && ip !== 'Unknown') ? ip : (request.headers.get('CF-Connecting-IP') || 'Unknown');

            await env.chat.prepare(
                `UPDATE chat_master_system 
                 SET is_verified = 1, unique_id = ?, ip_address = ?, contacts_json = ?, is_online = 1, updated_at = CURRENT_TIMESTAMP 
                 WHERE phone_number = ? AND magic_code = ? AND record_type = 'user'`
            ).bind(unique_id || 'usr_' + Date.now(), clientIp, contacts_json || '[]', phone, magic_code).run();

            return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
        }

        if (request.method === 'POST' && action === 'update_profile') {
            const body = await request.json();
            const { phone, display_name, username, avatar_url } = body;
            if (phone) {
                await env.chat.prepare(
                    `UPDATE chat_master_system 
                     SET display_name = COALESCE(?, display_name), username = COALESCE(?, username), avatar_url = COALESCE(?, avatar_url), updated_at = CURRENT_TIMESTAMP 
                     WHERE phone_number = ? AND record_type = 'user'`
                ).bind(display_name || null, username || null, avatar_url || null, phone).run();
            }
            return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
        }

        return new Response(JSON.stringify({ success: false, error: 'Invalid action' }), { status: 400, headers: corsHeaders });

    } catch (err) {
        return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: corsHeaders });
    }
}
