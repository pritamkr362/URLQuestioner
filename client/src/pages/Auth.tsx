import React, { useState } from 'react';
import axios from 'axios';

const Auth: React.FC = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const url = isLogin ? 'http://localhost:5000/api/auth/login' : 'http://localhost:5000/api/auth/register';
            const payload = isLogin ? { email, password } : { username, email, password };
            const res = await axios.post(url, payload);
            setMessage(isLogin ? 'Login successful!' : 'Registration successful!');
            localStorage.setItem('token', res.data.token);
            // Redirect or update UI upon successful auth
        } catch (err: any) {
            setMessage(err.response?.data?.msg || 'An error occurred');
        }
    };

    return (
        <div style={{ padding: '20px', maxWidth: '400px', margin: '50px auto', border: '1px solid #ccc', borderRadius: '8px' }}>
            <h2>{isLogin ? 'Login' : 'Register'}</h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {!isLogin && (
                    <input
                        type="text"
                        placeholder="Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }}
                    />
                )}
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }}
                />
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }}
                />
                <button type="submit" style={{ padding: '10px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                    {isLogin ? 'Login' : 'Register'}
                </button>
            </form>
            <p style={{ marginTop: '15px', textAlign: 'center' }}>
                {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
                <button onClick={() => setIsLogin(!isLogin)} style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', textDecoration: 'underline' }}>
                    {isLogin ? 'Register' : 'Login'}
                </button>
            </p>
            {message && <p style={{ textAlign: 'center', marginTop: '10px', color: message.includes('successful') ? 'green' : 'red' }}>{message}</p>}
        </div>
    );
};

export default Auth;
