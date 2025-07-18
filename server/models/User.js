const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Define the user schema
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' }
});

// Hash password before saving to the database
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next(); // Only hash if password is modified
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Create a model for the user schema
const User = mongoose.model('User', userSchema);

module.exports = User;
