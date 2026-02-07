import React, { useState } from 'react';
import { X, Calendar as CalendarIcon, Clock, MapPin, AlignLeft, Tag } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '@/utils/api';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { CalendarEvent } from '@/types/calendar-types';

interface CreateEventModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialDate?: Date;
    event?: CalendarEvent | null;
}

const CreateEventModal: React.FC<CreateEventModalProps> = ({ isOpen, onClose, onSuccess, initialDate, event }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        date: initialDate ? initialDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        startTime: '09:00',
        endTime: '10:00',
        type: 'MEETING',
        location: '',
        description: ''
    });
    const isInterview = event?.type === 'interview';

    const [selectedAttendees, setSelectedAttendees] = useState<number[]>([]);

    // Fetch team members
    // We need user context to get startup_id. 
    // Since this component might be used where useAuth is available, let's assume we can get it or pass startupId as prop.
    // For now, let's use a local query or passed prop. 
    // Better: let's use the same query as TeamCalendarPage.
    // NOTE: This component doesn't have useAuth hook usages currently shown, 
    // but usually we can import it.

    // Let's assume we need to import useAuth and useQuery


    const { user } = useAuth();
    const { data: teamMembers = [] } = useQuery({
        queryKey: ['team-members', user?.startup_id],
        queryFn: async () => {
            if (!user?.startup_id) return [];
            return api.getTeamMembers(user.startup_id);
        },
        enabled: !!user?.startup_id && isOpen, // Only fetch when modal is open
    });


    React.useEffect(() => {
        if (event && isOpen) {
            const startDate = new Date(event.start);
            const endDate = event.end ? new Date(event.end) : new Date(startDate.getTime() + 60 * 60 * 1000);

            // Format date as YYYY-MM-DD (local)
            const year = startDate.getFullYear();
            const month = String(startDate.getMonth() + 1).padStart(2, '0');
            const day = String(startDate.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;

            setFormData({
                title: event.title,
                date: dateStr,
                startTime: startDate.toTimeString().slice(0, 5),
                endTime: endDate.toTimeString().slice(0, 5),
                type: event.type.toUpperCase(),
                location: isInterview ? event.metadata?.meeting_link || '' : event.metadata?.location || '',
                description: isInterview ? event.metadata?.notes || '' : event.metadata?.description || ''
            });

            // Set attendees
            if (event.attendees) {
                setSelectedAttendees(event.attendees.map(a => a.id));
            } else if (event.metadata?.attendees) {
                setSelectedAttendees(event.metadata.attendees.map((a: any) => a.id));
            } else {
                setSelectedAttendees([]);
            }

        } else if (!event && isOpen) {
            // Reset for create mode
            setFormData({
                title: '',
                date: initialDate ? initialDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                startTime: '09:00',
                endTime: '10:00',
                type: 'MEETING',
                location: '',
                description: ''
            });
            setSelectedAttendees([]);
        }
    }, [event, isOpen, initialDate]);

    if (!isOpen) return null;

    const toggleAttendee = (userId: number) => {
        setSelectedAttendees(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Combine date and time
            const start = new Date(`${formData.date}T${formData.startTime}:00`).toISOString();
            const end = new Date(`${formData.date}T${formData.endTime}:00`).toISOString();

            if (event) {
                if (isInterview) {
                    // Update Interview
                    await api.updateInterview(event.source_id, {
                        scheduled_at: start,
                        meeting_link: formData.location,
                        notes: formData.description
                    });
                    toast.success('Interview updated successfully');
                } else {
                    // Update Manual Event
                    const payload = {
                        title: formData.title,
                        description: formData.description,
                        start,
                        end,
                        type: formData.type,
                        location: formData.location,
                        attendee_ids: selectedAttendees
                    };
                    await api.updateEvent(event.source_id, payload);
                    toast.success('Event updated successfully');
                }
            } else {
                // Create new event
                const payload = {
                    title: formData.title,
                    description: formData.description,
                    start,
                    end,
                    type: formData.type,
                    location: formData.location,
                    attendee_ids: selectedAttendees
                };
                await api.createEvent(payload);
                toast.success('Event created successfully');
            }

            onSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            toast.error(event ? 'Failed to update event' : 'Failed to create event');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-4 border-b bg-gray-50 sticky top-0 z-10">
                    <h2 className="text-lg font-semibold text-gray-900">
                        {event ? (isInterview ? 'Reschedule Interview' : 'Edit Event') : 'Create New Event'}
                    </h2>
                    <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Event Title</label>
                        <input
                            type="text"
                            required
                            disabled={isInterview}
                            className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isInterview ? 'bg-gray-100' : ''}`}
                            placeholder="e.g., Weekly Team Sync"
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                            <div className="relative">
                                <CalendarIcon className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                <input
                                    type="date"
                                    required
                                    className="w-full pl-9 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    value={formData.date}
                                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                            <div className="relative">
                                <Tag className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                <select
                                    className={`w-full pl-9 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isInterview ? 'bg-gray-100' : ''}`}
                                    value={formData.type}
                                    disabled={isInterview}
                                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                                >
                                    <option value="MEETING">Meeting</option>
                                    <option value="REMINDER">Reminder</option>
                                    <option value="BLOCKER">Blocker</option>
                                    <option value="OTHER">Other</option>
                                    <option value="INTERVIEW">Interview</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                            <div className="relative">
                                <Clock className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                <input
                                    type="time"
                                    required
                                    className="w-full pl-9 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    value={formData.startTime}
                                    onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                            <div className="relative">
                                <Clock className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                <input
                                    type="time"
                                    required
                                    className="w-full pl-9 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    value={formData.endTime}
                                    onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {isInterview ? 'Meeting Link' : 'Location (Optional)'}
                        </label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                className="w-full pl-9 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder={isInterview ? "https://meet.google.com/..." : "Zoom link or Room 302"}
                                value={formData.location}
                                onChange={e => setFormData({ ...formData, location: e.target.value })}
                            />
                        </div>
                    </div>

                    {!isInterview && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Invite Team Members</label>
                            <div className="border border-gray-300 rounded-lg max-h-32 overflow-y-auto divide-y divide-gray-100">
                                {teamMembers.length === 0 && (
                                    <div className="p-2 text-sm text-gray-500">No team members found.</div>
                                )}
                                {teamMembers.map((member: any) => (
                                    <div
                                        key={member.user_id}
                                        className={`flex items-center p-2 cursor-pointer hover:bg-gray-50 ${selectedAttendees.includes(member.user_id) ? 'bg-blue-50' : ''}`}
                                        onClick={() => toggleAttendee(member.user_id)}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedAttendees.includes(member.user_id)}
                                            onChange={() => { }} // handled by div click
                                            className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 mr-2"
                                        />
                                        <span className="text-sm text-gray-700">
                                            {member.user_name || member.user_email}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Select team members to invite.</p>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {isInterview ? 'Notes' : 'Description (Optional)'}
                        </label>
                        <div className="relative">
                            <AlignLeft className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                            <textarea
                                className="w-full pl-9 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[80px]"
                                placeholder="Add specific details..."
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end space-x-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center"
                        >
                            {loading ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Saving...
                                </>
                            ) : (
                                event ? 'Save Changes' : 'Create Event'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateEventModal;
