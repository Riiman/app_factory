import React, { useState } from 'react';
import { Mail } from 'lucide-react';
import { emailService } from '@/services/emailService';
import { toast } from 'react-hot-toast';

const EmailConnect: React.FC<{ onConnected: () => void }> = ({ onConnected }) => {
    const [isCustom, setIsCustom] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        email_address: '',
        imap_host: '',
        imap_port: 993,
        smtp_host: '',
        smtp_port: 587,
        username: '',
        password: '',
        protocol: 'IMAP'
    });

    const handleGoogleConnect = async () => {
        try {
            const url = await emailService.getConnectUrl('google');
            window.location.href = url;
        } catch (error) {
            toast.error('Failed to initiate Google connection');
        }
    };

    const handleOutlookConnect = async () => {
        try {
            const url = await emailService.getConnectUrl('outlook');
            window.location.href = url;
        } catch (error) {
            toast.error('Failed to initiate Outlook connection');
        }
    };

    const handleCustomConnect = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await emailService.connectCustom(formData);
            toast.success('Connected successfully!');
            onConnected();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to connect');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto mt-10 p-6 bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="text-center mb-8">
                <div className="mx-auto w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                    <Mail className="h-6 w-6 text-brand-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Connect your Email</h2>
                <p className="text-gray-500 mt-2">Link your inbox to view and send emails from the dashboard.</p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
                <button
                    onClick={handleGoogleConnect}
                    className="flex items-center justify-center px-4 py-3 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                    <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                    Google
                </button>
                <button
                    onClick={handleOutlookConnect}
                    className="flex items-center justify-center px-4 py-3 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                    <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="currentColor"><path d="M11.55 21H3v-8.55h8.55V21zM21 21h-8.55v-8.55H21V21zM11.55 11.55H3V3h8.55v8.55zM21 11.55h-8.55V3H21v8.55z" fill="#F25022" /><path d="M11.55 11.55H3V3h8.55v8.55z" fill="#7FBA00" /><path d="M21 21h-8.55v-8.55H21V21z" fill="#FFB900" /><path d="M11.55 21H3v-8.55h8.55V21z" fill="#00A4EF" /></svg>
                    Outlook
                </button>
            </div>

            <div className="relative mb-8">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">Or connect manually</span>
                </div>
            </div>

            {/* Custom IMAP Form */}
            <form onSubmit={handleCustomConnect} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Protocol</label>
                    <select
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm"
                        value={formData.protocol}
                        onChange={(e) => setFormData({ ...formData, protocol: e.target.value })}
                    >
                        <option value="IMAP">IMAP</option>
                        <option value="POP3">POP3</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Email Address</label>
                    <input type="email" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm"
                        value={formData.email_address} onChange={(e) => setFormData({ ...formData, email_address: e.target.value })}
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Incoming Host ({formData.protocol})</label>
                        <input type="text" required placeholder={formData.protocol === 'IMAP' ? "imap.example.com" : "pop.example.com"} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm"
                            value={formData.imap_host} onChange={(e) => setFormData({ ...formData, imap_host: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Port</label>
                        <input type="number" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm"
                            value={formData.imap_port} onChange={(e) => setFormData({ ...formData, imap_port: parseInt(e.target.value) })}
                        />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">SMTP Host</label>
                        <input type="text" required placeholder="smtp.example.com" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm"
                            value={formData.smtp_host} onChange={(e) => setFormData({ ...formData, smtp_host: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Port</label>
                        <input type="number" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm"
                            value={formData.smtp_port} onChange={(e) => setFormData({ ...formData, smtp_port: parseInt(e.target.value) })}
                        />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Username</label>
                        <input type="text" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm"
                            value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Password</label>
                        <input type="password" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm"
                            value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        />
                    </div>
                </div>
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50"
                >
                    {loading ? 'Connecting...' : 'Connect Account'}
                </button>
            </form>
        </div>
    );
};

export default EmailConnect;
