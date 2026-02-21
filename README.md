# Cinematic Frostfire

A hand-tracking web app with cinematic fire, ice, lightning, and fusion effects. Uses MediaPipe Hands for real-time gesture control.

## Features

- **Fire & Ice Mode** (key `1`): Left hand = fire, Right hand = ice
- **Lightning Mode** (key `2`): Electric bolts from fingertips
- **Red & Blue Mode** (key `3`): Left hand = red glow, Right hand = blue glow

**Gestures:**
- **Open palm** → Track particles at hand
- **Pinch** (thumb + index) → Draw persistent trails (fire/ice mode, after 10s warmup)

**Fusion Ball:**
- **Touch both hands** (palms close) → **Separate hands** → Spawn fusion ball between palms
- Ball size scales with hand distance (1–9 cm)
- Ball follows both hands; requires both hands to stay visible
- **Both fists** → Explode the ball into fire and ice particles

## How to Run

```bash
cd hand-fire-draw
npx serve -l 3000 .
```

Open **http://localhost:3000**

Or use Python:
```bash
python3 -m http.server 3001
```
Open **http://localhost:3001**

## Requirements

- Webcam
- Modern browser (Chrome recommended)
- HTTPS or localhost (camera requires secure context)

## Controls

| Key | Mode        |
|-----|-------------|
| 1   | Fire & Ice  |
| 2   | Lightning   |
| 3   | Red & Blue  |
