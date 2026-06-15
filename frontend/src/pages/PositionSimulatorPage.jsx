import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import { api } from '../api.js';

function ClickHandler({ onMapClick }) {
  useMapEvents({ click: (e) => onMapClick(e.latlng) });
  return null;
}

export default function PositionSimulatorPage() {
  const [position, setPosition] = useState(null);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.getPosition().then(p => {
      if (p && p.lat) setPosition({ lat: p.lat, lng: p.long });
    });
  }, []);

  const handleMapClick = async ({ lat, lng }) => {
    const res = await api.setPosition({ lat, long: lng });
    if (res.lat !== undefined) {
      setPosition({ lat, lng });
      setMsg(`Pozicija postavljena: (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
      setTimeout(() => setMsg(''), 3000);
    }
  };

  const center = position ? [position.lat, position.lng] : [44.8, 20.4];

  return (
    <div className="container">
      <h1 className="page-title">📍 Simulator pozicije</h1>
      <div className="card mb-16">
        <p style={{ fontSize: 14, color: '#4b5563' }}>
          Klikni na mapu da postaviš svoju trenutnu poziciju. Ova lokacija se koristi tokom izvođenja ture.
        </p>
        {position && (
          <p style={{ marginTop: 8, fontSize: 13, fontWeight: 600, color: '#1e3a5f' }}>
            Trenutna pozicija: {position.lat.toFixed(5)}, {position.lng.toFixed(5)}
          </p>
        )}
        {msg && <p className="success">{msg}</p>}
      </div>
      <MapContainer center={center} zoom={13} style={{ height: 500, borderRadius: 8, border: '1px solid #d1d5db' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <ClickHandler onMapClick={handleMapClick} />
        {position && (
          <Marker position={[position.lat, position.lng]}>
            <Popup>Tvoja pozicija</Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
