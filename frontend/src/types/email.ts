export enum EmailProvider {
    GOOGLE = "google",
    OUTLOOK = "outlook",
    CUSTOM = "custom"
}

export interface EmailAccount {
    id: number;
    user_id: number;
    provider: string; // "google" | "outlook" | "custom"
    email_address: string;
    imap_host?: string;
    smtp_host?: string;
    created_at: string;
}

export interface EmailMessage {
    id: number;
    subject: string;
    from: string;
    date: string;
    snippet: string;
    body_text?: string;
    body_html?: string;
    message_id?: string;
    references?: string;
    in_reply_to?: string;
}

export interface ConnectionStatus {
    connected: boolean;
    accounts: EmailAccount[];
}
