const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');

const app = express();
app.use(cors());

const STAKEHOLDERS = process.env.STAKEHOLDERS_URL || 'http://localhost:8081';
const BLOG = process.env.BLOG_URL || 'http://localhost:8082';
const TOUR = process.env.TOUR_URL || 'http://localhost:8083';

const proxy = (target) => createProxyMiddleware({ target, changeOrigin: true });

app.use('/api/users', proxy(STAKEHOLDERS));
app.use('/api/blogs', proxy(BLOG));
app.use('/api/comments', proxy(BLOG));
app.use('/api/follow', proxy(BLOG));
app.use('/api/following', proxy(BLOG));
app.use('/api/followers', proxy(BLOG));
app.use('/api/tours', proxy(TOUR));
app.use('/api/keypoints', proxy(TOUR));
app.use('/api/position', proxy(TOUR));
app.use('/api/cart', proxy(TOUR));
app.use('/api/purchases', proxy(TOUR));
app.use('/api/executions', proxy(TOUR));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Gateway running on port ${PORT}`));
