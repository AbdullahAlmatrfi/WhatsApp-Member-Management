import { expect, test } from "@playwright/test";
import { buildMember, mockSupabaseMembers, resetClientStorage } from "./helpers/supabase-mock";

test.describe("Database and API failure states", () => {
    test.beforeEach(async ({ page }) => {
        await resetClientStorage(page);
    });

    test("shows load failure when select fails", async ({ page }) => {
        await mockSupabaseMembers(page, {
            failLoad: true,
        });

        await page.goto("/");
        await expect(page.getByText(/Could not load members/i)).toBeVisible();
    });

    test("shows add failure when insert fails", async ({ page }) => {
        await mockSupabaseMembers(page, {
            initialMembers: [],
            failInsert: true,
        });

        await page.goto("/");

        await page.getByPlaceholder("Enter full name").fill("Nasser");
        await page.getByPlaceholder("5XXXXXXXX").fill("501234567");
        await page.getByRole("button", { name: /Add Member/i }).click();

        await expect(page.getByText(/Could not add member/i)).toBeVisible();
    });

    test("shows delete failure when delete is denied", async ({ page }) => {
        await mockSupabaseMembers(page, {
            initialMembers: [buildMember("1", "Saad", "966544444444")],
            failDelete: true,
        });

        await page.goto("/");

        await page.getByRole("button", { name: /Delete Saad/i }).click({ force: true });
        await page.getByRole("button", { name: "Delete", exact: true }).click();

        await expect(page.getByText(/Could not delete member/i)).toBeVisible();
        await expect(page.getByRole("button", { name: /Delete Saad/i })).toBeVisible();
    });

    test("handles database duplicate conflict code 23505", async ({ page }) => {
        await mockSupabaseMembers(page, {
            initialMembers: [],
            forceDuplicateOnInsert: true,
        });

        await page.goto("/");

        await page.getByPlaceholder("Enter full name").fill("Yousef");
        await page.getByPlaceholder("5XXXXXXXX").fill("509999999");
        await page.getByRole("button", { name: /Add Member/i }).click();

        await expect(page.getByText("Number already exists")).toBeVisible();
    });
});
