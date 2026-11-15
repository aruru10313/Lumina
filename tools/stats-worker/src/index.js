// Lumina download-click counter (Cloudflare Worker + KV).
//
// The site sends POST /hit?v=<mc version>&b=<build> when someone presses a download button.
// Only counts, no personal data: no IP address, cookie or user agent is stored.
//
// KV keys:  v:<version>         total clicks for a version
//           d:<YYYY-MM-DD>      clicks on that day (UTC)
//           vd:<YYYY-MM-DD>:<v> clicks for a version on that day
//
// GET /stats returns everything as JSON.

const ALLOWED_ORIGINS = ["https://lumina.aruru.kr", "https://aruru10313.github.io"];
const BOT_UA = /bot|crawl|spider|slurp|curl|wget|python|httpclient|java\/|go-http|headless|phantom|scrapy|monitor|preview/i;

function cors(origin) {
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
}

async function bump(kv, key) {
  // KV has no atomic increment; good enough for low-volume click counting.
  const cur = parseInt((await kv.get(key)) || "0", 10);
  await kv.put(key, String(cur + 1));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";
    const headers = cors(origin);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }

    if (url.pathname === "/hit" && request.method === "POST") {
      if (!ALLOWED_ORIGINS.includes(origin)) {
        return new Response("forbidden", { status: 403, headers });
      }
      const ua = request.headers.get("User-Agent") || "";
      if (!ua || BOT_UA.test(ua)) {
        return new Response(null, { status: 204, headers }); // silently ignore bots
      }
      const v = url.searchParams.get("v") || "";
      if (!/^\d{1,2}(\.\d{1,2}){1,2}$/.test(v)) {
        return new Response("bad version", { status: 400, headers });
      }
      const day = new Date().toISOString().slice(0, 10);
      await Promise.all([
        bump(env.STATS, `v:${v}`),
        bump(env.STATS, `d:${day}`),
        bump(env.STATS, `vd:${day}:${v}`),
      ]);
      return new Response(null, { status: 204, headers });
    }

    if (url.pathname === "/stats" && request.method === "GET") {
      const out = { total: 0, versions: {}, days: {}, versionDays: {} };
      let cursor;
      do {
        const page = await env.STATS.list({ cursor });
        for (const k of page.keys) {
          const n = parseInt((await env.STATS.get(k.name)) || "0", 10);
          if (k.name.startsWith("v:")) {
            out.versions[k.name.slice(2)] = n;
            out.total += n;
          } else if (k.name.startsWith("d:")) {
            out.days[k.name.slice(2)] = n;
          } else if (k.name.startsWith("vd:")) {
            out.versionDays[k.name.slice(3)] = n;
          }
        }
        cursor = page.list_complete ? undefined : page.cursor;
      } while (cursor);
      return new Response(JSON.stringify(out, null, 2), {
        headers: { ...headers, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
      });
    }

    return new Response("Lumina stats", { status: 404, headers });
  },
};
