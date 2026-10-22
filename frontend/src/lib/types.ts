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
  { key: "outcome.reserved", group: "Outcome", label: "Reserved access" },
  { key: "validation.reserved", group: "Validation", label: "Reserved access" },
  { key: "report.reserved", group: "Report", label: "Reserved access" },
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
