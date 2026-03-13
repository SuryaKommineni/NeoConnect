export type Role = "staff" | "secretariat" | "caseManager" | "admin";

export type CaseStatus =
  | "New"
  | "Assigned"
  | "In Progress"
  | "Pending"
  | "Resolved"
  | "Escalated";

export type CaseCategory = "Safety" | "Policy" | "Facilities" | "HR" | "Other";
export type Severity = "Low" | "Medium" | "High";

export type User = {
  id: string;
  name: string;
  email: string;
  password: string;
  role: Role;
  department: string;
};

export type CaseNote = {
  id: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
};

export type ComplaintCase = {
  id: string;
  trackingId: string;
  title: string;
  description: string;
  category: CaseCategory;
  department: string;
  location: string;
  severity: Severity;
  isAnonymous: boolean;
  submitterName: string;
  submitterId?: string;
  status: CaseStatus;
  assignedToId?: string;
  assignedToName?: string;
  attachmentName?: string;
  attachmentUrl?: string;
  createdAt: string;
  updatedAt: string;
  assignedAt?: string;
  firstResponseAt?: string;
  reminderSentAt?: string;
  escalatedAt?: string;
  resolutionSummary?: string;
  actionTaken?: string;
  impactChange?: string;
  notes: CaseNote[];
};

export type Poll = {
  id: string;
  question: string;
  options: { id: string; label: string; votes: number }[];
  createdAt: string;
  createdById: string;
  createdByName: string;
  voters: string[];
};

export type MinuteDocument = {
  id: string;
  title: string;
  quarter: string;
  uploadedAt: string;
  uploadedById: string;
  uploadedByName: string;
  fileName: string;
  url: string;
};

export type DashboardSummary = {
  totalCases: number;
  openCases: number;
  escalatedCases: number;
  resolvedCases: number;
};

export type AuthPayload = {
  id: string;
  email: string;
  role: Role;
  name: string;
};

