import React, { useEffect, useState, useRef } from 'react';
import {
  Trophy,
  RotateCcw,
  UserPlus,
  Play,
  HelpCircle,
  Sparkles,
  Award,
  Medal,
  Clock,
  Waves,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { SessionStats } from '../types';
import { saveScore } from '../services/leaderboard';
import { soundService } from '../services/sound';

interface ResultsScreenProps {
  stats: SessionStats;
  onRestart: () => void;
  onChangePlayer: () => void;
  onPlayAgain: () => void;
  onHowToPlay: () => void;
}

export const ResultsScreen: React.FC<ResultsScreenProps> = ({
  stats,
  onRestart,
  onChangePlayer,
  onPlayAgain,
  onHowToPlay,
}) => {
  const [rank, setRank] = useState<number | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);
  const hasSavedRef = useRef<boolean>(false);

  // Determine performance title
  const getPerformanceMessage = (score: number) => {
    if (score >= 250) return 'BUTTERFLY MASTER!';
    if (score >= 180) return 'MAGIC IN EVERY MOVEMENT!';
    if (score >= 100) return 'AMAZING BUTTERFLY TRAILS!';
    return 'THE GARDEN LOVES YOU!';
  };

  // Save score once on mount and trigger celebratory confetti
  useEffect(() => {
    if (!hasSavedRef.current) {
      hasSavedRef.current = true;
      const res = saveScore(
        stats.playerName,
        stats.score,
        stats.butterfliesAttracted,
        stats.gesturesCompleted
      );
      setRank(res.rank);

      // Trigger festive celebration burst
      confetti({
        particleCount: 80,
        spread: 90,
        origin: { y: 0.6 },
        colors: ['#FDE047', '#34D399', '#38BDF8', '#F472B6', '#C084FC'],
      });

      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 60,
          origin: { x: 0.1, y: 0.7 },
        });
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 60,
          origin: { x: 0.9, y: 0.7 },
        });
      }, 400);
    }
  }, [stats]);

  // Handle Restart or Play Again with short 3-second countdown
  const startCountdownAndRun = (action: () => void) => {
    setCountdown(3);
    soundService.playChime([523.25]);

    countdownIntervalRef.current = window.setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
          action();
          return null;
        }
        soundService.playChime([523.25 + (4 - prev) * 100]);
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);

  return (
    <div className="relative min-h-screen w-full bg-slate-950 text-slate-100 flex items-center justify-center p-4 sm:p-8 overflow-hidden select-none">
      {/* Background artwork */}
      <img
        src="/src/assets/images/magical_forest_bg_1791890498448.jpg"
        alt="Magical Garden Results"
        referrerPolicy="no-referrer"
        className="absolute inset-0 w-full h-full object-cover object-center filter brightness-[0.25] saturate-120"
      />
      <div className="absolute inset-0 bg-radial from-emerald-950/40 via-slate-950/80 to-slate-950 pointer-events-none" />

      {/* Countdown modal if restarting */}
      {countdown !== null && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center animate-fadeIn">
          <div className="font-serif text-sm tracking-widest text-emerald-300 uppercase mb-4">
            Preparing your garden flight...
          </div>
          <div className="font-mono text-8xl font-black text-amber-300 animate-pulse">
            {countdown}
          </div>
        </div>
      )}

      {/* Main card */}
      <main className="relative z-10 w-full max-w-2xl bg-slate-900/85 border border-emerald-500/40 rounded-3xl p-6 sm:p-10 backdrop-blur-2xl shadow-2xl shadow-black/90 text-center">
        {/* Emblem badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-900/60 border border-emerald-500/30 text-emerald-200 text-xs font-semibold tracking-wider uppercase backdrop-blur-md mb-4">
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          Interactive Experience Completed
        </div>

        {/* Heading */}
        <h1 className="font-serif text-3xl sm:text-5xl font-extrabold text-white tracking-tight mb-2 drop-shadow-[0_2px_16px_rgba(16,185,129,0.4)]">
          YOU SPREAD THE MAGIC!
        </h1>

        {/* Performance message */}
        <p className="font-serif text-lg sm:text-xl font-bold text-amber-300 tracking-wide mb-6">
          {getPerformanceMessage(stats.score)}
        </p>

        {/* Big Score & Rank Highlight */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-emerald-500/30">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Final Score
            </span>
            <div className="font-mono text-4xl sm:text-5xl font-black text-amber-300 tabular-nums">
              {stats.score}
            </div>
            <span className="text-xs text-amber-200/70">Points Earned</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/70 border border-emerald-500/30">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Leaderboard Standing
            </span>
            <div className="font-mono text-4xl sm:text-5xl font-black text-emerald-300 tabular-nums flex items-center justify-center gap-2">
              {rank && rank <= 3 ? (
                <Trophy className="w-8 h-8 text-amber-400 inline" />
              ) : (
                <Award className="w-8 h-8 text-emerald-400 inline" />
              )}
              {rank ? `#${rank}` : 'Top 10'}
            </div>
            <span className="text-xs text-emerald-200/70">
              {rank && rank <= 10 ? 'Ranked in Hall of Fame' : 'Honorable Explorer'}
            </span>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800 text-center">
            <Medal className="w-4 h-4 text-sky-400 mx-auto mb-1" />
            <span className="font-mono text-xl font-bold text-white block tabular-nums">
              {stats.butterfliesAttracted}
            </span>
            <span className="text-[10px] text-slate-400">Butterflies Attracted</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800 text-center">
            <Waves className="w-4 h-4 text-purple-400 mx-auto mb-1" />
            <span className="font-mono text-xl font-bold text-white block tabular-nums">
              {stats.gesturesCompleted}
            </span>
            <span className="text-[10px] text-slate-400">Gestures Mastered</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800 text-center">
            <Sparkles className="w-4 h-4 text-amber-400 mx-auto mb-1" />
            <span className="font-mono text-xl font-bold text-white block tabular-nums">
              {stats.specialInteractions}
            </span>
            <span className="text-[10px] text-slate-400">Special Moments</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800 text-center">
            <Clock className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
            <span className="font-mono text-xl font-bold text-white block tabular-nums">
              {stats.durationSeconds}s
            </span>
            <span className="text-[10px] text-slate-400">Flight Duration</span>
          </div>
        </div>

        {/* 4 Action Buttons required by specifications */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {/* 1. PLAY AGAIN (Immediate next round with countdown) */}
          <button
            type="button"
            onClick={() => startCountdownAndRun(onPlayAgain)}
            className="py-3.5 px-4 rounded-xl font-serif font-bold text-sm text-slate-950 bg-gradient-to-r from-amber-300 via-emerald-300 to-teal-300 hover:from-amber-200 hover:to-teal-200 shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <Play className="w-4 h-4 fill-slate-950" />
            <span>PLAY AGAIN</span>
          </button>

          {/* 2. RESTART (Same player, resets score & stats) */}
          <button
            type="button"
            onClick={() => startCountdownAndRun(onRestart)}
            className="py-3.5 px-4 rounded-xl font-serif font-semibold text-sm text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>RESTART ({stats.playerName})</span>
          </button>

          {/* 3. CHANGE PLAYER (Return to Page 1) */}
          <button
            type="button"
            onClick={onChangePlayer}
            className="py-3 px-4 rounded-xl text-xs font-semibold text-slate-300 bg-slate-950/70 hover:bg-slate-800 border border-slate-800 flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>CHANGE PLAYER</span>
          </button>

          {/* 4. HOW TO PLAY (Return to Page 2) */}
          <button
            type="button"
            onClick={onHowToPlay}
            className="py-3 px-4 rounded-xl text-xs font-semibold text-slate-300 bg-slate-950/70 hover:bg-slate-800 border border-slate-800 flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <HelpCircle className="w-4 h-4" />
            <span>HOW TO PLAY</span>
          </button>
        </div>
      </main>
    </div>
  );
};
