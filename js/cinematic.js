/**
 * Cinematic Fire Engine - Hand-tracking particle effects
 * Fire & Ice | Lightning | Red & Blue modes
 */

const videoElement = document.getElementById('input_video');
const canvasElement = document.getElementById('output_canvas');
const canvasCtx = canvasElement.getContext('2d');
let startTime = null;

let particles = [];
let lightningBolts = [];
let explosionBursts = [];

let currentPower = 'fire_ice';
let lightningIntensity = 0;
let lastTip = { x: 0, y: 0, active: false };

let handIntensities = [0, 0];
let handSurges = [0, 0];
let lastHandOpenState = [false, false];

let handsTouching = false;
let lastTouchPoint = null;
let liveFusionBall = null;
const HAND_TOUCH_THRESHOLD = 0.18;

const HAND_CONNECTIONS = [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10], [10, 11], [11, 12], [9, 13], [13, 14], [14, 15], [15, 16], [13, 17], [17, 18], [18, 19], [19, 20], [0, 17]];

function spawnFire(x, y, isDrawing = false) {
    if (!isDrawing && Math.random() > handIntensities[0]) return;
    let count = isDrawing ? 2 : 1;
    for (let i = 0; i < count; i++) {
        particles.push({
            x: x + (Math.random() - 0.5) * (isDrawing ? 10 : 15),
            y: y + (Math.random() - 0.5) * (isDrawing ? 10 : 15),
            vx: isDrawing ? 0 : (Math.random() - 0.5) * 4,
            vy: isDrawing ? 0 : ((Math.random() * -10) - 4) - (handSurges[0] * 20),
            life: 1.0,
            decay: isDrawing ? 0.0055 : (1 / (0.1 * 60)),
            size: isDrawing ? (Math.random() * 20 + 20) : (Math.random() * 22 + 8),
            type: 'fire'
        });
    }
}

function spawnIce(x, y, isDrawing = false) {
    if (!isDrawing && Math.random() > handIntensities[1]) return;
    let count = isDrawing ? 2 : 1;
    for (let i = 0; i < count; i++) {
        particles.push({
            x: x + (Math.random() - 0.5) * (isDrawing ? 10 : 15),
            y: y + (Math.random() - 0.5) * (isDrawing ? 10 : 15),
            vx: isDrawing ? 0 : (Math.random() - 0.5) * 4,
            vy: isDrawing ? 0 : ((Math.random() * -5) - 2) - (handSurges[1] * 15),
            life: 1.0,
            decay: isDrawing ? 0.0055 : (1 / (0.1 * 60)),
            size: isDrawing ? (Math.random() * 20 + 20) : (Math.random() * 20 + 5),
            type: 'ice'
        });
    }
}

function spawnRed(x, y, isDrawing = false) {
    if (!isDrawing && Math.random() > handIntensities[0]) return;
    let count = isDrawing ? 2 : 1;
    for (let i = 0; i < count; i++) {
        particles.push({
            x: x + (Math.random() - 0.5) * (isDrawing ? 10 : 15),
            y: y + (Math.random() - 0.5) * (isDrawing ? 10 : 15),
            vx: isDrawing ? 0 : (Math.random() - 0.5) * 4,
            vy: isDrawing ? 0 : ((Math.random() * -10) - 4) - (handSurges[0] * 20),
            life: 1.0,
            decay: isDrawing ? 0.0055 : (1 / (0.1 * 60)),
            size: isDrawing ? (Math.random() * 20 + 20) : (Math.random() * 22 + 8),
            type: 'red'
        });
    }
}

function spawnBlue(x, y, isDrawing = false) {
    if (!isDrawing && Math.random() > handIntensities[1]) return;
    let count = isDrawing ? 2 : 1;
    for (let i = 0; i < count; i++) {
        particles.push({
            x: x + (Math.random() - 0.5) * (isDrawing ? 10 : 15),
            y: y + (Math.random() - 0.5) * (isDrawing ? 10 : 15),
            vx: isDrawing ? 0 : (Math.random() - 0.5) * 4,
            vy: isDrawing ? 0 : ((Math.random() * -5) - 2) - (handSurges[1] * 15),
            life: 1.0,
            decay: isDrawing ? 0.0055 : (1 / (0.1 * 60)),
            size: isDrawing ? (Math.random() * 20 + 20) : (Math.random() * 20 + 5),
            type: 'blue'
        });
    }
}

const PX_PER_CM = 96 / 2.54;
const FUSION_MIN_CM = 1;
const FUSION_MAX_CM = 9;
const FUSION_DIST_RANGE = 0.3;
const FUSION_BALL_PALM_OFFSET = 70;

function updateFusionBall(x, y, dist) {
    const t = Math.min(1, Math.max(0, (dist - HAND_TOUCH_THRESHOLD) / FUSION_DIST_RANGE));
    const ballSizeCm = FUSION_MIN_CM + t * (FUSION_MAX_CM - FUSION_MIN_CM);
    const ballSize = ballSizeCm * PX_PER_CM;
    liveFusionBall = { x, y, size: ballSize };
}

function explodeFusionBall(x, y, size) {
    explosionBursts.push({ x, y, radius: 0, maxRadius: size * 2.5, life: 1, decay: 0.12 });
    explosionBursts.push({ x, y, radius: 0, maxRadius: size * 1.8, life: 1, decay: 0.18 });

    const count = Math.floor(25 + size / 20);
    for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 1.2;
        const speed = 8 + Math.random() * 14;
        const vx = Math.cos(angle) * speed + (Math.random() - 0.5) * 4;
        const vy = Math.sin(angle) * speed - 6 + (Math.random() - 0.5) * 4;
        const r = Math.random();
        let type = 'fire';
        if (r < 0.45) type = 'ice';
        else if (r < 0.7) type = 'fire';
        else type = 'fusion';
        particles.push({
            x: x + (Math.random() - 0.5) * size * 0.5,
            y: y + (Math.random() - 0.5) * size * 0.5,
            vx, vy,
            life: 1.0,
            decay: 0.008,
            size: 20 + Math.random() * 35,
            type
        });
    }
}

function spawnLightning(x, y) {
    if (Math.random() > lightningIntensity) return;
    const bolt = [];
    let cx = x;
    let cy = y;
    for (let i = 0; i < 25; i++) {
        bolt.push({ x: cx, y: cy });
        cx += (Math.random() - 0.5) * 80;
        cy += (Math.random() - 0.8) * 80;
    }
    lightningBolts.push({
        path: bolt,
        life: 1.0,
        color: Math.random() > 0.5 ? '#e0ffff' : '#00bfff'
    });
}

document.addEventListener('keydown', (e) => {
    if (e.key === '1') currentPower = 'fire_ice';
    if (e.key === '2') currentPower = 'lightning';
    if (e.key === '3') currentPower = 'red_blue';
});

const pointingState = {
    left: { frames: 0, active: false, lastWrist: null },
    right: { frames: 0, active: false, lastWrist: null }
};

function isPinchingInternal(landmarks, state) {
    const thumb = landmarks[4];
    const index = landmarks[8];
    const wrist = landmarks[0];

    let velocity = 0;
    if (state.lastWrist) {
        velocity = Math.hypot(wrist.x - state.lastWrist.x, wrist.y - state.lastWrist.y);
    }
    state.lastWrist = { x: wrist.x, y: wrist.y };

    if (velocity > 0.05) return false;

    const fingers = [12, 16, 20];
    const pips = [10, 14, 18];

    let openCount = 0;
    for (let i = 0; i < 3; i++) {
        const tip = landmarks[fingers[i]];
        const pip = landmarks[pips[i]];
        const dTip = Math.hypot(tip.x - wrist.x, tip.y - wrist.y);
        const dPip = Math.hypot(pip.x - wrist.x, pip.y - wrist.y);
        if (dTip > dPip) openCount++;
    }

    if (openCount < 2) return false;

    const pinchDist = Math.hypot(thumb.x - index.x, thumb.y - index.y);
    const midPip = landmarks[9];
    const handSize = Math.hypot(midPip.x - wrist.x, midPip.y - wrist.y);

    return pinchDist < handSize * 0.35;
}

function isPinching(landmarks, isRightHand) {
    const state = isRightHand ? pointingState.right : pointingState.left;
    const raw = isPinchingInternal(landmarks, state);

    if (raw) {
        state.frames = 5;
        state.active = true;
    } else {
        state.frames--;
        if (state.frames <= 0) state.active = false;
    }
    return state.active;
}

function isHandOpen(landmarks) {
    let open = 0;
    const wrist = landmarks[0];
    const tips = [8, 12, 16, 20];
    const pips = [6, 10, 14, 18];
    for (let i = 0; i < tips.length; i++) {
        const tip = landmarks[tips[i]];
        const pip = landmarks[pips[i]];
        const dTip = Math.hypot(tip.x - wrist.x, tip.y - wrist.y);
        const dPip = Math.hypot(pip.x - wrist.x, pip.y - wrist.y);
        if (dTip > dPip) open++;
    }
    return open >= 3;
}

function isFist(landmarks) {
    let closed = 0;
    const wrist = landmarks[0];
    const tips = [8, 12, 16, 20];
    const pips = [6, 10, 14, 18];
    for (let i = 0; i < tips.length; i++) {
        const tip = landmarks[tips[i]];
        const pip = landmarks[pips[i]];
        const dTip = Math.hypot(tip.x - wrist.x, tip.y - wrist.y);
        const dPip = Math.hypot(pip.x - wrist.x, pip.y - wrist.y);
        if (dTip < dPip * 1.1) closed++;
    }
    return closed >= 3;
}

function onResults(results) {
    canvasElement.width = window.innerWidth;
    canvasElement.height = window.innerHeight;

    if (!startTime) startTime = Date.now();

    canvasCtx.save();
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

    canvasCtx.globalCompositeOperation = 'multiply';
    const darkAlpha = 0.5;
    canvasCtx.fillStyle = `rgba(10, 5, 0, ${darkAlpha})`;
    canvasCtx.fillRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.globalCompositeOperation = 'source-over';

    if (results.multiHandLandmarks) {
        let anyHandOpen = false;
        results.multiHandLandmarks.forEach((landmarks) => {
            if (isHandOpen(landmarks)) anyHandOpen = true;
        });

        if (currentPower === 'lightning') {
            lightningIntensity += anyHandOpen ? 0.08 : -0.05;
        } else {
            lightningIntensity -= 0.1;
        }
        lightningIntensity = Math.max(0, Math.min(1, lightningIntensity));

        if (currentPower === 'fire_ice' || currentPower === 'red_blue') {
            if (results.multiHandLandmarks.length === 2 && results.multiHandedness.length === 2) {
                const leftIdx = results.multiHandedness.findIndex(h => h.label === 'Left');
                const rightIdx = results.multiHandedness.findIndex(h => h.label === 'Right');
                if (leftIdx >= 0 && rightIdx >= 0) {
                    const leftPalm = results.multiHandLandmarks[leftIdx][9];
                    const rightPalm = results.multiHandLandmarks[rightIdx][9];
                    const dx = leftPalm.x - rightPalm.x;
                    const dy = leftPalm.y - rightPalm.y;
                    const dist = Math.hypot(dx, dy);
                    const touching = dist < HAND_TOUCH_THRESHOLD;
                    const midX = ((leftPalm.x + rightPalm.x) / 2) * canvasElement.width;
                    const midY = ((leftPalm.y + rightPalm.y) / 2) * canvasElement.height - FUSION_BALL_PALM_OFFSET;

                    const leftFist = isFist(results.multiHandLandmarks[leftIdx]);
                    const rightFist = isFist(results.multiHandLandmarks[rightIdx]);

                    if (liveFusionBall && leftFist && rightFist) {
                        explodeFusionBall(liveFusionBall.x, liveFusionBall.y, liveFusionBall.size);
                        liveFusionBall = null;
                        handsTouching = false;
                        lastTouchPoint = null;
                    } else if (touching) {
                        handsTouching = true;
                        lastTouchPoint = { x: midX, y: midY };
                        liveFusionBall = null;
                    } else {
                        if (handsTouching && lastTouchPoint) {
                            updateFusionBall(midX, midY, dist);
                        } else if (liveFusionBall) {
                            updateFusionBall(midX, midY, dist);
                        }
                        handsTouching = false;
                        lastTouchPoint = null;
                    }
                }
            } else {
                handsTouching = false;
                lastTouchPoint = null;
                liveFusionBall = null;
            }
        } else {
            liveFusionBall = null;
        }

        if (lightningIntensity > 0.01) {
            if (Math.random() < 0.5 * lightningIntensity) {
                canvasCtx.fillStyle = `rgba(200, 220, 255, ${0.25 * lightningIntensity})`;
                canvasCtx.fillRect(0, 0, canvasElement.width, canvasElement.height);
            }

            results.multiHandLandmarks.forEach((landmarks) => {
                if (!isHandOpen(landmarks)) return;

                const tips = [4, 8, 12, 16, 20];
                tips.forEach(tipIdx => {
                    const pt = landmarks[tipIdx];
                    if (Math.random() < 0.07) spawnLightning(pt.x * canvasElement.width, pt.y * canvasElement.height);
                });

                HAND_CONNECTIONS.forEach(([s, e]) => {
                    if (Math.random() < 0.005) {
                        const start = landmarks[s];
                        spawnLightning(start.x * canvasElement.width, start.y * canvasElement.height);
                    }
                });
            });
        }

        results.multiHandLandmarks.forEach((landmarks, index) => {
            const label = results.multiHandedness[index].label;
            const isRightHand = label === 'Right';
            const targetIndex = isRightHand ? 1 : 0;

            const isOpen = isHandOpen(landmarks);
            const isPinch = isPinching(landmarks, isRightHand);

            if (currentPower === 'fire_ice' || currentPower === 'red_blue') {
                handIntensities[targetIndex] += (isOpen || isPinch) ? 0.05 : -0.15;

                if (isOpen && !lastHandOpenState[targetIndex]) {
                    handSurges[targetIndex] = 1.0;
                }
            } else {
                handIntensities[targetIndex] -= 0.15;
            }
            lastHandOpenState[targetIndex] = isOpen;

            handSurges[targetIndex] *= 0.92;
            if (handSurges[targetIndex] < 0.01) handSurges[targetIndex] = 0;

            handIntensities[targetIndex] = Math.max(0, Math.min(1, handIntensities[targetIndex]));

            const intensity = handIntensities[targetIndex];
            if (intensity <= 0.01) return;

            const palm = landmarks[9];
            const lx = palm.x * canvasElement.width;
            const ly = palm.y * canvasElement.height;

            if (isPinch) {
                const indexTip = landmarks[8];
                const thumbTip = landmarks[4];

                const tx = ((indexTip.x + thumbTip.x) / 2) * canvasElement.width;
                const ty = ((indexTip.y + thumbTip.y) / 2) * canvasElement.height;

                if (currentPower === 'red_blue') {
                } else if (currentPower === 'fire_ice') {
                    const elapsed = Date.now() - startTime;
                    if (elapsed > 10000) {
                        if (!isRightHand) spawnFire(tx, ty, true);
                        else spawnIce(tx, ty, true);
                    }
                }
            }

            if (currentPower === 'red_blue') {
                if (!isRightHand) {
                    let flicker = Math.sin(Date.now() * 0.02) * 25;
                    let redGlow = canvasCtx.createRadialGradient(lx, ly, 0, lx, ly, 550 + flicker);

                    redGlow.addColorStop(0, `rgba(255, 0, 0, ${0.45 * intensity})`);
                    redGlow.addColorStop(0.5, `rgba(200, 0, 0, ${0.15 * intensity})`);
                    redGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');

                    canvasCtx.globalCompositeOperation = 'screen';
                    canvasCtx.fillStyle = redGlow;
                    canvasCtx.fillRect(0, 0, canvasElement.width, canvasElement.height);

                    landmarks.forEach(pt => spawnRed(pt.x * canvasElement.width, pt.y * canvasElement.height));
                    HAND_CONNECTIONS.forEach(([s, e]) => {
                        const start = landmarks[s];
                        const end = landmarks[e];
                        spawnRed(((start.x + end.x) / 2) * canvasElement.width, ((start.y + end.y) / 2) * canvasElement.height);
                    });
                } else {
                    let flicker = Math.sin(Date.now() * 0.01) * 20;
                    let blueGlow = canvasCtx.createRadialGradient(lx, ly, 0, lx, ly, 400 + flicker);

                    blueGlow.addColorStop(0, `rgba(0, 0, 255, ${0.4 * intensity})`);
                    blueGlow.addColorStop(0.5, `rgba(0, 50, 255, ${0.1 * intensity})`);
                    blueGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');

                    canvasCtx.globalCompositeOperation = 'screen';
                    canvasCtx.fillStyle = blueGlow;
                    canvasCtx.fillRect(0, 0, canvasElement.width, canvasElement.height);

                    landmarks.forEach(pt => spawnBlue(pt.x * canvasElement.width, pt.y * canvasElement.height));
                    HAND_CONNECTIONS.forEach(([s, e]) => {
                        const start = landmarks[s];
                        const end = landmarks[e];
                        spawnBlue(((start.x + end.x) / 2) * canvasElement.width, ((start.y + end.y) / 2) * canvasElement.height);
                    });
                }
            } else if (currentPower === 'fire_ice') {
                if (!isRightHand) {
                    let flicker = Math.sin(Date.now() * 0.02) * 25;
                    let heatGlow = canvasCtx.createRadialGradient(lx, ly, 0, lx, ly, 550 + flicker);

                    heatGlow.addColorStop(0, `rgba(255, 60, 0, ${0.45 * intensity})`);
                    heatGlow.addColorStop(0.5, `rgba(255, 30, 0, ${0.15 * intensity})`);
                    heatGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');

                    canvasCtx.globalCompositeOperation = 'screen';
                    canvasCtx.fillStyle = heatGlow;
                    canvasCtx.fillRect(0, 0, canvasElement.width, canvasElement.height);

                    landmarks.forEach(pt => spawnFire(pt.x * canvasElement.width, pt.y * canvasElement.height));
                    HAND_CONNECTIONS.forEach(([s, e]) => {
                        const start = landmarks[s];
                        const end = landmarks[e];
                        spawnFire(((start.x + end.x) / 2) * canvasElement.width, ((start.y + end.y) / 2) * canvasElement.height);
                    });
                } else {
                    let flicker = Math.sin(Date.now() * 0.01) * 20;
                    let coldGlow = canvasCtx.createRadialGradient(lx, ly, 0, lx, ly, 400 + flicker);

                    coldGlow.addColorStop(0, `rgba(100, 200, 255, ${0.4 * intensity})`);
                    coldGlow.addColorStop(0.5, `rgba(0, 100, 255, ${0.1 * intensity})`);
                    coldGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');

                    canvasCtx.globalCompositeOperation = 'screen';
                    canvasCtx.fillStyle = coldGlow;
                    canvasCtx.fillRect(0, 0, canvasElement.width, canvasElement.height);

                    landmarks.forEach(pt => spawnIce(pt.x * canvasElement.width, pt.y * canvasElement.height));
                    HAND_CONNECTIONS.forEach(([s, e]) => {
                        const start = landmarks[s];
                        const end = landmarks[e];
                        spawnIce(((start.x + end.x) / 2) * canvasElement.width, ((start.y + end.y) / 2) * canvasElement.height);
                    });
                }
            }
        });
    }

    canvasCtx.globalCompositeOperation = 'lighter';

    explosionBursts = explosionBursts.filter((b) => {
        b.radius += (b.maxRadius - b.radius) * 0.25;
        b.life -= b.decay;
        if (b.life <= 0) return false;
        const alpha = b.life * 0.6;
        const ringGrad = canvasCtx.createRadialGradient(b.x, b.y, b.radius * 0.7, b.x, b.y, b.radius);
        ringGrad.addColorStop(0, 'rgba(255, 200, 255, 0)');
        ringGrad.addColorStop(0.4, `rgba(255, 150, 100, ${alpha * 0.5})`);
        ringGrad.addColorStop(0.7, `rgba(100, 150, 255, ${alpha * 0.3})`);
        ringGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        canvasCtx.fillStyle = ringGrad;
        canvasCtx.beginPath();
        canvasCtx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        canvasCtx.fill();
        return true;
    });

    if (liveFusionBall) {
        const p = liveFusionBall;
        const t = (Date.now() - startTime) * 0.0015;
        const pulse = 0.94 + 0.06 * Math.sin(t);

        canvasCtx.save();

        const sphereGrad = canvasCtx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * pulse);
        sphereGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
        sphereGrad.addColorStop(0.12, 'rgba(255, 235, 200, 0.98)');
        sphereGrad.addColorStop(0.25, 'rgba(255, 200, 150, 0.95)');
        sphereGrad.addColorStop(0.38, 'rgba(255, 160, 120, 0.92)');
        sphereGrad.addColorStop(0.5, 'rgba(230, 170, 200, 0.9)');
        sphereGrad.addColorStop(0.62, 'rgba(180, 180, 240, 0.9)');
        sphereGrad.addColorStop(0.75, 'rgba(120, 160, 255, 0.88)');
        sphereGrad.addColorStop(0.88, 'rgba(60, 120, 230, 0.6)');
        sphereGrad.addColorStop(1, 'rgba(40, 80, 180, 0)');
        canvasCtx.fillStyle = sphereGrad;
        canvasCtx.beginPath();
        canvasCtx.arc(p.x, p.y, p.size * pulse, 0, Math.PI * 2);
        canvasCtx.fill();

        canvasCtx.restore();
    }

    particles.forEach((p, index) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= (p.decay || 0.06);

        if (p.life <= 0) {
            particles.splice(index, 1);
        } else {
            let gradient = canvasCtx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);

            if (p.type === 'ice') {
                gradient.addColorStop(0, `rgba(255, 255, 255, ${p.life})`);
                gradient.addColorStop(0.3, `rgba(180, 240, 255, ${p.life * 0.8})`);
                gradient.addColorStop(0.6, `rgba(0, 150, 255, ${p.life * 0.4})`);
            } else if (p.type === 'red') {
                gradient.addColorStop(0, `rgba(255, 200, 200, ${p.life})`);
                gradient.addColorStop(0.3, `rgba(255, 0, 0, ${p.life * 0.8})`);
                gradient.addColorStop(0.6, `rgba(100, 0, 0, ${p.life * 0.4})`);
            } else if (p.type === 'blue') {
                gradient.addColorStop(0, `rgba(200, 200, 255, ${p.life})`);
                gradient.addColorStop(0.3, `rgba(0, 0, 255, ${p.life * 0.8})`);
                gradient.addColorStop(0.6, `rgba(0, 0, 100, ${p.life * 0.4})`);
            } else if (p.type === 'fusion') {
                gradient.addColorStop(0, `rgba(255, 255, 255, ${p.life})`);
                gradient.addColorStop(0.2, `rgba(255, 180, 100, ${p.life * 0.9})`);
                gradient.addColorStop(0.4, `rgba(255, 80, 0, ${p.life * 0.7})`);
                gradient.addColorStop(0.6, `rgba(100, 150, 255, ${p.life * 0.5})`);
                gradient.addColorStop(0.8, `rgba(0, 100, 255, ${p.life * 0.3})`);
            } else {
                gradient.addColorStop(0, `rgba(255, 255, 220, ${p.life})`);
                gradient.addColorStop(0.2, `rgba(255, 180, 0, ${p.life * 0.8})`);
                gradient.addColorStop(0.5, `rgba(255, 40, 0, ${p.life * 0.4})`);
            }
            gradient.addColorStop(1, `rgba(0, 0, 0, 0)`);
            canvasCtx.fillStyle = gradient;
            canvasCtx.beginPath();
            canvasCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            canvasCtx.fill();
        }
    });

    lightningBolts.forEach((b, index) => {
        b.life -= 0.1;
        if (b.life <= 0) {
            lightningBolts.splice(index, 1);
        } else {
            if (b.path.length === 0) return;

            canvasCtx.beginPath();
            canvasCtx.moveTo(b.path[0].x, b.path[0].y);
            for (let i = 1; i < b.path.length; i++) {
                canvasCtx.lineTo(b.path[i].x, b.path[i].y);
            }

            canvasCtx.save();
            canvasCtx.globalCompositeOperation = 'lighter';
            canvasCtx.strokeStyle = b.color;
            canvasCtx.lineWidth = 20;
            canvasCtx.globalAlpha = b.life * 0.3;
            canvasCtx.shadowBlur = 30;
            canvasCtx.shadowColor = b.color;
            canvasCtx.stroke();
            canvasCtx.restore();

            canvasCtx.save();
            canvasCtx.globalCompositeOperation = 'lighter';
            canvasCtx.strokeStyle = b.color;
            canvasCtx.lineWidth = 8;
            canvasCtx.globalAlpha = b.life * 0.6;
            canvasCtx.stroke();
            canvasCtx.restore();

            canvasCtx.save();
            canvasCtx.globalCompositeOperation = 'source-over';
            canvasCtx.strokeStyle = '#ffffff';
            canvasCtx.lineWidth = 2;
            canvasCtx.globalAlpha = b.life;
            canvasCtx.stroke();
            canvasCtx.restore();
        }
    });

    canvasCtx.restore();
}

const hands = new Hands({
    locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
    }
});

hands.setOptions({
    maxNumHands: 2,
    modelComplexity: 1,
    minDetectionConfidence: 0.65,
    minTrackingConfidence: 0.65
});

hands.onResults(onResults);

const camera = new Camera(videoElement, {
    onFrame: async () => {
        await hands.send({ image: videoElement });
    },
    width: 1280,
    height: 720
});
camera.start();
