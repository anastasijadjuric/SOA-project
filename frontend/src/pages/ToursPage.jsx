import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';

export default function ToursPage() {
  const role = localStorage.getItem('role');
  const [tours, setTours] = useState([]);
  const [purchases, setPurchases] = useState(new Set());
  const navigate = useNavigate();

  useEffect(() => {
    const load = role === 'guide' ? api.getMyTours() : api.getTours();
    load.then(t => setTours(Array.isArray(t) ? t : []));
    if (role === 'tourist') {
      api.getPurchases().then(p => {
        if (Array.isArray(p)) setPurchases(new Set(p.map(t => t.tourId)));
      });
    }
  }, []);

  const addToCart = async (tour) => {
    const res = await api.addToCart({ tourId: tour.id, tourName: tour.name, price: tour.price });
    if (res.message) alert(res.message);
    else alert('Dodano u korpu!');
  };

  const statusBadge = (s) => <span className={`badge badge-${s}`}>{s === 'draft' ? 'Nacrt' : s === 'published' ? 'Objavljeno' : 'Arhivirano'}</span>;

  return (
    <div className="container">
      <div className="flex-between mb-16">
        <h1 className="page-title" style={{ margin: 0 }}>
          {role === 'guide' ? 'Moje ture' : 'Ture'}
        </h1>
        {role === 'guide' && <Link to="/tours/create" className="btn btn-primary">+ Nova tura</Link>}
      </div>
      {tours.length === 0 && <div className="empty-state">Nema tura.</div>}
      {tours.map(tour => (
        <div key={tour.id} className="card">
          <div className="flex-between">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Link to={`/tours/${tour.id}`} style={{ fontWeight: 700, fontSize: 16, color: '#1e3a5f', textDecoration: 'none' }}>
                  {tour.name}
                </Link>
                {statusBadge(tour.status)}
              </div>
              <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
                Težina: {tour.difficulty} · {tour.length ? `${tour.length.toFixed(1)} km` : 'dužina nepoznata'} · Cijena: {tour.price} €
              </p>
              <div style={{ marginTop: 4 }}>
                {(tour.tags || []).map(t => <span key={t} className="tag">{t}</span>)}
              </div>
            </div>
            {role === 'tourist' && (
              <div style={{ display: 'flex', gap: 8, flexDirection: 'column', alignItems: 'flex-end' }}>
                {purchases.has(tour.id)
                  ? <span className="badge badge-published">Kupljeno ✓</span>
                  : <button className="btn btn-primary" onClick={() => addToCart(tour)}>Dodaj u korpu</button>
                }
              </div>
            )}
          </div>
          <p style={{ marginTop: 8, fontSize: 14, color: '#4b5563' }}>
            {tour.description.length > 150 ? tour.description.slice(0, 150) + '...' : tour.description}
          </p>
        </div>
      ))}
    </div>
  );
}
