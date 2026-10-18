import {
  permissions,
  type User,
  type Store,
  type Grants,
  type Garment,
} from "../types";
export const stores: Store[] = [
  { id: "BKK-01", name: "สยาม · กรุงเทพฯ" },
  { id: "CNX-01", name: "นิมมาน · เชียงใหม่" },
];
export const demoAccounts = [
  { email: "admin@demo.test", label: "Admin" },
  { email: "staff@demo.test", label: "Staff · สยาม" },
  { email: "contractor@demo.test", label: "Contractor" },
  { email: "head@demo.test", label: "Head" },
];
export function seed() {
  const users: User[] = [
    {
      id: "u-admin",
      name: "อรทัย วัฒนกิจ",
      email: "admin@demo.test",
      role: "ADMIN",
      is_active: true,
      storeId: null,
    },
    {
      id: "u-staff",
      name: "ธารา ใจดี",
      email: "staff@demo.test",
      role: "STORE_STAFF",
      is_active: true,
      storeId: "BKK-01",
    },
    {
      id: "u-peer",
      name: "มินตรา พูนสุข",
      email: "peer@demo.test",
      role: "STORE_STAFF",
      is_active: true,
      storeId: "BKK-01",
    },
    {
      id: "u-north",
      name: "ภูผา แสงเหนือ",
      email: "north@demo.test",
      role: "STORE_STAFF",
      is_active: true,
      storeId: "CNX-01",
    },
    {
      id: "u-contractor",
      name: "วิชัย รักษ์สิ่งทอ",
      email: "contractor@demo.test",
      role: "CONTRACTOR",
      is_active: true,
      storeId: null,
    },
    {
      id: "u-head",
      name: "รินทร์ วงศ์ดี",
      email: "head@demo.test",
      role: "HEAD",
      is_active: true,
      storeId: null,
    },
    {
      id: "u-disabled",
      name: "บัญชีปิดใช้งาน",
      email: "disabled@demo.test",
      role: "HEAD",
      is_active: false,
      storeId: null,
    },
  ];
  const grants: Grants = {
    ADMIN: permissions.filter((p) => p.group === "Account").map((p) => p.key),
    STORE_STAFF: permissions
      .filter((p) => p.group === "Return")
      .map((p) => p.key),
    CONTRACTOR: [],
    HEAD: [],
  };
  const base = {
    material: "Cotton",
    weight: 0.25,
    storeId: "BKK-01",
    creatorId: "u-staff",
    createdAt: "2026-10-18T02:15:00.000Z",
    note: "",
    evidence: [],
    condition: null,
    recommendation: null,
    confirmedRoute: null,
    confirmedAt: null,
  };
  const garments: Garment[] = [
    { ...base, id: "GR-0001", type: "เสื้อยืดสีขาว" },
    {
      ...base,
      id: "GR-0002",
      type: "เสื้อเชิ้ตลินิน",
      material: "Linen",
      weight: 0.32,
      creatorId: "u-peer",
      condition: "GOOD",
      recommendation: "DIRECT_RESALE_CANDIDATE",
    },
    {
      ...base,
      id: "GR-0003",
      type: "กางเกงยีนส์",
      material: "Denim",
      weight: 0.64,
      condition: "WORN",
      recommendation: "THIRD_PARTY_CONTRACTOR",
      confirmedRoute: "THIRD_PARTY_CONTRACTOR",
      confirmedAt: "2026-10-18T03:10:00.000Z",
    },
    {
      ...base,
      id: "GR-0004",
      type: "เสื้อจากสาขาเชียงใหม่",
      storeId: "CNX-01",
      creatorId: "u-north",
    },
  ];
  return {
    users,
    grants,
    garments,
    passwords: Object.fromEntries(users.map((u) => [u.id, "Demo1234!"])),
    tokens: [] as {
      token: string;
      userId: string;
      expires: number;
      used: boolean;
    }[],
    sessionId: null as string | null,
  };
}
export type MockState = ReturnType<typeof seed>;
