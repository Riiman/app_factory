import React, { useState } from 'react';
import { X, Send } from 'lucide-react';
import { emailService } from '@/services/emailService';
import { toast } from 'react-hot-toast';

interface ComposeEmailModalProps {
    isOpen: boolean;
    onClose: () => void;
    integrationId: number | null;
    initialTo?: string;
    initialSubject?: string;
    initialBody?: string;
}

import ReactDOM from 'react-dom';

// ... (props interface remains same)

const ComposeEmailModal: React.FC<ComposeEmailModalProps> = ({
    isOpen,
    onClose,
    integrationId,
    initialTo = '',
    initialSubject = '',
    initialBody = ''
}) => {
    // ... (state and logic remains same)
    const [to, setTo] = useState(initialTo);
    const [subject, setSubject] = useState(initialSubject);
    const [body, setBody] = useState(initialBody);
    const [isSending, setIsSending] = useState(false);

    // Reset or update form when modal opens or props change
    React.useEffect(() => {
        if (isOpen) {
            setTo(initialTo);
            setSubject(initialSubject);
            setBody(initialBody);
        }
    }, [isOpen, initialTo, initialSubject, initialBody]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!integrationId) {
            toast.error('No email account selected');
            return;
        }

        setIsSending(true);
        try {
            await emailService.sendEmail({
                integration_id: integrationId,
                to,
                subject,
                body
            });
            toast.success('Email sent successfully');
            setTo('');
            setSubject('');
            setBody('');
            onClose();
        } catch (error: any) {
            console.error('Failed to send email:', error);
            toast.error(error.message || 'Failed to send email');
        } finally {
            setIsSending(false);
        }
    };

    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 text-center sm:p-0">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75" aria-hidden="true" onClick={onClose}></div>

                <div className="relative z-[9999] w-full max-w-lg bg-white rounded-lg shadow-xl overflow-hidden text-left my-8">
                    <div className="absolute top-0 right-0 pt-4 pr-4">
                        <button
                            type="button"
                            className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500"
                            onClick={onClose}
                        >
                            <span className="sr-only">Close</span>
                            <X className="h-6 w-6" aria-hidden="true" />
                        </button>
                    </div>
                    <div className="p-6">
                        <div className="sm:flex sm:items-start">
                            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                                    Compose Email
                                </h3>
                                <div className="mt-4">
                                    <form onSubmit={handleSubmit} className="space-y-4">
                                        <div>
                                            <label htmlFor="to" className="block text-sm font-medium text-gray-700">
                                                To
                                            </label>
                                            <input
                                                type="email"
                                                name="to"
                                                id="to"
                                                required
                                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
                                                value={to}
                                                onChange={(e) => setTo(e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="subject" className="block text-sm font-medium text-gray-700">
                                                Subject
                                            </label>
                                            <input
                                                type="text"
                                                name="subject"
                                                id="subject"
                                                required
                                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
                                                value={subject}
                                                onChange={(e) => setSubject(e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="body" className="block text-sm font-medium text-gray-700">
                                                Message
                                            </label>
                                            <textarea
                                                id="body"
                                                name="body"
                                                rows={6}
                                                required
                                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
                                                value={body}
                                                onChange={(e) => setBody(e.target.value)}
                                            />
                                        </div>
                                        <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                                            <button
                                                type="submit"
                                                disabled={isSending}
                                                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-brand-600 text-base font-medium text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                                            >
                                                {isSending ? 'Sending...' : (
                                                    <>
                                                        <Send className="mr-2 h-4 w-4" /> Send
                                                    </>
                                                )}
                                            </button>
                                            <button
                                                type="button"
                                                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 sm:mt-0 sm:w-auto sm:text-sm"
                                                onClick={onClose}
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ComposeEmailModal;
