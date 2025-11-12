// src/pages/dashboard/InvestorCrmPage.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import InvestorCrmPage from './InvestorCrmPage';
import { Investor } from '@/types/dashboard-types';

const mockInvestors: Investor[] = [
  {
    investor_id: 1,
    name: 'John Doe',
    firm_name: 'Doe Ventures',
    type: 'VC',
    email: 'john.doe@doe.com',
  },
  {
    investor_id: 2,
    name: 'Jane Smith',
    firm_name: 'Smith Capital',
    type: 'Angel',
    email: 'jane.smith@smith.com',
  },
] as unknown as Investor[];

describe('InvestorCrmPage', () => {
  it('renders correctly with a list of investors', () => {
    render(<InvestorCrmPage investors={mockInvestors} onAddNewInvestor={() => {}} />);
    expect(screen.getByText('Investor CRM')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  it('renders correctly when the investors prop is null or undefined', () => {
    // @ts-ignore
    const { rerender } = render(<InvestorCrmPage investors={null} onAddNewInvestor={() => {}} />);
    expect(screen.getByText('Investor CRM')).toBeInTheDocument();
    expect(screen.queryByText('John Doe')).not.toBeInTheDocument();

    // @ts-ignore
    rerender(<InvestorCrmPage investors={undefined} onAddNewInvestor={() => {}} />);
    expect(screen.getByText('Investor CRM')).toBeInTheDocument();
    expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
  });
});
