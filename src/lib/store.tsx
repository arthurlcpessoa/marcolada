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
  deletePlayerRemote,
  loadPlayers,
  savePlayer,
} from "./supabase-db";

const KEY = "marcolada:v1";

/*
 * O localStorage guarda APENAS as marcoladas
 * (elas ainda não existem no Supabase).
 * Jogadores vêm exclusivamente do Supabase.
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
   * Hidratação:
   * - marcoladas: localStorage
   * - jogadores: SOMENTE Supabase (fonte única da verdade)
   *
   * Nada é recriado, inserido ou mesclado
   * automaticamente aqui.
   */
  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      const marcoladas =
        loadLocalMarcoladas();

      try {
        const remotePlayers =
          await loadPlayers();

        if (cancelled) return;

        setDb({
          marcoladas,
          players: remotePlayers,
        });
      } catch (error) {
        console.error(
          "[Marcolada] Não foi possível carregar jogadores do Supabase:",
          error,
        );

        if (!cancelled) {
          setDb({
            marcoladas,
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
   * localStorage guarda apenas as marcoladas.
   * Jogadores NÃO são persistidos localmente
   * para nunca "ressuscitarem" após um DELETE
   * feito no Supabase.
   */
  useEffect(() => {
    if (!hydrated) return;

    try {
      window.localStorage.setItem(
        KEY,
        JSON.stringify({
          marcoladas: db.marcoladas,
        }),
      );
    } catch {
      /* quota */
    }
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
      },
      [update],
    );

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
        update((d) => ({
          ...d,
          players:
            d.players.map(
              (p) =>
                p.id === id
                  ? {
                      ...p,
                      ...patch,
                    }
                  : p,
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
