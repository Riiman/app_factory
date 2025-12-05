
import React from 'react';
import type { ScopeSection, User } from '@/types/dashboard-types';
import { CommentComponent } from './CommentComponent';
import { CommentFormComponent } from './CommentFormComponent';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ScopeSectionProps {
  section: ScopeSection;
  onAddComment: (sectionId: string, text: string) => void;
  activeUser: User;
}

export const ScopeSectionComponent: React.FC<ScopeSectionProps> = ({ section, onAddComment, activeUser }) => {
  return (
    <section id={section.id} className="bg-white p-6 rounded-xl shadow-md border border-gray-200 scroll-mt-24">
      <h2 className="text-2xl font-bold text-gray-800 border-b pb-3 mb-4">{section.title}</h2>
      <div className="prose prose-indigo max-w-none">
        {section.content.map((item, index) => (
          <ReactMarkdown key={index} remarkPlugins={[remarkGfm]}>{item}</ReactMarkdown>
        ))}
      </div>
      <div className="mt-6 border-t pt-4">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Comments ({section.comments.length})</h3>
        <div className="space-y-4">
          {section.comments.map(comment => (
            <CommentComponent key={comment.id} comment={comment} />
          ))}
        </div>
        <CommentFormComponent
          sectionId={section.id}
          onAddComment={onAddComment}
          activeUser={activeUser}
        />
      </div>
    </section>
  );
};
