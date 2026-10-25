import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api.js';
import { SUBJECTS, subjectThemes } from '../subjects.js';
import Avatar from '../components/Avatar.jsx';

export default function Find() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedSubject = searchParams.get('subject');
  const subjectFilter = SUBJECTS.includes(requestedSubject) ? requestedSubject : '';
  const mode = searchParams.get('mode') === 'learners' ? 'learners' : 'tutors';
  const [matches, setMatches] = useState([]);
  const [tutors, setTutors] = useState([]);
  const [learners, setLearners] = useState([]);
  const [query, setQuery] = useState('');
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [booking, setBooking] = useState({ topic: '', scheduledAt: '' });
  const [loadError, setLoadError] = useState('');

  const loadData = async () => {
    setLoadError('');
    const matchData = await api('/skills/matches');
    setMatches(matchData.matches || []);
    const endpoint = mode === 'learners' ? '/skills/learners' : '/skills/tutors';
    const result = await api(`${endpoint}?subject=${encodeURIComponent(subjectFilter)}&q=${encodeURIComponent(query)}`);
    if (mode === 'learners') {
      setLearners(result.learners || []);
    } else {
      setTutors(result.tutors || []);
    }
  };

  useEffect(() => {
    loadData().catch((error) => setLoadError(error.message));
  }, [subjectFilter, query, mode]);

  const handleRequest = async (event) => {
    event.preventDefault();
    try {
      const normalizedQuery = query.trim().toLowerCase();
      const skill = selectedPerson.skills.find((item) => (
        (!subjectFilter || item.subject === subjectFilter)
        && (!normalizedQuery || item.topic.toLowerCase().includes(normalizedQuery))
      )) || selectedPerson.skills.find((item) => !subjectFilter || item.subject === subjectFilter)
        || selectedPerson.skills[0];
      const requestBody = mode === 'learners'
        ? {
          intent: 'teach',
          learnerId: selectedPerson.id,
          subject: skill?.subject || 'math',
          topic: booking.topic || skill?.topic || 'General help',
          scheduledAt: booking.scheduledAt,
        }
        : {
          tutorId: selectedPerson.id,
          subject: skill?.subject || 'math',
          topic: booking.topic || skill?.topic || 'General help',
          scheduledAt: booking.scheduledAt,
        };
      await api('/sessions', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });
      alert(mode === 'learners' ? 'Teaching request sent.' : 'Session requested.');
      setSelectedPerson(null);
      setBooking({ topic: '', scheduledAt: '' });
    } catch (error) {
      alert(error.message);
    }
  };

  const searchResults = useMemo(() => tutors.filter((tutor) => (tutor.skills?.length || 0) > 0), [tutors]);
  const learnerResults = useMemo(() => learners.filter((learner) => (learner.skills?.length || 0) > 0), [learners]);

  return (
    <div className="stack large-gap">
      <header className="app-page-heading">
        <span>Meet your next study partner</span>
        <h1>Find your people</h1>
        <p>Discover peer tutors and skill swaps that match what you want to learn.</p>
      </header>
      <section className="card stack">
        <h2>Suggested skill swaps</h2>
        <div className="card-grid">
          {matches.length === 0 ? <p className="muted">No matches yet.</p> : matches.map((match) => (
            <div key={match.user.id} className="mini-card" style={{ borderLeft: `4px solid ${subjectThemes[match.canTeachMe[0] || 'other']?.color || '#475569'}` }}>
              <div className="header-row">
                <span className="tutor-identity"><Avatar user={match.user} className="tutor-avatar" /><strong>{match.user.name}</strong></span>
                {match.mutual && <span className="tag">Mutual swap!</span>}
              </div>
              <p className="muted">{match.user.bio || 'New learner'}</p>
              <p>Can teach: {match.canTeachMe.join(', ') || '—'}</p>
              <p>Wants from you: {match.wantsFromMe.join(', ') || '—'}</p>
              <p>Score: {match.score}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="card stack">
        <div>
          <h2>{mode === 'learners' ? 'Find a learner' : 'Find a tutor'}</h2>
          <p className="muted">
            {mode === 'learners'
              ? 'Find peers seeking help and offer to teach them.'
              : 'Find peers who can teach a skill you want to learn.'}
          </p>
        </div>
        <div className="find-mode-switch" role="group" aria-label="Find tutors or learners">
          <button
            className={mode === 'tutors' ? 'primary small' : 'ghost small'}
            type="button"
            aria-pressed={mode === 'tutors'}
            onClick={() => setSearchParams((current) => {
              const next = new URLSearchParams(current);
              next.delete('mode');
              return next;
            })}
          >
            Find a tutor
          </button>
          <button
            className={mode === 'learners' ? 'primary small' : 'ghost small'}
            type="button"
            aria-pressed={mode === 'learners'}
            onClick={() => setSearchParams((current) => {
              const next = new URLSearchParams(current);
              next.set('mode', 'learners');
              return next;
            })}
          >
            Find a learner
          </button>
        </div>
        <div className="toolbar-row">
          <select
            value={subjectFilter}
            onChange={(event) => {
              const value = event.target.value;
              setSearchParams((current) => {
                const next = new URLSearchParams(current);
                if (value) next.set('subject', value);
                else next.delete('subject');
                return next;
              });
            }}
          >
            <option value="">All subjects</option>
            {SUBJECTS.map((subject) => (
              <option key={subject} value={subject}>{subjectThemes[subject]?.label || subject}</option>
            ))}
          </select>
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search topic" />
        </div>
        {loadError && <div className="error-box" role="alert">{loadError}</div>}
        {mode === 'tutors' && <div className="card-grid">
          {searchResults.length === 0 ? <p className="muted">No tutors found.</p> : searchResults.map((tutor) => (
            <div key={tutor.id} className="mini-card">
              <div className="header-row">
                <span className="tutor-identity"><Avatar user={tutor} className="tutor-avatar" /><strong>{tutor.name}</strong></span>
                <span>{tutor.avg_rating.toFixed(1)} ★</span>
              </div>
              <p className="muted">{tutor.review_count} reviews</p>
              <p>{tutor.bio || 'Student tutor'}</p>
              <div className="stack compact">
                {tutor.skills.map((skill) => (
                  <span key={`${tutor.id}-${skill.subject}-${skill.topic}`} className="subject-tag" style={subjectThemes[skill.subject] || subjectThemes.other}>{skill.subject}: {skill.topic}</span>
                ))}
              </div>
              <button className="primary small" type="button" onClick={() => setSelectedPerson(tutor)}>Request session (10 pts)</button>
            </div>
          ))}
        </div>}
        {mode === 'learners' && <div className="card-grid">
          {learnerResults.length === 0 ? <p className="muted">No learners seeking this subject yet.</p> : learnerResults.map((learner) => (
            <div key={learner.id} className="mini-card">
              <div className="header-row">
                <span className="tutor-identity"><Avatar user={learner} className="tutor-avatar" /><strong>{learner.name}</strong></span>
                <span className="tag">Seeking a tutor</span>
              </div>
              <p className="muted">{learner.bio || 'Peer learner'}</p>
              <div className="stack compact">
                {learner.skills.map((skill) => (
                  <span key={`${learner.id}-${skill.subject}-${skill.topic}`} className="subject-tag" style={subjectThemes[skill.subject] || subjectThemes.other}>
                    {subjectThemes[skill.subject]?.label || skill.subject}: {skill.topic}
                  </span>
                ))}
              </div>
              <button className="primary small" type="button" onClick={() => setSelectedPerson(learner)}>Offer to teach</button>
            </div>
          ))}
        </div>}
      </section>

      {selectedPerson && (
        <section className="card">
          <h3>{mode === 'learners' ? `Offer to teach ${selectedPerson.name}` : `Book with ${selectedPerson.name}`}</h3>
          <form className="stack" onSubmit={handleRequest}>
            <label>
              Topic
              <input type="text" value={booking.topic} onChange={(event) => setBooking((current) => ({ ...current, topic: event.target.value }))} placeholder="What do you need help with?" required />
            </label>
            <label>
              Date and time
              <input type="datetime-local" value={booking.scheduledAt} onChange={(event) => setBooking((current) => ({ ...current, scheduledAt: event.target.value }))} required />
            </label>
            <div className="action-row">
              <button className="primary" type="submit">Confirm request</button>
              <button className="ghost" type="button" onClick={() => setSelectedPerson(null)}>Cancel</button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}
