import { UserRole, ProjectPhase, ProjectStatus, DocumentCategory } from "@prisma/client";

export type { UserRole, ProjectPhase, ProjectStatus, DocumentCategory };

// Project types
export interface Project {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  capacityKw: number | null;
  currentPhase: ProjectPhase;
  progressPercent: number;
  status: ProjectStatus;
  createdAt: Date | string;
  updatedAt: Date | string;
  members?: ProjectMember[];
  _count?: {
    members: number;
    documents: number;
  };
}

export interface ProjectMember {
  id: string;
  userId: string | null;
  projectId: string;
  invitedEmail: string | null;
  isOwner: boolean;
  createdAt: Date | string;
  user?: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  } | null;
}

export interface Document {
  id: string;
  projectId: string;
  category: DocumentCategory;
  title: string;
  description: string | null;
  currentVersionId: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  currentVersion?: DocumentVersion | null;
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  versionNumber: number;
  fileUrl: string;
  fileName: string;
  fileSizeBytes: number | null;
  mimeType: string | null;
  note: string | null;
  uploadedById: string;
  createdAt: Date | string;
  uploadedBy?: {
    id: string;
    name: string | null;
    email: string;
  };
}

export interface Activity {
  id: string;
  projectId: string;
  userId: string | null;
  type: string;
  title: string;
  description: string | null;
  metadata: any;
  createdAt: Date | string;
  user?: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  } | null;
}

// Form data types
export interface CreateProjectInput {
  name: string;
  description?: string;
  location?: string;
  capacityKw?: number;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  location?: string;
  capacityKw?: number;
  currentPhase?: ProjectPhase;
  progressPercent?: number;
  status?: ProjectStatus;
}
