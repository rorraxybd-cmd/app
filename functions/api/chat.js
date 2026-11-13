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
        // ১. ম্যাজিক কোড জেনারেট ও ডাটাবেসে সেভ
        if (request.method === 'POST' && action === 'send_magic_link') {
            const body = await request.json();
            const { display_name, phone, magic_code, ip } = body;

            if (!phone) {
                return new Response(JSON.stringify({ success: false, error: 'Phone number required' }), { status: 400, headers: corsHeaders });
            }

            const existing = await env.DB.prepare(
                "SELECT * FROM chat_master_system WHERE record_type = 'user' AND phone_number = ?"
            ).bind(phone).first();

            if (existing) {
                await env.DB.prepare(
                    "UPDATE chat_master_system SET magic_code = ?, display_name = COALESCE(?, display_name), ip_address = ?, updated_at = CURRENT_TIMESTAMP WHERE phone_number = ? AND record_type = 'user'"
                ).bind(magic_code, display_name || null, ip || '', phone).run();
            } else {
                await env.DB.prepare(
                    `INSERT INTO chat_master_system (id, record_type, phone_number, display_name, magic_code, ip_address, is_verified, is_online) 
                     VALUES (?, 'user', ?, ?, ?, ?, 0, 1)`
                ).bind('user_' + Date.now(), phone, display_name || 'rorraxy User', magic_code, ip || '').run();
            }

            return new Response(JSON.stringify({ success: true, message: 'Code generated successfully' }), { headers: corsHeaders });
        }

        // ২. কোড ও আইপি ভেরিফিকেশন কনফার্মেশন
        if (request.method === 'POST' && action === 'verify_magic_code') {
            const body = await request.json();
            const { phone, magic_code, unique_affiliate_id, ip } = body;

            await env.DB.prepare(
                `UPDATE chat_master_system 
                 SET is_verified = 1, unique_id = ?, ip_address = ?, is_online = 1, updated_at = CURRENT_TIMESTAMP 
                 WHERE phone_number = ? AND magic_code = ? AND record_type = 'user'`
            ).bind(unique_affiliate_id || 'v_id', ip || '', phone, magic_code).run();

            return new Response(JSON.stringify({ success: true, message: 'Verified successfully' }), { headers: corsHeaders });
        }

        // ৩. মেসেজ পাঠানো
        if (request.method === 'POST' && action === 'send_message') {
            const body = await request.json();
            const { sender_phone, recipient_phone, message_text, media_url } = body;

            if (!sender_phone || !recipient_phone) {
                return new Response(JSON.stringify({ success: false, error: 'Sender and recipient required' }), { status: 400, headers: corsHeaders });
            }

            const msgId = 'msg_' + Date.now();
            await env.DB.prepare(
                `INSERT INTO chat_master_system (id, record_type, phone_number, recipient_phone, message_text, message_status, avatar_url) 
                 VALUES (?, 'message', ?, ?, ?, 'sent', ?)`
            ).bind(msgId, sender_phone, recipient_phone, message_text || '', media_url || null).run();

            return new Response(JSON.stringify({ success: true, message_id: msgId }), { headers: corsHeaders });
        }

        return new Response(JSON.stringify({ success: false, error: 'Invalid action' }), { status: 400, headers: corsHeaders });

    } catch (err) {
        return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: corsHeaders });
    }
}
