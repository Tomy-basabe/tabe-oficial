import React, { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Sparkles,
  RotateCcw,
  Volume2,
  VolumeX,
  Trophy,
  Heart,
  Zap,
  ArrowLeft,
  Flame,
  Gamepad2,
  ChevronLeft,
  ChevronRight,
  Shield,
  BookOpen,
  Clock,
  AlertTriangle,
  FileQuestion,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// AUDIO SINTETIZADO ARCADE (Web Audio API Nativo - Cero Dependencias)
// ============================================================================
class ArcadeAudio {
  private ctx: AudioContext | null = null;
  public enabled = false;

  private init() {
    if (!this.ctx && typeof window !== "undefined") {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
  }

  playLaser() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(840, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(140, this.ctx.currentTime + 0.09);
      gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.09);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.09);
    } catch {}
  }

  playExplosion() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(150, this.ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(30, this.ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.2);
    } catch {}
  }

  playPowerup() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      [360, 480, 600, 880].forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, now + idx * 0.04);
        gain.gain.setValueAtTime(0.12, now + idx * 0.04);
        gain.gain.linearRampToValueAtTime(0.01, now + (idx + 1) * 0.04);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(now + idx * 0.04);
        osc.stop(now + (idx + 1) * 0.04);
      });
    } catch {}
  }

  playGameOver() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      [440, 360, 280, 180].forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        gain.gain.setValueAtTime(0.15, now + idx * 0.08);
        gain.gain.linearRampToValueAtTime(0.01, now + (idx + 1) * 0.08);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + (idx + 1) * 0.08);
      });
    } catch {}
  }
}

const audio = new ArcadeAudio();

// ============================================================================
// CONSTANTES Y MODELOS DEL JUEGO
// ============================================================================
const W = 380;
const H = 460;

interface Laser {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
}

interface Enemy {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  type: "crater404" | "bug" | "boss";
  color: string;
  points: number;
  angle: number;
  rotSpeed: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

interface PowerUp {
  x: number;
  y: number;
  vy: number;
  type: "multi" | "shield";
}

interface Star {
  x: number;
  y: number;
  speed: number;
  size: number;
  opacity: number;
}

// ============================================================================
// COMPONENTE PRINCIPAL NOT FOUND (404)
// ============================================================================
export default function NotFound() {
  const location = useLocation();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<"menu" | "playing" | "gameover">("menu");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem("tabe-404-highscore") || "0", 10) || 0;
    } catch {
      return 0;
    }
  });
  const [lives, setLives] = useState(3);
  const [wave, setWave] = useState(1);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [hasShield, setHasShield] = useState(false);
  const [multiShotActive, setMultiShotActive] = useState(false);

  // Referencias mutables para el ciclo continuo de renderizado a 60fps
  const stateRef = useRef({
    gameState: "menu" as "menu" | "playing" | "gameover",
    score: 0,
    highScore: 0,
    lives: 3,
    wave: 1,
    playerX: W / 2,
    playerY: H - 45,
    playerSpeed: 6.0,
    shield: false,
    multiShotTimer: 0,
    invincibleTimer: 0,
    shootCooldown: 0,
    keys: { left: false, right: false, shoot: false },
    touchX: null as number | null,
    lasers: [] as Laser[],
    enemies: [] as Enemy[],
    particles: [] as Particle[],
    floatingTexts: [] as FloatingText[],
    powerUps: [] as PowerUp[],
    stars: [] as Star[],
    nextEnemyTimer: 0,
    enemySpawnRate: 70,
    waveTimer: 0,
  });

  // Inicializar estrellas del fondo
  useEffect(() => {
    const stars: Star[] = [];
    for (let i = 0; i < 60; i++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        speed: 0.35 + Math.random() * 1.5,
        size: Math.random() < 0.2 ? 2.2 : 1.1,
        opacity: 0.25 + Math.random() * 0.7,
      });
    }
    stateRef.current.stars = stars;
    stateRef.current.highScore = highScore;
  }, [highScore]);

  // Manejo de sonido
  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    audio.enabled = next;
  };

  // Iniciar partida
  const startGame = useCallback(() => {
    stateRef.current.gameState = "playing";
    stateRef.current.score = 0;
    stateRef.current.lives = 3;
    stateRef.current.wave = 1;
    stateRef.current.playerX = W / 2;
    stateRef.current.shield = false;
    stateRef.current.multiShotTimer = 0;
    stateRef.current.invincibleTimer = 50;
    stateRef.current.lasers = [];
    stateRef.current.enemies = [];
    stateRef.current.particles = [];
    stateRef.current.floatingTexts = [];
    stateRef.current.powerUps = [];
    stateRef.current.enemySpawnRate = 65;
    stateRef.current.nextEnemyTimer = 15;

    setGameState("playing");
    setScore(0);
    setLives(3);
    setWave(1);
    setHasShield(false);
    setMultiShotActive(false);
  }, []);

  // Control táctil
  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const scaleX = W / rect.width;
    const canvasX = (touch.clientX - rect.left) * scaleX;
    stateRef.current.touchX = Math.max(20, Math.min(W - 20, canvasX));
  };

  const handleTouchEnd = () => {
    stateRef.current.touchX = null;
  };

  // Spawner de partículas
  const createExplosion = (x: number, y: number, color: string, count = 14) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.0 + Math.random() * 4.0;
      stateRef.current.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 18 + Math.random() * 12,
        color,
        size: 1.8 + Math.random() * 2.5,
      });
    }
  };

  // Spawner de enemigos / Cráteres 404
  const spawnEnemy = (s: typeof stateRef.current) => {
    const isBoss = s.score > 0 && s.score % 1400 < 100 && !s.enemies.some((e) => e.type === "boss");
    const rand = Math.random();

    if (isBoss) {
      s.enemies.push({
        id: Math.random(),
        x: W / 2,
        y: -35,
        vx: (Math.random() - 0.5) * 2.0,
        vy: 1.1,
        width: 50,
        height: 34,
        hp: 10 + s.wave * 3,
        maxHp: 10 + s.wave * 3,
        type: "boss",
        color: "#f43f5e",
        points: 404,
        angle: 0,
        rotSpeed: 0,
      });
      return;
    }

    if (rand < 0.55) {
      // Cráter de Error 404 (Asteroide rocoso con rótulo 404)
      const sz = 28 + Math.random() * 12;
      s.enemies.push({
        id: Math.random(),
        x: 25 + Math.random() * (W - 50),
        y: -30,
        vx: (Math.random() - 0.5) * 1.4,
        vy: 1.3 + Math.random() * 1.1 + s.wave * 0.1,
        width: sz,
        height: sz,
        hp: 2,
        maxHp: 2,
        type: "crater404",
        color: "#fb7185",
        points: 150,
        angle: Math.random() * Math.PI,
        rotSpeed: (Math.random() - 0.5) * 0.05,
      });
    } else {
      // Bug alienígena
      s.enemies.push({
        id: Math.random(),
        x: 25 + Math.random() * (W - 50),
        y: -25,
        vx: (Math.random() - 0.5) * (1.3 + s.wave * 0.2),
        vy: 1.7 + Math.random() * 1.3 + s.wave * 0.15,
        width: 26,
        height: 22,
        hp: 1,
        maxHp: 1,
        type: "bug",
        color: Math.random() < 0.5 ? "#a855f7" : "#ec4899",
        points: 100,
        angle: 0,
        rotSpeed: 0,
      });
    }
  };

  // Disparo de lásers
  const fireLaser = (s: typeof stateRef.current) => {
    audio.playLaser();

    if (s.multiShotTimer > 0) {
      // Disparo triple
      s.lasers.push(
        { x: s.playerX, y: s.playerY - 14, vx: 0, vy: -9, color: "#38bdf8" },
        { x: s.playerX - 9, y: s.playerY - 10, vx: -2.0, vy: -8.5, color: "#38bdf8" },
        { x: s.playerX + 9, y: s.playerY - 10, vx: 2.0, vy: -8.5, color: "#38bdf8" }
      );
    } else {
      // Disparo único
      s.lasers.push({
        x: s.playerX,
        y: s.playerY - 14,
        vx: 0,
        vy: -9,
        color: "#38bdf8",
      });
    }
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === "arrowleft" || key === "a") {
        stateRef.current.keys.left = true;
      } else if (key === "arrowright" || key === "d") {
        stateRef.current.keys.right = true;
      } else if (key === " " || key === "arrowup" || key === "w") {
        e.preventDefault();
        stateRef.current.keys.shoot = true;
        if (stateRef.current.gameState === "menu" || stateRef.current.gameState === "gameover") {
          startGame();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === "arrowleft" || key === "a") {
        stateRef.current.keys.left = false;
      } else if (key === "arrowright" || key === "d") {
        stateRef.current.keys.right = false;
      } else if (key === " " || key === "arrowup" || key === "w") {
        stateRef.current.keys.shoot = false;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [startGame]);

  // Game Loop principal a 60fps
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;

    const loop = () => {
      const s = stateRef.current;

      // 1. Estrellas
      for (const star of s.stars) {
        star.y += star.speed;
        if (star.y > H) {
          star.y = 0;
          star.x = Math.random() * W;
        }
      }

      // 2. Lógica del juego
      if (s.gameState === "playing") {
        if (s.touchX !== null) {
          s.playerX += (s.touchX - s.playerX) * 0.22;
        } else {
          if (s.keys.left) s.playerX -= s.playerSpeed;
          if (s.keys.right) s.playerX += s.playerSpeed;
        }
        s.playerX = Math.max(20, Math.min(W - 20, s.playerX));

        // Disparo
        if (s.shootCooldown > 0) s.shootCooldown--;
        if (s.keys.shoot || s.touchX !== null) {
          if (s.shootCooldown <= 0) {
            fireLaser(s);
            s.shootCooldown = s.multiShotTimer > 0 ? 8 : 12;
          }
        }

        // Timers
        if (s.multiShotTimer > 0) {
          s.multiShotTimer--;
          if (s.multiShotTimer === 0) setMultiShotActive(false);
        }
        if (s.invincibleTimer > 0) s.invincibleTimer--;

        // Wave y spawn
        s.waveTimer++;
        if (s.waveTimer % 700 === 0) {
          s.wave++;
          setWave(s.wave);
          s.enemySpawnRate = Math.max(35, 65 - s.wave * 5);
          s.floatingTexts.push({
            id: Math.random(),
            x: W / 2,
            y: H / 2 - 40,
            text: `OLEADA ${s.wave}`,
            color: "#38bdf8",
            life: 0,
            maxLife: 45,
          });
        }

        s.nextEnemyTimer--;
        if (s.nextEnemyTimer <= 0) {
          spawnEnemy(s);
          s.nextEnemyTimer = Math.floor(s.enemySpawnRate * (0.8 + Math.random() * 0.4));
        }

        // Actualizar láseres
        for (let i = s.lasers.length - 1; i >= 0; i--) {
          const l = s.lasers[i];
          l.x += l.vx;
          l.y += l.vy;
          if (l.y < -15 || l.x < -10 || l.x > W + 10) {
            s.lasers.splice(i, 1);
          }
        }

        // Actualizar power-ups
        for (let i = s.powerUps.length - 1; i >= 0; i--) {
          const p = s.powerUps[i];
          p.y += p.vy;

          const dist = Math.hypot(p.x - s.playerX, p.y - s.playerY);
          if (dist < 22) {
            audio.playPowerup();
            if (p.type === "multi") {
              s.multiShotTimer = 400;
              setMultiShotActive(true);
              s.floatingTexts.push({
                id: Math.random(),
                x: s.playerX,
                y: s.playerY - 20,
                text: "TRIPLE LÁSER!",
                color: "#38bdf8",
                life: 0,
                maxLife: 35,
              });
            } else {
              s.shield = true;
              setHasShield(true);
              s.floatingTexts.push({
                id: Math.random(),
                x: s.playerX,
                y: s.playerY - 20,
                text: "ESCUDO ACTIVO!",
                color: "#10b981",
                life: 0,
                maxLife: 35,
              });
            }
            s.powerUps.splice(i, 1);
            continue;
          }
          if (p.y > H + 20) s.powerUps.splice(i, 1);
        }

        // Mover enemigos y resolver impactos
        for (let ei = s.enemies.length - 1; ei >= 0; ei--) {
          const e = s.enemies[ei];
          e.x += e.vx;
          e.y += e.vy;
          e.angle += e.rotSpeed;

          if (e.x < e.width / 2 || e.x > W - e.width / 2) {
            e.vx *= -1;
          }

          // Colisión Láser - Enemigo
          for (let li = s.lasers.length - 1; li >= 0; li--) {
            const l = s.lasers[li];
            const hit =
              l.x > e.x - e.width / 2 &&
              l.x < e.x + e.width / 2 &&
              l.y > e.y - e.height / 2 &&
              l.y < e.y + e.height / 2;

            if (hit) {
              s.lasers.splice(li, 1);
              e.hp -= 1;
              createExplosion(l.x, l.y, l.color, 4);

              if (e.hp <= 0) {
                audio.playExplosion();
                createExplosion(e.x, e.y, e.color, e.type === "boss" ? 28 : 16);

                if (Math.random() < 0.1) {
                  s.powerUps.push({
                    x: e.x,
                    y: e.y,
                    vy: 1.5,
                    type: Math.random() < 0.5 ? "multi" : "shield",
                  });
                }

                s.score += e.points;
                setScore(s.score);
                if (s.score > s.highScore) {
                  s.highScore = s.score;
                  setHighScore(s.score);
                  try {
                    localStorage.setItem("tabe-404-highscore", String(s.score));
                  } catch {}
                }

                const hitLabel =
                  e.type === "crater404"
                    ? "404 LIMPIADO!"
                    : e.type === "boss"
                    ? "EXCEPTION CAUGHT!"
                    : "+100";

                s.floatingTexts.push({
                  id: Math.random(),
                  x: e.x,
                  y: e.y,
                  text: hitLabel,
                  color: e.color,
                  life: 0,
                  maxLife: 30,
                });

                s.enemies.splice(ei, 1);
                break;
              }
            }
          }

          // Colisión Enemigo - Jugador
          if (s.enemies[ei]) {
            const dist = Math.hypot(e.x - s.playerX, e.y - s.playerY);
            if (dist < 24 && s.invincibleTimer <= 0) {
              createExplosion(e.x, e.y, e.color, 12);
              s.enemies.splice(ei, 1);

              if (s.shield) {
                s.shield = false;
                setHasShield(false);
                s.invincibleTimer = 35;
                audio.playExplosion();
                s.floatingTexts.push({
                  id: Math.random(),
                  x: s.playerX,
                  y: s.playerY - 20,
                  text: "ESCUDO ROTO!",
                  color: "#ef4444",
                  life: 0,
                  maxLife: 30,
                });
              } else {
                audio.playExplosion();
                s.lives -= 1;
                setLives(s.lives);
                s.invincibleTimer = 65;

                if (s.lives <= 0) {
                  audio.playGameOver();
                  s.gameState = "gameover";
                  setGameState("gameover");
                  break;
                }
              }
              continue;
            }

            if (e.y > H + 30) {
              s.enemies.splice(ei, 1);
            }
          }
        }
      }

      // 3. Partículas y Textos
      for (let i = s.particles.length - 1; i >= 0; i--) {
        const p = s.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life++;
        if (p.life >= p.maxLife) s.particles.splice(i, 1);
      }

      for (let i = s.floatingTexts.length - 1; i >= 0; i--) {
        const t = s.floatingTexts[i];
        t.y -= 0.75;
        t.life++;
        if (t.life >= t.maxLife) s.floatingTexts.splice(i, 1);
      }

      // 4. Renderizado en Canvas
      ctx.fillStyle = "#0c1017";
      ctx.fillRect(0, 0, W, H);

      // Estrellas
      for (const star of s.stars) {
        ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
        ctx.fillRect(star.x, star.y, star.size, star.size);
      }

      // Power-Ups
      for (const p of s.powerUps) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.fillStyle = p.type === "multi" ? "#0284c7" : "#059669";
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 9px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(p.type === "multi" ? "3X" : "🛡️", 0, 0);
        ctx.restore();
      }

      // Lásers
      for (const l of s.lasers) {
        ctx.save();
        ctx.fillStyle = l.color;
        ctx.shadowColor = l.color;
        ctx.shadowBlur = 6;
        ctx.fillRect(l.x - 1.5, l.y, 3, 12);
        ctx.restore();
      }

      // Enemigos
      for (const e of s.enemies) {
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.rotate(e.angle);

        if (e.type === "crater404") {
          // Cráter / Asteroide de Error 404
          ctx.fillStyle = "#1e293b";
          ctx.strokeStyle = "#f43f5e";
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          const pts = 8;
          for (let p = 0; p < pts; p++) {
            const rad = (p / pts) * Math.PI * 2;
            const r = (e.width / 2) * (0.85 + Math.sin(p * 2.3) * 0.15);
            const px = Math.cos(rad) * r;
            const py = Math.sin(rad) * r;
            if (p === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Microcráteres
          ctx.fillStyle = "#0f172a";
          ctx.beginPath();
          ctx.arc(-e.width * 0.2, -e.height * 0.18, e.width * 0.12, 0, Math.PI * 2);
          ctx.arc(e.width * 0.22, e.height * 0.15, e.width * 0.1, 0, Math.PI * 2);
          ctx.fill();

          // Texto 404 fijo en el centro
          ctx.save();
          ctx.rotate(-e.angle);
          ctx.fillStyle = "#fecdd3";
          ctx.font = `bold ${Math.max(9, Math.floor(e.width * 0.34))}px monospace`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("404", 0, 0);
          ctx.restore();
        } else if (e.type === "bug") {
          // Nave glitch / bug
          ctx.fillStyle = e.color;
          ctx.beginPath();
          ctx.moveTo(0, 10);
          ctx.lineTo(-12, -7);
          ctx.lineTo(-6, -12);
          ctx.lineTo(6, -12);
          ctx.lineTo(12, -7);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 8px monospace";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("BUG", 0, -2);
        } else if (e.type === "boss") {
          // Boss Nave Espacial Fatal
          ctx.fillStyle = e.color;
          ctx.beginPath();
          ctx.moveTo(0, 18);
          ctx.lineTo(-22, -10);
          ctx.lineTo(-12, -18);
          ctx.lineTo(12, -18);
          ctx.lineTo(22, -10);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 8px monospace";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("ERR 500", 0, -4);

          // Barra de vida
          ctx.fillStyle = "rgba(0,0,0,0.6)";
          ctx.fillRect(-18, -24, 36, 3);
          ctx.fillStyle = "#22c55e";
          ctx.fillRect(-18, -24, (e.hp / e.maxHp) * 36, 3);
        }

        ctx.restore();
      }

      // Jugador
      if (s.gameState === "playing" || s.gameState === "menu") {
        const isFlicker = s.invincibleTimer > 0 && Math.floor(s.invincibleTimer / 4) % 2 === 0;

        if (!isFlicker) {
          ctx.save();
          ctx.translate(s.playerX, s.playerY);

          // Llama
          const flameH = 8 + Math.random() * 6;
          ctx.fillStyle = "#38bdf8";
          ctx.beginPath();
          ctx.moveTo(-4, 10);
          ctx.lineTo(0, 10 + flameH);
          ctx.lineTo(4, 10);
          ctx.closePath();
          ctx.fill();

          // Nave T.A.B.E. sleek
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.moveTo(0, -16);
          ctx.lineTo(-13, 10);
          ctx.lineTo(0, 5);
          ctx.lineTo(13, 10);
          ctx.closePath();
          ctx.fill();

          // Cabina cyan
          ctx.fillStyle = "#0284c7";
          ctx.beginPath();
          ctx.moveTo(0, -10);
          ctx.lineTo(-3.5, 1);
          ctx.lineTo(3.5, 1);
          ctx.closePath();
          ctx.fill();

          // Escudo circular si está activo
          if (s.shield) {
            ctx.strokeStyle = "#10b981";
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.arc(0, 0, 20, 0, Math.PI * 2);
            ctx.stroke();
          }

          ctx.restore();
        }
      }

      // Partículas
      for (const p of s.particles) {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
      }

      // Textos flotantes
      for (const t of s.floatingTexts) {
        ctx.fillStyle = t.color;
        ctx.font = "bold 11px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(t.text, t.x, t.y);
      }

      // Menú de inicio
      if (s.gameState === "menu") {
        ctx.fillStyle = "rgba(12, 16, 23, 0.75)";
        ctx.fillRect(0, 0, W, H);

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 18px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("LIMPIADOR DE ERRORES 404", W / 2, H / 2 - 35);

        ctx.fillStyle = "#94a3b8";
        ctx.font = "12px sans-serif";
        ctx.fillText("Destruye los cráteres 404 y bugs perdidos", W / 2, H / 2 - 10);

        ctx.fillStyle = "#38bdf8";
        ctx.font = "11px monospace";
        ctx.fillText("← → o A/D para mover · ESPACIO disparar", W / 2, H / 2 + 25);
      }

      // Game Over
      if (s.gameState === "gameover") {
        ctx.fillStyle = "rgba(12, 16, 23, 0.82)";
        ctx.fillRect(0, 0, W, H);

        ctx.fillStyle = "#f43f5e";
        ctx.font = "bold 24px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("MISIÓN TERMINADA", W / 2, H / 2 - 40);

        ctx.fillStyle = "#ffffff";
        ctx.font = "14px sans-serif";
        ctx.fillText(`Puntuación: ${s.score}`, W / 2, H / 2 - 10);

        ctx.fillStyle = "#fbbf24";
        ctx.font = "12px sans-serif";
        ctx.fillText(`Récord: ${s.highScore}`, W / 2, H / 2 + 12);
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div className="min-h-screen bg-[#FBFBFA] dark:bg-[#0E0F12] text-zinc-900 dark:text-zinc-100 flex flex-col justify-between p-4 sm:p-8 transition-colors select-none">
      {/* ── HEADER MINIMALISTA ── */}
      <nav className="w-full max-w-6xl mx-auto flex items-center justify-between py-2 border-b border-zinc-200/80 dark:border-zinc-800/80">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2.5 text-zinc-900 dark:text-zinc-100 font-bold tracking-tight text-base hover:opacity-80 transition-opacity"
        >
          <div className="w-7 h-7 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center text-xs font-black">
            T
          </div>
          <span>T.A.B.E.</span>
          <span className="text-zinc-400 dark:text-zinc-500 font-normal text-xs hidden sm:inline">
            / Plataforma de Estudio
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            to="/dashboard"
            className="text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            Ir al Dashboard
          </Link>
        </div>
      </nav>

      {/* ── CONTENIDO PRINCIPAL: INFORMACIÓN 404 + TARJETA DE JUEGO ── */}
      <main className="w-full max-w-6xl mx-auto my-auto py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* COLUMNA IZQUIERDA: INFORMACIÓN PROFESIONAL DE ERROR 404 */}
          <div className="lg:col-span-6 space-y-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200/80 dark:border-rose-900/60 shadow-2xs">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>Error 404 · Ruta no encontrada</span>
              </div>

              <div className="flex items-baseline gap-4">
                <span className="text-6xl sm:text-7xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">
                  404
                </span>
                <span className="text-lg sm:text-xl font-semibold text-zinc-400 dark:text-zinc-500 tracking-normal">
                  Página no disponible
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
                No pudimos encontrar la coordenada que buscas
              </h1>

              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-lg">
                La dirección ingresada no existe en la plataforma, fue reubicada o el enlace es incorrecto. 
                Mientras retomas el rumbo, puedes regresar a tus secciones principales o despejar los cráteres 404 de la órbita.
              </p>
            </div>

            {/* RUTA SOLICITADA EN CHIP MONO */}
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-zinc-100/80 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-400 font-mono max-w-lg overflow-hidden">
              <FileQuestion className="w-4 h-4 text-zinc-400 shrink-0" />
              <span className="truncate flex-1">
                {location.pathname || "/ruta-desconocida"}
              </span>
              <span className="text-[10px] uppercase font-sans font-bold px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-500">
                Inaccesible
              </span>
            </div>

            {/* BOTONES PRINCIPALES DE NAVEGACIÓN PROFESIONALES */}
            <div className="space-y-3 pt-2">
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  to="/dashboard"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all shadow-sm"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Volver al Dashboard
                </Link>

                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shadow-2xs"
                >
                  <ArrowLeft className="w-4 h-4 text-zinc-400" />
                  Volver atrás
                </button>
              </div>

              {/* ACCESOS DIRECTOS SECUNDARIOS */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-xs text-zinc-400 dark:text-zinc-500 font-medium mr-1">
                  Accesos rápidos:
                </span>
                <Link
                  to="/TABEAI"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-900/60 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-sky-500" />
                  TABE AI
                </Link>
                <Link
                  to="/apuntes"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-900/60 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 transition-colors"
                >
                  <BookOpen className="w-3.5 h-3.5 text-amber-500" />
                  Mis Apuntes
                </Link>
                <Link
                  to="/pomodoro"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-900/60 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 transition-colors"
                >
                  <Clock className="w-3.5 h-3.5 text-rose-500" />
                  Pomodoro
                </Link>
              </div>
            </div>
          </div>

          {/* COLUMNA DERECHA: TARJETA INTERACTIVA COMPACTA DEL MINIJUEGO */}
          <div className="lg:col-span-6 flex justify-center lg:justify-end">
            <div className="w-full max-w-[390px] bg-white dark:bg-[#16171B] border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-md p-3.5 flex flex-col items-center">
              {/* Barra superior de la tarjeta de juego */}
              <div className="w-full flex items-center justify-between pb-2.5 mb-2 border-b border-zinc-100 dark:border-zinc-800/80 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200 text-xs">
                    Defensor 404
                  </span>
                  <span className="text-[10px] text-zinc-400 font-mono hidden sm:inline">
                    · Mini Arcade
                  </span>
                </div>

                {/* Vidas & Modificadores */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Heart
                      key={i}
                      className={cn(
                        "w-3.5 h-3.5 transition-transform",
                        i < lives
                          ? "fill-red-500 text-red-500 scale-100"
                          : "fill-zinc-200 text-zinc-200 dark:fill-zinc-700 dark:text-zinc-700 scale-90"
                      )}
                    />
                  ))}
                  {hasShield && (
                    <Shield className="w-3.5 h-3.5 text-emerald-500 fill-emerald-500/20 ml-1 animate-pulse" />
                  )}
                  {multiShotActive && (
                    <Zap className="w-3.5 h-3.5 text-sky-400 fill-sky-400/20 ml-0.5 animate-bounce" />
                  )}
                </div>

                {/* Sonido */}
                <button
                  type="button"
                  onClick={toggleSound}
                  className="p-1 rounded-md text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  title={soundEnabled ? "Silenciar audio" : "Activar sonido"}
                >
                  {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-sky-500" /> : <VolumeX className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Indicadores de Score & Oleada */}
              <div className="w-full flex items-center justify-between px-1 pb-2 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                <span>
                  Oleada: <strong className="text-zinc-800 dark:text-zinc-200 font-bold">{wave}</strong>
                </span>
                <span>
                  Puntos: <strong className="text-primary font-mono font-bold">{score}</strong>
                </span>
                <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                  <Trophy className="w-3 h-3" />
                  <strong className="font-mono">{highScore}</strong>
                </span>
              </div>

              {/* Pantalla del Canvas */}
              <div className="relative w-full aspect-[380/460] bg-[#0c1017] rounded-xl overflow-hidden border border-zinc-200/80 dark:border-zinc-800/80 shadow-inner cursor-crosshair">
                <canvas
                  ref={canvasRef}
                  width={W}
                  height={H}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  onClick={() => {
                    if (gameState === "menu" || gameState === "gameover") startGame();
                  }}
                  className="w-full h-full block"
                />

                {/* Botón flotante para Iniciar o Reintentar */}
                {gameState !== "playing" && (
                  <div className="absolute inset-x-0 bottom-6 flex justify-center pointer-events-auto">
                    <button
                      type="button"
                      onClick={startGame}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-xs shadow-md hover:opacity-90 active:scale-95 transition-all cursor-pointer"
                    >
                      {gameState === "menu" ? (
                        <>
                          <Gamepad2 className="w-3.5 h-3.5" />
                          Comenzar Juego
                        </>
                      ) : (
                        <>
                          <RotateCcw className="w-3.5 h-3.5" />
                          Reintentar
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Controles táctiles en pantalla pequeña */}
              <div className="w-full flex items-center justify-between gap-2 pt-2.5 sm:hidden">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onPointerDown={() => { stateRef.current.keys.left = true; }}
                    onPointerUp={() => { stateRef.current.keys.left = false; }}
                    onPointerCancel={() => { stateRef.current.keys.left = false; }}
                    className="w-10 h-9 flex items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800 active:bg-zinc-200 dark:active:bg-zinc-700 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 text-xs"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onPointerDown={() => { stateRef.current.keys.right = true; }}
                    onPointerUp={() => { stateRef.current.keys.right = false; }}
                    onPointerCancel={() => { stateRef.current.keys.right = false; }}
                    className="w-10 h-9 flex items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800 active:bg-zinc-200 dark:active:bg-zinc-700 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 text-xs"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <button
                  type="button"
                  onPointerDown={() => { stateRef.current.keys.shoot = true; }}
                  onPointerUp={() => { stateRef.current.keys.shoot = false; }}
                  onPointerCancel={() => { stateRef.current.keys.shoot = false; }}
                  className="flex-1 h-9 flex items-center justify-center gap-1 rounded-lg bg-red-500 hover:bg-red-600 active:scale-95 text-white font-semibold text-xs shadow-xs"
                >
                  <Flame className="w-3.5 h-3.5 fill-white" />
                  DISPARAR
                </button>
              </div>

              {/* Leyenda de controles en desktop */}
              <div className="hidden sm:flex items-center justify-between w-full pt-2 px-1 text-[11px] text-zinc-400 dark:text-zinc-500 font-mono">
                <span>← → o A / D mover</span>
                <span>Espacio disparar</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ── FOOTER SUTIL ── */}
      <footer className="w-full max-w-6xl mx-auto py-3 text-center text-xs text-zinc-400 dark:text-zinc-600 border-t border-zinc-200/60 dark:border-zinc-800/60">
        T.A.B.E. &copy; {new Date().getFullYear()} · Todos los sistemas operativos.
      </footer>
    </div>
  );
}
