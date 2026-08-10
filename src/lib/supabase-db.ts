import { supabase } from "./supabase";
import type { Player } from "./types";

export async function loadPlayers(): Promise<Player[]> {
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("[Marcolada] Erro ao carregar jogadores:", error);
    throw error;
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    nickname: row.nickname ?? undefined,
    photo: row.photo ?? undefined,
    position: row.position ?? undefined,
    number: row.number ?? undefined,
    rating: row.rating ?? 0,
  }));
}

export async function savePlayer(player: Player): Promise<void> {
  const { error } = await supabase
    .from("players")
    .upsert(
      {
        id: player.id,
        name: player.name,
        nickname: player.nickname ?? null,
        photo: player.photo ?? null,
        position: player.position ?? null,
        number: player.number ?? null,
        rating: player.rating ?? 0,
      },
      {
        onConflict: "id",
      },
    );

  if (error) {
    console.error("[Marcolada] Erro ao salvar jogador:", error);
    throw error;
  }
}

export async function updatePlayerRemote(player: Player): Promise<void> {
  await savePlayer(player);
}

export async function deletePlayerRemote(id: string): Promise<void> {
  const { error } = await supabase
    .from("players")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[Marcolada] Erro ao excluir jogador:", error);
    throw error;
  }
}
