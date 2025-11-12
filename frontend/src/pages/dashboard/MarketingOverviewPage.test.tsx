// src/pages/dashboard/MarketingOverviewPage.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import MarketingOverviewPage from './MarketingOverviewPage';
import { MarketingOverview, MarketingCampaign } from '@/types/dashboard-types';

const mockMarketingOverview: MarketingOverview = {
  positioning_statement: 'We are the best!',
} as MarketingOverview;

const mockCampaigns: MarketingCampaign[] = [
  {
    campaign_id: 1,
    campaign_name: 'Campaign 1',
    spend: 1000,
    impressions: 10000,
    clicks: 100,
    conversions: 10,
  },
  {
    campaign_id: 2,
    campaign_name: 'Campaign 2',
    spend: 2000,
    impressions: 20000,
    clicks: 200,
    conversions: 20,
  },
] as unknown as MarketingCampaign[];

const mockOnPositioningStatementUpdate = vi.fn();

describe('MarketingOverviewPage', () => {
  it('renders correctly with marketing data', () => {
    render(
      <MarketingOverviewPage 
        marketingOverview={mockMarketingOverview} 
        campaigns={mockCampaigns} 
        startupId={1} 
        onPositioningStatementUpdate={mockOnPositioningStatementUpdate} 
      />
    );
    expect(screen.getByText('"We are the best!"')).toBeInTheDocument();
    expect(screen.getByText('Total Spend')).toBeInTheDocument();
    expect(screen.getByText('$3.0k')).toBeInTheDocument();
  });

  it('renders correctly when the campaigns prop is null or undefined', () => {
    // @ts-ignore
    const { rerender } = render(
      <MarketingOverviewPage 
        marketingOverview={mockMarketingOverview} 
        campaigns={null} 
        startupId={1} 
        onPositioningStatementUpdate={mockOnPositioningStatementUpdate} 
      />
    );
    expect(screen.getByText('Total Spend')).toBeInTheDocument();
    expect(screen.getByText('$0')).toBeInTheDocument();

    // @ts-ignore
    rerender(
      <MarketingOverviewPage 
        marketingOverview={mockMarketingOverview} 
        campaigns={undefined} 
        startupId={1} 
        onPositioningStatementUpdate={mockOnPositioningStatementUpdate} 
      />
    );
    expect(screen.getByText('Total Spend')).toBeInTheDocument();
    expect(screen.getByText('$0')).toBeInTheDocument();
  });
});
