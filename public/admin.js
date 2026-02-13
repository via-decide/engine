function $(id) { return document.getElementById(id); }

function log(msg, type = "info") {
  const el = $("log");
  const prefix =
    type === "ok" ? "✅ " :
    type === "err" ? "❌ " :
    "ℹ️ ";
  el.innerHTML = "";
  const span = document.createElement("span");
  span.className = type === "ok" ? "ok" : type === "err" ? "err" : "";
  span.textContent = prefix + String(msg);
  el.appendChild(span);
}

function safeParseJSON(text) {
  try {
    const data = JSON.parse(text);
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

function validateItems(category, items) {
  if (!Array.isArray(items)) return { ok: false, error: "JSON must be an array of items." };
  if (items.length === 0) return { ok: false, error: "Array is empty." };

  const requiredKeys =
    category === "smartphones" ? ["cam", "gam", "bat", "val"] :
    category === "earbuds" ? ["snd", "anc", "mic"] :
    ["perf", "port", "scr"];

  let validCount = 0;

  for (const [idx, it] of items.entries()) {
    const name = String(it?.name || "").trim();
    if (!name) return { ok: false, error: `Item[${idx}] missing "name".` };

    const price = Number(it?.price ?? 0);
    if (!Number.isFinite(price) || price < 0) {
      return { ok: false, error: `Item[${idx}] invalid "price".` };
    }

    const attr = it?.attr;
    if (!attr || typeof attr !== "object") {
      return { ok: false, error: `Item[${idx}] missing "attr" object.` };
    }

    for (const k of requiredKeys) {
      const v = Number(attr[k] ?? 0);
      if (!Number.isFinite(v)) return { ok: false, error: `Item[${idx}] attr.${k} must be a number.` };
    }

    validCount++;
  }

  return { ok: true, count: validCount, requiredKeys };
}

async function apiGet(category) {
  const res = await fetch(`/api/products?category=${encodeURIComponent(category)}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  return data;
}

async function apiUpsert(category, token, items, { replace = false } = {}) {
  const res = await fetch(`/api/products`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ category, items, replace })
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  return data;
}

function seedTemplate(category) {
  if (category === "smartphones") {
    return JSON.stringify([
      { "name": "Samsung Galaxy S26 Ultra", "price": 129999, "attr": { "cam": 10, "gam": 9, "bat": 9, "val": 7 }, "dna": { "dominance":"Productivity King", "tech_edge":"S-Pen + AI" } },
      { "name": "iPhone 17 Pro", "price": 139999, "attr": { "cam": 9, "gam": 8, "bat": 7, "val": 6 }, "dna": { "dominance":"Video Standard", "tech_edge":"A19 Pro" } },
      { "name": "OnePlus 14", "price": 74999, "attr": { "cam": 8, "gam": 9, "bat": 10, "val": 9 }, "dna": { "dominance":"Battery King", "tech_edge":"Si/C Battery" } }
    ], null, 2);
  }
  if (category === "earbuds") {
    return JSON.stringify([
      { "name": "Sony WF-1000XM6", "price": 24999, "attr": { "snd": 10, "anc": 10, "mic": 9 }, "dna": { "dominance":"Silence King", "tech_edge":"Dual V2 Processor" } },
      { "name": "AirPods Pro 3", "price": 26999, "attr": { "snd": 9, "anc": 9, "mic": 9 }, "dna": { "dominance":"Ecosystem King", "tech_edge":"H3 Chip" } }
    ], null, 2);
  }
  return JSON.stringify([
    { "name": "MacBook Air M3", "price": 99999, "attr": { "perf": 9, "port": 10, "scr": 8 }, "dna": { "dominance":"Student Default", "tech_edge":"Apple Silicon" } },
    { "name": "Zephyrus G14", "price": 159999, "attr": { "perf": 10, "port": 8, "scr": 10 }, "dna": { "dominance":"Portable Gaming", "tech_edge":"OLED Nebula" } }
  ], null, 2);
}

function requireDangerConfirm(category) {
  const expected = `WIPE ${category}`;
  const typed = window.prompt(
    `This will DELETE ALL items in "${category}" then replace.\n\nType exactly:\n${expected}`
  );
  return typed === expected;
}

function init() {
  const catEl = $("category");
  const tokenEl = $("token");
  const jsonEl = $("json");

  $("btn-seed").addEventListener("click", () => {
    jsonEl.value = seedTemplate(catEl.value);
    log("Template inserted. Edit and upsert.", "ok");
  });

  $("btn-validate").addEventListener("click", () => {
    const parsed = safeParseJSON(jsonEl.value.trim());
    if (!parsed.ok) return log(`JSON parse error: ${parsed.error}`, "err");

    const v = validateItems(catEl.value, parsed.data);
    if (!v.ok) return log(v.error, "err");

    log(`Valid ✅ Items: ${v.count}. Required keys: ${v.requiredKeys.join(", ")}`, "ok");
  });

  $("btn-preview").addEventListener("click", async () => {
    try {
      log("Fetching current DB…");
      const data = await apiGet(catEl.value);
      const top = (data.items || []).slice(0, 10).map(x => `${x.name} — ₹${x.price}`).join("\n");
      log(`OK ✅ Count: ${data.count}\nMode: GET\n\nTop 10:\n${top || "(no items)"}`, "ok");
    } catch (e) {
      log(`Preview error: ${e.message}`, "err");
    }
  });

  $("btn-upload").addEventListener("click", async () => {
    const token = tokenEl.value.trim();
    if (!token) return log("Missing ADMIN_TOKEN.", "err");

    const parsed = safeParseJSON(jsonEl.value.trim());
    if (!parsed.ok) return log(`JSON parse error: ${parsed.error}`, "err");

    const v = validateItems(catEl.value, parsed.data);
    if (!v.ok) return log(v.error, "err");

    try {
      log("Uploading (upsert)…");
      const resp = await apiUpsert(catEl.value, token, parsed.data, { replace: false });
      log(`Upsert OK ✅ Category: ${resp.category} • Upserted: ${resp.upserted}`, "ok");
    } catch (e) {
      log(`Upload error: ${e.message}`, "err");
    }
  });

  $("btn-replace").addEventListener("click", async () => {
    const category = catEl.value;
    const token = tokenEl.value.trim();
    if (!token) return log("Missing ADMIN_TOKEN.", "err");

    const parsed = safeParseJSON(jsonEl.value.trim());
    if (!parsed.ok) return log(`JSON parse error: ${parsed.error}`, "err");

    const v = validateItems(category, parsed.data);
    if (!v.ok) return log(v.error, "err");

    if (!requireDangerConfirm(category)) {
      return log("Cancelled (confirmation mismatch).", "err");
    }

    try {
      log(`Replacing category "${category}"…`);
      const resp = await apiUpsert(category, token, parsed.data, { replace: true });
      log(`Replace OK ✅ Category: ${resp.category} • Upserted: ${resp.upserted} • Mode: ${resp.mode}`, "ok");
    } catch (e) {
      log(`Replace error: ${e.message}`, "err");
    }
  });

  jsonEl.value = seedTemplate(catEl.value);
  catEl.addEventListener("change", () => {
    jsonEl.value = seedTemplate(catEl.value);
    log(`Template switched to ${catEl.value}.`, "ok");
  });

  log("Ready. Paste token + upsert.", "ok");
}

init();
