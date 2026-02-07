import React, { useMemo } from 'react';
import { CalendarEvent, CalendarFilters, CalendarContext } from '@/types/calendar-types';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarProps {
    userId: number;
    context: CalendarContext;
    events: CalendarEvent[];
    filters?: CalendarFilters;
    canSwitchUsers?: boolean;
    currentDate: Date;
    onDateChange: (date: Date) => void;
    onEventClick: (event: CalendarEvent) => void;
    onDayClick?: (date: Date) => void;
    loading?: boolean;
}

const EVENT_COLORS = {
    interview: 'bg-blue-100 border-blue-500 text-blue-900',
    meeting: 'bg-green-100 border-green-500 text-green-900',
    deadline: 'bg-yellow-100 border-yellow-500 text-yellow-900',
    content: 'bg-purple-100 border-purple-500 text-purple-900',
    launch: 'bg-pink-100 border-pink-500 text-pink-900',
};

const Calendar: React.FC<CalendarProps> = ({
    events,
    currentDate,
    onDateChange,
    onEventClick,
    onDayClick,
    loading = false,
}) => {
    // Generate calendar grid
    const calendarDays = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        // First day of month
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        // Start from Sunday of the week containing the first day
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - startDate.getDay());

        // End on Saturday of the week containing the last day
        const endDate = new Date(lastDay);
        endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

        const days: Date[] = [];
        const current = new Date(startDate);

        while (current <= endDate) {
            days.push(new Date(current));
            current.setDate(current.getDate() + 1);
        }

        return days;
    }, [currentDate]);

    // Group events by date
    const eventsByDate = useMemo(() => {
        const grouped: Record<string, CalendarEvent[]> = {};

        events.forEach(event => {
            const date = new Date(event.start);
            const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

            if (!grouped[dateKey]) {
                grouped[dateKey] = [];
            }
            grouped[dateKey].push(event);
        });

        return grouped;
    }, [events]);

    const getDayKey = (date: Date) => {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    };

    const isToday = (date: Date) => {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    };

    const isCurrentMonth = (date: Date) => {
        return date.getMonth() === currentDate.getMonth();
    };

    const previousMonth = () => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() - 1);
        onDateChange(newDate);
    };

    const nextMonth = () => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() + 1);
        onDateChange(newDate);
    };

    const monthYear = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    return (
        <div className="bg-white rounded-lg shadow">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-lg font-semibold text-gray-900">{monthYear}</h2>
                <div className="flex items-center space-x-2">
                    <button
                        onClick={previousMonth}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <button
                        onClick={nextMonth}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <ChevronRight className="w-5 h-5 text-gray-600" />
                    </button>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="p-4">
                {/* Day headers */}
                <div className="grid grid-cols-7 gap-2 mb-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Calendar days */}
                <div className="grid grid-cols-7 gap-2">
                    {calendarDays.map((date, index) => {
                        const dayKey = getDayKey(date);
                        const dayEvents = eventsByDate[dayKey] || [];
                        const isTodayDate = isToday(date);
                        const isCurrentMonthDate = isCurrentMonth(date);

                        return (
                            <div
                                key={index}
                                onClick={() => onDayClick?.(date)}
                                className={`min-h-[100px] p-2 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${isTodayDate ? 'bg-blue-50 border-blue-300' : 'border-gray-200'
                                    } ${!isCurrentMonthDate ? 'bg-gray-50' : ''}`}
                            >
                                <div className={`text-sm font-medium mb-1 ${isTodayDate ? 'text-blue-600' : isCurrentMonthDate ? 'text-gray-900' : 'text-gray-400'
                                    }`}>
                                    {date.getDate()}
                                </div>

                                {/* Events */}
                                <div className="space-y-1">
                                    {dayEvents.slice(0, 3).map(event => (
                                        <button
                                            key={event.id}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onEventClick(event);
                                            }}
                                            className={`w-full text-left px-2 py-1 rounded text-xs border-l-2 ${EVENT_COLORS[event.type]} hover:opacity-80 transition-opacity`}
                                        >
                                            <div className="truncate font-medium">{event.title}</div>
                                        </button>
                                    ))}
                                    {dayEvents.length > 3 && (
                                        <div className="text-xs text-gray-500 px-2">
                                            +{dayEvents.length - 3} more
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {loading && (
                <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            )}
        </div>
    );
};

export default Calendar;
