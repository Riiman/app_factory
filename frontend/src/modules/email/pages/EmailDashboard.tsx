import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { emailService } from '@/services/emailService';
import EmailConnect from '@/modules/email/components/EmailConnect';
import ComposeEmailModal from '@/modules/email/components/ComposeEmailModal';
import EmailDetailModal from '@/modules/email/components/EmailDetailModal';
import { toast } from 'react-hot-toast';
import { EmailAccount, EmailMessage } from '@/types/email';
import { Folder, Mail, RefreshCw, Send, Trash2 } from 'lucide-react';


const EmailDashboard: React.FC = () => {
    const [selectedFolder, setSelectedFolder] = useState<string>('INBOX');
    const [selectedAccount, setSelectedAccount] = useState<number | null>(null);
    const [page, setPage] = useState<number>(1);
    const LIMIT = 20;

    // Modal States
    const [isComposeOpen, setIsComposeOpen] = useState(false);
    const [selectedMessage, setSelectedMessage] = useState<EmailMessage | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    // Reply State
    const [composeData, setComposeData] = useState<{ to: string; subject: string; body: string } | undefined>(undefined);

    // Fetch Accounts
    const { data: accounts, isLoading: accountsLoading, refetch: refetchAccounts } = useQuery<EmailAccount[]>({
        queryKey: ['emailAccounts'],
        queryFn: emailService.listAccounts,
    });

    useEffect(() => {
        if (accounts && accounts.length > 0 && !selectedAccount) {
            setSelectedAccount(accounts[0].id);
        }
    }, [accounts, selectedAccount]);

    // Fetch Folders
    const { data: folders, isLoading: foldersLoading } = useQuery<string[]>({
        queryKey: ['emailFolders', selectedAccount],
        queryFn: () => emailService.getFolders(selectedAccount!),
        enabled: !!selectedAccount
    });

    // Fetch Messages
    const { data: messages, isLoading: messagesLoading, refetch: refetchMessages } = useQuery<EmailMessage[]>({
        queryKey: ['emailMessages', selectedAccount, selectedFolder, page],
        queryFn: () => emailService.getMessages(selectedAccount!, selectedFolder, page, LIMIT),
        enabled: !!selectedAccount && !!selectedFolder
    });

    if (accountsLoading) return <div className="p-8 text-center text-gray-500">Loading accounts...</div>;

    if (!accounts || accounts.length === 0) {
        return <EmailConnect onConnected={refetchAccounts} />;
    }

    const handleMessageClick = (msg: EmailMessage) => {
        setSelectedMessage(msg);
        setIsDetailOpen(true);
    };

    const handleCloseDetail = () => {
        setIsDetailOpen(false);
        setSelectedMessage(null);
    };

    const handleReply = (msg: EmailMessage) => {
        const replySubject = msg.subject.startsWith('Re:') ? msg.subject : `Re: ${msg.subject}`;

        // Extract plain text body for quote
        const replyBody = `\n\n\nOn ${msg.date}, ${msg.from} wrote:\n> ${(msg.body_text || msg.snippet || '').replace(/\n/g, '\n> ')
            }`;

        setComposeData({
            to: msg.from, // Ideally parse email from "Name <email>" string if needed, but for now just use the string
            subject: replySubject,
            body: replyBody
        });

        setIsDetailOpen(false);
        setIsComposeOpen(true);
    };

    const openCompose = () => {
        setComposeData(undefined); // Reset for new email
        setIsComposeOpen(true);
    };

    return (
        <div className="flex h-full bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden relative">
            {/* Sidebar: Accounts & Folders */}
            <div className="w-64 border-r border-gray-200 bg-gray-50 flex flex-col">
                <div className="p-4 border-b border-gray-200">
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Accounts</h3>
                    <div className="space-y-2">
                        {accounts.map(account => (
                            <button
                                key={account.id}
                                onClick={() => setSelectedAccount(account.id)}
                                className={`w-full flex items-center px-2 py-2 text-sm font-medium rounded-md ${selectedAccount === account.id ? 'bg-white shadow-sm text-brand-600' : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                            >
                                <div className="flex-1 flex items-center min-w-0">
                                    <div className="w-2 h-2 rounded-full bg-green-400 mr-2 flex-shrink-0"></div>
                                    <span className="truncate">{account.email_address}</span>
                                </div>
                                <div
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (confirm('Are you sure you want to disconnect this email account?')) {
                                            emailService.disconnectAccount(account.id)
                                                .then(() => {
                                                    toast.success('Account disconnected');
                                                    refetchAccounts();
                                                    if (selectedAccount === account.id) {
                                                        setSelectedAccount(null);
                                                    }
                                                })
                                                .catch(() => toast.error('Failed to disconnect'));
                                        }
                                    }}
                                    className="ml-2 p-1 text-gray-400 hover:text-red-500 rounded-full hover:bg-red-50"
                                >
                                    <Trash2 size={12} />
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Folders</h3>
                        <button onClick={() => refetchMessages()} className="p-1 hover:bg-gray-200 rounded text-gray-500">
                            <RefreshCw size={12} />
                        </button>
                    </div>
                    <div className="space-y-1">
                        {foldersLoading ? (
                            <div className="text-sm text-gray-400 px-2">Loading folders...</div>
                        ) : folders?.filter(f => f !== '[Gmail]').map(folder => (
                            <button
                                key={folder}
                                onClick={() => {
                                    setSelectedFolder(folder);
                                    setPage(1);
                                }}
                                className={`w-full flex items-center px-2 py-2 text-sm font-medium rounded-md ${selectedFolder === folder ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                            >
                                <Folder className="mr-3 h-4 w-4" />
                                <span className="truncate">{folder.replace('[Gmail]/', '')}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="p-4 border-t border-gray-200">
                    <button
                        onClick={openCompose}
                        className="w-full flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-brand-600 hover:bg-brand-700"
                    >
                        <Send className="mr-2 h-4 w-4" /> Compose
                    </button>
                </div>
            </div>

            {/* Message List */}
            <div className="flex-1 flex flex-col min-w-0 bg-white">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                    <h2 className="text-lg font-medium text-gray-900">{selectedFolder}</h2>
                    <span className="text-sm text-gray-500">{messages?.length || 0} messages</span>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {messagesLoading ? (
                        <div className="p-8 text-center text-gray-500">Loading messages...</div>
                    ) : messages?.length === 0 ? (
                        <div className="p-12 text-center">
                            <Mail className="mx-auto h-12 w-12 text-gray-300" />
                            <h3 className="mt-2 text-sm font-medium text-gray-900">No messages</h3>
                            <p className="mt-1 text-sm text-gray-500">This folder is empty.</p>
                        </div>
                    ) : (
                        <ul className="divide-y divide-gray-200">
                            {messages?.map((msg: EmailMessage) => (
                                <li
                                    key={msg.id}
                                    onClick={() => handleMessageClick(msg)}
                                    className="hover:bg-gray-50 cursor-pointer transition-colors duration-150"
                                >
                                    <div className="px-6 py-4">
                                        <div className="flex justify-between items-baseline">
                                            <p className="text-sm font-medium text-brand-600 truncate">{msg.from}</p>
                                            <p className="text-xs text-gray-500">{msg.date}</p>
                                        </div>
                                        <div className="mt-1">
                                            <p className="text-sm font-semibold text-gray-900">{msg.subject}</p>
                                            <p className="mt-1 text-sm text-gray-500 line-clamp-2">{msg.snippet}</p>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Pagination Footer */}
                <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center bg-gray-50">
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1 || messagesLoading}
                        className="px-3 py-1 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Previous
                    </button>
                    <span className="text-xs text-gray-500">Page {page}</span>
                    <button
                        onClick={() => setPage(p => p + 1)}
                        disabled={messagesLoading || (messages && messages.length < LIMIT)}
                        className="px-3 py-1 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Next
                    </button>
                </div>
            </div>

            {/* Modals */}
            <ComposeEmailModal
                isOpen={isComposeOpen}
                onClose={() => setIsComposeOpen(false)}
                integrationId={selectedAccount}
                initialTo={composeData?.to}
                initialSubject={composeData?.subject}
                initialBody={composeData?.body}
            />

            <EmailDetailModal
                isOpen={isDetailOpen}
                onClose={handleCloseDetail}
                message={selectedMessage}
                onReply={handleReply}
            />
        </div>
    );
};

export default EmailDashboard;
