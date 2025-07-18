// models/Complaint.js
const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
  description: {
    type: String,
    required: true,
  },
  location: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['Pending', 'In Progress', 'Resolved'],
    default: 'Pending',
  },
  upvotes: {
    type: Number,
    default: 0,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  image: {
    type: String,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Add text index for search functionality
complaintSchema.index({ description: 'text', location: 'text' });

module.exports = mongoose.model('Complaint', complaintSchema);