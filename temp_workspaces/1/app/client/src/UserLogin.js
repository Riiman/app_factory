import React, { useState } from 'react';

function validateEmail(email) {
  return /^\S+@\S+\.\S+$/.test(email);
}

function UserLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const validateForm = () => {
    const errors = {};
    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!validateEmail(email)) {
      errors.email = 'Invalid email address';
    }
    if (!password) {
      errors.password = 'Password is required';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!validateForm()) {
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Login failed');
      } else {
        setError('');
        alert('Login successful!');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="UserLogin">
      <h2>Login</h2>
      <form onSubmit={handleSubmit} noValidate>
        <div>
          <label>Email:</label>
          <input
            type="email"
            value={email}
            onChange={e => { setEmail(e.target.value); setFieldErrors({ ...fieldErrors, email: '' }); }}
            required
          />
          {fieldErrors.email && <div style={{ color: 'red', fontSize: '0.9em' }}>{fieldErrors.email}</div>}
        </div>
        <div>
          <label>Password:</label>
          <input
            type="password"
            value={password}
            onChange={e => { setPassword(e.target.value); setFieldErrors({ ...fieldErrors, password: '' }); }}
            required
          />
          {fieldErrors.password && <div style={{ color: 'red', fontSize: '0.9em' }}>{fieldErrors.password}</div>}
        </div>
        {error && <div style={{ color: 'red' }}>{error}</div>}
        <button type="submit" disabled={loading}>{loading ? 'Logging in...' : 'Login'}</button>
      </form>
    </div>
  );
}

export default UserLogin;
