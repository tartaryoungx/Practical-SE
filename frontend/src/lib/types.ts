export const roles = ["ADMIN", "STORE_STAFF", "CONTRACTOR", "HEAD"] as const;
export type Role = (typeof roles)[number];
export const conditions = ["GOOD", "WORN", "DAMAGED", "STAINED"] as const;
export type Condition = (typeof conditions)[number];
export const routes = [
  "DIRECT_RESALE_CANDIDATE",
  "THIRD_PARTY_CONTRACTOR",
] as const;
export type Route = (typeof routes)[number];
export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  is_active: boolean;
};
export type Evidence = {
  id: string;
  filename: string;
  mime: string;
  size: number;
  uploaderId: string;
  createdAt: string;
};
export type Garment = {
  id: string;
  type: string;
  material: string;
  weight: number;
  creatorId: string;
  createdAt: string;
  condition: Condition | null;
  recommendation: Route | null;
  confirmedRoute: Route | null;
  note: string;
  confirmedAt: string | null;
  evidenceRequired: boolean;
  evidence: Evidence[];
  storeCode?: string;
  storeName?: string;
};
export const permissions = [
  { key: "users.read", group: "Account", label: "View users" },
  { key: "users.create", group: "Account", label: "Create users" },
  { key: "users.edit", group: "Account", label: "Edit name and email" },
  { key: "users.status", group: "Account", label: "Disable or reactivate" },
  { key: "users.reset", group: "Account", label: "Reset password or recovery link" },
  { key: "users.role", group: "Account", label: "Assign role" },
  { key: "access.read", group: "Account", label: "View permissions" },
  { key: "access.write", group: "Account", label: "Configure permissions" },
  { key: "returns.read", group: "Return", label: "View garments and evidence" },
  { key: "returns.create", group: "Return", label: "Record a garment" },
  { key: "returns.assess", group: "Return", label: "Assess condition" },
  { key: "returns.evidence", group: "Return", label: "Attach evidence" },
  { key: "returns.confirm", group: "Return", label: "Confirm or override route" },
  { key: "batch.reserved", group: "Batch", label: "Reserved access" },
  { key: "batch.create", group: "Batch", label: "Create and review pickup batches" },
  { key: "batch.read", group: "Batch", label: "View pickup batches" },
  { key: "batch.confirm", group: "Batch", label: "Confirm pickup batches" },
  { key: "batch.pickup", group: "Batch", label: "Record batch pickup" },
  { key: "batch.receive", group: "Batch", label: "Confirm assigned batch receipt" },
  { key: "batch.monitor", group: "Batch", label: "Monitor batch progress" },
  { key: "outcome.reserved", group: "Outcome", label: "Reserved access" },
  { key: "outcome.sorting", group: "Outcome", label: "Record and submit sorting results" },
  { key: "outcome.final", group: "Outcome", label: "Record and submit final outcomes" },
  { key: "validation.reserved", group: "Validation", label: "Reserved access" },
  { key: "validation.read", group: "Validation", label: "Review batch validation checks" },
  { key: "validation.decide", group: "Validation", label: "Confirm or flag batch data" },
  { key: "issues.manage", group: "Validation", label: "Request and review data corrections" },
  { key: "issues.respond", group: "Validation", label: "Respond to assigned data issues" },
  { key: "report.reserved", group: "Report", label: "Reserved access" },
  { key: "report.configure", group: "Report", label: "Configure draft report criteria" },
] as const;
export type Permission = (typeof permissions)[number]["key"];
export type Grants = Record<Role, Permission[]>;
export const roleLabels: Record<Role, string> = {
  ADMIN: "Administrator",
  STORE_STAFF: "Store staff",
  CONTRACTOR: "Contractor",
  HEAD: "Project head",
};
export const conditionLabels: Record<Condition, string> = {
  GOOD: "Good",
  WORN: "Worn",
  DAMAGED: "Damaged",
  STAINED: "Stained",
};
export const routeLabels: Record<Route, string> = {
  DIRECT_RESALE_CANDIDATE: "Direct resale candidate",
  THIRD_PARTY_CONTRACTOR: "Third-party contractor",
};
export type Session = { user: User; grants: Grants };

export type StoreRef = { code: string; name: string };
export type PersonRef = { id: string; name: string; email: string; role: Role };
export const batchStatuses = ["DRAFT", "READY_FOR_PICKUP", "PICKED_UP", "RECEIVED"] as const;
export type BatchStatus = (typeof batchStatuses)[number];
export const attentionFlags = ["DELAYED", "PENDING", "MISSING", "COMPLETED", "FLAGGED"] as const;
export type Attention = (typeof attentionFlags)[number];
export type ValidationDecision = "VALID" | "FLAGGED";
export type BatchSummary = {
  id: string;
  storeCode: string;
  storeName: string;
  contractorId: string;
  contractorName: string;
  status: BatchStatus;
  quantity: number;
  totalWeight: number;
  plannedPickupAt: string;
  pickedUpAt: string | null;
  receivedAt: string | null;
  confirmedAt: string | null;
  createdAt: string;
  attention: Attention[];
  validationDecision: ValidationDecision | null;
};
export type BatchItem = {
  garmentId: string;
  type: string;
  material: string;
  weight: number;
  condition: Condition | null;
  confirmedRoute: Route | null;
  createdAt: string;
  position: number;
};
export type SortingResult = {
  status: "DRAFT" | "SUBMITTED";
  resaleKg: number;
  fibreToFibreKg: number;
  downcyclingKg: number;
  unknownKg: number;
  totalKg: number;
  submittedAt: string | null;
};
export const outcomeCategories = [
  "RESOLD",
  "FIBRE_TO_FIBRE",
  "DOWNCYCLED",
  "DISCARDED",
  "UNKNOWN",
] as const;
export type OutcomeCategory = (typeof outcomeCategories)[number];
export type OutcomeItem = {
  id: string;
  category: OutcomeCategory;
  weight: number;
  note: string;
};
export type OutcomeEvidence = {
  id: string;
  filename: string;
  mime: string;
  size: number;
  createdAt: string;
};
export type FinalOutcome = {
  status: "DRAFT" | "SUBMITTED";
  totalKg: number;
  submittedAt: string | null;
  items: OutcomeItem[];
  evidence: OutcomeEvidence[];
};
export type BatchDetail = BatchSummary & {
  editable: boolean;
  items: BatchItem[];
  sorting: SortingResult | null;
  finalOutcome: FinalOutcome | null;
  validation: { decision: ValidationDecision; reason: string; decidedAt: string } | null;
};
export type BatchQuery = {
  status?: string;
  storeCode?: string;
  contractorId?: string;
  dateFrom?: string;
  dateTo?: string;
};
export type MonitoringSummary = {
  total: number;
  byStatus: Record<BatchStatus, number>;
  delayed: number;
  flagged: number;
  pending: number;
  missing: number;
  completed: number;
};
export type Monitoring = { summary: MonitoringSummary; batches: BatchSummary[] };
export type ValidationCheck = { key: string; label: string; passed: boolean; detail: string };
export type ValidationDetail = {
  batchId: string;
  operationalStatus: BatchStatus;
  batchWeight: number;
  checks: ValidationCheck[];
  decision: ValidationDecision | null;
  reason: string;
  decidedAt: string | null;
  fullyVerified: boolean;
};
export const issueStatuses = ["OPEN", "RESPONDED", "RESOLVED", "REOPENED"] as const;
export type IssueStatus = (typeof issueStatuses)[number];
export type DataIssue = {
  id: string;
  batchId: string;
  message: string;
  assigneeId: string;
  assigneeName: string;
  assigneeRole: string;
  status: IssueStatus;
  requestedBy: string;
  requestedByName: string;
  response: string;
  respondedAt: string | null;
  resolutionNote: string;
  resolvedAt: string | null;
  createdAt: string;
};
export type ReportConfig = {
  id: string;
  status: "DRAFT";
  periodStart: string;
  periodEnd: string;
  storeCode: string | null;
  contractorId: string | null;
  matchingCount: number;
  createdAt: string;
};
export type ReportQuery = {
  periodStart: string;
  periodEnd: string;
  storeCode?: string;
  contractorId?: string;
};
