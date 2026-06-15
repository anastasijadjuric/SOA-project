import { Link, useNavigate, useLocation } from 'react-router-dom';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const role = localStorage.getItem('role');
  const username = localStorage.getItem('username');

  if (!username) return null;

  const logout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const active = (path) => location.pathname.startsWith(path) ? '#1d4ed8' : '#fff';

  const linkStyle = (path) => ({
    color: active(path),
    textDecoration: 'none',
    fontWeight: '500',
    fontSize: '14px',
  });

  return (
    <nav style={{ background: '#1e3a5f', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '56px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        <Link to="/" style={{ color: '#fff', textDecoration: 'none', fontWeight: '700', fontSize: '18px' }}>
          🗺 TouristApp
        </Link>
        <Link to="/blogs" style={linkStyle('/blogs')} >Blogovi</Link>
        <Link to="/users" style={linkStyle('/users')}>Korisnici</Link>
        <Link to="/tours" style={linkStyle('/tours')}>Ture</Link>
        {role === 'tourist' && <Link to="/position" style={linkStyle('/position')}>Pozicija</Link>}
        {role === 'tourist' && <Link to="/cart" style={linkStyle('/cart')}>Korpa</Link>}
        {role === 'tourist' && <Link to="/execution" style={linkStyle('/execution')}>Aktivna tura</Link>}
        {role === 'admin' && <Link to="/admin" style={linkStyle('/admin')}>Admin</Link>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <Link to="/profile" style={{ color: '#93c5fd', textDecoration: 'none', fontSize: '14px' }}>
          👤 {username}
        </Link>
        <button onClick={logout} style={{ background: 'transparent', border: '1px solid #93c5fd', color: '#93c5fd', padding: '4px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
          Odjava
        </button>
      </div>
    </nav>
  );
}
