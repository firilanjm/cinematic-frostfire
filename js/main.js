/**
 * Hand Fire Effect - MediaPipe HandLandmarker (tasks-vision) + Fire Draw
 * Tracking: Open palm = ember at fingertips | Drawing: OK gesture = intense fire trail
 * Right = Orange | Left = Blue
 */

import { FilesetResolver, HandLandmarker } from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/vision_bundle.mjs';

const OK_THRESHOLD = 0.22;

const VIDEO_WIDTH = 640;
const VIDEO_HEIGHT = 480;
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task';

let handLandmarker = null;
let video = null;
let particles = [];
let showWebcam = true;
let handResults = null;

function getCoord(p, axis) {
  if (!p) return 0;
  const v = p[axis] ?? p[axis === 'x' ? 0 : axis === 'y' ? 1 : 2];
  return typeof v === 'number' ? v : 0;
}

function toLandmarkArray(lm) {
  if (!lm) return [];
  if (Array.isArray(lm) && lm.length >= 9) return lm;
  const arr = lm.landmark || lm;
  if (Array.isArray(arr) && arr.length >= 9) return arr;
  if (arr && typeof arr.length === 'number') {
    const out = [];
    for (let i = 0; i < Math.min(21, arr.length); i++) out.push(arr[i] || { x: 0.5, y: 0.5, z: 0 });
    return out;
  }
  return [];
}

function distLandmarks(a, b) {
  return Math.hypot(
    getCoord(a, 'x') - getCoord(b, 'x'),
    getCoord(a, 'y') - getCoord(b, 'y'),
    getCoord(a, 'z') - getCoord(b, 'z')
  );
}

function isOKGesture(landmarks) {
  if (!landmarks || landmarks.length < 9) return false;
  const thumb = landmarks[4];
  const index = landmarks[8];
  return distLandmarks(thumb, index) < OK_THRESHOLD;
}

function isOpenPalm(landmarks) {
  if (!landmarks || landmarks.length < 21) return false;
  if (isOKGesture(landmarks)) return false;
  const PIP = [6, 10, 14, 18];
  const TIP = [8, 12, 16, 20];
  let extended = 0;
  for (let i = 0; i < 4; i++) {
    const tipY = getCoord(landmarks[TIP[i]], 'y');
    const pipY = getCoord(landmarks[PIP[i]], 'y');
    if (tipY < pipY + 0.05) extended++;
  }
  return extended >= 1;
}

function getPalmCenter(landmarks) {
  if (!landmarks || landmarks.length < 9) return null;
  if (landmarks.length >= 18) {
    const indices = [0, 5, 9, 13, 17];
    let x = 0, y = 0;
    indices.forEach(i => {
      x += getCoord(landmarks[i], 'x');
      y += getCoord(landmarks[i], 'y');
    });
    return { x: x / 5, y: y / 5 };
  }
  const mid = landmarks[9] || landmarks[0];
  return mid ? { x: getCoord(mid, 'x'), y: getCoord(mid, 'y') } : null;
}

function getPalmSize(landmarks, canvasW, canvasH) {
  if (!landmarks || landmarks.length < 18) return 80;
  const wrist = landmarks[0];
  const midBase = landmarks[9];
  const d1 = distLandmarks(wrist, midBase);
  const d2 = distLandmarks(landmarks[5], landmarks[17]);
  const palmNorm = Math.max(d1, d2, 0.08);
  return Math.max(60, Math.min(200, palmNorm * Math.max(canvasW, canvasH) * 1.2));
}

class FireParticle {
  constructor(x, y, colorType, isDrawing, palmSize = 80) {
    this.x = x;
    this.y = y;
    const scale = palmSize / 80;
    this.isDrawing = isDrawing;
    if (isDrawing) {
      this.vx = (Math.random() - 0.5) * 1.5 * scale;
      this.vy = -(1 + Math.random() * 2) * scale;
      this.decay = 0.012;
      this.size = (1.5 + Math.random() * 2) * scale;
    } else {
      this.vx = 0;
      this.vy = 0;
      this.decay = 1 / (0.2 * 60);
      this.size = (1.5 + Math.random() * 2.5) * scale;
    }
    this.initialSize = this.size;
    this.life = 1;
    this.colorType = colorType;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= 0.98;
    this.vy *= 0.98;
    this.life -= this.decay;
    this.size = this.initialSize * this.life;
  }

  draw(p5) {
    if (this.life <= 0) return;
    const alpha = Math.min(1, this.life * 1.2);
    p5.noStroke();
    if (this.colorType === 'right') {
      const glowSize = this.size * 2.5;
      p5.fill(255, 140, 50, alpha * 60);
      p5.ellipse(this.x, this.y, glowSize, glowSize);
      p5.fill(255, 180, 80, alpha * 180);
      p5.ellipse(this.x, this.y, this.size * 1.2, this.size * 1.2);
      p5.fill(255, 255, 220, alpha * 255);
      p5.ellipse(this.x, this.y, Math.max(1, this.size * 0.5), Math.max(1, this.size * 0.5));
    } else {
      const glowSize = this.size * 2.5;
      p5.fill(50, 150, 255, alpha * 60);
      p5.ellipse(this.x, this.y, glowSize, glowSize);
      p5.fill(100, 200, 255, alpha * 180);
      p5.ellipse(this.x, this.y, this.size * 1.2, this.size * 1.2);
      p5.fill(255, 255, 255, alpha * 255);
      p5.ellipse(this.x, this.y, Math.max(1, this.size * 0.5), Math.max(1, this.size * 0.5));
    }
  }
}

const sketch = (p5) => {
  p5.setup = () => {
    p5.createCanvas(VIDEO_WIDTH, VIDEO_HEIGHT);
    p5.pixelDensity(1);
    document.getElementById('canvas-container').classList.toggle('hide-video', !showWebcam);
    document.getElementById('clearBtn').onclick = () => {
      particles = [];
      p5.redraw();
    };
    document.getElementById('webcamToggle').onchange = (e) => {
      showWebcam = e.target.checked;
      document.getElementById('canvas-container').classList.toggle('hide-video', !showWebcam);
    };
  };

  p5.draw = () => {
    p5.blendMode(p5.BLEND);
    if (showWebcam) {
      p5.background(0, 0, 0, 0);
    } else {
      p5.background(0);
    }

    if (!handResults) {
      particles = [];
      p5.push();
      p5.fill(255, 255, 255, 120);
      p5.textSize(12);
      p5.textAlign(p5.CENTER, p5.CENTER);
      p5.text('Detecting hands...', p5.width / 2, 24);
      p5.pop();
    } else if (handResults && (!handResults.multiHandLandmarks || handResults.multiHandLandmarks.length === 0) && (!handResults.multi_hand_landmarks || handResults.multi_hand_landmarks.length === 0)) {
      particles = [];
      p5.push();
      p5.fill(255, 255, 255, 120);
      p5.textSize(12);
      p5.textAlign(p5.CENTER, p5.CENTER);
      p5.text('Show your hand to the camera', p5.width / 2, 24);
      p5.pop();
    }

    if (handResults) {
      let landmarks = handResults.multiHandLandmarks || handResults.multi_hand_landmarks;
      if (!landmarks || landmarks.length === 0) {
        particles = [];
      }
      if (!landmarks && handResults.handLandmarks) {
        landmarks = [handResults.handLandmarks];
      }
      const handedness = handResults.multiHandedness || handResults.multi_handedness;

      if (landmarks && landmarks.length > 0) {
        const hasOpenPalm = landmarks.some((lm) => {
          const pts = toLandmarkArray(lm);
          return pts.length >= 9 && isOpenPalm(pts);
        });
        const hasOKGesture = landmarks.some((lm) => {
          const pts = toLandmarkArray(lm);
          return pts.length >= 9 && isOKGesture(pts);
        });
        if (hasOpenPalm) {
          particles = particles.filter(p => p.isDrawing);
        }
        if (!hasOpenPalm && !hasOKGesture) {
          particles = [];
        }
        for (let i = 0; i < landmarks.length; i++) {
          const pts = toLandmarkArray(landmarks[i]);
          if (pts.length < 9) continue;

          const h = handedness && handedness[i];
          const label = (h && (h.label || h.index !== undefined)) ? String(h.label || h.index) : (i === 0 ? 'Right' : 'Left');
          const isLeft = label.toLowerCase().indexOf('left') >= 0;
          const colorType = isLeft ? 'left' : 'right';

          const canvasW = p5.width;
          const canvasH = p5.height;
          const mx = (x) => (1 - x) * canvasW;
          const my = (y) => y * canvasH;
          const palmSize = getPalmSize(pts, canvasW, canvasH);

          if (isOKGesture(pts)) {
            const x = mx((getCoord(pts[4], 'x') + getCoord(pts[8], 'x')) / 2);
            const y = my((getCoord(pts[4], 'y') + getCoord(pts[8], 'y')) / 2);
            for (let j = 0; j < 15; j++) {
              particles.push(new FireParticle(x + (Math.random() - 0.5) * palmSize * 0.3, y, colorType, true, palmSize));
            }
          } else if (isOpenPalm(pts)) {
            const center = getPalmCenter(pts);
            const fingertipIndices = [4, 8, 12, 16, 20];
            const palmIndices = [0, 5, 9, 13, 17];
            if (center) {
              const cx = mx(center.x), cy = my(center.y);
              const radius = palmSize * 0.5;
              for (let j = 0; j < 25; j++) {
                const angle = Math.random() * Math.PI * 2;
                const r = Math.random() * radius;
                particles.push(new FireParticle(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r, colorType, false, palmSize));
              }
              for (const idx of fingertipIndices) {
                const pt = pts[idx];
                if (pt) {
                  const fx = mx(getCoord(pt, 'x')), fy = my(getCoord(pt, 'y'));
                  for (let j = 0; j < 5; j++) {
                    particles.push(new FireParticle(fx + (Math.random() - 0.5) * palmSize * 0.2, fy + (Math.random() - 0.5) * palmSize * 0.2, colorType, false, palmSize));
                  }
                }
              }
              for (const idx of palmIndices) {
                const pt = pts[idx];
                if (pt) {
                  const px = mx(getCoord(pt, 'x')), py = my(getCoord(pt, 'y'));
                  for (let j = 0; j < 3; j++) {
                    particles.push(new FireParticle(px + (Math.random() - 0.5) * palmSize * 0.15, py + (Math.random() - 0.5) * palmSize * 0.15, colorType, false, palmSize));
                  }
                }
              }
            }
          }
        }
      }
    }

    p5.blendMode(p5.ADD);
    for (let i = particles.length - 1; i >= 0; i--) {
      particles[i].update();
      if (particles[i].life <= 0) {
        particles.splice(i, 1);
      } else {
        particles[i].draw(p5);
      }
    }
    if (particles.length > 1200) particles = particles.slice(-1200);
  };
};

async function init() {
  video = document.getElementById('video');
  if (!video) {
    console.error('Video element not found');
    return;
  }

  try {
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
    );
    handLandmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: MODEL_URL },
      runningMode: 'VIDEO',
      numHands: 2,
      minHandDetectionConfidence: 0.25,
      minHandPresenceConfidence: 0.15,
      minTrackingConfidence: 0.15
    });
    console.log('HandLandmarker initialized');
  } catch (err) {
    console.error('HandLandmarker init failed:', err);
    document.body.innerHTML = '<p style="color:#f00;padding:2rem;text-align:center;">Failed to load hand detector: ' + err.message + '</p>';
    return;
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'user', width: { ideal: VIDEO_WIDTH }, height: { ideal: VIDEO_HEIGHT } }
  });
  video.srcObject = stream;

  await new Promise((resolve, reject) => {
    const tryPlay = () => video.play().then(resolve).catch(reject);
    video.onloadedmetadata = tryPlay;
    video.onloadeddata = tryPlay;
    video.onerror = () => reject(new Error('Video failed to load'));
    if (video.readyState >= 2) tryPlay();
  });

  for (let i = 0; i < 50 && (video.videoWidth === 0 || video.readyState < 2); i++) {
    await new Promise(r => setTimeout(r, 100));
  }
  console.log('Camera started:', video.videoWidth, 'x', video.videoHeight);

  function detectFrame() {
    if (handLandmarker && video && video.readyState >= 2 && video.videoWidth > 0) {
      try {
        const results = handLandmarker.detectForVideo(video, performance.now());
        handResults = {
          multiHandLandmarks: results.landmarks,
          multiHandedness: (results.handedness || []).map(h => ({
            label: h && h[0] ? h[0].categoryName : 'Right',
            score: h && h[0] ? h[0].score : 1
          }))
        };
      } catch (e) {
        console.warn('Detection error:', e);
      }
    }
    requestAnimationFrame(detectFrame);
  }
  detectFrame();

  new p5(sketch, 'canvas-container');
}

init().catch(err => {
  console.error(err);
  document.body.innerHTML = '<p style="color:#fff;padding:2rem;text-align:center;">Camera error: ' + err.message + '<br>Allow camera access and refresh.</p>';
});
