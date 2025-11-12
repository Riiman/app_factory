// src/pages/SubmissionPage.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import SubmissionPage from './SubmissionPage';
import api from '../utils/api';

// Mock the api module
vi.mock('../utils/api');

describe('SubmissionPage', () => {
  it('renders the initial connecting message and then the first message from the bot', async () => {
    // @ts-ignore
    api.fetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ success: true, message: 'Hello! How can I help you?' }),
    });

    render(
      <MemoryRouter>
        <SubmissionPage />
      </MemoryRouter>
    );
    expect(screen.getByText('Connecting to chatbot...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Hello! How can I help you?')).toBeInTheDocument();
    });
  });

  it('sends a message and receives a response', async () => {
    // @ts-ignore
    api.fetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ success: true, message: 'Hello! How can I help you?' }),
    });

    render(
      <MemoryRouter>
        <SubmissionPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Hello! How can I help you?')).toBeInTheDocument();
    });

    // @ts-ignore
    api.fetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ success: true, message: 'That is a great idea!' }),
    });

    fireEvent.change(screen.getByPlaceholderText('Type your message...'), { target: { value: 'My new idea' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => {
      expect(screen.getByText('My new idea')).toBeInTheDocument();
      expect(screen.getByText('That is a great idea!')).toBeInTheDocument();
    });
  });
});
