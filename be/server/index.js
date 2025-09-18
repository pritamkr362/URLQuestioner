const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: (origin, cb) => {
    const allowed = (process.env.UI_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
    if (!origin) return cb(null, true);
    if (allowed.includes(origin)) return cb(null, true);
    cb(new Error('CORS: origin not allowed'));
  },
  credentials: true,
}));
app.use(express.json()); // For parsing application/json
app.use('/uploads', express.static('uploads')); // Serve static files from 'uploads' directory

// MongoDB Connection
mongoose.connect('mongodb://localhost:27017/reselling-app', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error(err));

// Basic Route
app.get('/', (req, res) => {
    res.send('Reselling App API is running');
});

const authRoutes = require('./routes/auth/auth');
const productRoutes = require('./routes/product/product');
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
