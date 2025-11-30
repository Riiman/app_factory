/**
 * @file MarketingCampaignDetailPage.tsx
 * @description A detailed view for a single marketing campaign. It displays performance metrics,
 * linked tasks and artifacts, and if it's a content-driven campaign, it shows the content calendar.
 */

import React from 'react';
import { MarketingCampaign, MarketingContentStatus, Task, Artifact } from '@/types/dashboard-types';
import Card from '@/components/Card';
import { ArrowLeft, Edit, Plus, ClipboardList, Paperclip } from 'lucide-react';

/**
 * Props for the MarketingCampaignDetailPage component.
 * @interface MarketingCampaignDetailPageProps
 */
interface MarketingCampaignDetailPageProps {
    /** The full marketing campaign object to be displayed. The backend should provide a `MarketingCampaign` object, including its nested `content_calendar` if applicable. */
    campaign: MarketingCampaign;
    /** An array of tasks linked to this campaign. */
    linkedTasks: Task[];
    /** An array of artifacts linked to this campaign. */
    linkedArtifacts: Artifact[];
    /** Callback function to navigate back to the campaigns list. */
    onBack: () => void;
    /** Callback function to open the "Create Content Item" modal for this campaign. */
    onAddContentItem: () => void;
    /** Callback function to open the "Edit Campaign" modal for this campaign. */
    onEditCampaign: (campaign: MarketingCampaign) => void;
    /** Callback function to open the "Create Task" modal, pre-linking to this campaign. */
    onAddTask: (campaignId: number) => void;
    /** Callback function to open the "Create Artifact" modal, pre-linking to this campaign. */
    onAddArtifact: (campaignId: number) => void;
}

const formatNumber = (value: number | undefined) => (value || 0).toLocaleString();

const DetailItem: React.FC<{ label: string; value: string | number | undefined }> = ({ label, value }) => (
    <div>
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <p className="text-md font-semibold text-gray-800">{value || 'N/A'}</p>
    </div>
);

const getContentStatusColor = (status: MarketingContentStatus) => {
    switch(status) {
        case MarketingContentStatus.PUBLISHED: return 'bg-green-100 text-green-800';
        case MarketingContentStatus.DRAFT: return 'bg-yellow-100 text-yellow-800';
        case MarketingContentStatus.PLANNED: return 'bg-gray-100 text-gray-800';
    }
}


const MarketingCampaignDetailPage: React.FC<MarketingCampaignDetailPageProps> = ({ campaign, linkedTasks, linkedArtifacts, onBack, onAddContentItem, onEditCampaign, onAddTask, onAddArtifact }) => {
    return (
        <div className="space-y-6">
            <button onClick={onBack} className="flex items-center text-sm font-medium text-gray-600 hover:text-gray-900">
                <ArrowLeft size={16} className="mr-2" />
                Back to Campaigns
            </button>

            <Card>
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{campaign.campaign_name}</h1>
                        <p className="text-gray-600">{campaign.objective}</p>
                    </div>
                    <button onClick={() => onEditCampaign(campaign)} className="text-sm font-medium text-brand-primary flex items-center"><Edit size={16} className="mr-1"/> Edit Campaign</button>
                </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    {campaign.content_mode && campaign.content_calendars && campaign.content_calendars.length > 0 && (
                        <Card title="Content Calendar" actions={<button onClick={onAddContentItem} className="text-sm font-medium text-brand-primary flex items-center"><Plus size={16} className="mr-1"/> Add Content</button>}>
                            <div className="space-y-4">
                                {campaign.content_calendars.map(calendar => (
                                    <div key={calendar.calendar_id}>
                                        {calendar.content_items.map(item => (
                                            <div key={item.content_id} className="p-3 bg-gray-50 rounded-lg flex justify-between items-center mb-2">
                                                <div>
                                                    <p className="font-medium text-gray-800">{item.title}</p>
                                                    <p className="text-sm text-gray-500">{item.content_type} on {item.channel}</p>
                                                </div>
                                                <div className="text-right">
                                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getContentStatusColor(item.status)}`}>{item.status}</span>
                                                    <p className="text-xs text-gray-500 mt-1">Due: {new Date(item.publish_date).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}
                    {!campaign.content_mode && <Card title="Performance Metrics">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                            <div>
                                <p className="text-sm text-gray-500">Spend</p>
                                <p className="text-2xl font-bold text-gray-900">${formatNumber(campaign.spend)}</p>
                            </div>
                             <div>
                                <p className="text-sm text-gray-500">Impressions</p>
                                <p className="text-2xl font-bold text-gray-900">{formatNumber(campaign.impressions)}</p>
                            </div>
                             <div>
                                <p className="text-sm text-gray-500">Clicks</p>
                                <p className="text-2xl font-bold text-gray-900">{formatNumber(campaign.clicks)}</p>
                            </div>
                             <div>
                                <p className="text-sm text-gray-500">Conversions</p>
                                <p className="text-2xl font-bold text-gray-900">{formatNumber(campaign.conversions)}</p>
                            </div>
                        </div>
                    </Card>}
                </div>

                <div className="space-y-6">
                    <Card 
                        title="Linked Tasks"
                        actions={<button onClick={() => onAddTask(campaign.campaign_id)} className="text-sm font-medium text-brand-primary flex items-center"><Plus size={16} className="mr-1"/> Add Task</button>}
                    >
                         <ul className="space-y-2">
                            {linkedTasks.map(task => (
                                <li key={task.id} className="flex items-center text-sm text-gray-700">
                                    <ClipboardList size={14} className="mr-2 text-gray-400"/> {task.name}
                                </li>
                            ))}
                        </ul>
                    </Card>
                    <Card 
                        title="Linked Artifacts"
                        actions={<button onClick={() => onAddArtifact(campaign.campaign_id)} className="text-sm font-medium text-brand-primary flex items-center"><Plus size={16} className="mr-1"/> Add Artifact</button>}
                    >
                        <ul className="space-y-2">
                            {linkedArtifacts.map(artifact => (
                                <li key={artifact.id} className="flex items-center text-sm text-gray-700">
                                   <Paperclip size={14} className="mr-2 text-gray-400"/> {artifact.name}
                                </li>
                            ))}
                        </ul>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default MarketingCampaignDetailPage;