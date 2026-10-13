import {
  ButterflyEntity,
  ButterflySpecies,
  ParticleEntity,
  TrackingData,
} from '../types';

export const SPECIES_PALETTES: Record<
  ButterflySpecies,
  {
    primary: string;
    secondary: string;
    edge: string;
    glow: string;
    trailColor: string;
  }
> = {
  azure: {
    primary: '#2563EB',
    secondary: '#38BDF8',
    edge: '#1E1B4B',
    glow: 'rgba(56, 189, 248, 0.4)',
    trailColor: 'rgba(56, 189, 248, 0.65)',
  },
  amethyst: {
    primary: '#7C3AED',
    secondary: '#C084FC',
    edge: '#3B0764',
    glow: 'rgba(192, 132, 252, 0.4)',
    trailColor: 'rgba(192, 132, 252, 0.65)',
  },
  amber: {
    primary: '#EA580C',
    secondary: '#FBBF24',
    edge: '#451A03',
    glow: 'rgba(251, 191, 36, 0.4)',
    trailColor: 'rgba(251, 191, 36, 0.65)',
  },
  emerald: {
    primary: '#059669',
    secondary: '#34D399',
    edge: '#064E3B',
    glow: 'rgba(52, 211, 153, 0.4)',
    trailColor: 'rgba(52, 211, 153, 0.65)',
  },
  rose: {
    primary: '#DB2777',
    secondary: '#F472B6',
    edge: '#500724',
    glow: 'rgba(244, 114, 182, 0.4)',
    trailColor: 'rgba(244, 114, 182, 0.65)',
  },
  golden: {
    primary: '#F59E0B',
    secondary: '#FEF08A',
    edge: '#78350F',
    glow: 'rgba(254, 240, 138, 0.8)',
    trailColor: 'rgba(253, 224, 71, 0.85)',
  },
  rainbow: {
    primary: '#EC4899',
    secondary: '#06B6D4',
    edge: '#312E81',
    glow: 'rgba(236, 72, 153, 0.7)',
    trailColor: 'rgba(244, 114, 182, 0.8)',
  },
};

interface PositionHistory {
  x: number;
  y: number;
}

export class ButterflySimulation {
  public butterflies: ButterflyEntity[] = [];
  public particles: ParticleEntity[] = [];
  private width: number = 1920;
  private height: number = 1080;
  private baseCount: number = 42;
  private maxCount: number = 75;
  private nextId: number = 1;

  // History path to allow butterflies to trail BEHIND the person as they move
  private bodyPathHistory: PositionHistory[] = [];
  private leftHandHistory: PositionHistory[] = [];
  private rightHandHistory: PositionHistory[] = [];
  private lastBodyPos: PositionHistory | null = null;
  private bodyVelocity: { vx: number; vy: number } = { vx: 0, vy: 0 };

  constructor() {
    this.initSwarm(this.baseCount);
  }

  public resize(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  public initSwarm(count: number = 42) {
    this.butterflies = [];
    this.particles = [];
    this.bodyPathHistory = [];
    const speciesList: ButterflySpecies[] = ['azure', 'amethyst', 'amber', 'emerald', 'rose'];

    for (let i = 0; i < count; i++) {
      const sp = speciesList[i % speciesList.length];
      this.butterflies.push(this.createButterfly(sp, undefined, undefined, i));
    }
  }

  private createButterfly(
    species: ButterflySpecies,
    startX?: number,
    startY?: number,
    indexOrder: number = 0
  ): ButterflyEntity {
    const x = startX ?? Math.random() * this.width;
    const y = startY ?? Math.random() * this.height;
    // Distribute depth: ~50% behind person (z < 0) and ~50% in front (z > 0)
    const initialZ = (indexOrder % 2 === 0 ? -1 : 1) * (0.3 + Math.random() * 0.7);

    return {
      id: this.nextId++,
      x,
      y,
      z: initialZ,
      vx: (Math.random() - 0.5) * 3,
      vy: (Math.random() - 0.5) * 3,
      targetX: x,
      targetY: y,
      targetZ: initialZ,
      targetType: 'ambient',
      species,
      size: species === 'golden' ? 26 : 16 + Math.random() * 8,
      wingPhase: Math.random() * Math.PI * 2,
      wingSpeed: 0.18 + Math.random() * 0.12,
      angle: Math.random() * Math.PI * 2,
      scatterTimer: 0,
      spiralAngle: Math.random() * Math.PI * 2,
      trail: [],
      wanderNoiseOffset: Math.random() * 1000,
      hue: Math.random() * 360,
      trailDelayIndex: (indexOrder * 2) % 35, // staggered trail delay
    };
  }

  public spawnGoldenButterfly(x?: number, y?: number) {
    const b = this.createButterfly('golden', x ?? Math.random() * this.width, y ?? 50, this.butterflies.length);
    b.size = 28;
    b.z = 0.5; // Starts in front
    this.butterflies.push(b);
  }

  public spawnRainbowButterfly(x?: number, y?: number) {
    const b = this.createButterfly('rainbow', x ?? Math.random() * this.width, y ?? 50, this.butterflies.length);
    b.size = 26;
    this.butterflies.push(b);
  }

  public attractAdditionalSwarm(amount: number = 8) {
    if (this.butterflies.length >= this.maxCount) return;
    const speciesList: ButterflySpecies[] = ['azure', 'amethyst', 'amber', 'emerald', 'rose'];
    for (let i = 0; i < amount; i++) {
      const edge = Math.floor(Math.random() * 4);
      let sx = 0;
      let sy = 0;
      if (edge === 0) { sx = Math.random() * this.width; sy = -40; }
      else if (edge === 1) { sx = this.width + 40; sy = Math.random() * this.height; }
      else if (edge === 2) { sx = Math.random() * this.width; sy = this.height + 40; }
      else { sx = -40; sy = Math.random() * this.height; }

      const sp = speciesList[Math.floor(Math.random() * speciesList.length)];
      this.butterflies.push(this.createButterfly(sp, sx, sy, this.butterflies.length));
    }
  }

  public triggerScatter(originX: number, originY: number, force: number = 18) {
    this.butterflies.forEach((b) => {
      const dx = b.x - originX;
      const dy = b.y - originY;
      const dist = Math.hypot(dx, dy);
      if (dist < 450) {
        const factor = Math.max(0.4, 1 - dist / 450);
        const ang = Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.8;
        b.vx = Math.cos(ang) * force * factor;
        b.vy = Math.sin(ang) * force * factor;
        b.scatterTimer = 45 + Math.floor(Math.random() * 30);
        b.wingSpeed = 0.4;

        for (let p = 0; p < 4; p++) {
          this.particles.push({
            x: b.x,
            y: b.y,
            vx: (Math.random() - 0.5) * 6,
            vy: (Math.random() - 0.5) * 6,
            size: 2 + Math.random() * 4,
            alpha: 1,
            color: SPECIES_PALETTES[b.species].secondary,
            life: 0,
            maxLife: 25 + Math.random() * 20,
          });
        }
      }
    });
  }

  public update(
    tracking: TrackingData,
    isSpreadingArms: boolean,
    isDualTrailsActive: boolean,
    timeMs: number
  ) {
    const hasPerson = tracking.isDetected && tracking.bodyCenter !== null;
    const bodyPix = hasPerson && tracking.bodyCenter
      ? { x: tracking.bodyCenter.x * this.width, y: tracking.bodyCenter.y * this.height }
      : null;
    const leftWristPix = tracking.leftWrist
      ? { x: tracking.leftWrist.x * this.width, y: tracking.leftWrist.y * this.height }
      : null;
    const rightWristPix = tracking.rightWrist
      ? { x: tracking.rightWrist.x * this.width, y: tracking.rightWrist.y * this.height }
      : null;
    const leftFingertipPix = tracking.leftFingertip
      ? { x: tracking.leftFingertip.x * this.width, y: tracking.leftFingertip.y * this.height }
      : leftWristPix;
    const rightFingertipPix = tracking.rightFingertip
      ? { x: tracking.rightFingertip.x * this.width, y: tracking.rightFingertip.y * this.height }
      : rightWristPix;

    // Track motion history and velocity to create trailing trail BEHIND the moving person
    if (bodyPix) {
      if (this.lastBodyPos) {
        this.bodyVelocity = {
          vx: bodyPix.x - this.lastBodyPos.x,
          vy: bodyPix.y - this.lastBodyPos.y,
        };
      }
      this.lastBodyPos = { ...bodyPix };

      this.bodyPathHistory.unshift({ ...bodyPix });
      if (this.bodyPathHistory.length > 50) this.bodyPathHistory.pop();
    } else {
      this.bodyVelocity = { vx: 0, vy: 0 };
    }

    if (leftWristPix) {
      this.leftHandHistory.unshift({ ...leftWristPix });
      if (this.leftHandHistory.length > 30) this.leftHandHistory.pop();
    }
    if (rightWristPix) {
      this.rightHandHistory.unshift({ ...rightWristPix });
      if (this.rightHandHistory.length > 30) this.rightHandHistory.pop();
    }

    // Prune excess swarm gradually when arms not spread
    if (!isSpreadingArms && this.butterflies.length > this.baseCount) {
      if (Math.random() < 0.02) {
        this.butterflies.pop();
      }
    }

    const isPersonMoving = Math.hypot(this.bodyVelocity.vx, this.bodyVelocity.vy) > 1.5;

    this.butterflies.forEach((b, index) => {
      b.wanderNoiseOffset += 0.015;

      if (b.scatterTimer > 0) {
        b.scatterTimer--;
        b.targetType = 'scatter';
      } else if (hasPerson && bodyPix) {
        // 3D Orbiting Depth: oscillates smoothly between behind (-1) and front (+1)
        const orbitSpeed = 0.0015;
        const orbitAngle = (index / this.butterflies.length) * Math.PI * 2 + timeMs * orbitSpeed;
        b.targetZ = Math.sin(orbitAngle);
        b.z += (b.targetZ - b.z) * 0.04;

        if (isSpreadingArms) {
          // Attract swarm to hands & body
          if (index % 3 === 0 && leftWristPix) {
            const angleOffset = index * 0.5 + timeMs * 0.002;
            b.targetX = leftWristPix.x + Math.cos(angleOffset) * 60;
            b.targetY = leftWristPix.y + Math.sin(angleOffset) * 60;
            b.targetType = 'left_hand';
          } else if (index % 3 === 1 && rightWristPix) {
            const angleOffset = index * 0.5 + timeMs * 0.002;
            b.targetX = rightWristPix.x + Math.cos(angleOffset) * 60;
            b.targetY = rightWristPix.y + Math.sin(angleOffset) * 60;
            b.targetType = 'right_hand';
          } else {
            const orbitR = 80 + (index % 5) * 25;
            b.spiralAngle += 0.035;
            b.targetX = bodyPix.x + Math.cos(b.spiralAngle) * orbitR;
            b.targetY = bodyPix.y - 30 + Math.sin(b.spiralAngle) * (orbitR * 0.6);
            b.targetType = 'body';
          }
        } else if (isDualTrailsActive && leftWristPix && rightWristPix) {
          // Direct dual trails following hands without lag
          if (index % 2 === 0) {
            b.targetX = leftWristPix.x + Math.sin(timeMs * 0.005 + index) * 30;
            b.targetY = leftWristPix.y + Math.cos(timeMs * 0.005 + index) * 30;
            b.targetType = 'left_hand';
          } else {
            b.targetX = rightWristPix.x + Math.sin(timeMs * 0.005 + index) * 30;
            b.targetY = rightWristPix.y + Math.cos(timeMs * 0.005 + index) * 30;
            b.targetType = 'right_hand';
          }
        } else {
          // Rapid follow: actively tracks body and hand positions in real-time
          const role = index % 5;
          if (role === 0 && leftFingertipPix) {
            b.targetX = leftFingertipPix.x + Math.sin(b.wanderNoiseOffset) * 22;
            b.targetY = leftFingertipPix.y + Math.cos(b.wanderNoiseOffset) * 22;
            b.targetType = 'left_hand';
          } else if (role === 1 && rightFingertipPix) {
            b.targetX = rightFingertipPix.x + Math.cos(b.wanderNoiseOffset) * 22;
            b.targetY = rightFingertipPix.y + Math.sin(b.wanderNoiseOffset) * 22;
            b.targetType = 'right_hand';
          } else {
            // Dynamic, lively flocking tightly around the visitor's moving body
            const radiusX = 48 + (index % 6) * 16;
            const radiusY = 38 + (index % 4) * 14;
            b.targetX = bodyPix.x + Math.cos(orbitAngle) * radiusX;
            b.targetY = bodyPix.y + Math.sin(orbitAngle) * radiusY;
            b.targetType = 'body';
          }
        }
      } else {
        // Natural ambient idle
        b.targetType = 'ambient';
        b.z = Math.sin(timeMs * 0.001 + index);
        b.targetX += Math.cos(b.wanderNoiseOffset) * 2;
        b.targetY += Math.sin(b.wanderNoiseOffset * 1.3) * 2;
        if (b.targetX < 50 || b.targetX > this.width - 50) b.targetX = Math.random() * this.width;
        if (b.targetY < 50 || b.targetY > this.height - 50) b.targetY = Math.random() * this.height;
      }

      // Fast, immediate follow physics: butterflies swiftly track movements
      const dx = b.targetX - b.x;
      const dy = b.targetY - b.y;
      const dist = Math.hypot(dx, dy);

      const spring = b.targetType === 'scatter' ? 0.08 : 0.75;
      // Accelerated catch-up when person moves across frame
      const catchupFactor = dist > 35 ? Math.min(3.0, 1 + (dist - 35) / 75) : 1.0;

      b.vx = b.vx * 0.66 + dx * 0.09 * spring * catchupFactor;
      b.vy = b.vy * 0.66 + dy * 0.09 * spring * catchupFactor;

      const maxSpd = b.targetType === 'scatter' ? 24 : 32;
      const curSpd = Math.hypot(b.vx, b.vy);
      if (curSpd > maxSpd) {
        b.vx = (b.vx / curSpd) * maxSpd;
        b.vy = (b.vy / curSpd) * maxSpd;
      }

      b.x += b.vx;
      b.y += b.vy;

      if (curSpd > 0.3) {
        const targetAngle = Math.atan2(b.vy, b.vx);
        let diff = targetAngle - b.angle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        b.angle += diff * 0.28;
      }

      b.wingSpeed = 0.2 + curSpd * 0.045;
      b.wingPhase += b.wingSpeed;

      // Trail recording (short line behind butterfly, only 2-3 points)
      b.trail.unshift({
        x: b.x,
        y: b.y,
        alpha: 0.9,
        size: b.size * 0.18 * Math.max(0.6, 1 + b.z * 0.3),
      });

      // Reduced length of line behind butterfly: max 2-3 points
      const maxTrailLen = b.species === 'golden' ? 3 : 2;
      if (b.trail.length > maxTrailLen) {
        b.trail.pop();
      }

      b.trail.forEach((pt, i) => {
        pt.alpha = Math.max(0, 1 - (i + 1) / (b.trail.length + 1));
      });

      if (b.species === 'rainbow') {
        b.hue = (b.hue + 2) % 360;
      }
    });

    // Ambient / burst particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life++;
      p.alpha = Math.max(0, 1 - p.life / p.maxLife);
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
      }
    }

    if (this.particles.length < 35 && Math.random() < 0.4) {
      this.particles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        vx: (Math.random() - 0.5) * 0.6,
        vy: -0.4 - Math.random() * 0.6,
        size: 1.5 + Math.random() * 2.5,
        alpha: 0.7,
        color: 'rgba(250, 240, 180, 0.7)',
        life: 0,
        maxLife: 120 + Math.random() * 80,
      });
    }
  }

  /**
   * Renders either the layer BEHIND the person (z < 0) or the layer IN FRONT of the person (z >= 0)
   */
  public renderLayer(ctx: CanvasRenderingContext2D, layer: 'behind' | 'front') {
    const isBehind = layer === 'behind';
    const subset = this.butterflies.filter((b) => (isBehind ? b.z < 0 : b.z >= 0));

    // 1. Trails
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    subset.forEach((b) => {
      if (b.trail.length < 2) return;
      const palette = SPECIES_PALETTES[b.species];
      const trailStroke =
        b.species === 'rainbow'
          ? `hsla(${b.hue}, 90%, 65%, ${isBehind ? 0.45 : 0.8})`
          : palette.trailColor;

      ctx.beginPath();
      ctx.moveTo(b.trail[0].x, b.trail[0].y);
      for (let i = 1; i < b.trail.length; i++) {
        const xc = (b.trail[i - 1].x + b.trail[i].x) / 2;
        const yc = (b.trail[i - 1].y + b.trail[i].y) / 2;
        ctx.quadraticCurveTo(b.trail[i - 1].x, b.trail[i - 1].y, xc, yc);
      }

      ctx.strokeStyle = trailStroke;
      ctx.lineWidth = (b.species === 'golden' ? 1.5 : 1.0) * (isBehind ? 0.6 : 0.85);
      ctx.lineCap = 'round';
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(b.x, b.y, b.size * 0.16 * (isBehind ? 0.7 : 0.9), 0, Math.PI * 2);
      ctx.fillStyle = b.species === 'rainbow' ? `hsl(${b.hue}, 90%, 70%)` : palette.secondary;
      ctx.fill();
    });

    // 2. Ambient particles (rendered in background layer)
    if (isBehind) {
      this.particles.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fill();
      });
    }

    ctx.restore();

    // 3. Butterflies in this depth layer
    subset.forEach((b) => {
      this.drawButterfly(ctx, b, isBehind);
    });
  }

  public render(ctx: CanvasRenderingContext2D) {
    this.renderLayer(ctx, 'behind');
    this.renderLayer(ctx, 'front');
  }

  private drawButterfly(ctx: CanvasRenderingContext2D, b: ButterflyEntity, isBehind: boolean) {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.angle + Math.PI / 2);

    // Depth perspective scaling: butterflies behind person appear slightly smaller/softer
    const depthScale = Math.max(0.65, 1 + b.z * 0.28);
    ctx.scale(depthScale, depthScale);

    if (isBehind) {
      ctx.globalAlpha = 0.82; // softly diffused behind visitor
    }

    const wingFlap = Math.cos(b.wingPhase);
    const flapScale = Math.abs(wingFlap);
    const palette = SPECIES_PALETTES[b.species];
    const isRainbow = b.species === 'rainbow';

    const priColor = isRainbow ? `hsl(${b.hue}, 85%, 55%)` : palette.primary;
    const secColor = isRainbow ? `hsl(${(b.hue + 60) % 360}, 90%, 65%)` : palette.secondary;
    const edgeColor = palette.edge;

    const drawWingPair = (side: 1 | -1) => {
      ctx.save();
      ctx.scale(side * Math.max(0.12, flapScale), 1);

      // Forewing
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(b.size * 0.7, -b.size * 0.7, b.size * 1.5, -b.size * 1.2, b.size * 1.6, -b.size * 0.4);
      ctx.bezierCurveTo(b.size * 1.5, b.size * 0.1, b.size * 0.9, b.size * 0.3, 0, b.size * 0.2);
      ctx.closePath();

      const foreGrad = ctx.createRadialGradient(0, 0, 2, b.size * 0.8, -b.size * 0.4, b.size * 1.5);
      foreGrad.addColorStop(0, '#FFFFFF');
      foreGrad.addColorStop(0.35, secColor);
      foreGrad.addColorStop(0.8, priColor);
      foreGrad.addColorStop(1, edgeColor);

      ctx.fillStyle = foreGrad;
      ctx.fill();
      ctx.strokeStyle = edgeColor;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Hindwing
      ctx.beginPath();
      ctx.moveTo(0, b.size * 0.2);
      ctx.bezierCurveTo(b.size * 0.8, b.size * 0.4, b.size * 1.2, b.size * 1.0, b.size * 0.6, b.size * 1.3);
      ctx.bezierCurveTo(b.size * 0.2, b.size * 1.4, 0, b.size * 0.8, 0, b.size * 0.2);
      ctx.closePath();

      const hindGrad = ctx.createRadialGradient(0, b.size * 0.4, 1, b.size * 0.5, b.size * 0.8, b.size);
      hindGrad.addColorStop(0, secColor);
      hindGrad.addColorStop(0.7, priColor);
      hindGrad.addColorStop(1, edgeColor);

      ctx.fillStyle = hindGrad;
      ctx.fill();
      ctx.stroke();

      // Spots
      ctx.beginPath();
      ctx.arc(b.size * 0.8, -b.size * 0.3, b.size * 0.12, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();

      if (b.species === 'golden') {
        ctx.beginPath();
        ctx.arc(b.size * 0.5, b.size * 0.7, b.size * 0.1, 0, Math.PI * 2);
        ctx.fillStyle = '#FEF08A';
        ctx.fill();
      }

      ctx.restore();
    };

    drawWingPair(1);
    drawWingPair(-1);

    // Body
    ctx.beginPath();
    ctx.ellipse(0, b.size * 0.1, b.size * 0.1, b.size * 0.45, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#18181B';
    ctx.fill();

    // Head
    ctx.beginPath();
    ctx.arc(0, -b.size * 0.35, b.size * 0.1, 0, Math.PI * 2);
    ctx.fillStyle = '#27272A';
    ctx.fill();

    // Antennae
    ctx.strokeStyle = '#3F3F46';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(0, -b.size * 0.4);
    ctx.quadraticCurveTo(-b.size * 0.2, -b.size * 0.7, -b.size * 0.35, -b.size * 0.8);
    ctx.moveTo(0, -b.size * 0.4);
    ctx.quadraticCurveTo(b.size * 0.2, -b.size * 0.7, b.size * 0.35, -b.size * 0.8);
    ctx.stroke();

    ctx.restore();
  }
}
