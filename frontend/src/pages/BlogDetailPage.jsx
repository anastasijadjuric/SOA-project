import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api.js';

export default function BlogDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const userId = localStorage.getItem('userId');

  const [blog, setBlog] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [liked, setLiked] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.getBlog(id).then(b => {
      setBlog(b);
      setLiked((b.likes || []).includes(userId));
    });
    api.getComments(id).then(c => setComments(Array.isArray(c) ? c : []));
  }, [id]);

  const toggleLike = async () => {
    if (liked) {
      await api.unlikeBlog(id);
      setBlog(b => ({ ...b, likes: (b.likes || []).filter(l => l !== userId) }));
    } else {
      await api.likeBlog(id);
      setBlog(b => ({ ...b, likes: [...(b.likes || []), userId] }));
    }
    setLiked(!liked);
  };

  const submitComment = async (e) => {
    e.preventDefault();
    const res = await api.addComment(id, { text: newComment });
    if (res._id) {
      setComments([...comments, res]);
      setNewComment('');
    } else {
      setMsg(res.detail || res.message || 'Greška - prati autora da bi komentarisao/la');
      setTimeout(() => setMsg(''), 3000);
    }
  };

  const deleteBlog = async () => {
    if (!confirm('Obrisati blog?')) return;
    await api.deleteBlog(id);
    navigate('/blogs');
  };

  if (!blog) return <div className="container"><p>Učitavanje...</p></div>;

  return (
    <div className="container">
      <button className="btn btn-secondary mb-16" onClick={() => navigate('/blogs')}>← Nazad</button>
      <div className="card">
        <div className="flex-between">
          <div>
            <h1 style={{ fontSize: 22, color: '#1e3a5f' }}>{blog.title}</h1>
            <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 4 }}>
              @{blog.authorUsername} · {new Date(blog.createdAt).toLocaleDateString('sr')}
            </p>
          </div>
          {blog.authorId === userId && (
            <button className="btn btn-danger" onClick={deleteBlog}>Obriši</button>
          )}
        </div>
        <p style={{ marginTop: 16, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{blog.description}</p>
        {blog.images && blog.images.length > 0 && (
          <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {blog.images.map((img, i) => (
              <img key={i} src={img} alt="" style={{ width: 200, height: 140, objectFit: 'cover', borderRadius: 6 }} onError={e => e.target.style.display='none'} />
            ))}
          </div>
        )}
        <div className="likes-row mt-8">
          <button
            className={`btn ${liked ? 'btn-danger' : 'btn-outline'}`}
            style={{ padding: '4px 12px' }}
            onClick={toggleLike}
          >
            {liked ? '❤️ Ukloni lajk' : '🤍 Lajkuj'}
          </button>
          <span>{(blog.likes || []).length} lajkova</span>
        </div>
      </div>

      <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Komentari ({comments.length})</h2>
      {comments.length === 0 && <p style={{ color: '#9ca3af', fontSize: 14 }}>Nema komentara.</p>}
      {comments.map(c => (
        <div key={c._id} className="comment-item">
          <div className="flex-between">
            <span className="author">@{c.authorUsername}</span>
            <span className="time">{new Date(c.createdAt).toLocaleString('sr')}</span>
          </div>
          <p className="text">{c.text}</p>
          {c.updatedAt !== c.createdAt && <span style={{ fontSize: 11, color: '#9ca3af' }}>Izmijenjeno: {new Date(c.updatedAt).toLocaleString('sr')}</span>}
        </div>
      ))}
      <div className="card mt-16">
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Dodaj komentar</h3>
        <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 8 }}>Možeš komentarisati samo ako pratiš autora.</p>
        <form onSubmit={submitComment}>
          <textarea
            className="form-group"
            rows={3}
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6 }}
            placeholder="Napiši komentar..."
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            required
          />
          {msg && <p className="error">{msg}</p>}
          <button type="submit" className="btn btn-primary mt-8">Pošalji</button>
        </form>
      </div>
    </div>
  );
}
