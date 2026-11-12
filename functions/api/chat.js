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
        // ১. ইউজার রেজিস্ট্রেশন বা লগইন
        if (request.method === 'POST' && action === 'login') {
            const body = await request.json();
            const { phone_number, display_name } = body;

            if (!phone_number) {
                return new Response(JSON.stringify({ success: false, error: 'Phone number is required' }), { status: 400, headers: corsHeaders });
            }

            const magicCode = Math.floor(100000 + Math.random() * 900000).toString();
            const userId = 'user_' + Date.now();

            const existing = await env.DB.prepare(
                "SELECT * FROM chat_master_system WHERE record_type = 'user' AND phone_number = ?"
            ).bind(phone_number).first();

            if (existing) {
                await env.DB.prepare(
                    "UPDATE chat_master_system SET magic_code = ?, is_online = 1, updated_at = CURRENT_TIMESTAMP WHERE phone_number = ? AND record_type = 'user'"
                ).bind(magicCode, phone_number).run();
            } else {
                await env.DB.prepare(
                    `INSERT INTO chat_master_system (id, record_type, phone_number, display_name, magic_code, is_verified, is_online) 
                     VALUES (?, 'user', ?, ?, ?, 1, 1)`
                ).bind(userId, phone_number, display_name || 'Rorraxy User', magicCode).run();
            }

            return new Response(JSON.stringify({ success: true, message: 'Logged in successfully', magic_code: magicCode }), { headers: corsHeaders });
        }

        // ২. মেসেজ পাঠানো (টেক্সট এবং মিডিয়া লিংকসহ)
        if (request.method === 'POST' && action === 'send_message') {
            let sender_phone, recipient_phone, message_text, media_url;

            const contentType = request.headers.get('content-type') || '';
            if (contentType.includes('multipart/form-data')) {
                const formData = await request.formData();
                sender_phone = formData.get('sender_phone');
                recipient_phone = formData.get('recipient_phone');
                message_text = formData.get('message_text') || '';
                media_url = formData.get('media_url') || null;
            } else {
                const body = await request.json();
                sender_phone = body.sender_phone;
                recipient_phone = body.recipient_phone;
                message_text = body.message_text || '';
                media_url = body.media_url || null;
            }

            if (!sender_phone || !recipient_phone) {
                return new Response(JSON.stringify({ success: false, error: 'Sender and recipient required' }), { status: 400, headers: corsHeaders });
            }

            const msgId = 'msg_' + Date.now();
            await env.DB.prepare(
                `INSERT INTO chat_master_system (id, record_type, phone_number, recipient_phone, message_text, message_status, avatar_url) 
                 VALUES (?, 'message', ?, ?, ?, 'sent', ?)`
            ).bind(msgId, sender_phone, recipient_phone, message_text, media_url).run();

            return new Response(JSON.stringify({ success: true, message_id: msgId, status: 'sent' }), { headers: corsHeaders });
        }

        // ৩. চ্যাট হিস্ট্রি ফেচ করা
        if (request.method === 'GET' && action === 'get_messages') {
            const user1 = url.searchParams.get('user1');
            const user2 = url.searchParams.get('user2');

            if (!user1 || !user2) {
                return new Response(JSON.stringify({ success: false, error: 'Users required' }), { status: 400, headers: corsHeaders });
            }

            const messages = await env.DB.prepare(
                `SELECT * FROM chat_master_system 
                 WHERE record_type = 'message' AND is_deleted = 0 
                 AND ((phone_number = ? AND recipient_phone = ?) OR (phone_number = ? AND recipient_phone = ?))
                 ORDER BY created_at ASC`
            ).bind(user1, user2, user2, user1).all();

            return new Response(JSON.stringify({ success: true, messages: messages.results }), { headers: corsHeaders });
        }

        // ৪. চ্যাট ক্লিয়ার বা রিফ্রেশ করা
        if (request.method === 'POST' && action === 'clear_chat') {
            const body = await request.json();
            const { phone_number, recipient_phone } = body;

            await env.DB.prepare(
                `UPDATE chat_master_system SET is_deleted = 1 
                 WHERE record_type = 'message' 
                 AND ((phone_number = ? AND recipient_phone = ?) OR (phone_number = ? AND recipient_phone = ?))`
            ).bind(phone_number, recipient_phone, recipient_phone, phone_number).run();

            return new Response(JSON.stringify({ success: true, message: 'Chat cleared' }), { headers: corsHeaders });
        }

        return new Response(JSON.stringify({ success: false, error: 'Invalid action' }), { status: 400, headers: corsHeaders });

    } catch (err) {
        return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: corsHeaders });
    }
}
