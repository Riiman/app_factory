// src/pages/admin/AdminDashboardPage.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import AdminDashboardPage from './AdminDashboardPage';
import api from '../../utils/api';
import { Startup, Submission, User, Evaluation } from '../../types/dashboard-types';

// Mock the api module
vi.mock('../../utils/api', () => ({
  default: {
    getAllSubmissions: vi.fn(),
    getAllStartups: vi.fn(),
    getAllUsers: vi.fn(),
  },
}));

const mockSubmissions: Submission[] = [];
const mockStartups: Startup[] = [];
const mockUsers: User[] = [];

describe('AdminDashboardPage', () => {
  it('renders loading state initially', () => {
    // @ts-ignore
    api.getAllSubmissions.mockReturnValue(new Promise(() => {})); // Never resolves
    render(
      <MemoryRouter>
        <AdminDashboardPage />
      </MemoryRouter>
    );
    expect(screen.getByText('Loading admin dashboard...')).toBeInTheDocument();
  });

  it('renders error state on API failure', async () => {
    // @ts-ignore
    api.getAllSubmissions.mockRejectedValue(new Error('Failed to fetch'));
    render(
      <MemoryRouter>
        <AdminDashboardPage />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('Error: Failed to fetch')).toBeInTheDocument();
    });
  });

  it('renders the dashboard with data', async () => {
    // @ts-ignore
    api.getAllSubmissions.mockResolvedValue(mockSubmissions);
    // @ts-ignore
    api.getAllStartups.mockResolvedValue(mockStartups);
    // @ts-ignore
    api.getAllUsers.mockResolvedValue(mockUsers);
    render(
      <MemoryRouter>
        <AdminDashboardPage />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('StartupOS Admin')).toBeInTheDocument();
      expect(screen.getByText('Dashboard Overview')).toBeInTheDocument();
    });
  });
});
