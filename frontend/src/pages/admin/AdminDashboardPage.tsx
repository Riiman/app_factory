
import React, { useState, useCallback, useEffect } from 'react';
import { Startup, Submission, Evaluation, User, SubmissionStatus, ScopeStatus, Contract, ContractStatus, Scope, ArtifactType, StartupStage } from '../../types/dashboard-types';
import api from '../../utils/api';
import StartupDetailView from './StartupDetailView';
import StartupListView from './StartupListView';
import SubmissionsView from './SubmissionsView';
import InReviewView from './InReviewView';
import ScopingView from './ScopingView';
import ContractView from './ContractView';
import Overview from './Overview';
import { Building2, LayoutDashboard, Inbox, FileClock, FileSignature, FileText, Briefcase, LogOut } from 'lucide-react';

import { useAuth } from '../../contexts/AuthContext';

type ActiveView = 'overview' | 'submissions' | 'in-review' | 'scoping' | 'contract' | 'startups';

const AdminDashboardPage: React.FC = () => {
  const { handleLogout } = useAuth();
  const [startups, setStartups] = useState<Startup[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]); // Evaluations are part of submission detail
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [activeView, setActiveView] = useState<ActiveView>('overview');
  const [selectedStartup, setSelectedStartup] = useState<Startup | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [fetchedSubmissions, fetchedStartups, fetchedUsers] = await Promise.all([
        api.getAllSubmissions(),
        api.getAllStartups(),
        api.getAllUsers(),
      ]);
      
      
      
      // Manually link submissions to startups since the backend might not be nesting them
      const startupsWithData = fetchedStartups.map((startup: Startup) => ({
        ...startup,
        submission: fetchedSubmissions.find((s: Submission) => s.id === startup.submission_id),
      }));

      setSubmissions(fetchedSubmissions);
      setStartups(startupsWithData);
      setUsers(fetchedUsers);

      // Extract evaluations from submissions for now, if needed separately
      const allEvaluations: Evaluation[] = fetchedSubmissions
        .filter((s: any) => s.evaluation)
        .map((s: any) => ({ ...s.evaluation, submissionId: s.id }));
      setEvaluations(allEvaluations);

    } catch (err: any) {
      console.error("Failed to fetch admin data:", err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(); // Fetch data on initial load
    const intervalId = setInterval(fetchData, 15000); // Refetch data every 15 seconds

    return () => clearInterval(intervalId); // Cleanup interval on component unmount
  }, [fetchData]);

  const handleSelectStartup = useCallback((startup: Startup) => {
    setSelectedStartup(startup);
    setActiveView('startups');
  }, []);
  
  const handleClearSelectedStartup = useCallback(() => {
    setSelectedStartup(null);
  }, []);

  const handleViewChange = useCallback((view: ActiveView) => {
      setSelectedStartup(null);
      setActiveView(view);
  }, []);

  const handleUpdateSubmissionStatus = useCallback(async (submissionId: number, status: SubmissionStatus) => {
    try {
      await api.updateSubmissionStatus(submissionId, status.valueOf());
      await fetchData(); // Re-fetch all data to update counts and lists
    } catch (err) {
      console.error("Failed to update submission status:", err);
      alert("Failed to update submission status.");
    }
  }, [fetchData]);

  const handleAddTask = useCallback(async (startupId: number, taskName: string, scope: Scope) => {
    try {
      await api.createTask(startupId, { name: taskName, scope: scope.valueOf(), description: '' });
      await fetchData(); // Re-fetch to update startup details
    } catch (err) {
      console.error("Failed to add task:", err);
      alert("Failed to add task.");
    }
  }, [fetchData]);

  const handleAddExperiment = useCallback(async (startupId: number, name: string, scope: Scope, assumption: string) => {
    try {
      await api.createExperiment(startupId, { name, scope: scope.valueOf(), assumption, description: '' });
      await fetchData();
    } catch (err) {
      console.error("Failed to add experiment:", err);
      alert("Failed to add experiment.");
    }
  }, [fetchData]);

  const handleAddArtifact = useCallback(async (startupId: number, name: string, scope: Scope, type: ArtifactType, location: string) => {
    try {
      await api.createArtifact(startupId, { name, scope: scope.valueOf(), type: type.valueOf(), location, description: '' });
      await fetchData();
    } catch (err) {
      console.error("Failed to add artifact:", err);
      alert("Failed to add artifact.");
    }
  }, [fetchData]);

  const handleUpdateScope = useCallback(async (startupId: number, productScope: string, gtmScope: string) => {
    try {
      await api.updateScopeDocument(startupId, { productScope, gtmScope });
      await fetchData();
    } catch (err) {
      console.error("Failed to update scope:", err);
      alert("Failed to update scope.");
    }
  }, [fetchData]);

  const handleAddScopeComment = useCallback(async (startupId: number, text: string, author: 'Admin' | 'Founder') => {
    // The backend automatically assigns the comment to the logged-in admin.
    // The 'author' parameter from the mock is no longer needed for the API call.
    try {
      await api.addAdminScopeComment(startupId, text);
      await fetchData();
    } catch (err) {
      console.error("Failed to add scope comment:", err);
      alert("Failed to add scope comment.");
    }
  }, [fetchData]);

  const handleUpdateScopeStatus = useCallback(async (startupId: number, status: ScopeStatus) => {
    try {
      await api.updateScopeStatus(startupId, status.valueOf());
      await fetchData();
    } catch (err) {
      console.error("Failed to update scope status:", err);
      alert("Failed to update scope status.");
    }
  }, [fetchData]);

  const handleUpdateContract = useCallback(async (startupId: number, url: string, status: ContractStatus) => {
    try {
      await api.updateContract(startupId, { documentUrl: url, status: status.valueOf() });
      await fetchData();
    } catch (err) {
      console.error("Failed to update contract:", err);
      alert("Failed to update contract.");
    }
  }, [fetchData]);

  const handleActivateStartup = useCallback(async (startupId: number) => {
    try {
      await api.updateStartupStage(startupId, StartupStage.ADMITTED.valueOf()); // Move to ADMITTED stage
      await fetchData();
    } catch (err) {
      console.error("Failed to activate startup:", err);
      alert("Failed to activate startup.");
    }
  }, [fetchData]);

  const pendingSubmissionsCount = submissions.filter(s => s.status === SubmissionStatus.PENDING).length;
  const inReviewSubmissionsCount = submissions.filter(s => s.status === SubmissionStatus.IN_REVIEW).length;
  const scopingStartupsCount = startups.filter(s => s.current_stage === StartupStage.SCOPING || s.current_stage === StartupStage.CONTRACT).length;
  const contractStartupsCount = startups.filter(s => s.current_stage === StartupStage.CONTRACT).length;
  const activeStartups = startups.filter(s => 
    s.current_stage !== StartupStage.EVALUATION && 
    s.current_stage !== StartupStage.SCOPING && 
    s.current_stage !== StartupStage.CONTRACT && 
    s.submission && s.submission.status === SubmissionStatus.APPROVED
  );

  
  

  const renderContent = () => {
    if (loading) return <div className="flex items-center justify-center h-full">Loading admin dashboard...</div>;
    if (error) return <div className="flex items-center justify-center h-full text-red-500">Error: {error}</div>;

    switch(activeView) {
        case 'overview':
            return <Overview startups={startups} submissions={submissions} />;
        case 'submissions':
            return <SubmissionsView submissions={submissions} onUpdateStatus={handleUpdateSubmissionStatus} />;
        case 'in-review':
            return <InReviewView submissions={submissions} evaluations={evaluations} users={users} startups={startups} onUpdateStatus={handleUpdateSubmissionStatus} onAddTask={handleAddTask} />;
        case 'scoping':
            return <ScopingView startupsInScoping={startups.filter(s => s.current_stage === StartupStage.SCOPING || s.current_stage === StartupStage.CONTRACT)} onUpdateScope={handleUpdateScope} onAddComment={handleAddScopeComment} onUpdateStatus={handleUpdateScopeStatus} />;
        case 'contract':
            return <ContractView startupsInContract={startups.filter(s => s.current_stage === StartupStage.CONTRACT)} fetchData={fetchData} />;
        case 'startups':
            if (selectedStartup) {
                return <StartupDetailView startup={selectedStartup} onBack={handleClearSelectedStartup} onAddTask={handleAddTask} onAddExperiment={handleAddExperiment} onAddArtifact={handleAddArtifact} />;
            }
            return <StartupListView startups={activeStartups} onSelectStartup={handleSelectStartup} />;
        default:
            return <Overview startups={startups} submissions={submissions} />;
    }
  };

  return (
    <div className="flex h-screen bg-brand-background">
      <aside className="w-64 bg-brand-surface border-r border-slate-200 flex flex-col">
        <div className="p-4 border-b border-slate-200">
          <h1 className="text-xl font-bold text-brand-primary flex items-center">
            <Building2 className="mr-2" /> StartupOS Admin
          </h1>
        </div>
        <nav className="flex-grow p-2 space-y-4">
          <div>
            <ul className="space-y-1">
                 <NavItem icon={<LayoutDashboard className="mr-3 h-4 w-4" />} label="Dashboard Overview" view="overview" activeView={activeView} onClick={handleViewChange} />
            </ul>
          </div>
          <div>
            <h2 className="px-2 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wider">Workflow</h2>
            <ul className="space-y-1">
                <NavItem count={pendingSubmissionsCount} icon={<Inbox className="mr-3 h-4 w-4" />} label="Submissions" view="submissions" activeView={activeView} onClick={handleViewChange} />
                <NavItem count={inReviewSubmissionsCount} icon={<FileClock className="mr-3 h-4 w-4" />} label="In Review" view="in-review" activeView={activeView} onClick={handleViewChange} />
                <NavItem count={scopingStartupsCount} icon={<FileSignature className="mr-3 h-4 w-4" />} label="Scoping" view="scoping" activeView={activeView} onClick={handleViewChange} />
                <NavItem count={contractStartupsCount} icon={<FileText className="mr-3 h-4 w-4" />} label="Contract" view="contract" activeView={activeView} onClick={handleViewChange} />
            </ul>
          </div>
          <div>
            <h2 className="px-2 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wider">Directory</h2>
            <ul>
                <NavItem icon={<Briefcase className="mr-3 h-4 w-4" />} label="Startups" view="startups" activeView={activeView} onClick={handleViewChange} />
            </ul>
          </div>
        </nav>
        <div className="p-2">
            <button onClick={handleLogout} className="w-full text-left px-3 py-2 rounded-md text-sm font-medium flex items-center text-brand-text-secondary hover:bg-slate-100 transition-colors">
                <LogOut className="mr-3 h-4 w-4" />
                Logout
            </button>
        </div>
        <div className="p-4 border-t border-slate-200 text-xs text-slate-500">
            &copy; {new Date().getFullYear()} StartupOS Inc.
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        {renderContent()}
      </main>
    </div>
  );
};

const NavItem: React.FC<{
    icon: React.ReactNode;
    label: string;
    view: ActiveView;
    activeView: ActiveView;
    onClick: (view: ActiveView) => void;
    count?: number;
}> = ({ icon, label, view, activeView, onClick, count }) => (
    <li>
        <button onClick={() => onClick(view)}
            className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium flex items-center justify-between transition-colors ${
                activeView === view
                ? 'bg-brand-primary/10 text-brand-primary'
                : 'text-brand-text-secondary hover:bg-slate-100'
            }`}
        >
            <div className="flex items-center">
                {icon}
                {label}
            </div>
            {count !== undefined && count > 0 && (
                <span className="bg-brand-primary text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {count}
                </span>
            )}
        </button>
    </li>
);


export default AdminDashboardPage;
