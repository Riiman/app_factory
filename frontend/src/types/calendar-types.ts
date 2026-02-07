// Calendar module types
export interface CalendarEvent {
    id: string;
    type: 'interview' | 'meeting' | 'deadline' | 'content' | 'launch';
    source_module: 'recruitment' | 'marketing' | 'tasks' | 'general' | 'manual';
    source_id: number;
    title: string;
    start: string; // ISO datetime
    end?: string | null;
    all_day: boolean;
    user_id?: number;
    user_name?: string;
    metadata: Record<string, any>;
    attendees?: { id: number; name: string; email: string }[];
}

export interface InterviewEventMetadata {
    candidate_name?: string;
    candidate_id?: number;
    job_title?: string;
    job_id?: number;
    application_id?: number;
    meeting_link?: string;
    status?: string;
    notes?: string;
}

export interface CalendarFilters {
    types?: ('interview' | 'meeting' | 'deadline' | 'content')[];
    modules?: ('recruitment' | 'marketing' | 'tasks' | 'general' | 'manual')[];
}

export type CalendarContext = 'personal' | 'team' | 'recruitment' | 'marketing';

export type CalendarView = 'month' | 'week' | 'day';
