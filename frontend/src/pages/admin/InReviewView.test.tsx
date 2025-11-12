// src/pages/admin/InReviewView.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import InReviewView from './InReviewView';
import { Submission, SubmissionStatus, UserRole, Startup, StartupStatus, StartupStage } from '../../types/dashboard-types';

const mockSubmissions: Submission[] = [
  {
    id: 1,
    startup_name: 'Test Startup 1',
    user_id: 1,
    status: SubmissionStatus.IN_REVIEW,
    submitted_at: new Date().toISOString(),
    problem_statement: 'The problem is...',
    evaluation: {
      overall_score: 85,
      final_decision: 'Approve',
      overall_summary: 'This is a great idea!',
    },
  },
] as Submission[];

const mockUsers = [
  { id: 1, full_name: 'Founder 1', email: 'founder1@test.com', role: UserRole.USER, createdAt: new Date().toISOString() },
];

const mockStartups = [
  { id: 1, submission_id: 1, name: 'Test Startup 1', tasks: [] },
] as Startup[];

describe('InReviewView', () => {
  it('renders a list of submissions in review', () => {
    render(
      <MemoryRouter>
        <InReviewView submissions={mockSubmissions} users={mockUsers} startups={mockStartups} onUpdateStatus={() => {}} onAddTask={() => {}} />
      </MemoryRouter>
    );
    expect(screen.getAllByText('Test Startup 1')[0]).toBeInTheDocument();
  });

  it('shows the details of the selected submission', () => {
    render(
      <MemoryRouter>
        <InReviewView submissions={mockSubmissions} users={mockUsers} startups={mockStartups} onUpdateStatus={() => {}} onAddTask={() => {}} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getAllByText('Test Startup 1')[0]);
    expect(screen.getByText('This is a great idea!')).toBeInTheDocument();
  });

  it('calls onUpdateStatus when a status button is clicked', () => {
    const onUpdateStatus = vi.fn();
    render(
      <MemoryRouter>
        <InReviewView submissions={mockSubmissions} users={mockUsers} startups={mockStartups} onUpdateStatus={onUpdateStatus} onAddTask={() => {}} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getAllByText('Test Startup 1')[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));

    expect(onUpdateStatus).toHaveBeenCalledWith(1, SubmissionStatus.APPROVED);
  });
});
