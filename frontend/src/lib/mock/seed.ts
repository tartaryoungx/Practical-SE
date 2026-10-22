import {
  permissions,
  type User,
  type Grants,
  type Garment,
} from "../types";
export const demoAccounts = [
  { email: "admin@demo.test", label: "Admin" },
  { email: "staff@demo.test", label: "Staff" },
  { email: "contractor@demo.test", label: "Contractor" },
  { email: "head@demo.test", label: "Head" },
];
export function seed() {
  const users: User[] = [
    {
      id: "u-admin",
      name: "Aorathai Wattanakit",
      email: "admin@demo.test",
      role: "ADMIN",
      is_active: true,
    },
    {
      id: "u-staff",
      name: "Thara Jaidee",
      email: "staff@demo.test",
      role: "STORE_STAFF",
      is_active: true,
    },
    {
      id: "u-peer",
      name: "Mintra Poonsuk",
      email: "peer@demo.test",
      role: "STORE_STAFF",
      is_active: true,
    },
    {
      id: "u-north",
      name: "Phupha Saengnuea",
      email: "north@demo.test",
      role: "STORE_STAFF",
      is_active: true,
    },
    {
      id: "u-contractor",
      name: "Wichai Raktextile",
      email: "contractor@demo.test",
      role: "CONTRACTOR",
      is_active: true,
    },
    {
      id: "u-head",
      name: "Rin Wongdee",
      email: "head@demo.test",
      role: "HEAD",
      is_active: true,
    },
    {
      id: "u-disabled",
      name: "Disabled Account",
      email: "disabled@demo.test",
      role: "HEAD",
      is_active: false,
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
    creatorId: "u-staff",
    createdAt: "2026-10-18T02:15:00.000Z",
    note: "",
    evidence: [],
    condition: null,
    recommendation: null,
    confirmedRoute: null,
    confirmedAt: null,
    evidenceRequired: false,
  };
  const garments: Garment[] = [
    { ...base, id: "GR-0001", type: "White T-shirt" },
    {
      ...base,
      id: "GR-0002",
      type: "Linen shirt",
      material: "Linen",
      weight: 0.32,
      creatorId: "u-peer",
      condition: "GOOD",
      recommendation: "DIRECT_RESALE_CANDIDATE",
    },
    {
      ...base,
      id: "GR-0003",
      type: "Jeans",
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
      type: "Shirt from the north",
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
