const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  role: { type: String, enum: ['tourist', 'guide', 'admin'], required: true },
  name: { type: String, default: '' },
  surname: { type: String, default: '' },
  profilePicture: { type: String, default: '' },
  biography: { type: String, default: '' },
  motto: { type: String, default: '' },
  isBlocked: { type: Boolean, default: false }
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

module.exports = mongoose.model('User', userSchema);
