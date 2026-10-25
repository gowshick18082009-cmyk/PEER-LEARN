import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import process from 'node:process';
import request from 'supertest';
import app from '../src/app.js';

test('health check', async () => {
  const response = await request(app).get('/api/health');
  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { ok: true });
});

test('signup works', async () => {
  const email = `test-${randomUUID()}@example.com`;
  const response = await request(app).post('/api/auth/signup').send({
    name: 'Test User',
    email,
    password: '12345678',
    agreed: true,
  });

  assert.equal(response.status, 201);
  assert.ok(response.body.token);
  assert.equal(response.body.user.email, email);
});

test('profile photo can be uploaded, fetched, removed, and rejects unsupported data', async () => {
  const email = `avatar-${randomUUID()}@example.com`;
  const signup = await request(app).post('/api/auth/signup').send({
    name: 'Avatar User',
    email,
    password: '12345678',
    agreed: true,
  });
  assert.equal(signup.status, 201);
  const authorization = { Authorization: `Bearer ${signup.body.token}` };
  const avatarData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jK+AAAAAASUVORK5CYII=';

  const upload = await request(app)
    .patch('/api/auth/profile')
    .set(authorization)
    .send({ avatarData });
  assert.equal(upload.status, 200);
  assert.equal(upload.body.user.avatar_data, avatarData);

  const skill = await request(app)
    .post('/api/skills')
    .set(authorization)
    .send({ subject: 'music', topic: 'Guitar', kind: 'teach' });
  assert.equal(skill.status, 201);

  const viewer = await request(app).post('/api/auth/signup').send({
    name: 'Photo Viewer',
    email: `viewer-${randomUUID()}@example.com`,
    password: '12345678',
    agreed: true,
  });
  assert.equal(viewer.status, 201);
  const tutorSearch = await request(app)
    .get('/api/skills/tutors?subject=music')
    .set({ Authorization: `Bearer ${viewer.body.token}` });
  assert.equal(tutorSearch.status, 200);
  assert.equal(
    tutorSearch.body.tutors.find((tutor) => tutor.id === signup.body.user.id)?.avatar_data,
    avatarData,
  );

  const invalid = await request(app)
    .patch('/api/auth/profile')
    .set(authorization)
    .send({ avatarData: 'data:image/svg+xml;base64,PHN2Zz4=' });
  assert.equal(invalid.status, 400);

  const removal = await request(app)
    .patch('/api/auth/profile')
    .set(authorization)
    .send({ avatarData: null });
  assert.equal(removal.status, 200);
  assert.equal(removal.body.user.avatar_data, null);
});

test('profile bio can be saved and is validated', async () => {
  const signup = await request(app).post('/api/auth/signup').send({
    name: 'Bio User',
    email: `bio-${randomUUID()}@example.com`,
    password: '12345678',
    agreed: true,
  });
  const authorization = { Authorization: `Bearer ${signup.body.token}` };

  const saved = await request(app)
    .patch('/api/auth/profile')
    .set(authorization)
    .send({ bio: 'I enjoy learning design and music.' });
  assert.equal(saved.status, 200);
  assert.equal(saved.body.user.bio, 'I enjoy learning design and music.');

  const tooLong = await request(app)
    .patch('/api/auth/profile')
    .set(authorization)
    .send({ bio: 'x'.repeat(241) });
  assert.equal(tooLong.status, 400);
});

test('new subjects are accepted and learner feedback issues a tutor certificate', async () => {
  const tutor = await request(app).post('/api/auth/signup').send({
    name: 'Video Tutor',
    email: `video-tutor-${randomUUID()}@example.com`,
    password: '12345678',
    agreed: true,
  });
  const learner = await request(app).post('/api/auth/signup').send({
    name: 'Video Learner',
    email: `video-learner-${randomUUID()}@example.com`,
    password: '12345678',
    agreed: true,
  });
  assert.equal(tutor.status, 201);
  assert.equal(learner.status, 201);
  const tutorAuth = { Authorization: `Bearer ${tutor.body.token}` };
  const learnerAuth = { Authorization: `Bearer ${learner.body.token}` };

  const videoSkill = await request(app).post('/api/skills').set(tutorAuth).send({
    subject: 'video_editing',
    topic: 'Color grading',
    kind: 'teach',
  });
  const aiSkill = await request(app).post('/api/skills').set(learnerAuth).send({
    subject: 'video_editing',
    topic: 'Color grading',
    kind: 'learn',
  });
  assert.equal(videoSkill.status, 201);
  assert.equal(aiSkill.status, 201);

  const learnerProfile = await request(app)
    .patch('/api/auth/profile')
    .set(learnerAuth)
    .send({ bio: 'I am learning video editing.' });
  assert.equal(learnerProfile.status, 200);

  const learnerSearch = await request(app)
    .get('/api/skills/learners?subject=video_editing&q=color')
    .set(tutorAuth);
  assert.equal(learnerSearch.status, 200);
  const foundLearner = learnerSearch.body.learners.find((item) => item.id === learner.body.user.id);
  assert.ok(foundLearner);
  assert.equal(foundLearner.bio, 'I am learning video editing.');

  const teachingOffer = await request(app).post('/api/sessions').set(tutorAuth).send({
    intent: 'teach',
    learnerId: learner.body.user.id,
    subject: 'video_editing',
    topic: 'Color grading',
    scheduledAt: new Date(Date.now() + 172800000).toISOString(),
  });
  assert.equal(teachingOffer.status, 201);
  assert.equal(teachingOffer.body.session.request_by, 'tutor');

  const wrongResponder = await request(app)
    .patch(`/api/sessions/${teachingOffer.body.session.id}/status`)
    .set(tutorAuth)
    .send({ status: 'accepted' });
  assert.equal(wrongResponder.status, 403);

  const learnerAcceptsOffer = await request(app)
    .patch(`/api/sessions/${teachingOffer.body.session.id}/status`)
    .set(learnerAuth)
    .send({ status: 'accepted' });
  assert.equal(learnerAcceptsOffer.status, 200);

  const session = await request(app).post('/api/sessions').set(learnerAuth).send({
    tutorId: tutor.body.user.id,
    subject: 'video_editing',
    topic: 'Color grading',
    scheduledAt: new Date(Date.now() + 86400000).toISOString(),
  });
  assert.equal(session.status, 201);
  const sessionId = session.body.session.id;
  const accepted = await request(app)
    .patch(`/api/sessions/${sessionId}/status`)
    .set(tutorAuth)
    .send({ status: 'accepted' });
  assert.equal(accepted.status, 200);

  const originalGeminiKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  try {
    const report = await request(app)
      .post(`/api/sessions/${sessionId}/safety-report`)
      .set(learnerAuth)
      .send({ details: 'The session participant made me uncomfortable.' });
    assert.equal(report.status, 201);
    assert.equal(report.body.report.status, 'awaiting_human_review');
    assert.equal(report.body.report.aiAvailable, false);
  } finally {
    if (originalGeminiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalGeminiKey;
  }

  const completed = await request(app)
    .patch(`/api/sessions/${sessionId}/status`)
    .set(learnerAuth)
    .send({ status: 'completed' });
  assert.equal(completed.status, 200);

  const review = await request(app).post('/api/reviews').set(learnerAuth).send({
    sessionId,
    rating: 1,
    comment: 'Helpful feedback.',
  });
  assert.equal(review.status, 201);
  assert.ok(review.body.certificateId);

  const certificates = await request(app).get('/api/reviews/certificates/mine').set(tutorAuth);
  assert.equal(certificates.status, 200);
  assert.equal(certificates.body.certificates.length, 1);
  assert.equal(certificates.body.certificates[0].rating, 1);
  assert.equal(certificates.body.certificates[0].subject, 'video_editing');
});
