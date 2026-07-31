/**
 * Minimal, ad-free replacement for the Poki SDK the Unity build expects.
 * The WebGL build calls into these globals through its JS plugin layer, so they
 * must exist before the Unity module boots.
 */

type UnityInstance = { SendMessage?: (obj: string, method: string, value?: string) => void };

const noop = () => {};
const resolved = () => Promise.resolve();

export function installPokiBridge() {
  const w = window as unknown as Record<string, unknown>;

  w["PokiSDK"] = {
    init: resolved,
    initWithVideoHB: resolved,
    setDebug: noop,
    gameLoadingStart: noop,
    gameLoadingFinished: noop,
    gameLoadingProgress: noop,
    gameInteractive: noop,
    gameplayStart: noop,
    gameplayStop: noop,
    roundStart: noop,
    roundEnd: noop,
    happyTime: noop,
    customEvent: noop,
    setPlayerAge: noop,
    togglePlayerAdvertisingConsent: noop,
    displayAd: noop,
    destroyAd: noop,
    muteAd: noop,
    sendHighscore: noop,
    logError: noop,
    commercialBreak: resolved,
    rewardedBreak: () => Promise.resolve(false),
    getLeaderboard: () => Promise.resolve({}),
  };

  w["pokiReady"] = true;
  w["pokiAdBlock"] = false;

  const send = (obj: string, method: string, value?: string) => {
    let attempts = 0;
    const tick = () => {
      const game = w["unityGame"] as UnityInstance | undefined;
      if (game?.SendMessage) {
        game.SendMessage(obj, method, value);
        return;
      }
      if (attempts++ < 200) setTimeout(tick, 50);
    };
    tick();
  };

  w["initPokiBridge"] = (name: string) => {
    w["pokiBridge"] = name;
    w["commercialBreak"] = () => send(name, "commercialBreakCompleted");
    w["rewardedBreak"] = () => send(name, "rewardedBreakCompleted", "false");
    send(name, "ready");
  };
}
