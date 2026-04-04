export enum CrmLifecycleStage {
    SUBSCRIBER = "SUBSCRIBER",
    LEAD = "LEAD",
    MQL = "MQL",
    SQL = "SQL",
    OPPORTUNITY = "OPPORTUNITY",
    CUSTOMER = "CUSTOMER",
    EVANGELIST = "EVANGELIST",
    OTHER = "OTHER"
}

export enum CrmLeadStatus {
    NEW = "NEW",
    OPEN = "OPEN",
    IN_PROGRESS = "IN_PROGRESS",
    OPEN_DEAL = "OPEN_DEAL",
    UNQUALIFIED = "UNQUALIFIED",
    ATTEMPTED_TO_CONTACT = "ATTEMPTED_TO_CONTACT",
    CONNECTED = "CONNECTED",
    BAD_TIMING = "BAD_TIMING"
}

export enum CrmDealStage {
    APPOINTMENT_SCHEDULED = "APPOINTMENT_SCHEDULED",
    QUALIFIED_TO_BUY = "QUALIFIED_TO_BUY",
    PRESENTATION_SCHEDULED = "PRESENTATION_SCHEDULED",
    DECISION_MAKER_BOUGHT_IN = "DECISION_MAKER_BOUGHT_IN",
    CONTRACT_SENT = "CONTRACT_SENT",
    CLOSED_WON = "CLOSED_WON",
    CLOSED_LOST = "CLOSED_LOST"
}

export enum InteractionType {
    NOTE = "NOTE",
    EMAIL = "EMAIL",
    CALL = "CALL",
    MEETING = "MEETING"
}

export interface CrmCompany {
    id: number;
    startup_id: number;
    name: string;
    domain_name?: string;
    industry?: string;
    about_us?: string;
    city?: string;
    state?: string;
    owner_id?: number;
    created_at: string;
    updated_at: string;
}

export interface CrmContact {
    id: number;
    startup_id: number;
    company_id?: number;
    company_name?: string;
    first_name: string;
    last_name?: string;
    email?: string;
    phone?: string;
    job_title?: string;
    lifecycle_stage: CrmLifecycleStage;
    lead_status: CrmLeadStatus;
    owner_id?: number;
    created_at: string;
    updated_at: string;
}

export interface CrmDeal {
    id: number;
    startup_id: number;
    contact_id?: number;
    contact_name?: string;
    company_id?: number;
    company_name?: string;
    name: string;
    amount: number;
    stage: CrmDealStage;
    close_date?: string;
    owner_id?: number;
    created_at: string;
    updated_at: string;
}

export interface CrmInteraction {
    id: number;
    startup_id: number;
    contact_id: number;
    type: InteractionType;
    content?: string;
    created_by: number;
    creator_name?: string;
    created_at: string;
}

export interface CrmList {
    id: number;
    name: string;
    description?: string;
    member_count: number;
}

export enum SyncRuleType {
    DOMAIN = "DOMAIN",
    EMAIL = "EMAIL",
    SUBJECT = "SUBJECT"
}

export interface CrmSyncRule {
    id: number;
    rule_type: SyncRuleType;
    value: string;
}

export interface CrmAnalytics {
    pipeline_value: number;
    deal_count: number;
    win_rate: number;
    activity_volume_30d: number;
    recent_wins: CrmDeal[];
}
