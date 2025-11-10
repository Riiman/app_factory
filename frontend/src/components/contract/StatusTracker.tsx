
import React from 'react';
import type { Document } from '@/types/dashboard-types';
import { SignatoryStatus } from '@/types/dashboard-types';
import { CheckCircleIcon, ClockIcon } from './icons';

interface StatusTrackerProps {
  document: Document;
}

interface TimelineEvent {
  title: string;
  description: string;
  date: Date;
  isCompleted: boolean;
  isCurrent: boolean;
}

const StatusTracker: React.FC<StatusTrackerProps> = ({ document }) => {
  const generateTimelineEvents = (doc: Document): TimelineEvent[] => {
    const events: TimelineEvent[] = [];

    // Document Sent Event
    events.push({
      title: 'Document Sent',
      description: `Sent to ${doc.signatories.length} signatories.`,
      date: doc.sentOn,
      isCompleted: true,
      isCurrent: false,
    });

    // Signatory Events
    doc.signatories.forEach(s => {
      if (s.status === SignatoryStatus.SIGNED && s.signedOn) {
        events.push({
          title: `Signed by ${s.name}`,
          description: `Document was digitally signed.`,
          date: s.signedOn,
          isCompleted: true,
          isCurrent: false,
        });
      }
    });
    
    // Sort events by date
    events.sort((a, b) => a.date.getTime() - b.date.getTime());

    const isCompleted = doc.signatories.every(s => s.status === SignatoryStatus.SIGNED);

    // Add Current/Next Step
    if (!isCompleted) {
       const nextSignatory = doc.signatories.find(s => s.status !== SignatoryStatus.SIGNED);
       events.push({
        title: nextSignatory ? `Awaiting signature from ${nextSignatory.name}` : 'Awaiting Signatures',
        description: 'Next step in the signing process.',
        date: new Date(), 
        isCompleted: false,
        isCurrent: true,
      });
    } else {
        events.push({
            title: 'Completed',
            description: 'All parties have signed the document.',
            date: doc.completedOn || new Date(),
            isCompleted: true,
            isCurrent: false,
        });
    }
    
    return events;
  };

  const timelineEvents = generateTimelineEvents(document);

  return (
    <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200">
      <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-6">Activity</h2>
      <ol className="relative border-l border-slate-200">
        {timelineEvents.map((event, index) => (
          <li key={index} className="mb-8 ml-6">
            <span className={`absolute flex items-center justify-center w-6 h-6 rounded-full -left-3 ring-8 ring-white
              ${event.isCompleted ? 'bg-green-500' : event.isCurrent ? 'bg-blue-500' : 'bg-slate-300'}`}>
              {event.isCompleted ? <CheckCircleIcon className="w-6 h-6 text-white p-0.5" /> : event.isCurrent ? <ClockIcon className="w-6 h-6 text-white p-0.5" /> : null}
            </span>
            <h3 className="flex items-center mb-1 text-md font-semibold text-slate-900">{event.title}</h3>
            <time className="block mb-2 text-sm font-normal leading-none text-slate-400">
              {event.date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} at {event.date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </time>
            <p className="text-sm text-slate-500">{event.description}</p>
          </li>
        ))}
      </ol>
    </div>
  );
};

export default StatusTracker;
