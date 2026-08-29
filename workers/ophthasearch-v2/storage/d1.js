function requireDb(db) {
  if (!db || typeof db.prepare !== 'function') throw new Error('OphthaSearch D1 binding is unavailable');
  return db;
}

export async function insertResearchRun(db, record) {
  const database = requireDb(db);
  await database.prepare(`
    INSERT OR IGNORE INTO research_runs (
      run_id, created_at, schema_version, pipeline_version, language,
      question_fingerprint, question_redacted, question_storage_state,
      intent_json, status, source_refs_json, answer_json, latency_ms
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    record.run_id,
    record.created_at,
    record.schema_version,
    record.pipeline_version,
    record.language,
    record.question_fingerprint,
    record.question_redacted,
    record.question_storage_state,
    record.intent_json,
    record.status,
    record.source_refs_json,
    record.answer_json,
    record.latency_ms
  ).run();
}

export async function researchRunExists(db, runId) {
  const database = requireDb(db);
  const row = await database.prepare('SELECT 1 AS found FROM research_runs WHERE run_id = ? LIMIT 1')
    .bind(runId)
    .first();
  return Boolean(row?.found);
}

export async function insertFeedback(db, record) {
  const database = requireDb(db);
  await database.prepare(`
    INSERT INTO feedback (
      feedback_id, run_id, created_at, rating, error_tags_json,
      comment_redacted, comment_storage_state, review_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    record.feedback_id,
    record.run_id,
    record.created_at,
    record.rating,
    record.error_tags_json,
    record.comment_redacted,
    record.comment_storage_state,
    record.review_status || 'unreviewed'
  ).run();
}

export async function insertTrainingCase(db, record) {
  const database = requireDb(db);
  await database.prepare(`
    INSERT INTO training_cases (
      case_id, run_id, created_at, approved_question, approved_intent_json,
      approved_answer_json, approved_source_refs_json, quality_score,
      curation_status, dataset_version, curation_notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    record.case_id,
    record.run_id,
    record.created_at,
    record.approved_question,
    record.approved_intent_json,
    record.approved_answer_json,
    record.approved_source_refs_json,
    record.quality_score,
    record.curation_status,
    record.dataset_version ?? null,
    record.curation_notes ?? null
  ).run();
}
