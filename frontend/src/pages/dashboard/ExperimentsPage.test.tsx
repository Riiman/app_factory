// src/pages/dashboard/ExperimentsPage.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ExperimentsPage from './ExperimentsPage';
import { ExperimentStatus, Scope } from '@/types/dashboard-types';

describe('ExperimentsPage', () => {
  const mockExperiments = [
    { id: 1, startupId: 1, scope: Scope.GENERAL, name: 'Test Experiment 1', assumption: 'Test Assumption 1', status: ExperimentStatus.RUNNING },
    { id: 2, startupId: 1, scope: Scope.GENERAL, name: 'Test Experiment 2', assumption: 'Test Assumption 2', status: ExperimentStatus.PLANNED },
  ];

  it('renders the page title and create button', () => {
    render(<ExperimentsPage experiments={[]} onExperimentClick={() => {}} onAddNewExperiment={() => {}} />);
    expect(screen.getByText('Experiments')).toBeInTheDocument();
    expect(screen.getByText('Create New Experiment')).toBeInTheDocument();
  });

  it('renders a list of experiments', () => {
    render(<ExperimentsPage experiments={mockExperiments} onExperimentClick={() => {}} onAddNewExperiment={() => {}} />);
    expect(screen.getByText('Test Experiment 1')).toBeInTheDocument();
    expect(screen.getByText('Test Experiment 2')).toBeInTheDocument();
  });

  it('renders nothing when experiments is null', () => {
    // @ts-ignore
    render(<ExperimentsPage experiments={null} onExperimentClick={() => {}} onAddNewExperiment={() => {}} />);
    expect(screen.queryByText('Test Experiment 1')).not.toBeInTheDocument();
  });

  it('calls onAddNewExperiment when the create button is clicked', () => {
    const onAddNewExperiment = vi.fn();
    render(<ExperimentsPage experiments={[]} onExperimentClick={() => {}} onAddNewExperiment={onAddNewExperiment} />);
    screen.getByText('Create New Experiment').click();
    expect(onAddNewExperiment).toHaveBeenCalled();
  });

  it('calls onExperimentClick when an experiment is clicked', () => {
    const onExperimentClick = vi.fn();
    render(<ExperimentsPage experiments={mockExperiments} onExperimentClick={onExperimentClick} onAddNewExperiment={() => {}} />);
    screen.getByText('Test Experiment 1').click();
    expect(onExperimentClick).toHaveBeenCalledWith(mockExperiments[0]);
  });
});
