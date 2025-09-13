const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const Product = require('../../models/Product');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Set up multer for file uploads
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        // Create 'uploads' directory if it doesn't exist
        const uploadDir = 'uploads';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: function(req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    },
});

const upload = multer({ storage: storage });

// @route   POST api/products
// @desc    Add a new product
// @access  Private
router.post('/', auth, upload.single('image'), async (req, res) => {
    const { name, description, price } = req.body;

    try {
        const newProduct = new Product({
            user: req.user.id,
            name,
            description,
            price,
            image: req.file ? `/uploads/${req.file.filename}` : '', // Save path to image
        });

        const product = await newProduct.save();
        res.json(product);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   GET api/products
// @desc    Get all products
// @access  Public (can be changed to Private with auth middleware)
router.get('/', async (req, res) => {
    try {
        const products = await Product.find().populate('user', ['username', 'email']);
        res.json(products);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   GET api/products/user
// @desc    Get all products by a specific user
// @access  Private
router.get('/user', auth, async (req, res) => {
    try {
        const products = await Product.find({ user: req.user.id }).populate('user', ['username', 'email']);
        res.json(products);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   GET api/products/:id
// @desc    Get product by ID
// @access  Public
router.get('/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({ msg: 'Product not found' });
        }

        res.json(product);
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Product not found' });
        }
        res.status(500).send('Server error');
    }
});

// @route   PUT api/products/:id
// @desc    Update a product
// @access  Private
router.put('/:id', auth, upload.single('image'), async (req, res) => {
    const { name, description, price } = req.body;

    // Build product object
    const productFields = { name, description, price };
    if (req.file) {
        productFields.image = `/uploads/${req.file.filename}`;
    }

    try {
        let product = await Product.findById(req.params.id);

        if (!product) return res.status(404).json({ msg: 'Product not found' });

        // Make sure user owns product
        if (product.user.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
        }

        product = await Product.findByIdAndUpdate(
            req.params.id,
            { $set: productFields },
            { new: true }
        );

        res.json(product);
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Product not found' });
        }
        res.status(500).send('Server error');
    }
});

// @route   DELETE api/products/:id
// @desc    Delete a product
// @access  Private
router.delete('/:id', auth, async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({ msg: 'Product not found' });
        }

        // Make sure user owns product
        if (product.user.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
        }

        await Product.findByIdAndRemove(req.params.id);

        res.json({ msg: 'Product removed' });
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Product not found' });
        }
        res.status(500).send('Server error');
    }
});

module.exports = router;
