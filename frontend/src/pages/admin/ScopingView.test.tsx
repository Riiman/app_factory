// src/pages/admin/ScopingView.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import ScopingView from './ScopingView';
import { Startup, ScopeStatus, StartupStage, UserRole } from '../../types/dashboard-types';

const mockStartups: Startup[] = [
  {
    id: 1,
    name: 'Test Startup 1',
    founders: [{ id: 1, name: 'Founder 1', email: 'founder1@test.com', role: 'CEO' }],
    current_stage: StartupStage.SCOPING,
    scope_document: {
      title: 'Scope Doc 1',
      content: 'This is the scope.',
      comments: [],
      status: ScopeStatus.DRAFT,
    },
  },
] as Startup[];

describe('ScopingView', () => {
  it('renders a list of startups in scoping', () => {
    render(
      <MemoryRouter>
        <ScopingView startupsInScoping={mockStartups} onUpdateScope={() => {}} onAddComment={() => {}} onUpdateStatus={() => {}} />
      </MemoryRouter>
    );
    expect(screen.getByText('Test Startup 1')).toBeInTheDocument();
  });

  it('shows the details of the selected startup', () => {
    render(
      <MemoryRouter>
        <ScopingView startupsInScoping={mockStartups} onUpdateScope={() => {}} onAddComment={() => {}} onUpdateStatus={() => {}} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText('Test Startup 1'));

    expect(screen.getByText('This is the scope.')).toBeInTheDocument();
  });

  it('calls onUpdateStatus when a status button is clicked', () => {
    const onUpdateStatus = vi.fn();
    render(
      <MemoryRouter>
        <ScopingView startupsInScoping={mockStartups} onUpdateScope={() => {}} onAddComment={() => {}} onUpdateStatus={onUpdateStatus} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText('Test Startup 1'));
    fireEvent.click(screen.getByRole('button', { name: 'Mark as Accepted' }));

    expect(onUpdateStatus).toHaveBeenCalledWith(1, ScopeStatus.ACCEPTED);
  });
});
