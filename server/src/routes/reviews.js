import express from 'express';
import db from '../db.js';
import { fail } from '../http.js';
import { authRequired } from '../auth.js';

const router = express.Router();

router.post('/', authRequired, (req, res) => {
  const sessionId = Number(req.body?.sessionId);
  const rating = Number(req.body?.rating);
  const comment = typeof req.body?.comment === 'string' ? req.body.comment.trim() : '';

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return fail(res, 'Rating must be an integer from 1 to 5.', 400);
  }
  if (comment.length > 500) {
    return fail(res, 'Comment must be 500 characters or fewer.', 400);
  }

  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId);
  if (!session) {
    return fail(res, 'Session not found.', 404);
  }
  if (session.learner_id !== req.user.id) {
    return fail(res, 'Only the learner can leave a review.', 403);
  }
  if (session.status !== 'completed') {
    return fail(res, 'Only completed sessions can be reviewed.', 403);
  }

  const existing = db.prepare('SELECT id FROM reviews WHERE session_id = ?').get(sessionId);
  if (existing) {
    return fail(res, 'You already reviewed this session.', 409);
  }

  const issueCertificate = db.transaction(() => {
    db.prepare('INSERT INTO reviews (session_id, reviewer_id, reviewee_id, rating, comment) VALUES (?, ?, ?, ?, ?)')
      .run(sessionId, req.user.id, session.tutor_id, rating, comment);
    const certificate = db.prepare(
      'INSERT INTO certificates (session_id, tutor_id, learner_id, rating) VALUES (?, ?, ?, ?)',
    ).run(sessionId, session.tutor_id, req.user.id, rating);
    return certificate.lastInsertRowid;
  });
  const certificateId = issueCertificate();

  return res.status(201).json({ ok: true, certificateId });
});

router.get('/certificates/mine', authRequired, (req, res) => {
  const certificates = db.prepare(`
    SELECT c.id, c.session_id, c.tutor_id, c.learner_id, c.rating, c.issued_at,
      s.subject, s.topic, s.scheduled_at, t.name AS tutor_name, l.name AS learner_name
    FROM certificates c
    JOIN sessions s ON s.id = c.session_id
    JOIN users t ON t.id = c.tutor_id
    JOIN users l ON l.id = c.learner_id
    WHERE c.tutor_id = ?
    ORDER BY c.issued_at DESC
  `).all(req.user.id);
  return res.json({ certificates });
});

router.post('/:id/report', authRequired, (req, res) => {
  const reviewId = Number(req.params.id);
  const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';

  if (reason.length > 300) {
    return fail(res, 'Reason must be 300 characters or fewer.', 400);
  }

  const review = db.prepare('SELECT * FROM reviews WHERE id = ?').get(reviewId);
  if (!review) {
    return fail(res, 'Review not found.', 404);
  }

  db.prepare('INSERT OR IGNORE INTO reports (review_id, reporter_id, reason) VALUES (?, ?, ?)')
    .run(reviewId, req.user.id, reason);

  return res.status(201).json({ ok: true });
});

export default router;
