// src/pages/dashboard/FundingRoundsPage.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import FundingRoundsPage from './FundingRoundsPage';
import { FundingRound } from '@/types/dashboard-types';

const mockFundingRounds: FundingRound[] = [
  {
    round_id: 1,
    round_type: 'Seed',
    status: 'In Progress',
    target_amount: 1000000,
    amount_raised: 250000,
    date_opened: new Date().toISOString(),
  },
  {
    round_id: 2,
    round_type: 'Pre-Seed',
    status: 'Closed',
    target_amount: 50000,
    amount_raised: 50000,
    date_opened: new Date().toISOString(),
    date_closed: new Date().toISOString(),
  },
] as unknown as FundingRound[];

describe('FundingRoundsPage', () => {
  it('renders correctly with a list of funding rounds', () => {
    render(<FundingRoundsPage fundingRounds={mockFundingRounds} onSelectRound={() => {}} onAddNewRound={() => {}} />);
    expect(screen.getByText('Funding Rounds')).toBeInTheDocument();
    expect(screen.getByText('Seed Round')).toBeInTheDocument();
    expect(screen.getByText('Pre-Seed Round')).toBeInTheDocument();
  });

  it('renders correctly when the fundingRounds prop is null or undefined', () => {
    // @ts-ignore
    const { rerender } = render(<FundingRoundsPage fundingRounds={null} onSelectRound={() => {}} onAddNewRound={() => {}} />);
    expect(screen.getByText('Funding Rounds')).toBeInTheDocument();
    expect(screen.queryByText('Seed Round')).not.toBeInTheDocument();

    // @ts-ignore
    rerender(<FundingRoundsPage fundingRounds={undefined} onSelectRound={() => {}} onAddNewRound={() => {}} />);
    expect(screen.getByText('Funding Rounds')).toBeInTheDocument();
    expect(screen.queryByText('Seed Round')).not.toBeInTheDocument();
  });
});
