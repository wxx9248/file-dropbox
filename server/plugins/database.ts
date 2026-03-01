export default defineNitroPlugin(() => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS uploads (
      id           TEXT PRIMARY KEY,
      filename     TEXT NOT NULL,
      size         INTEGER NOT NULL,
      mime_type    TEXT,
      file_path    TEXT NOT NULL,
      completed_at TEXT NOT NULL
    )
  `);
});
