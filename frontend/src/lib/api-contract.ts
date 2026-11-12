import type {
  User,
  Role,
  Permission,
  Grants,
  Garment,
  Condition,
  Route,
  Session,
  StoreRef,
  PersonRef,
  BatchSummary,
  BatchDetail,
  BatchQuery,
  Monitoring,
  SortingResult,
  OutcomeCategory,
  ValidationDetail,
  DataIssue,
  ReportConfig,
  ReportQuery,
} from "./types";

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public fields: Record<string, string> = {},
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export type CreateUser = {
  name: string;
  email: string;
  password: string;
  role: Role;
};

export interface Api {
  session(): Promise<Session | null>;
  login(email: string, password: string): Promise<Session>;
  logout(): Promise<void>;
  changePassword(current: string, password: string): Promise<void>;
  resetPassword(token: string, password: string): Promise<void>;
  users(): Promise<User[]>;
  createUser(input: CreateUser): Promise<User>;
  editUser(id: string, input: Pick<User, "name" | "email">): Promise<User>;
  setStatus(id: string, active: boolean): Promise<User>;
  setRole(id: string, role: Role): Promise<User>;
  adminReset(id: string, password: string): Promise<string | null>;
  issueReset(id: string): Promise<string>;
  grants(): Promise<Grants>;
  saveGrants(role: Role, keys: Permission[]): Promise<Grants>;
  garments(): Promise<Garment[]>;
  garment(id: string): Promise<Garment>;
  createGarment(input: {
    type: string;
    material: string;
    weight: number;
    storeCode?: string;
  }): Promise<Garment>;
  assess(id: string, condition: Condition): Promise<Garment>;
  upload(id: string, file: File): Promise<Garment>;
  evidenceUrl(garmentId: string, evidenceId: string): Promise<string>;
  confirm(id: string, route: Route, note: string): Promise<Garment>;
  stores(): Promise<StoreRef[]>;
  contractors(): Promise<PersonRef[]>;
  assignees(): Promise<PersonRef[]>;
  batches(query?: BatchQuery): Promise<BatchSummary[]>;
  monitoring(query?: BatchQuery): Promise<Monitoring>;
  batch(id: string): Promise<BatchDetail>;
  createBatch(input: {
    storeCode: string;
    contractorId: string;
    plannedPickupAt: string;
    maxItems?: number;
  }): Promise<BatchDetail>;
  removeBatchItem(batchId: string, garmentId: string): Promise<BatchDetail>;
  confirmBatch(id: string): Promise<BatchDetail>;
  pickupBatch(id: string, pickedUpAt?: string): Promise<BatchDetail>;
  receiveBatch(id: string): Promise<BatchDetail>;
  saveSorting(
    id: string,
    input: Pick<SortingResult, "resaleKg" | "fibreToFibreKg" | "downcyclingKg" | "unknownKg">,
  ): Promise<BatchDetail>;
  submitSorting(id: string): Promise<BatchDetail>;
  saveOutcomes(
    id: string,
    items: { category: OutcomeCategory; weight: number; note: string }[],
  ): Promise<BatchDetail>;
  uploadOutcomeEvidence(id: string, file: File): Promise<BatchDetail>;
  outcomeEvidenceUrl(batchId: string, evidenceId: string): Promise<string>;
  submitOutcomes(id: string): Promise<BatchDetail>;
  validation(id: string): Promise<ValidationDetail>;
  decideValidation(
    id: string,
    decision: "VALID" | "FLAGGED",
    reason: string,
  ): Promise<ValidationDetail>;
  issues(): Promise<DataIssue[]>;
  myIssues(): Promise<DataIssue[]>;
  issue(id: string): Promise<DataIssue>;
  createIssue(input: { batchId: string; assigneeId: string; message: string }): Promise<DataIssue>;
  respondIssue(id: string, message: string): Promise<DataIssue>;
  resolveIssue(id: string, message: string): Promise<DataIssue>;
  reopenIssue(id: string, message: string): Promise<DataIssue>;
  reports(): Promise<ReportConfig[]>;
  reportMatch(query: ReportQuery): Promise<{ matchingCount: number }>;
  createReport(input: ReportQuery): Promise<ReportConfig>;
}
