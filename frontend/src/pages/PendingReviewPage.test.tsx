// src/pages/PendingReviewPage.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import PendingReviewPage from './PendingReviewPage';

describe('PendingReviewPage', () => {
  it('renders the main heading', () => {
    render(
      <MemoryRouter>
        <PendingReviewPage />
      </MemoryRouter>
    );
    expect(screen.getByText('Submission Under Review')).toBeInTheDocument();
  });
});
