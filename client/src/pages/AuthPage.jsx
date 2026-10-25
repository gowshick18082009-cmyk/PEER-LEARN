import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';

export default function AuthPage({ mode }) {
  const { login, signup } = useAuth();
  const navigate = useNavigate();
  const isSignup = mode === 'signup';
  const [form, setForm] = useState({ name: '', email: '', password: '', agreed: false });
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setPending(true);
    try {
      if (isSignup) {
        await signup({
          name: form.name,
          email: form.email,
          password: form.password,
          agreed: form.agreed,
        });
      } else {
        await login({ email: form.email, password: form.password });
      }
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <h1>{isSignup ? 'Create your account' : 'Welcome back'}</h1>
        <p className="muted">Learn and teach with your peers for free.</p>
        <form onSubmit={handleSubmit} className="stack">
          {isSignup && (
            <label>
              Name
              <input type="text" name="name" value={form.name} onChange={handleChange} required />
            </label>
          )}
          <label>
            Email
            <input type="email" name="email" value={form.email} onChange={handleChange} required />
          </label>
          <label>
            Password
            <input type="password" name="password" value={form.password} onChange={handleChange} required minLength={8} />
          </label>
          {isSignup && (
            <label className="checkbox-row">
              <input type="checkbox" name="agreed" checked={form.agreed} onChange={handleChange} />
              I agree to the community rules.
            </label>
          )}
          {error && <div className="error-box" role="alert">{error}</div>}
          <button className="primary" type="submit" disabled={pending}>
            {pending ? 'Please wait...' : isSignup ? 'Create account' : 'Log in'}
          </button>
        </form>
        <div className="auth-link-row">
          {isSignup ? (
            <span>
              Already have an account? <a href="/login">Log in</a>
            </span>
          ) : (
            <span>
              New here? <a href="/signup">Sign up</a>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
