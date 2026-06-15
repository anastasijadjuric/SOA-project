import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';

export default function ShoppingCartPage() {
  const [cart, setCart] = useState({ items: [], totalPrice: 0 });
  const [purchases, setPurchases] = useState([]);
  const [msg, setMsg] = useState('');
  const navigate = useNavigate();

  const loadCart = () => api.getCart().then(c => setCart(c || { items: [], totalPrice: 0 }));

  useEffect(() => {
    loadCart();
    api.getPurchases().then(p => setPurchases(Array.isArray(p) ? p : []));
  }, []);

  const remove = async (tourId) => {
    await api.removeFromCart(tourId);
    loadCart();
  };

  const doCheckout = async () => {
    if (cart.items.length === 0) return;
    const res = await api.checkout();
    if (Array.isArray(res)) {
      setMsg(`Kupovina uspješna! Dobio/la si ${res.length} token(a).`);
      loadCart();
      api.getPurchases().then(p => setPurchases(Array.isArray(p) ? p : []));
    } else {
      setMsg(res.message || 'Greška');
    }
  };

  return (
    <div className="container">
      <h1 className="page-title">🛒 Korpa</h1>

      {msg && <div className="card mb-16" style={{ background: '#d1fae5', color: '#065f46' }}>{msg}</div>}

      <div className="card mb-16">
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Stavke u korpi</h2>
        {(cart.items || []).length === 0
          ? <p className="empty-state">Korpa je prazna.</p>
          : (
            <>
              {cart.items.map(item => (
                <div key={item.tourId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
                  <div>
                    <strong>{item.tourName}</strong>
                    <p style={{ fontSize: 13, color: '#6b7280' }}>{item.price} €</p>
                  </div>
                  <button className="btn btn-danger" style={{ padding: '4px 10px' }} onClick={() => remove(item.tourId)}>Ukloni</button>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
                <strong style={{ fontSize: 16 }}>Ukupno: {(cart.totalPrice || 0).toFixed(2)} €</strong>
                <button className="btn btn-success" onClick={doCheckout}>Kupi sve</button>
              </div>
            </>
          )
        }
      </div>

      <div className="card">
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Kupljene ture</h2>
        {purchases.length === 0
          ? <p style={{ color: '#9ca3af', fontSize: 14 }}>Nema kupljenih tura.</p>
          : purchases.map(p => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
              <span style={{ fontSize: 14 }}>Tura ID: <code style={{ fontSize: 12, background: '#f3f4f6', padding: '2px 6px', borderRadius: 4 }}>{p.tourId}</code></span>
              <div className="flex gap-8">
                <button className="btn btn-outline" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => navigate(`/tours/${p.tourId}`)}>Pogledaj</button>
                <button className="btn btn-success" style={{ padding: '4px 10px', fontSize: 12 }} onClick={async () => {
                  const res = await api.startExecution(p.tourId);
                  if (res.id) navigate('/execution');
                  else setMsg(res.message);
                }}>▶ Pokreni</button>
              </div>
            </div>
          ))
        }
      </div>
    </div>
  );
}
