/**
 * BUTTERFLY FOLLOW ME
 * Direct Full-Screen Interactive Body & Hand Tracking Experience
 */

import { useState } from 'react';
import { ExperienceScreen } from './components/ExperienceScreen';
import { soundService } from './services/sound';

export default function App() {
  const [isMuted, setIsMuted] = useState<boolean>(soundService.getMuted());

  const handleToggleMute = () => {
    const nextMuted = soundService.toggleMute();
    setIsMuted(nextMuted);
  };

  return (
    <div className="w-full h-full min-h-screen bg-slate-950 font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      <ExperienceScreen
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
      />
    </div>
  );
}
