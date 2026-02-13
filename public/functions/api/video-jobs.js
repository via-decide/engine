function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}

function uid(prefix) {
  return prefix + "-" + Math.random().toString(36).slice(2, 10).toUpperCase();
}

export async function onRequest(context) {
  const { request, env } = context;
  const db = env.DB;

  if (!db) return json({ ok: false, error: "DB binding missing" }, 500);
  if (request.method === "OPTIONS") return json({ ok: true });
  if (request.method !== "POST") return json({ ok: false }, 405);

  const body = await request.json();

  if (!body || !body.topic) {
    return json({ ok: false, error: "Missing topic" }, 400);
  }

  const pairId = uid("PAIR");
  const problemId = uid("PROB");
  const solutionId = uid("SOLN");

  const basePayload = {
    ...body,
    pairId,
    createdAt: Date.now()
  };

  const insert = db.prepare(`
    INSERT INTO video_jobs
    (id, kind, pair_id, visibility, title, description, payload_json, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'queued', datetime('now'), datetime('now'))
  `);

  // PROBLEM VIDEO
  await insert.bind(
    problemId,
    "problem",
    pairId,
    "public",
    `PROBLEM • ${body.topic}`,
    `Problem analysis for ${body.topic}`,
    JSON.stringify({ ...basePayload, kind: "problem" })
  ).run();

  // SOLUTION VIDEO
  await insert.bind(
    solutionId,
    "solution",
    pairId,
    "public",
    `SOLUTION • ${body.topic}`,
    `Final verdict for ${body.topic}`,
    JSON.stringify({ ...basePayload, kind: "solution" })
  ).run();

  return json({
    ok: true,
    pairId,
    jobs: [
      { id: problemId, kind: "problem" },
      { id: solutionId, kind: "solution" }
    ]
  });
}
