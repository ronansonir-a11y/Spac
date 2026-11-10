export const layout = `
<canvas id="game-canvas" aria-label="AETHER-6 game view"></canvas>
<div class="scanlines"></div><div class="vignette" id="vignette"></div>
<section id="boot" class="screen">
  <div class="boot-orbit orbit-a"></div><div class="boot-orbit orbit-b"></div>
  <div class="boot-content">
    <div class="eyebrow">DEEP SPACE FLIGHT PROGRAM // 2186</div>
    <h1>AETHER<span>—6</span></h1>
    <p class="tagline">NO UP. NO DOWN. <b>ONLY VELOCITY.</b></p>
    <div class="boot-line"><i></i><span>FLIGHT SYSTEMS READY</span><i></i></div>
    <button id="launch" class="primary">INITIATE LAUNCH <small>›</small></button>
    <div class="boot-meta"><span>PROCEDURAL UNIVERSE</span><span>6DOF NEWTONIAN FLIGHT</span><span>OFFLINE</span></div>
    <button id="how-button" class="text-button">FLIGHT MANUAL</button>
  </div>
  <div class="build">A6 // ANDROID BUILD 1.0.0</div>
</section>
<div id="hud" class="hidden">
  <header class="topbar">
    <div class="sector-block"><span class="mini-logo">A—6</span><div><small>CURRENT SECTOR</small><strong id="sector">KEPLER-01 REACH</strong></div></div>
    <div class="target-panel hidden" id="target-panel"><div class="target-title"><span>◇</span><b id="target-name">HOSTILE</b><em id="target-distance">0 m</em></div><div class="target-bars"><i id="target-shield"></i><i id="target-hull"></i></div><small id="target-state">INTERCEPT</small></div>
    <div class="score-block"><div><small>SALVAGE</small><b><span id="credits">0</span> <em>CR</em></b></div><button id="pause-button" aria-label="Pause">Ⅱ</button></div>
  </header>
  <aside class="telemetry panel-corner"><small>VELOCITY</small><div><b id="speed">000</b><span>m/s</span></div><div class="speed-track"><i id="speed-bar"></i></div><p><span>THR</span><b id="throttle">0%</b></p><p><span>G</span><b id="gforce">1.0</b></p></aside>
  <aside class="systems panel-corner"><div class="sys-title">SHIP SYSTEMS <span id="assist-status">FA</span></div><label>SHD <b id="shield-text">100</b></label><div class="sys-bar shield"><i id="shield-bar"></i></div><label>HUL <b id="hull-text">100</b></label><div class="sys-bar hull"><i id="hull-bar"></i></div><label>WEP <b id="heat-text">0</b></label><div class="sys-bar heat"><i id="heat-bar"></i></div></aside>
  <div class="reticle"><i></i><i></i><span></span></div>
  <div id="target-box" class="target-box hidden"><i></i><i></i><i></i><i></i></div>
  <div id="lead" class="lead hidden">○<span>LEAD</span></div>
  <div id="velocity-marker" class="velocity-marker hidden">⌖</div>
  <div id="alert" class="alert hidden">WARNING</div>
  <div id="toast" class="toast"></div>
  <div class="objective"><small>ACTIVE DIRECTIVE</small><b id="objective">CLEAR HOSTILE CONTACTS</b><span id="hostiles">5 CONTACTS</span></div>
  <canvas id="radar" width="180" height="180"></canvas>
  <div class="radar-label">PROXIMITY <span>5 KM</span></div>
  <div id="touch-stick" class="touch-stick"><div class="stick-ring"></div><div id="stick-knob" class="stick-knob"></div><span>ATTITUDE</span></div>
  <div class="touch-actions"><button id="thrust-button" class="action-small">THRUST</button><button id="mine-button" class="action-small">MINE</button><button id="boost-button" class="action-small">BOOST</button><button id="fire-button" class="fire-button"><i></i><span>FIRE</span></button></div>
  <div class="flight-buttons"><button id="assist-button">FLIGHT ASSIST <b>ON</b></button><button id="target-button">NEXT TARGET</button></div>
  <div class="desktop-help">W/S THRUST · A/D STRAFE · MOUSE ATTITUDE · Q/E ROLL · SPACE FIRE · SHIFT BOOST · F ASSIST · TAB TARGET · M MINE</div>
</div>
<section id="pause" class="screen modal hidden"><div class="modal-card"><div class="eyebrow">FLIGHT SUSPENDED</div><h2>PAUSED</h2><button id="resume" class="primary">RESUME FLIGHT</button><button id="audio-button" class="secondary">AUDIO: ON</button><button id="restart" class="secondary">RESTART SECTOR</button><p>Progress is stored locally on this device.</p></div></section>
<section id="manual" class="screen modal hidden"><div class="modal-card manual-card"><div class="eyebrow">AETHER-6 // PILOT BRIEFING</div><h2>FLIGHT MANUAL</h2><div class="manual-grid"><div><b>01 / FLY</b><p>Use the left stick or mouse to pitch and yaw. W/S control main thrust, A/D strafe, Q/E roll.</p></div><div><b>02 / FIGHT</b><p>Hold FIRE. Aim at the hollow lead marker to compensate for target velocity. Shields regenerate; hull does not.</p></div><div><b>03 / DRIFT</b><p>Toggle Flight Assist to cut automatic braking. With it off, your ship conserves momentum in all six axes.</p></div><div><b>04 / SURVIVE</b><p>Destroy raiders and mine nearby asteroids for credits. Clearing a hostile wave opens a new, harder sector.</p></div></div><button id="close-manual" class="primary">UNDERSTOOD</button></div></section>
<section id="debrief" class="screen modal hidden"><div class="modal-card"><div class="eyebrow">SIGNAL LOST</div><h2>SHIP DESTROYED</h2><div class="debrief-stats"><div><b id="final-kills">0</b><span>HOSTILES</span></div><div><b id="final-credits">0</b><span>CREDITS</span></div></div><button id="retry" class="primary">RELAUNCH</button></div></section>
`;
