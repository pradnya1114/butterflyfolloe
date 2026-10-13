import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Hand,
  PersonStanding,
  Waves,
  Feather,
} from 'lucide-react';
import { cameraTrackingService } from '../services/tracking';
import { GestureDetector } from '../services/gestures';
import { TrackingData, GestureDetectionResult } from '../types';
import { soundService } from '../services/sound';

interface TutorialScreenProps {
  playerName: string;
  onBack: () => void;
  onStartExperience: () => void;
}

export const TutorialScreen: React.FC<TutorialScreenProps> = ({
  playerName,
  onBack,
  onStartExperience,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [trackingData, setTrackingData] = useState<TrackingData>(cameraTrackingService.getData());
  const [activeTab, setActiveTab] = useState<'tutorial' | 'camera_test'>('tutorial');
  const [cameraLoading, setCameraLoading] = useState(false);
  const [recentGesture, setRecentGesture] = useState<string | null>(null);
  const [activeGestureIdx, setActiveGestureIdx] = useState(0);

  const gestureDetectorRef = useRef<GestureDetector>(new GestureDetector());

  // Gestures tutorial definitions
  const gestures = [
    {
      title: 'OPEN BOTH ARMS',
      action: 'ATTRACT A SWARM',
      desc: 'Spread both arms wide apart relative to your shoulders. Watch dozens of butterflies soar in from the forest canopy to swarm your hands and chest!',
      icon: Feather,
      color: 'from-amber-400 to-amber-600',
      badge: '+10 Points',
    },
    {
      title: 'WAVE YOUR HAND',
      action: 'SCATTER BUTTERFLIES',
      desc: 'Wave your left or right hand side-to-side with a deliberate gesture. Butterflies will scatter outwards in a bright burst, leaving colorful trails before gently returning.',
      icon: Waves,
      color: 'from-sky-400 to-blue-600',
      badge: '+5 Points',
    },
    {
      title: 'MOVE YOUR BODY',
      action: 'GUIDE THE SWARM',
      desc: 'Step or lean from side to side. The butterfly swarm gracefully follows your body center with smooth, organic floating movement across the glade.',
      icon: PersonStanding,
      color: 'from-emerald-400 to-teal-600',
      badge: '+5 Points',
    },
    {
      title: 'MOVE BOTH HANDS',
      action: 'DUAL MAGIC TRAILS',
      desc: 'Move both hands simultaneously across the air to weave twin luminous butterfly trails. Bring your hands together to merge them into a brilliant vortex!',
      icon: Hand,
      color: 'from-purple-400 to-fuchsia-600',
      badge: '+10 Points',
    },
  ];

  // Subscribe to tracking updates
  useEffect(() => {
    const unsubscribe = cameraTrackingService.subscribe((data) => {
      setTrackingData(data);

      // Process gestures for live calibration feedback
      const results: GestureDetectionResult[] = gestureDetectorRef.current.processTracking(data);
      if (results.length > 0) {
        const last = results[results.length - 1];
        setRecentGesture(last.label);
        soundService.playChime([659.25, 830.61]);
        setTimeout(() => {
          setRecentGesture((cur) => (cur === last.label ? null : cur));
        }, 2500);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Initialize camera preview on mount or when switching to camera test
  useEffect(() => {
    let mounted = true;
    const startCam = async () => {
      if (!videoRef.current) return;
      setCameraLoading(true);
      await cameraTrackingService.attachVideo(videoRef.current);
      if (mounted) setCameraLoading(false);
    };

    startCam();

    return () => {
      mounted = false;
    };
  }, []);

  // Render camera overlay landmarks on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const draw = () => {
      const w = (canvas.width = canvas.parentElement?.clientWidth || 640);
      const h = (canvas.height = canvas.parentElement?.clientHeight || 480);
      ctx.clearRect(0, 0, w, h);

      const d = cameraTrackingService.getData();

      if (d.isDetected && d.landmarks && d.landmarks.length > 0) {
        // Draw body skeleton connection lines
        ctx.strokeStyle = 'rgba(52, 211, 153, 0.6)';
        ctx.lineWidth = 3;

        // Draw shoulders to wrists
        if (d.leftShoulder && d.leftWrist) {
          ctx.beginPath();
          ctx.moveTo(d.leftShoulder.x * w, d.leftShoulder.y * h);
          ctx.lineTo(d.leftWrist.x * w, d.leftWrist.y * h);
          ctx.stroke();
        }

        if (d.rightShoulder && d.rightWrist) {
          ctx.beginPath();
          ctx.moveTo(d.rightShoulder.x * w, d.rightShoulder.y * h);
          ctx.lineTo(d.rightWrist.x * w, d.rightWrist.y * h);
          ctx.stroke();
        }

        // Draw body center glow
        if (d.bodyCenter) {
          const bcX = d.bodyCenter.x * w;
          const bcY = d.bodyCenter.y * h;
          const grad = ctx.createRadialGradient(bcX, bcY, 2, bcX, bcY, 35);
          grad.addColorStop(0, 'rgba(251, 191, 36, 0.9)');
          grad.addColorStop(1, 'rgba(251, 191, 36, 0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(bcX, bcY, 35, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#FEF08A';
          ctx.beginPath();
          ctx.arc(bcX, bcY, 6, 0, Math.PI * 2);
          ctx.fill();
        }

        // Draw glowing circles on wrists/hands
        if (d.leftWrist) {
          const lx = d.leftWrist.x * w;
          const ly = d.leftWrist.y * h;
          ctx.fillStyle = 'rgba(56, 189, 248, 0.8)';
          ctx.beginPath();
          ctx.arc(lx, ly, 12, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#FFFFFF';
          ctx.stroke();
        }

        if (d.rightWrist) {
          const rx = d.rightWrist.x * w;
          const ry = d.rightWrist.y * h;
          ctx.fillStyle = 'rgba(192, 132, 252, 0.8)';
          ctx.beginPath();
          ctx.arc(rx, ry, 12, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#FFFFFF';
          ctx.stroke();
        }
      }

      animId = requestAnimationFrame(draw);
    };

    animId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animId);
  }, []);

  const handleRetryCamera = async () => {
    if (!videoRef.current) return;
    setCameraLoading(true);
    cameraTrackingService.stopCamera();
    await cameraTrackingService.initCamera(videoRef.current);
    setCameraLoading(false);
  };

  const getStatusBadge = () => {
    if (trackingData.statusText === 'HANDS_DETECTED') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          HANDS DETECTED & READY
        </span>
      );
    }
    if (trackingData.statusText === 'BODY_DETECTED') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-teal-500/20 text-teal-300 border border-teal-500/40">
          <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
          BODY DETECTED
        </span>
      );
    }
    if (trackingData.statusText === 'PERMISSION_DENIED') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40">
          <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
          CAMERA ACCESS DENIED
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40">
        <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
        STEP INTO VIEW
      </span>
    );
  };

  return (
    <div className="relative min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col justify-between overflow-x-hidden">
      {/* Background artwork */}
      <img
        src="/src/assets/images/tutorial_gestures_art_1791890498318.jpg"
        alt="Tutorial Gestures Art"
        referrerPolicy="no-referrer"
        className="absolute inset-0 w-full h-full object-cover object-center filter brightness-[0.25] saturate-150 pointer-events-none"
      />
      <div className="absolute inset-0 bg-radial from-transparent via-slate-950/80 to-slate-950 pointer-events-none" />

      {/* Top Header */}
      <header className="relative z-20 flex items-center justify-between px-6 sm:px-12 py-5 border-b border-emerald-900/30 bg-slate-950/80 backdrop-blur-md">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          BACK TO WELCOME
        </button>

        <div className="text-center">
          <h1 className="font-serif text-lg sm:text-2xl font-bold text-white tracking-wide flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            LET THE BUTTERFLIES FOLLOW YOU
          </h1>
          <p className="text-xs text-emerald-400">
            Explorer: <span className="font-semibold text-amber-200">{playerName}</span> · Calibration & Gestures
          </p>
        </div>

        <button
          onClick={onStartExperience}
          className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs sm:text-sm font-serif font-bold text-slate-950 bg-gradient-to-r from-amber-300 to-emerald-300 hover:from-amber-200 hover:to-emerald-200 shadow-md transition-all"
        >
          <span>START EXPERIENCE</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </header>

      {/* Main interactive area: 2 Columns (Tutorial Cards vs Live Camera Calibration) */}
      <main className="relative z-20 flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column: 4 Interactive Gesture Cards (7 cols) */}
        <section className="lg:col-span-7 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-emerald-900/40 pb-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300 uppercase tracking-wider">
              <span>Interactive Movement Gestures</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span>Click any gesture to view details</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 flex-1">
            {gestures.map((g, idx) => {
              const Icon = g.icon;
              const isSelected = activeGestureIdx === idx;
              return (
                <div
                  key={g.title}
                  onClick={() => setActiveGestureIdx(idx)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-slate-900/90 border-emerald-400/80 shadow-lg shadow-emerald-950/60 ring-1 ring-emerald-400/50'
                      : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-900/80 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className={`p-2 rounded-lg bg-gradient-to-br ${g.color} text-slate-950 font-bold`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-600/30">
                        {g.badge}
                      </span>
                    </div>

                    <h3 className="font-serif text-sm font-bold text-white tracking-wide">
                      {g.title}
                    </h3>
                    <p className="text-xs font-medium text-emerald-300 mb-2">
                      {g.action}
                    </p>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {g.desc}
                    </p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Gesture #{idx + 1}</span>
                    {isSelected && (
                      <span className="text-emerald-400 font-semibold flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Active Focus
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Tips notice */}
          <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/30 flex items-center gap-3 text-xs text-emerald-200">
            <Camera className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Stand approximately 5 to 8 feet away so your head, shoulders, and both hands are clearly visible in the camera frame.
            </span>
          </div>
        </section>

        {/* Right Column: Camera Calibration View (5 cols) */}
        <section className="lg:col-span-5 flex flex-col bg-slate-900/85 border border-emerald-600/30 rounded-2xl p-4 backdrop-blur-xl shadow-2xl">
          <div className="flex items-center justify-between pb-3 border-b border-emerald-900/40">
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-amber-400" />
              <h2 className="font-serif text-sm font-bold text-white tracking-wide">
                CAMERA CALIBRATION
              </h2>
            </div>
            {getStatusBadge()}
          </div>

          {/* Video Preview Box (Mirrored for natural kiosk mirror feel) */}
          <div className="relative flex-1 min-h-[300px] bg-slate-950 rounded-xl overflow-hidden my-3 border border-slate-800 flex items-center justify-center">
            {/* Mirrored video stream */}
            <video
              ref={videoRef}
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover filter brightness-105 contrast-105 transform -scale-x-100"
            />

            {/* Canvas overlay for detected landmarks & skeleton */}
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none z-10"
            />

            {/* Gesture feedback banner */}
            {recentGesture && (
              <div className="absolute top-4 inset-x-4 z-20 p-2.5 rounded-lg bg-emerald-600/90 text-white font-serif font-bold text-center text-sm shadow-xl backdrop-blur-md animate-bounce border border-emerald-300">
                ✨ {recentGesture}
              </div>
            )}

            {/* Camera loading state */}
            {cameraLoading && (
              <div className="absolute inset-0 z-30 bg-slate-950/80 flex flex-col items-center justify-center gap-2">
                <RefreshCw className="w-7 h-7 text-emerald-400 animate-spin" />
                <span className="text-xs text-slate-300">Connecting to webcam sensor...</span>
              </div>
            )}

            {/* Guidance guide overlay box if not yet detected */}
            {!trackingData.isDetected && !cameraLoading && (
              <div className="absolute inset-6 border-2 border-dashed border-emerald-400/30 rounded-2xl flex flex-col items-center justify-center p-4 text-center pointer-events-none">
                <PersonStanding className="w-12 h-12 text-emerald-400/40 mb-2" />
                <p className="text-xs font-semibold text-emerald-300">
                  Position your upper body inside the frame
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Ensure good room lighting for smooth tracking
                </p>
              </div>
            )}

            {/* Live calibration telemetry */}
            {trackingData.isDetected && (
              <div className="absolute bottom-2 inset-x-2 z-20 flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-900/80 backdrop-blur-md text-[10px] text-slate-300 border border-slate-800">
                <span>
                  Arm Spread:{' '}
                  <strong className="text-amber-300 font-mono">
                    {trackingData.armSpreadRatio.toFixed(2)}x
                  </strong>
                </span>
                <span>
                  Tracking:{' '}
                  <strong className="text-emerald-400 font-mono">30 FPS Active</strong>
                </span>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="space-y-2 pt-1">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleRetryCamera}
                className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 flex items-center justify-center gap-1.5 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                <span>CALIBRATE CAMERA</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  // Simulate an arm spread gesture test so visitor can see immediate response
                  soundService.playSwarmAttract();
                  setRecentGesture('Arms Spread Detected!');
                  setTimeout(() => setRecentGesture(null), 2500);
                }}
                className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 flex items-center justify-center gap-1.5 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>TEST GESTURES</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onStartExperience}
              className="w-full py-3 px-4 rounded-xl font-serif font-bold text-sm tracking-wide text-slate-950 bg-gradient-to-r from-amber-300 via-emerald-300 to-teal-300 hover:from-amber-200 hover:to-teal-200 shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <span>ENTER BUTTERFLY GARDEN</span>
              <ArrowRight className="w-4 h-4 text-slate-950" />
            </button>
          </div>
        </section>
      </main>

      {/* Footer bar */}
      <footer className="relative z-20 py-3 px-6 text-center text-xs text-slate-400 border-t border-slate-900 bg-slate-950/80">
        All gestures are recognized in real time by your webcam. No wearable sensors required.
      </footer>
    </div>
  );
};
