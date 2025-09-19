import React, { useState } from 'react';
import axios from 'axios';

const AddProduct: React.FC = () => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState<number>(0);
    const [image, setImage] = useState<File | null>(null);
    const [message, setMessage] = useState('');
    const token = localStorage.getItem('token');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!token) {
            setMessage('Please log in to add a product.');
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
            await axios.post('http://localhost:5000/api/products', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'x-auth-token': token,
                },
            });
            setMessage('Product added successfully!');
            setName('');
            setDescription('');
            setPrice(0);
            setImage(null);
        } catch (err: any) {
            setMessage(err.response?.data?.msg || 'An error occurred while adding product');
        }
    };

    return (
        <div style={{ padding: '20px', maxWidth: '600px', margin: '50px auto', border: '1px solid #ccc', borderRadius: '8px' }}>
            <h2>Add New Product</h2>
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
                <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setImage(e.target.files ? e.target.files[0] : null)}
                    style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }}
                />
                <button type="submit" style={{ padding: '10px 15px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                    Add Product
                </button>
            </form>
            {message && <p style={{ textAlign: 'center', marginTop: '15px', color: message.includes('successfully') ? 'green' : 'red' }}>{message}</p>}
        </div>
    );
};

export default AddProduct;
