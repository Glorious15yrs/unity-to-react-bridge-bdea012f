import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { GameCanvas, type Phase } from "@/game/GameCanvas";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Subway Runner — 3D Endless Runner in React" },
      {
        name: "description",
        content:
          "Dodge trains, slide under barriers and grab coins in Subway Runner, a browser 3D endless runner rebuilt in React and WebGL.",
      },
      { property: "og:title", content: "Subway Runner — 3D Endless Runner in React" },
      {
        property: "og:description",
        content:
          "Dodge trains, slide under barriers and grab coins in this browser 3D endless runner built with React and WebGL.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type Controls = {
  move: (dir: -1 | 1) => void;
  jump: () => void;
  roll: () => void;
  reset: () => void;
} | null;

function Index() {
  const [phase, setPhase] = useState<Phase>("ready");
  const [hud, setHud] = useState({ score: 0, coins: 0 });
  const [best, setBest] = useState(0);
  const controls = useRef<Controls>(null);

  useEffect(() => {
    const stored = Number(localStorage.getItem("subway-runner-best") ?? 0);
    if (!Number.isNaN(stored)) setBest(stored);
  }, []);

  const start = useCallback(() => {
    controls.current?.reset();
    setHud({ score: 0, coins: 0 });
    setPhase("running");
  }, []);

  const onOver = useCallback(() => {
    setPhase("over");
    setHud((h) => {
      setBest((b) => {
        const next = Math.max(b, h.score);
        localStorage.setItem("subway-runner-best", String(next));
        return next;
      });
      return h;
    });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const c = controls.current;
      if (!c) return;
      switch (e.key) {
        case "ArrowLeft":
        case "a":
          c.move(-1);
          break;
        case "ArrowRight":
        case "d":
          c.move(1);
          break;
        case "ArrowUp":
        case "w":
        case " ":
          e.preventDefault();
          c.jump();
          break;
        case "ArrowDown":
        case "s":
          c.roll();
          break;
        case "Enter":
          if (phase !== "running") start();
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, start]);

  // touch swipe
  useEffect(() => {
    let sx = 0;
    let sy = 0;
    const down = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t) {
        sx = t.clientX;
        sy = t.clientY;
      }
    };
    const up = (e: TouchEvent) => {
      const t = e.changedTouches[0];
      const c = controls.current;
      if (!t || !c) return;
      const dx = t.clientX - sx;
      const dy = t.clientY - sy;
      if (Math.abs(dx) < 28 && Math.abs(dy) < 28) return;
      if (Math.abs(dx) > Math.abs(dy)) c.move(dx > 0 ? 1 : -1);
      else if (dy < 0) c.jump();
      else c.roll();
    };
    window.addEventListener("touchstart", down, { passive: true });
    window.addEventListener("touchend", up, { passive: true });
    return () => {
      window.removeEventListener("touchstart", down);
      window.removeEventListener("touchend", up);
    };
  }, []);

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-background">
      <h1 className="sr-only">Subway Runner — 3D endless runner built with React</h1>

      <GameCanvas phase={phase} onHud={setHud} onOver={onOver} controlsRef={controls} />

      {/* HUD */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-5">
        <div className="rounded-2xl bg-card/70 px-5 py-3 backdrop-blur-md">
          <p className="font-display text-3xl leading-none tracking-wide text-foreground">
            {hud.score}
          </p>
          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">Score</p>
        </div>
        <div className="rounded-2xl bg-card/70 px-5 py-3 text-right backdrop-blur-md">
          <p className="font-display text-3xl leading-none tracking-wide text-accent">
            {hud.coins}
          </p>
          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">Coins</p>
        </div>
      </div>

      {phase !== "running" && (
        <div className="absolute inset-0 grid place-items-center bg-background/70 px-6 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-border bg-card/85 p-8 text-center shadow-2xl">
            <p className="font-display text-5xl uppercase tracking-wider text-primary">
              {phase === "ready" ? "Subway Runner" : "Wipeout!"}
            </p>
            {phase === "over" ? (
              <p className="mt-3 text-muted-foreground">
                Score <span className="text-foreground">{hud.score}</span> · Coins{" "}
                <span className="text-accent">{hud.coins}</span> · Best{" "}
                <span className="text-foreground">{best}</span>
              </p>
            ) : (
              <p className="mt-3 text-muted-foreground">
                Endless runner rebuilt in React + WebGL. Dodge the trains, slide under the bars.
              </p>
            )}

            <button
              onClick={start}
              className="mt-7 w-full rounded-xl bg-primary px-6 py-4 font-display text-2xl uppercase tracking-wider text-primary-foreground transition-transform hover:scale-[1.02] active:scale-95"
            >
              {phase === "ready" ? "Play" : "Run again"}
            </button>

            <ul className="mt-6 grid grid-cols-2 gap-2 text-left text-sm text-muted-foreground">
              <li>← → / A D — switch lane</li>
              <li>↑ / Space — jump</li>
              <li>↓ / S — roll</li>
              <li>Swipe on mobile</li>
            </ul>
          </div>
        </div>
      )}

      {/* Mobile buttons */}
      <div className="absolute inset-x-0 bottom-0 grid grid-cols-4 gap-2 p-4 sm:hidden">
        {(
          [
            ["◀", () => controls.current?.move(-1)],
            ["▲", () => controls.current?.jump()],
            ["▼", () => controls.current?.roll()],
            ["▶", () => controls.current?.move(1)],
          ] as const
        ).map(([label, fn]) => (
          <button
            key={label}
            onClick={fn}
            className="rounded-xl bg-card/75 py-4 text-lg text-foreground backdrop-blur-md active:bg-card"
          >
            {label}
          </button>
        ))}
      </div>
    </main>
  );
}
