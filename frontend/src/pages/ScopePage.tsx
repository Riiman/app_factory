import React, { useState, useCallback, useEffect } from 'react';
import { ScopeDocument, Comment as ScopeComment, User, Role } from '../components/scope/scope-types';
import { Header } from '../components/scope/Header';
import { ScopeSectionComponent } from '../components/scope/ScopeSectionComponent';
import { ActionBar } from '../components/scope/ActionBar';
import api from '../utils/api'; // To be used later

// Mock Data - to be replaced by API calls
const MOCK_USER: User = { id: '1', name: 'Startup Founder', role: Role.USER };
const MOCK_ADMIN: User = { id: 'admin-1', name: 'Incubator Admin', role: Role.ADMIN };

const MOCK_SCOPE_DOCUMENT: ScopeDocument = {
    title: 'Project Scope for VentureX',
    version: '1.0',
    status: 'Pending Review',
    client: 'VentureX Startup',
    preparedBy: 'Incubator Platform',
    sections: [
        {
            id: 'sec-1',
            title: 'Introduction & Goals',
            content: '<p>This document outlines the scope of work for the initial development phase of the VentureX platform.</p>',
            comments: [],
        },
        {
            id: 'sec-2',
            title: 'Key Deliverables',
            content: '<ul><li>User Authentication</li><li>Dashboard UI</li><li>Product Management Module</li></ul>',
            comments: [],
        }
    ]
};

const ScopePage: React.FC = () => {
  const [scopeData, setScopeData] = useState<ScopeDocument | null>(null);
  const [activeUser, setActiveUser] = useState<User>(MOCK_USER); // This will be replaced by user from session
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchScopeData = async () => {
      try {
        setLoading(true);
        const data = await api.getScopeDocument();
        setScopeData(data);
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
          // The backend comment object might have a slightly different structure
          const formattedComment: ScopeComment = {
            id: newComment.id,
            text: newComment.text,
            author: { id: newComment.user_id, name: newComment.author_name, role: Role.USER }, // Adapt as needed
            timestamp: newComment.created_at,
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
  const handleAccept = useCallback(() => {
    alert('Scope Accepted!');
    // Implement API call to update scope status
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
        <div className="space-y-8 mt-8">
          {scopeData.sections.map(section => (
            <ScopeSectionComponent 
              key={section.id} 
              section={section} 
              onAddComment={addComment}
              activeUser={activeUser}
            />
          ))}
        </div>
      </main>
      
      <ActionBar onAccept={handleAccept} onReject={handleReject} />
    </div>
  );
};

export default ScopePage;