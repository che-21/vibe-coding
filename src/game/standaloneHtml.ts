// Standalone Single HTML generator containing entire game (Three.js, Web Audio, Models, HUD, CRT)
export function getStandaloneHtml(): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <title>Retro 3D Sky Striker - 1945 Arcade</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@600;700&family=Press+Start+2P&family=Rajdhani:wght@600;700&display=swap" rel="stylesheet">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"><\/script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; user-select: none; -webkit-user-select: none; }
    body, html { width: 100%; height: 100%; overflow: hidden; background: #050814; font-family: 'Chakra Petch', sans-serif; color: #fff; }
    #canvas-container { position: absolute; inset: 0; width: 100%; height: 100%; z-index: 1; }
    
    /* CRT Scanlines and Vignette */
    .crt-lines {
      position: absolute; inset: 0; z-index: 10; pointer-events: none;
      background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.3) 50%),
                  linear-gradient(90deg, rgba(255, 0, 0, 0.03), rgba(0, 255, 0, 0.01), rgba(0, 0, 255, 0.03));
      background-size: 100% 4px, 6px 100%;
    }
    .crt-vignette {
      position: absolute; inset: 0; z-index: 11; pointer-events: none;
      box-shadow: inset 0 0 100px rgba(0,0,0,0.85);
    }

    /* Screen Flash Overlay */
    #flash-overlay {
      position: absolute; inset: 0; z-index: 15; pointer-events: none;
      background: transparent; transition: background 0.08s ease-out;
    }

    /* HUD UI */
    #hud {
      position: absolute; inset: 0; z-index: 20; pointer-events: none;
      display: flex; flex-direction: column; justify-content: space-between;
      padding: 18px 24px;
    }
    .hud-top { display: flex; justify-content: space-between; align-items: flex-start; }
    .hud-box {
      background: rgba(10, 15, 30, 0.7); backdrop-filter: blur(8px);
      border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 8px;
      padding: 10px 16px;
    }
    .hud-title { font-family: 'Press Start 2P', monospace; font-size: 10px; color: #94a3b8; letter-spacing: 1px; margin-bottom: 6px; }
    .hud-val { font-family: 'Press Start 2P', monospace; font-size: 16px; color: #38bdf8; text-shadow: 0 0 8px rgba(56, 189, 248, 0.6); }
    .hud-lives { display: flex; gap: 6px; font-size: 18px; color: #ef4444; }
    .hud-bombs { display: flex; gap: 6px; font-size: 16px; color: #f97316; margin-top: 4px; }
    
    /* Boss Health Bar */
    #boss-bar-wrap {
      position: absolute; top: 18px; left: 50%; transform: translateX(-50%);
      width: min(90%, 460px); display: none; text-align: center;
    }
    .boss-name { font-family: 'Press Start 2P', monospace; font-size: 11px; color: #f87171; margin-bottom: 6px; letter-spacing: 2px; text-shadow: 0 0 10px #ef4444; }
    .boss-hp-bg { width: 100%; height: 16px; background: rgba(0,0,0,0.8); border: 2px solid #ef4444; border-radius: 4px; overflow: hidden; padding: 2px; }
    .boss-hp-fill { width: 100%; height: 100%; background: linear-gradient(90deg, #dc2626, #f87171); transition: width 0.15s ease; border-radius: 2px; }

    /* Modals & Overlays */
    .modal-overlay {
      position: absolute; inset: 0; z-index: 30;
      background: rgba(5, 8, 20, 0.88); backdrop-filter: blur(12px);
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: 24px; text-align: center;
    }
    .retro-title {
      font-family: 'Press Start 2P', monospace; font-size: 26px; line-height: 1.5;
      color: #38bdf8; text-shadow: 0 0 16px rgba(56, 189, 248, 0.8), 0 0 32px rgba(56, 189, 248, 0.4);
      margin-bottom: 12px;
    }
    .retro-subtitle { color: #cbd5e1; font-size: 15px; margin-bottom: 28px; max-width: 520px; line-height: 1.6; }
    .btn-arcade {
      font-family: 'Press Start 2P', monospace; font-size: 13px;
      background: linear-gradient(180deg, #0284c7, #0369a1);
      color: #fff; padding: 14px 28px; border: 2px solid #38bdf8;
      border-radius: 6px; cursor: pointer; transition: all 0.15s;
      box-shadow: 0 0 20px rgba(56, 189, 248, 0.5);
    }
    .btn-arcade:hover { transform: scale(1.05); background: #0ea5e9; }
    .btn-arcade:active { transform: scale(0.97); }

    /* Controls Cheat Sheet */
    .controls-grid {
      display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;
      margin-bottom: 28px; max-width: 480px; width: 100%; text-align: left;
    }
    .ctrl-item {
      background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255, 255, 255, 0.1);
      padding: 10px 14px; border-radius: 6px; font-size: 13px; color: #94a3b8;
    }
    .ctrl-key {
      font-family: 'Press Start 2P', monospace; font-size: 10px;
      background: #334155; color: #38bdf8; padding: 3px 6px; border-radius: 4px;
      border-bottom: 2px solid #1e293b; margin-right: 6px;
    }

    /* Warning Siren Banner */
    #warning-banner {
      position: absolute; top: 38%; left: 0; right: 0; z-index: 25;
      background: rgba(220, 38, 38, 0.85); color: #fff; text-align: center;
      padding: 18px 0; font-family: 'Press Start 2P', monospace; font-size: 22px;
      letter-spacing: 4px; display: none; text-shadow: 0 0 16px #000;
      border-top: 4px solid #facc15; border-bottom: 4px solid #facc15;
      animation: pulse 0.5s infinite alternate;
    }
    @keyframes pulse { from { opacity: 0.7; } to { opacity: 1; } }

    /* Mobile Virtual Controls */
    #mobile-controls {
      position: absolute; bottom: 20px; left: 20px; right: 20px; z-index: 22;
      display: flex; justify-content: space-between; align-items: flex-end;
      pointer-events: none;
    }
    .mob-btn {
      pointer-events: auto; width: 68px; height: 68px; border-radius: 50%;
      background: rgba(249, 115, 22, 0.8); border: 2px solid #ffedd5;
      color: #fff; font-family: 'Press Start 2P', monospace; font-size: 11px;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 0 16px rgba(249, 115, 22, 0.6);
    }
    .mob-btn:active { transform: scale(0.92); background: #ea580c; }
  </style>
</head>
<body>

  <div id="canvas-container"></div>
  <div class="crt-lines"></div>
  <div class="crt-vignette"></div>
  <div id="flash-overlay"></div>

  <!-- HUD -->
  <div id="hud">
    <div class="hud-top">
      <div class="hud-box">
        <div class="hud-title">LIVES</div>
        <div class="hud-lives" id="lives-display">❤️❤️❤️</div>
        <div class="hud-bombs" id="bombs-display">💣 3</div>
      </div>
      <div class="hud-box" style="text-align: right;">
        <div class="hud-title">SCORE / HIGH</div>
        <div class="hud-val" id="score-display">000000</div>
        <div style="font-size: 11px; color: #facc15; margin-top: 4px; font-family: 'Press Start 2P', monospace;" id="high-display">HI: 000000</div>
      </div>
    </div>

    <!-- Boss HP Bar -->
    <div id="boss-bar-wrap">
      <div class="boss-name" id="boss-name-text">⚠️ GOLIATH DREADNOUGHT ⚠️</div>
      <div class="boss-hp-bg">
        <div class="boss-hp-fill" id="boss-hp-fill"></div>
      </div>
    </div>

    <div style="display: flex; justify-content: space-between; align-items: flex-end;">
      <div class="hud-box" style="font-size: 12px; color: #94a3b8;">
        <span style="color: #38bdf8;">WEAPON:</span> <span id="weapon-display" style="color: #facc15; font-weight: bold;">LV 1 (DUAL)</span>
      </div>
      <div id="mobile-controls">
        <div></div>
        <button class="mob-btn" id="btn-mob-bomb">BOMB</button>
      </div>
    </div>
  </div>

  <!-- Warning Banner -->
  <div id="warning-banner">⚠️ WARNING! BOSS APPROACHING ⚠️</div>

  <!-- Start Screen Modal -->
  <div class="modal-overlay" id="start-screen">
    <h1 class="retro-title">RETRO 3D SKY STRIKER</h1>
    <p class="retro-subtitle">1990년대 아케이드 오락실 명작 1945·라이덴 감성의 3D 로우폴리 탄막 슈팅</p>
    
    <div class="controls-grid">
      <div class="ctrl-item"><span class="ctrl-key">W A S D</span> 기체 이동</div>
      <div class="ctrl-item"><span class="ctrl-key">SPACE</span> 일반 사격 (연사)</div>
      <div class="ctrl-item"><span class="ctrl-key">B / SHIFT</span> 필살기 메가 폭탄</div>
      <div class="ctrl-item"><span class="ctrl-key">P / B / H</span> 파워업·폭탄·회복 아이템</div>
    </div>

    <button class="btn-arcade" id="btn-start">PRESS SPACE TO START</button>
  </div>

  <!-- Game Over Screen -->
  <div class="modal-overlay" id="gameover-screen" style="display: none;">
    <h1 class="retro-title" style="color: #ef4444; text-shadow: 0 0 20px #ef4444;">GAME OVER</h1>
    <p class="retro-subtitle" id="gameover-stats">FINAL SCORE: 000000</p>
    <button class="btn-arcade" id="btn-restart-gameover">RESTART (R KEY)</button>
  </div>

  <!-- Victory Screen -->
  <div class="modal-overlay" id="victory-screen" style="display: none;">
    <h1 class="retro-title" style="color: #facc15; text-shadow: 0 0 24px #facc15;">MISSION COMPLETE!</h1>
    <p class="retro-subtitle" id="victory-stats">거대 공중전함 격퇴 완료! 당신이 바로 에이스 조종사입니다.</p>
    <button class="btn-arcade" id="btn-restart-victory">PLAY AGAIN (R KEY)</button>
  </div>

  <script>
    // --- Web Audio Synthesizer ---
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    let audioCtx = null;
    let masterGain = null;
    let noiseBuffer = null;

    function initAudio() {
      if (audioCtx) { if (audioCtx.state === 'suspended') audioCtx.resume(); return; }
      audioCtx = new AudioCtx();
      masterGain = audioCtx.createGain();
      masterGain.gain.setValueAtTime(0.5, audioCtx.currentTime);
      masterGain.connect(audioCtx.destination);

      const bufSize = audioCtx.sampleRate;
      noiseBuffer = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
      const out = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufSize; i++) out[i] = Math.random() * 2 - 1;
    }

    function playLaser() {
      initAudio();
      const t = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(880, t);
      osc.frequency.exponentialRampToValueAtTime(160, t + 0.1);
      g.gain.setValueAtTime(0.15, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      osc.connect(g); g.connect(masterGain);
      osc.start(t); osc.stop(t + 0.1);
    }

    function playExplosion(large) {
      initAudio();
      if (!noiseBuffer) return;
      const t = audioCtx.currentTime;
      const dur = large ? 0.9 : 0.4;
      const noise = audioCtx.createBufferSource();
      noise.buffer = noiseBuffer;
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(large ? 800 : 1300, t);
      filter.frequency.exponentialRampToValueAtTime(50, t + dur);
      const g = audioCtx.createGain();
      g.gain.setValueAtTime(large ? 0.6 : 0.3, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      noise.connect(filter); filter.connect(g); g.connect(masterGain);
      noise.start(t); noise.stop(t + dur);
    }

    function playBomb() {
      initAudio();
      const t = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, t);
      osc.frequency.exponentialRampToValueAtTime(25, t + 1.2);
      g.gain.setValueAtTime(0.7, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 1.6);
      osc.connect(g); g.connect(masterGain);
      osc.start(t); osc.stop(t + 1.6);
      playExplosion(true);
    }

    function playPickup() {
      initAudio();
      [330, 440, 554, 660, 880].forEach((f, idx) => {
        const t = audioCtx.currentTime + idx * 0.04;
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc.frequency.setValueAtTime(f, t);
        g.gain.setValueAtTime(0.2, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        osc.connect(g); g.connect(masterGain);
        osc.start(t); osc.stop(t + 0.16);
      });
    }

    // --- Three.js Game Setup ---
    const container = document.getElementById('canvas-container');
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x071126);
    scene.fog = new THREE.FogExp2(0x071126, 0.016);

    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 150);
    camera.position.set(0, 16.5, 13.5);
    camera.lookAt(0, 0.5, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.appendChild(renderer.domElement);

    // Lights
    scene.add(new THREE.AmbientLight(0x7dd3fc, 0.9));
    const sun = new THREE.DirectionalLight(0xfffbeb, 1.4);
    sun.position.set(12, 28, 14);
    scene.add(sun);
    const rim = new THREE.DirectionalLight(0x0284c7, 0.8);
    rim.position.set(-10, 8, -20);
    scene.add(rim);

    // Ocean Water
    const water = new THREE.Mesh(
      new THREE.PlaneGeometry(120, 160),
      new THREE.MeshStandardMaterial({ color: 0x0f3460, roughness: 0.15, metalness: 0.5, flatShading: true })
    );
    water.rotation.x = -Math.PI / 2;
    water.position.y = -3.5;
    scene.add(water);

    // Islands & Clouds
    const islands = [];
    for (let i = 0; i < 5; i++) {
      const isl = new THREE.Group();
      const sand = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 4.8, 0.6, 7), new THREE.MeshStandardMaterial({ color: 0xfde047, flatShading: true }));
      const peak = new THREE.Mesh(new THREE.ConeGeometry(2.4, 2.8, 6), new THREE.MeshStandardMaterial({ color: 0x15803d, flatShading: true }));
      peak.position.set(0.3, 1.1, -0.2);
      isl.add(sand); isl.add(peak);
      isl.position.set((Math.random() - 0.5) * 36, -3.2, -30 + i * 24);
      scene.add(isl); islands.push(isl);
    }

    const clouds = [];
    for (let i = 0; i < 15; i++) {
      const c = new THREE.Group();
      const geo = new THREE.DodecahedronGeometry(1.2, 1);
      const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, flatShading: true });
      for (let j = 0; j < 5; j++) {
        const puff = new THREE.Mesh(geo, mat);
        puff.position.set((Math.random() - 0.5) * 3, (Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 2);
        c.add(puff);
      }
      c.position.set((Math.random() - 0.5) * 44, Math.random() > 0.5 ? -1 : 4.5, -40 + Math.random() * 80);
      scene.add(c); clouds.push(c);
    }

    // Player Fighter
    const playerGroup = new THREE.Group();
    const pMat = new THREE.MeshStandardMaterial({ color: 0x1e40af, roughness: 0.35, metalness: 0.6, flatShading: true });
    const pRed = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.3, flatShading: true });
    const pCanopy = new THREE.MeshPhysicalMaterial({ color: 0x06b6d4, roughness: 0.1, transparent: true, opacity: 0.85 });

    const fuselage = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.4, 2.6), pMat);
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.2, 5), pRed);
    nose.rotation.x = -Math.PI / 2; nose.position.set(0, 0, -1.9);
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.35, 0.9), pCanopy);
    canopy.position.set(0, 0.26, -0.4);
    const wings = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.08, 1.1), pMat);
    wings.position.set(0, 0.02, 0.15);
    const flameL = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.8, 6), new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
    flameL.rotation.x = Math.PI / 2; flameL.position.set(-0.25, 0, 1.95);
    const flameR = flameL.clone(); flameR.position.x = 0.25;

    playerGroup.add(fuselage, nose, canopy, wings, flameL, flameR);
    scene.add(playerGroup);

    // Game Variables
    let gameState = 'START';
    let lives = 3, bombs = 3, score = 0, highScore = parseInt(localStorage.getItem('sky_striker_high_score') || '0', 10);
    let weaponLevel = 1, kills = 0, invuln = 0;
    let px = 0, pz = 8, pvx = 0, pvz = 0;
    let shootCooldown = 0;
    let enemies = [], bullets = [], pickups = [], particles = [];
    let boss = null, bossCore = null, bossTurretL = null, bossTurretR = null;
    let waveTimer = 0, spawnCount = 0;

    const keys = {};
    window.addEventListener('keydown', e => {
      keys[e.code] = true;
      if (e.code === 'KeyB' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') triggerBomb();
      if (e.code === 'Space' && gameState === 'START') startGame();
      if (e.code === 'KeyR' && (gameState === 'GAMEOVER' || gameState === 'VICTORY')) startGame();
    });
    window.addEventListener('keyup', e => keys[e.code] = false);

    // Touch Drag Controls
    let touchStart = null;
    window.addEventListener('touchstart', e => {
      if (e.touches.length > 0) touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY, px, pz };
    });
    window.addEventListener('touchmove', e => {
      if (touchStart && e.touches.length > 0) {
        const dx = (e.touches[0].clientX - touchStart.x) * 0.04;
        const dz = (e.touches[0].clientY - touchStart.y) * 0.04;
        px = Math.max(-11.5, Math.min(11.5, touchStart.px + dx));
        pz = Math.max(-3, Math.min(11.5, touchStart.pz + dz));
      }
    });

    document.getElementById('btn-start').onclick = startGame;
    document.getElementById('btn-restart-gameover').onclick = startGame;
    document.getElementById('btn-restart-victory').onclick = startGame;
    document.getElementById('btn-mob-bomb').onclick = triggerBomb;

    function startGame() {
      initAudio();
      gameState = 'PLAYING';
      lives = 3; bombs = 3; score = 0; weaponLevel = 1; kills = 0; invuln = 1.0;
      px = 0; pz = 8; pvx = 0; pvz = 0;
      clearEntities();
      updateHUD();
      document.getElementById('start-screen').style.display = 'none';
      document.getElementById('gameover-screen').style.display = 'none';
      document.getElementById('victory-screen').style.display = 'none';
      document.getElementById('boss-bar-wrap').style.display = 'none';
    }

    function clearEntities() {
      enemies.forEach(e => scene.remove(e.mesh)); enemies = [];
      bullets.forEach(b => { scene.remove(b.mesh); b.mesh.geometry.dispose(); }); bullets = [];
      pickups.forEach(p => scene.remove(p.mesh)); pickups = [];
      particles.forEach(p => scene.remove(p.mesh)); particles = [];
      if (boss) { scene.remove(boss.mesh); boss = null; }
    }

    function updateHUD() {
      document.getElementById('lives-display').innerText = '❤️'.repeat(Math.max(0, lives));
      document.getElementById('bombs-display').innerText = '💣 ' + bombs;
      document.getElementById('score-display').innerText = score.toString().padStart(6, '0');
      document.getElementById('high-display').innerText = 'HI: ' + highScore.toString().padStart(6, '0');
      document.getElementById('weapon-display').innerText = 'LV ' + weaponLevel + (weaponLevel === 1 ? ' (DUAL)' : weaponLevel === 2 ? ' (QUAD)' : ' (5-SPREAD)');
      if (score > highScore) { highScore = score; localStorage.setItem('sky_striker_high_score', highScore); }
    }

    function flashScreen(col) {
      const fl = document.getElementById('flash-overlay');
      fl.style.background = col;
      setTimeout(() => fl.style.background = 'transparent', 80);
    }

    function triggerBomb() {
      if (bombs <= 0 || gameState !== 'PLAYING') return;
      bombs--; updateHUD();
      playBomb(); flashScreen('rgba(255, 255, 255, 0.85)');

      // Clear bullets
      bullets.forEach(b => { if (!b.isPlayer) { scene.remove(b.mesh); } });
      bullets = bullets.filter(b => b.isPlayer);

      // Hit enemies
      enemies.forEach(e => {
        e.hp -= 380;
        if (e.hp <= 0) { scene.remove(e.mesh); score += e.score; createExplosion(e.x, 0, e.z, true); }
      });
      enemies = enemies.filter(e => e.hp > 0);

      if (boss) {
        boss.hp -= 380;
        if (boss.hp <= 0) defeatBoss();
      }
      updateHUD();
    }

    function createExplosion(x, y, z, large) {
      playExplosion(large);
      for (let i = 0; i < (large ? 40 : 18); i++) {
        const p = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), new THREE.MeshBasicMaterial({ color: Math.random() > 0.5 ? 0xfacc15 : 0xef4444 }));
        p.position.set(x, y, z);
        const ang = Math.random() * Math.PI * 2;
        const spd = (large ? 6 : 3.5) * Math.random();
        scene.add(p);
        particles.push({ mesh: p, vx: Math.cos(ang) * spd, vz: Math.sin(ang) * spd, life: 0.5 });
      }
    }

    function spawnBoss() {
      const bGrp = new THREE.Group();
      const hull = new THREE.Mesh(new THREE.BoxGeometry(5.2, 1.4, 6.0), new THREE.MeshStandardMaterial({ color: 0x0f172a, flatShading: true }));
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.1, 1.8), new THREE.MeshStandardMaterial({ color: 0x991b1b, flatShading: true }));
      bridge.position.set(0, 1.1, -0.6);
      const core = new THREE.Mesh(new THREE.SphereGeometry(0.85, 12, 12), new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xff0000, emissiveIntensity: 1.5 }));
      core.position.set(0, 0.8, 1.4);
      bGrp.add(hull, bridge, core);
      bGrp.position.set(0, 0, -28);
      scene.add(bGrp);

      boss = { mesh: bGrp, core, hp: 1200, maxHp: 1200, x: 0, z: -28, time: 0, cooldown: 1.5 };
      document.getElementById('boss-bar-wrap').style.display = 'block';
    }

    function defeatBoss() {
      createExplosion(boss.x, 0, boss.z, true);
      scene.remove(boss.mesh);
      boss = null; score += 12000; updateHUD();
      document.getElementById('boss-bar-wrap').style.display = 'none';
      gameState = 'VICTORY';
      document.getElementById('victory-screen').style.display = 'flex';
      document.getElementById('victory-stats').innerText = 'FINAL SCORE: ' + score;
    }

    // Main Game Loop
    let lastTime = performance.now();
    function animate(now) {
      requestAnimationFrame(animate);
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      // Scrolling background
      water.position.z = (water.position.z + 12 * dt) % 20;
      islands.forEach(i => { i.position.z += 12 * dt; if (i.position.z > 35) i.position.z = -55; });
      clouds.forEach(c => { c.position.z += 22 * dt; if (c.position.z > 35) c.position.z = -65; });

      if (gameState === 'PLAYING') {
        // Player Movement
        let mx = 0, mz = 0;
        if (keys['KeyA'] || keys['ArrowLeft']) mx -= 1;
        if (keys['KeyD'] || keys['ArrowRight']) mx += 1;
        if (keys['KeyW'] || keys['ArrowUp']) mz -= 1;
        if (keys['KeyS'] || keys['ArrowDown']) mz += 1;
        pvx += (mx * 22 - pvx) * 14 * dt;
        pvz += (mz * 22 - pvz) * 14 * dt;
        px = Math.max(-11.5, Math.min(11.5, px + pvx * dt));
        pz = Math.max(-3, Math.min(11.5, pz + pvz * dt));
        playerGroup.position.set(px, 0, pz);
        playerGroup.rotation.z = -pvx * 0.038;

        // Auto Fire
        shootCooldown -= dt;
        if ((keys['Space'] || touchStart) && shootCooldown <= 0) {
          shootCooldown = 0.12; playLaser();
          [-0.4, 0.4].forEach(off => {
            const b = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.2, 6), new THREE.MeshBasicMaterial({ color: 0xfacc15 }));
            b.rotation.x = Math.PI / 2; b.position.set(px + off, 0.1, pz - 1.5);
            scene.add(b); bullets.push({ mesh: b, isPlayer: true, x: px + off, z: pz - 1.5, vz: -55, dmg: 28 });
          });
        }

        // Waves & Boss Spawn
        if (!boss && (kills >= 22 || score >= 4500)) {
          spawnBoss();
        } else if (!boss) {
          waveTimer -= dt;
          if (waveTimer <= 0) {
            waveTimer = 2.2;
            const x = (Math.random() - 0.5) * 16;
            const eMesh = new THREE.Mesh(new THREE.ConeGeometry(0.8, 1.8, 4), new THREE.MeshStandardMaterial({ color: 0xef4444, flatShading: true }));
            eMesh.rotation.x = Math.PI / 2; eMesh.position.set(x, 0, -22);
            scene.add(eMesh);
            enemies.push({ mesh: eMesh, x, z: -22, vz: 10, hp: 35, score: 100, shoot: 1.5 });
          }
        }

        // Update Boss
        if (boss) {
          boss.time += dt;
          if (boss.z < -8) boss.z += 4 * dt;
          else boss.x = Math.sin(boss.time * 1.5) * 6.5;
          boss.mesh.position.set(boss.x, 0, boss.z);
          boss.cooldown -= dt;
          if (boss.cooldown <= 0) {
            boss.cooldown = 1.6;
            [-0.3, 0, 0.3].forEach(ang => {
              const b = new THREE.Mesh(new THREE.SphereGeometry(0.25, 6, 6), new THREE.MeshBasicMaterial({ color: 0xff0044 }));
              b.position.set(boss.x, 0.1, boss.z + 2);
              scene.add(b);
              bullets.push({ mesh: b, isPlayer: false, x: boss.x, z: boss.z + 2, vx: Math.sin(ang) * 12, vz: Math.cos(ang) * 12 });
            });
          }
          document.getElementById('boss-hp-fill').style.width = Math.max(0, (boss.hp / boss.maxHp) * 100) + '%';
        }

        // Update Enemies
        for (let i = enemies.length - 1; i >= 0; i--) {
          const e = enemies[i];
          e.z += e.vz * dt;
          e.mesh.position.set(e.x, 0, e.z);
          if (e.z > 18) { scene.remove(e.mesh); enemies.splice(i, 1); }
        }

        // Update Bullets
        for (let i = bullets.length - 1; i >= 0; i--) {
          const b = bullets[i];
          b.x += (b.vx || 0) * dt;
          b.z += b.vz * dt;
          b.mesh.position.set(b.x, 0.1, b.z);
          if (b.z < -30 || b.z > 20) { scene.remove(b.mesh); bullets.splice(i, 1); continue; }

          // Collisions
          if (b.isPlayer) {
            enemies.forEach((e, ei) => {
              if (Math.abs(b.x - e.x) < 1.0 && Math.abs(b.z - e.z) < 1.0) {
                e.hp -= b.dmg;
                scene.remove(b.mesh); bullets.splice(i, 1);
                if (e.hp <= 0) {
                  createExplosion(e.x, 0, e.z, false);
                  scene.remove(e.mesh); enemies.splice(ei, 1);
                  score += e.score; kills++; updateHUD();
                }
              }
            });
            if (boss && Math.abs(b.x - boss.x) < 3.0 && Math.abs(b.z - boss.z) < 2.5) {
              boss.hp -= b.dmg;
              scene.remove(b.mesh); bullets.splice(i, 1);
              if (boss.hp <= 0) defeatBoss();
            }
          } else {
            if (Math.abs(b.x - px) < 0.8 && Math.abs(b.z - pz) < 0.8) {
              scene.remove(b.mesh); bullets.splice(i, 1);
              lives--; updateHUD(); flashScreen('rgba(239, 68, 68, 0.6)');
              createExplosion(px, 0, pz, false);
              if (lives <= 0) {
                gameState = 'GAMEOVER';
                document.getElementById('gameover-screen').style.display = 'flex';
                document.getElementById('gameover-stats').innerText = 'FINAL SCORE: ' + score;
              }
            }
          }
        }
      }

      // Update Particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= dt;
        p.mesh.position.x += p.vx * dt;
        p.mesh.position.z += p.vz * dt;
        if (p.life <= 0) { scene.remove(p.mesh); particles.splice(i, 1); }
      }

      renderer.render(scene, camera);
    }
    requestAnimationFrame(animate);

    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });
  <\/script>
</body>
</html>`;
}
