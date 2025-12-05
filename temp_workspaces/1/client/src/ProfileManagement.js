import React, { useState, useEffect } from 'react';

function validateEmail(email) {
  return /^\S+@\S+\.\S+$/.test(email);
}

function ProfileManagement() {
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({ username: '', email: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    async function fetchProfile() {
      setLoading(true);
      setError('');
      try {
        const res = await fetch('/api/profile', {
          credentials: 'include',
        });
        if (!res.ok) {
          throw new Error('Failed to fetch profile');
        }
        const data = await res.json();
        setUser(data);
        setForm({ username: data.username || '', email: data.email || '' });
      } catch (err) {
        setError('Could not load profile');
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, []);

  const handleChange = (e) => {
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
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!validateForm()) {
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update profile');
      }
      const updated = await res.json();
      setUser(updated);
      setSuccess('Profile updated successfully!');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading profile...</div>;

  return (
    <div className="ProfileManagement">
      <h2>Profile Management</h2>
      <form onSubmit={handleSubmit} noValidate>
        <div>
          <label>Username:</label>
          <input
            name="username"
            value={form.username}
            onChange={handleChange}
            required
          />
          {fieldErrors.username && <div style={{ color: 'red', fontSize: '0.9em' }}>{fieldErrors.username}</div>}
        </div>
        <div>
          <label>Email:</label>
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            required
          />
          {fieldErrors.email && <div style={{ color: 'red', fontSize: '0.9em' }}>{fieldErrors.email}</div>}
        </div>
        {error && <div style={{ color: 'red' }}>{error}</div>}
        {success && <div style={{ color: 'green' }}>{success}</div>}
        <button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
      </form>
    </div>
  );
}

export default ProfileManagement;
