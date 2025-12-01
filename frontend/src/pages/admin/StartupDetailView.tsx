
import React, { useState } from 'react';
import { Startup, Task, Experiment, Artifact, Product, FundingRound, MarketingCampaign, Scope, ArtifactType, Feature } from '../../types/dashboard-types';
import Card from '../../components/admin/Card';
import StatCard from '../../components/admin/StatCard';
import BusinessPerformanceChart from '../../components/admin/charts/BusinessPerformanceChart';
import StatusBadge from '../../components/admin/StatusBadge';
import { DollarSign, Users, TrendingDown, ArrowLeft, PlusCircle, Edit } from 'lucide-react';

interface StartupDetailViewProps {
  startup: Startup;
  onBack: () => void;
  onOpenCreateTaskModal: (startupId: number) => void;
  onOpenCreateExperimentModal: (startupId: number) => void;
  onOpenCreateArtifactModal: (startupId: number) => void;
  onEditFeature: (productId: number, feature: Feature) => void;
}

const TabButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${active ? 'bg-brand-primary text-white' : 'text-brand-text-secondary hover:bg-slate-100'
      }`}
  >
    {children}
  </button>
);

const StartupDetailView: React.FC<StartupDetailViewProps> = ({ startup, onBack, onOpenCreateTaskModal, onOpenCreateExperimentModal, onOpenCreateArtifactModal, onEditFeature }) => {
  const [activeTab, setActiveTab] = useState('overview');

  const latestMonthData = startup.monthly_data?.length > 0
    ? startup.monthly_data.reduce((latest, current) => {
      return new Date(current.month_start).getTime() > new Date(latest.month_start).getTime() ? current : latest;
    })
    : null;

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab startup={startup} latestMonthData={latestMonthData} />;
      case 'products':
        return <ProductsTab products={startup.products} onEditFeature={onEditFeature} />;
      case 'business':
        return <BusinessTab monthlyData={startup.monthly_data} />;
      case 'fundraising':
        return <FundraisingTab fundingRounds={startup.funding_rounds} />;
      case 'marketing':
        return <MarketingTab campaigns={startup.marketing_campaigns} />;
      case 'workspace':
        return <WorkspaceTab startupId={startup.id} tasks={startup.tasks} experiments={startup.experiments} artifacts={startup.artifacts} onOpenCreateTaskModal={onOpenCreateTaskModal} onOpenCreateExperimentModal={onOpenCreateExperimentModal} onOpenCreateArtifactModal={onOpenCreateArtifactModal} />;
      default:
        return null;
    }
  };

  return (
    <div className="p-8">
      <div className="mb-4">
        <button onClick={onBack} className="flex items-center text-sm font-medium text-brand-text-secondary hover:text-brand-primary transition-colors">
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back to Directory
        </button>
      </div>

      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold text-brand-text-primary">{startup.name}</h2>
          <div className="flex items-center space-x-2 mt-1">
            <StatusBadge status={startup.status} />
            <span className="text-slate-400">&bull;</span>
            <span className="text-sm text-brand-text-secondary">Stage: <span className="font-semibold">{startup.current_stage}</span></span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-brand-text-secondary">Next Milestone</p>
          <p className="font-semibold text-brand-primary">{startup.next_milestone}</p>
        </div>
      </div>

      <div className="mb-6 border-b border-slate-200">
        <nav className="flex space-x-2 pb-3">
          <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')}>Overview</TabButton>
          <TabButton active={activeTab === 'products'} onClick={() => setActiveTab('products')}>Products</TabButton>
          <TabButton active={activeTab === 'business'} onClick={() => setActiveTab('business')}>Business</TabButton>
          <TabButton active={activeTab === 'fundraising'} onClick={() => setActiveTab('fundraising')}>Fundraising</TabButton>
          <TabButton active={activeTab === 'marketing'} onClick={() => setActiveTab('marketing')}>Marketing</TabButton>
          <TabButton active={activeTab === 'workspace'} onClick={() => setActiveTab('workspace')}>Workspace</TabButton>
        </nav>
      </div>

      <div>{renderContent()}</div>
    </div>
  );
};

const OverviewTab: React.FC<{ startup: Startup, latestMonthData: any }> = ({ startup, latestMonthData }) => (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <div className="lg-col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
      <StatCard icon={<DollarSign size={20} />} label="Latest MRR" value={`$${latestMonthData?.mrr.toLocaleString() || 0}`} />
      <StatCard icon={<Users size={20} />} label="Total Customers" value={latestMonthData?.total_customers || 0} />
      <StatCard icon={<TrendingDown size={20} />} label="Latest Net Burn" value={`$${latestMonthData?.net_burn.toLocaleString() || 0}`} />
    </div>
    <Card title="Business Performance" className="lg:col-span-3">
      <BusinessPerformanceChart data={startup.monthly_data} />
    </Card>
    <Card title="Submission & Evaluation" className="lg:col-span-2">
      <h4 className="font-semibold text-brand-text-primary">Submission</h4>
      <p className="text-sm text-brand-text-secondary mt-1">{startup.submission.problem_statement}</p>
      <div className="my-4 border-t border-slate-200"></div>
      <h4 className="font-semibold text-brand-text-primary">Evaluation Summary</h4>
      <p className="text-sm text-brand-text-secondary mt-1">{startup.submission.evaluation.overall_summary}</p>
      <div className="flex justify-end items-baseline mt-2">
        <span className="text-sm text-brand-text-secondary mr-2">Overall Score:</span>
        <span className="text-2xl font-bold text-brand-primary">{startup.submission.evaluation.overall_score}</span>
        <span className="text-brand-text-secondary">/10</span>
      </div>
    </Card>
    <Card title="Founders">
      <ul>
        {startup.founders.map(founder => (
          <li key={founder.id} className="flex items-center space-x-3 py-2 border-b last:border-0 border-slate-100">
            <div className="w-10 h-10 rounded-full bg-brand-secondary/20 text-brand-secondary flex items-center justify-center font-bold">
              {founder.name.charAt(0)}
            </div>
            <div>
              <p className="font-semibold text-brand-text-primary">{founder.name}</p>
              <p className="text-sm text-brand-text-secondary">{founder.role}</p>
              <a href={`mailto:${founder.email}`} className="text-sm text-brand-primary hover:underline">{founder.email}</a>
              {founder.phone_number && <a href={`tel:${founder.phone_number}`} className="text-sm text-brand-text-secondary hover:underline block">{founder.phone_number}</a>}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  </div>
);

const renderTable = (headers: string[], rows: (string | React.ReactNode)[][], emptyMessage: string = "No data available.") => (
  <div className="overflow-x-auto">
    <table className="w-full text-sm text-left text-brand-text-secondary">
      <thead className="text-xs text-slate-500 uppercase bg-slate-50">
        <tr>
          {headers.map(h => <th key={h} scope="col" className="px-6 py-3">{h}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.length > 0 ? (
          rows.map((row, index) => (
            <tr key={index} className="bg-white border-b last:border-b-0 hover:bg-slate-50">
              {row.map((cell, cellIndex) => <td key={cellIndex} className="px-6 py-4 font-medium text-brand-text-primary whitespace-nowrap">{cell}</td>)}
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={headers.length} className="px-6 py-4 text-center text-slate-500">{emptyMessage}</td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
);

const ProductsTab: React.FC<{ products: Product[], onEditFeature: (productId: number, feature: Feature) => void }> = ({ products, onEditFeature }) => (
  <div className="space-y-6">
    {products.length > 0 ? (
      products.map(product => (
        <Card key={product.id} title={product.name}>
          <p className="text-sm text-brand-text-secondary mb-4">{product.description}</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div><span className="font-semibold">Stage:</span> <StatusBadge status={product.stage} /></div>
            <div><span className="font-semibold">Version:</span> {product.version}</div>
          </div>
          <div className="space-y-4">
            <h4 className="font-semibold">Features</h4>
            {renderTable(['Name', 'Description', 'Actions'], product.features.map(f => [
              f.name,
              f.description,
              <button
                onClick={() => onEditFeature(product.id, f)}
                className="text-brand-text-secondary hover:text-brand-primary transition-colors"
                title="Edit Feature"
              >
                <Edit size={16} />
              </button>
            ]), "No features defined.")}
            <h4 className="font-semibold mt-4">Metrics</h4>
            {renderTable(['Name', 'Value', 'Unit', 'Period'], product.product_metrics.map(m => [m.metric_name, m.value?.toLocaleString() ?? 'N/A', m.unit, m.period]), "No metrics recorded.")}
            <h4 className="font-semibold mt-4">Issues</h4>
            {renderTable(['Title', 'Severity', 'Status'], product.product_issues.map(i => [i.title, <StatusBadge status={i.severity} />, <StatusBadge status={i.status} />]), "No issues reported.")}
          </div>
        </Card>
      ))
    ) : (
      <p>No products defined.</p>
    )}
  </div>
);

const BusinessTab: React.FC<{ monthlyData: any[] }> = ({ monthlyData }) => (
  <Card title="Monthly Financial Data">
    {renderTable(
      ['Month', 'Revenue', 'Expenses', 'Net Burn', 'MRR', 'New Customers', 'Total Customers'],
      monthlyData.map(d => [
        new Date(d.month_start).toLocaleString('default', { month: 'long', year: 'numeric' }),
        `$${d.total_revenue.toLocaleString()}`,
        `$${d.total_expenses.toLocaleString()}`,
        `$${d.net_burn.toLocaleString()}`,
        `$${d.mrr.toLocaleString()}`,
        d.new_customers,
        d.total_customers
      ]).reverse()
    )}
  </Card>
);

const FundraisingTab: React.FC<{ fundingRounds: FundingRound[] }> = ({ fundingRounds }) => (
  <div className="space-y-6">
    {fundingRounds.map(round => (
      <Card key={round.round_id} title={`${round.round_type} Round`}>
        <div className="mb-4">
          <div className="flex justify-between mb-1">
            <span className="text-base font-medium text-brand-primary">$ {(round.amount_raised ?? 0).toLocaleString()} raised</span>
            <span className="text-sm font-medium text-brand-text-secondary">$ {(round.target_amount ?? 0).toLocaleString()} target</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div className="bg-brand-primary h-2.5 rounded-full" style={{ width: `${((round.amount_raised ?? 0) / (round.target_amount ?? 1)) * 100}%` }}></div>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div><span className="font-semibold">Status:</span> <StatusBadge status={round.status} /></div>
          <div><span className="font-semibold">Opened:</span> {round.date_opened ? new Date(round.date_opened).toLocaleDateString() : 'N/A'}</div>
          <div><span className="font-semibold">Closed:</span> {round.date_closed ? new Date(round.date_closed).toLocaleDateString() : 'N/A'}</div>
        </div>
        <h4 className="font-semibold mt-4">Investors</h4>
        {renderTable(['Name', 'Firm', 'Type', 'Amount Invested'], round.investors.map(i => [i.investor.name, i.investor.firm_name || 'N/A', i.investor.type, `$${i.amount_invested.toLocaleString()}`]), "No investors for this round.")}
      </Card>
    ))}
  </div>
);

const MarketingTab: React.FC<{ campaigns: MarketingCampaign[] }> = ({ campaigns }) => (
  <Card title="Marketing Campaigns">
    {renderTable(
      ['Name', 'Channel', 'Status', 'Spend', 'Clicks', 'Conversions'],
      campaigns.map(c => [c.campaign_name, c.channel, <StatusBadge status={c.status} />, `$${(c.spend ?? 0).toLocaleString()}`, (c.clicks ?? 0).toLocaleString(), (c.conversions ?? 0).toLocaleString()]),
      "No marketing campaigns found."
    )}
  </Card>
);

interface WorkspaceTabProps {
  startupId: number;
  tasks: Task[];
  experiments: Experiment[];
  artifacts: Artifact[];
  onOpenCreateTaskModal: (startupId: number) => void;
  onOpenCreateExperimentModal: (startupId: number) => void;
  onOpenCreateArtifactModal: (startupId: number) => void;
}

const WorkspaceTab: React.FC<WorkspaceTabProps> = ({ startupId, tasks, experiments, artifacts, onOpenCreateTaskModal, onOpenCreateExperimentModal, onOpenCreateArtifactModal }) => {
  const [activeSubTab, setActiveSubTab] = useState<'tasks' | 'experiments' | 'artifacts'>('tasks');

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200">
        <nav className="flex space-x-4">
          <button
            onClick={() => setActiveSubTab('tasks')}
            className={`py-2 px-1 text-sm font-medium border-b-2 transition-colors ${activeSubTab === 'tasks' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-brand-text-secondary hover:text-brand-text-primary hover:border-slate-300'}`}
          >
            Tasks
          </button>
          <button
            onClick={() => setActiveSubTab('experiments')}
            className={`py-2 px-1 text-sm font-medium border-b-2 transition-colors ${activeSubTab === 'experiments' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-brand-text-secondary hover:text-brand-text-primary hover:border-slate-300'}`}
          >
            Experiments
          </button>
          <button
            onClick={() => setActiveSubTab('artifacts')}
            className={`py-2 px-1 text-sm font-medium border-b-2 transition-colors ${activeSubTab === 'artifacts' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-brand-text-secondary hover:text-brand-text-primary hover:border-slate-300'}`}
          >
            Artifacts
          </button>
        </nav>
      </div>

      {activeSubTab === 'tasks' && (
        <Card
          title="Tasks"
          actions={
            <button
              onClick={() => onOpenCreateTaskModal(startupId)}
              className="flex items-center px-3 py-2 text-sm font-medium text-white bg-brand-primary rounded-md hover:bg-brand-primary/90"
            >
              <PlusCircle className="mr-1.5 h-4 w-4" /> Add Task
            </button>
          }
        >
          {renderTable(['Name', 'Scope', 'Status', 'Due Date', 'Created At'], tasks.map(t => [
            t.name,
            <StatusBadge status={t.scope} />,
            <StatusBadge status={t.status} />,
            t.due_date ? new Date(t.due_date).toLocaleDateString() : 'N/A',
            new Date(t.created_at).toLocaleDateString()
          ]), "No tasks created yet.")}
        </Card>
      )}

      {activeSubTab === 'experiments' && (
        <Card
          title="Experiments"
          actions={
            <button
              onClick={() => onOpenCreateExperimentModal(startupId)}
              className="flex items-center px-3 py-2 text-sm font-medium text-white bg-brand-primary rounded-md hover:bg-brand-primary/90"
            >
              <PlusCircle className="mr-1.5 h-4 w-4" /> Add Experiment
            </button>
          }
        >
          {renderTable(['Name', 'Assumption', 'Scope', 'Status', 'Created At'], experiments.map(e => [
            e.name,
            e.assumption,
            <StatusBadge status={e.scope} />,
            <StatusBadge status={e.status} />,
            new Date(e.created_at).toLocaleDateString()
          ]), "No experiments defined.")}
        </Card>
      )}

      {activeSubTab === 'artifacts' && (
        <Card
          title="Artifacts"
          actions={
            <button
              onClick={() => onOpenCreateArtifactModal(startupId)}
              className="flex items-center px-3 py-2 text-sm font-medium text-white bg-brand-primary rounded-md hover:bg-brand-primary/90"
            >
              <PlusCircle className="mr-1.5 h-4 w-4" /> Add Artifact
            </button>
          }
        >
          {renderTable(['Name', 'Location', 'Type', 'Scope', 'Created At'], artifacts.map(a => [
            a.name,
            a.type === ArtifactType.LINK ? <a href={a.location} target="_blank" rel="noopener noreferrer" className="text-brand-primary hover:underline">{a.location}</a> : a.location,
            <StatusBadge status={a.type} />,
            <StatusBadge status={a.scope} />,
            new Date(a.created_at).toLocaleDateString()
          ]), "No artifacts added.")}
        </Card>
      )}
    </div>
  );
};

export default StartupDetailView;
