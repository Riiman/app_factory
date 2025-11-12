// src/pages/admin/StartupDetailView.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import StartupDetailView from './StartupDetailView';
import { Startup, StartupStatus, StartupStage, Submission, SubmissionStatus, UserRole } from '../../types/dashboard-types';

const mockStartup: Startup = {
  id: 1,
  name: 'Test Startup 1',
  status: StartupStatus.ACTIVE,
  current_stage: StartupStage.ADMITTED,
  next_milestone: 'Launch',
  founders: [],
  products: [],
  business_monthly_data: [],
  funding_rounds: [],
  marketing_campaigns: [],
  tasks: [],
  experiments: [],
  artifacts: [],
  submission: {
    id: 1,
    problem_statement: 'The problem is...',
    evaluation: {
      overall_summary: 'This is a great idea!',
      overall_score: 85,
    },
  },
} as unknown as Startup;

describe('StartupDetailView', () => {
  it('renders the startup name', () => {
    render(
      <MemoryRouter>
        <StartupDetailView startup={mockStartup} onBack={() => {}} onAddTask={() => {}} onAddExperiment={() => {}} onAddArtifact={() => {}} />
      </MemoryRouter>
    );
    expect(screen.getByText('Test Startup 1')).toBeInTheDocument();
  });

  it('switches tabs when a tab button is clicked', () => {
    render(
      <MemoryRouter>
        <StartupDetailView startup={mockStartup} onBack={() => {}} onAddTask={() => {}} onAddExperiment={() => {}} onAddArtifact={() => {}} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Products' }));
    expect(screen.getByText('No products defined.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Business' }));
    expect(screen.getByText('Monthly Financial Data')).toBeInTheDocument();
  });
});
