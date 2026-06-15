import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api.js';

export default function LoginPage() {
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const res = await api.login(form);
    if (res.token) {
      localStorage.setItem('token', res.token);
      localStorage.setItem('userId', res.user.id);
      localStorage.setItem('username', res.user.username);
      localStorage.setItem('role', res.user.role);
      navigate('/blogs');
    } else {
      setError(res.message || 'Greška pri prijavi');
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
      <div className="card" style={{ width: 360 }}>
        <h2 style={{ textAlign: 'center', marginBottom: 24, color: '#1e3a5f' }}>🗺 Prijava</h2>
        <form onSubmit={submit}>
          <div className="form-group">
            <label>Korisničko ime</label>
            <input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} required />
          </div>
          <div className="form-group">
            <label>Lozinka</label>
            <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
          </div>
          {error && <p className="error">{error}</p>}
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 8 }}>Prijavi se</button>
        </form>
        <p style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: '#6b7280' }}>
          Nemaš nalog? <Link to="/register" style={{ color: '#2563eb' }}>Registruj se</Link>
        </p>
      </div>
    </div>
  );
}
