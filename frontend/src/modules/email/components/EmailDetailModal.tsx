import React from 'react';
import { X } from 'lucide-react';
import { EmailMessage } from '@/types/email';

interface EmailDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    message: EmailMessage | null;
    onReply?: (message: EmailMessage) => void;
}

import ReactDOM from 'react-dom';

const EmailDetailModal: React.FC<EmailDetailModalProps> = ({ isOpen, onClose, message, onReply }) => {
    if (!isOpen || !message) return null;

    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 text-center sm:p-0">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75" aria-hidden="true" onClick={onClose}></div>

                <div className="relative z-[9999] flex flex-col w-full max-w-4xl max-h-[85vh] bg-white rounded-lg shadow-xl overflow-hidden text-left my-8">
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

                    <div className="flex-1 overflow-y-auto p-6">
                        <div className="sm:flex sm:items-start">
                            <div className="mt-3 sm:mt-0 sm:text-left w-full">
                                <h3 className="text-xl leading-8 font-semibold text-gray-900 mb-2" id="modal-title">
                                    {message.subject}
                                </h3>

                                <div className="flex justify-between items-center text-sm text-gray-500 mb-6 pb-4 border-b border-gray-100">
                                    <div>
                                        <span className="font-medium text-gray-900">From:</span> {message.from}
                                    </div>
                                    <div>
                                        {message.date}
                                    </div>
                                </div>

                                <div className="mt-4 prose prose-sm max-w-none text-gray-700">
                                    {/*  
                                        Prefer HTML content if available, otherwise just text. 
                                        NOTE: In a real app, sanitize this HTML!
                                    */}
                                    {message.body_html ? (
                                        <div dangerouslySetInnerHTML={{ __html: message.body_html }} />
                                    ) : (
                                        <div className="whitespace-pre-wrap font-sans">{message.body_text || message.snippet}</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-2 border-t border-gray-200">
                        <button
                            type="button"
                            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-brand-600 text-base font-medium text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 sm:w-auto sm:text-sm"
                            onClick={() => onReply && onReply(message)}
                        >
                            Reply
                        </button>
                        <button
                            type="button"
                            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 sm:mt-0 sm:w-auto sm:text-sm"
                            onClick={onClose}
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default EmailDetailModal;
