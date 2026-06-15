import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import { api } from '../api.js';

function MapClickHandler({ onMapClick }) {
  useMapEvents({ click: (e) => onMapClick(e.latlng) });
  return null;
}

export default function TourDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const role = localStorage.getItem('role');
  const userId = localStorage.getItem('userId');

  const [tour, setTour] = useState(null);
  const [keyPoints, setKeyPoints] = useState([]);
  const [purchases, setPurchases] = useState(new Set());
  const [adding, setAdding] = useState(false);
  const [pendingLatLng, setPendingLatLng] = useState(null);
  const [kpForm, setKpForm] = useState({ name: '', description: '', image: '' });
  const [editKp, setEditKp] = useState(null);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    const t = await api.getTour(id);
    setTour(t);
    const kps = await api.getKeyPoints(id);
    setKeyPoints(Array.isArray(kps) ? kps : []);
  }, [id]);

  useEffect(() => {
    load();
    if (role === 'tourist') {
      api.getPurchases().then(p => {
        if (Array.isArray(p)) setPurchases(new Set(p.map(t => t.tourId)));
      });
    }
  }, [load]);

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };

  const handleMapClick = (latlng) => {
    if (!adding) return;
    setPendingLatLng(latlng);
  };

  const saveKeyPoint = async (e) => {
    e.preventDefault();
    if (!pendingLatLng) { flash('Klikni na mapu da odabereš lokaciju'); return; }
    const res = await api.addKeyPoint(id, { ...kpForm, lat: pendingLatLng.lat, long: pendingLatLng.lng });
    if (res.id) {
      setKeyPoints([...keyPoints, res]);
      setAdding(false);
      setPendingLatLng(null);
      setKpForm({ name: '', description: '', image: '' });
      const updated = await api.getTour(id);
      setTour(updated);
      flash('Ključna tačka dodana!');
    } else {
      flash(res.message || 'Greška');
    }
  };

  const deleteKp = async (kpId) => {
    if (!confirm('Obrisati ključnu tačku?')) return;
    await api.deleteKeyPoint(kpId);
    setKeyPoints(keyPoints.filter(k => k.id !== kpId));
    flash('Obrisano');
  };

  const saveEditKp = async (e) => {
    e.preventDefault();
    await api.updateKeyPoint(editKp.id, editKp);
    setKeyPoints(keyPoints.map(k => k.id === editKp.id ? { ...k, ...editKp } : k));
    setEditKp(null);
    flash('Ažurirano');
  };

  const handlePublish = async () => {
    const res = await api.publishTour(id);
    flash(res.message);
    load();
  };

  const handleArchive = async () => {
    const res = await api.archiveTour(id);
    flash(res.message);
    load();
  };

  const handleActivate = async () => {
    const res = await api.activateTour(id);
    flash(res.message);
    load();
  };

  const handleAddToCart = async () => {
    const res = await api.addToCart({ tourId: tour.id, tourName: tour.name, price: tour.price });
    flash(res.message || 'Dodano u korpu!');
  };

  const handleStartExecution = async () => {
    const res = await api.startExecution(id);
    if (res.id) navigate('/execution');
    else flash(res.message);
  };

  if (!tour) return <div className="container"><p>Učitavanje...</p></div>;

  const isPurchased = purchases.has(tour.id);
  const isAuthor = tour.authorId === userId;
  const mapCenter = keyPoints.length > 0
    ? [keyPoints[0].lat, keyPoints[0].long]
    : [44.8, 20.4];

  const visibleKeyPoints = role === 'tourist' && !isPurchased
    ? keyPoints.slice(0, 1)
    : keyPoints;

  return (
    <div className="container">
      <button className="btn btn-secondary mb-16" onClick={() => navigate('/tours')}>← Nazad</button>

      {msg && <div className="card mb-16" style={{ background: '#d1fae5', color: '#065f46' }}>{msg}</div>}

      <div className="card">
        <div className="flex-between">
          <div>
            <h1 style={{ fontSize: 22, color: '#1e3a5f' }}>{tour.name}</h1>
            <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
              <span className={`badge badge-${tour.status}`}>{tour.status === 'draft' ? 'Nacrt' : tour.status === 'published' ? 'Objavljeno' : 'Arhivirano'}</span>
              <span style={{ fontSize: 13, color: '#6b7280' }}>Težina: {tour.difficulty}</span>
              {tour.length > 0 && <span style={{ fontSize: 13, color: '#6b7280' }}>{tour.length.toFixed(2)} km</span>}
              <span style={{ fontSize: 13, color: '#6b7280' }}>Cijena: {tour.price} €</span>
            </div>
          </div>
          {isAuthor && (
            <div className="flex gap-8">
              {tour.status === 'draft' && <button className="btn btn-success" onClick={handlePublish}>Objavi</button>}
              {tour.status === 'published' && <button className="btn btn-warning" onClick={handleArchive}>Arhiviraj</button>}
              {tour.status === 'archived' && <button className="btn btn-success" onClick={handleActivate}>Aktiviraj</button>}
            </div>
          )}
        </div>
        <p style={{ marginTop: 12, lineHeight: 1.7 }}>{tour.description}</p>
        <div style={{ marginTop: 8 }}>
          {(tour.tags || []).map(t => <span key={t} className="tag">{t}</span>)}
        </div>

        {role === 'tourist' && tour.status === 'published' && (
          <div className="flex gap-8 mt-16">
            {!isPurchased
              ? <button className="btn btn-primary" onClick={handleAddToCart}>Dodaj u korpu</button>
              : <button className="btn btn-success" onClick={handleStartExecution}>▶ Pokreni turu</button>
            }
          </div>
        )}
        {role === 'tourist' && !isPurchased && (
          <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 8 }}>
            Kupovinom ture otkrivaš sve ključne tačke.
          </p>
        )}
      </div>

      <div className="card">
        <div className="flex-between mb-16">
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>Ključne tačke ({keyPoints.length})</h2>
          {isAuthor && !adding && (
            <button className="btn btn-primary" onClick={() => setAdding(true)}>+ Dodaj tačku</button>
          )}
          {isAuthor && adding && (
            <button className="btn btn-secondary" onClick={() => { setAdding(false); setPendingLatLng(null); }}>Otkaži</button>
          )}
        </div>

        {adding && (
          <div className="card mb-16" style={{ background: '#eff6ff' }}>
            <p style={{ fontSize: 13, color: '#1d4ed8', marginBottom: 8 }}>
              📍 Klikni na mapu da odabereš lokaciju {pendingLatLng && `→ (${pendingLatLng.lat.toFixed(4)}, ${pendingLatLng.lng.toFixed(4)})`}
            </p>
            <form onSubmit={saveKeyPoint}>
              <div className="form-group"><label>Naziv</label><input value={kpForm.name} onChange={e => setKpForm({ ...kpForm, name: e.target.value })} required /></div>
              <div className="form-group"><label>Opis</label><textarea rows={2} value={kpForm.description} onChange={e => setKpForm({ ...kpForm, description: e.target.value })} /></div>
              <div className="form-group"><label>URL slike (opcionalno)</label><input value={kpForm.image} onChange={e => setKpForm({ ...kpForm, image: e.target.value })} /></div>
              <button type="submit" className="btn btn-success">Sačuvaj tačku</button>
            </form>
          </div>
        )}

        {editKp && (
          <div className="card mb-16" style={{ background: '#fef3c7' }}>
            <h3 style={{ fontSize: 14, marginBottom: 8 }}>Uredi ključnu tačku</h3>
            <form onSubmit={saveEditKp}>
              <div className="form-group"><label>Naziv</label><input value={editKp.name} onChange={e => setEditKp({ ...editKp, name: e.target.value })} /></div>
              <div className="form-group"><label>Opis</label><textarea rows={2} value={editKp.description} onChange={e => setEditKp({ ...editKp, description: e.target.value })} /></div>
              <div className="form-group"><label>URL slike</label><input value={editKp.image || ''} onChange={e => setEditKp({ ...editKp, image: e.target.value })} /></div>
              <div className="flex gap-8">
                <button type="submit" className="btn btn-primary">Sačuvaj</button>
                <button type="button" className="btn btn-secondary" onClick={() => setEditKp(null)}>Otkaži</button>
              </div>
            </form>
          </div>
        )}

        <MapContainer center={mapCenter} zoom={13} className="leaflet-map">
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {isAuthor && adding && <MapClickHandler onMapClick={handleMapClick} />}
          {pendingLatLng && (
            <Marker position={[pendingLatLng.lat, pendingLatLng.lng]}>
              <Popup>Nova ključna tačka</Popup>
            </Marker>
          )}
          {visibleKeyPoints.map((kp, i) => (
            <Marker key={kp.id} position={[kp.lat, kp.long]}>
              <Popup>
                <strong>{i + 1}. {kp.name}</strong>
                <br />{kp.description}
                {kp.image && <><br /><img src={kp.image} alt="" style={{ width: 120, marginTop: 4 }} /></>}
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        <div style={{ marginTop: 16 }}>
          {visibleKeyPoints.map((kp, i) => (
            <div key={kp.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
              <div style={{ minWidth: 28, height: 28, background: '#2563eb', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}>{i + 1}</div>
              <div style={{ flex: 1 }}>
                <strong>{kp.name}</strong>
                <p style={{ fontSize: 13, color: '#6b7280' }}>{kp.description}</p>
                <p style={{ fontSize: 12, color: '#9ca3af' }}>({kp.lat.toFixed(4)}, {kp.long.toFixed(4)})</p>
              </div>
              {isAuthor && (
                <div className="flex gap-8">
                  <button className="btn btn-outline" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setEditKp({ ...kp })}>Uredi</button>
                  <button className="btn btn-danger" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => deleteKp(kp.id)}>Briši</button>
                </div>
              )}
            </div>
          ))}
          {role === 'tourist' && !isPurchased && keyPoints.length > 1 && (
            <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: 13, marginTop: 12 }}>
              🔒 Ostatak ture ({keyPoints.length - 1} tačaka) je dostupan nakon kupovine.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
