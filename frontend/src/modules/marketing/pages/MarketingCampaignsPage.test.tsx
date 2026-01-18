import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import MarketingCampaignsPage from './MarketingCampaignsPage';
import { MarketingCampaign, MarketingCampaignStatus } from '@/types/dashboard-types';

const mockCampaigns: MarketingCampaign[] = [
  {
    campaign_id: 1,
    campaign_name: 'Summer Sale',
    status: MarketingCampaignStatus.ACTIVE,
    objective: 'Increase sales by 20%',
    channel: 'Email',
    start_date: '2025-06-01',
    end_date: '2025-06-30',
  },
  {
    campaign_id: 2,
    campaign_name: 'New Product Launch',
    status: MarketingCampaignStatus.PLANNED,
    objective: 'Generate 1,000 leads',
    channel: 'Social Media',
    start_date: '2025-07-15',
    end_date: null,
  },
] as MarketingCampaign[];

describe('MarketingCampaignsPage', () => {
  it('renders a list of campaigns', () => {
    const handleSelectCampaign = vi.fn();
    const handleAddNewCampaign = vi.fn();

    render(
      <MarketingCampaignsPage
        campaigns={mockCampaigns}
        onSelectCampaign={handleSelectCampaign}
        onAddNewCampaign={handleAddNewCampaign}
      />
    );

    expect(screen.getByText('Marketing Campaigns')).toBeInTheDocument();
    expect(screen.getByText('Summer Sale')).toBeInTheDocument();
    expect(screen.getByText('New Product Launch')).toBeInTheDocument();
  });

  it('calls onSelectCampaign when a campaign is clicked', () => {
    const handleSelectCampaign = vi.fn();
    const handleAddNewCampaign = vi.fn();

    render(
      <MarketingCampaignsPage
        campaigns={mockCampaigns}
        onSelectCampaign={handleSelectCampaign}
        onAddNewCampaign={handleAddNewCampaign}
      />
    );

    fireEvent.click(screen.getByText('Summer Sale'));
    expect(handleSelectCampaign).toHaveBeenCalledWith(1);
  });

  it('calls onAddNewCampaign when the create button is clicked', () => {
    const handleSelectCampaign = vi.fn();
    const handleAddNewCampaign = vi.fn();

    render(
      <MarketingCampaignsPage
        campaigns={mockCampaigns}
        onSelectCampaign={handleSelectCampaign}
        onAddNewCampaign={handleAddNewCampaign}
      />
    );

    fireEvent.click(screen.getByText('Create New Campaign'));
    expect(handleAddNewCampaign).toHaveBeenCalled();
  });

  it('renders without crashing when campaigns is null', () => {
    const handleSelectCampaign = vi.fn();
    const handleAddNewCampaign = vi.fn();

    render(
      <MarketingCampaignsPage
        campaigns={null as any}
        onSelectCampaign={handleSelectCampaign}
        onAddNewCampaign={handleAddNewCampaign}
      />
    );

    expect(screen.getByText('Marketing Campaigns')).toBeInTheDocument();
    expect(screen.queryByText('Summer Sale')).not.toBeInTheDocument();
  });
});
