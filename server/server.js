require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();

// Import models
const User = require('./models/User');
const Complaint = require('./models/Complaint.js');

// Import middlewares
const { auth, adminOnly } = require('./middleware/auth');

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  credentials: true,
}));
app.use(express.json());

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
console.log('Uploads directory path:', uploadsDir);
if (!fs.existsSync(uploadsDir)) {
  console.log('Creating uploads directory');
  fs.mkdirSync(uploadsDir, { recursive: true });
} else {
  console.log('Uploads directory already exists');
}

// Updated storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  // Accept images only
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
    return cb(new Error('Only image files are allowed!'), false);
  }
  cb(null, true);
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Database Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

// Auth Routes
app.post('/signup', [
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password should be at least 6 characters')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    user = new User({ email, password });
    await user.save();

    const payload = { userId: user._id };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });

    res.status(201).json({ 
      msg: 'User created successfully',
      token
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Server error' });
  }
});

app.post('/signin', [
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('password').not().isEmpty().withMessage('Password is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    const payload = { userId: user._id };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });

    res.json({ 
      token, 
      user: { 
        id: user._id, 
        email: user.email, 
        role: user.role 
      } 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Server error' });
  }
});

// User Profile Route
app.get('/user', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Complaint Routes
// Updated complaint route with fixed file handling
app.post('/complaints', auth, upload.single('image'), async (req, res) => {
  console.log('Received complaint submission:', {
    description: req.body.description,
    location: req.body.location,
    file: req.file ? {
      filename: req.file.filename,
      path: req.file.path
    } : 'No file uploaded'
  });

  try {
    if (!req.body.description || !req.body.location) {
      return res.status(400).json({ msg: 'Description and location are required' });
    }

    // Create the complaint object with fixed image path
    const complaint = new Complaint({
      description: req.body.description,
      location: req.body.location,
      status: 'Pending',
      user: req.user.id,
      image: req.file ? `/uploads/${req.file.filename}` : null
    });

    // Save the complaint without trying to delete files on validation errors
    await complaint.save();
    console.log('Complaint saved successfully:', complaint._id);
    res.status(201).json(complaint);
  } catch (error) {
    console.error('Error creating complaint:', error);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Updated GET complaints route with full image URLs
app.get('/complaints', async (req, res) => {
  try {
    const { search, status } = req.query;
    const filter = {};
    
    if (search) {
      filter.$or = [
        { description: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (status) {
      filter.status = status;
    }
    
    const complaints = await Complaint.find(filter)
      .populate('user', 'email')
      .sort({ upvotes: -1, createdAt: -1 });
      
    // Convert each complaint to a plain object and add full image URL
    const results = complaints.map(complaint => {
      const obj = complaint.toObject();
      if (obj.image) {
        // Make sure image path is properly formatted for URLs
        const imagePath = obj.image.startsWith('/') ? obj.image : `/${obj.image}`;
        obj.imageUrl = `http://localhost:5000${imagePath}`;
      }
      return obj;
    });
    
    res.json(results);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Server error' });
  }
});

app.patch('/complaints/:id/upvote', auth, async (req, res) => {
  try {
    const complaint = await Complaint.findByIdAndUpdate(
      req.params.id,
      { $inc: { upvotes: 1 } },
      { new: true }
    );
    
    if (!complaint) {
      return res.status(404).json({ msg: 'Complaint not found' });
    }
    
    res.json(complaint);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Normal users can only update status to "In Progress"
app.patch('/complaints/:id/status', auth, [
  body('status').isIn(['Pending', 'In Progress', 'Resolved']).withMessage('Invalid status')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    // If not admin and trying to set status to "Resolved", deny
    if (req.user.role !== 'admin' && req.body.status === 'Resolved') {
      return res.status(403).json({ msg: 'Only admins can mark complaints as resolved' });
    }

    const complaint = await Complaint.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );
    
    if (!complaint) {
      return res.status(404).json({ msg: 'Complaint not found' });
    }
    
    res.json(complaint);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Admin Routes
// Get all users - Admin only
app.get('/admin/users', auth, adminOnly, async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Update user role - Admin only
app.patch('/admin/users/:id/role', auth, adminOnly, [
  body('role').isIn(['user', 'admin']).withMessage('Invalid role')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role: req.body.role },
      { new: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Delete complaint - Admin only
app.delete('/admin/complaints/:id', auth, adminOnly, async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    
    if (!complaint) {
      return res.status(404).json({ msg: 'Complaint not found' });
    }
    
    // Delete associated image if it exists
    if (complaint.image) {
      // Fix the path joining by removing leading slash
      const imagePath = path.join(__dirname, complaint.image.replace(/^\//, ''));
      console.log('Attempting to delete image at:', imagePath);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
        console.log('Image deleted successfully');
      } else {
        console.log('Image file not found');
      }
    }
    
    await Complaint.findByIdAndDelete(req.params.id);
    
    res.json({ msg: 'Complaint removed' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Create admin user (for testing purposes)
app.post('/create-admin', async (req, res) => {
  const { email, password, secretKey } = req.body;
  
  // Verify admin creation secret key
  if (secretKey !== process.env.ADMIN_SECRET_KEY) {
    return res.status(401).json({ msg: 'Invalid secret key' });
  }
  
  try {
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ msg: 'User already exists' });
    }
    
    user = new User({
      email,
      password,
      role: 'admin'
    });
    
    await user.save();
    
    res.status(201).json({ msg: 'Admin user created successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
