// src/components/AdminRoute.test.tsx
import { render } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import AdminRoute from './AdminRoute';

// Mock components
const AdminComponent = () => <div>Admin Content</div>;
const LoginComponent = () => <div>Login Page</div>;

describe('AdminRoute', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('redirects to /login if user is not authenticated', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route path="/login" element={<LoginComponent />} />
          <Route path="/admin" element={<AdminRoute />}>
            <Route index element={<AdminComponent />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(container.innerHTML).toContain('Login Page');
  });

  it('redirects to /login if user is not an admin', () => {
    const user = { email: 'test@example.com', role: 'USER' };
    localStorage.setItem('user', JSON.stringify(user));

    const { container } = render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route path="/login" element={<LoginComponent />} />
          <Route path="/admin" element={<AdminRoute />}>
            <Route index element={<AdminComponent />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(container.innerHTML).toContain('Login Page');
  });

  it('renders the child component if user is an admin', () => {
    const adminUser = { email: 'admin@example.com', role: 'ADMIN' };
    localStorage.setItem('user', JSON.stringify(adminUser));

    const { container } = render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route path="/login" element={<LoginComponent />} />
          <Route path="/admin" element={<AdminRoute />}>
            <Route index element={<AdminComponent />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(container.innerHTML).toContain('Admin Content');
  });
});
