import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { apiUrl, assetUrl } from "@/lib/api";

interface Product {
    _id: string;
    name: string;
    description: string;
    price: number;
    image?: string;
    user: {
        username: string;
        email: string;
    };
}

const Products: React.FC = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [message, setMessage] = useState('');
    const token = localStorage.getItem('token');

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const res = await axios.get(apiUrl('/api/products'));
            setProducts(res.data);
        } catch (err: any) {
            setMessage(err.response?.data?.msg || 'Failed to fetch products');
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this product?')) {
            try {
                await axios.delete(apiUrl(`/api/products/${id}`), {
                    headers: {
                        'x-auth-token': token,
                    },
                });
                setMessage('Product deleted successfully');
                fetchProducts(); // Refresh the list
            } catch (err: any) {
                setMessage(err.response?.data?.msg || 'Failed to delete product');
            }
        }
    };

    return (
        <div style={{ padding: '20px' }}>
            <h2>Products</h2>
            {message && <p style={{ color: message.includes('successfully') ? 'green' : 'red' }}>{message}</p>}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px' }}>
                {products.map((product) => (
                    <div key={product._id} style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '15px', display: 'flex', flexDirection: 'column' }}>
                        {product.image && (
                            <img src={assetUrl(product.image)} alt={product.name} style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '4px', marginBottom: '10px' }} />
                        )}
                        <h3>{product.name}</h3>
                        <p>{product.description}</p>
                        <p><strong>Price: ${product.price}</strong></p>
                        <p>Seller: {product.user.username}</p>
                        {/* Add edit/delete buttons if logged in user is the owner */}
                        {token && (
                            <div>
                                {/* <button onClick={() => alert('Edit functionality to be added')}>Edit</button> */}
                                <button onClick={() => handleDelete(product._id)} style={{ backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', marginTop: '10px' }}>Delete</button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Products;
