import { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  LANES,
  laneX,
  GRAVITY,
  JUMP_VELOCITY,
  ROLL_DURATION,
  START_SPEED,
  MAX_SPEED,
  SPEED_RAMP,
  DESPAWN_Z,
  type ObstacleKind,
} from "./constants";

type Phase = "ready" | "running" | "over";

interface ObstacleState {
  lane: number;
  z: number;
  kind: ObstacleKind;
  active: boolean;
}
interface CoinState {
  lane: number;
  z: number;
  y: number;
  active: boolean;
}

export interface GameApi {
  phase: Phase;
  start: () => void;
}

const OBSTACLE_POOL = 26;
const COIN_POOL = 70;
const SEGMENTS = 10;
const SEG_LEN = 24;

function useGameState() {
  return useMemo(
    () => ({
      phase: "ready" as Phase,
      speed: START_SPEED,
      distance: 0,
      coins: 0,
      lane: 1,
      x: 0,
      y: 0,
      vy: 0,
      rolling: 0,
      nextSpawnZ: -40,
      obstacles: Array.from({ length: OBSTACLE_POOL }, () => ({
        lane: 0,
        z: 0,
        kind: "barrier" as ObstacleKind,
        active: false,
      })) as ObstacleState[],
      coinsPool: Array.from({ length: COIN_POOL }, () => ({
        lane: 0,
        z: 0,
        y: 1,
        active: false,
      })) as CoinState[],
      hurt: 0,
    }),
    [],
  );
}

type G = ReturnType<typeof useGameState>;

function resetGame(g: G) {
  g.speed = START_SPEED;
  g.distance = 0;
  g.coins = 0;
  g.lane = 1;
  g.x = 0;
  g.y = 0;
  g.vy = 0;
  g.rolling = 0;
  g.nextSpawnZ = -40;
  g.hurt = 0;
  g.obstacles.forEach((o) => (o.active = false));
  g.coinsPool.forEach((c) => (c.active = false));
}

function spawnRow(g: G) {
  const z = g.nextSpawnZ;
  const blocked = new Set<number>();
  const rowCount = Math.random() < 0.35 ? 2 : 1;
  for (let i = 0; i < rowCount; i++) {
    const lane = Math.floor(Math.random() * 3);
    if (blocked.has(lane) || blocked.size >= 2) continue;
    blocked.add(lane);
    const r = Math.random();
    const kind: ObstacleKind = r < 0.4 ? "train" : r < 0.75 ? "barrier" : "overhead";
    const slot = g.obstacles.find((o) => !o.active);
    if (slot) {
      slot.active = true;
      slot.lane = lane;
      slot.z = z - (kind === "train" ? Math.random() * 4 : 0);
      slot.kind = kind;
    }
  }
  // coin run in a free lane
  const free = [0, 1, 2].filter((l) => !blocked.has(l));
  const lane = free[Math.floor(Math.random() * free.length)] ?? 1;
  const arc = Math.random() < 0.3;
  const n = 5;
  for (let i = 0; i < n; i++) {
    const slot = g.coinsPool.find((c) => !c.active);
    if (!slot) break;
    slot.active = true;
    slot.lane = lane;
    slot.z = z - i * 2.2;
    slot.y = arc ? 1 + Math.sin((i / (n - 1)) * Math.PI) * 2.2 : 1.1;
  }
  g.nextSpawnZ -= 16 + Math.random() * 10;
}

function Obstacle({ kind }: { kind: ObstacleKind }) {
  return (
    <>
      <mesh visible={kind === "train"} position={[0, 1.6, 0]} castShadow>
        <boxGeometry args={[1.8, 3.2, 9]} />
        <meshStandardMaterial color="#e8452c" metalness={0.35} roughness={0.4} />
      </mesh>
      <mesh visible={kind === "barrier"} position={[0, 0.55, 0]} castShadow>
        <boxGeometry args={[1.9, 1.1, 0.5]} />
        <meshStandardMaterial color="#ffb703" roughness={0.6} />
      </mesh>
      <mesh visible={kind === "overhead"} position={[0, 2.35, 0]} castShadow>
        <boxGeometry args={[2, 1.4, 0.5]} />
        <meshStandardMaterial color="#2ec4b6" roughness={0.5} />
      </mesh>
    </>
  );
}

function Player({ groupRef }: { groupRef: React.RefObject<THREE.Group | null> }) {
  const board = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (board.current) board.current.rotation.z += dt * 3;
  });
  return (
    <group ref={groupRef}>
      <mesh position={[0, 0.95, 0]} castShadow>
        <capsuleGeometry args={[0.42, 0.9, 6, 14]} />
        <meshStandardMaterial color="#3a86ff" roughness={0.45} />
      </mesh>
      <mesh position={[0, 1.75, 0]} castShadow>
        <sphereGeometry args={[0.34, 20, 20]} />
        <meshStandardMaterial color="#ffd6a5" roughness={0.7} />
      </mesh>
      <mesh ref={board} position={[0, 0.12, 0]} castShadow>
        <boxGeometry args={[0.8, 0.12, 1.8]} />
        <meshStandardMaterial color="#ff006e" roughness={0.3} metalness={0.4} />
      </mesh>
    </group>
  );
}

interface WorldProps {
  g: G;
  onHud: (d: { score: number; coins: number }) => void;
  onOver: () => void;
}

function World({ g, onHud, onOver }: WorldProps) {
  const player = useRef<THREE.Group>(null);
  const obstacleRefs = useRef<(THREE.Group | null)[]>([]);
  const coinRefs = useRef<(THREE.Mesh | null)[]>([]);
  const segRefs = useRef<(THREE.Group | null)[]>([]);
  const hudAcc = useRef(0);

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const running = g.phase === "running";

    if (running) {
      g.speed = Math.min(MAX_SPEED, g.speed + SPEED_RAMP * dt);
      g.distance += g.speed * dt;

      // vertical
      if (g.y > 0 || g.vy !== 0) {
        g.vy += GRAVITY * dt;
        g.y += g.vy * dt;
        if (g.y <= 0) {
          g.y = 0;
          g.vy = 0;
        }
      }
      if (g.rolling > 0) g.rolling = Math.max(0, g.rolling - dt);

      while (g.nextSpawnZ > -220) spawnRow(g);

      for (const o of g.obstacles) {
        if (!o.active) continue;
        o.z += g.speed * dt;
        if (o.z > DESPAWN_Z) o.active = false;
      }
      for (const c of g.coinsPool) {
        if (!c.active) continue;
        c.z += g.speed * dt;
        if (c.z > DESPAWN_Z) c.active = false;
      }
      g.nextSpawnZ += g.speed * dt;

      // collisions
      for (const o of g.obstacles) {
        if (!o.active || o.lane !== g.lane) continue;
        const half = o.kind === "train" ? 4.5 : 0.45;
        if (Math.abs(o.z) > half + 0.5) continue;
        let hit = false;
        if (o.kind === "train") hit = g.y < 2.6;
        else if (o.kind === "barrier") hit = g.y < 1.0 && g.rolling <= 0;
        else hit = g.y > 1.0 || g.rolling <= 0 ? g.y > 1.0 || g.rolling <= 0 : false;
        if (o.kind === "overhead") hit = g.rolling <= 0 || g.y > 0.6;
        if (hit) {
          g.phase = "over";
          onOver();
          break;
        }
      }
      for (const c of g.coinsPool) {
        if (!c.active || c.lane !== g.lane) continue;
        const py = g.y + 1.1;
        if (Math.abs(c.z) < 1 && Math.abs(c.y - py) < 1.3) {
          c.active = false;
          g.coins += 1;
        }
      }

      hudAcc.current += dt;
      if (hudAcc.current > 0.08) {
        hudAcc.current = 0;
        onHud({ score: Math.floor(g.distance) + g.coins * 10, coins: g.coins });
      }
    }

    // smooth lane
    const targetX = laneX(g.lane);
    g.x += (targetX - g.x) * Math.min(1, dt * 14);

    if (player.current) {
      const rollT = g.rolling > 0 ? 1 : 0;
      player.current.position.set(g.x, g.y, 0);
      player.current.scale.set(1, rollT ? 0.5 : 1, 1);
      player.current.rotation.z = (targetX - g.x) * 0.12;
      if (g.phase === "over") player.current.rotation.x = -0.9;
      else player.current.rotation.x = 0;
    }

    // camera
    const cam = state.camera;
    cam.position.x += (g.x * 0.45 - cam.position.x) * Math.min(1, dt * 6);
    cam.position.y += (4.6 + g.y * 0.25 - cam.position.y) * Math.min(1, dt * 6);
    cam.lookAt(g.x * 0.35, 1.4, -8);

    // track segments
    segRefs.current.forEach((s) => {
      if (!s) return;
      if (running) {
        s.position.z += g.speed * dt;
        if (s.position.z > SEG_LEN) s.position.z -= SEG_LEN * SEGMENTS;
      }
    });

    obstacleRefs.current.forEach((m, i) => {
      const o = g.obstacles[i];
      if (!m || !o) return;
      m.visible = o.active;
      if (o.active) m.position.set(laneX(o.lane), 0, o.z);
    });
    coinRefs.current.forEach((m, i) => {
      const c = g.coinsPool[i];
      if (!m || !c) return;
      m.visible = c.active;
      if (c.active) {
        m.position.set(laneX(c.lane), c.y, c.z);
        m.rotation.y += dt * 4;
      }
    });
  });

  const segments = useMemo(() => Array.from({ length: SEGMENTS }, (_, i) => i), []);

  return (
    <>
      <color attach="background" args={["#0d1b2a"]} />
      <fog attach="fog" args={["#16233a", 45, 140]} />
      <ambientLight intensity={0.9} />
      <hemisphereLight intensity={1.4} groundColor="#3b4a6b" color="#dbeafe" />
      <directionalLight position={[6, 14, 6]} intensity={2.6} castShadow />
      <pointLight position={[0, 6, 4]} intensity={40} distance={40} color="#ffd8a8" />

      {segments.map((i) => (
        <group
          key={i}
          ref={(el) => {
            segRefs.current[i] = el;
          }}
          position={[0, 0, -i * SEG_LEN]}
        >
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[10, SEG_LEN]} />
            <meshStandardMaterial color="#525c7d" roughness={0.95} />
          </mesh>
          {LANES.map((x, li) => (
            <mesh key={li} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.01, 0]} receiveShadow>
              <planeGeometry args={[1.9, SEG_LEN]} />
              <meshStandardMaterial color={li === 1 ? "#4a5270" : "#434b68"} roughness={0.9} />
            </mesh>
          ))}
          {[-4.6, 4.6].map((x, k) => (
            <mesh key={k} position={[x, 1.2, 0]}>
              <boxGeometry args={[0.5, 2.4, SEG_LEN]} />
              <meshStandardMaterial color="#38496b" roughness={0.9} />
            </mesh>
          ))}
          {[-8.5, 8.5].map((x, k) => (
            <mesh key={`b${k}`} position={[x, 6, -SEG_LEN / 4]}>
              <boxGeometry args={[6, 12 + ((i * 3 + k * 5) % 9), 10]} />
              <meshStandardMaterial color={k ? "#1a2740" : "#182338"} roughness={1} />
            </mesh>
          ))}
        </group>
      ))}

      {g.obstacles.map((o, i) => (
        <group
          key={i}
          ref={(el) => {
            obstacleRefs.current[i] = el;
          }}
          visible={false}
        >
          <Obstacle kind={o.kind} />
        </group>
      ))}

      {g.coinsPool.map((_, i) => (
        <mesh
          key={i}
          ref={(el) => {
            coinRefs.current[i] = el;
          }}
          rotation={[Math.PI / 2, 0, 0]}
          visible={false}
        >
          <cylinderGeometry args={[0.36, 0.36, 0.1, 18]} />
          <meshStandardMaterial color="#ffd60a" metalness={0.8} roughness={0.25} emissive="#7a5a00" />
        </mesh>
      ))}

      <Player groupRef={player} />
    </>
  );
}

export interface GameCanvasProps {
  phase: Phase;
  onHud: (d: { score: number; coins: number }) => void;
  onOver: () => void;
  controlsRef: React.MutableRefObject<{
    move: (dir: -1 | 1) => void;
    jump: () => void;
    roll: () => void;
    reset: () => void;
  } | null>;
}

export function GameCanvas({ phase, onHud, onOver, controlsRef }: GameCanvasProps) {
  const g = useGameState();
  g.phase = phase;

  useEffect(() => {
    controlsRef.current = {
      move: (dir) => {
        if (g.phase !== "running") return;
        g.lane = Math.max(0, Math.min(2, g.lane + dir));
      },
      jump: () => {
        if (g.phase !== "running" || g.y > 0.01) return;
        g.vy = JUMP_VELOCITY;
        g.rolling = 0;
      },
      roll: () => {
        if (g.phase !== "running") return;
        if (g.y > 0.01) {
          g.vy = -JUMP_VELOCITY * 1.2;
        }
        g.rolling = ROLL_DURATION;
      },
      reset: () => resetGame(g),
    };
  }, [g, controlsRef]);

  return (
    <Canvas
      shadows
      camera={{ position: [0, 4.6, 9], fov: 60 }}
      dpr={[1, 1.75]}
      gl={{ toneMappingExposure: 1.9 }}
    >
      <World g={g} onHud={onHud} onOver={onOver} />
    </Canvas>
  );
}

export type { Phase };
