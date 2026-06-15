import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import { api } from '../api.js';

export default function TourExecutionPage() {
  const navigate = useNavigate();
  const [execution, setExecution] = useState(null);
  const [tour, setTour] = useState(null);
  const [keyPoints, setKeyPoints] = useState([]);
  const [position, setPosition] = useState(null);
  const [log, setLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef(null);

  const addLog = (msg) => setLog(l => [{ time: new Date().toLocaleTimeString('sr'), msg }, ...l.slice(0, 19)]);

  const loadExecution = useCallback(async () => {
    const exec = await api.getActiveExecution();
    if (exec && exec.id) {
      setExecution(exec);
      const t = await api.getTour(exec.tourId);
      setTour(t);
      const kps = await api.getKeyPoints(exec.tourId);
      setKeyPoints(Array.isArray(kps) ? kps : []);
    }
    setLoading(false);
  }, []);

  const checkProximity = useCallback(async () => {
    if (!execution) return;
    const pos = await api.getPosition();
    if (pos && pos.lat !== undefined) {
      setPosition({ lat: pos.lat, lng: pos.long });
    }
    const res = await api.checkProximity(execution.id);
    if (res.newlyCompleted && res.newlyCompleted.length > 0) {
      addLog(`✅ Kompletirao/la ${res.newlyCompleted.length} ključnih tačaka!`);
      loadExecution();
    } else {
      addLog('🔍 Provjera blizine...');
    }
  }, [execution, loadExecution]);

  useEffect(() => {
    loadExecution();
  }, [loadExecution]);

  useEffect(() => {
    if (!execution) return;
    intervalRef.current = setInterval(checkProximity, 10000);
    addLog('▶ Tura pokrenuta. Provjera svakih 10s...');
    return () => clearInterval(intervalRef.current);
  }, [execution, checkProximity]);

  const end = async (action) => {
    clearInterval(intervalRef.current);
    if (action === 'complete') await api.completeExecution(execution.id);
    else await api.abandonExecution(execution.id);
    navigate('/cart');
  };

  if (loading) return <div className="container"><p>Učitavanje aktivne ture...</p></div>;

  if (!execution) return (
    <div className="container">
      <div className="card">
        <h1 className="page-title">Nema aktivne ture</h1>
        <p style={{ color: '#6b7280' }}>Pokreni turu iz korpe ili iz pregleda tura.</p>
        <button className="btn btn-primary mt-16" onClick={() => navigate('/cart')}>Idi na korpu</button>
      </div>
    </div>
  );

  const mapCenter = position
    ? [position.lat, position.lng]
    : keyPoints.length > 0 ? [keyPoints[0].lat, keyPoints[0].long] : [44.8, 20.4];

  const completedIds = new Set((execution.completedKeyPoints || []).map(c => c.keyPointId));

  return (
    <div className="container">
      <div className="flex-between mb-16">
        <h1 className="page-title" style={{ margin: 0 }}>
          ▶ Aktivna tura: {tour?.name}
        </h1>
        <div className="flex gap-8">
          <button className="btn btn-success" onClick={() => end('complete')}>✓ Završi</button>
          <button className="btn btn-danger" onClick={() => end('abandon')}>✗ Napusti</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16 }}>
        <div>
          <MapContainer center={mapCenter} zoom={14} style={{ height: 450, borderRadius: 8, border: '1px solid #d1d5db' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {position && (
              <>
                <Marker position={[position.lat, position.lng]}>
                  <Popup>📍 Tvoja pozicija</Popup>
                </Marker>
                <Circle center={[position.lat, position.lng]} radius={200} color="#2563eb" fillOpacity={0.1} />
              </>
            )}
            {keyPoints.map((kp, i) => {
              const done = completedIds.has(kp.id);
              return (
                <Marker key={kp.id} position={[kp.lat, kp.long]}>
                  <Popup>
                    <strong>{done ? '✅' : `${i+1}.`} {kp.name}</strong>
                    <br />{kp.description}
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>

          <div className="card mt-16">
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
              Ključne tačke ({completedIds.size}/{keyPoints.length})
            </h3>
            {keyPoints.map((kp, i) => {
              const done = completedIds.has(kp.id);
              return (
                <div key={kp.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid #f3f4f6' }}>
                  <span style={{ fontSize: 18 }}>{done ? '✅' : '⬜'}</span>
                  <div>
                    <strong style={{ fontSize: 14, color: done ? '#16a34a' : '#333' }}>{i+1}. {kp.name}</strong>
                    <p style={{ fontSize: 12, color: '#9ca3af' }}>({kp.lat.toFixed(4)}, {kp.long.toFixed(4)})</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <div className="card">
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Informacije</h3>
            <p style={{ fontSize: 13 }}><strong>Status:</strong> aktivan</p>
            <p style={{ fontSize: 13 }}><strong>Pokrenuto:</strong> {new Date(execution.startedAt).toLocaleTimeString('sr')}</p>
            {position && (
              <p style={{ fontSize: 13 }}><strong>Pozicija:</strong> {position.lat.toFixed(4)}, {position.lng.toFixed(4)}</p>
            )}
            <p style={{ fontSize: 13, color: '#6b7280', marginTop: 8 }}>
              💡 Postavi poziciju na simulatoru i priđi na 200m od ključne tačke.
            </p>
            <button className="btn btn-outline mt-8" style={{ width: '100%' }} onClick={() => navigate('/position')}>
              📍 Idi na simulator
            </button>
          </div>

          <div className="card mt-16">
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Log aktivnosti</h3>
            <div style={{ maxHeight: 250, overflowY: 'auto' }}>
              {log.length === 0 && <p style={{ fontSize: 13, color: '#9ca3af' }}>Nema aktivnosti...</p>}
              {log.map((entry, i) => (
                <div key={i} style={{ fontSize: 12, padding: '4px 0', borderBottom: '1px solid #f9fafb' }}>
                  <span style={{ color: '#9ca3af' }}>{entry.time}</span> {entry.msg}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
