// src/pages/RejectedSubmissionPage.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import RejectedSubmissionPage from './RejectedSubmissionPage';

describe('RejectedSubmissionPage', () => {
  it('renders the main heading', () => {
    render(
      <MemoryRouter>
        <RejectedSubmissionPage />
      </MemoryRouter>
    );
    expect(screen.getByText('Submission Not Approved')).toBeInTheDocument();
  });
});
