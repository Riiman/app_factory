import api from '../utils/api';
import { EmailAccount, EmailMessage } from '../types/email';

export const emailService = {
    connectCustom: async (data: any) => {
        // api.post handles headers automatically
        const responseData = await api.post('/email/connect/custom', data);
        return responseData;
    },

    getConnectUrl: async (provider: string) => {
        // Use api.fetch directly or helper if available. 
        // api.get returns the JSON body directly.
        // URL path in api.ts is joined with API_BASE_URL. 
        // Our endpoint is /api/email/connect/<provider>. 
        // api.ts API_BASE_URL defaults to /api. So we pass /email/connect/<provider>

        const data = await api.get(`/email/connect/${provider}`);
        return data.url;
    },

    listAccounts: async (): Promise<EmailAccount[]> => {
        return api.get('/email/accounts');
    },

    getFolders: async (integrationId: number): Promise<string[]> => {
        return api.get(`/email/folders/${integrationId}`);
    },

    getMessages: async (integrationId: number, folder: string = 'INBOX', page: number = 1, limit: number = 20): Promise<EmailMessage[]> => {
        // api.get accepts options? No, api.get signature is (url, options).
        // But options is RequestInit. We need query params.
        // We can append query params to URL manually.
        return api.get(`/email/messages/${integrationId}?folder=${encodeURIComponent(folder)}&page=${page}&limit=${limit}`);
    },

    sendEmail: async (data: { integration_id: number, to: string, subject: string, body: string }) => {
        return api.post('/email/send', data);
    },

    disconnectAccount: async (integrationId: number): Promise<void> => {
        return api.delete(`/email/disconnect/${integrationId}`);
    }
};
