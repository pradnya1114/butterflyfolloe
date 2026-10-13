export type PageState = 'WELCOME' | 'TUTORIAL' | 'EXPERIENCE' | 'RESULTS';

export interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
  butterfliesAttracted: number;
  gesturesCompleted: number;
  date: string;
}

export interface LandmarkPoint {
  x: number; // 0 to 1 (normalized, mirrored so x=0 is screen left)
  y: number; // 0 to 1 (normalized)
  z?: number;
  visibility?: number;
}

export interface TrackingData {
  isDetected: boolean;
  hasBody: boolean;
  hasHands: boolean;
  bodyCenter: { x: number; y: number } | null;
  leftShoulder: { x: number; y: number } | null;
  rightShoulder: { x: number; y: number } | null;
  leftWrist: { x: number; y: number } | null;
  rightWrist: { x: number; y: number } | null;
  leftFingertip: { x: number; y: number } | null;
  rightFingertip: { x: number; y: number } | null;
  shoulderWidth: number;
  armSpreadRatio: number;
  landmarks?: LandmarkPoint[];
  cameraReady: boolean;
  statusText: 'INITIALIZING' | 'CAMERA_READY' | 'BODY_DETECTED' | 'HANDS_DETECTED' | 'MOVE_INTO_VIEW' | 'PERMISSION_DENIED' | 'ERROR';
}

export type GestureType = 
  | 'SPREAD_ARMS' 
  | 'WAVE_HAND' 
  | 'BODY_MOVE' 
  | 'DUAL_HAND_TRAILS' 
  | 'GOLDEN_EVENT'
  | 'SPIRAL_EVENT';

export interface GestureDetectionResult {
  gesture: GestureType;
  label: string;
  scoreDelta: number;
  position: { x: number; y: number };
  timestamp: number;
}

export interface ScorePopup {
  id: string;
  text: string;
  points: number;
  x: number;
  y: number;
  opacity: number;
  createdAt: number;
  color?: string;
}

export type ButterflySpecies = 'azure' | 'amethyst' | 'amber' | 'emerald' | 'rose' | 'golden' | 'rainbow';

export interface ButterflyTrailPoint {
  x: number;
  y: number;
  alpha: number;
  size: number;
}

export interface ButterflyEntity {
  id: number;
  x: number;
  y: number;
  z: number; // -1 (behind person) to 1 (in front of person)
  vx: number;
  vy: number;
  targetX: number;
  targetY: number;
  targetZ: number;
  targetType: 'ambient' | 'body' | 'left_hand' | 'right_hand' | 'scatter' | 'spiral';
  species: ButterflySpecies;
  size: number;
  wingPhase: number;
  wingSpeed: number;
  angle: number;
  scatterTimer: number;
  spiralAngle: number;
  trail: ButterflyTrailPoint[];
  wanderNoiseOffset: number;
  hue: number;
  trailDelayIndex: number;
}

export interface ParticleEntity {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
  life: number;
  maxLife: number;
}

export interface SessionStats {
  playerName: string;
  score: number;
  butterfliesAttracted: number;
  gesturesCompleted: number;
  specialInteractions: number;
  durationSeconds: number;
  rank?: number;
}
