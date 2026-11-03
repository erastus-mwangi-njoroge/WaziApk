/**
 * WAZI backend — plain Node.js (no npm dependencies required).
 * Serves the REST API under /api/*, static web app from ../web,
 * and uploaded images from /uploads/*.
 *
 * Run:  node server.js
 * Env:  PORT (default 4000)
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { URL } = require("url");

const PORT = process.env.PORT || 4000;
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
const DB_FILE = path.join(DATA_DIR, "db.json");
const WEB_DIR = path.join(ROOT, "..", "web");
const MAX_BODY_BYTES = 20 * 1024 * 1024; // 20MB cap per request

fs.mkdirSync(UPLOADS_DIR, { recursive: true });

/* ---------------------------------------------------------------- */
/* Tiny JSON "database"                                              */
/* ---------------------------------------------------------------- */
function loadDB() {
  if (!fs.existsSync(DB_FILE)) {
    const initial = { users: [], sessions: [], listings: [], preferences: [], notifications: [] };
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2));
    return initial;
  }
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
  } catch (e) {
    console.error("DB file corrupted, starting fresh:", e.message);
    return { users: [], sessions: [], listings: [], preferences: [], notifications: [] };
  }
}
let db = loadDB();
function saveDB() {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

function seedIfNeeded() {
  if (db.listings.length) return;
  const ownerId = "seed_owner";
  if (!db.users.find((u) => u.id === ownerId)) {
    db.users.push({
      id: ownerId,
      name: "WAZI Verified Partner",
      email: "partner@wazi.demo",
      phone: "0700 000 000",
      role: "owner",
      passwordHash: hashPassword("demo-password-not-usable"),
      joined: new Date().toISOString(),
    });
  }
  const AMENITY_SETS = [
    { school: 0.6, hospital: 1.1, police: 1.4, industry: 2.0, road: 0.1, roadType: "Tarmac", water: "Piped", electricity: true },
    { school: 0.4, hospital: 2.3, police: 2.0, industry: 3.5, road: 0.0, roadType: "Tarmac", water: "Piped", electricity: true },
    { school: 1.2, hospital: 3.0, police: 4.0, industry: 8.0, road: 0.5, roadType: "Murram", water: "Tank", electricity: true },
    { school: 0.9, hospital: 2.4, police: 3.1, industry: 5.0, road: 0.1, roadType: "Tarmac", water: "Piped", electricity: true },
  ];
  const SEED = [
    ["Sunny bedsitter near Kilimani stage", "Bedsitter", "Nairobi — Kilimani", 11000, 0],
    ["Spacious 2 bedroom, own gate", "Two Bedroom", "Nairobi — Rongai", 22000, 1],
    ["Own compound bungalow with garden", "Own Compound", "Kitengela", 45000, 2],
    ["Cosy double room, Nyali breeze", "Double Room", "Mombasa — Nyali", 9000, 3],
  ];
  for (const [title, type, town, price, ai] of SEED) {
    const a = AMENITY_SETS[ai];
    db.listings.push({
      id: uid("lst"),
      ownerId,
      ownerName: "WAZI Verified Partner",
      ownerPhone: "0700 000 000",
      title,
      type,
      town,
      price,
      deposit: price,
      desc: "Demo seed listing — replace by posting your own house with real photos.",
      amenities: { schoolKm: a.school, hospitalKm: a.hospital, policeKm: a.police, industryKm: a.industry, roadKm: a.road, roadType: a.roadType, water: a.water, electricity: a.electricity },
      status: "vacant",
      premiseImage: null,
      interiorImages: [],
      datePosted: new Date().toISOString(),
    });
  }
  saveDB();
}

/* ---------------------------------------------------------------- */
/* Helpers                                                            */
/* ---------------------------------------------------------------- */
function uid(prefix) {
  return prefix + "_" + Date.now().toString(36) + crypto.randomBytes(4).toString("hex");
}
function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}
function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(":");
  const check = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(check));
}
function publicUser(u) {
  return { id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role, joined: u.joined };
}
function json(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(body);
}
function notFound(res) {
  json(res, 404, { error: "Not found" });
}
function badRequest(res, msg) {
  json(res, 400, { error: msg || "Bad request" });
}
function unauthorized(res, msg) {
  json(res, 401, { error: msg || "Unauthorized" });
}

function getAuthUser(req) {
  const header = req.headers["authorization"] || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return null;
  const session = db.sessions.find((s) => s.token === token);
  if (!session) return null;
  return db.users.find((u) => u.id === session.userId) || null;
}

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let chunks = [];
    let size = 0;
    req.on("data", (c) => {
      size += c.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error("Payload too large"));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function parseMultipart(buffer, boundaryStr) {
  const boundary = Buffer.from("--" + boundaryStr);
  const parts = [];
  let start = buffer.indexOf(boundary);
  while (start !== -1) {
    const next = buffer.indexOf(boundary, start + boundary.length);
    if (next === -1) break;
    let partBuf = buffer.slice(start + boundary.length, next);
    if (partBuf.slice(0, 2).toString("latin1") === "\r\n") partBuf = partBuf.slice(2);
    if (partBuf.slice(-2).toString("latin1") === "\r\n") partBuf = partBuf.slice(0, -2);
    if (partBuf.length) parts.push(partBuf);
    start = next;
  }
  const result = { fields: {}, files: [] };
  for (const part of parts) {
    const headerEnd = part.indexOf("\r\n\r\n");
    if (headerEnd === -1) continue;
    const headerStr = part.slice(0, headerEnd).toString("utf8");
    const body = part.slice(headerEnd + 4);
    const nameMatch = headerStr.match(/;\s*name="([^"]*)"/i);
    if (!nameMatch) continue;
    const fieldName = nameMatch[1];
    const filenameMatch = headerStr.match(/;\s*filename="([^"]*)"/i);
    const filename = filenameMatch ? filenameMatch[1] : undefined;
    if (filename) {
      const ctMatch = headerStr.match(/Content-Type:\s*([^\r\n]+)/i);
      const contentType = ctMatch ? ctMatch[1].trim() : "application/octet-stream";
      result.files.push({ fieldName, filename, contentType, data: body });
    } else {
      if (!result.fields[fieldName]) {
        result.fields[fieldName] = body.toString("utf8");
      } else {
        // repeated field name -> collect as array
        if (!Array.isArray(result.fields[fieldName])) result.fields[fieldName] = [result.fields[fieldName]];
        result.fields[fieldName].push(body.toString("utf8"));
      }
    }
  }
  return result;
}

function saveUploadedFile(file) {
  const ext = (path.extname(file.filename || "") || guessExt(file.contentType)).toLowerCase();
  const safeExt = [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext) ? ext : ".jpg";
  const filename = uid("img") + safeExt;
  fs.writeFileSync(path.join(UPLOADS_DIR, filename), file.data);
  return filename;
}
function guessExt(contentType) {
  if (!contentType) return ".jpg";
  if (contentType.includes("png")) return ".png";
  if (contentType.includes("webp")) return ".webp";
  if (contentType.includes("gif")) return ".gif";
  return ".jpg";
}

async function readJsonBody(req) {
  const buf = await readRawBody(req);
  if (!buf.length) return {};
  try {
    return JSON.parse(buf.toString("utf8"));
  } catch (e) {
    return {};
  }
}

/* ---------------------------------------------------------------- */
/* Notification matching                                             */
/* ---------------------------------------------------------------- */
function notifyMatchingTenants(listing) {
  for (const u of db.users) {
    if (u.role !== "tenant" || u.id === listing.ownerId) continue;
    const pref = db.preferences.find((p) => p.userId === u.id);
    if (!pref) continue;
    const townOk = !pref.town || pref.town === "Any" || pref.town === listing.town;
    const typeOk = !pref.type || pref.type === "Any" || pref.type === listing.type;
    const minOk = !pref.minPrice || listing.price >= Number(pref.minPrice);
    const maxOk = !pref.maxPrice || listing.price <= Number(pref.maxPrice);
    if (townOk && typeOk && minOk && maxOk) {
      db.notifications.push({
        id: uid("ntf"),
        userId: u.id,
        listingId: listing.id,
        read: false,
        date: new Date().toISOString(),
        message: `New vacancy matching your alert: "${listing.title}" in ${listing.town} at KSh ${listing.price.toLocaleString()}/mo.`,
      });
    }
  }
}

/* ---------------------------------------------------------------- */
/* Static file serving                                               */
/* ---------------------------------------------------------------- */
const MIME = {
  ".html": "text/html", ".css": "text/css", ".js": "application/javascript",
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp",
  ".gif": "image/gif", ".svg": "image/svg+xml", ".json": "application/json",
};
function serveStatic(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) return notFound(res);
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(data);
  });
}

/* ---------------------------------------------------------------- */
/* Route handlers                                                    */
/* ---------------------------------------------------------------- */
async function handleApi(req, res, url) {
  const parts = url.pathname.split("/").filter(Boolean); // ["api", ...]
  const seg = parts.slice(1); // drop "api"

  // ---- AUTH ----
  if (seg[0] === "auth" && seg[1] === "register" && req.method === "POST") {
    const body = await readJsonBody(req);
    const { name, email, phone, password, role } = body;
    if (!name || !email || !password || !["owner", "tenant"].includes(role)) {
      return badRequest(res, "name, email, password and a valid role are required");
    }
    if (password.length < 6) return badRequest(res, "Password must be at least 6 characters");
    const normEmail = String(email).trim().toLowerCase();
    if (db.users.find((u) => u.email === normEmail)) {
      return badRequest(res, "An account with that email already exists");
    }
    const user = {
      id: uid("usr"), name: name.trim(), email: normEmail, phone: phone || "",
      role, passwordHash: hashPassword(password), joined: new Date().toISOString(),
    };
    db.users.push(user);
    const token = crypto.randomBytes(32).toString("hex");
    db.sessions.push({ token, userId: user.id, createdAt: new Date().toISOString() });
    saveDB();
    return json(res, 201, { token, user: publicUser(user) });
  }

  if (seg[0] === "auth" && seg[1] === "login" && req.method === "POST") {
    const body = await readJsonBody(req);
    const normEmail = String(body.email || "").trim().toLowerCase();
    const user = db.users.find((u) => u.email === normEmail);
    if (!user || !verifyPassword(body.password || "", user.passwordHash)) {
      return unauthorized(res, "Invalid email or password");
    }
    const token = crypto.randomBytes(32).toString("hex");
    db.sessions.push({ token, userId: user.id, createdAt: new Date().toISOString() });
    saveDB();
    return json(res, 200, { token, user: publicUser(user) });
  }

  if (seg[0] === "me" && req.method === "GET") {
    const u = getAuthUser(req);
    if (!u) return unauthorized(res);
    return json(res, 200, { user: publicUser(u) });
  }

  // ---- LISTINGS ----
  if (seg[0] === "listings" && seg.length === 1 && req.method === "GET") {
    let items = db.listings.slice();
    const q = url.searchParams;
    if (q.get("town") && q.get("town") !== "Any") items = items.filter((l) => l.town === q.get("town"));
    if (q.get("type") && q.get("type") !== "Any") items = items.filter((l) => l.type === q.get("type"));
    if (q.get("minPrice")) items = items.filter((l) => l.price >= Number(q.get("minPrice")));
    if (q.get("maxPrice")) items = items.filter((l) => l.price <= Number(q.get("maxPrice")));
    if (q.get("ownerId")) items = items.filter((l) => l.ownerId === q.get("ownerId"));
    if (q.get("status")) items = items.filter((l) => l.status === q.get("status"));
    const sort = q.get("sort") || "newest";
    if (sort === "price-asc") items.sort((a, b) => a.price - b.price);
    else if (sort === "price-desc") items.sort((a, b) => b.price - a.price);
    else items.sort((a, b) => new Date(b.datePosted) - new Date(a.datePosted));
    return json(res, 200, { listings: items });
  }

  if (seg[0] === "listings" && seg.length === 1 && req.method === "POST") {
    const u = getAuthUser(req);
    if (!u) return unauthorized(res);
    if (u.role !== "owner") return json(res, 403, { error: "Only owners can post listings" });
    const contentType = req.headers["content-type"] || "";
    const boundaryMatch = contentType.match(/boundary=(.+)$/);
    if (!contentType.startsWith("multipart/form-data") || !boundaryMatch) {
      return badRequest(res, "Expected multipart/form-data with premiseImage");
    }
    let raw;
    try {
      raw = await readRawBody(req);
    } catch (e) {
      return json(res, 413, { error: "Upload too large" });
    }
    const { fields, files } = parseMultipart(raw, boundaryMatch[1]);
    const premiseFile = files.find((f) => f.fieldName === "premiseImage");
    if (!premiseFile || !premiseFile.data || !premiseFile.data.length) {
      return badRequest(res, "A premise (whole compound) photo is required");
    }
    const interiorFiles = files.filter((f) => f.fieldName === "interiorImages");
    const premiseImage = saveUploadedFile(premiseFile);
    const interiorImages = interiorFiles.slice(0, 8).map(saveUploadedFile);

    const required = ["title", "type", "town", "price"];
    for (const r of required) {
      if (!fields[r]) return badRequest(res, `Missing field: ${r}`);
    }
    const listing = {
      id: uid("lst"),
      ownerId: u.id, ownerName: u.name, ownerPhone: u.phone || "N/A",
      title: String(fields.title).trim(),
      type: fields.type,
      town: fields.town,
      price: Number(fields.price) || 0,
      deposit: Number(fields.deposit) || 0,
      desc: (fields.desc || "").trim() || "No description provided yet.",
      amenities: {
        schoolKm: Number(fields.schoolKm) || 0,
        hospitalKm: Number(fields.hospitalKm) || 0,
        policeKm: Number(fields.policeKm) || 0,
        industryKm: Number(fields.industryKm) || 0,
        roadKm: Number(fields.roadKm) || 0,
        roadType: fields.roadType === "Murram" ? "Murram" : "Tarmac",
        water: ["Piped", "Borehole", "Tank"].includes(fields.water) ? fields.water : "Piped",
        electricity: fields.electricity === "true" || fields.electricity === "on",
      },
      status: "vacant",
      premiseImage,
      interiorImages,
      datePosted: new Date().toISOString(),
    };
    db.listings.push(listing);
    notifyMatchingTenants(listing);
    saveDB();
    return json(res, 201, { listing });
  }

  if (seg[0] === "listings" && seg.length === 2 && req.method === "GET") {
    const listing = db.listings.find((l) => l.id === seg[1]);
    if (!listing) return notFound(res);
    return json(res, 200, { listing });
  }

  if (seg[0] === "listings" && seg.length === 2 && req.method === "PATCH") {
    const u = getAuthUser(req);
    if (!u) return unauthorized(res);
    const listing = db.listings.find((l) => l.id === seg[1]);
    if (!listing) return notFound(res);
    if (listing.ownerId !== u.id) return json(res, 403, { error: "Not your listing" });
    const body = await readJsonBody(req);
    if (body.status && ["vacant", "occupied"].includes(body.status)) {
      listing.status = body.status;
      if (listing.status === "vacant") notifyMatchingTenants(listing);
    }
    saveDB();
    return json(res, 200, { listing });
  }

  if (seg[0] === "listings" && seg.length === 2 && req.method === "DELETE") {
    const u = getAuthUser(req);
    if (!u) return unauthorized(res);
    const idx = db.listings.findIndex((l) => l.id === seg[1]);
    if (idx === -1) return notFound(res);
    if (db.listings[idx].ownerId !== u.id) return json(res, 403, { error: "Not your listing" });
    db.listings.splice(idx, 1);
    saveDB();
    return json(res, 204, {});
  }

  // ---- FAVORITES ----
  if (seg[0] === "favorites" && seg.length === 1 && req.method === "GET") {
    const u = getAuthUser(req);
    if (!u) return unauthorized(res);
    const favIds = u.favIds || [];
    return json(res, 200, { favIds, listings: db.listings.filter((l) => favIds.includes(l.id)) });
  }
  if (seg[0] === "favorites" && seg.length === 2 && req.method === "POST") {
    const u = getAuthUser(req);
    if (!u) return unauthorized(res);
    u.favIds = u.favIds || [];
    const id = seg[1];
    if (u.favIds.includes(id)) u.favIds = u.favIds.filter((x) => x !== id);
    else u.favIds.push(id);
    saveDB();
    return json(res, 200, { favIds: u.favIds });
  }

  // ---- PREFERENCES ----
  if (seg[0] === "preferences" && req.method === "GET") {
    const u = getAuthUser(req);
    if (!u) return unauthorized(res);
    const pref = db.preferences.find((p) => p.userId === u.id) || null;
    return json(res, 200, { preferences: pref });
  }
  if (seg[0] === "preferences" && req.method === "PUT") {
    const u = getAuthUser(req);
    if (!u) return unauthorized(res);
    const body = await readJsonBody(req);
    let pref = db.preferences.find((p) => p.userId === u.id);
    const data = {
      town: body.town || "Any", type: body.type || "Any",
      minPrice: body.minPrice || "", maxPrice: body.maxPrice || "",
    };
    if (pref) Object.assign(pref, data);
    else { pref = { userId: u.id, ...data }; db.preferences.push(pref); }
    saveDB();
    return json(res, 200, { preferences: pref });
  }

  // ---- NOTIFICATIONS ----
  if (seg[0] === "notifications" && seg.length === 1 && req.method === "GET") {
    const u = getAuthUser(req);
    if (!u) return unauthorized(res);
    const items = db.notifications.filter((n) => n.userId === u.id).sort((a, b) => new Date(b.date) - new Date(a.date));
    return json(res, 200, { notifications: items });
  }
  if (seg[0] === "notifications" && seg[1] === "read" && req.method === "POST") {
    const u = getAuthUser(req);
    if (!u) return unauthorized(res);
    db.notifications.forEach((n) => { if (n.userId === u.id) n.read = true; });
    saveDB();
    return json(res, 200, { ok: true });
  }

  return notFound(res);
}

/* ---------------------------------------------------------------- */
/* Server                                                             */
/* ---------------------------------------------------------------- */
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    });
    return res.end();
  }

  if (url.pathname.startsWith("/api/")) {
    try {
      await handleApi(req, res, url);
    } catch (e) {
      console.error(e);
      if (!res.headersSent) json(res, 500, { error: "Server error" });
    }
    return;
  }

  if (url.pathname.startsWith("/uploads/")) {
    const filename = path.basename(url.pathname);
    return serveStatic(res, path.join(UPLOADS_DIR, filename));
  }

  // static web app
  let filePath = path.join(WEB_DIR, url.pathname === "/" ? "index.html" : url.pathname);
  if (!filePath.startsWith(WEB_DIR)) return notFound(res);
  if (!fs.existsSync(filePath)) filePath = path.join(WEB_DIR, "index.html"); // SPA fallback
  return serveStatic(res, filePath);
});

seedIfNeeded();
server.listen(PORT, () => {
  console.log(`WAZI backend running at http://localhost:${PORT}`);
  console.log(`API base: http://localhost:${PORT}/api`);
});
