
import React, { useState } from 'react';
import type { User } from '@/types/dashboard-types';

interface CommentFormProps {
  sectionId: string;
  onAddComment: (sectionId: string, text: string) => void;
  activeUser: User;
}

export const CommentFormComponent: React.FC<CommentFormProps> = ({ sectionId, onAddComment, activeUser }) => {
  const [text, setText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddComment(sectionId, text);
    setText('');
  };

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex items-start gap-3">
      <img src={activeUser.avatar} alt={activeUser.name} className="w-10 h-10 rounded-full" />
      <div className="flex-1">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a comment..."
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
          rows={3}
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="mt-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
        >
          Post Comment
        </button>
      </div>
    </form>
  );
};
