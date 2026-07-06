import { useCallback, useEffect, useState } from "react";
import {
  addDictionaryEntry,
  deleteDictionaryEntry,
  listDictionaryEntries,
  updateDictionaryEntry,
  type DictionaryEntry,
} from "../lib/db";

/**
 * Single source of truth for the dictionary. Loads all entries from SQLite and
 * exposes CRUD helpers that reload afterwards, so both the Dictionary screen
 * and the add-from-history popover stay in sync (they were reading from
 * different places before).
 */
export function useDictionary() {
  const [entries, setEntries] = useState<DictionaryEntry[]>([]);

  const reload = useCallback(async () => {
    try {
      setEntries(await listDictionaryEntries());
    } catch (e) {
      console.error("listDictionaryEntries failed", e);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const add = useCallback(
    async (term: string, replacement: string, notes?: string | null) => {
      await addDictionaryEntry({ term, replacement, notes });
      await reload();
    },
    [reload],
  );

  const update = useCallback(
    async (
      id: number,
      term: string,
      replacement: string,
      notes?: string | null,
    ) => {
      await updateDictionaryEntry({ id, term, replacement, notes });
      await reload();
    },
    [reload],
  );

  const remove = useCallback(
    async (id: number) => {
      await deleteDictionaryEntry(id);
      await reload();
    },
    [reload],
  );

  return { entries, reload, add, update, remove };
}
