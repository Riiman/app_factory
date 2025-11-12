// src/pages/ContractPage.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import ContractPage from './ContractPage';
import api from '@/utils/api';
import { Contract, ContractStatus } from '@/types/dashboard-types';

vi.mock('@/utils/api', () => ({
  default: {
    getContractDetails: vi.fn(),
    signDocument: vi.fn(),
  },
}));

const mockDocument: Contract = {
  id: 1,
  title: 'Founder Agreement & Vesting Schedule',
  status: ContractStatus.SENT,
  sent_at: new Date('2024-11-01T10:00:00Z').toISOString(),
  document_url: '#', // This would be a link to DocuSign, etc.
  content: 'This is the contract content.',
  signatories: [
    { id: 1, name: 'Founder Name', email: 'founder@startup.com', status: 'Not Signed' },
    { id: 2, name: 'Incubator Director', email: 'director@incubator.com', status: 'Not Signed' },
  ],
  comments: [],
};

describe('ContractPage', () => {
  it('renders the contract details', async () => {
    // @ts-ignore
    api.getContractDetails.mockResolvedValue(mockDocument);
    render(
      <MemoryRouter>
        <ContractPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Founder Agreement & Vesting Schedule')).toBeInTheDocument();
      expect(screen.getByText('Founder Name')).toBeInTheDocument();
      expect(screen.getByText('Incubator Director')).toBeInTheDocument();
    });
  });

  it('shows the sign document button when the document is out for signature', async () => {
    // @ts-ignore
    api.getContractDetails.mockResolvedValue(mockDocument);
    render(
      <MemoryRouter>
        <ContractPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Sign Document' })).toBeInTheDocument();
    });
  });

  it('calls the sign document API when the button is clicked', async () => {
    // @ts-ignore
    api.getContractDetails.mockResolvedValue(mockDocument);
    // @ts-ignore
    api.signDocument.mockResolvedValue({ success: true });

    render(
      <MemoryRouter>
        <ContractPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Sign Document' }));
    });

    await waitFor(() => {
      expect(api.signDocument).toHaveBeenCalledWith(1);
    });
  });
});
