import api from '../../utils/api';
import { CrmContact, CrmCompany, CrmDeal, CrmInteraction, CrmList, CrmSyncRule, CrmAnalytics } from './types';

export const crmApi = {
    // Contacts
    getContacts: async (lifecycleStage?: string) => {
        let url = '/crm/contacts';
        if (lifecycleStage) {
            url += `?lifecycle_stage=${encodeURIComponent(lifecycleStage)}`;
        }
        return api.get<CrmContact[]>(url);
    },
    createContact: async (data: Partial<CrmContact>) => {
        return api.post<CrmContact>('/crm/contacts', data);
    },
    getContact: async (id: number) => {
        return api.get<CrmContact>(`/crm/contacts/${id}`);
    },
    updateContact: async (id: number, data: Partial<CrmContact>) => {
        return api.put<CrmContact>(`/crm/contacts/${id}`, data);
    },
    deleteContact: async (id: number) => {
        return api.delete(`/crm/contacts/${id}`);
    },

    // Companies
    getCompanies: async () => {
        return api.get<CrmCompany[]>('/crm/companies');
    },
    createCompany: async (data: Partial<CrmCompany>) => {
        return api.post<CrmCompany>('/crm/companies', data);
    },
    updateCompany: async (id: number, data: Partial<CrmCompany>) => {
        return api.put<CrmCompany>(`/crm/companies/${id}`, data);
    },

    // Deals
    getDeals: async () => {
        return api.get<CrmDeal[]>('/crm/deals');
    },
    createDeal: async (data: Partial<CrmDeal>) => {
        return api.post<CrmDeal>('/crm/deals', data);
    },
    updateDeal: async (id: number, data: Partial<CrmDeal>) => {
        return api.put<CrmDeal>(`/crm/deals/${id}`, data);
    },

    // Interactions
    getInteractions: async (contactId: number) => {
        return api.get<CrmInteraction[]>(`/crm/contacts/${contactId}/interactions`);
    },
    createInteraction: async (contactId: number, data: Partial<CrmInteraction>) => {
        return api.post<CrmInteraction>(`/crm/contacts/${contactId}/interactions`, data);
    },

    // Automation
    enrichCompany: async (domain: string) => {
        return api.post<any>('/crm/enrich/company', { domain });
    },
    syncEmails: async (limit?: number) => {
        let url = '/crm/sync-emails';
        if (limit) url += `?limit=${limit}`;
        return api.post<any>(url, {});
    },

    // Lists
    getLists: async () => {
        return api.get<CrmList[]>('/crm/lists');
    },
    createList: async (data: { name: string; description?: string }) => {
        return api.post<CrmList>('/crm/lists', data);
    },
    addToList: async (listId: number, contactIds: number[]) => {
        return api.post<{ message: string, added_count: number }>(`/crm/lists/${listId}/add`, { contact_ids: contactIds });
    },
    deleteList: async (listId: number) => {
        return api.delete(`/crm/lists/${listId}`);
    },

    // Settings (Rules)
    getSyncRules: async () => {
        return api.get<CrmSyncRule[]>('/crm/sync-rules');
    },
    createSyncRule: async (data: { rule_type: string; value: string }) => {
        return api.post<CrmSyncRule>('/crm/sync-rules', data);
    },
    deleteSyncRule: async (ruleId: number) => {
        return api.delete(`/crm/sync-rules/${ruleId}`);
    },

    // Analytics
    getAnalytics: async () => {
        return api.get<CrmAnalytics>('/crm/analytics/overview');
    }
};
