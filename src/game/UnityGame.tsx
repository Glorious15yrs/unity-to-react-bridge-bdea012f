import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    UnityLoader?: {
      instantiate: (
        container: string | HTMLElement,
        buildJsonUrl: string,
        options?: { onProgress?: (instance: unknown, progress: number) => void },
      ) => { Quit?: (cb?: () => void) => void };
      Error?: { handler?: unknown };
    };
  }
}

const LOADER_SRC = "/game/UnityLoader.2019.2.js";
const BUILD_JSON = "/game/Build/SanFrancisco.json";

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing) {
      if (existing.dataset['loaded'] === "true") return resolve();
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)));
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => {
      script.dataset['loaded'] = "true";
      resolve();
    };
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.body.appendChild(script);
  });
}

export function UnityGame() {
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<{ Quit?: (cb?: () => void) => void } | null>(null);
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await loadScript(LOADER_SRC);
        if (cancelled || !containerRef.current || !window.UnityLoader) return;
        instanceRef.current = window.UnityLoader.instantiate(containerRef.current, BUILD_JSON, {
          onProgress: (_instance, value) => {
            if (cancelled) return;
            setProgress(value);
            if (value === 1) setReady(true);
          },
        });
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Unknown error");
      }
    })();

    return () => {
      cancelled = true;
      try {
        instanceRef.current?.Quit?.();
      } catch {
        /* ignore */
      }
      instanceRef.current = null;
    };
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden bg-background">
      <div ref={containerRef} className="h-full w-full [&>canvas]:block [&>canvas]:h-full [&>canvas]:w-full" />

      {!ready && !error && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background">
          <h1 className="font-display text-3xl tracking-wide text-foreground">Subway Surfers</h1>
          <div className="h-2 w-64 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-200"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
          <p className="text-sm text-muted-foreground">Loading {Math.round(progress * 100)}%</p>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background px-6 text-center">
          <p className="font-display text-xl text-foreground">The game could not start</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      )}
    </div>
  );
}

export default UnityGame;
