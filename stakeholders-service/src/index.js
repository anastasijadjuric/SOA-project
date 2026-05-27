const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const usersRouter = require('./routes/users');

const app = express();
app.use(cors());
app.use(express.json());

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/stakeholders';
mongoose.connect(MONGO_URI).then(() => console.log('MongoDB connected')).catch(console.error);

app.use('/api/users', usersRouter);

const PORT = process.env.PORT || 8081;
app.listen(PORT, () => console.log(`Stakeholders service running on port ${PORT}`));
