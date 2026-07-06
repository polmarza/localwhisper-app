import { useCallback, useEffect, useState } from "react";
import { addUsageWords, getUsageState, type UsageState } from "../state/usage";

/**
 * Loads the free-tier weekly word usage and exposes a helper to add words
 * after a transcription. Only meaningful for non-premium users — callers gate
 * on premium before counting.
 */
export function useUsage() {
  const [state, setState] = useState<UsageState | null>(null);

  useEffect(() => {
    let cancelled = false;
    getUsageState()
      .then((s) => {
        if (!cancelled) setState(s);
      })
      .catch((e) => console.error("usage load failed", e));
    return () => {
      cancelled = true;
    };
  }, []);

  const addWords = useCallback(async (n: number) => {
    if (n <= 0) return;
    try {
      setState(await addUsageWords(n));
    } catch (e) {
      console.error("usage add failed", e);
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      setState(await getUsageState());
    } catch (e) {
      console.error("usage refresh failed", e);
    }
  }, []);

  return { state, addWords, refresh };
}
