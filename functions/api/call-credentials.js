export async function onRequest(context) {
    const { request, env } = context;

    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== 'GET') {
        return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), { status: 405, headers: corsHeaders });
    }

    try {
        // ক্লাউডফ্লেয়ার ড্যাশবোর্ডে সেভ করা TURN সিক্রেট টোকেন ও আইডি কল করা
        const apiToken = env.TURN_API_TOKEN;
        const turnTokenId = env.TURN_TOKEN_ID;

        if (!apiToken || !turnTokenId) {
            throw new Error('TURN credentials are not configured in environment variables.');
        }

        // ক্লাউডফ্লেয়ার টার্ন এপিআই থেকে সাময়িক ক্রেডেনশিয়াল জেনারেট করা (২৪ ঘণ্টার মেয়াদ)
        const response = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${turnTokenId}`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ "ttl": 86400 })
        });

        const data = await response.json();

        return new Response(JSON.stringify({ success: true, iceServers: data }), {
            status: 200,
            headers: corsHeaders
        });

    } catch (err) {
        return new Response(JSON.stringify({ success: false, error: err.message }), {
            status: 500,
            headers: corsHeaders
        });
    }
}
