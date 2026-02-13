-- =========================
-- VIDEO JOB QUEUE TABLE
-- =========================

CREATE TABLE IF NOT EXISTS video_jobs (
  id TEXT PRIMARY KEY,

  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),

  status TEXT NOT NULL DEFAULT 'queued',
  -- queued | processing | done | failed

  kind TEXT NOT NULL,
  -- problem | solution

  pair_id TEXT NOT NULL,
  -- both videos share this

  visibility TEXT NOT NULL DEFAULT 'public',
  -- public | unlisted | private

  title TEXT NOT NULL,
  description TEXT,

  payload_json TEXT NOT NULL,

  youtube_video_id TEXT,
  youtube_url TEXT,
  playlist_id TEXT,

  error TEXT
);

-- Efficient queue scanning
CREATE INDEX IF NOT EXISTS idx_video_jobs_status
ON video_jobs(status);

-- Pair lookup for cross-linking
CREATE INDEX IF NOT EXISTS idx_video_jobs_pair
ON video_jobs(pair_id);

-- Faster processing ordering
CREATE INDEX IF NOT EXISTS idx_video_jobs_created
ON video_jobs(created_at);
