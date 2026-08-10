import Database from "@tauri-apps/plugin-sql";

let _db: Database | null = null;

export async function getDb(): Promise<Database> {
  if (_db) return _db;
  _db = await Database.load("sqlite:localwhisper.db");
  return _db;
}

export type TranscriptionRow = {
  id: number;
  text: string;
  app: string | null;
  duration_ms: number;
  word_count: number;
  pasted: number;
  created_at: number;
};

export async function insertTranscription(args: {
  text: string;
  app: string | null;
  durationMs: number;
  pasted: boolean;
}): Promise<number> {
  const db = await getDb();
  const words = args.text.trim().split(/\s+/).filter(Boolean).length;
  const result = await db.execute(
    `INSERT INTO transcriptions (text, app, duration_ms, word_count, pasted, created_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      args.text,
      args.app,
      Math.round(args.durationMs),
      words,
      args.pasted ? 1 : 0,
      Date.now(),
    ],
  );
  return result.lastInsertId ?? 0;
}

export async function listTranscriptions(limit = 100): Promise<TranscriptionRow[]> {
  const db = await getDb();
  return db.select<TranscriptionRow[]>(
    `SELECT id, text, app, duration_ms, word_count, pasted, created_at
     FROM transcriptions
     ORDER BY created_at DESC
     LIMIT $1`,
    [limit],
  );
}

export async function listAllTranscriptions(): Promise<TranscriptionRow[]> {
  const db = await getDb();
  return db.select<TranscriptionRow[]>(
    `SELECT id, text, app, duration_ms, word_count, pasted, created_at
     FROM transcriptions
     ORDER BY created_at DESC`,
  );
}

// Slim shape for stats — skips the (potentially large) `text` column. Used
// by Home / Insights when they only need to crunch numbers across the
// entire history.
export type StatsRow = {
  app: string | null;
  duration_ms: number;
  word_count: number;
  created_at: number;
};

export async function listAllForStats(): Promise<StatsRow[]> {
  const db = await getDb();
  return db.select<StatsRow[]>(
    `SELECT app, duration_ms, word_count, created_at
     FROM transcriptions
     ORDER BY created_at ASC`,
  );
}

export async function clearTranscriptions(): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM transcriptions");
}

/** Borra una transcripción concreta del historial. Irreversible. */
export async function deleteTranscription(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM transcriptions WHERE id = $1", [id]);
}

export type DictionaryEntry = {
  id: number;
  term: string;
  replacement: string;
  category: string | null;
  notes: string | null;
  uses: number;
  created_at: number;
};

export async function addDictionaryEntry(args: {
  term: string;
  replacement: string;
  category?: string | null;
  notes?: string | null;
}): Promise<number> {
  const db = await getDb();
  const result = await db.execute(
    `INSERT INTO dictionary (term, replacement, category, notes, uses, created_at)
     VALUES ($1, $2, $3, $4, 0, $5)`,
    [
      args.term,
      args.replacement,
      args.category ?? null,
      args.notes ?? null,
      Date.now(),
    ],
  );
  return result.lastInsertId ?? 0;
}

export async function listDictionaryEntries(): Promise<DictionaryEntry[]> {
  const db = await getDb();
  return db.select<DictionaryEntry[]>(
    `SELECT id, term, replacement, category, notes, uses, created_at
     FROM dictionary
     ORDER BY created_at DESC`,
  );
}

export async function updateDictionaryEntry(args: {
  id: number;
  term: string;
  replacement: string;
  notes?: string | null;
}): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE dictionary SET term = $1, replacement = $2, notes = $3 WHERE id = $4`,
    [args.term, args.replacement, args.notes ?? null, args.id],
  );
}

export async function deleteDictionaryEntry(id: number): Promise<void> {
  const db = await getDb();
  await db.execute(`DELETE FROM dictionary WHERE id = $1`, [id]);
}
