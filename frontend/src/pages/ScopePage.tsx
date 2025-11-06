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

  // ... (handleAccept and handleReject will be wired up later) ...

  if (loading) {
    return <div>Loading Scope Document...</div>;
  }

  if (error) {
    return <div className="text-red-500">Failed to edit, 0 occurrences found for old_string (const ScopePage: React.FC = () => {
  const [scopeData, setScopeData] = useState<ScopeDocument | null>(null);
  const [activeUser, setActiveUser] = useState<User>(MOCK_USER); // Assume the user is the founder
  const [loading, setLoading] = useState(true);

  // In the future, we will fetch this data from the backend
  useEffect(() => {
    // const fetchScopeData = async () => {
    //   try {
    //     // const data = await api.getScopeDocument();
    //     // setScopeData(data);
    //     setScopeData(MOCK_SCOPE_DOCUMENT); // Using mock for now
    //   } catch (error) {
    //     console.error("Failed to fetch scope document", error);
    //   } finally {
    //     setLoading(false);
    //   }
    // };
    // fetchScopeData();
    setScopeData(MOCK_SCOPE_DOCUMENT);
    setLoading(false);
  }, []);

  const addComment = useCallback((sectionId: string, text: string) => {
    if (!text.trim() || !scopeData) return;

    const newComment: ScopeComment = {
      id: Date.now(),
      text,
      author: activeUser,
      timestamp: 'Just now',
    };

    // This will later be an API call
    const newSections = scopeData.sections.map(section => {
      if (section.id === sectionId) {
        return { ...section, comments: [...section.comments, newComment] };
      }
      return section;
    });
    setScopeData({ ...scopeData, sections: newSections });
  }, [activeUser, scopeData]);

  // ... (handleAccept and handleReject) ...

  if (loading || !scopeData) {
    return <div>Loading Scope Document...</div>;
  }

  return (
    // ... (rest of the JSX remains the same) ...
  );
};). Original old_string was (const ScopePage: React.FC = () => {
  const [scopeData, setScopeData] = useState<ScopeDocument | null>(null);
  const [activeUser, setActiveUser] = useState<User>(MOCK_USER); // Assume the user is the founder
  const [loading, setLoading] = useState(true);

  // In the future, we will fetch this data from the backend
  useEffect(() => {
    // const fetchScopeData = async () => {
    //   try {
    //     // const data = await api.getScopeDocument();
    //     // setScopeData(data);
    //     setScopeData(MOCK_SCOPE_DOCUMENT); // Using mock for now
    //   } catch (error) {
    //     console.error("Failed to fetch scope document", error);
    //   }
    // };
    // fetchScopeData();
    setScopeData(MOCK_SCOPE_DOCUMENT);
    setLoading(false);
  }, []);

  const addComment = useCallback((sectionId: string, text: string) => {
    if (!text.trim() || !scopeData) return;

    const newComment: ScopeComment = {
      id: Date.now(),
      text,
      author: activeUser,
      timestamp: 'Just now',
    };

    // This will later be an API call
    const newSections = scopeData.sections.map(section => {
      if (section.id === sectionId) {
        return { ...section, comments: [...section.comments, newComment] };
      }
      return section;
    });
    setScopeData({ ...scopeData, sections: newSections });
  }, [activeUser, scopeData]);

  // ... (handleAccept and handleReject) ...

  if (loading || !scopeData) {
    return <div>Loading Scope Document...</div>;
  }

  return (
    // ... (rest of the JSX remains the same) ...
  );
};) in /home/rimanshu/Desktop/Turning Idea/frontend/src/pages/ScopePage.tsx. No edits made. The exact text in old_string was not found. Ensure you're not escaping content incorrectly and check whitespace, indentation, and context. Use read_file tool to verify.</div>;
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
