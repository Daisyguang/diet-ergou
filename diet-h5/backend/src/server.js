import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = Fastify({ logger: false });

const rootDir = path.resolve(__dirname, "../../..");
const dataDir = path.join(rootDir, "data");
const uploadDir = path.join(dataDir, "uploads");
const summaryDir = path.join(dataDir, "summaries");
const dbPath = path.join(dataDir, "app.db");
const frontendDir = path.join(rootDir, "frontend");

for (const dir of [dataDir, uploadDir, summaryDir]) {
  fs.mkdirSync(dir, { recursive: true });
}

const db = new Database(dbPath);
const initSql = fs.readFileSync(path.join(__dirname, "db", "init.sql"), "utf8");
db.exec(initSql);

const nowIso = () => new Date().toISOString();
const todayStr = () => new Date().toISOString().slice(0, 10);
const meals = ["breakfast", "lunch", "dinner"];
const copies = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "reminder_copies_zh.json"), "utf8"));

function ensureSettings() {
  const row = db.prepare("SELECT * FROM settings WHERE id = 1").get();
  if (!row) {
    db.prepare("INSERT INTO settings (id, start_date, updated_at) VALUES (1, ?, ?)").run(todayStr(), nowIso());
  }
}

function getDayIndex(dateStr) {
  const set = db.prepare("SELECT start_date FROM settings WHERE id = 1").get();
  const start = new Date(set.start_date + "T00:00:00");
  const target = new Date(dateStr + "T00:00:00");
  const diff = Math.floor((target - start) / 86400000) + 1;
  return Math.max(diff, 1);
}

function getLastWeight(dateStr) {
  return db.prepare("SELECT weight, recorded_at FROM weight_logs WHERE date = ? ORDER BY recorded_at DESC LIMIT 1").get(dateStr) || null;
}

function prevDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function getDelta(dateStr) {
  const t = getLastWeight(dateStr);
  const y = getLastWeight(prevDate(dateStr));
  if (!t || !y) return { delta: null, todayWeight: t?.weight ?? null, yesterdayWeight: y?.weight ?? null };
  return {
    delta: Number((t.weight - y.weight).toFixed(1)),
    todayWeight: t.weight,
    yesterdayWeight: y.weight
  };
}

function ensureDaily(date) {
  const found = db.prepare("SELECT date FROM daily_records WHERE date = ?").get(date);
  if (!found) {
    db.prepare("INSERT INTO daily_records (date, created_at, updated_at) VALUES (?, ?, ?)").run(date, nowIso(), nowIso());
  }
}

function ensureMeal(date, mealType) {
  let row = db.prepare("SELECT * FROM meal_records WHERE date = ? AND meal_type = ?").get(date, mealType);
  if (!row) {
    db.prepare("INSERT INTO meal_records (date, meal_type, updated_at) VALUES (?, ?, ?)").run(date, mealType, nowIso());
    row = db.prepare("SELECT * FROM meal_records WHERE date = ? AND meal_type = ?").get(date, mealType);
  }
  return row;
}

function assembleDay(date) {
  ensureDaily(date);
  const daily = db.prepare("SELECT * FROM daily_records WHERE date = ?").get(date);
  const mealRows = db.prepare("SELECT * FROM meal_records WHERE date = ?").all(date);
  const mealMap = {};
  for (const m of meals) {
    const row = mealRows.find((x) => x.meal_type === m) || ensureMeal(date, m);
    const images = db.prepare("SELECT id, file_path, sort_order FROM meal_images WHERE meal_record_id = ? ORDER BY sort_order ASC, id ASC").all(row.id);
    mealMap[m] = {
      id: row.id,
      note: row.note,
      images: images.map((img) => ({ ...img, url: `/files/${img.file_path.replaceAll("\\", "/")}` }))
    };
  }
  const weightLogs = db.prepare("SELECT * FROM weight_logs WHERE date = ? ORDER BY recorded_at ASC").all(date);
  const deltaObj = getDelta(date);
  return {
    date,
    dayIndex: getDayIndex(date),
    daily,
    meals: mealMap,
    weightLogs,
    delta: deltaObj.delta,
    todayWeight: deltaObj.todayWeight,
    yesterdayWeight: deltaObj.yesterdayWeight,
    reminder: deltaObj.delta === null ? copies[Math.floor(Math.random() * copies.length)] : ""
  };
}

ensureSettings();

await app.register(cors, { origin: true });
await app.register(multipart);
await app.register(fastifyStatic, {
  root: frontendDir,
  prefix: "/"
});

app.get("/files/*", async (req, reply) => {
  const rel = req.params["*"];
  const abs = path.join(dataDir, rel);
  if (!abs.startsWith(dataDir) || !fs.existsSync(abs)) return reply.code(404).send({ error: "not found" });
  return reply.send(fs.createReadStream(abs));
});

app.get("/api/today", async (req) => {
  const date = req.query.date || todayStr();
  return assembleDay(date);
});

app.put("/api/daily/:date", async (req) => {
  const { date } = req.params;
  ensureDaily(date);
  const body = req.body || {};
  db.prepare(`UPDATE daily_records SET diet_done=?, exercise_done=?, sleep_done=?, note=?, updated_at=? WHERE date=?`).run(
    body.diet_done ? 1 : 0,
    body.exercise_done ? 1 : 0,
    body.sleep_done ? 1 : 0,
    body.note || "",
    nowIso(),
    date
  );
  return assembleDay(date);
});

app.put("/api/meals/:date/:mealType", async (req, reply) => {
  const { date, mealType } = req.params;
  if (!meals.includes(mealType)) return reply.code(400).send({ error: "invalid mealType" });
  const meal = ensureMeal(date, mealType);
  db.prepare("UPDATE meal_records SET note=?, updated_at=? WHERE id=?").run(req.body?.note || "", nowIso(), meal.id);
  return assembleDay(date);
});

app.post("/api/meals/:date/:mealType/images", async (req, reply) => {
  const { date, mealType } = req.params;
  if (!meals.includes(mealType)) return reply.code(400).send({ error: "invalid mealType" });
  const meal = ensureMeal(date, mealType);
  const count = db.prepare("SELECT COUNT(1) c FROM meal_images WHERE meal_record_id=?").get(meal.id).c;
  if (count >= 3) return reply.code(400).send({ error: "最多3张" });
  const part = await req.file();
  if (!part) return reply.code(400).send({ error: "no file" });
  const ext = path.extname(part.filename || "").toLowerCase() || ".jpg";
  const dayDir = path.join("uploads", date, mealType);
  const dayAbs = path.join(dataDir, dayDir);
  fs.mkdirSync(dayAbs, { recursive: true });
  const name = `${Date.now()}${ext}`;
  const abs = path.join(dayAbs, name);
  await part.toFile(abs);
  const rel = path.join(dayDir, name);
  const sortOrder = count + 1;
  db.prepare("INSERT INTO meal_images (meal_record_id, file_path, sort_order, created_at) VALUES (?, ?, ?, ?)").run(meal.id, rel, sortOrder, nowIso());
  return assembleDay(date);
});

app.delete("/api/meals/images/:imageId", async (req) => {
  const id = Number(req.params.imageId);
  const row = db.prepare("SELECT * FROM meal_images WHERE id = ?").get(id);
  if (row) {
    const abs = path.join(dataDir, row.file_path);
    if (fs.existsSync(abs)) fs.unlinkSync(abs);
    db.prepare("DELETE FROM meal_images WHERE id=?").run(id);
  }
  return { ok: true };
});

app.post("/api/weights/:date", async (req) => {
  const { date } = req.params;
  const weight = Number(req.body?.weight);
  if (!Number.isFinite(weight)) return { error: "invalid weight" };
  db.prepare("INSERT INTO weight_logs (date, weight, recorded_at) VALUES (?, ?, ?)").run(date, weight, nowIso());
  return assembleDay(date);
});

app.get("/api/weights/:date/delta", async (req) => {
  const { date } = req.params;
  return getDelta(date);
});

app.get("/api/history", async (req) => {
  const from = req.query.from || "1900-01-01";
  const to = req.query.to || "2999-12-31";
  const rows = db.prepare("SELECT * FROM daily_records WHERE date BETWEEN ? AND ? ORDER BY date DESC").all(from, to);
  return rows.map((r) => {
    const imageCount = db.prepare(`SELECT COUNT(1) c FROM meal_images mi JOIN meal_records mr ON mi.meal_record_id=mr.id WHERE mr.date=?`).get(r.date).c;
    const w = getLastWeight(r.date);
    return { ...r, imageCount, lastWeight: w?.weight ?? null };
  });
});

app.post("/api/summary/:date", async (req) => {
  const { date } = req.params;
  const dataUrl = req.body?.dataUrl || "";
  if (!dataUrl.startsWith("data:image/")) return { error: "invalid image" };
  const base64 = dataUrl.split(",")[1];
  const buf = Buffer.from(base64, "base64");
  const rel = path.join("summaries", `${date}.png`);
  fs.writeFileSync(path.join(dataDir, rel), buf);
  db.prepare("UPDATE daily_records SET summary_image_path=?, updated_at=? WHERE date=?").run(rel, nowIso(), date);
  return { ok: true, url: `/files/${rel.replaceAll("\\", "/")}` };
});

app.get("/api/settings", async () => {
  const set = db.prepare("SELECT * FROM settings WHERE id=1").get();
  return set;
});

app.put("/api/settings/start-date", async (req) => {
  const startDate = req.body?.start_date;
  db.prepare("UPDATE settings SET start_date=?, updated_at=? WHERE id=1").run(startDate, nowIso());
  return { ok: true };
});

app.get("/api/export/csv", async (req, reply) => {
  const from = req.query.from || "1900-01-01";
  const to = req.query.to || "2999-12-31";
  const rows = db.prepare("SELECT * FROM daily_records WHERE date BETWEEN ? AND ? ORDER BY date ASC").all(from, to);
  const csv = ["date,diet_done,exercise_done,sleep_done,note,summary_image_path"];
  for (const r of rows) {
    csv.push(`${r.date},${r.diet_done},${r.exercise_done},${r.sleep_done},"${(r.note || "").replaceAll('"', '""')}",${r.summary_image_path || ""}`);
  }
  reply.header("Content-Type", "text/csv; charset=utf-8");
  reply.header("Content-Disposition", "attachment; filename=records.csv");
  return csv.join("\n");
});

app.get("/api/day/:date", async (req) => assembleDay(req.params.date));

app.get("/api/snapshot", async () => {
  const days = {};
  const dayRows = db.prepare("SELECT date FROM daily_records ORDER BY date ASC").all();
  for (const r of dayRows) {
    const d = assembleDay(r.date);
    days[r.date] = {
      date: d.date,
      goals: {
        diet: !!d.daily.diet_done,
        exercise: !!d.daily.exercise_done,
        sleep: !!d.daily.sleep_done
      },
      note: d.daily.note || "",
      meals: {
        breakfast: { note: d.meals.breakfast.note || "", images: d.meals.breakfast.images.map((x) => x.url) },
        lunch: { note: d.meals.lunch.note || "", images: d.meals.lunch.images.map((x) => x.url) },
        dinner: { note: d.meals.dinner.note || "", images: d.meals.dinner.images.map((x) => x.url) }
      },
      weights: (d.weightLogs || []).map((w) => ({ weight: w.weight, at: w.recorded_at })),
      summary: d.daily.summary_image_path ? `/files/${String(d.daily.summary_image_path).replaceAll("\\\\", "/")}` : ""
    };
  }
  const set = db.prepare("SELECT start_date FROM settings WHERE id=1").get();
  return { settings: { startDate: set?.start_date || todayStr() }, days };
});

app.put("/api/snapshot", async (req) => {
  const payload = req.body || {};
  const settings = payload.settings || {};
  const days = payload.days || {};
  if (settings.startDate) {
    db.prepare("UPDATE settings SET start_date=?, updated_at=? WHERE id=1").run(settings.startDate, nowIso());
  }
  for (const date of Object.keys(days)) {
    const day = days[date] || {};
    ensureDaily(date);
    db.prepare("UPDATE daily_records SET diet_done=?, exercise_done=?, sleep_done=?, note=?, updated_at=? WHERE date=?").run(
      day.goals?.diet ? 1 : 0,
      day.goals?.exercise ? 1 : 0,
      day.goals?.sleep ? 1 : 0,
      day.note || "",
      nowIso(),
      date
    );
    for (const mt of meals) {
      const m = ensureMeal(date, mt);
      db.prepare("UPDATE meal_records SET note=?, updated_at=? WHERE id=?").run(day.meals?.[mt]?.note || "", nowIso(), m.id);
      db.prepare("DELETE FROM meal_images WHERE meal_record_id=?").run(m.id);
    }
    db.prepare("DELETE FROM weight_logs WHERE date=?").run(date);
    const ws = day.weights || [];
    for (const w of ws) {
      const v = Number(w.weight);
      if (Number.isFinite(v)) db.prepare("INSERT INTO weight_logs (date, weight, recorded_at) VALUES (?, ?, ?)").run(date, v, w.at || nowIso());
    }
  }
  return { ok: true };
});

app.get("/*", async (req, reply) => {
  return reply.sendFile("index.html");
});

app.listen({ port: 3000, host: "0.0.0.0" }).then(() => {
  console.log("running http://localhost:3000");
});
