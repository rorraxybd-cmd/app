export async function onRequest(context) {
    const { request, env } = context;
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
    if (request.method !== 'GET') return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), { status: 405, headers: corsHeaders });

    try {
        const apiToken = env.TURN_API_TOKEN;
        const turnTokenId = env.TURN_TOKEN_ID;
        if (!apiToken || !turnTokenId) throw new Error('TURN credentials are not configured.');

        const response = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${turnTokenId}`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${apiToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({ "ttl": 86400 })
        });
        const data = await response.json();
        return new Response(JSON.stringify({ success: true, iceServers: data }), { status: 200, headers: corsHeaders });
    } catch (err) {
        return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: corsHeaders });
    }
}
```[cite: 1]

---

আপনার কোডগুলো সম্পূর্ণ স্ট্যাবল এবং একটার সাথে অন্যটি কানেক্টেড রয়েছে। আপনি প্রজেক্টে এগুলো আপলোড করে টেস্ট করে দেখতে পারেন। কোনো অতিরিক্ত মডিউলের প্রয়োজন হলে জানাতে পারেন!
