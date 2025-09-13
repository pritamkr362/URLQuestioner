import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useRoute, Link, useLocation } from "wouter";

interface Product {
    _id: string;
    name: string;
    description: string;
    price: number;
    image?: string;
}

const EditProduct: React.FC = () => {
    const [match, params] = useRoute("/edit-product/:id");
    const productId = match ? params.id : null;
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState<number>(0);
    const [image, setImage] = useState<File | null>(null);
    const [currentImage, setCurrentImage] = useState('');
    const [message, setMessage] = useState('');
    const token = localStorage.getItem('token');
    const [location, setLocation] = useLocation();

    useEffect(() => {
        if (productId) {
            fetchProductDetails();
        }
    }, [productId]);

    const fetchProductDetails = async () => {
        try {
            const res = await axios.get(`http://localhost:5000/api/products/${productId}`);
            const product: Product = res.data;
            setName(product.name);
            setDescription(product.description);
            setPrice(product.price);
            setCurrentImage(product.image || '');
        } catch (err: any) {
            setMessage(err.response?.data?.msg || 'Failed to fetch product details');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!token) {
            setMessage('Please log in to edit a product.');
            return;
        }

        const formData = new FormData();
        formData.append('name', name);
        formData.append('description', description);
        formData.append('price', price.toString());
        if (image) {
            formData.append('image', image);
        }

        try {
            await axios.put(`http://localhost:5000/api/products/${productId}`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'x-auth-token': token,
                },
            });
            setMessage('Product updated successfully!');
            setLocation('/products'); // Redirect to products page after update
        } catch (err: any) {
            setMessage(err.response?.data?.msg || 'An error occurred while updating product');
        }
    };

    return (
        <div style={{ padding: '20px', maxWidth: '600px', margin: '50px auto', border: '1px solid #ccc', borderRadius: '8px' }}>
            <h2>Edit Product</h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <input
                    type="text"
                    placeholder="Product Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }}
                />
                <textarea
                    placeholder="Product Description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    rows={4}
                    style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }}
                ></textarea>
                <input
                    type="number"
                    placeholder="Price"
                    value={price}
                    onChange={(e) => setPrice(parseFloat(e.target.value))}
                    required
                    min="0"
                    step="0.01"
                    style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }}
                />
                {currentImage && (
                    <div style={{ marginBottom: '10px' }}>
                        <p>Current Image:</p>
                        <img src={`http://localhost:5000${currentImage}`} alt="Current Product" style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '4px' }} />
                    </div>
                )}
                <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setImage(e.target.files ? e.target.files[0] : null)}
                    style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }}
                />
                <button type="submit" style={{ padding: '10px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                    Update Product
                </button>
            </form>
            {message && <p style={{ textAlign: 'center', marginTop: '15px', color: message.includes('successful') ? 'green' : 'red' }}>{message}</p>}
            <div style={{ marginTop: '20px', textAlign: 'center' }}>
                <Link href="/products">
                    <a style={{ color: '#007bff', textDecoration: 'none' }}>Back to Products</a>
                </Link>
            </div>
        </div>
    );
};

export default EditProduct;
