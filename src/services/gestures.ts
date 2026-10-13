import { TrackingData, GestureDetectionResult } from '../types';

interface HistoryPoint {
  x: number;
  y: number;
  time: number;
}

export class GestureDetector {
  private leftWristHistory: HistoryPoint[] = [];
  private rightWristHistory: HistoryPoint[] = [];
  private bodyCenterHistory: HistoryPoint[] = [];

  // Cooldown timers in ms
  private lastSpreadArmsTime = 0;
  private lastWaveTime = 0;
  private lastBodyMoveTime = 0;
  private lastDualHandsTime = 0;

  // Gesture state indicators
  public isSpreadingArms = false;
  public isWaving = false;
  public wavingHand: 'left' | 'right' | null = null;
  public isDualTrailsActive = false;

  public processTracking(data: TrackingData): GestureDetectionResult[] {
    const now = performance.now();
    const results: GestureDetectionResult[] = [];

    if (!data.isDetected) {
      this.isSpreadingArms = false;
      this.isWaving = false;
      this.wavingHand = null;
      this.isDualTrailsActive = false;
      return results;
    }

    // Update historical trajectories
    if (data.leftWrist) {
      this.leftWristHistory.push({ x: data.leftWrist.x, y: data.leftWrist.y, time: now });
      if (this.leftWristHistory.length > 25) this.leftWristHistory.shift();
    }
    if (data.rightWrist) {
      this.rightWristHistory.push({ x: data.rightWrist.x, y: data.rightWrist.y, time: now });
      if (this.rightWristHistory.length > 25) this.rightWristHistory.shift();
    }
    if (data.bodyCenter) {
      this.bodyCenterHistory.push({ x: data.bodyCenter.x, y: data.bodyCenter.y, time: now });
      if (this.bodyCenterHistory.length > 30) this.bodyCenterHistory.shift();
    }

    // 1. GESTURE 1: OPEN BOTH ARMS (Attract Swarm)
    // armSpreadRatio = wristDist / shoulderDist. Normally ~1.0 - 1.4. Spread arms >= 1.85.
    if (data.leftWrist && data.rightWrist && data.shoulderWidth > 0.05) {
      const wristDist = Math.hypot(data.rightWrist.x - data.leftWrist.x, data.rightWrist.y - data.leftWrist.y);
      const isSpread = data.armSpreadRatio > 1.85 || wristDist > 0.42;

      this.isSpreadingArms = isSpread;

      if (isSpread && now - this.lastSpreadArmsTime > 4000) {
        this.lastSpreadArmsTime = now;
        results.push({
          gesture: 'SPREAD_ARMS',
          label: 'Swarm Attracted!',
          scoreDelta: 10,
          position: {
            x: (data.leftWrist.x + data.rightWrist.x) / 2,
            y: (data.leftWrist.y + data.rightWrist.y) / 2,
          },
          timestamp: now,
        });
      }
    } else {
      this.isSpreadingArms = false;
    }

    // 2. GESTURE 2: WAVE YOUR HAND (Scatter Butterflies)
    const checkWave = (history: HistoryPoint[], hand: 'left' | 'right'): boolean => {
      if (history.length < 8) return false;
      const recent = history.slice(-8);
      let dxTotal = 0;
      let reversals = 0;
      let lastDir = 0;

      for (let i = 1; i < recent.length; i++) {
        const dx = recent[i].x - recent[i - 1].x;
        dxTotal += Math.abs(dx);
        const dir = dx > 0.008 ? 1 : dx < -0.008 ? -1 : 0;
        if (dir !== 0 && lastDir !== 0 && dir !== lastDir) {
          reversals++;
        }
        if (dir !== 0) lastDir = dir;
      }

      // At least 2 direction reversals within ~300ms and sufficient movement amplitude
      return reversals >= 2 && dxTotal > 0.09;
    };

    const leftWave = checkWave(this.leftWristHistory, 'left');
    const rightWave = checkWave(this.rightWristHistory, 'right');

    if (leftWave || rightWave) {
      this.isWaving = true;
      this.wavingHand = rightWave ? 'right' : 'left';

      if (now - this.lastWaveTime > 2800) {
        this.lastWaveTime = now;
        const wavePos = rightWave && data.rightWrist ? data.rightWrist : data.leftWrist || { x: 0.5, y: 0.5 };
        results.push({
          gesture: 'WAVE_HAND',
          label: 'Butterflies Scattered!',
          scoreDelta: 5,
          position: wavePos,
          timestamp: now,
        });
      }
    } else {
      this.isWaving = false;
      this.wavingHand = null;
    }

    // 3. GESTURE 3: MOVE BODY (Guide Butterflies)
    if (data.bodyCenter && this.bodyCenterHistory.length >= 15) {
      const oldest = this.bodyCenterHistory[0];
      const newest = this.bodyCenterHistory[this.bodyCenterHistory.length - 1];
      const bodyDisplacement = Math.hypot(newest.x - oldest.x, newest.y - oldest.y);

      if (bodyDisplacement > 0.14 && now - this.lastBodyMoveTime > 3500) {
        this.lastBodyMoveTime = now;
        results.push({
          gesture: 'BODY_MOVE',
          label: 'Swarm Guided!',
          scoreDelta: 5,
          position: { x: data.bodyCenter.x, y: data.bodyCenter.y },
          timestamp: now,
        });
      }
    }

    // 4. GESTURE 4: DUAL HAND TRAILS (Independent Hand Movement)
    if (data.leftWrist && data.rightWrist && !this.isSpreadingArms) {
      const leftMove = this.getVelocity(this.leftWristHistory);
      const rightMove = this.getVelocity(this.rightWristHistory);
      const handsApart = Math.hypot(data.rightWrist.x - data.leftWrist.x, data.rightWrist.y - data.leftWrist.y) > 0.18;

      if (leftMove > 0.05 && rightMove > 0.05 && handsApart) {
        this.isDualTrailsActive = true;
        if (now - this.lastDualHandsTime > 4500) {
          this.lastDualHandsTime = now;
          results.push({
            gesture: 'DUAL_HAND_TRAILS',
            label: 'Twin Magic Trails!',
            scoreDelta: 10,
            position: {
              x: (data.leftWrist.x + data.rightWrist.x) / 2,
              y: (data.leftWrist.y + data.rightWrist.y) / 2,
            },
            timestamp: now,
          });
        }
      } else {
        this.isDualTrailsActive = false;
      }
    } else {
      this.isDualTrailsActive = false;
    }

    return results;
  }

  private getVelocity(history: HistoryPoint[]): number {
    if (history.length < 4) return 0;
    const start = history[history.length - 4];
    const end = history[history.length - 1];
    return Math.hypot(end.x - start.x, end.y - start.y);
  }

  public reset() {
    this.leftWristHistory = [];
    this.rightWristHistory = [];
    this.bodyCenterHistory = [];
    this.lastSpreadArmsTime = 0;
    this.lastWaveTime = 0;
    this.lastBodyMoveTime = 0;
    this.lastDualHandsTime = 0;
    this.isSpreadingArms = false;
    this.isWaving = false;
    this.wavingHand = null;
    this.isDualTrailsActive = false;
  }
}
