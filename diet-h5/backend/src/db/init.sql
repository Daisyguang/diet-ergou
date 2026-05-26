PRAGMA journal_mode=WAL;

CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  start_date TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS daily_records (
  date TEXT PRIMARY KEY,
  diet_done INTEGER NOT NULL DEFAULT 0,
  exercise_done INTEGER NOT NULL DEFAULT 0,
  sleep_done INTEGER NOT NULL DEFAULT 0,
  note TEXT DEFAULT '',
  summary_image_path TEXT DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS meal_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast','lunch','dinner')),
  note TEXT DEFAULT '',
  updated_at TEXT NOT NULL,
  UNIQUE(date, meal_type)
);

CREATE TABLE IF NOT EXISTS meal_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  meal_record_id INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (meal_record_id) REFERENCES meal_records(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS weight_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  weight REAL NOT NULL,
  recorded_at TEXT NOT NULL
);
