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
  storeId: string | null;
};
export type Store = { id: string; name: string };
export type Evidence = {
  id: string;
  filename: string;
  mime: string;
  size: number;
  uploaderId: string;
  createdAt: string;
  preview: string;
};
export type Garment = {
  id: string;
  type: string;
  material: string;
  weight: number;
  storeId: string;
  creatorId: string;
  createdAt: string;
  condition: Condition | null;
  recommendation: Route | null;
  confirmedRoute: Route | null;
  note: string;
  confirmedAt: string | null;
  evidence: Evidence[];
};
export const permissions = [
  { key: "users.read", group: "Account", label: "ดูผู้ใช้" },
  { key: "users.create", group: "Account", label: "สร้างผู้ใช้" },
  { key: "users.edit", group: "Account", label: "แก้ไขชื่อ / อีเมล" },
  { key: "users.status", group: "Account", label: "ปิด / เปิดบัญชี" },
  { key: "users.reset", group: "Account", label: "รีเซ็ตรหัสผ่าน / ออกลิงก์" },
  { key: "users.role", group: "Account", label: "กำหนดบทบาท" },
  { key: "access.read", group: "Account", label: "ดูสิทธิ์" },
  { key: "access.write", group: "Account", label: "ตั้งค่าสิทธิ์" },
  { key: "returns.read", group: "Return", label: "ดูเสื้อผ้า / หลักฐาน" },
  { key: "returns.create", group: "Return", label: "บันทึกเสื้อผ้า" },
  { key: "returns.assess", group: "Return", label: "ประเมินสภาพ" },
  { key: "returns.evidence", group: "Return", label: "แนบหลักฐาน" },
  { key: "returns.confirm", group: "Return", label: "ยืนยัน / เปลี่ยนเส้นทาง" },
  { key: "batch.reserved", group: "Batch", label: "Reserved access" },
  { key: "outcome.reserved", group: "Outcome", label: "Reserved access" },
  { key: "validation.reserved", group: "Validation", label: "Reserved access" },
  { key: "report.reserved", group: "Report", label: "Reserved access" },
] as const;
export type Permission = (typeof permissions)[number]["key"];
export type Grants = Record<Role, Permission[]>;
export const roleLabels: Record<Role, string> = {
  ADMIN: "ผู้ดูแลระบบ",
  STORE_STAFF: "พนักงานร้าน",
  CONTRACTOR: "ผู้รับเหมา",
  HEAD: "หัวหน้าโครงการ",
};
export const conditionLabels: Record<Condition, string> = {
  GOOD: "สภาพดี",
  WORN: "สึกหรอ",
  DAMAGED: "เสียหาย",
  STAINED: "มีคราบ",
};
export const routeLabels: Record<Route, string> = {
  DIRECT_RESALE_CANDIDATE: "พิจารณาขายต่อ",
  THIRD_PARTY_CONTRACTOR: "ส่งผู้รับเหมาคัดแยก",
};
export type Session = { user: User; grants: Grants };
