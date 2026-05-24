import { useCallback, useEffect, useState } from "react";
import {
  activateLicense,
  deactivateLicense,
  getLicenseState,
  shouldRevalidate,
  validateLicense,
  type LicenseState,
} from "../state/license";

/**
 * Loads the license state on mount and re-validates against Lemon Squeezy if
 * we haven't checked in over a week (silent — failures don't surface to the
 * user unless the key actually becomes invalid).
 */
export function useLicense() {
  const [state, setState] = useState<LicenseState | null>(null);
  const [loading, setLoading] = useState(true);

  // First load + opportunistic background revalidation.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const s = await getLicenseState();
        if (cancelled) return;
        setState(s);

        if (shouldRevalidate(s)) {
          // Fire-and-forget — if the network is down or LS is down we don't
          // want to bug the user. Only persisted changes will trigger a UI
          // update via the next setState below.
          try {
            const fresh = await validateLicense();
            if (!cancelled) setState(fresh);
          } catch (err) {
            console.warn("license revalidation failed", err);
          }
        }
      } catch (err) {
        console.error("license load failed", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const activate = useCallback(async (key: string) => {
    const next = await activateLicense(key);
    setState(next);
    return next;
  }, []);

  const deactivate = useCallback(async () => {
    const next = await deactivateLicense();
    setState(next);
    return next;
  }, []);

  const refresh = useCallback(async () => {
    const next = await validateLicense();
    setState(next);
    return next;
  }, []);

  return { state, loading, activate, deactivate, refresh };
}
