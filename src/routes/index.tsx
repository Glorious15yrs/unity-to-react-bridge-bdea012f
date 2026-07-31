import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { ClientOnly } from "@tanstack/react-router";

const UnityGame = lazy(() =>
  import("../game/UnityGame").then((m) => ({ default: m.UnityGame })),
);

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Subway Surfers — Play the Unity Build in React" },
      {
        name: "description",
        content:
          "Play the Subway Surfers WebGL build inside a React app: full-screen canvas, loading progress and responsive layout.",
      },
      { property: "og:title", content: "Subway Surfers — Play the Unity Build in React" },
      {
        property: "og:description",
        content:
          "Play the Subway Surfers WebGL build inside a React app: full-screen canvas, loading progress and responsive layout.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GamePage,
});

function GamePage() {
  return (
    <main className="h-screen w-screen overflow-hidden bg-background">
      <ClientOnly fallback={<div className="h-full w-full bg-background" />}>
        <Suspense fallback={<div className="h-full w-full bg-background" />}>
          <UnityGame />
        </Suspense>
      </ClientOnly>
    </main>
  );
}
