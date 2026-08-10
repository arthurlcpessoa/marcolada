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
  hasData,
  loadDBFromSupabase,
  syncDBDiff,
} from "./supabase-db";
import {
  isSupabaseConfigured,
  supabase,
} from "./supabase";

const KEY = "marcolada:v1";
const MIGRATION_KEY = "marcolada:supabase-migrated:v2";

function loadLocal(): DB {
  if (typeof window === "undefined") return emptyDB;

  try {
    const raw = window.localStorage.getItem(KEY);

    if (!raw) return emptyDB;

    const parsed = JSON.parse(raw) as DB;

    return {
      players: parsed.players ?? [],
      marcoladas: parsed.marcoladas ?? [],
    };
  } catch {
    return emptyDB;
  }
}

function saveLocal(db: DB) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(KEY, JSON.stringify(db));
  } catch {
    /* quota */
  }
}

function sameDB(a: DB, b: DB) {
  return JSON.stringify(a) === JSON.stringify(b);
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
};

const StoreContext = createContext<Ctx | null>(null);

export function StoreProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [db, setDb] = useState<DB>(emptyDB);
  const [hydrated, setHydrated] =
    useState(false);

  const history = useRef<
    { db: DB; label: string }[]
  >([]);

  const [stack, setStack] =
    useState<string[]>([]);

  /*
   * Guarda qual versão do estado já foi
   * sincronizada com o Supabase.
   */
  const syncedDB = useRef<DB>(emptyDB);

  /*
   * Serializa gravações para evitar que
   * duas alterações concorrentes se
   * atropelhem.
   */
  const syncQueue = useRef<
    Promise<void>
  >(Promise.resolve());

  /*
   * Inicialização:
   *
   * 1. lê o localStorage;
   * 2. busca o Supabase;
   * 3. se Supabase tiver dados, ele vence;
   * 4. se Supabase estiver vazio e houver
   *    dados antigos locais, migra uma vez;
   * 5. localStorage continua como cache.
   */
  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      const localDB = loadLocal();

      if (!isSupabaseConfigured) {
        if (cancelled) return;

        syncedDB.current = localDB;
        setDb(localDB);
        setHydrated(true);

        return;
      }

      try {
        const remoteDB =
          await loadDBFromSupabase();

        if (cancelled) return;

        if (hasData(remoteDB)) {
          syncedDB.current = remoteDB;

          setDb(remoteDB);
          saveLocal(remoteDB);

          try {
            window.localStorage.setItem(
              MIGRATION_KEY,
              "1",
            );
          } catch {
            /* ignore */
          }

          setHydrated(true);

          return;
        }

        const alreadyMigrated =
          window.localStorage.getItem(
            MIGRATION_KEY,
          ) === "1";

        if (
          hasData(localDB) &&
          !alreadyMigrated
        ) {
          await syncDBDiff(
            emptyDB,
            localDB,
          );

          if (cancelled) return;

          syncedDB.current = localDB;

          try {
            window.localStorage.setItem(
              MIGRATION_KEY,
              "1",
            );
          } catch {
            /* ignore */
          }

          setDb(localDB);
          saveLocal(localDB);
          setHydrated(true);

          return;
        }

        syncedDB.current = remoteDB;
        setDb(remoteDB);
        saveLocal(remoteDB);
        setHydrated(true);
      } catch (error) {
        console.error(
          "[Marcolada] Falha ao carregar Supabase. Usando cache local:",
          error,
        );

        if (cancelled) return;

        syncedDB.current = localDB;
        setDb(localDB);
        setHydrated(true);
      }
    }

    hydrate();

    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * Toda alteração continua sendo salva
   * localmente, mas também é enviada para
   * o Supabase.
   */
  useEffect(() => {
    if (!hydrated) return;

    saveLocal(db);

    if (!isSupabaseConfigured) return;

    const previous =
      syncedDB.current;

    if (sameDB(previous, db)) return;

    const next = db;

    syncQueue.current =
      syncQueue.current
        .then(async () => {
          await syncDBDiff(
            previous,
            next,
          );

          syncedDB.current = next;
        })
        .catch((error) => {
          console.error(
            "[Marcolada] Erro ao sincronizar com Supabase:",
            error,
          );
        });
  }, [db, hydrated]);

  /*
   * Realtime:
   * quando outro celular/tablet altera
   * qualquer tabela, recarrega o estado.
   */
  useEffect(() => {
    if (
      !hydrated ||
      !isSupabaseConfigured
    ) {
      return;
    }

    let timer:
      | ReturnType<typeof setTimeout>
      | undefined;

    let cancelled = false;

    const reloadRemote =
      async () => {
        try {
          const remoteDB =
            await loadDBFromSupabase();

          if (cancelled) return;

          syncedDB.current = remoteDB;
          saveLocal(remoteDB);

          setDb((current) =>
            sameDB(current, remoteDB)
              ? current
              : remoteDB,
          );
        } catch (error) {
          console.error(
            "[Marcolada] Erro no realtime:",
            error,
          );
        }
      };

    const scheduleReload = () => {
      if (timer) clearTimeout(timer);

      timer = setTimeout(
        reloadRemote,
        250,
      );
    };

    const channel = supabase
      .channel(
        "marcolada-realtime",
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
        },
        scheduleReload,
      )
      .subscribe();

    return () => {
      cancelled = true;

      if (timer) {
        clearTimeout(timer);
      }

      supabase.removeChannel(
        channel,
      );
    };
  }, [hydrated]);

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
): Match {
  return {
    id: uid(),
    number,
    teamAId: teamA.id,
    teamBId: teamB.id,

    lineups: {
      [teamA.id]: [
        ...teamA.playerIds,
      ],

      [teamB.id]: [
        ...teamB.playerIds,
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
