function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    }
  });
}

export async function onRequest(context) {
  const { request, env } = context;
  const db = env.DB;

  if (!db) return json({ ok: false, error: "DB binding missing" }, 500);

  const url = new URL(request.url);
  const pairId = url.searchParams.get("pairId");

  if (!pairId) {
    return json({ ok: false, error: "Missing pairId" }, 400);
  }

  const { results } = await db.prepare(`
    SELECT id, kind, status, youtube_url, error, updated_at
    FROM video_jobs
    WHERE pair_id = ?
    ORDER BY kind ASC
  `).bind(pairId).all();

  return json({
    ok: true,
    pairId,
    jobs: results || []
  });
}
