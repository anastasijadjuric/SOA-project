import { useState, useEffect } from 'react';
import { api } from '../api.js';

export default function AdminPage() {
  const [users, setUsers] = useState([]);
  const [msg, setMsg] = useState('');

  const load = () => api.getAllUsers().then(u => setUsers(Array.isArray(u) ? u : []));

  useEffect(() => { load(); }, []);

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };

  const block = async (id) => {
    await api.blockUser(id);
    flash('Korisnik blokiran');
    load();
  };

  const unblock = async (id) => {
    await api.unblockUser(id);
    flash('Korisnik odblokiran');
    load();
  };

  const seedAdmin = async () => {
    const res = await api.seedAdmin();
    flash(res.message);
  };

  return (
    <div className="container">
      <div className="flex-between mb-16">
        <h1 className="page-title" style={{ margin: 0 }}>Admin panel</h1>
        <button className="btn btn-outline" onClick={seedAdmin}>Kreiraj admin nalog</button>
      </div>
      {msg && <div className="card mb-16" style={{ background: '#d1fae5', color: '#065f46' }}>{msg}</div>}
      <div className="card">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
              <th style={{ textAlign: 'left', padding: '8px 0' }}>Korisnik</th>
              <th style={{ textAlign: 'left', padding: '8px 0' }}>Email</th>
              <th style={{ textAlign: 'left', padding: '8px 0' }}>Uloga</th>
              <th style={{ textAlign: 'left', padding: '8px 0' }}>Status</th>
              <th style={{ textAlign: 'left', padding: '8px 0' }}>Akcija</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u._id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '10px 0' }}>@{u.username}</td>
                <td>{u.email}</td>
                <td><span className="badge badge-draft">{u.role}</span></td>
                <td>
                  {u.isBlocked
                    ? <span className="badge" style={{ background: '#fee2e2', color: '#991b1b' }}>Blokiran</span>
                    : <span className="badge badge-published">Aktivan</span>
                  }
                </td>
                <td>
                  {u.role !== 'admin' && (
                    u.isBlocked
                      ? <button className="btn btn-success" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => unblock(u._id)}>Odblokiraj</button>
                      : <button className="btn btn-danger" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => block(u._id)}>Blokiraj</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
