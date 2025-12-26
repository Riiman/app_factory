import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { ScopeDocument, ScopeSection, Comment as ScopeComment, User, UserRole as Role, ScopeStatus } from '@/types/dashboard-types';
import DashboardHeader from '../components/layout/DashboardHeader';
import { ScopeSectionComponent } from '../components/scope/ScopeSectionComponent';
import { ActionBar } from '../components/scope/ActionBar';
import api from '../utils/api';

// Helper to parse scope content
const parseScopeData = (data: ScopeDocument): ScopeDocument & { sections: ScopeSection[] } => {
  let sections: ScopeSection[] = [];
  try {
    const parsed = JSON.parse(data.content);

    if (parsed.product || parsed.gtm) {
      if (parsed.product) sections.push({ id: 'product', title: 'Product Scope', content: [parsed.product], comments: [] });
      if (parsed.gtm) sections.push({ id: 'gtm', title: 'GTM Scope', content: [parsed.gtm], comments: [] });
    } else if (Array.isArray(parsed)) {
      sections = parsed.map((s: any) => ({ ...s, content: Array.isArray(s.content) ? s.content : [s.content] }));
    } else {
      const contentStr = typeof parsed === 'string' ? parsed : JSON.stringify(parsed);
      // ... duplicate the fallback parsing logic here (omitted for brevity, I will copy it in strict edit) ...
      // Actually, I should just copy the logic properly.
      const gtmKeywords = ["Go-to-Market Strategy", "GTM Strategy", "## Go-to-Market", "## GTM"];
      let splitIndex = -1;
      for (const keyword of gtmKeywords) {
        if (contentStr.indexOf(keyword) !== -1) { splitIndex = contentStr.indexOf(keyword); break; }
      }
      if (splitIndex !== -1) {
        sections = [
          { id: 'product', title: 'Product Scope', content: [contentStr.substring(0, splitIndex)], comments: [] },
          { id: 'gtm', title: 'GTM Scope', content: [contentStr.substring(splitIndex)], comments: [] }
        ];
      } else {
        sections = [{ id: 'product', title: 'Product Scope', content: [contentStr], comments: [] }];
      }
    }
  } catch (e) {
    // Fallback logic
    const contentStr = data.content;
    const gtmKeywords = ["Go-to-Market Strategy", "GTM Strategy", "## Go-to-Market", "## GTM"];
    let splitIndex = -1;
    for (const keyword of gtmKeywords) {
      if (contentStr.indexOf(keyword) !== -1) { splitIndex = contentStr.indexOf(keyword); break; }
    }
    if (splitIndex !== -1) {
      sections = [
        { id: 'product', title: 'Product Scope', content: [contentStr.substring(0, splitIndex)], comments: [] },
        { id: 'gtm', title: 'GTM Scope', content: [contentStr.substring(splitIndex)], comments: [] }
      ];
    } else {
      sections = [{ id: 'product', title: 'Product Scope', content: [contentStr], comments: [] }];
    }
  }

  if (data.comments && Array.isArray(data.comments)) {
    data.comments.forEach((comment: any) => {
      const section = sections.find(s => s.id === comment.section_id);
      const fmtComment = { id: comment.id, text: comment.text, author: comment.author_name || 'Unknown', createdAt: comment.created_at };
      if (section) section.comments.push(fmtComment);
      else if (sections.length > 0) sections[0].comments.push(fmtComment);
    });
  }
  return { ...data, sections };
};

const ScopePage: React.FC = () => {
  const [activeUser, setActiveUser] = useState<User>({ id: 1, email: 'founder@example.com', full_name: 'Founder', role: Role.USER } as User);
  const [activeTab, setActiveTab] = useState('product');

  const { startupStage, refreshUser } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (startupStage === 'CONTRACT' || startupStage === 'ADMITTED') {
      navigate('/contract');
    }
  }, [startupStage, navigate]);

  const { data: scopeData, isLoading: loading, error: queryError } = useQuery({
    queryKey: ['scope'],
    queryFn: async () => {
      const data = await api.getScopeDocument();
      return parseScopeData(data);
    }
  });

  const error = queryError ? (queryError as Error).message || 'Failed to load scope document.' : null;

  const addComment = useCallback(async (sectionId: string, text: string) => {
    if (!text.trim() || !scopeData) return;
    try {
      await api.addScopeComment(sectionId, text);
      queryClient.invalidateQueries({ queryKey: ['scope'] });
    } catch (error) {
      console.error("Failed to add comment:", error);
      alert("Could not post your comment.");
    }
  }, [scopeData, queryClient]);

  const handleAccept = useCallback(async () => {
    try {
      await api.acceptScope();
      queryClient.invalidateQueries({ queryKey: ['scope'] });
      alert('Scope Accepted! Waiting for other party to accept.');
      await refreshUser();
    } catch (err) {
      console.error("Failed to accept scope:", err);
      alert("Failed to accept scope.");
    }
  }, [queryClient, refreshUser]);

  const handleReject = useCallback(() => {
    // TODO: Implement reject API
    alert('Scope Rejected!');
  }, []);

  if (loading) return <div>Loading Scope Document...</div>;
  if (error) return <div className="text-red-500">Error: {error}</div>;
  if (!scopeData) return <div>No scope document has been assigned yet.</div>;

  return (
    <div className="relative min-h-screen font-sans text-gray-800 bg-white flex flex-col">
      <DashboardHeader />
      <main className="max-w-6xl mx-auto p-4 md:p-8 pb-32 flex-grow w-full">
        {/* Title Area */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{scopeData.title}</h1>
          <p className="text-gray-500 mt-2">Version {scopeData.version}</p>
        </div>

        <div className="flex border-b border-gray-200 mb-6 mt-8">
          <button
            className={`py-2 px-4 font-medium text-sm focus:outline-none ${activeTab === 'product' ? 'border-b-2 border-brand-primary text-brand-primary' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('product')}
          >
            Product Scope
          </button>
          <button
            className={`py-2 px-4 font-medium text-sm focus:outline-none ${activeTab === 'gtm' ? 'border-b-2 border-brand-primary text-brand-primary' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('gtm')}
          >
            GTM Scope
          </button>
        </div>

        <div className="space-y-8">
          {scopeData.sections.filter(s => s.id === activeTab).map(section => (
            <ScopeSectionComponent
              key={section.id}
              section={section}
              onAddComment={addComment}
              activeUser={activeUser}
            />
          ))}
          {scopeData.sections.filter(s => s.id === activeTab).length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No content available for {activeTab === 'product' ? 'Product Scope' : 'GTM Scope'}.
            </div>
          )}
        </div>
      </main>

      <ActionBar
        onAccept={handleAccept}
        onReject={handleReject}
        status={scopeData.status}
        founderAccepted={scopeData.founder_accepted}
        adminAccepted={scopeData.admin_accepted}
      />
    </div>
  );
};
export default ScopePage;