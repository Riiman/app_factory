
export enum SignatoryStatus {
  NOT_SIGNED = 'Awaiting Signature',
  SIGNED = 'Signed',
  VIEWED = 'Viewed',
}

export interface Signatory {
  id: string;
  name: string;
  email: string;
  status: SignatoryStatus;
  signedOn?: Date;
}

export enum DocumentStatus {
  OUT_FOR_SIGNATURE = 'Out for Signature',
  PARTIALLY_SIGNED = 'Partially Signed',
  COMPLETED = 'Completed',
  VOIDED = 'Voided',
}

export interface Document {
  id: string;
  title: string;
  status: DocumentStatus;
  sentOn: Date;
  completedOn?: Date;
  documentUrl: string;
  documentPreviewUrl: string;
  signatories: Signatory[];
}
