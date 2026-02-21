/**
 * Fire Drawing - p5.js + MediaPipe Hands
 * Tracking: Open palm = faint ember at fingertips (no trails)
 * Drawing: OK gesture = intense fire particles that persist
 * Right = Orange/Yellow | Left = Blue/Cyan
 */

const OK_THRESHOLD = 0.22;
const FINGERTIP_INDICES = [4, 8, 12, 16, 20];
const HAND_CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],
  [9,13],[13,14],[14,15],[15,16],[13,17],[0,17],[17,18],[18,19],[19,20]
];

let hands, video;
let particles = [];
let showWebcam = true;
let handResults = null;
const PALM_LANDMARKS = [0, 5, 9, 13, 17];

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
  const d = distLandmarks(thumb, index);
  return d < OK_THRESHOLD;
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
  const indexBase = landmarks[5];
  const d1 = distLandmarks(wrist, midBase);
  const d2 = distLandmarks(landmarks[5], landmarks[17]);
  const palmNorm = Math.max(d1, d2, 0.08);
  return Math.max(60, Math.min(200, palmNorm * Math.max(canvasW, canvasH) * 1.2));
}

function drawHandSkeleton(p5, landmarks, handedness, canvasW, canvasH) {
  const mx = (x) => (1 - x) * canvasW;
  const my = (y) => y * canvasH;
  const isLeft = handedness && String(handedness.label || handedness).toLowerCase().indexOf('left') >= 0;
  const connColor = isLeft ? [50, 180, 255] : [255, 180, 50];
  const dotColor = isLeft ? [80, 200, 255] : [255, 200, 80];

  for (const [i, j] of HAND_CONNECTIONS) {
    const a = landmarks[i];
    const b = landmarks[j];
    if (!a || !b) continue;
    p5.stroke(connColor[0], connColor[1], connColor[2], 200);
    p5.strokeWeight(2);
    p5.line(mx(getCoord(a, 'x')), my(getCoord(a, 'y')), mx(getCoord(b, 'x')), my(getCoord(b, 'y')));
  }
  for (let i = 0; i < landmarks.length; i++) {
    const pt = landmarks[i];
    if (!pt) continue;
    p5.noStroke();
    p5.fill(dotColor[0], dotColor[1], dotColor[2], 220);
    p5.ellipse(mx(getCoord(pt, 'x')), my(getCoord(pt, 'y')), 4, 4);
  }
}

class FireParticle {
  constructor(x, y, colorType, isDrawing, palmSize = 80) {
    this.x = x;
    this.y = y;
    const scale = palmSize / 80;
    this.vx = (Math.random() - 0.5) * 2 * scale;
    this.vy = -(1 + Math.random() * 2.5) * scale;
    this.life = 1;
    this.decay = isDrawing ? 0.01 : 0.03;
    this.size = (isDrawing ? 8 + Math.random() * 12 : 4 + Math.random() * 8) * scale;
    this.initialSize = this.size;
    this.colorType = colorType;
    this.isDrawing = isDrawing;
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
    if (this.colorType === 'right') {
      p5.fill(255, 180, 50, alpha * 255);
    } else {
      p5.fill(50, 180, 255, alpha * 255);
    }
    p5.noStroke();
    p5.ellipse(this.x, this.y, Math.max(2, this.size), Math.max(2, this.size));
  }
}

const sketch = (p5) => {
  p5.setup = () => {
    p5.createCanvas(VIDEO_WIDTH, VIDEO_HEIGHT);
    p5.pixelDensity(1);
    document.getElementById('canvas-container').classList.toggle('hide-video', !showWebcam);
    document.getElementById('clearBtn').onclick = () => {
      particles = [];
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

    if (handResults) {
      let landmarks = handResults.multiHandLandmarks || handResults.multi_hand_landmarks;
      if (!landmarks && handResults.handLandmarks) {
        landmarks = [handResults.handLandmarks];
      }
      const handedness = handResults.multiHandedness || handResults.multi_handedness;

      if (landmarks && landmarks.length > 0) {
        for (let i = 0; i < landmarks.length; i++) {
          const pts = toLandmarkArray(landmarks[i]);
          if (pts.length < 9) continue;

          const h = handedness && handedness[i];
          drawHandSkeleton(p5, pts, h, p5.width, p5.height);
          const label = (h && (h.label || h.index !== undefined)) ? String(h.label || h.index) : (i === 0 ? 'Right' : 'Left');
          const isLeft = label.toLowerCase().indexOf('left') >= 0;
          const colorType = isLeft ? 'left' : 'right';

          const canvasW = p5.width;
          const canvasH = p5.height;
          const mx = (x) => (1 - x) * canvasW;
          const my = (y) => y * canvasH;
          const palmSize = getPalmSize(pts, canvasW, canvasH);

          let gestureLabel = 'palm';
          if (isOKGesture(pts)) {
            gestureLabel = 'OK';
            const x = mx((getCoord(pts[4], 'x') + getCoord(pts[8], 'x')) / 2);
            const y = my((getCoord(pts[4], 'y') + getCoord(pts[8], 'y')) / 2);
            for (let j = 0; j < 15; j++) {
              particles.push(new FireParticle(x + (Math.random() - 0.5) * palmSize * 0.3, y, colorType, true, palmSize));
            }
          } else if (isOpenPalm(pts)) {
            gestureLabel = 'open';
            for (const idx of FINGERTIP_INDICES) {
              const pt = pts[idx];
              if (!pt) continue;
              const x = mx(getCoord(pt, 'x'));
              const y = my(getCoord(pt, 'y'));
              for (let j = 0; j < 3; j++) {
                particles.push(new FireParticle(x, y, colorType, false, palmSize));
              }
            }
            const center = getPalmCenter(pts);
            if (center) {
              const cx = mx(center.x), cy = my(center.y);
              for (let j = 0; j < 4; j++) {
                particles.push(new FireParticle(cx + (Math.random() - 0.5) * palmSize * 0.4, cy, colorType, false, palmSize));
              }
            }
          } else {
            const center = getPalmCenter(pts);
            if (center) {
              const cx = mx(center.x), cy = my(center.y);
              for (let k = 0; k < 6; k++) {
                particles.push(new FireParticle(cx + (Math.random() - 0.5) * palmSize * 0.5, cy + (Math.random() - 0.5) * palmSize * 0.3, colorType, false, palmSize));
              }
            }
          }
          p5.push();
          p5.fill(255, 255, 255, 180);
          p5.textSize(14);
          p5.textAlign(p5.LEFT, p5.TOP);
          p5.text(gestureLabel, 8, 8 + i * 20);
          p5.pop();
        }
      }
    }

    p5.blendMode(p5.BLEND);
    for (let i = particles.length - 1; i >= 0; i--) {
      particles[i].update();
      if (particles[i].life <= 0) {
        particles.splice(i, 1);
      } else {
        particles[i].draw(p5);
      }
    }
    if (particles.length > 1500) particles = particles.slice(-1500);
  };
};

let myp5;
const VIDEO_WIDTH = 640;
const VIDEO_HEIGHT = 480;

async function init() {
  video = document.getElementById('video');
  if (!video) {
    console.error('Video element not found');
    return;
  }

  if (typeof Hands === 'undefined') {
    console.error('MediaPipe Hands not loaded. Check script order.');
    return;
  }

  hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4/${file}`
  });
  hands.setOptions({
    maxNumHands: 2,
    minDetectionConfidence: 0.35,
    minTrackingConfidence: 0.2
  });
  hands.onResults((results) => {
    handResults = results;
    if (results?.multiHandLandmarks?.length > 0 && !window._handDebugLogged) {
      window._handDebugLogged = true;
      console.log('Hands detected:', results.multiHandLandmarks.length);
    }
  });

  await hands.initialize();
  console.log('MediaPipe Hands initialized');

  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'user', width: VIDEO_WIDTH, height: VIDEO_HEIGHT }
  });
  video.srcObject = stream;
  await video.play();
  console.log('Camera started, video dimensions:', video.videoWidth, 'x', video.videoHeight);

  function sendFrame() {
    if (hands && video && video.readyState >= 2) {
      hands.send({ image: video }).catch(() => {});
    }
    requestAnimationFrame(sendFrame);
  }
  sendFrame();

  myp5 = new p5(sketch, 'canvas-container');
}

init().catch(err => {
  console.error(err);
  document.body.innerHTML = '<p style="color:#fff;padding:2rem;text-align:center;">Camera error: ' + err.message + '<br>Allow camera access and refresh.</p>';
});
