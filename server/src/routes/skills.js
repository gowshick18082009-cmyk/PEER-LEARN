import express from 'express';
import db from '../db.js';
import { fail, SUBJECTS } from '../http.js';
import { authRequired } from '../auth.js';

const router = express.Router();

router.get('/mine', authRequired, (req, res) => {
  const skills = db.prepare('SELECT * FROM skills WHERE user_id = ? ORDER BY id DESC').all(req.user.id);
  return res.json({ skills });
});

router.post('/', authRequired, (req, res) => {
  const subject = typeof req.body?.subject === 'string' ? req.body.subject.trim() : '';
  const topic = typeof req.body?.topic === 'string' ? req.body.topic.trim() : '';
  const kind = req.body?.kind;

  if (!SUBJECTS.includes(subject)) {
    return fail(res, 'Choose a valid subject.', 400);
  }
  if (topic.length === 0 || topic.length > 60) {
    return fail(res, 'Topic must be 1-60 characters.', 400);
  }
  if (!['teach', 'learn'].includes(kind)) {
    return fail(res, 'Kind must be teach or learn.', 400);
  }

  const count = db.prepare('SELECT COUNT(*) as total FROM skills WHERE user_id = ?').get(req.user.id).total;
  if (Number(count) >= 30) {
    return fail(res, 'You have reached the skill limit.', 400);
  }

  const result = db.prepare('INSERT INTO skills (user_id, subject, topic, kind) VALUES (?, ?, ?, ?)')
    .run(req.user.id, subject, topic, kind);

  return res.status(201).json({ skill: { id: result.lastInsertRowid, user_id: req.user.id, subject, topic, kind } });
});

router.delete('/:id', authRequired, (req, res) => {
  const skillId = Number(req.params.id);
  const skill = db.prepare('SELECT * FROM skills WHERE id = ? AND user_id = ?').get(skillId, req.user.id);
  if (!skill) {
    return fail(res, 'Skill not found.', 404);
  }

  db.prepare('DELETE FROM skills WHERE id = ?').run(skillId);
  return res.json({ ok: true });
});

router.get('/tutors', authRequired, (req, res) => {
  const subject = typeof req.query.subject === 'string' ? req.query.subject.trim() : '';
  const q = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : '';

  const clauses = ['u.id != ? AND u.suspended = 0'];
  const values = [req.user.id];

  if (subject) {
    clauses.push("EXISTS (SELECT 1 FROM skills s WHERE s.user_id = u.id AND s.kind = 'teach' AND s.subject = ?)");
    values.push(subject);
  }

  if (q) {
    clauses.push("EXISTS (SELECT 1 FROM skills s WHERE s.user_id = u.id AND s.kind = 'teach' AND lower(s.topic) LIKE ?)");
    values.push(`%${q}%`);
  }

  const sql = `
    SELECT u.id, u.name, u.bio, u.avatar_data,
      r.avg_rating, COALESCE(r.review_count, 0) AS review_count
    FROM users u
    LEFT JOIN (
      SELECT reviewee_id, AVG(rating) AS avg_rating, COUNT(*) AS review_count
      FROM reviews
      WHERE hidden = 0
      GROUP BY reviewee_id
    ) r ON r.reviewee_id = u.id
    WHERE ${clauses.join(' AND ')}
    ORDER BY avg_rating DESC, review_count DESC, u.name ASC
    LIMIT 50
  `;

  const rows = db.prepare(sql).all(...values);
  const tutors = rows.map((row) => {
    const skills = db.prepare("SELECT subject, topic FROM skills WHERE user_id = ? AND kind = 'teach' ORDER BY subject, topic").all(row.id);
    return {
      id: row.id,
      name: row.name,
      bio: row.bio,
      avatar_data: row.avatar_data,
      avg_rating: Number(row.avg_rating) || 0,
      review_count: Number(row.review_count) || 0,
      skills,
    };
  });

  return res.json({ tutors });
});

router.get('/learners', authRequired, (req, res) => {
  const subject = typeof req.query.subject === 'string' ? req.query.subject.trim() : '';
  const q = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : '';
  const clauses = ['u.id != ?', 'u.suspended = 0', "s.kind = 'learn'"];
  const values = [req.user.id];

  if (subject) {
    clauses.push('s.subject = ?');
    values.push(subject);
  }
  if (q) {
    clauses.push('lower(s.topic) LIKE ?');
    values.push(`%${q}%`);
  }

  const learners = db.prepare(`
    SELECT DISTINCT u.id, u.name, u.bio, u.avatar_data
    FROM users u
    JOIN skills s ON s.user_id = u.id
    WHERE ${clauses.join(' AND ')}
    ORDER BY u.name ASC
    LIMIT 50
  `).all(...values).map((user) => ({
    ...user,
    skills: db.prepare("SELECT subject, topic FROM skills WHERE user_id = ? AND kind = 'learn' ORDER BY subject, topic").all(user.id),
  }));

  return res.json({ learners });
});

router.get('/matches', authRequired, (req, res) => {
  const myTeach = db.prepare("SELECT subject FROM skills WHERE user_id = ? AND kind = 'teach'").all(req.user.id);
  const myLearn = db.prepare("SELECT subject FROM skills WHERE user_id = ? AND kind = 'learn'").all(req.user.id);
  const teachSet = new Set(myTeach.map((item) => item.subject));
  const learnSet = new Set(myLearn.map((item) => item.subject));

  const users = db.prepare('SELECT * FROM users WHERE id != ? AND suspended = 0 ORDER BY name ASC').all(req.user.id);
  const matches = [];

  for (const user of users) {
    const otherTeach = db.prepare("SELECT subject FROM skills WHERE user_id = ? AND kind = 'teach'").all(user.id);
    const otherLearn = db.prepare("SELECT subject FROM skills WHERE user_id = ? AND kind = 'learn'").all(user.id);
    const canTeachMe = [...new Set(otherTeach.map((item) => item.subject).filter((subject) => learnSet.has(subject)))];
    const wantsFromMe = [...new Set(otherLearn.map((item) => item.subject).filter((subject) => teachSet.has(subject)))];
    const score = canTeachMe.length * 2 + wantsFromMe.length;

    if (score > 0) {
      matches.push({
        user: {
          id: user.id,
          name: user.name,
          bio: user.bio,
          avatar_data: user.avatar_data,
          points: user.points,
          role: user.role,
        },
        canTeachMe,
        wantsFromMe,
        mutual: canTeachMe.length > 0 && wantsFromMe.length > 0,
        score,
      });
    }
  }

  matches.sort((a, b) => b.score - a.score || Number(b.mutual) - Number(a.mutual));
  return res.json({ matches: matches.slice(0, 10) });
});

export default router;
