import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Calendar, Clock, Link as LinkIcon, User, FileText } from 'lucide-react';
import api from '@/utils/api';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';

interface ScheduleInterviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    applicationId: number;
    candidateName: string;
    jobTitle: string;
    onSuccess?: () => void;
}

const ScheduleInterviewModal: React.FC<ScheduleInterviewModalProps> = ({
    isOpen,
    onClose,
    applicationId,
    candidateName,
    jobTitle,
    onSuccess
}) => {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const [formData, setFormData] = useState({
        date: '',
        time: '',
        meetingLink: '',
        notes: ''
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    const scheduleInterviewMutation = useMutation({
        mutationFn: async (data: any) => {
            return await api.scheduleInterview(applicationId, data);
        },
        onSuccess: () => {
            toast.success('Interview scheduled successfully!');
            queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
            queryClient.invalidateQueries({ queryKey: ['recruitment-analytics'] });
            queryClient.invalidateQueries({ queryKey: ['job-applications'] });
            onSuccess?.();
            handleClose();
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Failed to schedule interview');
        }
    });

    const handleClose = () => {
        setFormData({ date: '', time: '', meetingLink: '', notes: '' });
        setErrors({});
        onClose();
    };

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.date) {
            newErrors.date = 'Date is required';
        } else {
            const selectedDate = new Date(formData.date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (selectedDate < today) {
                newErrors.date = 'Date must be in the future';
            }
        }

        if (!formData.time) {
            newErrors.time = 'Time is required';
        }

        // Optional: Validate meeting link format
        if (formData.meetingLink && !formData.meetingLink.startsWith('http')) {
            newErrors.meetingLink = 'Please enter a valid URL';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        // Combine date and time into ISO datetime
        const scheduledAt = new Date(`${formData.date}T${formData.time}`).toISOString();

        scheduleInterviewMutation.mutate({
            scheduled_at: scheduledAt,
            interviewer_id: user?.id,
            meeting_link: formData.meetingLink || null,
            notes: formData.notes || null
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">Schedule Interview</h2>
                        <p className="text-sm text-gray-600 mt-1">
                            {candidateName} • {jobTitle}
                        </p>
                    </div>
                    <button
                        onClick={handleClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Date Input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            <Calendar className="w-4 h-4 inline mr-1" />
                            Date *
                        </label>
                        <input
                            type="date"
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.date ? 'border-red-500' : 'border-gray-300'
                                }`}
                            min={new Date().toISOString().split('T')[0]}
                        />
                        {errors.date && (
                            <p className="text-red-500 text-xs mt-1">{errors.date}</p>
                        )}
                    </div>

                    {/* Time Input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            <Clock className="w-4 h-4 inline mr-1" />
                            Time *
                        </label>
                        <input
                            type="time"
                            value={formData.time}
                            onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.time ? 'border-red-500' : 'border-gray-300'
                                }`}
                        />
                        {errors.time && (
                            <p className="text-red-500 text-xs mt-1">{errors.time}</p>
                        )}
                    </div>

                    {/* Meeting Link */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            <LinkIcon className="w-4 h-4 inline mr-1" />
                            Meeting Link
                        </label>
                        <input
                            type="url"
                            value={formData.meetingLink}
                            onChange={(e) => setFormData({ ...formData, meetingLink: e.target.value })}
                            placeholder="https://meet.google.com/..."
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.meetingLink ? 'border-red-500' : 'border-gray-300'
                                }`}
                        />
                        {errors.meetingLink && (
                            <p className="text-red-500 text-xs mt-1">{errors.meetingLink}</p>
                        )}
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            <FileText className="w-4 h-4 inline mr-1" />
                            Notes
                        </label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            placeholder="Interview focus areas, topics to cover..."
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    {/* Interviewer Info */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-sm text-gray-700">
                            <User className="w-4 h-4 inline mr-1" />
                            <span className="font-medium">Interviewer:</span> {user?.full_name || 'You'}
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex space-x-3 pt-4">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={scheduleInterviewMutation.isPending}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {scheduleInterviewMutation.isPending ? 'Scheduling...' : 'Schedule Interview'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ScheduleInterviewModal;
