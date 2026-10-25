import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api.js';
import { SUBJECTS, subjectPages, subjectThemes, themeVars } from '../subjects.js';
import Avatar from '../components/Avatar.jsx';

function SubjectDirectory() {
  return (
    <div className="subject-page" style={themeVars('other')}>
      <section className="subject-hero subject-directory-hero">
        <div className="subject-hero-copy">
          <span className="subject-eyebrow">Learn together</span>
          <h1>Find your learning space</h1>
          <p>Choose a subject to find peers, share what you know, and grow your skills together.</p>
        </div>
      </section>
      <section className="subject-directory" aria-label="Subjects">
        {SUBJECTS.filter((subject) => subjectPages[subject]).map((subject) => {
          const theme = subjectThemes[subject];
          const page = subjectPages[subject];
          return (
            <Link
              className="subject-directory-card"
              key={subject}
              to={`/subjects/${subject}`}
              style={themeVars(subject)}
            >
              <span className="subject-symbol" aria-hidden="true">{theme.emoji}</span>
              <span className="subject-eyebrow">{theme.label}</span>
              <strong>{page.title}</strong>
              <span className="subject-card-copy">{page.description}</span>
              <span className="subject-card-link">Explore {theme.label} <span aria-hidden="true">→</span></span>
            </Link>
          );
        })}
      </section>
    </div>
  );
}

function SubjectDetail({ subject }) {
  const theme = subjectThemes[subject];
  const page = subjectPages[subject];
  const [tutors, setTutors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api(`/skills/tutors?subject=${encodeURIComponent(subject)}`)
      .then((data) => {
        if (active) setTutors(data.tutors || []);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [subject]);

  return (
    <div className="subject-page" style={themeVars(subject)}>
      <Link className="subject-back-link" to="/subjects">← All subjects</Link>
      <section className="subject-hero">
        <div className="subject-hero-copy">
          <span className="subject-eyebrow">{theme.label} · Peer learning</span>
          <h1>{page.title}</h1>
          <p>{page.description}</p>
          <Link className="subject-cta" to={`/find?subject=${subject}`}>
            Find a {theme.label.toLowerCase()} tutor <span aria-hidden="true">→</span>
          </Link>
        </div>
        <div className="subject-hero-art" aria-hidden="true">{theme.emoji}</div>
      </section>

      <section className="subject-topics-section">
        <div>
          <span className="subject-eyebrow">Explore the subject</span>
          <h2>What are you working on?</h2>
          <p>{page.prompt}</p>
        </div>
        <div className="subject-topic-list">
          {page.topics.map((topic) => <span className="subject-topic" key={topic}>{topic}</span>)}
        </div>
      </section>

      <section className="subject-tips-link">
        <div>
          <span className="subject-eyebrow">Make your practice count</span>
          <h2>Tips &amp; tricks</h2>
          <p>Simple ways to get more from every {theme.label.toLowerCase()} study session.</p>
        </div>
        <Link className="subject-cta" to={`/subjects/${subject}/tips`}>See the tips <span aria-hidden="true">→</span></Link>
      </section>

      <section className="subject-tutors-section">
        <div className="subject-section-heading">
          <div>
            <span className="subject-eyebrow">Learn from each other</span>
            <h2>Peer tutors</h2>
          </div>
          <Link className="subject-text-link" to={`/find?subject=${subject}`}>Browse all <span aria-hidden="true">→</span></Link>
        </div>
        {loading ? <p className="subject-muted">Finding your peers…</p> : error ? (
          <p className="subject-error" role="alert">{error}</p>
        ) : tutors.length === 0 ? (
          <div className="subject-empty-state">
            <p>No {theme.label.toLowerCase()} tutors have listed a skill yet.</p>
            <Link className="subject-text-link" to="/">Be the first to add one <span aria-hidden="true">→</span></Link>
          </div>
        ) : (
          <div className="subject-tutor-grid">
            {tutors.slice(0, 3).map((tutor) => (
              <article className="subject-tutor-card" key={tutor.id}>
                <Avatar user={tutor} className="subject-tutor-avatar" />
                <div>
                  <strong>{tutor.name}</strong>
                  <p>{tutor.bio || 'Peer tutor'}</p>
                </div>
                <span className="subject-rating">{tutor.avg_rating.toFixed(1)} ★</span>
                <div className="subject-tutor-skills">
                  {tutor.skills.map((skill) => (
                    <span className="subject-topic" key={`${skill.subject}-${skill.topic}`}>{skill.topic}</span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export function SubjectTipsPage() {
  const { subject } = useParams();
  const theme = subjectThemes[subject];
  const page = subjectPages[subject];

  if (!page) return <SubjectDirectory />;

  return (
    <div className="subject-page" style={themeVars(subject)}>
      <Link className="subject-back-link" to={`/subjects/${subject}`}>← Back to {theme.label}</Link>
      <section className="subject-hero">
        <div className="subject-hero-copy">
          <span className="subject-eyebrow">{theme.label} · Study smarter</span>
          <h1>Tips &amp; tricks</h1>
          <p>{page.prompt} Use these ideas to make practice focused, safe, and rewarding.</p>
        </div>
        <div className="subject-hero-art" aria-hidden="true">{theme.emoji}</div>
      </section>
      <section className="subject-tips-list" aria-label={`${theme.label} tips`}>
        {page.tips.map((tip, index) => (
          <article className="subject-tip-card" key={tip}>
            <span className="subject-tip-number">{String(index + 1).padStart(2, '0')}</span>
            <p>{tip}</p>
          </article>
        ))}
      </section>
      <Link className="subject-cta subject-tips-cta" to={`/find?subject=${subject}`}>
        Find a {theme.label.toLowerCase()} learning partner <span aria-hidden="true">→</span>
      </Link>
    </div>
  );
}

export default function SubjectPages() {
  const { subject } = useParams();

  if (!subject) return <SubjectDirectory />;
  if (!subjectPages[subject]) return <SubjectDirectory />;
  return <SubjectDetail key={subject} subject={subject} />;
}
