import { useState, useEffect } from 'react';
import { api } from '../api.js';

export default function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.getProfile().then(p => {
      setProfile(p);
      setForm({ name: p.name || '', surname: p.surname || '', profilePicture: p.profilePicture || '', biography: p.biography || '', motto: p.motto || '' });
    });
  }, []);

  const save = async (e) => {
    e.preventDefault();
    const res = await api.updateProfile(form);
    setProfile(res);
    setEditing(false);
    setMsg('Profil ažuriran!');
    setTimeout(() => setMsg(''), 2000);
  };

  if (!profile) return <div className="container"><p>Učitavanje...</p></div>;

  return (
    <div className="container">
      <h1 className="page-title">Moj profil</h1>
      <div className="card">
        {!editing ? (
          <>
            <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
              {profile.profilePicture && (
                <img src={profile.profilePicture} alt="avatar" style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover' }} />
              )}
              <div>
                <h2>{profile.name || '—'} {profile.surname || ''}</h2>
                <p style={{ color: '#6b7280', fontSize: 13 }}>@{profile.username} · {profile.role}</p>
                {profile.motto && <p style={{ fontStyle: 'italic', marginTop: 8 }}>"{profile.motto}"</p>}
                {profile.biography && <p style={{ marginTop: 8 }}>{profile.biography}</p>}
              </div>
            </div>
            {msg && <p className="success mt-16">{msg}</p>}
            <button className="btn btn-outline mt-16" onClick={() => setEditing(true)}>Uredi profil</button>
          </>
        ) : (
          <form onSubmit={save}>
            <div className="form-group"><label>Ime</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div className="form-group"><label>Prezime</label><input value={form.surname} onChange={e => setForm({ ...form, surname: e.target.value })} /></div>
            <div className="form-group"><label>URL profilne slike</label><input value={form.profilePicture} onChange={e => setForm({ ...form, profilePicture: e.target.value })} /></div>
            <div className="form-group"><label>Biografija</label><textarea value={form.biography} onChange={e => setForm({ ...form, biography: e.target.value })} /></div>
            <div className="form-group"><label>Moto (citat)</label><input value={form.motto} onChange={e => setForm({ ...form, motto: e.target.value })} /></div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" className="btn btn-primary">Sačuvaj</button>
              <button type="button" className="btn btn-secondary" onClick={() => setEditing(false)}>Otkaži</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
