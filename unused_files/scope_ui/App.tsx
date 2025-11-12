
import React, { useState, useCallback } from 'react';
import { SCOPE_DOCUMENT_DATA, USERS } from './constants';
import type { ScopeDocument, Comment, User } from './types';
import { Role } from './types';
import { Header } from './components/Header';
import { ScopeSectionComponent } from './components/ScopeSectionComponent';
import { ActionBar } from './components/ActionBar';

const App: React.FC = () => {
  const [scopeData, setScopeData] = useState<ScopeDocument>(SCOPE_DOCUMENT_DATA);
  const [activeUser, setActiveUser] = useState<User>(USERS.CLIENT_USER);

  const toggleUser = () => {
    setActiveUser(prevUser => 
      prevUser.role === Role.USER ? USERS.PLATFORM_ADMIN : USERS.CLIENT_USER
    );
  };

  const addComment = useCallback((sectionId: string, text: string) => {
    if (!text.trim()) return;

    const newComment: Comment = {
      id: Date.now(),
      text,
      author: activeUser,
      timestamp: 'Just now',
    };

    setScopeData(prevData => {
      const newSections = prevData.sections.map(section => {
        if (section.id === sectionId) {
          return {
            ...section,
            comments: [...section.comments, newComment],
          };
        }
        return section;
      });
      return { ...prevData, sections: newSections };
    });
  }, [activeUser]);

  const handleAccept = () => {
    alert('Scope Accepted! Thank you for your confirmation. The project will now proceed.');
  };

  const handleReject = () => {
    alert('Scope Rejected. We have been notified and will reach out to discuss the necessary adjustments.');
  };

  return (
    <div className="min-h-screen font-sans text-gray-800">
      <div className="sticky top-0 z-20 bg-gray-50/80 backdrop-blur-lg border-b border-gray-200 p-4 flex justify-between items-center">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Scope Document</h1>
        <div className="flex items-center space-x-3">
          <span className="text-sm text-gray-600 hidden sm:inline">Viewing as: <span className="font-semibold">{activeUser.name}</span></span>
          <button 
            onClick={toggleUser} 
            className="px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
          >
            Switch User
          </button>
        </div>
      </div>

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

export default App;
