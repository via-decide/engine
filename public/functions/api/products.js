function json(data, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return new Response(JSON.stringify(data), { ...init, headers });
}

function badRequest(message) {
  return json({ ok: false, error: message }, { status: 400 });
}

function unauthorized() {
  return json({ ok: false, error: "Unauthorized" }, { status: 401 });
}

function normalizeCategory(cat) {
  const v = String(cat || "").trim().toLowerCase();
  if (!["smartphones", "earbuds", "laptops"].includes(v)) return null;
  return v;
}

function parseBearerToken(req) {
  const h = req.headers.get("Authorization") || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : "";
}

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === "OPTIONS") return json({ ok: true });

  const db = env.DB;
  if (!db) return json({ ok: false, error: "DB binding missing" }, { status: 500 });

  const url = new URL(request.url);

  if (request.method === "GET") {
    const category = normalizeCategory(url.searchParams.get("category"));
    if (!category) return badRequest("Invalid category. Use smartphones|earbuds|laptops");

    const { results } = await db
      .prepare(
        `SELECT category, name, price, attrs_json, dna_json, updated_at
         FROM products
         WHERE category = ?
         ORDER BY name ASC`
      )
      .bind(category)
      .all();

    const items = (results || []).map((r) => {
      let attrs = {};
      let dna = null;
      try { attrs = JSON.parse(r.attrs_json || "{}"); } catch {}
      try { dna = r.dna_json ? JSON.parse(r.dna_json) : null; } catch {}
      return {
        category: r.category,
        name: r.name,
        price: Number(r.price || 0),
        attr: attrs,
        dna,
        updatedAt: r.updated_at
      };
    });

    return json({
      ok: true,
      version: 1,
      category,
      count: items.length,
      items
    });
  }

  if (request.method === "POST") {
    const token = parseBearerToken(request);
    const adminToken = String(env.ADMIN_TOKEN || "");
    if (!adminToken || token !== adminToken) return unauthorized();

    let body;
    try {
      body = await request.json();
    } catch {
      return badRequest("Invalid JSON body");
    }

    const category = normalizeCategory(body?.category);
    if (!category) return badRequest("Invalid category");

    const replace = Boolean(body?.replace);

    const items = Array.isArray(body?.items) ? body.items : null;
    if (!items || items.length === 0) return badRequest("items[] required");

    if (replace) {
      await db.prepare(`DELETE FROM products WHERE category = ?`).bind(category).run();
    }

    const stmt = db.prepare(
      `INSERT INTO products (category, name, price, attrs_json, dna_json, updated_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(category, name) DO UPDATE SET
         price=excluded.price,
         attrs_json=excluded.attrs_json,
         dna_json=excluded.dna_json,
         updated_at=datetime('now')`
    );

    let upserted = 0;

    for (const it of items) {
      const name = String(it?.name || "").trim();
      if (!name) continue;

      const price = Number(it?.price || 0);
      const attr = it?.attr && typeof it.attr === "object" ? it.attr : {};
      const dna = it?.dna && typeof it.dna === "object" ? it.dna : null;

      await stmt
        .bind(
          category,
          name,
          Number.isFinite(price) ? Math.round(price) : 0,
          JSON.stringify(attr),
          dna ? JSON.stringify(dna) : null
        )
        .run();

      upserted++;
    }

    return json({
      ok: true,
      category,
      mode: replace ? "replace" : "upsert",
      upserted
    });
  }

  return json({ ok: false, error: "Method not allowed" }, { status: 405 });
}
