import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";

const dbPath = process.env.FILE_DROPBOX_DB_PATH || "./data/uploads.db";
mkdirSync(dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

export { db };
