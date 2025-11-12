// src/pages/HomePage.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import HomePage from './HomePage';

describe('HomePage', () => {
  it('renders the main heading', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );
    expect(screen.getByText(/Turn Your/)).toBeInTheDocument();
    expect(screen.getByText(/Vision/)).toBeInTheDocument();
    expect(screen.getByText(/into a Venture./)).toBeInTheDocument();
  });

  it('renders the main call-to-action button', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );
    expect(screen.getByRole('link', { name: 'Start Building For Free' })).toBeInTheDocument();
  });

  it('renders all feature sections', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );
    expect(screen.getByText('Validate & Refine')).toBeInTheDocument();
    expect(screen.getByText('Build & Launch')).toBeInTheDocument();
    expect(screen.getByText('Grow & Scale')).toBeInTheDocument();
    expect(screen.getByText('Fund & Succeed')).toBeInTheDocument();
  });
});
