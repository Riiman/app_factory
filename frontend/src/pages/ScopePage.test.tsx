// src/pages/ScopePage.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import ScopePage from './ScopePage';
import api from '../utils/api';
import { ScopeDocument, UserRole as Role } from '@/types/dashboard-types';

// Mock the api module
vi.mock('../utils/api', () => ({
  default: {
    getScopeDocument: vi.fn(),
    addScopeComment: vi.fn(),
  },
}));

const mockScopeDocument: ScopeDocument = {
  title: 'Project Scope for VentureX',
  version: '1.0',
  status: 'Pending Review',
  client: 'VentureX Startup',
  preparedBy: 'Incubator Platform',
  sections: [
    {
      id: 'sec-1',
      title: 'Introduction & Goals',
      content: ['This document outlines the scope of work for the initial development phase of the VentureX platform.'],
      comments: [],
    },
    {
      id: 'sec-2',
      title: 'Key Deliverables',
      content: ['User Authentication', 'Dashboard UI', 'Product Management Module'],
      comments: [],
    },
  ],
};

describe('ScopePage', () => {
  it('renders the scope document', async () => {
    // @ts-ignore
    api.getScopeDocument.mockResolvedValue(mockScopeDocument);
    render(
      <MemoryRouter>
        <ScopePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Project Scope for VentureX')).toBeInTheDocument();
      expect(screen.getByText('Introduction & Goals')).toBeInTheDocument();
      expect(screen.getByText('Key Deliverables')).toBeInTheDocument();
    });
  });

  it('calls the accept API when the accept button is clicked', async () => {
    // @ts-ignore
    api.getScopeDocument.mockResolvedValue(mockScopeDocument);
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    render(
      <MemoryRouter>
        <ScopePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      fireEvent.click(screen.getByRole('button', { name: /Accept/ }));
    });

    expect(alertSpy).toHaveBeenCalledWith('Scope Accepted!');
    alertSpy.mockRestore();
  });

  it('calls the reject API when the reject button is clicked', async () => {
    // @ts-ignore
    api.getScopeDocument.mockResolvedValue(mockScopeDocument);
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    render(
      <MemoryRouter>
        <ScopePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      fireEvent.click(screen.getByRole('button', { name: /Reject/ }));
    });

    expect(alertSpy).toHaveBeenCalledWith('Scope Rejected!');
    alertSpy.mockRestore();
  });
});
