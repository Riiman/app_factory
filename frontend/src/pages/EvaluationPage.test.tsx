// src/pages/EvaluationPage.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import EvaluationPage from './EvaluationPage';
import api from '../utils/api';
import { Task, TaskStatus } from '@/types/dashboard-types';

// Mock the api module
vi.mock('../utils/api', () => ({
  default: {
    getEvaluationTasks: vi.fn(),
  },
}));

const mockTasks: Task[] = [
  {
    id: '1',
    title: 'Submit Pitch Deck',
    description: 'Upload your latest pitch deck in PDF format.',
    status: TaskStatus.PENDING,
    dueDate: '2024-08-15',
    results: [],
  },
  {
    id: '2',
    title: 'Complete Founder Bio',
    description: 'Fill out the founder biography form.',
    status: TaskStatus.PENDING,
    dueDate: '2024-08-18',
    results: [],
  },
];

describe('EvaluationPage', () => {
  it('renders the list of tasks', async () => {
    // @ts-ignore
    api.getEvaluationTasks.mockResolvedValue(mockTasks);
    render(
      <MemoryRouter>
        <EvaluationPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('Submit Pitch Deck')[0]).toBeInTheDocument();
      expect(screen.getAllByText('Complete Founder Bio')[0]).toBeInTheDocument();
    });
  });

  it('shows the details of the first task by default', async () => {
    // @ts-ignore
    api.getEvaluationTasks.mockResolvedValue(mockTasks);
    render(
      <MemoryRouter>
        <EvaluationPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Upload your latest pitch deck in PDF format.')).toBeInTheDocument();
    });
  });

  it('shows the details of the clicked task', async () => {
    // @ts-ignore
    api.getEvaluationTasks.mockResolvedValue(mockTasks);
    render(
      <MemoryRouter>
        <EvaluationPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      fireEvent.click(screen.getByText('Complete Founder Bio'));
    });

    await waitFor(() => {
      expect(screen.getByText('Fill out the founder biography form.')).toBeInTheDocument();
    });
  });
});
