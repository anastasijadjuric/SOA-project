import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api.js';

export default function RegisterPage() {
  const [form, setForm] = useState({ username: '', password: '', email: '', role: 'tourist' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const res = await api.register(form);
    if (res.message === 'User created') {
      setSuccess('Nalog kreiran! Možeš se prijaviti.');
      setTimeout(() => navigate('/login'), 1500);
    } else {
      setError(res.message || 'Greška pri registraciji');
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
      <div className="card" style={{ width: 380 }}>
        <h2 style={{ textAlign: 'center', marginBottom: 24, color: '#1e3a5f' }}>🗺 Registracija</h2>
        <form onSubmit={submit}>
          <div className="form-group">
            <label>Korisničko ime</label>
            <input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} required />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div className="form-group">
            <label>Lozinka</label>
            <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
          </div>
          <div className="form-group">
            <label>Uloga</label>
            <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
              <option value="tourist">Turista</option>
              <option value="guide">Vodič</option>
            </select>
          </div>
          {error && <p className="error">{error}</p>}
          {success && <p className="success">{success}</p>}
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 8 }}>Registruj se</button>
        </form>
        <p style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: '#6b7280' }}>
          Već imaš nalog? <Link to="/login" style={{ color: '#2563eb' }}>Prijavi se</Link>
        </p>
      </div>
    </div>
  );
}
