function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}

export async function onRequest(context) {
  const { request, env } = context;
  const db = env.DB;

  if (!db) return json({ ok: false, error: "DB binding missing" }, 500);
  if (request.method === "OPTIONS") return json({ ok: true });

  const url = new URL(request.url);

  // ======================
  // GET PRODUCTS
  // ======================
  if (request.method === "GET") {
    const category = url.searchParams.get("category");

    if (!category) {
      return json({ ok: false, error: "Missing category" }, 400);
    }

    const { results } = await db.prepare(
      `SELECT * FROM products WHERE category = ? ORDER BY name ASC`
    ).bind(category).all();

    return json({
      ok: true,
      items: (results || []).map(row => ({
        name: row.name,
        price: row.price,
        attr: JSON.parse(row.attrs_json),
        dna: row.dna_json ? JSON.parse(row.dna_json) : null,
        updated_at: row.updated_at
      }))
    });
  }

  // ======================
  // UPSERT PRODUCTS
  // ======================
  if (request.method === "POST") {
    const body = await request.json();
    const { category, items, replace } = body;

    if (!category || !Array.isArray(items)) {
      return json({ ok: false, error: "Invalid payload" }, 400);
    }

    if (replace) {
      await db.prepare(
        `DELETE FROM products WHERE category = ?`
      ).bind(category).run();
    }

    const stmt = db.prepare(`
      INSERT INTO products
      (category, name, price, attrs_json, dna_json, updated_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(category, name) DO UPDATE SET
        price = excluded.price,
        attrs_json = excluded.attrs_json,
        dna_json = excluded.dna_json,
        updated_at = datetime('now')
    `);

    for (const item of items) {
      await stmt.bind(
        category,
        item.name,
        Number(item.price || 0),
        JSON.stringify(item.attr || {}),
        item.dna ? JSON.stringify(item.dna) : null
      ).run();
    }

    return json({ ok: true, count: items.length });
  }

  return json({ ok: false }, 405);
}
