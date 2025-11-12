import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import CreateCampaignModal from './CreateCampaignModal';
import { Product, MarketingCampaignStatus } from '@/types/dashboard-types';

const mockProducts: Product[] = [
  { id: 1, name: 'Product A' },
  { id: 2, name: 'Product B' },
] as Product[];

describe('CreateCampaignModal', () => {
  it('renders the form with all fields', () => {
    render(<CreateCampaignModal onClose={() => {}} onCreate={() => {}} products={mockProducts} />);
    
    expect(screen.getByLabelText('Campaign Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Objective')).toBeInTheDocument();
    expect(screen.getByLabelText('Channel')).toBeInTheDocument();
    expect(screen.getByLabelText('Start Date')).toBeInTheDocument();
    expect(screen.getByLabelText('Status')).toBeInTheDocument();
    expect(screen.getByLabelText('Link to Product (Optional)')).toBeInTheDocument();
    expect(screen.getByText('Product A')).toBeInTheDocument();
  });

  it('calls onCreate with the correct data on form submission', () => {
    const handleCreate = vi.fn();
    render(<CreateCampaignModal onClose={() => {}} onCreate={handleCreate} products={mockProducts} />);

    fireEvent.change(screen.getByLabelText('Campaign Name'), { target: { value: 'New Campaign' } });
    fireEvent.change(screen.getByLabelText('Channel'), { target: { value: 'Social Media' } });
    fireEvent.click(screen.getByText('Create Campaign'));

    expect(handleCreate).toHaveBeenCalledWith(expect.objectContaining({
      campaign_name: 'New Campaign',
      status: MarketingCampaignStatus.PLANNED,
    }));
  });

  it('renders without crashing when products is null', () => {
    render(<CreateCampaignModal onClose={() => {}} onCreate={() => {}} products={null as any} />);
    
    expect(screen.getByLabelText('Campaign Name')).toBeInTheDocument();
    expect(screen.queryByText('Product A')).not.toBeInTheDocument();
  });
});
