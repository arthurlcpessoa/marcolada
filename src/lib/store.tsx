import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import {
  emptyDB,
  type DB,
  type Match,
  type Marcolada,
  type Player,
  type Team,
} from "./types";
import {
  deleteMarcoladaRemote,
  deletePlayerRemote,
  loadMarcoladas,
  loadPlayers,
  saveMarcolada,
  savePlayer,
} from "./supabase-db";

const KEY = "marcolada:v1";

/*
 * O localStorage é usado apenas para migrar marcoladas
 * antigas para o Supabase (uma única vez).
 * A fonte da verdade é o Supabase.
 */
function loadLocalMarcoladas(): DB["marcoladas"] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(KEY);

    if (!raw) return [];

    const parsed = JSON.parse(raw) as Partial<DB>;

    return parsed.marcoladas ?? [];
  } catch {
    return [];
  }
}



export const uid = () =>
  Math.random().toString(36).slice(2, 10);

type Ctx = {
  db: DB;
  hydrated: boolean;
  update: (
    fn: (db: DB) => DB,
    label?: string,
  ) => void;
  undo: () => void;
  canUndo: boolean;
  lastLabel: string | null;
  activeMarcolada: Marcolada | null;
  getMarcolada: (
    id: string,
  ) => Marcolada | undefined;
  updateMarcolada: (
    id: string,
    fn: (p: Marcolada) => Marcolada,
    label?: string,
  ) => void;
  deleteMarcolada: (id: string) => void;
  addPlayer: (
    p: Omit<Player, "id">,
  ) => Player;
  updatePlayer: (
    id: string,
    patch: Partial<Omit<Player, "id">>,
  ) => void;
  deletePlayer: (
    id: string,
  ) => Promise<void>;

};

const StoreContext =
  createContext<Ctx | null>(null);

export function StoreProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [db, setDb] =
    useState<DB>(emptyDB);

  const [hydrated, setHydrated] =
    useState(false);

  const history = useRef<
    { db: DB; label: string }[]
  >([]);

  const [stack, setStack] =
    useState<string[]>([]);

  /*
   * Hidratação: jogadores E marcoladas vêm do Supabase
   * (fonte única da verdade). Marcoladas que ainda estavam
   * apenas no localStorage são migradas uma única vez.
   */
  const saved = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      try {
        const [remotePlayers, remoteMarcoladas] =
          await Promise.all([
            loadPlayers(),
            loadMarcoladas(),
          ]);

        if (cancelled) return;

        // Migração única do localStorage → Supabase
        const locals = loadLocalMarcoladas();
        const missing = locals.filter(
          (l) =>
            !remoteMarcoladas.some(
              (r) => r.id === l.id,
            ),
        );

        for (const m of missing) {
          try {
            await saveMarcolada(m);
            remoteMarcoladas.push(m);
          } catch (error) {
            console.error(
              "[Marcolada] Falha ao migrar marcolada para o Supabase:",
              error,
            );
          }
        }

        if (locals.length) {
          try {
            window.localStorage.removeItem(KEY);
          } catch {
            /* noop */
          }
        }

        if (cancelled) return;

        const list = remoteMarcoladas.sort(
          (a, b) => b.createdAt - a.createdAt,
        );

        saved.current = new Map(
          list.map((m) => [
            m.id,
            JSON.stringify(m),
          ]),
        );

        setDb({
          marcoladas: list,
          players: remotePlayers,
        });
      } catch (error) {
        console.error(
          "[Marcolada] Não foi possível carregar dados do Supabase:",
          error,
        );

        if (!cancelled) {
          setDb({
            marcoladas: [],
            players: [],
          });
        }
      } finally {
        if (!cancelled) {
          setHydrated(true);
        }
      }
    }

    hydrate();

    return () => {
      cancelled = true;
    };
  }, []);


  /*
   * Autosave: grava no Supabase apenas as marcoladas
   * que realmente mudaram (com debounce).
   */
  useEffect(() => {
    if (!hydrated) return;

    const timer = setTimeout(() => {
      db.marcoladas.forEach((m) => {
        const snapshot = JSON.stringify(m);

        if (saved.current.get(m.id) === snapshot) return;

        saved.current.set(m.id, snapshot);

        saveMarcolada(m).catch((error) => {
          saved.current.delete(m.id);
          console.error(
            "[Marcolada] Erro ao salvar marcolada:",
            error,
          );
        });
      });
    }, 700);

    return () => clearTimeout(timer);
  }, [db.marcoladas, hydrated]);



  const update = useCallback(
    (
      fn: (d: DB) => DB,
      label?: string,
    ) => {
      setDb((prev) => {
        if (label) {
          history.current = [
            ...history.current.slice(-19),
            {
              db: prev,
              label,
            },
          ];

          setStack(
            history.current.map(
              (h) => h.label,
            ),
          );
        }

        return fn(prev);
      });
    },
    [],
  );

  const undo = useCallback(() => {
    const last =
      history.current.pop();

    setStack(
      history.current.map(
        (h) => h.label,
      ),
    );

    if (last) {
      setDb(last.db);
    }
  }, []);

  const updateMarcolada =
    useCallback(
      (
        id: string,
        fn: (
          p: Marcolada,
        ) => Marcolada,
        label?: string,
      ) => {
        update(
          (d) => ({
            ...d,
            marcoladas:
              d.marcoladas.map(
                (p) =>
                  p.id === id
                    ? fn(p)
                    : p,
              ),
          }),
          label,
        );
      },
      [update],
    );

  const deleteMarcolada =
    useCallback(
      (id: string) => {
        update(
          (d) => ({
            ...d,
            marcoladas:
              d.marcoladas.filter(
                (p) => p.id !== id,
              ),
          }),
          "Excluir marcolada",
        );

        saved.current.delete(id);

        deleteMarcoladaRemote(id).catch(
          (error) => {
            console.error(
              "[Marcolada] Erro ao excluir marcolada:",
              error,
            );
          },
        );
      },
      [update],
    );


  /*
   * Criação explícita do usuário:
   * grava no Supabase e reflete localmente.
   */
  const addPlayer = useCallback(
    (
      p: Omit<Player, "id">,
    ) => {
      const player: Player = {
        ...p,
        id: uid(),
      };

      update((d) => ({
        ...d,
        players: [
          ...d.players,
          player,
        ],
      }));

      savePlayer(player).catch(
        (error) => {
          console.error(
            "[Marcolada] Erro ao salvar jogador:",
            error,
          );
        },
      );

      return player;
    },
    [update],
  );

  const updatePlayer =
    useCallback(
      (
        id: string,
        patch: Partial<
          Omit<Player, "id">
        >,
      ) => {
        let updated: Player | null =
          null;

        update((d) => ({
          ...d,
          players:
            d.players.map(
              (p) => {
                if (p.id !== id)
                  return p;

                updated = {
                  ...p,
                  ...patch,
                };

                return updated;
              },
            ),
        }));

        setTimeout(() => {
          if (updated) {
            savePlayer(
              updated,
            ).catch((error) => {
              console.error(
                "[Marcolada] Erro ao atualizar jogador:",
                error,
              );
            });
          }
        }, 0);
      },
      [update],
    );

  /*
   * Exclusão: DELETE no Supabase primeiro,
   * estado local só muda após sucesso.
   */
  const deletePlayer =
    useCallback(
      async (id: string) => {
        await deletePlayerRemote(id);

        update((d) => ({
          ...d,
          players: d.players.filter(
            (p) => p.id !== id,
          ),
          marcoladas:
            d.marcoladas.map((m) =>
              m.status === "active"
                ? {
                    ...m,
                    rosterIds:
                      m.rosterIds.filter(
                        (x) => x !== id,
                      ),
                    teams: m.teams.map(
                      (t) => ({
                        ...t,
                        playerIds:
                          t.playerIds.filter(
                            (x) =>
                              x !== id,
                          ),
                      }),
                    ),
                  }
                : m,
            ),
        }));
      },
      [update],
    );


  const value = useMemo<Ctx>(
    () => ({
      db,
      hydrated,
      update,
      undo,
      canUndo:
        stack.length > 0,
      lastLabel:
        stack[
          stack.length - 1
        ] ?? null,

      activeMarcolada:
        db.marcoladas.find(
          (p) =>
            p.status ===
            "active",
        ) ?? null,

      getMarcolada: (
        id: string,
      ) =>
        db.marcoladas.find(
          (p) => p.id === id,
        ),

      updateMarcolada,
      deleteMarcolada,
      addPlayer,
      updatePlayer,
      deletePlayer,
    }),
    [
      db,
      hydrated,
      update,
      undo,
      stack,
      updateMarcolada,
      deleteMarcolada,
      addPlayer,
      updatePlayer,
      deletePlayer,
    ],

  );

  return (
    <StoreContext.Provider
      value={value}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx =
    useContext(StoreContext);

  if (!ctx) {
    throw new Error(
      "useStore precisa estar dentro de StoreProvider",
    );
  }

  return ctx;
}

export function usePlayers(
  ids: string[],
) {
  const { db } = useStore();

  return useMemo(
    () =>
      ids
        .map((id) =>
          db.players.find(
            (p) => p.id === id,
          ),
        )
        .filter(
          Boolean,
        ) as Player[],
    [db.players, ids],
  );
}

export function newTeam(
  name: string,
  color: string,
): Team {
  return {
    id: uid(),
    name,
    color,
    playerIds: [],
  };
}

export function newMatch(
  number: number,
  teamA: Team,
  teamB: Team,
  lineups?: {
    a: string[];
    b: string[];
  },
): Match {
  return {
    id: uid(),
    number,
    teamAId: teamA.id,
    teamBId: teamB.id,

    lineups: {
      [teamA.id]: [
        ...(lineups?.a ??
          teamA.playerIds),
      ],

      [teamB.id]: [
        ...(lineups?.b ??
          teamB.playerIds),
      ],
    },


    goals: [],

    adjust: {
      a: 0,
      b: 0,
    },

    status: "live",
    startedAt: Date.now(),
    elapsed: 0,
    runningSince:
      Date.now(),
  };
}
