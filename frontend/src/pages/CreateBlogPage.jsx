import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';

export default function CreateBlogPage() {
  const [form, setForm] = useState({ title: '', description: '', images: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const images = form.images ? form.images.split('\n').map(s => s.trim()).filter(Boolean) : [];
    const res = await api.createBlog({ title: form.title, description: form.description, images });
    if (res._id) {
      navigate(`/blogs/${res._id}`);
    } else {
      setError(res.detail || res.message || 'Greška');
    }
  };

  return (
    <div className="container">
      <h1 className="page-title">Novi blog</h1>
      <div className="card">
        <form onSubmit={submit}>
          <div className="form-group">
            <label>Naslov</label>
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div className="form-group">
            <label>Opis</label>
            <textarea rows={8} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required />
          </div>
          <div className="form-group">
            <label>URL slika (jedan po redu, opcionalno)</label>
            <textarea rows={3} placeholder="https://..." value={form.images} onChange={e => setForm({ ...form, images: e.target.value })} />
          </div>
          {error && <p className="error">{error}</p>}
          <div className="flex gap-8">
            <button type="submit" className="btn btn-primary">Objavi blog</button>
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/blogs')}>Otkaži</button>
          </div>
        </form>
      </div>
    </div>
  );
}
