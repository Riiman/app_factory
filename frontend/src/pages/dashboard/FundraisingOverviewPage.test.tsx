// src/pages/dashboard/FundraisingOverviewPage.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import FundraisingOverviewPage from './FundraisingOverviewPage';
import { FundraiseDetails } from '@/types/dashboard-types';

const mockFundraiseDetails: FundraiseDetails = {
  funding_stage: 'Seed',
  amount_raised: 500000,
  next_funding_goals: {
    target_amount: 2000000,
    target_valuation: 10000000,
    target_close_date: new Date().toISOString(),
  },
} as FundraiseDetails;

describe('FundraisingOverviewPage', () => {
  it('renders correctly with fundraise details', () => {
    render(<FundraisingOverviewPage fundraiseDetails={mockFundraiseDetails} />);
    expect(screen.getByText('Fundraising Overview')).toBeInTheDocument();
    expect(screen.getByText('Seed')).toBeInTheDocument();
    expect(screen.getByText('$500,000')).toBeInTheDocument();
  });

  it('renders correctly when the fundraiseDetails prop is null or undefined', () => {
    // @ts-ignore
    const { rerender } = render(<FundraisingOverviewPage fundraiseDetails={null} />);
    expect(screen.getByText('Fundraising Overview')).toBeInTheDocument();

    // @ts-ignore
    rerender(<FundraisingOverviewPage fundraiseDetails={undefined} />);
    expect(screen.getByText('Fundraising Overview')).toBeInTheDocument();
  });
});
