import { expect, test } from "@playwright/test";
import { mockSupabaseMembers, resetClientStorage } from "./helpers/supabase-mock";

test.describe("Security and injection scenarios", () => {
    test.beforeEach(async ({ page }) => {
        await resetClientStorage(page);
    });

    test("renders XSS payload as text without execution", async ({ page }) => {
        let dialogOpened = false;
        page.on("dialog", () => {
            dialogOpened = true;
        });

        await mockSupabaseMembers(page, { initialMembers: [] });
        await page.goto("/");

        const payload = "<script>window.__xss=1</script>";

        await page.getByPlaceholder("Enter full name").fill(payload);
        await page.getByPlaceholder("5XXXXXXXX").fill("501010101");
        await page.getByRole("button", { name: /Add Member/i }).click();

        await expect(page.getByText("Member added successfully")).toBeVisible();
        await expect(page.getByText(/window\.__xss=1/)).toBeVisible();
        expect(dialogOpened).toBe(false);

        const xssFlag = await page.evaluate(() => (window as unknown as { __xss?: number }).__xss);
        expect(xssFlag).toBeUndefined();
    });

    test("treats SQL injection-like payload as plain text", async ({ page }) => {
        await mockSupabaseMembers(page, { initialMembers: [] });
        await page.goto("/");

        const payload = "' OR 1=1 --";

        await page.getByPlaceholder("Enter full name").fill(payload);
        await page.getByPlaceholder("5XXXXXXXX").fill("502020202");
        await page.getByRole("button", { name: /Add Member/i }).click();

        await expect(page.getByText(payload)).toBeVisible();
    });

    test("phone input strips non-digit injection characters", async ({ page }) => {
        await mockSupabaseMembers(page, { initialMembers: [] });
        await page.goto("/");

        const phoneInput = page.getByPlaceholder("5XXXXXXXX");
        await phoneInput.fill("50a1' OR '1'='1");

        const sanitized = await phoneInput.inputValue();
        expect(sanitized).toMatch(/^\d+$/);
    });

    test("survives localStorage tampering", async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.setItem("lang_preference", "hacked-lang");
            localStorage.setItem("theme_preference", "hacked-theme");
            localStorage.setItem("wa_preference", "hacked-wa");
        });

        await mockSupabaseMembers(page, { initialMembers: [] });
        await page.goto("/");

        await expect(page.getByText("GymConnect")).toBeVisible();
        await expect.poll(async () => page.evaluate(() => document.documentElement.dir)).toBe("ltr");
    });
});
