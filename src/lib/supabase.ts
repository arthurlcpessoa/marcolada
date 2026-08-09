import { createClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase do navegador.
 * Usa apenas credenciais públicas (URL + publishable key) expostas via VITE_*.
 * NUNCA use service_role / secret key aqui.
 */
const SUPABASE_URL = import.meta.env["VITE_SUPABASE_URL"] as string | undefined;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as
  | string
  | undefined;

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);

export const supabase = createClient(SUPABASE_URL ?? "", SUPABASE_PUBLISHABLE_KEY ?? "", {
  auth: { persistSession: true, autoRefreshToken: true },
});

export type SupabaseHealth = {
  ok: boolean;
  url: string | undefined;
  detail: string;
};

/** Ping simples: valida URL + chave sem depender de nenhuma tabela. */
export async function checkSupabaseConnection(): Promise<SupabaseHealth> {
  if (!isSupabaseConfigured) {
    return { ok: false, url: SUPABASE_URL, detail: "Variáveis VITE_SUPABASE_* ausentes." };
  }
  try {
    const { error } = await supabase.auth.getSession();
    if (error) return { ok: false, url: SUPABASE_URL, detail: error.message };

    const res = await fetch(`${SUPABASE_URL}/auth/v1/health`, {
      headers: { apikey: SUPABASE_PUBLISHABLE_KEY as string },
    });
    if (!res.ok) {
      return { ok: false, url: SUPABASE_URL, detail: `HTTP ${res.status} em /auth/v1/health` };
    }
    return { ok: true, url: SUPABASE_URL, detail: "Conexão estabelecida com sucesso." };
  } catch (e) {
    return { ok: false, url: SUPABASE_URL, detail: e instanceof Error ? e.message : String(e) };
  }
}
