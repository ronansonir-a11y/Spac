# AETHER-6

**Procedural deep-space combat for Android and the browser.** A self-contained TypeScript + Three.js game packaged with Capacitor. All geometry, planets, effects, icons and audio are generated locally; there are no remote assets, accounts, ads, analytics or runtime network requests.

## Play

- **Android:** download `AETHER-6.apk` from [Releases](https://github.com/ronansonir-a11y/Spac/releases). Allow installation from your browser/file manager if Android asks. The APK is debug-signed and installable directly; it is not a Play Store package.
- **Web:** `npm ci && npm run dev`, then open the Vite URL. `npm run build` creates the static offline-ready site in `dist/`.
- **Requirements:** Android 7.0+ with an up-to-date Android System WebView and WebGL 2. Landscape orientation is selected automatically.

## Flight controls

| Action | Keyboard / mouse | Android |
|---|---|---|
| Pitch / yaw | Mouse or I/J/K/L | Left attitude stick |
| Main / reverse thrust | W / S | Hold THRUST (main drive) |
| Lateral / vertical thrust | A/D and R/C | Flight Assist stabilization |
| Roll | Q / E | — |
| Fire pulse lasers | Space | FIRE |
| Boost | Shift | BOOST |
| Mining beam | M near an asteroid | MINE near an asteroid |
| Flight Assist | F | FLIGHT ASSIST |
| Cycle targets | Tab | NEXT TARGET |
| Pause | Escape | Ⅱ |

Hold fire and aim near the orange **LEAD** marker. Pulse lasers inherit ship velocity and damage shields first. An overheated weapon must cool before firing again. Destroy raiders or mine nearby asteroids to earn credits. Clearing a wave initiates a jump into a harder procedural sector.

## Implemented systems

- Fixed-step, six-degree-of-freedom Newtonian flight with inertia, boost, angular control and optional Flight Assist.
- Floating Origin recalibration at 5 km from the local origin.
- Deterministic 64-bit seeded galaxy generator: 50 sectors, 3–8 planets per system, threat scaling and enemy waves.
- Instanced asteroid belt (1,600 rocks per sector), nearby mining and steering avoidance for large rocks.
- Procedural PBR-style ships, station, animated star, shader planets, atmospheric rims, nebulae and impact-reactive Fresnel shields.
- Object pools for 500 projectiles and 160 explosion particles; no combat-time projectile allocation.
- Exact quadratic target interception and a HUD lead marker with projectile velocity inheritance.
- Enemy state machine: scan, intercept, attack run and low-shield evade; target speed and evasive steering vary by sector.
- Shield/hull damage, shield regeneration, weapon heat, explosions, local high-score persistence and sector progression.
- Projected target/velocity markers, spherical radar with elevation stems, system telemetry and responsive touch HUD.
- Procedural Web Audio engine, lasers, impacts and explosions; vibration on supported Android devices.

## Architecture

```text
src/
  Core/       Seeded RNG, event bus, math, interception, PID and pooling
  Physics/    Fixed-step 6DoF flight model
  ProcGen/    Galaxy data and procedural meshes
  Shaders/    Planet, atmosphere, star and shield GLSL
  Economy/    Deterministic market model
  UI/         HUD, input, responsive screens and radar
  Audio/      Web Audio synthesis
  Game.ts     Combat, AI, collisions, world lifecycle and rendering
android/      Native Capacitor shell, immersive landscape activity and icons
tests/        Deterministic unit and flight-simulation tests
.github/      Test, web artifact, Android APK and release workflows
```

The simulation uses a fixed 60 Hz step with a bounded frame delta. Rendering and native packaging share the same production `dist/` output.

## Build and test

```bash
npm ci
npm test                 # 11 deterministic tests
npm run build            # TypeScript check + production web build
npx cap sync android     # copy production assets into native project
cd android && ./gradlew assembleDebug
```

The last command requires JDK 21 and Android SDK 36. Output: `android/app/build/outputs/apk/debug/app-debug.apk`.

Every pushed branch runs **Test and build Android APK**. CI uploads both `AETHER-6-Android-APK` and `AETHER-6-web` artifacts. Pushing a `v*` tag runs the release workflow and attaches `AETHER-6.apk` to the corresponding GitHub Release.

## Notes

This is a compact playable game, not the entirety of the much larger AETHER-6 concept document: planetary landing, full orbital mechanics, docking/trading UI, missiles, supercruise and multiplayer are outside this build. The APK is a direct-install debug build. For Play Store distribution, generate a private upload key, configure a signed release/AAB and complete store review; no private signing keys are stored in this repository.
