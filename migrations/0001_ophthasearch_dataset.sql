PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS research_runs (
  run_id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  schema_version TEXT NOT NULL,
  pipeline_version TEXT NOT NULL,
  language TEXT NOT NULL CHECK (language IN ('ru', 'en')),
  question_fingerprint TEXT NOT NULL,
  question_redacted TEXT,
  question_storage_state TEXT NOT NULL CHECK (question_storage_state IN ('redacted_text', 'metadata_only')),
  intent_json TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('complete', 'partial', 'evidence_only')),
  source_refs_json TEXT NOT NULL,
  answer_json TEXT,
  latency_ms INTEGER CHECK (latency_ms IS NULL OR latency_ms >= 0),
  CHECK (
    (question_storage_state = 'redacted_text' AND question_redacted IS NOT NULL)
    OR
    (question_storage_state = 'metadata_only' AND question_redacted IS NULL AND answer_json IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_research_runs_created_at ON research_runs(created_at);
CREATE INDEX IF NOT EXISTS idx_research_runs_question_fingerprint ON research_runs(question_fingerprint);
CREATE INDEX IF NOT EXISTS idx_research_runs_status ON research_runs(status);

CREATE TABLE IF NOT EXISTS feedback (
  feedback_id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  rating TEXT NOT NULL CHECK (rating IN ('helpful', 'problem')),
  error_tags_json TEXT NOT NULL,
  comment_redacted TEXT,
  comment_storage_state TEXT NOT NULL CHECK (comment_storage_state IN ('redacted_text', 'metadata_only')),
  review_status TEXT NOT NULL DEFAULT 'unreviewed' CHECK (review_status IN ('unreviewed', 'reviewed', 'dismissed')),
  FOREIGN KEY (run_id) REFERENCES research_runs(run_id) ON DELETE CASCADE,
  CHECK (
    (comment_storage_state = 'redacted_text' AND comment_redacted IS NOT NULL)
    OR
    (comment_storage_state = 'metadata_only' AND comment_redacted IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_feedback_run_id ON feedback(run_id);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at);
CREATE INDEX IF NOT EXISTS idx_feedback_review_status ON feedback(review_status);

CREATE TABLE IF NOT EXISTS training_cases (
  case_id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  approved_question TEXT NOT NULL,
  approved_intent_json TEXT NOT NULL,
  approved_answer_json TEXT NOT NULL,
  approved_source_refs_json TEXT NOT NULL,
  quality_score INTEGER NOT NULL CHECK (quality_score BETWEEN 1 AND 5),
  curation_status TEXT NOT NULL CHECK (curation_status IN ('approved', 'needs_revision', 'excluded')),
  dataset_version TEXT,
  curation_notes TEXT,
  FOREIGN KEY (run_id) REFERENCES research_runs(run_id) ON DELETE RESTRICT,
  CHECK (curation_status != 'approved' OR quality_score >= 4)
);

CREATE INDEX IF NOT EXISTS idx_training_cases_curation_quality ON training_cases(curation_status, quality_score);
CREATE INDEX IF NOT EXISTS idx_training_cases_dataset_version ON training_cases(dataset_version);
