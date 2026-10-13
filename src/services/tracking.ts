import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import { TrackingData, LandmarkPoint } from '../types';

export type TrackingListener = (data: TrackingData) => void;

/**
 * 1€ Filter (One Euro Filter)
 * State-of-the-art adaptive low-pass filter for human motion tracking.
 * Provides rock-solid stability when stationary (zero jitter) and instant response during fast motion (zero lag).
 */
class OneEuroFilter {
  private minCutoff: number;
  private beta: number;
  private dCutoff: number;
  private xPrev: number | null = null;
  private dxPrev: number = 0;
  private tPrev: number | null = null;

  constructor(minCutoff = 1.0, beta = 0.015, dCutoff = 1.0) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
  }

  private alpha(cutoff: number, dt: number): number {
    const tau = 1.0 / (2 * Math.PI * cutoff);
    return 1.0 / (1.0 + tau / dt);
  }

  public filter(x: number, timestamp: number): number {
    if (this.tPrev === null || this.xPrev === null) {
      this.tPrev = timestamp;
      this.xPrev = x;
      this.dxPrev = 0;
      return x;
    }

    const dt = Math.max((timestamp - this.tPrev) / 1000, 0.001);
    this.tPrev = timestamp;

    const dx = (x - this.xPrev) / dt;
    const aD = this.alpha(this.dCutoff, dt);
    const edx = aD * dx + (1 - aD) * this.dxPrev;
    this.dxPrev = edx;

    const cutoff = this.minCutoff + this.beta * Math.abs(edx);
    const a = this.alpha(cutoff, dt);
    const xFiltered = a * x + (1 - a) * this.xPrev;
    this.xPrev = xFiltered;
    return xFiltered;
  }

  public reset() {
    this.xPrev = null;
    this.dxPrev = 0;
    this.tPrev = null;
  }
}

class OneEuroPointFilter {
  private fx: OneEuroFilter;
  private fy: OneEuroFilter;

  constructor(minCutoff = 1.2, beta = 0.02) {
    this.fx = new OneEuroFilter(minCutoff, beta);
    this.fy = new OneEuroFilter(minCutoff, beta);
  }

  public filter(pt: { x: number; y: number }, timestamp: number): { x: number; y: number } {
    return {
      x: this.fx.filter(pt.x, timestamp),
      y: this.fy.filter(pt.y, timestamp),
    };
  }

  public reset() {
    this.fx.reset();
    this.fy.reset();
  }
}

class CameraTrackingService {
  private videoElement: HTMLVideoElement | null = null;
  private poseLandmarker: PoseLandmarker | null = null;
  private isRunning: boolean = false;
  private animFrameId: number | null = null;
  private listeners: Set<TrackingListener> = new Set();
  private stream: MediaStream | null = null;
  private isModelLoading: boolean = false;

  // High-precision OneEuroFilters for each tracked joint
  private bodyFilter = new OneEuroPointFilter(1.0, 0.025);
  private leftShoulderFilter = new OneEuroPointFilter(1.2, 0.02);
  private rightShoulderFilter = new OneEuroPointFilter(1.2, 0.02);
  private leftWristFilter = new OneEuroPointFilter(1.5, 0.035);
  private rightWristFilter = new OneEuroPointFilter(1.5, 0.035);
  private leftFingertipFilter = new OneEuroPointFilter(1.5, 0.04);
  private rightFingertipFilter = new OneEuroPointFilter(1.5, 0.04);

  // Optical motion canvas
  private motionCanvas: HTMLCanvasElement | null = null;
  private motionCtx: CanvasRenderingContext2D | null = null;
  private prevFrameData: Uint8ClampedArray | null = null;
  private motionWidth: number = 240;
  private motionHeight: number = 180;

  private currentData: TrackingData = {
    isDetected: false,
    hasBody: false,
    hasHands: false,
    bodyCenter: null,
    leftShoulder: null,
    rightShoulder: null,
    leftWrist: null,
    rightWrist: null,
    leftFingertip: null,
    rightFingertip: null,
    shoulderWidth: 0.22,
    armSpreadRatio: 1.0,
    cameraReady: false,
    statusText: 'INITIALIZING',
  };

  constructor() {
    if (typeof window !== 'undefined') {
      this.motionCanvas = document.createElement('canvas');
      this.motionCanvas.width = this.motionWidth;
      this.motionCanvas.height = this.motionHeight;
      this.motionCtx = this.motionCanvas.getContext('2d', { willReadFrequently: true });
    }
  }

  public subscribe(listener: TrackingListener): () => void {
    this.listeners.add(listener);
    listener(this.currentData);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((fn) => fn(this.currentData));
  }

  public getStream(): MediaStream | null {
    return this.stream;
  }

  public getVideo(): HTMLVideoElement | null {
    return this.videoElement;
  }

  public async attachVideo(videoElem: HTMLVideoElement): Promise<boolean> {
    this.videoElement = videoElem;

    if (this.stream && this.stream.active) {
      try {
        videoElem.srcObject = this.stream;
        await videoElem.play().catch(() => {});
        this.currentData.cameraReady = true;
        this.currentData.statusText = 'CAMERA_READY';
        this.notify();
        this.startLoop();
        return true;
      } catch (e) {
        console.warn('Re-attaching stream error:', e);
      }
    }

    return this.initCamera(videoElem);
  }

  public async initCamera(videoElem: HTMLVideoElement): Promise<boolean> {
    this.videoElement = videoElem;
    this.currentData.statusText = 'INITIALIZING';
    this.notify();

    try {
      if (!this.stream || !this.stream.active) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user',
          },
          audio: false,
        });
        this.stream = stream;
      }

      this.videoElement.srcObject = this.stream;
      await new Promise<void>((resolve) => {
        if (!this.videoElement) return resolve();
        this.videoElement.onloadedmetadata = () => {
          this.videoElement?.play().then(() => resolve()).catch(() => resolve());
        };
      });

      this.currentData.cameraReady = true;
      this.currentData.statusText = 'CAMERA_READY';
      this.notify();

      this.initHighAccuracyMediaPipe();
      this.startLoop();
      return true;
    } catch (err: unknown) {
      console.error('Camera initialization error:', err);
      const isDenied =
        err instanceof DOMException &&
        (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError');
      this.currentData.cameraReady = false;
      this.currentData.statusText = isDenied ? 'PERMISSION_DENIED' : 'ERROR';
      this.notify();
      return false;
    }
  }

  /**
   * Initializes high-accuracy MediaPipe Pose model (Full model) with progressive fallbacks
   */
  private async initHighAccuracyMediaPipe() {
    if (this.poseLandmarker || this.isModelLoading) return;
    this.isModelLoading = true;

    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );

      // Model priority:
      // 1. Full model on GPU (highest landmark accuracy)
      // 2. Full model on CPU
      // 3. Lite model on GPU
      // 4. Lite model on CPU
      const modelsToTry = [
        {
          path: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task',
          delegate: 'GPU' as const,
        },
        {
          path: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task',
          delegate: 'CPU' as const,
        },
        {
          path: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
          delegate: 'GPU' as const,
        },
        {
          path: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
          delegate: 'CPU' as const,
        },
      ];

      for (const config of modelsToTry) {
        try {
          this.poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: config.path,
              delegate: config.delegate,
            },
            runningMode: 'VIDEO',
            numPoses: 1,
            minPoseDetectionConfidence: 0.3,
            minPosePresenceConfidence: 0.3,
            minTrackingConfidence: 0.3,
          });
          console.log(`High-Accuracy PoseLandmarker initialized with ${config.delegate}`);
          break;
        } catch {
          // Try next configuration
        }
      }
    } catch (err) {
      console.warn('MediaPipe initialization fallback to optical tracking:', err);
    } finally {
      this.isModelLoading = false;
    }
  }

  private startLoop() {
    if (this.isRunning) return;
    this.isRunning = true;

    const processFrame = () => {
      if (!this.isRunning) return;

      const video = this.videoElement;
      if (video && video.readyState >= 2 && !video.paused) {
        const now = performance.now();
        let detectedViaMediaPipe = false;

        // 1. Primary: High-Accuracy MediaPipe Pose Detection
        if (this.poseLandmarker) {
          try {
            const results = this.poseLandmarker.detectForVideo(video, now);
            if (results.landmarks && results.landmarks.length > 0) {
              detectedViaMediaPipe = true;
              const rawLandmarks = results.landmarks[0];

              // Mirror coordinates (1 - x)
              const landmarks: LandmarkPoint[] = rawLandmarks.map((lm) => ({
                x: 1 - lm.x,
                y: lm.y,
                z: lm.z,
                visibility: lm.visibility,
              }));

              const nose = landmarks[0];
              const rightShoulder = landmarks[12];
              const leftShoulder = landmarks[11];
              const rightElbow = landmarks[14];
              const leftElbow = landmarks[13];
              const rightWrist = landmarks[16];
              const leftWrist = landmarks[15];
              const rightIndex = landmarks[20] || landmarks[16];
              const leftIndex = landmarks[19] || landmarks[15];
              const rightHip = landmarks[24];
              const leftHip = landmarks[23];

              // Precise weighted body centroid (shoulders + hips)
              let rawBodyCenterX = (rightShoulder.x + leftShoulder.x) / 2;
              let rawBodyCenterY = (rightShoulder.y + leftShoulder.y) / 2;

              if (rightHip && leftHip) {
                const hipCenterX = (rightHip.x + leftHip.x) / 2;
                const hipCenterY = (rightHip.y + leftHip.y) / 2;
                rawBodyCenterX = rawBodyCenterX * 0.65 + hipCenterX * 0.35;
                rawBodyCenterY = rawBodyCenterY * 0.65 + hipCenterY * 0.35;
              } else if (nose) {
                rawBodyCenterY = rawBodyCenterY * 0.8 + nose.y * 0.2;
              }

              const shoulderDist = Math.hypot(
                rightShoulder.x - leftShoulder.x,
                rightShoulder.y - leftShoulder.y
              );

              const wristDist = Math.hypot(
                rightWrist.x - leftWrist.x,
                rightWrist.y - leftWrist.y
              );

              const armSpreadRatio = shoulderDist > 0.02 ? wristDist / shoulderDist : 1;

              // Apply 1€ Filters for zero jitter + zero lag
              const filteredBody = this.bodyFilter.filter({ x: rawBodyCenterX, y: rawBodyCenterY }, now);
              const filteredLeftShoulder = this.leftShoulderFilter.filter(leftShoulder, now);
              const filteredRightShoulder = this.rightShoulderFilter.filter(rightShoulder, now);
              const filteredLeftWrist = this.leftWristFilter.filter(leftWrist, now);
              const filteredRightWrist = this.rightWristFilter.filter(rightWrist, now);
              const filteredLeftFingertip = this.leftFingertipFilter.filter(leftIndex, now);
              const filteredRightFingertip = this.rightFingertipFilter.filter(rightIndex, now);

              const hasHands = (leftWrist.visibility ?? 1) > 0.2 || (rightWrist.visibility ?? 1) > 0.2;
              const hasBody = (leftShoulder.visibility ?? 1) > 0.2 || (rightShoulder.visibility ?? 1) > 0.2;

              this.currentData = {
                isDetected: true,
                hasBody,
                hasHands,
                bodyCenter: filteredBody,
                leftShoulder: filteredLeftShoulder,
                rightShoulder: filteredRightShoulder,
                leftWrist: filteredLeftWrist,
                rightWrist: filteredRightWrist,
                leftFingertip: filteredLeftFingertip,
                rightFingertip: filteredRightFingertip,
                shoulderWidth: shoulderDist,
                armSpreadRatio,
                landmarks,
                cameraReady: true,
                statusText: hasHands ? 'HANDS_DETECTED' : hasBody ? 'BODY_DETECTED' : 'MOVE_INTO_VIEW',
              };
            }
          } catch {
            // MediaPipe frame catch
          }
        }

        // 2. Optical Motion Centroid fallback (High Sensitivity)
        if (!detectedViaMediaPipe && this.motionCtx && this.motionCanvas) {
          try {
            this.motionCtx.drawImage(video, 0, 0, this.motionWidth, this.motionHeight);
            const imgData = this.motionCtx.getImageData(0, 0, this.motionWidth, this.motionHeight);
            const curData = imgData.data;

            if (this.prevFrameData) {
              let motionSumX = 0;
              let motionSumY = 0;
              let motionCount = 0;

              let leftMotionSumX = 0;
              let leftMotionSumY = 0;
              let leftCount = 0;

              let rightMotionSumX = 0;
              let rightMotionSumY = 0;
              let rightCount = 0;

              const len = curData.length;
              for (let i = 0; i < len; i += 8) {
                const diff =
                  Math.abs(curData[i] - this.prevFrameData[i]) +
                  Math.abs(curData[i + 1] - this.prevFrameData[i + 1]) +
                  Math.abs(curData[i + 2] - this.prevFrameData[i + 2]);

                if (diff > 22) {
                  const pixelIndex = i / 4;
                  const rawX = pixelIndex % this.motionWidth;
                  const rawY = Math.floor(pixelIndex / this.motionWidth);
                  const mx = 1 - rawX / this.motionWidth;
                  const my = rawY / this.motionHeight;

                  motionSumX += mx;
                  motionSumY += my;
                  motionCount++;

                  if (mx < 0.5) {
                    leftMotionSumX += mx;
                    leftMotionSumY += my;
                    leftCount++;
                  } else {
                    rightMotionSumX += mx;
                    rightMotionSumY += my;
                    rightCount++;
                  }
                }
              }

              if (motionCount > 5) {
                const cx = motionSumX / motionCount;
                const cy = motionSumY / motionCount;

                const lx = leftCount > 2 ? leftMotionSumX / leftCount : cx - 0.2;
                const ly = leftCount > 2 ? leftMotionSumY / leftCount : cy;

                const rx = rightCount > 2 ? rightMotionSumX / rightCount : cx + 0.2;
                const ry = rightCount > 2 ? rightMotionSumY / rightCount : cy;

                const shoulderDist = 0.22;
                const wristDist = Math.hypot(rx - lx, ry - ly);

                const filteredBody = this.bodyFilter.filter({ x: cx, y: cy }, now);
                const filteredLeftWrist = this.leftWristFilter.filter({ x: lx, y: ly }, now);
                const filteredRightWrist = this.rightWristFilter.filter({ x: rx, y: ry }, now);

                this.currentData = {
                  isDetected: true,
                  hasBody: true,
                  hasHands: true,
                  bodyCenter: filteredBody,
                  leftShoulder: { x: filteredBody.x - shoulderDist / 2, y: filteredBody.y - 0.1 },
                  rightShoulder: { x: filteredBody.x + shoulderDist / 2, y: filteredBody.y - 0.1 },
                  leftWrist: filteredLeftWrist,
                  rightWrist: filteredRightWrist,
                  leftFingertip: filteredLeftWrist,
                  rightFingertip: filteredRightWrist,
                  shoulderWidth: shoulderDist,
                  armSpreadRatio: wristDist / shoulderDist,
                  cameraReady: true,
                  statusText: 'BODY_DETECTED',
                };
              }
            }

            this.prevFrameData = new Uint8ClampedArray(curData);
          } catch {
            // Motion CV catch
          }
        }
      }

      this.notify();
      this.animFrameId = requestAnimationFrame(processFrame);
    };

    this.animFrameId = requestAnimationFrame(processFrame);
  }

  public simulateTracking(screenNormX: number, screenNormY: number, spreadArms: boolean = false) {
    const shoulderDist = 0.22;
    const wristDist = spreadArms ? 0.65 : 0.25;
    const bodyCenter = { x: screenNormX, y: screenNormY };

    this.currentData = {
      isDetected: true,
      hasBody: true,
      hasHands: true,
      bodyCenter,
      leftShoulder: { x: screenNormX - shoulderDist / 2, y: screenNormY - 0.1 },
      rightShoulder: { x: screenNormX + shoulderDist / 2, y: screenNormY - 0.1 },
      leftWrist: { x: screenNormX - wristDist / 2, y: screenNormY },
      rightWrist: { x: screenNormX + wristDist / 2, y: screenNormY },
      leftFingertip: { x: screenNormX - wristDist / 2 - 0.05, y: screenNormY - 0.03 },
      rightFingertip: { x: screenNormX + wristDist / 2 + 0.05, y: screenNormY - 0.03 },
      shoulderWidth: shoulderDist,
      armSpreadRatio: wristDist / shoulderDist,
      cameraReady: true,
      statusText: 'HANDS_DETECTED',
    };
    this.notify();
  }

  public stopCamera() {
    this.isRunning = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }
    this.bodyFilter.reset();
    this.leftWristFilter.reset();
    this.rightWristFilter.reset();
    this.leftShoulderFilter.reset();
    this.rightShoulderFilter.reset();
    this.leftFingertipFilter.reset();
    this.rightFingertipFilter.reset();

    this.currentData.cameraReady = false;
    this.currentData.statusText = 'INITIALIZING';
    this.notify();
  }

  public getData(): TrackingData {
    return this.currentData;
  }
}

export const cameraTrackingService = new CameraTrackingService();
