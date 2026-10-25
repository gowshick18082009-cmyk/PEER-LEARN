import { useEffect, useRef, useState } from 'react';
import api from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import { SUBJECTS, subjectThemes } from '../subjects.js';
import { Link } from 'react-router-dom';
import Avatar from '../components/Avatar.jsx';

async function prepareAvatar(file) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Choose a JPEG, PNG, or WebP image.');
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error('Choose an image smaller than 8 MB.');
  }

  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 512 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Your browser could not prepare this image.');
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.84);
    const base64 = dataUrl.split(',')[1];
    const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
    if (base64.length * 0.75 - padding > 512 * 1024) {
      throw new Error('This image is too detailed to upload. Choose a smaller image.');
    }
    return dataUrl;
  } finally {
    bitmap.close();
  }
}

function SkillForm({ onAdd }) {
  const [form, setForm] = useState({ subject: 'math', topic: '', kind: 'teach' });
  const [error, setError] = useState('');

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    try {
      await onAdd(form);
      setForm((current) => ({ ...current, topic: '' }));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form className="card stack" onSubmit={handleSubmit}>
      <h3>Add a skill</h3>
      <div className="grid two-col">
        <label>
          I can teach / I want to learn
          <select name="kind" value={form.kind} onChange={handleChange}>
            <option value="teach">I can teach</option>
            <option value="learn">I want to learn</option>
          </select>
        </label>
        <label>
          Subject
          <select name="subject" value={form.subject} onChange={handleChange}>
            {SUBJECTS.map((subject) => (
              <option key={subject} value={subject}>{subjectThemes[subject]?.label || subject}</option>
            ))}
          </select>
          {form.subject !== 'other' && (
            <Link className="form-subject-link" to={`/subjects/${form.subject}`}>
              Explore the {subjectThemes[form.subject]?.label.toLowerCase()} page →
            </Link>
          )}
        </label>
      </div>
      <label>
        Topic
        <input name="topic" value={form.topic} onChange={handleChange} placeholder="e.g. Algebra basics" maxLength={60} required />
      </label>
      {error && <div className="error-box">{error}</div>}
      <button className="primary" type="submit">Save skill</button>
    </form>
  );
}

function SessionSafetyReport({ sessionId }) {
  const [details, setDetails] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submitReport = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const data = await api(`/sessions/${sessionId}/safety-report`, {
        method: 'POST',
        body: JSON.stringify({ details }),
      });
      setResult(data.report);
      setDetails('');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <details className="session-safety">
      <summary>Safety help &amp; report a concern</summary>
      {result ? (
        <div className="safety-result" role="status">
          <strong>Concern saved for human review</strong>
          <p>{result.summary}</p>
          {result.aiAvailable
            ? <span>AI triage: {result.category} · {result.urgency}</span>
            : <span>AI triage unavailable; the report is still saved for review.</span>}
          <button className="ghost small" type="button" onClick={() => setResult(null)}>Submit another concern</button>
        </div>
      ) : (
        <form className="stack compact" onSubmit={submitReport}>
          <p className="muted safety-privacy">
            No audio or video is monitored. Reports are reviewed by a person; if AI is configured,
            the description is also sent to the AI provider for triage. Do not include passwords
            or private information. For immediate danger, contact local emergency services.
          </p>
          <label>
            What happened?
            <textarea
              rows="3"
              maxLength={1000}
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              placeholder="Briefly describe the concern. Avoid private details."
              required
            />
          </label>
          {error && <div className="error-box" role="alert">{error}</div>}
          <button className="primary small" type="submit" disabled={submitting || details.trim().length < 5}>
            {submitting ? 'Sending report…' : 'Send private report'}
          </button>
        </form>
      )}
    </details>
  );
}

function TutorCertificate({ certificate }) {
  const certificateRef = useRef(null);
  const issuedDate = new Date(certificate.issued_at).toLocaleDateString();
  const printCertificate = () => {
    const card = certificateRef.current;
    if (!card) return;
    card.classList.add('printing');
    window.addEventListener('afterprint', () => card.classList.remove('printing'), { once: true });
    window.print();
  };

  return (
    <article className="certificate-card" ref={certificateRef}>
      <div className="certificate-seal" aria-hidden="true">PL</div>
      <div className="certificate-copy">
        <span className="certificate-eyebrow">PeerLearn · Certificate of teaching</span>
        <h4>{certificate.tutor_name}</h4>
        <p>Completed a peer-teaching session in <strong>{certificate.subject.replaceAll('_', ' ')}</strong> on <strong>{certificate.topic}</strong>.</p>
        <p className="certificate-rating">Learner feedback: {certificate.rating} / 5 stars · Issued {issuedDate}</p>
        <span className="certificate-id">Certificate #{String(certificate.id).padStart(6, '0')}</span>
      </div>
      <button className="ghost small certificate-print" type="button" onClick={printCertificate}>
        Print / save PDF
      </button>
    </article>
  );
}

export default function Dashboard() {
  const { user, refresh } = useAuth();
  const avatarInput = useRef(null);
  const [skills, setSkills] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [reviewingId, setReviewingId] = useState(null);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [loading, setLoading] = useState(true);
  const [avatarError, setAvatarError] = useState('');
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [bioDraft, setBioDraft] = useState(user?.bio || '');
  const [bioError, setBioError] = useState('');
  const [bioSaving, setBioSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [skillsData, sessionsData, certificatesData] = await Promise.all([
        api('/skills/mine'),
        api('/sessions'),
        api('/reviews/certificates/mine'),
      ]);
      setSkills(skillsData.skills || []);
      setSessions(sessionsData.sessions || []);
      setCertificates(certificatesData.certificates || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setBioDraft(user?.bio || '');
  }, [user?.bio]);

  const handleAddSkill = async ({ subject, topic, kind }) => {
    const result = await api('/skills', {
      method: 'POST',
      body: JSON.stringify({ subject, topic, kind }),
    });
    setSkills((current) => [result.skill, ...current]);
    await refresh();
  };

  const handleDeleteSkill = async (id) => {
    await api(`/skills/${id}`, { method: 'DELETE' });
    setSkills((current) => current.filter((skill) => skill.id !== id));
  };

  const handleAvatarChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setAvatarError('');
    setAvatarSaving(true);
    try {
      const avatarData = await prepareAvatar(file);
      await api('/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify({ avatarData }),
      });
      await refresh();
    } catch (error) {
      setAvatarError(error.message);
    } finally {
      setAvatarSaving(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setAvatarError('');
    setAvatarSaving(true);
    try {
      await api('/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify({ avatarData: null }),
      });
      await refresh();
    } catch (error) {
      setAvatarError(error.message);
    } finally {
      setAvatarSaving(false);
    }
  };

  const handleBioSave = async (event) => {
    event.preventDefault();
    setBioError('');
    setBioSaving(true);
    try {
      await api('/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify({ bio: bioDraft }),
      });
      await refresh();
    } catch (error) {
      setBioError(error.message);
    } finally {
      setBioSaving(false);
    }
  };

  const handleSessionAction = async (sessionId, status) => {
    try {
      await api(`/sessions/${sessionId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      await Promise.all([loadData(), refresh()]);
    } catch (error) {
      alert(error.message);
    }
  };

  const handleReviewSubmit = async (sessionId) => {
    try {
      await api('/reviews', {
        method: 'POST',
        body: JSON.stringify({ sessionId, rating: Number(reviewForm.rating), comment: reviewForm.comment }),
      });
      setReviewingId(null);
      setReviewForm({ rating: 5, comment: '' });
      await loadData();
      await refresh();
    } catch (error) {
      alert(error.message);
    }
  };

  const mySessions = sessions.filter((session) => session.tutor_id === user?.id || session.learner_id === user?.id);

  return (
    <div className="stack large-gap">
      <header className="app-page-heading">
        <span>PeerLearn workspace</span>
        <h1>Your learning dashboard</h1>
        <p>Grow your skills by teaching, learning, and sharing with your community.</p>
      </header>
      <section className="grid two-col">
        <SkillForm onAdd={handleAddSkill} />
        <div className="card stack profile-card">
          <h3>Your profile</h3>
          <div className="profile-identity">
            <Avatar user={user} className="profile-avatar" />
            <div>
              <strong>{user?.name}</strong>
              {!bioDraft && <p className="muted">Add a short intro so peers know what you’re learning.</p>}
            </div>
          </div>
          <form className="stack compact profile-bio-form" onSubmit={handleBioSave}>
            <label htmlFor="profile-bio">About you</label>
            <textarea
              id="profile-bio"
              rows="3"
              maxLength={240}
              value={bioDraft}
              onChange={(event) => setBioDraft(event.target.value)}
              placeholder="Share what you enjoy learning or teaching…"
            />
            <div className="profile-bio-footer">
              <span className="muted">{bioDraft.length}/240</span>
              <button className="primary small" type="submit" disabled={bioSaving || bioDraft === (user?.bio || '')}>
                {bioSaving ? 'Saving…' : 'Save bio'}
              </button>
            </div>
            {bioError && <div className="error-box" role="alert">{bioError}</div>}
          </form>
          <div className="profile-photo-tools">
            <div>
              <strong>Profile photo</strong>
              <p className="muted profile-photo-hint">JPG, PNG or WebP · up to 8 MB</p>
            </div>
            <input
              ref={avatarInput}
              className="visually-hidden"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleAvatarChange}
              aria-label="Choose a profile photo"
            />
            <div className="action-row">
              <button className="primary small" type="button" onClick={() => avatarInput.current?.click()} disabled={avatarSaving}>
                {avatarSaving ? 'Saving…' : user?.avatar_data ? 'Change photo' : 'Upload photo'}
              </button>
              {user?.avatar_data && (
                <button className="ghost small" type="button" onClick={handleRemoveAvatar} disabled={avatarSaving}>
                  Remove
                </button>
              )}
            </div>
          </div>
          {avatarError && <div className="error-box" role="alert">{avatarError}</div>}
          <p className="profile-points">Points <strong>{user?.points ?? 20}</strong></p>
        </div>
      </section>

      <section className="card stack">
        <h3>Your skills</h3>
        {loading ? <p>Loading...</p> : (
          <div className="skill-list">
            {skills.length === 0 ? <p className="muted">No skills yet.</p> : skills.map((skill) => (
              <div className="skill-row" key={skill.id}>
                <span className="skill-copy">
                  <span className="label">{skill.kind === 'teach' ? 'Teach' : 'Learn'}</span>
                  <span>{subjectThemes[skill.subject]?.label || skill.subject}</span>
                  <strong>{skill.topic}</strong>
                </span>
                <button className="ghost small" type="button" onClick={() => handleDeleteSkill(skill.id)}>Remove</button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card stack">
        <h3>Sessions</h3>
        {mySessions.length === 0 ? <p className="muted">No sessions yet.</p> : mySessions.map((session) => {
          const isTutor = session.tutor_id === user?.id;
          const isLearner = session.learner_id === user?.id;
          const canReview = isLearner && session.status === 'completed' && !session.reviewed;

          return (
            <div className="session-card" key={session.id}>
              <div className="session-head">
                <div>
                  <strong>{session.subject}</strong>
                  <p>{session.topic}</p>
                </div>
                <span className="status-badge">{session.status}</span>
              </div>
              <p className="muted">Tutor: {session.tutor_name} · Learner: {session.learner_name}</p>
              <p className="muted">Scheduled: {new Date(session.scheduled_at).toLocaleString()}</p>
              {session.status === 'pending' && ((session.request_by === 'tutor' && isLearner) || (session.request_by !== 'tutor' && isTutor)) && (
                <div className="action-row">
                  <button className="primary small" type="button" onClick={() => handleSessionAction(session.id, 'accepted')}>
                    {session.request_by === 'tutor' ? 'Accept teaching offer' : 'Accept'}
                  </button>
                  <button className="ghost small" type="button" onClick={() => handleSessionAction(session.id, 'declined')}>Decline</button>
                </div>
              )}
              {(isTutor || isLearner) && ['pending', 'accepted'].includes(session.status) && (
                <button className="ghost small" type="button" onClick={() => handleSessionAction(session.id, 'cancelled')}>Cancel</button>
              )}
              {isLearner && session.status === 'accepted' && (
                <button className="primary small" type="button" onClick={() => handleSessionAction(session.id, 'completed')}>Mark completed (pay 10 pts)</button>
              )}
              {canReview && (
                <div className="review-box">
                  {!reviewingId ? (
                    <button className="primary small" type="button" onClick={() => setReviewingId(session.id)}>Leave review</button>
                  ) : (
                    <div className="stack">
                      <label>
                        Rating
                        <select value={reviewForm.rating} onChange={(event) => setReviewForm((current) => ({ ...current, rating: event.target.value }))}>
                          {[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} stars</option>)}
                        </select>
                      </label>
                      <label>
                        Comment
                        <textarea rows="3" maxLength={500} value={reviewForm.comment} onChange={(event) => setReviewForm((current) => ({ ...current, comment: event.target.value }))} />
                      </label>
                      <div className="action-row">
                        <button className="primary small" type="button" onClick={() => handleReviewSubmit(session.id)}>Submit review</button>
                        <button className="ghost small" type="button" onClick={() => setReviewingId(null)}>Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {isLearner && session.status === 'completed' && session.reviewed && (
                <p className="certificate-issued-note">Your feedback is recorded and the tutor certificate has been issued.</p>
              )}
              {session.status === 'accepted' && <SessionSafetyReport sessionId={session.id} />}
          </div>
          );
          })}
      </section>

      {certificates.length > 0 && (
          <section className="card stack certificate-section">
              <div>
                <span className="certificate-eyebrow">Recognizing your contribution</span>
                <h3>Your teaching certificates</h3>
                <p className="muted">Earned after a learner reviewed a completed teaching session.</p>
              </div>
              {certificates.map((certificate) => (
                <TutorCertificate key={certificate.id} certificate={certificate} />
              ))}
          </section>
      )}
    </div>
  );
}
