import type {
  User,
  Role,
  Permission,
  Grants,
  Garment,
  Condition,
  Route,
  Session,
  Store,
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
  storeId: string | null;
};
export interface Api {
  session(): Promise<Session | null>;
  login(email: string, password: string): Promise<Session>;
  logout(): Promise<void>;
  changePassword(current: string, password: string): Promise<void>;
  resetPassword(token: string, password: string): Promise<void>;
  users(): Promise<User[]>;
  stores(): Promise<Store[]>;
  createUser(input: CreateUser): Promise<User>;
  editUser(id: string, input: Pick<User, "name" | "email">): Promise<User>;
  setStatus(id: string, active: boolean): Promise<User>;
  setRole(id: string, role: Role, storeId: string | null): Promise<User>;
  adminReset(id: string, password: string): Promise<void>;
  issueReset(id: string): Promise<string>;
  grants(): Promise<Grants>;
  saveGrants(role: Role, keys: Permission[]): Promise<Grants>;
  garments(): Promise<Garment[]>;
  garment(id: string): Promise<Garment>;
  createGarment(
    input: Pick<Garment, "type" | "material" | "weight">,
  ): Promise<Garment>;
  assess(id: string, condition: Condition): Promise<Garment>;
  upload(id: string, file: File): Promise<Garment>;
  confirm(id: string, route: Route, note: string): Promise<Garment>;
}
