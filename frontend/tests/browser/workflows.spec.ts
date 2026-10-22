import { test, expect, type Page } from "@playwright/test";
async function login(page: Page, role = "Staff") {
  await page.goto("/login");
  await page.getByRole("button", { name: role, exact: true }).click();
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Sign out", exact: true }),
  ).toBeVisible();
}
test("Staff confirms an override and retrieves read-only record after a new login", async ({
  page,
}) => {
  await login(page);
  await page.getByRole("link", { name: "Record a garment", exact: true }).click();
  await page.getByLabel("Garment type").fill("Browser test shirt");
  await page.getByLabel(/^Material\s*\*?$/).fill("Cotton");
  await page.getByLabel("Weight (kilograms)").fill("0.3");
  await page.getByRole("button", { name: "Save and assess" }).click();
  await expect(page.getByRole("heading", { name: /GR-0005/ })).toBeVisible();
  await page.getByRole("button", { name: /GOOD Good/ }).click();
  await page
    .getByRole("button", { name: "Save assessment", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Direct resale candidate", exact: true }),
  ).toBeVisible();
  await page.getByRole("radio", { name: "Third-party contractor" }).check();
  await expect(
    page.getByRole("button", { name: "Override and confirm" }),
  ).toBeDisabled();
  await page.getByLabel("Reason for changing the route").fill("Further sorting");
  await page.getByRole("button", { name: "Override and confirm" }).click();
  await page
    .getByRole("button", { name: "Confirm decision", exact: true })
    .click();
  await expect(
    page.getByText(
      "Confirmed. Condition, evidence, and route are read-only.",
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await login(page);
  await page.getByRole("link", { name: "GR-0005", exact: true }).click();
  await expect(
    page.getByText("Further sorting", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /GOOD Good/ }),
  ).toBeDisabled();
});
test("damaged garment requires evidence and handles upload rejection then image preview", async ({
  page,
}) => {
  await login(page);
  await page.getByRole("link", { name: "GR-0001", exact: true }).click();
  await page.getByRole("button", { name: /DAMAGED Damaged/ }).click();
  await page
    .getByRole("button", { name: "Save assessment", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Confirm recommendation", exact: true }),
  ).toBeDisabled();
  await page.getByLabel("Choose evidence image").setInputFiles({
    name: "invalid.png",
    mimeType: "image/png",
    buffer: Buffer.from("invalid"),
  });
  await expect(
    page.getByRole("alert").filter({ hasText: "not a supported image" }),
  ).toBeVisible();
  await page.getByLabel("Choose evidence image").setInputFiles({
    name: "evidence.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await page.getByRole("button", { name: /evidence.png/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Close" }).click();
  await expect(
    page.getByRole("button", { name: "Confirm recommendation", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Confirm recommendation", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirm decision", exact: true })
    .click();
  await expect(
    page.getByText(
      "Confirmed. Condition, evidence, and route are read-only.",
    ),
  ).toBeVisible();
});
test("Admin creates Staff, edits, changes status, reviews permissions and recovery", async ({
  page,
}) => {
  await login(page, "Admin");
  await page
    .getByRole("button", { name: "Add User", exact: true })
    .click();
  await page.getByLabel("Name").fill("Browser Staff");
  await page.getByLabel(/^Email\s*\*?$/).fill("browser@demo.test");
  await page.getByLabel("Initial Password").fill("Browser123!");
  await page
    .getByRole("button", { name: "Create User", exact: true })
    .click();
  await expect(
    page.getByText("browser@demo.test", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Manage Browser Staff" }).click();
  await page
    .getByRole("button", { name: "Edit name / email", exact: true })
    .click();
  await page.getByLabel("Name").fill("Browser Edited");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Browser Edited", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Manage Browser Edited" }).click();
  await page.getByRole("button", { name: "Disable", exact: true }).click();
  await page
    .getByRole("button", { name: "Confirm disable", exact: true })
    .click();
  await expect(
    page.getByRole("row").filter({ hasText: "browser@demo.test" }),
  ).toContainText("Disabled");
  await page.getByRole("button", { name: "Manage Browser Edited" }).click();
  await page.getByRole("button", { name: "Reactivate", exact: true }).click();
  await page
    .getByRole("button", { name: "Confirm reactivation", exact: true })
    .click();
  await page.getByRole("link", { name: "Permissions", exact: true }).click();
  await page
    .getByRole("checkbox", { name: "STORE_STAFF Record a garment", exact: true })
    .uncheck();
  await page.getByRole("button", { name: "Save permissions", exact: true }).click();
  await expect(
    page.getByText("Permissions saved. They apply on the next request."),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Access review", exact: true })
    .click();
  await expect(
    page.getByRole("row").filter({ hasText: "Record a garment" }),
  ).toContainText("Not granted");
  await page
    .getByRole("link", { name: "User management", exact: true })
    .click();
  await page.getByRole("button", { name: "Manage Browser Edited" }).click();
  await page
    .getByRole("button", { name: "Issue recovery link", exact: true })
    .click();
  await page.getByRole("button", { name: "Create recovery link" }).click();
  await page.getByRole("link", { name: "Open reset password page" }).click();
  await page.getByLabel(/^New password\s*\*?$/).fill("Recovered123!");
  await page.getByLabel("Confirm new password").fill("Recovered123!");
  await page
    .getByRole("button", { name: "Set new password", exact: true })
    .click();
  await expect(
    page.getByText("The password was changed. This link cannot be used again."),
  ).toBeVisible();
});
test("mobile self-service role, change password and denied direct route", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login");
  await page.getByRole("button", { name: "Head", exact: true }).click();
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "My profile", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Change password", exact: true })
    .click();
  await page.getByLabel("Current password").fill("Demo1234!");
  await page.getByLabel(/^New password\s*\*?$/).fill("Changed123!");
  await page.getByLabel("Confirm new password").fill("Changed123!");
  await page
    .getByRole("button", { name: "Change password", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Welcome back" }),
  ).toBeVisible();
  await page.getByLabel(/^Email\s*\*?$/).fill("head@demo.test");
  await page.getByLabel(/^Password\s*\*?$/).fill("Changed123!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "My profile", exact: true }),
  ).toBeVisible();
  await page.goto("/garments");
  await expect(
    page.getByRole("alert").filter({ hasText: "do not have access" }),
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
    page.getByRole("heading", { name: "Returned garments", exact: true }),
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
  await page.getByRole("button", { name: "Open menu" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Tab");
  expect(
    await page.evaluate(
      () => !!document.activeElement?.closest('[role="dialog"]'),
    ),
  ).toBeTruthy();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Open menu" })).toBeFocused();
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
