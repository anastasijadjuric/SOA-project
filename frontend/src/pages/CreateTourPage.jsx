import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';

export default function CreateTourPage() {
  const [form, setForm] = useState({ name: '', description: '', difficulty: 'easy', tags: '', price: 0 });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const tags = form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
    const res = await api.createTour({ ...form, tags, price: parseFloat(form.price) });
    if (res.id) {
      navigate(`/tours/${res.id}`);
    } else {
      setError(res.message || 'Greška');
    }
  };

  return (
    <div className="container">
      <h1 className="page-title">Nova tura</h1>
      <div className="card">
        <form onSubmit={submit}>
          <div className="form-group"><label>Naziv ture</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
          <div className="form-group"><label>Opis</label><textarea rows={5} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required /></div>
          <div className="form-group">
            <label>Težina</label>
            <select value={form.difficulty} onChange={e => setForm({ ...form, difficulty: e.target.value })}>
              <option value="easy">Laka</option>
              <option value="medium">Srednja</option>
              <option value="hard">Teška</option>
            </select>
          </div>
          <div className="form-group"><label>Tagovi (odvojeni zarezom)</label><input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder="priroda, planina, grad..." /></div>
          <div className="form-group"><label>Cijena (€)</label><input type="number" min="0" step="0.01" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} /></div>
          {error && <p className="error">{error}</p>}
          <div className="flex gap-8">
            <button type="submit" className="btn btn-primary">Kreiraj turu</button>
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/tours')}>Otkaži</button>
          </div>
        </form>
      </div>
    </div>
  );
}
