import { createClient } from "@supabase/supabase-js";

export type Database = {
    public: {
        Tables: {
            members: {
                Row: {
                    id: string;
                    name: string;
                    phone: string;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    name: string;
                    phone: string;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    name?: string;
                    phone?: string;
                    created_at?: string;
                };
                Relationships: [];
            };
        };
        Views: Record<string, never>;
        Functions: Record<string, never>;
        Enums: Record<string, never>;
        CompositeTypes: Record<string, never>;
    };
};

let cachedClient: ReturnType<typeof createClient<Database>> | null = null;

export function getSupabaseClient() {
    if (cachedClient) {
        return cachedClient;
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error("Missing Supabase environment variables.");
    }

    cachedClient = createClient<Database>(supabaseUrl, supabaseAnonKey);
    return cachedClient;
}
