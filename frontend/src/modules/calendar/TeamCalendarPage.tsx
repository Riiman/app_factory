import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users } from 'lucide-react';
import Calendar from '@/components/Calendar';
import DayViewModal from './DayViewModal';
import { CalendarEvent } from '@/types/calendar-types';
import api from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';

const TeamCalendarPage: React.FC = () => {
    const { user } = useAuth();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedUserId, setSelectedUserId] = useState<number | 'all'>('all');

    // Fetch team members
    const { data: teamMembers = [] } = useQuery({
        queryKey: ['team-members', user?.startup_id],
        queryFn: async () => {
            if (!user?.startup_id) return [];
            return api.getTeamMembers(user.startup_id);
        },
        enabled: !!user?.startup_id,
    });

    // Calculate date range for current month
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    // Permission check
    const hasTeamScope = user?.scopes?.includes('TEAM');
    const isAdmin = user?.role === 'ADMIN' || user?.role === 'admin';
    const canViewCalendar = hasTeamScope || isAdmin;

    // Fetch calendar events
    const { data, isLoading } = useQuery({
        queryKey: ['team-calendar-events', currentDate.getMonth(), currentDate.getFullYear(), selectedUserId],
        queryFn: async () => {
            const params = {
                start: startOfMonth.toISOString(),
                end: endOfMonth.toISOString(),
            };

            if (selectedUserId === 'all') {
                return await api.getTeamCalendarEvents(params);
            } else {
                return await api.getCalendarEvents({
                    ...params,
                    user_id: selectedUserId as number,
                });
            }
        },
        enabled: !!user?.id && canViewCalendar,
    });

    const events: CalendarEvent[] = data?.events || [];

    const handleEventClick = (event: CalendarEvent) => {
        setSelectedEvent(event);
    };

    const handleDayClick = (date: Date) => {
        setSelectedDate(date);
    };

    // Permission check render
    if (!user || !canViewCalendar) {
        return (
            <div className="p-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-yellow-800">
                        You don't have permission to view the team calendar. This feature is only available to team members with appropriate permissions.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
                <div className="flex items-center space-x-3">
                    <Users className="w-6 h-6 text-blue-600" />
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Team Calendar</h1>
                        <p className="text-sm text-gray-600 mt-1">View your team's schedule</p>
                    </div>
                </div>

                {/* Team Member Filter */}
                <div className="w-full sm:w-64">
                    <select
                        value={selectedUserId}
                        onChange={(e) => {
                            const val = e.target.value;
                            setSelectedUserId(val === 'all' ? 'all' : parseInt(val));
                        }}
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="all">All Team Members</option>
                        {teamMembers.map((member: any) => (
                            <option key={member.id} value={member.user_id}>
                                {member.user_name || member.user_email} {member.role ? `(${member.role})` : ''}
                            </option>
                        ))}
                    </select>
                </div>
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
            </div>

            <Calendar
                userId={0}
                context="team"
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

            {/* Event Detail Modal */}
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

                            {/* Show user name for team view */}
                            {selectedEvent.metadata?.user_name && (
                                <div>
                                    <span className="font-medium text-gray-700">Team Member:</span>{' '}
                                    <span className="text-gray-600">{selectedEvent.metadata.user_name}</span>
                                </div>
                            )}

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
                                        window.location.hash = `#recruitment-app-${selectedEvent.metadata.application_id}`;
                                    }}
                                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    View Candidate Details
                                </button>
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

export default TeamCalendarPage;
