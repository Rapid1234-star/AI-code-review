"use client";

/* Client pages load remote data when their route key changes. */
/* eslint-disable react-hooks/set-state-in-effect, react-hooks/refs, react-hooks/exhaustive-deps */

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "./api";

export function useResource<T>(loader: () => Promise<T>, key: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await loaderRef.current());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [key]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, error, loading, reload, setData };
}
