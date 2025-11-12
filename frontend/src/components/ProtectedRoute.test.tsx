// src/components/ProtectedRoute.test.tsx
import { render } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';

// Mock component to render when authenticated
const ProtectedComponent = () => <div>Protected Content</div>;
const LoginComponent = () => <div>Login Page</div>;

describe('ProtectedRoute', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('redirects to /login if user is not authenticated', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route path="/login" element={<LoginComponent />} />
          <Route path="/protected" element={<ProtectedRoute />}>
            <Route index element={<ProtectedComponent />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(container.innerHTML).toContain('Login Page');
  });

  it('renders the child component if user is authenticated', () => {
    localStorage.setItem('user', JSON.stringify({ email: 'test@example.com' }));

    const { container } = render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route path="/login" element={<LoginComponent />} />
          <Route path="/protected" element={<ProtectedRoute />}>
            <Route index element={<ProtectedComponent />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(container.innerHTML).toContain('Protected Content');
  });
});
