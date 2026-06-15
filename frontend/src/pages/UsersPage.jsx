import { useState, useEffect } from 'react';
import { api } from '../api.js';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [following, setFollowing] = useState(new Set());
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.getUsers().then(u => setUsers(Array.isArray(u) ? u : []));
    api.getFollowing().then(f => {
      if (Array.isArray(f)) setFollowing(new Set(f.map(x => x.followingId)));
    });
  }, []);

  const toggle = async (userId) => {
    if (following.has(userId)) {
      await api.unfollowUser(userId);
      setFollowing(s => { const n = new Set(s); n.delete(userId); return n; });
      setMsg('Prestao/la pratiš korisnika');
    } else {
      const res = await api.followUser(userId);
      if (res.message === 'Now following') {
        setFollowing(s => new Set([...s, userId]));
        setMsg('Počeo/la pratiš korisnika');
      } else {
        setMsg(res.detail || res.message);
      }
    }
    setTimeout(() => setMsg(''), 2000);
  };

  return (
    <div className="container">
      <h1 className="page-title">Korisnici</h1>
      {msg && <div className="card" style={{ background: '#d1fae5', color: '#065f46' }}>{msg}</div>}
      <div className="card">
        {users.length === 0 && <p className="empty-state">Nema korisnika.</p>}
        {users.map(u => (
          <div key={u._id} className="user-item">
            <div>
              <strong>@{u.username}</strong>
              <span style={{ marginLeft: 8, fontSize: 12, color: '#6b7280', background: '#f3f4f6', padding: '2px 8px', borderRadius: 10 }}>{u.role === 'tourist' ? 'Turista' : 'Vodič'}</span>
              {u.name && <span style={{ marginLeft: 8, fontSize: 13, color: '#4b5563' }}>{u.name} {u.surname}</span>}
            </div>
            <button
              className={`btn ${following.has(u._id) ? 'btn-secondary' : 'btn-primary'}`}
              onClick={() => toggle(u._id)}
            >
              {following.has(u._id) ? 'Prati ✓' : 'Prati'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
