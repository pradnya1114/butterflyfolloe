import React, { useState, useEffect, useRef } from 'react';
import { Camera, Volume2, VolumeX, ArrowRight, Sparkles } from 'lucide-react';
import { soundService } from '../services/sound';

interface WelcomeScreenProps {
  onStart: (name: string) => void;
  initialName?: string;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onStart,
  initialName = '',
  isMuted,
  onToggleMute,
}) => {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Background floating butterflies & particles simulation on Welcome screen
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Floating welcome butterflies
    const butterflies = Array.from({ length: 18 }, (_, i) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 1.8,
      vy: -0.5 - Math.random() * 1.2,
      phase: Math.random() * Math.PI * 2,
      size: 14 + Math.random() * 12,
      hue: (i * 45) % 360,
    }));

    // Floating pollen
    const pollens = Array.from({ length: 30 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vy: -0.3 - Math.random() * 0.5,
      size: 1 + Math.random() * 2.5,
      alpha: 0.3 + Math.random() * 0.5,
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Render floating pollen
      pollens.forEach((p) => {
        p.y += p.vy;
        if (p.y < -10) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(254, 240, 138, ${p.alpha})`;
        ctx.fill();
      });

      // Render flutter butterflies
      butterflies.forEach((b) => {
        b.x += b.vx;
        b.y += b.vy;
        b.phase += 0.2;

        if (b.y < -50) {
          b.y = height + 50;
          b.x = Math.random() * width;
        }
        if (b.x < -50) b.x = width + 50;
        if (b.x > width + 50) b.x = -50;

        ctx.save();
        ctx.translate(b.x, b.y);
        const flap = Math.abs(Math.cos(b.phase));

        // Left wing
        ctx.save();
        ctx.scale(-Math.max(0.15, flap), 1);
        ctx.beginPath();
        ctx.arc(b.size * 0.6, -b.size * 0.3, b.size * 0.7, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${b.hue}, 85%, 65%, 0.8)`;
        ctx.fill();
        ctx.restore();

        // Right wing
        ctx.save();
        ctx.scale(Math.max(0.15, flap), 1);
        ctx.beginPath();
        ctx.arc(b.size * 0.6, -b.size * 0.3, b.size * 0.7, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${b.hue}, 85%, 65%, 0.8)`;
        ctx.fill();
        ctx.restore();

        // Body
        ctx.fillStyle = '#18181B';
        ctx.beginPath();
        ctx.ellipse(0, 0, 2, b.size * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      });

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter your name to embark on the butterfly journey.');
      return;
    }
    setError('');
    soundService.playChime();
    soundService.startAmbient();
    onStart(name.trim());
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-slate-950">
      {/* Background Enchanted Forest Image with Dark Contrast Scrim */}
      <img
        src="/src/assets/images/magical_forest_bg_1791890498448.jpg"
        alt="Magical Enchanted Forest Glade"
        referrerPolicy="no-referrer"
        className="absolute inset-0 w-full h-full object-cover object-center filter brightness-[0.72] contrast-[1.08] scale-105"
      />

      {/* Atmospheric Vignette & Sunlight overlays */}
      <div className="absolute inset-0 bg-radial from-emerald-950/20 via-slate-950/70 to-slate-950/95 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent pointer-events-none" />

      {/* Animated Canvas for Floating Butterflies & Pollen */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-10"
      />

      {/* Top Bar with sound toggle */}
      <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 sm:px-10 py-6">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-400" />
          <span className="font-serif text-sm tracking-widest text-emerald-300 uppercase">
            Interactive Nature Installation
          </span>
        </div>

        <button
          type="button"
          onClick={onToggleMute}
          aria-label={isMuted ? 'Unmute Forest Sounds' : 'Mute Forest Sounds'}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/70 hover:bg-slate-800 text-slate-200 border border-slate-700/50 backdrop-blur-md text-xs transition-colors"
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          <span className="hidden sm:inline">{isMuted ? 'Audio Off' : 'Sound On'}</span>
        </button>
      </header>

      {/* Main Content Box */}
      <main className="relative z-20 w-full max-w-xl mx-auto px-6 text-center">
        {/* Emblem badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-900/60 border border-emerald-500/30 text-emerald-200 text-xs tracking-wider uppercase backdrop-blur-md mb-6 shadow-lg shadow-emerald-950/50">
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          Webcam Body & Hand Tracking Experience
        </div>

        {/* Title */}
        <h1 className="font-serif text-4xl sm:text-6xl font-extrabold tracking-tight text-white mb-3 drop-shadow-[0_4px_24px_rgba(16,185,129,0.35)]">
          BUTTERFLY FOLLOW ME
        </h1>

        {/* Subtitle */}
        <p className="font-serif italic text-lg sm:text-xl text-emerald-200/90 mb-8 max-w-md mx-auto">
          &ldquo;Move Your Body. Spread Your Magic.&rdquo;
        </p>

        {/* Form Container */}
        <form
          onSubmit={handleSubmit}
          className="bg-slate-900/80 border border-emerald-500/30 rounded-2xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl shadow-black/80 space-y-5"
        >
          <div className="space-y-2 text-left">
            <label
              htmlFor="playerNameInput"
              className="block text-xs font-semibold uppercase tracking-wider text-emerald-300"
            >
              Visitor Name
            </label>
            <input
              id="playerNameInput"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError('');
              }}
              placeholder="Enter Your Name"
              maxLength={28}
              autoFocus
              className="w-full px-4 py-3.5 rounded-xl bg-slate-950/70 border border-emerald-700/50 text-white placeholder-slate-500 text-base focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all"
            />
            {error && (
              <p className="text-xs text-rose-400 mt-1.5 flex items-center gap-1 font-medium">
                {error}
              </p>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-4 px-6 rounded-xl font-serif font-bold text-base tracking-wide text-slate-950 bg-gradient-to-r from-amber-300 via-emerald-300 to-teal-300 hover:from-amber-200 hover:to-teal-200 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transform hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-3 cursor-pointer"
          >
            <span>START EXPERIENCE</span>
            <ArrowRight className="w-5 h-5 text-slate-950" />
          </button>

          {/* Camera Hint Notice */}
          <div className="pt-2 flex items-center justify-center gap-2.5 text-xs text-emerald-300/80">
            <Camera className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Move naturally and watch butterflies follow you</span>
          </div>
        </form>

        {/* Footer info */}
        <p className="mt-8 text-xs text-slate-400/80">
          Crafted for interactive exhibitions, museums, and immersive discovery installations.
        </p>
      </main>
    </div>
  );
};
