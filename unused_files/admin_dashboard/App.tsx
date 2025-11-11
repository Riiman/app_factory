
import React, { useState, useCallback } from 'react';
import AdminDashboard from './pages/AdminDashboard';
import { mockStartups, mockSubmissions, mockEvaluations, mockUsers } from './data';
import { Startup, SubmissionStatus, StartupStatus, StartupStage, User, Task, Scope, TaskStatus, ScopeOfEngagement, ScopeStatus, Comment, Contract, ContractStatus, Experiment, ExperimentStatus, Artifact, ArtifactType } from './types';

function App() {
  const [startups, setStartups] = useState<Startup[]>(mockStartups);
  const [submissions, setSubmissions] = useState(mockSubmissions);
  const [evaluations] = useState(mockEvaluations);
  const [users] = useState<User[]>(mockUsers);

  const handleUpdateSubmissionStatus = useCallback((submissionId: number, status: SubmissionStatus) => {
    setSubmissions(prev => prev.map(s => s.id === submissionId ? { ...s, status } : s));

    if (status === SubmissionStatus.IN_REVIEW) {
      const submission = submissions.find(s => s.id === submissionId);
      const evaluation = evaluations.find(e => e.submissionId === submissionId);
      const user = users.find(u => u.id === submission?.userId);
      
      if (submission && evaluation && user) {
        if (startups.some(st => st.submissionId === submissionId)) return;

        const newStartup: Startup = {
          id: startups.length + 3,
          userId: submission.userId,
          submissionId: submission.id,
          name: submission.startupName,
          slug: submission.startupName.toLowerCase().replace(/\s+/g, '-'),
          status: StartupStatus.ACTIVE,
          currentStage: StartupStage.EVALUATION,
          nextMilestone: 'Complete onboarding',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          submission,
          evaluation,
          founders: [{ id: 1, startupId: startups.length + 3, name: user.fullName, role: 'Founder', email: user.email, mobile: user.mobile }],
          products: [],
          monthlyData: [],
          fundingRounds: [],
          marketingCampaigns: [],
          tasks: [],
          experiments: [],
          artifacts: [],
        };
        setStartups(prev => [...prev, newStartup]);
      }
    }
    
    if (status === SubmissionStatus.APPROVED) {
        setStartups(prev => prev.map(startup => {
            if (startup.submissionId === submissionId) {
                const newScope: ScopeOfEngagement = {
                    id: Date.now(),
                    startupId: startup.id,
                    productScope: 'Define initial product features and roadmap for the first 3 months.',
                    gtmScope: 'Identify target customer persona and primary acquisition channels.',
                    status: ScopeStatus.DRAFT,
                    comments: [],
                };
                return { ...startup, currentStage: StartupStage.SCOPING, scopeOfEngagement: newScope };
            }
            return startup;
        }));
    }
  }, [submissions, evaluations, users, startups]);

  const handleAddTask = useCallback((startupId: number, taskName: string, scope: Scope) => {
    setStartups(prevStartups => {
        return prevStartups.map(startup => {
            if (startup.id === startupId) {
                const newTask: Task = {
                    id: Date.now() + Math.random(),
                    startupId: startupId,
                    scope: scope,
                    name: taskName,
                    status: TaskStatus.PENDING,
                };
                return {
                    ...startup,
                    tasks: [...startup.tasks, newTask],
                };
            }
            return startup;
        });
    });
  }, []);

  const handleAddExperiment = useCallback((startupId: number, name: string, scope: Scope, assumption: string) => {
    setStartups(prevStartups => {
        return prevStartups.map(startup => {
            if (startup.id === startupId) {
                const newExperiment: Experiment = {
                    id: Date.now() + Math.random(),
                    startupId: startupId,
                    scope: scope,
                    name: name,
                    assumption: assumption,
                    status: ExperimentStatus.PLANNED,
                };
                return {
                    ...startup,
                    experiments: [...startup.experiments, newExperiment],
                };
            }
            return startup;
        });
    });
  }, []);

  const handleAddArtifact = useCallback((startupId: number, name: string, scope: Scope, type: ArtifactType, location: string) => {
    setStartups(prevStartups => {
        return prevStartups.map(startup => {
            if (startup.id === startupId) {
                const newArtifact: Artifact = {
                    id: Date.now() + Math.random(),
                    startupId: startupId,
                    scope: scope,
                    name: name,
                    type: type,
                    location: location,
                };
                return {
                    ...startup,
                    artifacts: [...startup.artifacts, newArtifact],
                };
            }
            return startup;
        });
    });
  }, []);

  const handleUpdateScope = useCallback((startupId: number, productScope: string, gtmScope: string) => {
    setStartups(prev => prev.map(s => {
      if (s.id === startupId && s.scopeOfEngagement) {
        return {
          ...s,
          scopeOfEngagement: { ...s.scopeOfEngagement, productScope, gtmScope }
        };
      }
      return s;
    }));
  }, []);

  const handleAddScopeComment = useCallback((startupId: number, commentText: string, author: 'Admin' | 'Founder') => {
    setStartups(prev => prev.map(s => {
      if (s.id === startupId && s.scopeOfEngagement) {
        const newComment: Comment = {
          id: Date.now(),
          author,
          text: commentText,
          createdAt: new Date().toISOString(),
        };
        return {
          ...s,
          scopeOfEngagement: {
            ...s.scopeOfEngagement,
            comments: [...s.scopeOfEngagement.comments, newComment],
            status: ScopeStatus.IN_DISCUSSION,
          }
        };
      }
      return s;
    }));
  }, []);

  const handleUpdateScopeStatus = useCallback((startupId: number, status: ScopeStatus) => {
    setStartups(prev => prev.map(s => {
      if (s.id === startupId && s.scopeOfEngagement) {
        if (status === ScopeStatus.ACCEPTED) {
          const newContract: Contract = {
            id: Date.now(),
            startupId: s.id,
            documentUrl: '',
            status: ContractStatus.DRAFT,
          };
          return {
            ...s,
            currentStage: StartupStage.CONTRACT,
            scopeOfEngagement: { ...s.scopeOfEngagement, status },
            contract: newContract,
          };
        }
        return { ...s, scopeOfEngagement: { ...s.scopeOfEngagement, status } };
      }
      return s;
    }));
  }, []);

  const handleUpdateContract = useCallback((startupId: number, url: string, status: ContractStatus) => {
    setStartups(prev => prev.map(s => {
        if (s.id === startupId && s.contract) {
            const now = new Date().toISOString();
            const updatedContract = { ...s.contract, documentUrl: url, status };
            if (status === ContractStatus.SENT && !updatedContract.sentAt) updatedContract.sentAt = now;
            if (status === ContractStatus.SIGNED && !updatedContract.signedAt) updatedContract.signedAt = now;
            
            return { ...s, contract: updatedContract };
        }
        return s;
    }));
  }, []);

  const handleActivateStartup = useCallback((startupId: number) => {
    setStartups(prev => prev.map(s => {
        if (s.id === startupId) {
            return { ...s, currentStage: StartupStage.IDEA, nextMilestone: 'Launch MVP' };
        }
        return s;
    }));
  }, []);

  return (
    <div className="min-h-screen">
      <AdminDashboard
        startups={startups}
        submissions={submissions}
        evaluations={evaluations}
        users={users}
        onUpdateSubmissionStatus={handleUpdateSubmissionStatus}
        onAddTask={handleAddTask}
        onAddExperiment={handleAddExperiment}
        onAddArtifact={handleAddArtifact}
        onUpdateScope={handleUpdateScope}
        onAddScopeComment={handleAddScopeComment}
        onUpdateScopeStatus={handleUpdateScopeStatus}
        onUpdateContract={handleUpdateContract}
        onActivateStartup={handleActivateStartup}
      />
    </div>
  );
}

export default App;
