import React, { useMemo } from 'react';
import { X, Clock } from 'lucide-react';
import { CalendarEvent } from '@/types/calendar-types';

interface DayViewModalProps {
    isOpen: boolean;
    onClose: () => void;
    date: Date | null;
    events: CalendarEvent[];
    onEventClick: (event: CalendarEvent) => void;
}

const DayViewModal: React.FC<DayViewModalProps> = ({
    isOpen,
    onClose,
    date,
    events,
    onEventClick
}) => {
    if (!isOpen || !date) return null;

    // Filter events for this specific date
    const dayEvents = useMemo(() => {
        return events.filter(event => {
            const eventDate = new Date(event.start);
            return (
                eventDate.getDate() === date.getDate() &&
                eventDate.getMonth() === date.getMonth() &&
                eventDate.getFullYear() === date.getFullYear()
            );
        }).sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    }, [events, date]);

    // Generate hours (6 AM to 10 PM usually covers most, but let's do full day or 8-20)
    // Let's do 24 hours but scroll to 8 AM
    const hours = Array.from({ length: 24 }, (_, i) => i);

    const getEventsForHour = (hour: number) => {
        return dayEvents.filter(event => {
            const eventDate = new Date(event.start);
            return eventDate.getHours() === hour;
        });
    };

    const EVENT_COLORS = {
        interview: 'bg-blue-100 border-l-4 border-blue-500 text-blue-900',
        meeting: 'bg-green-100 border-l-4 border-green-500 text-green-900',
        deadline: 'bg-yellow-100 border-l-4 border-yellow-500 text-yellow-900',
        content: 'bg-purple-100 border-l-4 border-purple-500 text-purple-900',
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-hidden">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col mx-4">
                {/* Header */}
                <div className="p-4 border-b flex items-center justify-between bg-gray-50 rounded-t-xl">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">
                            {date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                        </h2>
                        <p className="text-sm text-gray-500">Hourly Schedule</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Hourly Grid */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    <div className="space-y-4">
                        {hours.map(hour => {
                            const hourEvents = getEventsForHour(hour);
                            const isBusinessHour = hour >= 8 && hour <= 19;

                            return (
                                <div key={hour} className={`flex group ${!isBusinessHour && hourEvents.length === 0 ? 'hidden' : ''}`}>
                                    {/* Time Column */}
                                    <div className="w-20 flex-shrink-0 text-right pr-4">
                                        <span className="text-sm font-medium text-gray-500">
                                            {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                                        </span>
                                    </div>

                                    {/* Event Column */}
                                    <div className="flex-1 min-h-[50px] border-t border-gray-100 relative pb-2">
                                        {/* Horizontal line */}
                                        <div className="absolute top-0 left-0 w-full h-px bg-gray-100 group-hover:bg-gray-200"></div>

                                        {/* Events in this hour */}
                                        <div className="space-y-2 mt-2">
                                            {hourEvents.map(event => (
                                                <div
                                                    key={event.id}
                                                    onClick={() => onEventClick(event)}
                                                    className={`p-3 rounded-lg cursor-pointer hover:shadow-md transition-shadow ${EVENT_COLORS[event.type] || 'bg-gray-100 border-l-4 border-gray-500'}`}
                                                >
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-xs font-semibold uppercase tracking-wider opacity-75">
                                                            {event.type}
                                                        </span>
                                                        <div className="flex items-center text-xs opacity-75">
                                                            <Clock className="w-3 h-3 mr-1" />
                                                            {new Date(event.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                    </div>
                                                    <h3 className="font-semibold text-sm leading-tight">{event.title}</h3>
                                                    {event.type === 'interview' && event.metadata && (
                                                        <div className="mt-1 text-xs opacity-80">
                                                            With: {event.metadata.candidate_name}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {/* Show message if no events are shown (i.e. empty day) */}
                        {dayEvents.length === 0 && (
                            <div className="text-center py-12 text-gray-500">
                                <p>No events scheduled for this day.</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-4 border-t bg-gray-50 rounded-b-xl flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DayViewModal;
