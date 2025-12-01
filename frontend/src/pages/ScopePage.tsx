
import React, { useState, useCallback, useEffect } from 'react';
import { ScopeDocument, ScopeSection, Comment as ScopeComment, User, UserRole as Role, ScopeStatus } from '@/types/dashboard-types';
import { Header } from '../components/scope/Header';
import { ScopeSectionComponent } from '../components/scope/ScopeSectionComponent';
import { ActionBar } from '../components/scope/ActionBar';
import api from '../utils/api';

// Mock Data - to be replaced by API calls
const MOCK_USER: User = {
  id: 1,
  email: 'founder@example.com',
  email_verified: true,
  phone_verified: true,
  full_name: 'Startup Founder',
  is_verified: true,
  role: Role.USER,
  created_at: new Date().toISOString()
};
const MOCK_ADMIN: User = {
  id: 2,
  email: 'admin@example.com',
  email_verified: true,
  phone_verified: true,
  full_name: 'Incubator Admin',
  is_verified: true,
  role: Role.ADMIN,
  created_at: new Date().toISOString()
};

const MOCK_SCOPE_DOCUMENT: ScopeDocument = {
  id: 1,
  startup_id: 1,
  title: 'Project Scope for VentureX',
  version: '1.0',
  status: ScopeStatus.PROPOSED,
  content: JSON.stringify([
    {
      id: 'sec-1',
      title: 'Introduction & Goals',
      content: ['<p>This document outlines the scope of work for the initial development phase of the VentureX platform.</p>'],
      comments: [],
    },
    {
      id: 'sec-2',
      title: 'Key Deliverables',
      content: ['<ul><li>User Authentication</li><li>Dashboard UI</li><li>Product Management Module</li></ul>'],
      comments: [],
    }
  ]),
  comments: [],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

interface ScopeDocumentWithSections extends ScopeDocument {
  sections: ScopeSection[];
}

const ScopePage: React.FC = () => {
  const [scopeData, setScopeData] = useState<ScopeDocumentWithSections | null>(null);
  const [activeUser, setActiveUser] = useState<User>(MOCK_USER); // This will be replaced by user from session
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState('product');

  useEffect(() => {
    const fetchScopeData = async () => {
      try {
        setLoading(true);
        const data = await api.getScopeDocument();

        let sections: ScopeSection[] = [];
        try {
          const parsed = JSON.parse(data.content);

          // Check for new structure { product, gtm }
          if (parsed.product || parsed.gtm) {
            if (parsed.product) {
              sections.push({
                id: 'product',
                title: 'Product Scope',
                content: [parsed.product],
                comments: []
              });
            }
            if (parsed.gtm) {
              sections.push({
                id: 'gtm',
                title: 'GTM Scope',
                content: [parsed.gtm],
                comments: []
              });
            }
          }
          // Check for old array structure
          else if (Array.isArray(parsed)) {
            sections = parsed.map((s: any) => ({
              ...s,
              // Ensure content is string[]
              content: Array.isArray(s.content) ? s.content : [s.content]
            }));
          } else {
            // Fallback for simple string or unknown object
            const contentStr = typeof parsed === 'string' ? parsed : JSON.stringify(parsed);
            const gtmKeywords = ["Go-to-Market Strategy", "GTM Strategy", "## Go-to-Market", "## GTM"];
            let splitIndex = -1;
            let foundKeyword = "";

            for (const keyword of gtmKeywords) {
              const idx = contentStr.indexOf(keyword);
              if (idx !== -1) {
                splitIndex = idx;
                foundKeyword = keyword;
                break;
              }
            }

            if (splitIndex !== -1) {
              const productPart = contentStr.substring(0, splitIndex);
              const gtmPart = contentStr.substring(splitIndex);
              sections = [
                {
                  id: 'product',
                  title: 'Product Scope',
                  content: [productPart],
                  comments: []
                },
                {
                  id: 'gtm',
                  title: 'GTM Scope',
                  content: [gtmPart],
                  comments: []
                }
              ];
            } else {
              sections = [{
                id: 'product', // Changed from default to product for consistency
                title: 'Product Scope',
                content: [contentStr],
                comments: []
              }];
            }
          }
        } catch (e) {
          // Fallback if content is not JSON
          const contentStr = data.content;
          const gtmKeywords = ["Go-to-Market Strategy", "GTM Strategy", "## Go-to-Market", "## GTM"];
          let splitIndex = -1;

          for (const keyword of gtmKeywords) {
            const idx = contentStr.indexOf(keyword);
            if (idx !== -1) {
              splitIndex = idx;
              break;
            }
          }

          if (splitIndex !== -1) {
            const productPart = contentStr.substring(0, splitIndex);
            const gtmPart = contentStr.substring(splitIndex);
            sections = [
              {
                id: 'product',
                title: 'Product Scope',
                content: [productPart],
                comments: []
              },
              {
                id: 'gtm',
                title: 'GTM Scope',
                content: [gtmPart],
                comments: []
              }
            ];
          } else {
            sections = [{
              id: 'product', // Changed from default to product
              title: 'Product Scope',
              content: [contentStr],
              comments: []
            }];
          }
        }

        setScopeData({ ...data, sections });
      } catch (err) {
        setError('Failed to load the scope document.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchScopeData();
  }, []);

  const addComment = useCallback(async (sectionId: string, text: string) => {
    if (!text.trim() || !scopeData) return;

    try {
      const newComment = await api.addScopeComment(sectionId, text);

      const newSections = scopeData.sections.map(section => {
        if (section.id === sectionId) {
          const formattedComment: ScopeComment = {
            id: newComment.id,
            text: newComment.text,
            author: 'Founder', // Assuming founder for now, backend should return role/type
            createdAt: newComment.created_at,
          };
          return { ...section, comments: [...section.comments, formattedComment] };
        }
        return section;
      });
      setScopeData({ ...scopeData, sections: newSections });

    } catch (error) {
      console.error("Failed to add comment:", error);
      alert("Could not post your comment. Please try again.");
    }
  }, [scopeData]);

  // Placeholder for handleAccept and handleReject functions
  const handleAccept = useCallback(async () => {
    try {
      await api.acceptScope();
      alert('Scope Accepted! Waiting for other party to accept.');
      window.location.reload();
    } catch (err) {
      console.error("Failed to accept scope:", err);
      alert("Failed to accept scope.");
    }
  }, []);

  const handleReject = useCallback(() => {
    alert('Scope Rejected!');
    // Implement API call to update scope status
  }, []);

  if (loading) {
    return <div>Loading Scope Document...</div>;
  }

  if (error) {
    return <div className="text-red-500">Error: {error}</div>;
  }

  if (!scopeData) {
    return <div>No scope document has been assigned yet.</div>;
  }

  return (
    <div className="relative min-h-full font-sans text-gray-800 bg-white">
      <main className="max-w-4xl mx-auto p-4 md:p-8 pb-32">
        <Header document={scopeData} />

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