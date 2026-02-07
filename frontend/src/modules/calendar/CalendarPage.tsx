import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import Calendar from '@/components/Calendar';
import DayViewModal from './DayViewModal';
import CreateEventModal from './CreateEventModal';
import { CalendarEvent } from '@/types/calendar-types';
import api from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import { Plus } from 'lucide-react';

interface CalendarPageProps {
    title?: string;
    subtitle?: string;
    modules?: string[];
}

const CalendarPage: React.FC<CalendarPageProps> = ({
    title = "My Calendar",
    subtitle = "View and manage your schedule",
    modules
}) => {
    const { user } = useAuth();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

    // Calculate date range for current month
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    // Fetch calendar events
    const { data, isLoading, refetch } = useQuery({
        queryKey: ['calendar-events', user?.id, currentDate.getMonth(), currentDate.getFullYear(), modules],
        queryFn: async () => {
            const response = await api.getCalendarEvents({
                start: startOfMonth.toISOString(),
                end: endOfMonth.toISOString(),
                modules: modules
            });
            return response;
        },
        enabled: !!user?.id,
    });

    const events: CalendarEvent[] = data?.events || [];

    const handleEventClick = (event: CalendarEvent) => {
        setSelectedEvent(event);
    };

    const handleDayClick = (date: Date) => {
        setSelectedDate(date);
    };

    const handleEditEvent = () => {
        if (selectedEvent) {
            setEditingEvent(selectedEvent);
            setIsCreateModalOpen(true);
            setSelectedEvent(null);
        }
    };

    const handleDeleteEvent = async () => {
        if (!selectedEvent) return;

        const isInterview = selectedEvent.type === 'interview';
        const confirmMsg = isInterview
            ? 'Are you sure you want to cancel this interview?'
            : 'Are you sure you want to delete this event?';

        if (!window.confirm(confirmMsg)) return;

        try {
            if (isInterview) {
                await api.deleteInterview(selectedEvent.source_id);
                toast.success('Interview cancelled');
            } else {
                await api.deleteEvent(selectedEvent.source_id);
                toast.success('Event deleted');
            }
            setSelectedEvent(null);
            refetch();
        } catch (error) {
            console.error(error);
            toast.error('Failed to delete event');
        }
    };

    return (
        <div className="p-6">
            <div className="mb-6 flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
                    <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    <span>Create Event</span>
                </button>
            </div>

            {/* Event Type Legend */}
            <div className="mb-4 flex items-center space-x-4 text-sm">
                <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-blue-500 rounded"></div>
                    <span className="text-gray-700">Interviews</span>
                </div>
                <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded"></div>
                    <span className="text-gray-700">Meetings</span>
                </div>
                <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                    <span className="text-gray-700">Deadlines</span>
                </div>
                <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-purple-500 rounded"></div>
                    <span className="text-gray-700">Content</span>
                </div>
                <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-pink-500 rounded"></div>
                    <span className="text-gray-700">Launches</span>
                </div>
            </div>

            <Calendar
                userId={user?.id || 0}
                context="personal"
                events={events}
                currentDate={currentDate}
                onDateChange={setCurrentDate}
                onEventClick={handleEventClick}
                onDayClick={handleDayClick}
                loading={isLoading}
            />

            {/* Day View Modal */}
            <DayViewModal
                isOpen={!!selectedDate}
                onClose={() => setSelectedDate(null)}
                date={selectedDate}
                events={events}
                onEventClick={(event) => {
                    setSelectedDate(null); // Close day view to show event detail
                    handleEventClick(event);
                }}
            />

            <CreateEventModal
                isOpen={isCreateModalOpen}
                onClose={() => {
                    setIsCreateModalOpen(false);
                    setEditingEvent(null);
                }}
                onSuccess={() => refetch()}
                initialDate={currentDate}
                event={editingEvent}
            />

            {/* Event Detail Modal (Simple for now) */}
            {selectedEvent && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">{selectedEvent.title}</h3>

                        <div className="space-y-2 text-sm">
                            <div>
                                <span className="font-medium text-gray-700">Type:</span>{' '}
                                <span className="text-gray-600 capitalize">{selectedEvent.type}</span>
                            </div>
                            <div>
                                <span className="font-medium text-gray-700">Date:</span>{' '}
                                <span className="text-gray-600">
                                    {new Date(selectedEvent.start).toLocaleString()}
                                </span>
                            </div>

                            {selectedEvent.type === 'interview' && selectedEvent.metadata && (
                                <>
                                    <div>
                                        <span className="font-medium text-gray-700">Candidate:</span>{' '}
                                        <span className="text-gray-600">{selectedEvent.metadata.candidate_name}</span>
                                    </div>
                                    <div>
                                        <span className="font-medium text-gray-700">Position:</span>{' '}
                                        <span className="text-gray-600">{selectedEvent.metadata.job_title}</span>
                                    </div>
                                    {selectedEvent.metadata.meeting_link && (
                                        <div>
                                            <a
                                                href={selectedEvent.metadata.meeting_link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-600 hover:text-blue-700 underline"
                                            >
                                                Join Meeting
                                            </a>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="mt-6 space-y-2">
                            {selectedEvent.type === 'interview' && selectedEvent.metadata?.application_id && (
                                <button
                                    onClick={() => {
                                        setSelectedEvent(null);
                                        // Use new hash format: #recruitment-job-<jobId>-app-<appId>
                                        window.location.hash = `#recruitment-job-${selectedEvent.metadata.job_id}-app-${selectedEvent.metadata.application_id}`;
                                    }}
                                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    View Candidate Details
                                </button>
                            )}

                            {(selectedEvent.source_module === 'manual' || selectedEvent.type === 'interview') && (
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={handleEditEvent}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                        {selectedEvent.type === 'interview' ? 'Reschedule' : 'Edit'}
                                    </button>
                                    <button
                                        onClick={handleDeleteEvent}
                                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                    >
                                        {selectedEvent.type === 'interview' ? 'Cancel' : 'Delete'}
                                    </button>
                                </div>
                            )}

                            <button
                                onClick={() => setSelectedEvent(null)}
                                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CalendarPage;
