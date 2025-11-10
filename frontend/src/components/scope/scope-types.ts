
export enum Role {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

export interface User {
  id: number;
  name: string;
  role: Role;
  avatar: string;
}

export interface Comment {
  id: number;
  text: string;
  author: User;
  timestamp: string;
}

export interface ScopeSection {
  id: string;
  title: string;
  content: string[];
  comments: Comment[];
}

export interface ScopeDocument {
  title: string;
  client: string;
  provider: string;
  date: string;
  version: string;
  sections: ScopeSection[];
}
