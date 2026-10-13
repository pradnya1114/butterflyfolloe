import { LeaderboardEntry } from '../types';

const LEADERBOARD_KEY = 'butterfly_follow_me_top10';

const INITIAL_LEADERBOARD: LeaderboardEntry[] = [
  { id: '1', name: 'Aria Whisper', score: 380, butterfliesAttracted: 48, gesturesCompleted: 24, date: '2026-10-10' },
  { id: '2', name: 'Leo Starlight', score: 340, butterfliesAttracted: 42, gesturesCompleted: 21, date: '2026-10-11' },
  { id: '3', name: 'Luna Meadow', score: 295, butterfliesAttracted: 39, gesturesCompleted: 18, date: '2026-10-12' },
  { id: '4', name: 'Maya Bloom', score: 260, butterfliesAttracted: 35, gesturesCompleted: 16, date: '2026-10-12' },
  { id: '5', name: 'Finnian Woods', score: 235, butterfliesAttracted: 31, gesturesCompleted: 14, date: '2026-10-12' },
  { id: '6', name: 'Elena Aurora', score: 210, butterfliesAttracted: 29, gesturesCompleted: 13, date: '2026-10-13' },
  { id: '7', name: 'Oliver Breeze', score: 185, butterfliesAttracted: 26, gesturesCompleted: 11, date: '2026-10-13' },
  { id: '8', name: 'Sophia Petal', score: 160, butterfliesAttracted: 24, gesturesCompleted: 9, date: '2026-10-13' },
  { id: '9', name: 'Kai Sunbeam', score: 145, butterfliesAttracted: 21, gesturesCompleted: 8, date: '2026-10-13' },
  { id: '10', name: 'Willow Zephyr', score: 120, butterfliesAttracted: 18, gesturesCompleted: 7, date: '2026-10-13' },
];

export const getLeaderboard = (): LeaderboardEntry[] => {
  try {
    const raw = localStorage.getItem(LEADERBOARD_KEY);
    if (!raw) {
      localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(INITIAL_LEADERBOARD));
      return INITIAL_LEADERBOARD;
    }
    const parsed = JSON.parse(raw) as LeaderboardEntry[];
    return parsed.sort((a, b) => b.score - a.score).slice(0, 10);
  } catch {
    return INITIAL_LEADERBOARD;
  }
};

export const saveScore = (
  name: string,
  score: number,
  butterfliesAttracted: number,
  gesturesCompleted: number
): { rank: number; entries: LeaderboardEntry[] } => {
  const current = getLeaderboard();
  
  const newEntry: LeaderboardEntry = {
    id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name: name.trim() || 'Forest Explorer',
    score,
    butterfliesAttracted,
    gesturesCompleted,
    date: new Date().toISOString().split('T')[0],
  };

  // Check if player has existing record; if existing score is lower, replace or add new
  const allEntries = [...current, newEntry];
  allEntries.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.gesturesCompleted - a.gesturesCompleted;
  });

  const top10 = allEntries.slice(0, 10);
  try {
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(top10));
  } catch {
    // quota safe
  }

  const rank = top10.findIndex((e) => e.id === newEntry.id) + 1;
  return { rank: rank > 0 ? rank : top10.length + 1, entries: top10 };
};
