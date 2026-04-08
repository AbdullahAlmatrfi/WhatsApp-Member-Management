"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import type { Member } from "@/lib/types";

interface MutationResult {
    ok: boolean;
    duplicate?: boolean;
    message?: string;
}

const MEMBERS_TABLE = "members" as const;

function getErrorMessage(error: unknown) {
    if (error instanceof Error) {
        return error.message;
    }
    return "Unknown error";
}

export function useMembers() {
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchMembers = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const supabase = getSupabaseClient();
            const { data, error: queryError } = await supabase
                .from(MEMBERS_TABLE)
                .select("id, name, phone, created_at")
                .order("created_at", { ascending: false });

            if (queryError) {
                throw queryError;
            }

            setMembers(data || []);
        } catch (fetchError) {
            setError(getErrorMessage(fetchError));
            setMembers([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void fetchMembers();
    }, [fetchMembers]);

    const addMember = useCallback(
        async (name: string, phone: string): Promise<MutationResult> => {
            const normalizedPhone = phone.startsWith("966") ? phone : `966${phone}`;

            const duplicateInState = members.some((member) => member.phone === normalizedPhone);
            if (duplicateInState) {
                return { ok: false, duplicate: true };
            }

            try {
                const supabase = getSupabaseClient();
                const { data, error: insertError } = await supabase
                    .from(MEMBERS_TABLE)
                    .insert({ name, phone: normalizedPhone })
                    .select("id, name, phone, created_at")
                    .single();

                if (insertError) {
                    if (insertError.code === "23505") {
                        return { ok: false, duplicate: true };
                    }
                    throw insertError;
                }

                if (data) {
                    setMembers((prev) => [data, ...prev]);
                }

                return { ok: true };
            } catch (insertError) {
                return {
                    ok: false,
                    message: getErrorMessage(insertError),
                };
            }
        },
        [members]
    );

    const deleteMember = useCallback(async (id: string): Promise<MutationResult> => {
        try {
            const supabase = getSupabaseClient();
            const { error: deleteError } = await supabase.from(MEMBERS_TABLE).delete().eq("id", id);

            if (deleteError) {
                throw deleteError;
            }

            setMembers((prev) => prev.filter((member) => member.id !== id));
            return { ok: true };
        } catch (deleteError) {
            return {
                ok: false,
                message: getErrorMessage(deleteError),
            };
        }
    }, []);

    return {
        members,
        loading,
        error,
        refreshMembers: fetchMembers,
        addMember,
        deleteMember,
    };
}
