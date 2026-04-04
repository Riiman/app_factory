import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import MarketingContentCalendarPage from './MarketingContentCalendarPage';
import { MarketingCampaign, MarketingContentStatus, MarketingCampaignStatus } from '@/types/dashboard-types';

const mockCampaigns: MarketingCampaign[] = [
  {
    campaign_id: 1,
    campaign_name: 'Content Campaign 1',
    content_mode: true,
    content_calendar: {
      content_items: [
        {
          content_id: 101,
          title: 'Blog Post 1',
          content_type: 'Blog',
          publish_date: '2025-08-01',
          status: MarketingContentStatus.PUBLISHED,
        },
      ],
    },
  },
  {
    campaign_id: 2,
    campaign_name: 'Non-Content Campaign',
    content_mode: false,
  },
  {
    campaign_id: 3,
    campaign_name: 'Content Campaign 2',
    content_mode: true,
    content_calendar: {
      content_items: [
        {
          content_id: 102,
          title: 'Video 1',
          content_type: 'Video',
          publish_date: '2025-08-15',
          status: MarketingContentStatus.PLANNED,
        },
      ],
    },
  },
] as any;

describe('MarketingContentCalendarPage', () => {
  it('renders a table of content items from content-driven campaigns', () => {
    const handleAddNewContentItem = vi.fn();
    render(
      <MarketingContentCalendarPage
        campaigns={mockCampaigns}
        onAddNewContentItem={handleAddNewContentItem}
      />
    );

    expect(screen.getByText('Content Calendar')).toBeInTheDocument();
    expect(screen.getByText('Blog Post 1')).toBeInTheDocument();
    expect(screen.getByText('Video 1')).toBeInTheDocument();
    expect(screen.queryByText('Non-Content Campaign')).not.toBeInTheDocument();
  });

  it('calls onAddNewContentItem when the create button is clicked', () => {
    const handleAddNewContentItem = vi.fn();
    render(
      <MarketingContentCalendarPage
        campaigns={mockCampaigns}
        onAddNewContentItem={handleAddNewContentItem}
      />
    );

    fireEvent.click(screen.getByText('Add Content Item'));
    expect(handleAddNewContentItem).toHaveBeenCalled();
  });

  it('renders an empty state when there are no content items', () => {
    const handleAddNewContentItem = vi.fn();
    render(
      <MarketingContentCalendarPage
        campaigns={[]}
        onAddNewContentItem={handleAddNewContentItem}
      />
    );

    expect(screen.getByText('No content items found')).toBeInTheDocument();
  });

  it('renders without crashing when campaigns is null', () => {
    const handleAddNewContentItem = vi.fn();
    render(
      <MarketingContentCalendarPage
        campaigns={null as any}
        onAddNewContentItem={handleAddNewContentItem}
      />
    );

    expect(screen.getByText('Content Calendar')).toBeInTheDocument();
    expect(screen.getByText('No content items found')).toBeInTheDocument();
  });
});
