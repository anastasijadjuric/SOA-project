import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';

export default function BlogsPage() {
  const [blogs, setBlogs] = useState([]);
  const [mode, setMode] = useState('followed');
  const [loading, setLoading] = useState(true);

  const load = async (m) => {
    setLoading(true);
    const data = m === 'all' ? await api.getAllBlogs() : await api.getBlogs();
    setBlogs(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { load(mode); }, [mode]);

  return (
    <div className="container">
      <div className="flex-between mb-16">
        <h1 className="page-title" style={{ margin: 0 }}>Blogovi</h1>
        <Link to="/blogs/create" className="btn btn-primary">+ Novi blog</Link>
      </div>
      <div className="flex gap-8 mb-16">
        <button className={`btn ${mode === 'followed' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setMode('followed')}>Pratioci</button>
        <button className={`btn ${mode === 'all' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setMode('all')}>Svi blogovi</button>
      </div>
      {loading ? <p>Učitavanje...</p> : blogs.length === 0 ? (
        <div className="empty-state">Nema blogova. {mode === 'followed' && 'Počni pratiti korisnike!'}</div>
      ) : blogs.map(blog => (
        <div key={blog._id} className="card">
          <div className="flex-between">
            <div>
              <Link to={`/blogs/${blog._id}`} style={{ fontWeight: 700, fontSize: 16, color: '#1e3a5f', textDecoration: 'none' }}>{blog.title}</Link>
              <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>@{blog.authorUsername} · {new Date(blog.createdAt).toLocaleDateString('sr')}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#6b7280', fontSize: 13 }}>
              ❤️ {(blog.likes || []).length}
            </div>
          </div>
          <p style={{ marginTop: 8, fontSize: 14, color: '#4b5563', lineHeight: 1.5 }}>
            {blog.description.length > 200 ? blog.description.slice(0, 200) + '...' : blog.description}
          </p>
          {blog.images && blog.images.length > 0 && (
            <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
              {blog.images.slice(0, 3).map((img, i) => (
                <img key={i} src={img} alt="" style={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 4 }} onError={e => e.target.style.display='none'} />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
