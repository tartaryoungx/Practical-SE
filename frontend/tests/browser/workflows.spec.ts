import { test, expect, type Page } from "@playwright/test";
async function login(page: Page, role = "Staff · สยาม") {
  await page.goto("/login");
  await page.getByRole("button", { name: role, exact: true }).click();
  await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "ออกจากระบบ", exact: true }),
  ).toBeVisible();
}
test("Staff confirms an override and retrieves read-only record after a new login", async ({
  page,
}) => {
  await login(page);
  await page.getByRole("link", { name: "บันทึกเสื้อผ้า", exact: true }).click();
  await page.getByLabel("ประเภทเสื้อผ้า").fill("เสื้อทดสอบ Browser");
  await page.getByLabel(/^วัสดุ\s*\*?$/).fill("Cotton");
  await page.getByLabel("น้ำหนัก (กิโลกรัม)").fill("0.3");
  await page.getByRole("button", { name: "บันทึกและประเมินต่อ" }).click();
  await expect(page.getByRole("heading", { name: /GR-0005/ })).toBeVisible();
  await page.getByRole("button", { name: /GOOD สภาพดี/ }).click();
  await page
    .getByRole("button", { name: "บันทึกการประเมิน", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "พิจารณาขายต่อ", exact: true }),
  ).toBeVisible();
  await page.getByRole("radio", { name: "ส่งผู้รับเหมาคัดแยก" }).check();
  await expect(
    page.getByRole("button", { name: "เปลี่ยนเส้นทางและยืนยัน" }),
  ).toBeDisabled();
  await page.getByLabel("เหตุผลในการเปลี่ยนเส้นทาง").fill("ส่งคัดแยกเพิ่มเติม");
  await page.getByRole("button", { name: "เปลี่ยนเส้นทางและยืนยัน" }).click();
  await page
    .getByRole("button", { name: "ยืนยันผลจำลอง", exact: true })
    .click();
  await expect(
    page.getByText(
      "ยืนยันผลแล้ว · สภาพ หลักฐาน และเส้นทางเป็นข้อมูลอ่านอย่างเดียว",
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: "ออกจากระบบ", exact: true }).click();
  await login(page);
  await page.getByRole("link", { name: "GR-0005", exact: true }).click();
  await expect(
    page.getByText("ส่งคัดแยกเพิ่มเติม", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /GOOD สภาพดี/ }),
  ).toBeDisabled();
});
test("damaged garment requires evidence and handles upload rejection then image preview", async ({
  page,
}) => {
  await login(page);
  await page.getByRole("link", { name: "GR-0001", exact: true }).click();
  await page.getByRole("button", { name: /DAMAGED เสียหาย/ }).click();
  await page
    .getByRole("button", { name: "บันทึกการประเมิน", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "ยืนยันตามคำแนะนำ", exact: true }),
  ).toBeDisabled();
  await page.getByLabel("เลือกรูปหลักฐาน").setInputFiles({
    name: "invalid.png",
    mimeType: "image/png",
    buffer: Buffer.from("invalid"),
  });
  await expect(
    page.getByRole("alert").filter({ hasText: "เนื้อหาไฟล์ไม่ตรง" }),
  ).toBeVisible();
  await page.getByLabel("เลือกรูปหลักฐาน").setInputFiles({
    name: "evidence.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await page.getByRole("button", { name: /evidence.png/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "ปิดหน้าต่าง" }).click();
  await expect(
    page.getByRole("button", { name: "ยืนยันตามคำแนะนำ", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "ยืนยันตามคำแนะนำ", exact: true })
    .click();
  await page
    .getByRole("button", { name: "ยืนยันผลจำลอง", exact: true })
    .click();
  await expect(
    page.getByText(
      "ยืนยันผลแล้ว · สภาพ หลักฐาน และเส้นทางเป็นข้อมูลอ่านอย่างเดียว",
    ),
  ).toBeVisible();
});
test("Admin creates Staff, edits, changes status, reviews permissions and recovery", async ({
  page,
}) => {
  await login(page, "Admin");
  await page
    .getByRole("button", { name: "เพิ่มผู้ใช้งาน", exact: true })
    .click();
  await page.getByLabel("ชื่อผู้ใช้งาน").fill("Browser Staff");
  await page.getByLabel(/^อีเมล\s*\*?$/).fill("browser@demo.test");
  await page.getByLabel("รหัสผ่านเริ่มต้น").fill("Browser123!");
  await page.getByLabel("สาขา · P-STORE").selectOption("BKK-01");
  await page
    .getByRole("button", { name: "สร้างผู้ใช้งาน", exact: true })
    .click();
  await expect(
    page.getByText("browser@demo.test", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "จัดการ Browser Staff" }).click();
  await page
    .getByRole("button", { name: "แก้ไขชื่อ / อีเมล", exact: true })
    .click();
  await page.getByLabel("ชื่อผู้ใช้งาน").fill("Browser Edited");
  await page.getByRole("button", { name: "บันทึกข้อมูล", exact: true }).click();
  await expect(page.getByText("Browser Edited", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "จัดการ Browser Edited" }).click();
  await page.getByRole("button", { name: "ปิดใช้งาน", exact: true }).click();
  await page
    .getByRole("button", { name: "ยืนยันปิดใช้งาน", exact: true })
    .click();
  await expect(
    page.getByRole("row").filter({ hasText: "browser@demo.test" }),
  ).toContainText("ปิดใช้งาน");
  await page.getByRole("button", { name: "จัดการ Browser Edited" }).click();
  await page.getByRole("button", { name: "เปิดใช้งาน", exact: true }).click();
  await page
    .getByRole("button", { name: "ยืนยันเปิดใช้งาน", exact: true })
    .click();
  await page.getByRole("link", { name: "ตั้งค่าสิทธิ์", exact: true }).click();
  await page
    .getByRole("checkbox", { name: "STORE_STAFF บันทึกเสื้อผ้า", exact: true })
    .uncheck();
  await page.getByRole("button", { name: "บันทึกสิทธิ์", exact: true }).click();
  await expect(
    page.getByText("บันทึกสิทธิ์จำลองแล้ว มีผลในการทำรายการครั้งถัดไป"),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "ทบทวนการเข้าถึง", exact: true })
    .click();
  await expect(
    page.getByRole("row").filter({ hasText: "บันทึกเสื้อผ้า" }),
  ).toContainText("ไม่ให้สิทธิ์");
  await page
    .getByRole("link", { name: "จัดการผู้ใช้งาน", exact: true })
    .click();
  await page.getByRole("button", { name: "จัดการ Browser Edited" }).click();
  await page
    .getByRole("button", { name: "ออกลิงก์กู้รหัสผ่าน", exact: true })
    .click();
  await page.getByRole("button", { name: "สร้างลิงก์จำลอง" }).click();
  await page.getByRole("link", { name: "เปิดหน้าตั้งรหัสผ่านใหม่" }).click();
  await page.getByLabel(/^รหัสผ่านใหม่\s*\*?$/).fill("Recovered123!");
  await page.getByLabel("ยืนยันรหัสผ่านใหม่").fill("Recovered123!");
  await page
    .getByRole("button", { name: "ตั้งรหัสผ่านใหม่", exact: true })
    .click();
  await expect(
    page.getByText("ตั้งรหัสผ่านจำลองใหม่แล้ว ลิงก์นี้ใช้ซ้ำไม่ได้"),
  ).toBeVisible();
});
test("mobile self-service role, change password and denied direct route", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login");
  await page.getByRole("button", { name: "Head", exact: true }).click();
  await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "โปรไฟล์ของฉัน", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "เปลี่ยนรหัสผ่าน", exact: true })
    .click();
  await page.getByLabel("รหัสผ่านปัจจุบัน").fill("Demo1234!");
  await page.getByLabel(/^รหัสผ่านใหม่\s*\*?$/).fill("Changed123!");
  await page.getByLabel("ยืนยันรหัสผ่านใหม่").fill("Changed123!");
  await page
    .getByRole("button", { name: "เปลี่ยนรหัสผ่าน", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "ยินดีต้อนรับกลับ" }),
  ).toBeVisible();
  await page.getByLabel(/^อีเมล\s*\*?$/).fill("head@demo.test");
  await page.getByLabel(/^รหัสผ่าน\s*\*?$/).fill("Changed123!");
  await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "โปรไฟล์ของฉัน", exact: true }),
  ).toBeVisible();
  await page.goto("/garments");
  await expect(
    page.getByRole("alert").filter({ hasText: "ไม่มีสิทธิ์" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
});

test("responsive layouts and keyboard dialog focus", async ({
  page,
}, testInfo) => {
  await login(page);
  await expect(
    page.getByRole("heading", { name: "เสื้อผ้ารับคืน", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("desktop-list.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 820, height: 1180 });
  await page.getByRole("link", { name: "GR-0001", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "GR-0001", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("tablet-detail.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "เปิดเมนู" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Tab");
  expect(
    await page.evaluate(
      () => !!document.activeElement?.closest('[role="dialog"]'),
    ),
  ).toBeTruthy();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "เปิดเมนู" })).toBeFocused();
  await page.screenshot({
    path: testInfo.outputPath("mobile-detail.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
});
