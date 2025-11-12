// src/pages/admin/SubmissionsView.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import SubmissionsView from './SubmissionsView';
import { Submission, SubmissionStatus, UserRole } from '../../types/dashboard-types';

const mockSubmissions: Submission[] = [
  {
    id: 1,
    startup_name: 'Test Startup 1',
    user: { id: 1, full_name: 'Founder 1', email: 'founder1@test.com', role: UserRole.USER, createdAt: new Date().toISOString() },
    status: SubmissionStatus.PENDING,
    submitted_at: new Date().toISOString(),
    founders_and_inspiration: 'We are two founders who want to change the world.',
  },
  {
    id: 2,
    startup_name: 'Another Startup',
    user: { id: 2, full_name: 'Founder 2', email: 'founder2@test.com', role: UserRole.USER, createdAt: new Date().toISOString() },
    status: SubmissionStatus.PENDING,
    submitted_at: new Date().toISOString(),
    founders_and_inspiration: 'We are solving a big problem.',
  },
] as Submission[];

describe('SubmissionsView', () => {
  it('renders a list of submissions', () => {
    render(
      <MemoryRouter>
        <SubmissionsView submissions={mockSubmissions} onUpdateStatus={() => {}} />
      </MemoryRouter>
    );
    expect(screen.getByText('Test Startup 1')).toBeInTheDocument();
    expect(screen.getByText('Another Startup')).toBeInTheDocument();
  });

  it('shows the details of the clicked submission', () => {
    render(
      <MemoryRouter>
        <SubmissionsView submissions={mockSubmissions} onUpdateStatus={() => {}} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText('Test Startup 1'));

    expect(screen.getByText('We are two founders who want to change the world.')).toBeInTheDocument();
  });

  it('calls onUpdateStatus when a status button is clicked', () => {
    const onUpdateStatus = vi.fn();
    render(
      <MemoryRouter>
        <SubmissionsView submissions={mockSubmissions} onUpdateStatus={onUpdateStatus} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText('Test Startup 1'));
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));

    expect(onUpdateStatus).toHaveBeenCalledWith(1, SubmissionStatus.APPROVED);
  });
});
