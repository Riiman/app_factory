
import React from 'react';
import type { Comment } from '../types';
import { Role } from '../types';

interface CommentProps {
  comment: Comment;
}

export const CommentComponent: React.FC<CommentProps> = ({ comment }) => {
  const isAdmin = comment.author.role === Role.ADMIN;
  
  const bubbleClasses = isAdmin
    ? 'bg-blue-100 text-blue-900'
    : 'bg-gray-100 text-gray-800';
    
  const alignmentClasses = isAdmin ? 'justify-end' : 'justify-start';

  return (
    <div className={`flex items-start gap-3 ${alignmentClasses}`}>
      {!isAdmin && <img src={comment.author.avatar} alt={comment.author.name} className="w-10 h-10 rounded-full" />}
      <div className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <span className="text-xs text-gray-500">{comment.timestamp}</span>
          )}
          <span className="font-semibold text-sm">{comment.author.name}</span>
           {!isAdmin && (
            <span className="text-xs text-gray-500">{comment.timestamp}</span>
          )}
        </div>
        <div className={`mt-1 p-3 rounded-lg max-w-md ${bubbleClasses}`}>
          <p className="text-sm">{comment.text}</p>
        </div>
      </div>
       {isAdmin && <img src={comment.author.avatar} alt={comment.author.name} className="w-10 h-10 rounded-full" />}
    </div>
  );
};
