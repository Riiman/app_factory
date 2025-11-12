// src/components/AuthFormWrapper.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import AuthFormWrapper from './AuthFormWrapper';

describe('AuthFormWrapper', () => {
  it('renders the title, children, and footer', () => {
    render(
      <AuthFormWrapper title="Test Title" footer={<p>Test Footer</p>}>
        <div>Test Children</div>
      </AuthFormWrapper>
    );

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test Children')).toBeInTheDocument();
    expect(screen.getByText('Test Footer')).toBeInTheDocument();
  });

  it('renders the Google sign-in button', () => {
    render(
      <AuthFormWrapper title="Test Title" footer={<p>Test Footer</p>}>
        <div>Test Children</div>
      </AuthFormWrapper>
    );

    expect(screen.getByRole('button', { name: 'Sign in with Google' })).toBeInTheDocument();
  });
});
