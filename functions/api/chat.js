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
        // ১. ইউজার রেজিস্ট্রেশন বা ম্যাজিক কোড লগইন হ্যান্ডলার
        if (request.method === 'POST' && action === 'login') {
            const body = await request.json();
            const { phone_number, country_code, display_name, device_ip, device_info } = body;

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
                    "UPDATE chat_master_system SET magic_code = ?, device_ip = ?, device_info = ?, is_online = 1, updated_at = CURRENT_TIMESTAMP WHERE phone_number = ? AND record_type = 'user'"
                ).bind(magicCode, device_ip || '', device_info || '', phone_number).run();
            } else {
                const inviteToken = 'INV-' + Math.random().toString(36).substring(2, 8).toUpperCase();
                const inviteLink = `https://${url.host}/invite?ref=` + inviteToken;

                await env.DB.prepare(
                    `INSERT INTO chat_master_system (id, record_type, phone_number, country_code, display_name, magic_code, device_ip, device_info, is_verified, is_online, invite_token, invite_link) 
                     VALUES (?, 'user', ?, ?, ?, ?, ?, ?, 1, 1, ?, ?)`
                ).bind(userId, phone_number, country_code || '', display_name || 'Rorraxy User', magicCode, device_ip || '', device_info || '', inviteToken, inviteLink).run();
            }

            return new Response(JSON.stringify({ success: true, message: 'Magic code generated', magic_code: magicCode }), { headers: corsHeaders });
        }

        // ২. প্রোফাইল ছবি (R2) ও নাম আপডেট হ্যান্ডলার
        if (request.method === 'POST' && action === 'update_profile') {
            const formData = await request.formData();
            const phone_number = formData.get('phone_number');
            const display_name = formData.get('display_name');
            const avatarFile = formData.get('avatar');

            let avatarUrl = null;

            if (avatarFile && typeof avatarFile === 'object') {
                const fileName = `avatar_${phone_number}_${Date.now()}.${avatarFile.name.split('.').pop()}`;
                await env.im.put(fileName, avatarFile.stream(), {
                    httpMetadata: { contentType: avatarFile.type }
                });
                avatarUrl = `https://im.rorraxy.com/${fileName}`;
            }

            await env.DB.prepare(
                `UPDATE chat_master_system 
                 SET display_name = COALESCE(?, display_name), 
                     avatar_url = COALESCE(?, avatar_url), 
                     updated_at = CURRENT_TIMESTAMP 
                 WHERE phone_number = ? AND record_type = 'user'`
            ).bind(display_name || null, avatarUrl, phone_number).run();

            return new Response(JSON.stringify({ success: true, avatar_url: avatarUrl, message: 'Profile updated successfully' }), { headers: corsHeaders });
        }

        // ৩. কন্টাক্ট অটো-সিংক হ্যান্ডলার
        if (request.method === 'POST' && action === 'sync_contacts') {
            const body = await request.json();
            const { owner_phone, contacts } = body;

            if (!owner_phone || !contacts) {
                return new Response(JSON.stringify({ success: false, error: 'Invalid data' }), { status: 400, headers: corsHeaders });
            }

            await env.DB.prepare("DELETE FROM chat_master_system WHERE record_type = 'contact' AND phone_number = ?").bind(owner_phone).run();

            for (const c of contacts) {
                const contactId = 'contact_' + Date.now() + Math.random();
                await env.DB.prepare(
                    `INSERT INTO chat_master_system (id, record_type, phone_number, contact_phone, contact_saved_name) 
                     VALUES (?, 'contact', ?, ?, ?)`
                ).bind(contactId, owner_phone, c.phone, c.name).run();
            }

            const registeredUsers = await env.DB.prepare(
                `SELECT u.phone_number, u.display_name, u.avatar_url, u.is_online, u.last_seen, c.contact_saved_name 
                 FROM chat_master_system c 
                 JOIN chat_master_system u ON c.contact_phone = u.phone_number 
                 WHERE c.phone_number = ? AND u.record_type = 'user'`
            ).bind(owner_phone).all();

            return new Response(JSON.stringify({ success: true, matched_contacts: registeredUsers.results }), { headers: corsHeaders });
        }

        // ৪. রিয়েল-টাইম মেসেজ পাঠানো (টেক্সট অথবা মিডিয়া/ছবিসহ)
        if (request.method === 'POST' && action === 'send_message') {
            const formData = await request.formData();
            const sender_phone = formData.get('sender_phone');
            const recipient_phone = formData.get('recipient_phone');
            const group_id = formData.get('group_id');
            const message_text = formData.get('message_text') || '';
            const mediaFile = formData.get('media');

            let mediaUrl = null;
            if (mediaFile && typeof mediaFile === 'object') {
                const mediaName = `chat_${sender_phone}_${Date.now()}.${mediaFile.name.split('.').pop()}`;
                await env.im.put(mediaName, mediaFile.stream(), {
                    httpMetadata: { contentType: mediaFile.type }
                });
                mediaUrl = `https://im.rorraxy.com/${mediaName}`;
            }

            const msgId = 'msg_' + Date.now();
            await env.DB.prepare(
                `INSERT INTO chat_master_system (id, record_type, phone_number, recipient_phone, group_id, message_text, message_status, avatar_url) 
                 VALUES (?, 'message', ?, ?, ?, ?, 'sent', ?)`
            ).bind(msgId, sender_phone, recipient_phone || null, group_id || null, message_text, mediaUrl).run();

            return new Response(JSON.stringify({ success: true, message_id: msgId, media_url: mediaUrl, status: 'sent' }), { headers: corsHeaders });
        }

        // ৫. চ্যাট মেসেজ হিস্ট্রি ফেচ করা (দুজন ইউজারের চ্যাট লিস্ট)
        if (request.method === 'GET' && action === 'get_messages') {
            const user1 = url.searchParams.get('user1');
            const user2 = url.searchParams.get('user2');

            const messages = await env.DB.prepare(
                `SELECT * FROM chat_master_system 
                 WHERE record_type = 'message' AND is_deleted = 0 
                 AND ((phone_number = ? AND recipient_phone = ?) OR (phone_number = ? AND recipient_phone = ?))
                 ORDER BY created_at ASC`
            ).bind(user1, user2, user2, user1).all();

            return new Response(JSON.stringify({ success: true, messages: messages.results }), { headers: corsHeaders });
        }

        // ৬. চ্যাট হিস্ট্রি ক্লিয়ার বা ডিলিট করা
        if (request.method === 'POST' && action === 'clear_chat') {
            const body = await request.json();
            const { phone_number, recipient_phone } = body;

            await env.DB.prepare(
                `UPDATE chat_master_system SET is_deleted = 1 
                 WHERE record_type = 'message' 
                 AND ((phone_number = ? AND recipient_phone = ?) OR (phone_number = ? AND recipient_phone = ?))`
            ).bind(phone_number, recipient_phone, recipient_phone, phone_number).run();

            return new Response(JSON.stringify({ success: true, message: 'Chat history cleared' }), { headers: corsHeaders });
        }

        return new Response(JSON.stringify({ success: false, error: 'Invalid action endpoint' }), { status: 400, headers: corsHeaders });

    } catch (err) {
        return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: corsHeaders });
    }
}
