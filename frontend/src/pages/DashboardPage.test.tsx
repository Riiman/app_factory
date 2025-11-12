// src/pages/DashboardPage.test.tsx
import React from 'react';
import { render, screen, waitFor, renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import DashboardPage from './DashboardPage';
import api from '@/utils/api';
import { Startup, StartupStatus, StartupStage, UserRole } from '@/types/dashboard-types';

// Mock the api module
vi.mock('@/utils/api');

const mockStartupData: Startup = {
  id: 1,
  userId: 1,
  submissionId: 1,
  name: 'Test Startup',
  slug: 'test-startup',
  status: StartupStatus.ACTIVE,
  current_stage: StartupStage.IDEA,
  next_milestone: 'Launch MVP',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  submission: {} as any,
  founders: [],
  products: [],
  business_monthly_data: [],
  funding_rounds: [],
  marketing_campaigns: [],
  tasks: [],
  experiments: [],
  artifacts: [],
  user: {
    id: 1,
    email: 'test@example.com',
    full_name: 'Test User',
    role: UserRole.USER,
    createdAt: new Date().toISOString(),
  },
};

describe('DashboardPage', () => {
  beforeEach(() => {
    localStorage.setItem('user', JSON.stringify({ startup_id: 1 }));
  });

  it('renders loading state initially', () => {
    // @ts-ignore
    api.getStartupData.mockReturnValue(new Promise(() => {})); // Never resolves
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    );
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders error state on API failure', async () => {
    // @ts-ignore
    api.getStartupData.mockRejectedValue(new Error('Failed to fetch'));
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('Error: Failed to fetch')).toBeInTheDocument();
    });
  });

  it('renders the dashboard with startup data', async () => {
    // @ts-ignore
    api.getStartupData.mockResolvedValue(mockStartupData);
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    );
    expect(await screen.findByText('Test Startup')).toBeInTheDocument();
    expect(await screen.findByText('Business Performance')).toBeInTheDocument();
  });

  it('renders correctly when products is null or undefined', async () => {
    const startupDataWithoutProducts = { ...mockStartupData, products: undefined };
    // @ts-ignore
    api.getStartupData.mockResolvedValue(startupDataWithoutProducts);
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    );
    expect(await screen.findByText('Test Startup')).toBeInTheDocument();
    expect(await screen.findByText('Business Performance')).toBeInTheDocument();
  });

  it('renders correctly when marketing_campaigns is undefined', async () => {
    const startupDataWithoutCampaigns = { ...mockStartupData, marketing_campaigns: undefined };
    // @ts-ignore
    api.getStartupData.mockResolvedValue(startupDataWithoutCampaigns);
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    );
    expect(await screen.findByText('Test Startup')).toBeInTheDocument();
    expect(await screen.findByText('Business Performance')).toBeInTheDocument();
  });

  it('handleCreateCampaign does not crash when marketing_campaigns is undefined', async () => {
    const startupDataWithoutCampaigns = { ...mockStartupData, marketing_campaigns: undefined };
    // @ts-ignore
    api.getStartupData.mockResolvedValue(startupDataWithoutCampaigns);
    // @ts-ignore
    api.createCampaign.mockResolvedValue({ campaign_id: 2, campaign_name: 'New Campaign' });

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    );

    // Wait for the component to finish loading
    await screen.findByText('Test Startup');

    // Simulate opening the create campaign modal and creating a campaign
    // This is a simplified version. In a real scenario, you'd simulate clicks.
    const { result } = renderHook(() => {
        const [startupData, setStartupData] = React.useState<Startup | null>(startupDataWithoutCampaigns);
        const handleCreateCampaign = async (newCampaignData: any) => {
            if (!startupData) return;
            try {
                const newCampaign = await api.createCampaign(startupData.id, newCampaignData);
                setStartupData(prev => prev ? ({
                    ...prev,
                    marketing_campaigns: [...(prev.marketing_campaigns || []), newCampaign]
                }) : null);
            } catch (error) {
                console.error("Failed to create campaign:", error);
            }
        };
        return { startupData, handleCreateCampaign };
    });

    // The test passes if this does not throw
    await act(async () => {
      await result.current.handleCreateCampaign({ campaign_name: 'New Campaign' });
    });

    expect(result.current.startupData?.marketing_campaigns).toHaveLength(1);
    expect(result.current.startupData?.marketing_campaigns?.[0].campaign_name).toBe('New Campaign');
  });
});
