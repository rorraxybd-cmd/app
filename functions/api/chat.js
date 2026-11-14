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
                "SELECT phone_number, display_name, avatar_url, is_online FROM chat_master_system WHERE record_type = 'user' AND is_verified = 1 ORDER BY updated_at DESC LIMIT 200"
            ).all();
            return new Response(JSON.stringify({ success: true, users: results || [] }), { headers: corsHeaders });
        }

        // Handle Call Signaling & Incoming Rings
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

        if (request.method === 'GET' && action === 'check_call_signal') {
            const phone = url.searchParams.get('phone');
            const res = await env.chat.prepare(
                "SELECT display_name, magic_code FROM chat_master_system WHERE record_type = 'call_signal' AND phone_number = ?"
            ).bind(phone).first();

            return new Response(JSON.stringify({ success: true, signal: res || null }), { headers: corsHeaders });
        }

        if (request.method === 'POST' && action === 'send_magic_link') {
            const body = await request.json();
            const { display_name, phone, magic_code, ip } = body;
            const clientIp = (ip && ip !== 'Detecting...' && ip !== 'Unknown') ? ip : (request.headers.get('CF-Connecting-IP') || 'Unknown');

            await env.chat.prepare(
                `INSERT INTO chat_master_system (id, record_type, phone_number, display_name, magic_code, ip_address, is_verified, is_online) 
                 VALUES (?, 'user', ?, ?, ?, ?, 0, 1)
                 ON CONFLICT(phone_number) DO UPDATE SET magic_code = ?, display_name = COALESCE(?, display_name), ip_address = ?`
            ).bind('user_' + Date.now(), phone, display_name || 'User', magic_code, clientIp, magic_code, display_name, clientIp).run();

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

        if (request.method === 'POST' && action === 'update_avatar') {
            const body = await request.json();
            const { phone, avatar_url } = body;
            if (phone && avatar_url) {
                await env.chat.prepare(
                    "UPDATE chat_master_system SET avatar_url = ?, updated_at = CURRENT_TIMESTAMP WHERE phone_number = ? AND record_type = 'user'"
                ).bind(avatar_url, phone).run();
            }
            return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
        }

        return new Response(JSON.stringify({ success: false, error: 'Invalid action' }), { status: 400, headers: corsHeaders });

    } catch (err) {
        return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: corsHeaders });
    }
}
