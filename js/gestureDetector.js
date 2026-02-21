/**
 * Gesture detection using MediaPipe hand landmarks.
 * Detects: OPEN_PALM, OK_SIGN
 */

const GestureType = {
  NONE: 'none',
  OPEN_PALM: 'open_palm',
  OK_SIGN: 'ok_sign'
};

function getLandmark(landmarks, i) {
  const p = landmarks[i];
  if (!p) return { x: 0, y: 0, z: 0 };
  return { x: p.x ?? p[0] ?? 0, y: p.y ?? p[1] ?? 0, z: p.z ?? p[2] ?? 0 };
}

function detectGesture(landmarks) {
  if (!landmarks || landmarks.length < 21) return GestureType.NONE;

  const get = (i) => getLandmark(landmarks, i);
  const THUMB_TIP = 4, THUMB_IP = 3;
  const INDEX_TIP = 8, INDEX_PIP = 6;
  const MIDDLE_TIP = 12, MIDDLE_PIP = 10;
  const RING_TIP = 16, RING_PIP = 14;
  const PINKY_TIP = 20, PINKY_PIP = 18;

  const dist = (a, b) => Math.hypot((a?.x ?? 0) - (b?.x ?? 0), (a?.y ?? 0) - (b?.y ?? 0), (a?.z ?? 0) - (b?.z ?? 0));

  const thumbIndexDist = dist(get(THUMB_TIP), get(INDEX_TIP));
  const thumbIndexClose = thumbIndexDist < 0.22;

  const middleExtended = (get(MIDDLE_TIP).y ?? 1) < (get(MIDDLE_PIP).y ?? 0);
  const ringExtended = (get(RING_TIP).y ?? 1) < (get(RING_PIP).y ?? 0);
  const pinkyExtended = (get(PINKY_TIP).y ?? 1) < (get(PINKY_PIP).y ?? 0);
  const othersClosed = !middleExtended && !ringExtended && !pinkyExtended;

  if (thumbIndexClose && othersClosed) return GestureType.OK_SIGN;

  const thumbExtended = (get(THUMB_TIP).x ?? 0) < (get(THUMB_IP).x ?? 1) || (get(THUMB_TIP).y ?? 0) < (get(THUMB_IP).y ?? 1);
  const indexExtended = (get(INDEX_TIP).y ?? 1) < (get(INDEX_PIP).y ?? 0);

  const extendedCount = [thumbExtended, indexExtended, middleExtended, ringExtended, pinkyExtended].filter(Boolean).length;
  if (extendedCount >= 3) return GestureType.OPEN_PALM;

  return GestureType.NONE;
}

function getPalmCenter(landmarks) {
  if (!landmarks || landmarks.length < 21) return null;
  const palmPoints = [0, 5, 9, 13, 17];
  let x = 0, y = 0;
  palmPoints.forEach(i => {
    const p = getLandmark(landmarks, i);
    x += (p?.x ?? 0);
    y += (p?.y ?? 0);
  });
  return { x: x / palmPoints.length, y: y / palmPoints.length };
}

function getOKDrawPoint(landmarks) {
  if (!landmarks || landmarks.length < 21) return null;
  const thumb = getLandmark(landmarks, 4);
  const index = getLandmark(landmarks, 8);
  return { x: ((thumb?.x ?? 0) + (index?.x ?? 0)) / 2, y: ((thumb?.y ?? 0) + (index?.y ?? 0)) / 2 };
}
