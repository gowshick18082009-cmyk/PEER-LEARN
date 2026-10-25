import { useState } from 'react';
import api from '../api.js';
import { SUBJECTS, subjectThemes } from '../subjects.js';

export default function AiHelper() {
  const [mode, setMode] = useState('study_plan');
  const [subject, setSubject] = useState('math');
  const [text, setText] = useState('');
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setAnswer('');
    setLoading(true);
    try {
      const data = await api('/ai/assist', {
        method: 'POST',
        body: JSON.stringify({ mode, subject, text }),
      });
      setAnswer(data.answer);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="stack large-gap">
      <header className="app-page-heading">
        <span>A little help, right when you need it</span>
        <h1>Your AI study partner</h1>
        <p>Get a study plan, practice prompts, or help explaining a topic.</p>
      </header>
      <section className="card stack">
        <h2>What are you learning today?</h2>
        <p className="muted">Never type private information. Use the AI as a learning coach.</p>
        <form className="stack" onSubmit={handleSubmit}>
          <div className="grid two-col">
            <label>
              Mode
              <select value={mode} onChange={(event) => setMode(event.target.value)}>
                <option value="study_plan">Study plan</option>
                <option value="question_helper">Question helper</option>
                <option value="practice_questions">Practice questions</option>
              </select>
            </label>
            <label>
              Subject
              <select value={subject} onChange={(event) => setSubject(event.target.value)}>
                {SUBJECTS.map((item) => (
                  <option key={item} value={item}>{subjectThemes[item]?.label || item}</option>
                ))}
              </select>
            </label>
          </div>
          <label>
            Your prompt
            <textarea rows="6" maxLength={500} value={text} onChange={(event) => setText(event.target.value)} placeholder="Describe what you want to learn or review..." required />
          </label>
          {error && <div className="error-box" role="alert">{error}</div>}
          <button className="primary" type="submit" disabled={loading || !text.trim()}>
            {loading ? 'Thinking...' : 'Get help'}
          </button>
        </form>
      </section>

      {answer && (
        <section className="card">
          <h3>AI response</h3>
          <pre className="ai-output">{answer}</pre>
        </section>
      )}
    </div>
  );
}
