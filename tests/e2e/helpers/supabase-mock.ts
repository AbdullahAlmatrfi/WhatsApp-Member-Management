import type { Page, Route } from "@playwright/test";

export interface MemberRecord {
    id: string;
    name: string;
    phone: string;
    created_at: string;
}

export interface MockApiOptions {
    initialMembers?: MemberRecord[];
    failLoad?: boolean;
    failInsert?: boolean;
    failDelete?: boolean;
    forceDuplicateOnInsert?: boolean;
}

export function buildMember(id: string, name: string, phone: string): MemberRecord {
    return {
        id,
        name,
        phone,
        created_at: new Date().toISOString(),
    };
}

function parseJsonOrEmpty(input: string | null): Record<string, unknown> {
    if (!input) {
        return {};
    }

    try {
        return JSON.parse(input) as Record<string, unknown>;
    } catch {
        return {};
    }
}

export async function mockSupabaseMembers(page: Page, options: MockApiOptions = {}) {
    let members = [...(options.initialMembers ?? [])];

    await page.route(/\/rest\/v1\/members(?:\?.*)?$/, async (route: Route) => {
        const request = route.request();
        const method = request.method();
        const requestUrl = new URL(request.url());

        if (method === "GET") {
            if (options.failLoad) {
                await route.fulfill({
                    status: 500,
                    contentType: "application/json",
                    body: JSON.stringify({ message: "select blocked by policy" }),
                });
                return;
            }

            await route.fulfill({
                status: 200,
                contentType: "application/json",
                body: JSON.stringify(members),
            });
            return;
        }

        if (method === "POST") {
            if (options.failInsert) {
                await route.fulfill({
                    status: 500,
                    contentType: "application/json",
                    body: JSON.stringify({ message: "insert blocked by policy" }),
                });
                return;
            }

            const payload = parseJsonOrEmpty(request.postData());
            const name = String(payload.name ?? "");
            const phone = String(payload.phone ?? "");

            if (options.forceDuplicateOnInsert || members.some((member) => member.phone === phone)) {
                await route.fulfill({
                    status: 409,
                    contentType: "application/json",
                    body: JSON.stringify({
                        code: "23505",
                        message: "duplicate key value violates unique constraint",
                    }),
                });
                return;
            }

            const inserted = {
                id: `id-${Date.now()}`,
                name,
                phone,
                created_at: new Date().toISOString(),
            } satisfies MemberRecord;

            members = [inserted, ...members];

            const accepts = request.headers()["accept"] ?? "";
            const responseBody = accepts.includes("vnd.pgrst.object+json") ? inserted : [inserted];

            await route.fulfill({
                status: 201,
                contentType: "application/json",
                body: JSON.stringify(responseBody),
            });
            return;
        }

        if (method === "DELETE") {
            if (options.failDelete) {
                await route.fulfill({
                    status: 500,
                    contentType: "application/json",
                    body: JSON.stringify({ message: "delete blocked by policy" }),
                });
                return;
            }

            const idFilter = requestUrl.searchParams.get("id");
            const id = idFilter?.startsWith("eq.") ? idFilter.slice(3) : idFilter;

            if (id) {
                members = members.filter((member) => member.id !== id);
            }

            await route.fulfill({
                status: 204,
                body: "",
            });
            return;
        }

        await route.fallback();
    });

    return {
        getMembers: () => members,
    };
}

export async function resetClientStorage(page: Page) {
    await page.addInitScript(() => {
        const resetKey = "__e2e_local_storage_cleared";
        if (!sessionStorage.getItem(resetKey)) {
            localStorage.clear();
            sessionStorage.setItem(resetKey, "true");
        }
    });
}
