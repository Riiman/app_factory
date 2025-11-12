// src/pages/admin/ContractView.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import ContractView from './ContractView';
import { Startup, ContractStatus, StartupStage } from '../../types/dashboard-types';
import api from '../../utils/api';

vi.mock('../../utils/api', () => ({
  default: {
    updateContractStatus: vi.fn(),
    updateStartupStage: vi.fn(),
    addContractSignatory: vi.fn(),
    addContractComment: vi.fn(),
  },
}));

const mockStartups: Startup[] = [
  {
    id: 1,
    name: 'Test Startup 1',
    founders: [{ id: 1, name: 'Founder 1', email: 'founder1@test.com', role: 'CEO' }],
    current_stage: StartupStage.CONTRACT,
    contract: {
      id: 1,
      title: 'Contract 1',
      content: 'This is the contract.',
      status: ContractStatus.DRAFT,
      signatories: [],
      comments: [],
    },
  },
] as Startup[];

describe('ContractView', () => {
  it('renders a list of startups in contract', () => {
    render(
      <MemoryRouter>
        <ContractView startupsInContract={mockStartups} fetchData={async () => {}} />
      </MemoryRouter>
    );
    expect(screen.getByText('Test Startup 1')).toBeInTheDocument();
  });

  it('shows the details of the selected startup', () => {
    render(
      <MemoryRouter>
        <ContractView startupsInContract={mockStartups} fetchData={async () => {}} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText('Test Startup 1'));

    expect(screen.getByText('This is the contract.')).toBeInTheDocument();
  });

  it('calls api.updateContractStatus when a status button is clicked', () => {
    render(
      <MemoryRouter>
        <ContractView startupsInContract={mockStartups} fetchData={async () => {}} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText('Test Startup 1'));
    fireEvent.click(screen.getByRole('button', { name: 'Send Contract' }));

    expect(api.updateContractStatus).toHaveBeenCalledWith(1, ContractStatus.SENT);
  });
});
