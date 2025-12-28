import React, { useState, useCallback, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Startup, Submission, Evaluation, User, SubmissionStatus, ScopeStatus, Contract, ContractStatus, Scope, ArtifactType, StartupStage, ActivityLog, DashboardNotification, Feature } from '../../types/dashboard-types';
import api, { getWebSocketUrl } from '../../utils/api';
// Socket.IO removed in favor of native WebSocket
import StartupDetailView from './StartupDetailView';
import StartupListView from './StartupListView';
import SubmissionsView from './SubmissionsView';
import InReviewView from './InReviewView';
import ScopingView from './ScopingView';
import ContractView from './ContractView';

import Overview from './Overview';
import RecentActivityFeed from '../../components/dashboard/RecentActivityFeed';
import NotificationCenter from '../../components/dashboard/NotificationCenter';
import { Building2, LayoutDashboard, Inbox, FileClock, FileSignature, FileText, Briefcase, LogOut } from 'lucide-react';

import { useAuth } from '../../contexts/AuthContext';

type ActiveView = 'overview' | 'submissions' | 'in-review' | 'scoping' | 'contract' | 'startups';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// ... (imports remain the same)
import CreateTaskModal from '../../components/dashboard/CreateTaskModal';
import CreateExperimentModal from '../../components/dashboard/CreateExperimentModal';
import CreateArtifactModal from '../../components/dashboard/CreateArtifactModal';
import EditFeatureModal from '../../components/dashboard/EditFeatureModal';


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
      className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium flex items-center justify-between transition-colors ${activeView === view
        ? 'bg-brand-primary/10 text-brand-primary'
        : 'text-brand-text-secondary hover:bg-slate-100'
        } `}
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
const AdminDashboardPage: React.FC = () => {
  const { handleLogout, token } = useAuth();
  const queryClient = useQueryClient();

  // --- React Query for Data Fetching ---
  const { data: adminData, isLoading, isError, error } = useQuery({
    queryKey: ['adminData'],
    queryFn: async () => {
      const [fetchedSubmissions, fetchedStartups, fetchedUsers, fetchedActivity, fetchedNotifications] = await Promise.all([
        api.getAllSubmissions(),
        api.getAllStartups(),
        api.getAllUsers(),
        api.getRecentActivity(),
        api.getNotifications(),
      ]);

      // Manually link submissions to startups
      const startupsWithData = fetchedStartups.map((startup: Startup) => ({
        ...startup,
        submission: fetchedSubmissions.find((s: Submission) => s.id === startup.submission_id),
      }));

      // Extract evaluations
      const allEvaluations: Evaluation[] = fetchedSubmissions
        .filter((s: any) => s.evaluation)
        .map((s: any) => ({ ...s.evaluation, submissionId: s.id }));

      return {
        submissions: fetchedSubmissions,
        startups: startupsWithData,
        users: fetchedUsers,
        evaluations: allEvaluations,
        activity: fetchedActivity,
        notifications: fetchedNotifications
      };
    },
    refetchOnWindowFocus: true,
  });

  const startups = adminData?.startups || [];
  const submissions = adminData?.submissions || [];
  const evaluations = adminData?.evaluations || [];
  const users = adminData?.users || [];
  const activity = adminData?.activity || [];
  const notifications = adminData?.notifications || [];

  // --- State Declarations ---
  const [analyzingSubmissionIds, setAnalyzingSubmissionIds] = useState<number[]>([]);
  const [activeView, setActiveView] = useState<ActiveView>('overview');
  const [selectedStartupId, setSelectedStartupId] = useState<number | null>(null);

  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [isCreateExperimentModalOpen, setIsCreateExperimentModalOpen] = useState(false);
  const [isCreateArtifactModalOpen, setIsCreateArtifactModalOpen] = useState(false);
  const [isEditFeatureModalOpen, setIsEditFeatureModalOpen] = useState(false);
  const [selectedFeatureToEdit, setSelectedFeatureToEdit] = useState<Feature | null>(null);
  const [selectedProductForFeatureEdit, setSelectedProductForFeatureEdit] = useState<number | null>(null);

  const selectedStartup = selectedStartupId ? startups.find(s => s.id === selectedStartupId) || null : null;

  // --- Native WebSocket Listener for Admin Updates ---
  useEffect(() => {
    if (!token) return;

    // Use the native WebSocket endpoint (FastAPI) just like App.tsx
    const wsUrl = getWebSocketUrl('/ws/dashboard-notifications');
    const ws = new WebSocket(`${wsUrl}?token=${token}`);

    ws.onopen = () => {
      console.log('Admin connected to dashboard notifications WebSocket.');
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log("Admin received WS message:", message);

        const { type, data } = message;

        // Shared helper for success/error handling
        const handleEvent = (prefix: string, d: any, successMsg: string, errorMsg: string) => {
          if (d.status === 'error' || type.endsWith('_failed')) {
            toast.error(d.message || errorMsg);
          } else {
            toast.success(d.message || successMsg);
            queryClient.invalidateQueries({ queryKey: ['adminData'] });
          }
        };

        switch (type) {
          case 'analysis_started':
            handleEvent('Analysis Started', data, "Analysis started...", "Failed to start analysis.");
            setAnalyzingSubmissionIds(prev => [...prev, data.submission_id]);
            break;

          case 'analysis_completed':
            handleEvent('Analysis', data, "Evaluation analysis completed!", "Analysis failed.");
            setAnalyzingSubmissionIds(prev => prev.filter(id => id !== data.submission_id));

            // Update cache with new evaluation and status
            queryClient.setQueryData(['adminData'], (oldData: any) => {
              if (!oldData) return oldData;
              return {
                ...oldData,
                submissions: oldData.submissions.map((s: Submission) => {
                  if (s.id === data.submission_id) {
                    return {
                      ...s,
                      status: data.submission_status, // Update status to IN_REVIEW
                      evaluation: data.evaluation
                    };
                  }
                  return s;
                }),
                evaluations: [
                  ...oldData.evaluations.filter((e: Evaluation) => e.submission_id !== data.submission_id),
                  { ...data.evaluation, submission_id: data.submission_id }
                ]
              };
            });
            break;

          case 'analysis_failed':
            handleEvent('Analysis Failed', data, "", "Evaluation analysis failed.");
            setAnalyzingSubmissionIds(prev => prev.filter(id => id !== data.submission_id));
            break;

          case 'scope_generation_started':
            handleEvent('Scope Gen Started', data, data.message || "Scope generation started...", "Failed to start scope generation.");
            break;

          case 'scope_generation_completed':
            handleEvent('Scope Gen', data, "Scope document generated!", "Failed to generate scope.");
            break;

          case 'contract_generation_started':
            handleEvent('Contract Gen Started', data, data.message || "Contract generation started...", "Failed to start contract generation.");
            break;

          case 'contract_generation_completed':
            handleEvent('Contract Gen', data, "Contract generated!", "Failed to generate contract.");
            break;

          case 'assets_generation_started':
            handleEvent('Assets Gen Started', data, data.message || "Asset generation started...", "Failed to start asset generation.");
            break;

          case 'assets_generation_completed':
            handleEvent('Assets Gen', data, "Assets generated!", "Failed to generate assets.");
            break;

          case 'product_generated':
            handleEvent('Product Gen', data, "Product generated for startup!", "Failed to generate product.");
            break;

          case 'campaigns_generated':
            handleEvent('Campaigns Gen', data, "Marketing campaigns generated for startup!", "Failed to generate campaigns.");
            break;

          case 'submission_status_updated':
            console.log('Submission Status Updated:', data);

            // Update cache immediately using setQueryData
            queryClient.setQueryData(['adminData'], (oldData: any) => {
              if (!oldData) return oldData;

              const updatedSubmissions = oldData.submissions.map((s: Submission) => {
                if (s.id === data.submission_id) {
                  return { ...s, status: data.new_status };
                }
                return s;
              });

              let updatedStartups = oldData.startups;

              // If we received a new startup (e.g. on approval), add it to the list
              if (data.startup) {
                // Check if it already exists to avoid duplicates
                if (!oldData.startups.find((s: Startup) => s.id === data.startup.id)) {
                  // Manually link submission to startup for consistency
                  const newStartup = {
                    ...data.startup,
                    submission: updatedSubmissions.find((s: Submission) => s.id === data.submission_id)
                  };
                  updatedStartups = [...oldData.startups, newStartup];
                }
              }

              return {
                ...oldData,
                submissions: updatedSubmissions,
                startups: updatedStartups
              };
            });

            if (data.is_generating_scope) {
              toast.success("Scope generation initialized.");
            }
            break;

          case 'scope_accepted':
            // Update the specific startup's scope document status in the cache
            queryClient.setQueryData(['adminData'], (oldData: any) => {
              if (!oldData) return oldData;
              return {
                ...oldData,
                startups: oldData.startups.map((s: Startup) => {
                  if (s.id === data.startup_id) {
                    return { ...s, scope_document: data.scope_document }; // data.scope_document is the full updated object
                  }
                  return s;
                })
              };
            });
            toast.success("Scope accepted!");
            break;

          case 'scope_comment_added':
            // Update cache with new comment
            queryClient.setQueryData(['adminData'], (oldData: any) => {
              if (!oldData) return oldData;
              return {
                ...oldData,
                startups: oldData.startups.map((s: Startup) => {
                  if (s.id === data.startup_id && s.scope_document) {
                    // specific check to avoid duplicate comments
                    if (s.scope_document.comments.some((c: any) => c.id === data.comment.id)) return s;

                    return {
                      ...s,
                      scope_document: {
                        ...s.scope_document,
                        comments: [...s.scope_document.comments, data.comment]
                      }
                    };
                  }
                  return s;
                })
              };
            });
            //  toast.success("New comment on scope."); // Optional: might be too noisy
            break;

          case 'contract_accepted':
          case 'contract_updated':
          case 'contract_signed':
            // Update the specific startup's contract in the cache
            queryClient.setQueryData(['adminData'], (oldData: any) => {
              if (!oldData) return oldData;
              return {
                ...oldData,
                startups: oldData.startups.map((s: Startup) => {
                  if (s.id === data.startup_id) {
                    // For contract_signed, we might also need to update startup stage if it changed
                    const updatedStartup = { ...s, contract: data.contract };
                    if (type === 'contract_signed') {
                      // Assuming the backend handles the stage transition, but if the WS sends it, we should use it.
                      // Ideally the 'startup_stage_updated' event handles the stage, but let's be safe.
                    }
                    return updatedStartup;
                  }
                  return s;
                })
              };
            });
            if (type === 'contract_accepted') toast.success("Contract accepted!");
            if (type === 'contract_signed') toast.success("Contract signed!");
            break;

          // Catch-all for other dashboard updates that App.tsx might handle but we also want to refresh on
          case 'dashboard_update':
            queryClient.invalidateQueries({ queryKey: ['adminData'] });
            break;
        }

      } catch (error) {
        console.error("Failed to parse WebSocket message in Admin:", error);
      }
    };

    ws.onclose = () => {
      console.log('Admin disconnected from dashboard notifications WebSocket.');
    };

    return () => {
      ws.close();
    };
  }, [token, queryClient]);

  const handleSelectStartup = useCallback((startup: Startup) => {
    setSelectedStartupId(startup.id);
    setActiveView('startups');
  }, []);

  const handleClearSelectedStartup = useCallback(() => {
    setSelectedStartupId(null);
  }, []);

  const handleViewChange = useCallback((view: ActiveView) => {
    setSelectedStartupId(null);
    setActiveView(view);
  }, []);

  const handleUpdateSubmissionStatus = useCallback(async (submissionId: number, status: SubmissionStatus) => {
    try {
      await api.updateSubmissionStatus(submissionId, status.valueOf());
      queryClient.invalidateQueries({ queryKey: ['adminData'] });
    } catch (err) {
      console.error("Failed to update submission status:", err);
      alert("Failed to update submission status.");
    }
  }, [queryClient]);

  const handleCreateTask = useCallback(async (taskData: any) => {
    if (!selectedStartupId) return;
    try {
      await api.createTask(selectedStartupId, taskData);
      queryClient.invalidateQueries({ queryKey: ['adminData'] });
      setIsCreateTaskModalOpen(false);
    } catch (err) {
      console.error("Failed to add task:", err);
      alert("Failed to add task.");
    }
  }, [queryClient, selectedStartupId]);

  const handleCreateExperiment = useCallback(async (experimentData: any) => {
    if (!selectedStartupId) return;
    try {
      await api.createExperiment(selectedStartupId, experimentData);
      queryClient.invalidateQueries({ queryKey: ['adminData'] });
      setIsCreateExperimentModalOpen(false);
    } catch (err) {
      console.error("Failed to add experiment:", err);
      alert("Failed to add experiment.");
    }
  }, [queryClient, selectedStartupId]);

  const handleCreateArtifact = useCallback(async (artifactData: any) => {
    if (!selectedStartupId) return;
    try {
      await api.createArtifact(selectedStartupId, artifactData);
      queryClient.invalidateQueries({ queryKey: ['adminData'] });
      setIsCreateArtifactModalOpen(false);
    } catch (err) {
      console.error("Failed to add artifact:", err);
      alert("Failed to add artifact.");
    }
  }, [queryClient, selectedStartupId]);

  const handleUpdateFeature = useCallback(async (updatedData: Partial<Feature>) => {
    if (!selectedStartupId || !selectedProductForFeatureEdit || !selectedFeatureToEdit) return;
    try {
      await api.updateFeature(selectedStartupId, selectedProductForFeatureEdit, selectedFeatureToEdit.id, updatedData);
      queryClient.invalidateQueries({ queryKey: ['adminData'] });
      setIsEditFeatureModalOpen(false);
    } catch (err) {
      console.error("Failed to update feature:", err);
      alert("Failed to update feature.");
    }
  }, [queryClient, selectedStartupId, selectedProductForFeatureEdit, selectedFeatureToEdit]);

  const handleUpdateScope = useCallback(async (startupId: number, productScope: string, gtmScope: string) => {
    try {
      await api.updateScopeDocument(startupId, JSON.stringify({ product: productScope, gtm: gtmScope }));
      queryClient.invalidateQueries({ queryKey: ['adminData'] });
    } catch (err) {
      console.error("Failed to update scope:", err);
      alert("Failed to update scope.");
    }
  }, [queryClient]);

  const handleAddScopeComment = useCallback(async (startupId: number, text: string, author: 'Admin' | 'Founder', sectionId: string) => {
    // The backend automatically assigns the comment to the logged-in admin.
    // The 'author' parameter from the mock is no longer needed for the API call.
    try {
      await api.addAdminScopeComment(startupId, text, sectionId);
      queryClient.invalidateQueries({ queryKey: ['adminData'] });
    } catch (err) {
      console.error("Failed to add scope comment:", err);
      alert("Failed to add scope comment.");
    }
  }, [queryClient]);

  const handleUpdateScopeStatus = useCallback(async (startupId: number, status: ScopeStatus) => {
    try {
      await api.updateScopeStatus(startupId, status.valueOf());
      queryClient.invalidateQueries({ queryKey: ['adminData'] });
    } catch (err) {
      console.error("Failed to update scope status:", err);
      alert("Failed to update scope status.");
    }
  }, [queryClient]);

  const handleUpdateContract = useCallback(async (startupId: number, url: string, status: ContractStatus) => {
    try {
      await api.updateContract(startupId, { documentUrl: url, status: status.valueOf() });
      queryClient.invalidateQueries({ queryKey: ['adminData'] });
    } catch (err) {
      console.error("Failed to update contract:", err);
      alert("Failed to update contract.");
    }
  }, [queryClient]);

  const handleActivateStartup = useCallback(async (startupId: number) => {
    try {
      await api.updateStartupStage(startupId, StartupStage.ADMITTED.valueOf()); // Move to ADMITTED stage
      queryClient.invalidateQueries({ queryKey: ['adminData'] });
    } catch (err) {
      console.error("Failed to activate startup:", err);
      alert("Failed to activate startup.");
    }
  }, [queryClient]);

  const handleMarkNotificationAsRead = useCallback(async (id: number) => {
    try {
      await api.markNotificationAsRead(id);
      queryClient.invalidateQueries({ queryKey: ['adminData'] });
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  }, [queryClient]);

  const pendingSubmissionsCount = submissions.filter(s => s.status?.toUpperCase() === SubmissionStatus.PENDING).length;
  const inReviewSubmissionsCount = submissions.filter(s => s.status?.toUpperCase() === SubmissionStatus.IN_REVIEW).length;
  const scopingStartupsCount = startups.filter(s => ['SCOPING', 'CONTRACT'].includes(s.current_stage?.toUpperCase())).length;
  const contractStartupsCount = startups.filter(s => s.current_stage?.toUpperCase() === StartupStage.CONTRACT).length;
  const activeStartups = startups.filter(s =>
    !['EVALUATION', 'SCOPING', 'CONTRACT'].includes(s.current_stage?.toUpperCase()) &&
    s.submission && s.submission.status?.toUpperCase() === SubmissionStatus.APPROVED
  );




  const renderContent = () => {
    if (isLoading) return <div className="flex items-center justify-center h-full">Loading admin dashboard...</div>;
    if (isError) return <div className="flex items-center justify-center h-full text-red-500">Error: {error?.message}</div>;

    switch (activeView) {
      case 'overview':
        return (
          <div className="h-full">
            <Overview
              startups={startups}
              submissions={submissions}
              activity={activity}
              notifications={notifications as DashboardNotification[]}
              onMarkAsRead={handleMarkNotificationAsRead}
            />
          </div>
        );
      case 'submissions':
        return <SubmissionsView submissions={submissions} onUpdateStatus={handleUpdateSubmissionStatus} analyzingSubmissionIds={analyzingSubmissionIds} />;
      case 'in-review':
        return <InReviewView submissions={submissions} users={users} startups={startups} onUpdateStatus={handleUpdateSubmissionStatus} onOpenCreateTaskModal={(id) => { setSelectedStartupId(id); setIsCreateTaskModalOpen(true); }} />;
      case 'scoping':
        return <ScopingView startupsInScoping={startups.filter(s => s.current_stage === StartupStage.SCOPING || s.current_stage === StartupStage.CONTRACT)} onUpdateScope={handleUpdateScope} onAddComment={handleAddScopeComment} onUpdateStatus={handleUpdateScopeStatus} />;
      case 'contract':
        return <ContractView startupsInContract={startups.filter(s => s.current_stage === StartupStage.CONTRACT)} fetchData={() => queryClient.invalidateQueries({ queryKey: ['adminData'] })} />;
      case 'startups':
        if (selectedStartup) {
          return <StartupDetailView
            startup={selectedStartup}
            onBack={handleClearSelectedStartup}
            onOpenCreateTaskModal={() => setIsCreateTaskModalOpen(true)}
            onOpenCreateExperimentModal={() => setIsCreateExperimentModalOpen(true)}
            onOpenCreateArtifactModal={() => setIsCreateArtifactModalOpen(true)}
            onEditFeature={(productId, feature) => {
              setSelectedProductForFeatureEdit(productId);
              setSelectedFeatureToEdit(feature);
              setIsEditFeatureModalOpen(true);
            }}
          />;
        }
        return <StartupListView startups={activeStartups} onSelectStartup={handleSelectStartup} />;
      default:
        return (
          <Overview
            startups={startups}
            submissions={submissions}
            activity={activity}
            notifications={notifications as DashboardNotification[]}
            onMarkAsRead={handleMarkNotificationAsRead}
          />
        );
    }
  };

  return (
    <div className="flex h-screen bg-brand-background">
      <aside className="w-64 bg-brand-surface border-r border-slate-200 flex flex-col">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center">
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

      {isCreateTaskModalOpen && selectedStartup && (
        <CreateTaskModal
          onClose={() => setIsCreateTaskModalOpen(false)}
          onCreate={handleCreateTask}
          linkableItems={{
            [Scope.PRODUCT]: selectedStartup.products.map(p => ({ id: p.id, name: p.name })),
            [Scope.FUNDRAISING]: selectedStartup.funding_rounds.map(r => ({ id: r.round_id, name: `${r.round_type} Round` })),
            [Scope.MARKETING]: selectedStartup.marketing_campaigns.map(c => ({ id: c.campaign_id, name: c.campaign_name })),
            [Scope.GENERAL]: [],
            [Scope.BUSINESS]: [],
            [Scope.WORKSPACE]: [],
            [Scope.TEAM]: [],
            [Scope.SETTINGS]: [],
            [Scope.DASHBOARD]: []
          }}
        />
      )}

      {isCreateExperimentModalOpen && selectedStartup && (
        <CreateExperimentModal
          onClose={() => setIsCreateExperimentModalOpen(false)}
          onCreate={handleCreateExperiment}
          linkableItems={{
            [Scope.PRODUCT]: selectedStartup.products.map(p => ({ id: p.id, name: p.name })),
            [Scope.FUNDRAISING]: selectedStartup.funding_rounds.map(r => ({ id: r.round_id, name: `${r.round_type} Round` })),
            [Scope.MARKETING]: selectedStartup.marketing_campaigns.map(c => ({ id: c.campaign_id, name: c.campaign_name })),
            [Scope.GENERAL]: [],
            [Scope.BUSINESS]: [],
            [Scope.WORKSPACE]: [],
            [Scope.TEAM]: [],
            [Scope.SETTINGS]: [],
            [Scope.DASHBOARD]: []
          }}
        />
      )}

      {isCreateArtifactModalOpen && selectedStartup && (
        <CreateArtifactModal
          onClose={() => setIsCreateArtifactModalOpen(false)}
          onCreate={handleCreateArtifact}
          linkableItems={{
            [Scope.PRODUCT]: selectedStartup.products.map(p => ({ id: p.id, name: p.name })),
            [Scope.FUNDRAISING]: selectedStartup.funding_rounds.map(r => ({ id: r.round_id, name: `${r.round_type} Round` })),
            [Scope.MARKETING]: selectedStartup.marketing_campaigns.map(c => ({ id: c.campaign_id, name: c.campaign_name })),
            [Scope.GENERAL]: [],
            [Scope.BUSINESS]: [],
            [Scope.WORKSPACE]: [],
            [Scope.TEAM]: [],
            [Scope.SETTINGS]: [],
            [Scope.DASHBOARD]: []
          }}
        />
      )}

      {isEditFeatureModalOpen && selectedFeatureToEdit && (
        <EditFeatureModal
          feature={selectedFeatureToEdit}
          onClose={() => setIsEditFeatureModalOpen(false)}
          onUpdate={handleUpdateFeature}
        />
      )}
    </div>
  );
};




export default AdminDashboardPage;
