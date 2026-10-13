import React from 'react';
import { LeaderboardEntry } from '../types';
import { Trophy, Medal, Award, Sparkles } from 'lucide-react';

interface LeaderboardPanelProps {
  entries: LeaderboardEntry[];
  currentPlayerName?: string;
  currentScore?: number;
}

export const LeaderboardPanel: React.FC<LeaderboardPanelProps> = ({
  entries,
  currentPlayerName,
  currentScore = 0,
}) => {
  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-400/20 text-amber-300 font-bold border border-amber-400/40 shadow-sm shadow-amber-500/20">
          <Trophy className="w-3.5 h-3.5" />
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-300/20 text-slate-200 font-bold border border-slate-300/40">
          <Medal className="w-3.5 h-3.5" />
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-700/20 text-amber-500 font-bold border border-amber-600/40">
          <Award className="w-3.5 h-3.5" />
        </span>
      );
    }
    return (
      <span className="flex items-center justify-center w-6 h-6 font-mono text-xs text-slate-400">
        #{rank}
      </span>
    );
  };

  const normalizedCurrent = currentPlayerName?.trim().toLowerCase();

  return (
    <aside className="w-full h-full flex flex-col bg-slate-900/80 backdrop-blur-md border-l border-emerald-900/30 text-slate-100 p-5 shadow-2xl relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="pb-4 border-b border-emerald-800/30">
        <div className="flex items-center justify-between">
          <h2 className="font-serif tracking-wider text-base sm:text-lg font-bold text-emerald-200 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            TOP 10 BUTTERFLY EXPLORERS
          </h2>
        </div>
        <p className="text-xs text-emerald-400/80 mt-1">
          Honoring the most graceful garden guides
        </p>
      </div>

      {/* Current Player Live Card */}
      {currentPlayerName && (
        <div className="my-3 p-3 rounded-lg bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <div>
              <div className="text-xs font-semibold text-emerald-100 truncate max-w-[120px]">
                {currentPlayerName}
              </div>
              <div className="text-[10px] text-emerald-400/70">Current Flight</div>
            </div>
          </div>
          <div className="text-right">
            <span className="font-mono text-lg font-bold text-amber-300 tabular-nums">
              {currentScore}
            </span>
            <span className="text-[10px] text-slate-400 ml-1">pts</span>
          </div>
        </div>
      )}

      {/* Leaderboard Table List */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 mt-1 scrollbar-thin scrollbar-thumb-emerald-800/40">
        {entries.map((entry, index) => {
          const rank = index + 1;
          const isCurrent = normalizedCurrent && entry.name.toLowerCase() === normalizedCurrent;

          return (
            <div
              key={entry.id || index}
              className={`flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                isCurrent
                  ? 'bg-emerald-500/20 border border-emerald-400/40 shadow-sm'
                  : 'bg-slate-800/40 hover:bg-slate-800/70 border border-slate-700/30'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {getRankBadge(rank)}
                <div className="truncate">
                  <span
                    className={`text-xs font-medium block truncate ${
                      isCurrent ? 'text-emerald-200 font-semibold' : 'text-slate-200'
                    }`}
                  >
                    {entry.name}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {entry.gesturesCompleted ?? 0} gestures · {entry.butterfliesAttracted ?? 0} attracted
                  </span>
                </div>
              </div>

              <div className="text-right shrink-0 pl-2">
                <span className="font-mono text-sm font-bold text-amber-200 tabular-nums">
                  {entry.score}
                </span>
                <span className="text-[10px] text-slate-400 ml-1">pts</span>
              </div>
            </div>
          );
        })}

        {entries.length === 0 && (
          <div className="py-8 text-center text-xs text-slate-400">
            No explorers yet. Be the first to spread magic!
          </div>
        )}
      </div>

      {/* Footer hint */}
      <div className="pt-3 border-t border-emerald-900/30 text-[11px] text-slate-400 text-center">
        Scores update and save persistently on flight complete.
      </div>
    </aside>
  );
};
