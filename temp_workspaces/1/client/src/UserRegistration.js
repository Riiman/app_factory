import React, { useState } from 'react';

function validateEmail(email) {
  // Simple email regex
  return /^\S+@\S+\.\S+$/.test(email);
}

function validatePassword(password) {
  // At least 6 chars, at least one letter and one number
  return /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/.test(password);
}

function UserRegistration() {
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setFieldErrors({ ...fieldErrors, [e.target.name]: '' });
  };

  const validateForm = () => {
    const errors = {};
    if (!form.username.trim()) {
      errors.username = 'Username is required';
    }
    if (!form.email.trim()) {
      errors.email = 'Email is required';
    } else if (!validateEmail(form.email)) {
      errors.email = 'Invalid email address';
    }
    if (!form.password) {
      errors.password = 'Password is required';
    } else if (!validatePassword(form.password)) {
      errors.password = 'Password must be at least 6 characters and contain at least one letter and one number';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setMessage('');
    setError('');
    if (!validateForm()) {
      return;
    }
    try {
      const res = await fetch('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (res.ok) {
        setMessage('Registration successful!');
        setForm({ username: '', email: '', password: '' });
        setFieldErrors({});
      } else {
        setError(data.error || 'Registration failed');
      }
    } catch (err) {
      setError('Network error');
    }
  };

  return (
    <div>
      <h2>User Registration</h2>
      <form onSubmit={handleSubmit} noValidate>
        <div>
          <label>Username:</label>
          <input name="username" value={form.username} onChange={handleChange} required />
          {fieldErrors.username && <div style={{ color: 'red', fontSize: '0.9em' }}>{fieldErrors.username}</div>}
        </div>
        <div>
          <label>Email:</label>
          <input name="email" type="email" value={form.email} onChange={handleChange} required />
          {fieldErrors.email && <div style={{ color: 'red', fontSize: '0.9em' }}>{fieldErrors.email}</div>}
        </div>
        <div>
          <label>Password:</label>
          <input name="password" type="password" value={form.password} onChange={handleChange} required />
          {fieldErrors.password && <div style={{ color: 'red', fontSize: '0.9em' }}>{fieldErrors.password}</div>}
        </div>
        <button type="submit">Register</button>
      </form>
      {message && <div style={{ color: 'green' }}>{message}</div>}
      {error && <div style={{ color: 'red' }}>{error}</div>}
    </div>
  );
}

export default UserRegistration;
