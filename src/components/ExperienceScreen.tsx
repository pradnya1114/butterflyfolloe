import React, { useEffect, useRef, useState } from 'react';
import {
  Sparkles,
  Camera,
  Timer,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  User,
  Zap,
  Eye,
  HelpCircle,
  Trophy,
  RotateCcw,
  Edit3,
  Check,
  Feather,
  Waves,
  PersonStanding,
  Hand,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ButterflySimulation } from '../services/butterflies';
import { cameraTrackingService } from '../services/tracking';
import { GestureDetector } from '../services/gestures';
import { soundService } from '../services/sound';
import {
  TrackingData,
  GestureDetectionResult,
  ScorePopup,
} from '../types';
import { saveScore } from '../services/leaderboard';

interface ExperienceScreenProps {
  initialPlayerName?: string;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const ExperienceScreen: React.FC<ExperienceScreenProps> = ({
  initialPlayerName = 'Forest Explorer',
  isMuted,
  onToggleMute,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Player Name with inline editing
  const [playerName, setPlayerName] = useState<string>(initialPlayerName);
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [tempName, setTempName] = useState<string>(initialPlayerName);

  // Experience state
  const [timeLeft, setTimeLeft] = useState<number>(90);
  const [score, setScore] = useState<number>(0);
  const [butterfliesAttracted, setButterfliesAttracted] = useState<number>(28);
  const [gesturesCompleted, setGesturesCompleted] = useState<number>(0);
  const [specialInteractions, setSpecialInteractions] = useState<number>(0);
  const [currentStatus, setCurrentStatus] = useState<string>('Step into view and move your body to guide the swarm');
  const [scorePopups, setScorePopups] = useState<ScorePopup[]>([]);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [trackingData, setTrackingData] = useState<TrackingData>(cameraTrackingService.getData());
  const [visitorMode, setVisitorMode] = useState<'mirror' | 'silhouette'>('mirror');
  const [showCameraPiP, setShowCameraPiP] = useState<boolean>(true);
  const [showGuideModal, setShowGuideModal] = useState<boolean>(false);

  // References for live loops
  const simulationRef = useRef<ButterflySimulation>(new ButterflySimulation());
  const gestureDetectorRef = useRef<GestureDetector>(new GestureDetector());
  const timerIntervalRef = useRef<number | null>(null);
  const specialEventIntervalRef = useRef<number | null>(null);
  const bgImageRef = useRef<HTMLImageElement | null>(null);

  // Preload background image
  useEffect(() => {
    const img = new Image();
    img.src = '/src/assets/images/magical_forest_bg_1791890498448.jpg';
    img.onload = () => {
      bgImageRef.current = img;
    };
  }, []);

  // 1. Initialize camera tracking directly on mount
  useEffect(() => {
    if (videoRef.current) {
      cameraTrackingService.attachVideo(videoRef.current);
    }
    soundService.startAmbient();

    const unsubscribe = cameraTrackingService.subscribe((data) => {
      setTrackingData(data);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // 2. Continuous round timer (rolls over smoothly without leaving page)
  useEffect(() => {
    timerIntervalRef.current = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Round finishes: celebrate and restart smoothly on-screen!
          handleRecordAndRestartRound();
          return 90;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [score, butterfliesAttracted, gesturesCompleted, playerName]);

  // Record score directly without leaving screen
  const handleRecordAndRestartRound = () => {
    if (score > 0) {
      soundService.playCelebration();
      saveScore(playerName, score, butterfliesAttracted, gesturesCompleted);

      // Trigger celebration confetti
      confetti({
        particleCount: 70,
        spread: 80,
        origin: { y: 0.5 },
        colors: ['#FDE047', '#34D399', '#38BDF8', '#F472B6', '#C084FC'],
      });

      setScorePopups((prev) => [
        ...prev,
        {
          id: `record_${Date.now()}`,
          text: `Flight Completed! +${score} PTS`,
          points: score,
          x: 0.5,
          y: 0.35,
          opacity: 1,
          createdAt: Date.now(),
          color: '#34D399',
        },
      ]);
    }

    // Reset round counters seamlessly
    setScore(0);
    setGesturesCompleted(0);
    setTimeLeft(90);
    setCurrentStatus('New flight started! Move your body to guide butterflies.');
  };

  // 3. Periodic Special Events: Golden & Rainbow butterflies
  useEffect(() => {
    specialEventIntervalRef.current = window.setInterval(() => {
      const isGolden = Math.random() > 0.4;
      if (isGolden) {
        simulationRef.current.spawnGoldenButterfly();
        soundService.playGoldenBonus();
        setCurrentStatus('Golden Butterfly arrived! +20 Bonus!');
        setScorePopups((prev) => [
          ...prev,
          {
            id: `gold_${Date.now()}`,
            text: 'Golden Butterfly Arrived!',
            points: 20,
            x: 0.5,
            y: 0.25,
            opacity: 1,
            createdAt: Date.now(),
            color: '#FBBF24',
          },
        ]);
        setScore((s) => s + 20);
        setSpecialInteractions((si) => si + 1);
        setButterfliesAttracted((ba) => ba + 2);
      } else {
        simulationRef.current.spawnRainbowButterfly();
        soundService.playChime();
        setCurrentStatus('Rainbow Butterfly soaring overhead!');
        setSpecialInteractions((si) => si + 1);
      }
    }, 24000);

    return () => {
      if (specialEventIntervalRef.current) clearInterval(specialEventIntervalRef.current);
    };
  }, []);

  // 4. Main Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
      simulationRef.current.resize(canvas.width, canvas.height);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    simulationRef.current.initSwarm(42);

    const loop = (timestamp: number) => {
      const w = canvas.width;
      const h = canvas.height;
      const tracking = cameraTrackingService.getData();

      // Process gesture recognition
      const gestures = gestureDetectorRef.current.processTracking(tracking);
      gestures.forEach((g: GestureDetectionResult) => {
        setScore((s) => s + g.scoreDelta);
        setGesturesCompleted((gc) => gc + 1);
        setCurrentStatus(g.label);

        if (g.gesture === 'SPREAD_ARMS') {
          soundService.playSwarmAttract();
          simulationRef.current.attractAdditionalSwarm(8);
          setButterfliesAttracted((b) => b + 8);
        } else if (g.gesture === 'WAVE_HAND') {
          soundService.playScatter();
          const waveX = g.position.x * w;
          const waveY = g.position.y * h;
          simulationRef.current.triggerScatter(waveX, waveY, 16);
        } else if (g.gesture === 'BODY_MOVE') {
          soundService.playWingFlutter();
        } else if (g.gesture === 'DUAL_HAND_TRAILS') {
          soundService.playChime([523.25, 659.25, 783.99, 1046.5]);
          setButterfliesAttracted((b) => b + 2);
        }

        setScorePopups((prev) => [
          ...prev,
          {
            id: `${g.gesture}_${Date.now()}`,
            text: `+${g.scoreDelta} ${g.label}`,
            points: g.scoreDelta,
            x: g.position.x,
            y: g.position.y,
            opacity: 1,
            createdAt: Date.now(),
          },
        ]);
      });

      // Update simulation physics: butterflies follow body and hands directly!
      simulationRef.current.update(
        tracking,
        gestureDetectorRef.current.isSpreadingArms,
        gestureDetectorRef.current.isDualTrailsActive,
        timestamp
      );

      ctx.clearRect(0, 0, w, h);

      // --- LAYER 1: Background Enchanted Glade ---
      if (bgImageRef.current) {
        ctx.drawImage(bgImageRef.current, 0, 0, w, h);
      } else {
        ctx.fillStyle = '#020617';
        ctx.fillRect(0, 0, w, h);
      }

      // Soft vignette
      const vigGrad = ctx.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, w * 0.7);
      vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
      vigGrad.addColorStop(1, 'rgba(2, 6, 23, 0.75)');
      ctx.fillStyle = vigGrad;
      ctx.fillRect(0, 0, w, h);

      // --- LAYER 2: BUTTERFLIES TRAILING BEHIND THE PERSON (z < 0) ---
      simulationRef.current.renderLayer(ctx, 'behind');

      // --- LAYER 3: THE VISITOR (Live Mirrored Reflection / Silhouette) ---
      const video = videoRef.current;
      if (video && video.readyState >= 2) {
        ctx.save();
        ctx.translate(w, 0);
        ctx.scale(-1, 1);

        if (visitorMode === 'mirror') {
          ctx.globalAlpha = 0.52;
          ctx.globalCompositeOperation = 'screen';
          ctx.drawImage(video, 0, 0, w, h);
        } else {
          ctx.globalAlpha = 0.32;
          ctx.globalCompositeOperation = 'lighter';
          ctx.drawImage(video, 0, 0, w, h);
        }
        ctx.restore();
      }

      // Visitor magical glowing contour & joint indicators
      if (tracking.isDetected && tracking.bodyCenter) {
        const bcX = tracking.bodyCenter.x * w;
        const bcY = tracking.bodyCenter.y * h;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        // Glowing body center aura
        const auraGrad = ctx.createRadialGradient(bcX, bcY, 15, bcX, bcY, 130);
        auraGrad.addColorStop(0, 'rgba(52, 211, 153, 0.35)');
        auraGrad.addColorStop(0.5, 'rgba(56, 189, 248, 0.18)');
        auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = auraGrad;
        ctx.beginPath();
        ctx.arc(bcX, bcY, 130, 0, Math.PI * 2);
        ctx.fill();

        // High-precision skeleton connection lines and anatomical joints
        const lms = tracking.landmarks;
        if (lms && lms.length >= 25) {
          ctx.strokeStyle = 'rgba(52, 211, 153, 0.65)';
          ctx.lineWidth = 3.5;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';

          const drawBone = (idxA: number, idxB: number) => {
            const a = lms[idxA];
            const b = lms[idxB];
            if (a && b && (a.visibility ?? 1) > 0.25 && (b.visibility ?? 1) > 0.25) {
              ctx.beginPath();
              ctx.moveTo(a.x * w, a.y * h);
              ctx.lineTo(b.x * w, b.y * h);
              ctx.stroke();
            }
          };

          // Torso & head
          drawBone(11, 12); // Shoulders
          drawBone(11, 23); // Left torso
          drawBone(12, 24); // Right torso
          drawBone(23, 24); // Hips
          drawBone(0, 11);  // Head to left shoulder
          drawBone(0, 12);  // Head to right shoulder

          // Arms
          drawBone(11, 13); // Left upper arm
          drawBone(13, 15); // Left forearm
          drawBone(15, 19); // Left wrist to index
          drawBone(12, 14); // Right upper arm
          drawBone(14, 16); // Right forearm
          drawBone(16, 20); // Right wrist to index

          // Joint glowing nodes
          [0, 11, 12, 13, 14, 15, 16, 19, 20, 23, 24].forEach((idx) => {
            const pt = lms[idx];
            if (pt && (pt.visibility ?? 1) > 0.25) {
              ctx.beginPath();
              ctx.arc(pt.x * w, pt.y * h, idx >= 15 ? 7 : 5, 0, Math.PI * 2);
              ctx.fillStyle = idx >= 19 ? '#FEF08A' : idx >= 15 ? '#38BDF8' : '#34D399';
              ctx.fill();
            }
          });
        } else if (tracking.leftShoulder && tracking.rightShoulder) {
          ctx.strokeStyle = 'rgba(52, 211, 153, 0.5)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(tracking.leftShoulder.x * w, tracking.leftShoulder.y * h);
          ctx.lineTo(tracking.rightShoulder.x * w, tracking.rightShoulder.y * h);
          if (tracking.leftWrist) ctx.lineTo(tracking.leftWrist.x * w, tracking.leftWrist.y * h);
          ctx.moveTo(tracking.rightShoulder.x * w, tracking.rightShoulder.y * h);
          if (tracking.rightWrist) ctx.lineTo(tracking.rightWrist.x * w, tracking.rightWrist.y * h);
          ctx.stroke();
        }

        // Luminous focal bursts on hand positions
        if (tracking.leftFingertip || tracking.leftWrist) {
          const pt = tracking.leftFingertip || tracking.leftWrist!;
          const lx = pt.x * w;
          const ly = pt.y * h;
          const handGrad = ctx.createRadialGradient(lx, ly, 3, lx, ly, 50);
          handGrad.addColorStop(0, 'rgba(56, 189, 248, 0.95)');
          handGrad.addColorStop(0.5, 'rgba(56, 189, 248, 0.35)');
          handGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = handGrad;
          ctx.beginPath();
          ctx.arc(lx, ly, 50, 0, Math.PI * 2);
          ctx.fill();
        }

        if (tracking.rightFingertip || tracking.rightWrist) {
          const pt = tracking.rightFingertip || tracking.rightWrist!;
          const rx = pt.x * w;
          const ry = pt.y * h;
          const handGrad = ctx.createRadialGradient(rx, ry, 3, rx, ry, 50);
          handGrad.addColorStop(0, 'rgba(192, 132, 252, 0.95)');
          handGrad.addColorStop(0.5, 'rgba(192, 132, 252, 0.35)');
          handGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = handGrad;
          ctx.beginPath();
          ctx.arc(rx, ry, 50, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }

      // --- LAYER 4: BUTTERFLIES IN FRONT OF THE PERSON (z >= 0) ---
      simulationRef.current.renderLayer(ctx, 'front');

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [visitorMode]);

  // Score popups fade and move upward
  useEffect(() => {
    const popInterval = setInterval(() => {
      setScorePopups((prev) =>
        prev
          .map((p) => ({
            ...p,
            y: p.y - 0.003,
            opacity: p.opacity - 0.03,
          }))
          .filter((p) => p.opacity > 0)
      );
    }, 40);

    return () => clearInterval(popInterval);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleSaveName = () => {
    if (tempName.trim()) {
      setPlayerName(tempName.trim());
    }
    setIsEditingName(false);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-screen h-screen overflow-hidden bg-slate-950 flex flex-col select-none"
    >
      {/* Video element actively decoding frames in background */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className="fixed top-0 left-0 w-64 h-48 -z-50 pointer-events-none opacity-[0.01]"
      />

      {/* Main Interactive Area: 100% full screen */}
      <div className="relative w-full h-full flex flex-col overflow-hidden bg-slate-950">
        {/* Real-time Canvas */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full z-10"
        />

        {/* Live Camera PiP Monitor */}
        {showCameraPiP && (
          <div className="absolute top-20 left-6 z-30 w-44 sm:w-52 bg-slate-900/90 border border-emerald-500/40 rounded-xl overflow-hidden shadow-2xl backdrop-blur-md pointer-events-auto">
            <div className="flex items-center justify-between px-2.5 py-1.5 bg-slate-950/80 border-b border-emerald-900/40 text-[10px] text-emerald-300 font-semibold">
              <span className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${trackingData.isDetected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                Live  Tracking
              </span>
              <button
                type="button"
                onClick={() => setShowCameraPiP(false)}
                className="text-slate-400 hover:text-white px-1 cursor-pointer"
                title="Hide Camera Preview"
              >
                ✕
              </button>
            </div>
            <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
              {videoRef.current && (
                <video
                  ref={(elem) => {
                    if (elem && videoRef.current?.srcObject && elem.srcObject !== videoRef.current.srcObject) {
                      elem.srcObject = videoRef.current.srcObject;
                      elem.play().catch(() => {});
                    }
                  }}
                  playsInline
                  muted
                  autoPlay
                  className="w-full h-full object-cover transform -scale-x-100"
                />
              )}
              {trackingData.bodyCenter && (
                <div
                  style={{
                    left: `${trackingData.bodyCenter.x * 100}%`,
                    top: `${trackingData.bodyCenter.y * 100}%`,
                  }}
                  className="absolute w-3 h-3 -translate-x-1/2 -translate-y-1/2 bg-amber-400 rounded-full border border-white shadow-lg pointer-events-none"
                />
              )}
              {trackingData.leftWrist && (
                <div
                  style={{
                    left: `${trackingData.leftWrist.x * 100}%`,
                    top: `${trackingData.leftWrist.y * 100}%`,
                  }}
                  className="absolute w-2.5 h-2.5 -translate-x-1/2 -translate-y-1/2 bg-sky-400 rounded-full border border-white pointer-events-none"
                />
              )}
              {trackingData.rightWrist && (
                <div
                  style={{
                    left: `${trackingData.rightWrist.x * 100}%`,
                    top: `${trackingData.rightWrist.y * 100}%`,
                  }}
                  className="absolute w-2.5 h-2.5 -translate-x-1/2 -translate-y-1/2 bg-purple-400 rounded-full border border-white pointer-events-none"
                />
              )}
            </div>
            <div className="px-2 py-1 text-[9px] text-slate-400 bg-slate-950/70 flex justify-between">
              <span>{trackingData.isDetected ? 'Subject In Frame' : 'Step into view'}</span>
              {trackingData.bodyCenter && (
                <span className="font-mono text-emerald-400">
                  X: {Math.round(trackingData.bodyCenter.x * 100)}%
                </span>
              )}
            </div>
          </div>
        )}

        {/* Floating Score Popups */}
        <div className="absolute inset-0 pointer-events-none z-20">
          {scorePopups.map((popup) => (
            <div
              key={popup.id}
              style={{
                left: `${popup.x * 100}%`,
                top: `${popup.y * 100}%`,
                opacity: popup.opacity,
                color: popup.color || '#FDE047',
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2 font-serif font-black text-xl sm:text-2xl drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)] tracking-wider whitespace-nowrap animate-pulse"
            >
              {popup.text}
            </div>
          ))}
        </div>

        {/* HUD Top Bar */}
        <div className="relative z-30 flex items-center justify-between p-4 sm:p-6 bg-gradient-to-b from-slate-950/90 via-slate-950/40 to-transparent">
          {/* Player & Current score */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Inline Editable Player Badge */}
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900/80 border border-emerald-500/30 backdrop-blur-md">
              <User className="w-4 h-4 text-emerald-400" />
              {isEditingName ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                    maxLength={20}
                    autoFocus
                    className="w-24 px-1.5 py-0.5 text-xs bg-slate-950 border border-emerald-500 rounded text-white focus:outline-none"
                  />
                  <button
                    onClick={handleSaveName}
                    className="p-1 text-emerald-400 hover:text-emerald-300"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => {
                    setTempName(playerName);
                    setIsEditingName(true);
                  }}
                  className="cursor-pointer group flex items-center gap-1.5"
                  title="Click to change your explorer name"
                >
                  <div>
                    <span className="text-xs font-semibold text-white block leading-tight group-hover:text-amber-200 transition-colors">
                      {playerName}
                    </span>
                    <span className="text-[10px] text-emerald-400">Click to edit name</span>
                  </div>
                  <Edit3 className="w-3 h-3 text-slate-500 group-hover:text-amber-300 opacity-60" />
                </div>
              )}
            </div>

            {/* Score */}
            <div className="flex items-baseline gap-1.5 px-2 py-1.5 rounded-xl bg-amber-950/60 border border-amber-500/40 backdrop-blur-md">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="font-mono text-2xl font-black text-amber-300 tabular-nums">
                {score}
              </span>
              <span className="text-xs text-amber-200/80 font-medium">PTS</span>
            </div>
          </div>

          {/* Experience Flight Timer & Record Button */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900/80 border border-slate-700/60 backdrop-blur-md">
              <Timer className={`w-4 h-4 ${timeLeft <= 15 ? 'text-rose-400 animate-spin' : 'text-emerald-400'}`} />
              <div className="text-center">
                <span className={`font-mono text-lg font-bold tabular-nums ${timeLeft <= 15 ? 'text-rose-400' : 'text-white'}`}>
                  {formatTime(timeLeft)}
                </span>
                <span className="text-[9px] text-slate-400 block leading-none"></span>
              </div>
            </div>

            <button
              onClick={handleRecordAndRestartRound}
              title="Save current score to leaderboard and start new round"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-900/60 hover:bg-emerald-800/80 text-emerald-200 border border-emerald-500/40 backdrop-blur-md transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">New Flight</span>
            </button>
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-2">
            {/* Gestures Guide Button */}
            <button
              onClick={() => setShowGuideModal(true)}
              title="How to Play / Gestures Guide"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700/50 backdrop-blur-md text-xs transition-colors cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Gestures</span>
            </button>

            {/* Visitor View Mode Toggle */}
            <button
              onClick={() => setVisitorMode((m) => (m === 'mirror' ? 'silhouette' : 'mirror'))}
              title={`Switch Visitor View (${visitorMode === 'mirror' ? 'Mirror Reflection' : 'Glow Silhouette'})`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700/50 backdrop-blur-md text-xs transition-colors cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">
                {visitorMode === 'mirror' ? 'Mirror' : 'Silhouette'}
              </span>
            </button>

            <button
              onClick={onToggleMute}
              aria-label={isMuted ? 'Unmute Audio' : 'Mute Audio'}
              className="p-2 rounded-lg bg-slate-900/70 hover:bg-slate-800 text-slate-200 border border-slate-700/50 backdrop-blur-md transition-colors cursor-pointer"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>
            <button
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
              className="p-2 rounded-lg bg-slate-900/70 hover:bg-slate-800 text-slate-200 border border-slate-700/50 backdrop-blur-md transition-colors cursor-pointer"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* HUD Bottom Status Banner */}
        <div className="relative z-30 mt-auto flex items-center justify-between p-4 sm:p-6 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent">
          {/* Interaction status banner */}
          <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-slate-900/80 border border-emerald-500/30 backdrop-blur-md max-w-md">
            <Zap className="w-4 h-4 text-amber-400 shrink-0 animate-bounce" />
            <div className="truncate">
              <div className="text-xs font-semibold text-emerald-200 truncate">
                {currentStatus}
              </div>
              <div className="text-[10px] text-slate-400">
                {trackingData.bodyCenter
                  ? `Following body at X: ${Math.round(trackingData.bodyCenter.x * 100)}% · Move left or right to guide swarm`
                  : 'Step in front of camera and move your body to guide the butterflies'}
              </div>
            </div>
          </div>

          {/* Butterflies count & Gestures count */}
          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 rounded-xl bg-slate-900/70 border border-slate-700/50 backdrop-blur-md text-right">
              <span className="font-mono text-sm font-bold text-emerald-300 tabular-nums">
                {butterfliesAttracted}
              </span>
              <span className="text-[10px] text-slate-400 block leading-tight">Attracted</span>
            </div>

            <div className="px-3 py-1.5 rounded-xl bg-slate-900/70 border border-slate-700/50 backdrop-blur-md text-right">
              <span className="font-mono text-sm font-bold text-amber-300 tabular-nums">
                {gesturesCompleted}
              </span>
              <span className="text-[10px] text-slate-400 block leading-tight">Gestures</span>
            </div>

            {/* Small camera tracking indicator in corner with PiP toggle */}
            <button
              type="button"
              onClick={() => setShowCameraPiP((p) => !p)}
              title="Click to toggle live camera view"
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-850 border border-slate-800 backdrop-blur-md text-[11px] text-slate-300 transition-colors cursor-pointer"
            >
              <Camera className={`w-3.5 h-3.5 ${trackingData.isDetected ? 'text-emerald-400' : 'text-amber-400'}`} />
              <span className="hidden sm:inline">
                {trackingData.isDetected ? 'Body Tracking Active (PiP)' : 'Step into view'}
              </span>
            </button>
          </div>
        </div>

        {/* Non-Blocking How to Play / Gesture Guide Modal */}
        {showGuideModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-xl bg-slate-900 border border-emerald-500/40 rounded-2xl p-6 shadow-2xl relative space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-emerald-900/40">
                <h3 className="font-serif text-lg font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  HOW TO INTERACT
                </h3>
                <button
                  onClick={() => setShowGuideModal(false)}
                  className="text-slate-400 hover:text-white text-sm px-2 py-1 rounded cursor-pointer"
                >
                  ✕ Close
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-300 mb-1">
                    <Feather className="w-4 h-4" /> OPEN BOTH ARMS
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Spread both arms wide. Attracts an influx of butterflies into a magnificent swarm! (+10 pts)
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="flex items-center gap-2 text-xs font-bold text-sky-300 mb-1">
                    <Waves className="w-4 h-4" /> WAVE YOUR HAND
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Wave side-to-side. Butterflies scatter outward in glowing bursts then gently return! (+5 pts)
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-300 mb-1">
                    <PersonStanding className="w-4 h-4" /> MOVE YOUR BODY
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Step or lean left or right. The entire butterfly swarm follows your moving body in real time! (+5 pts)
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="flex items-center gap-2 text-xs font-bold text-purple-300 mb-1">
                    <Hand className="w-4 h-4" /> MOVE BOTH HANDS
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Move hands through the air to weave luminous twin butterfly trails! (+10 pts)
                  </p>
                </div>
              </div>

              <div className="pt-2 text-center">
                <button
                  onClick={() => setShowGuideModal(false)}
                  className="px-6 py-2.5 rounded-xl font-serif font-bold text-xs text-slate-950 bg-gradient-to-r from-amber-300 to-emerald-300 hover:from-amber-200 hover:to-emerald-200 cursor-pointer"
                >
                  RETURN TO GARDEN
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
