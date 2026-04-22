import { expect, test } from "@playwright/test";
import { buildMember, mockSupabaseMembers, resetClientStorage } from "./helpers/supabase-mock";

test.describe("Functional flows", () => {
    test.beforeEach(async ({ page }) => {
        await resetClientStorage(page);
    });

    test("loads members and supports search states", async ({ page }) => {
        await mockSupabaseMembers(page, {
            initialMembers: [
                buildMember("1", "Mohammed Al-Rashid", "966501234567"),
                buildMember("2", "Abdullah Al-Saud", "966559876543"),
            ],
        });

        await page.goto("/");

        await expect(page.getByText("Mohammed Al-Rashid")).toBeVisible();
        await expect(page.getByText("Abdullah Al-Saud")).toBeVisible();

        await page.getByPlaceholder("Search by name or number...").fill("Abdullah");
        await expect(page.getByText("Abdullah Al-Saud")).toBeVisible();
        await expect(page.getByText("Mohammed Al-Rashid")).not.toBeVisible();

        await page.getByPlaceholder("Search by name or number...").fill("no-match");
        await expect(page.getByText("No members found matching your search.")).toBeVisible();
    });

    test("adds member, normalizes phone, and prevents duplicate", async ({ page }) => {
        const mock = await mockSupabaseMembers(page, {
            initialMembers: [],
        });

        await page.goto("/");

        await page.getByPlaceholder("Enter full name").fill("Ali Al-Harbi");
        await page.getByPlaceholder("5XXXXXXXX").fill("501234567");
        await page.getByRole("button", { name: /Add Member/i }).click();

        await expect(page.getByText("Member added successfully")).toBeVisible();
        await expect(page.getByText("Ali Al-Harbi")).toBeVisible();

        const created = mock.getMembers()[0];
        expect(created.phone).toBe("966501234567");

        await page.getByPlaceholder("Enter full name").fill("Ali Al-Harbi");
        await page.getByPlaceholder("5XXXXXXXX").fill("501234567");
        await page.getByRole("button", { name: /Add Member/i }).click();

        await expect(page.getByText("Number already exists")).toBeVisible();
    });

    test("delete flow supports cancel and confirm", async ({ page }) => {
        await mockSupabaseMembers(page, {
            initialMembers: [buildMember("1", "Khalid Al-Fahad", "966541112233")],
        });

        await page.goto("/");

        await page.getByRole("button", { name: /Delete Khalid Al-Fahad/i }).click({ force: true });
        await expect(page.getByText("Delete Member?")).toBeVisible();

        await page.getByRole("button", { name: "Cancel" }).click();
        await expect(page.getByText("Delete Member?")).not.toBeVisible();

        await page.getByRole("button", { name: /Delete Khalid Al-Fahad/i }).click({ force: true });
        await page.getByRole("button", { name: "Delete", exact: true }).click();

        await expect(page.getByText("Member deleted")).toBeVisible();
        await expect(page.getByText("Khalid Al-Fahad")).not.toBeVisible();
    });

    test("settings persist theme and language across refresh", async ({ page }) => {
        await mockSupabaseMembers(page, {
            initialMembers: [buildMember("1", "Member One", "966500000001")],
        });

        await page.goto("/");

        await page.getByRole("button", { name: "Settings", exact: true }).click();
        await page.getByRole("button", { name: /Light/i }).click();

        await expect
            .poll(async () => page.evaluate(() => document.documentElement.classList.contains("light")))
            .toBe(true);

        await page.getByRole("button", { name: /العربية/ }).click();

        await expect.poll(async () => page.evaluate(() => document.documentElement.dir)).toBe("rtl");

        await page.reload();
        await expect.poll(async () => page.evaluate(() => document.documentElement.dir)).toBe("rtl");
        await expect
            .poll(async () => page.evaluate(() => document.documentElement.classList.contains("light")))
            .toBe(true);
    });

    test("whatsapp web mode opens correct link", async ({ page }) => {
        await page.addInitScript(() => {
            (window as unknown as { __openCalls: unknown[] }).__openCalls = [];
            window.open = (...args: unknown[]) => {
                (window as unknown as { __openCalls: unknown[] }).__openCalls.push(args);
                return null;
            };
        });

        await mockSupabaseMembers(page, {
            initialMembers: [buildMember("1", "Faisal", "966500000123")],
        });

        await page.goto("/");
        await page.getByRole("button", { name: /Message Faisal on WhatsApp/i }).click();

        const openCalls = await page.evaluate(() => (window as unknown as { __openCalls: unknown[] }).__openCalls);
        expect(openCalls).toHaveLength(1);
        const firstCall = openCalls[0] as unknown[];
        expect(String(firstCall[0])).toContain("https://web.whatsapp.com/send?phone=966500000123");
    });
});
