// src/pages/admin/StartupListView.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import StartupListView from './StartupListView';
import { Startup, StartupStatus, StartupStage } from '../../types/dashboard-types';

const mockStartups: Startup[] = [
  {
    id: 1,
    name: 'Test Startup 1',
    founders: [{ id: 1, name: 'Founder 1', email: 'founder1@test.com', mobile: '1234567890' }],
    status: StartupStatus.ACTIVE,
    current_stage: StartupStage.ADMITTED,
    created_at: new Date().toISOString(),
  },
  {
    id: 2,
    name: 'Another Startup',
    founders: [{ id: 2, name: 'Founder 2', email: 'founder2@test.com' }],
    status: StartupStatus.ACTIVE,
    current_stage: StartupStage.ADMITTED,
    created_at: new Date().toISOString(),
  },
] as Startup[];

describe('StartupListView', () => {
  it('renders a list of startups', () => {
    render(
      <MemoryRouter>
        <StartupListView startups={mockStartups} onSelectStartup={() => {}} />
      </MemoryRouter>
    );
    expect(screen.getByText('Test Startup 1')).toBeInTheDocument();
    expect(screen.getByText('Another Startup')).toBeInTheDocument();
  });

  it('filters the list of startups based on search term', () => {
    render(
      <MemoryRouter>
        <StartupListView startups={mockStartups} onSelectStartup={() => {}} />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('Search startups...'), { target: { value: 'Test' } });

    expect(screen.getByText('Test Startup 1')).toBeInTheDocument();
    expect(screen.queryByText('Another Startup')).not.toBeInTheDocument();
  });

  it('calls onSelectStartup when a startup is clicked', () => {
    const onSelectStartup = vi.fn();
    render(
      <MemoryRouter>
        <StartupListView startups={mockStartups} onSelectStartup={onSelectStartup} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText('Test Startup 1'));

    expect(onSelectStartup).toHaveBeenCalledWith(mockStartups[0]);
  });
});
