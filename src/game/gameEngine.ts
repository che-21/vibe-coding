import * as THREE from 'three';
import { audio } from './audio';
import {
  createBossBattleship,
  createCloudCluster,
  createEnemyBulletMesh,
  createGunshipEnemy,
  createInterceptorEnemy,
  createLowPolyIsland,
  createPickupMesh,
  createPlayerJet,
  createPlayerLaserMesh,
  createScoutEnemy,
} from './models';
import { ParticleManager } from './particles';
import { Bullet, Enemy, GameState, PickupItem, PickupKind, PlayerStats } from './types';

export class GameEngine {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private particles: ParticleManager;

  // Game Loop
  private animFrameId: number | null = null;
  private lastTime = 0;
  private isDestroyed = false;

  // State
  public state: GameState = 'START';
  public stats: PlayerStats = {
    lives: 3,
    maxLives: 3,
    bombs: 3,
    score: 0,
    highScore: 0,
    weaponLevel: 1,
    invulnerableTime: 0,
    kills: 0,
  };

  // Player Mesh & Entities
  private playerGroup: THREE.Group | null = null;
  private leftFlame: THREE.Mesh | null = null;
  private rightFlame: THREE.Mesh | null = null;
  private updatePlayerSkin?: (newIndex: number) => void;
  public selectedShipIndex = 0;
  private playerX = 0;
  private playerZ = 8;
  private playerVx = 0;
  private playerVz = 0;
  private readonly playerSpeed = 22;
  private readonly xBound = 11.5;
  private readonly zMin = -3;
  private readonly zMax = 11.5;
  private shootCooldown = 0;
  private readonly shootInterval = 0.11;

  // Input states
  private keys: { [key: string]: boolean } = {};
  public isTouchFiring = false;
  public touchMoveVector = { x: 0, z: 0 };

  // Entities
  private enemies: Enemy[] = [];
  private bullets: Bullet[] = [];
  private pickups: PickupItem[] = [];
  private clouds: THREE.Group[] = [];
  private islands: THREE.Group[] = [];
  private waterPlane: THREE.Mesh | null = null;

  // Spawning & Boss
  private waveTimer = 0;
  private enemySpawnCount = 0;
  private bossEntity: Enemy | null = null;
  private bossCoreMesh: THREE.Mesh | null = null;
  private bossTurretL: THREE.Group | null = null;
  private bossTurretR: THREE.Group | null = null;
  private bossWarningTimer = 0;
  private bossExplosionQueue: { time: number; x: number; y: number; z: number }[] = [];

  // Screen shake & camera offset
  private shakeIntensity = 0;
  private cameraBaseY = 16.5;
  private cameraBaseZ = 13.5;

  // React Callbacks
  public onStatsChange?: (stats: PlayerStats) => void;
  public onStateChange?: (state: GameState) => void;
  public onBossHpChange?: (hp: number, maxHp: number, isRage: boolean) => void;
  public onScreenFlash?: (color: string) => void;
  public onScreenShake?: (intensity: number) => void;

  constructor(container: HTMLElement) {
    this.container = container;

    // Load High Score from LocalStorage
    const savedHighScore = localStorage.getItem('sky_striker_high_score');
    if (savedHighScore) {
      this.stats.highScore = parseInt(savedHighScore, 10) || 0;
    }

    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x071126); // Midnight deep navy
    this.scene.fog = new THREE.FogExp2(0x071126, 0.016);

    // 2. Camera
    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 150);
    this.camera.position.set(0, this.cameraBaseY, this.cameraBaseZ);
    this.camera.lookAt(0, 0.5, 0);

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    container.appendChild(this.renderer.domElement);

    // 4. Particles
    this.particles = new ParticleManager(this.scene);

    // 5. Lights
    this.setupLighting();

    // 6. Environment (Water, Islands, Clouds)
    this.setupEnvironment();

    // 7. Player Setup
    this.setupPlayer();

    // 8. Event Listeners
    this.bindEvents();

    // 9. Start loop
    this.lastTime = performance.now();
    this.animate(this.lastTime);
  }

  private setupLighting() {
    // Ambient soft blue sky light
    const ambient = new THREE.AmbientLight(0x7dd3fc, 0.9);
    this.scene.add(ambient);

    // Key directional sun
    const sun = new THREE.DirectionalLight(0xfffbeb, 1.4);
    sun.position.set(12, 28, 14);
    this.scene.add(sun);

    // Rim light from front-low to highlight airplane edges
    const rim = new THREE.DirectionalLight(0x0284c7, 0.8);
    rim.position.set(-10, 8, -20);
    this.scene.add(rim);
  }

  private setupEnvironment() {
    // Large scrolling water plane
    const waterGeo = new THREE.PlaneGeometry(120, 160, 20, 20);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x0f3460, // Deep ocean cyan/blue
      roughness: 0.15,
      metalness: 0.5,
      flatShading: true,
    });
    this.waterPlane = new THREE.Mesh(waterGeo, waterMat);
    this.waterPlane.rotation.x = -Math.PI / 2;
    this.waterPlane.position.y = -3.5;
    this.scene.add(this.waterPlane);

    // Generate low-poly islands
    for (let i = 0; i < 6; i++) {
      const island = createLowPolyIsland();
      island.position.set(
        (Math.random() - 0.5) * 36,
        -3.2,
        -30 + i * 22 + (Math.random() - 0.5) * 8
      );
      island.rotation.y = Math.random() * Math.PI * 2;
      this.scene.add(island);
      this.islands.push(island);
    }

    // Generate multi-altitude fluffy clouds
    for (let i = 0; i < 18; i++) {
      const cloud = createCloudCluster();
      const altitude = Math.random() > 0.5 ? -1.0 : 4.5;
      cloud.position.set(
        (Math.random() - 0.5) * 44,
        altitude,
        -40 + Math.random() * 80
      );
      this.scene.add(cloud);
      this.clouds.push(cloud);
    }
  }

  private setupPlayer() {
    const { group, leftFlame, rightFlame, updateSkin } = createPlayerJet(this.selectedShipIndex);
    this.playerGroup = group;
    this.leftFlame = leftFlame;
    this.rightFlame = rightFlame;
    this.updatePlayerSkin = updateSkin;
    this.playerGroup.position.set(this.playerX, 0, this.playerZ);
    this.scene.add(this.playerGroup);
  }

  public setPlayerShip(index: number) {
    this.selectedShipIndex = index;
    if (this.updatePlayerSkin) {
      this.updatePlayerSkin(index);
    }
  }

  private bindEvents() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('resize', this.handleResize);
  }

  private unbindEvents() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('resize', this.handleResize);
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    this.keys[e.code] = true;

    // Mega Bomb hotkeys: B or Shift
    if (e.code === 'KeyB' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
      if (this.state === 'PLAYING' || this.state === 'BOSS_WARNING') {
        this.triggerBomb();
      }
    }

    // Restart key: R
    if (e.code === 'KeyR') {
      if (this.state === 'GAMEOVER' || this.state === 'VICTORY') {
        this.restartGame();
      }
    }

    // Space key to start from title screen
    if (e.code === 'Space') {
      if (this.state === 'START') {
        this.startGame();
      }
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.keys[e.code] = false;
  };

  private handleResize = () => {
    if (!this.container || this.isDestroyed) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  // Public Controls
  public startGame() {
    audio.startAudio();
    audio.startMusic();
    this.state = 'PLAYING';
    this.stats.score = 0;
    this.stats.lives = 3;
    this.stats.bombs = 3;
    this.stats.weaponLevel = 1;
    this.stats.invulnerableTime = 1.0;
    this.stats.kills = 0;
    this.enemySpawnCount = 0;
    this.waveTimer = 0;
    this.playerX = 0;
    this.playerZ = 8;
    this.playerVx = 0;
    this.playerVz = 0;
    this.clearEntities();
    this.notifyStats();
    this.onStateChange?.(this.state);
  }

  public restartGame() {
    this.startGame();
  }

  public pauseGame() {
    if (this.state === 'PLAYING') {
      this.state = 'PAUSED';
      this.onStateChange?.(this.state);
    } else if (this.state === 'PAUSED') {
      this.state = 'PLAYING';
      this.onStateChange?.(this.state);
    }
  }

  // Mega Bomb Action
  public triggerBomb() {
    if (this.stats.bombs <= 0) return;
    this.stats.bombs--;
    this.notifyStats();

    audio.playBomb();
    this.onScreenFlash?.('rgba(255, 255, 255, 0.85)');
    this.applyScreenShake(0.85);

    // Create 3D Shockwave ring at player
    this.particles.createBombShockwave(this.playerX, 0, this.playerZ);

    // Clear ALL enemy bullets into sparkles & score
    let bulletsCleared = 0;
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      if (!b.isPlayer) {
        this.particles.createExplosion(b.x, b.y, b.z, false, 0x38bdf8);
        this.scene.remove(b.mesh);
        b.mesh.geometry.dispose();
        this.bullets.splice(i, 1);
        bulletsCleared++;
      }
    }
    if (bulletsCleared > 0) {
      this.stats.score += bulletsCleared * 80;
      this.notifyStats();
    }

    // Deal massive 380 damage to all enemies & boss on screen
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      enemy.hp -= 380;
      enemy.colorFlashTimer = 0.35;
      if (enemy.hp <= 0) {
        this.destroyEnemy(enemy, i);
      }
    }

    if (this.bossEntity && this.bossEntity.hp > 0) {
      this.bossEntity.hp -= 380;
      this.bossEntity.colorFlashTimer = 0.45;
      if (this.bossEntity.hp <= 0) {
        this.triggerBossDefeat();
      } else {
        this.updateBossHpUI();
      }
    }
  }

  private applyScreenShake(intensity: number) {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    this.onScreenShake?.(this.shakeIntensity);
  }

  // Primary Loop
  private animate = (now: number) => {
    if (this.isDestroyed) return;
    this.animFrameId = requestAnimationFrame(this.animate);

    const dt = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;

    if (this.state === 'PLAYING' || this.state === 'BOSS_WARNING') {
      this.updateGame(dt);
    }

    // Always update visual ambiance (water, clouds, particles)
    this.updateAtmosphere(dt);
    this.particles.update(dt);

    // Camera follow and screen shake
    this.updateCamera(dt);

    this.renderer.render(this.scene, this.camera);
  };

  private updateGame(dt: number) {
    // 1. Player Movement & Input
    this.updatePlayer(dt);

    // 2. Player Shooting
    this.updatePlayerShooting(dt);

    // 3. Spawning Logic (or Boss transition)
    this.updateSpawning(dt);

    // 4. Enemies & Boss Logic
    this.updateEnemies(dt);

    // 5. Bullets
    this.updateBullets(dt);

    // 6. Pickups
    this.updatePickups(dt);

    // 7. Check Collisions
    this.checkCollisions();

    // 8. Boss queued explosions
    this.updateBossExplosionQueue(dt);
  }

  private updatePlayer(dt: number) {
    if (!this.playerGroup) return;

    let moveX = 0;
    let moveZ = 0;

    if (this.keys['ArrowLeft'] || this.keys['KeyA']) moveX -= 1;
    if (this.keys['ArrowRight'] || this.keys['KeyD']) moveX += 1;
    if (this.keys['ArrowUp'] || this.keys['KeyW']) moveZ -= 1;
    if (this.keys['ArrowDown'] || this.keys['KeyS']) moveZ += 1;

    // Apply touch vector
    if (this.touchMoveVector.x !== 0 || this.touchMoveVector.z !== 0) {
      moveX += this.touchMoveVector.x;
      moveZ += this.touchMoveVector.z;
    }

    // Normalize diagonal
    const mag = Math.sqrt(moveX * moveX + moveZ * moveZ);
    if (mag > 1) {
      moveX /= mag;
      moveZ /= mag;
    }

    // Acceleration & Damping
    const targetVx = moveX * this.playerSpeed;
    const targetVz = moveZ * this.playerSpeed;
    this.playerVx += (targetVx - this.playerVx) * 14 * dt;
    this.playerVz += (targetVz - this.playerVz) * 14 * dt;

    this.playerX += this.playerVx * dt;
    this.playerZ += this.playerVz * dt;

    // Bounds clamp
    this.playerX = THREE.MathUtils.clamp(this.playerX, -this.xBound, this.xBound);
    this.playerZ = THREE.MathUtils.clamp(this.playerZ, this.zMin, this.zMax);

    this.playerGroup.position.set(this.playerX, 0, this.playerZ);

    // Banking Roll: tilting when steering left/right
    const targetRoll = -this.playerVx * 0.038;
    this.playerGroup.rotation.z += (targetRoll - this.playerGroup.rotation.z) * 12 * dt;

    // Subtle pitch tilt
    const targetPitch = this.playerVz * 0.015;
    this.playerGroup.rotation.x += (targetPitch - this.playerGroup.rotation.x) * 10 * dt;

    // Thruster exhaust flame animation
    const flameFlicker = 0.85 + Math.random() * 0.35 + (moveZ < 0 ? 0.35 : 0);
    if (this.leftFlame && this.rightFlame) {
      this.leftFlame.scale.set(1, flameFlicker, 1);
      this.rightFlame.scale.set(1, flameFlicker, 1);
    }
    this.particles.createThrusterSparks(this.playerX - 0.25, 0, this.playerZ + 2.0);
    this.particles.createThrusterSparks(this.playerX + 0.25, 0, this.playerZ + 2.0);

    // Invulnerability Blink
    if (this.stats.invulnerableTime > 0) {
      this.stats.invulnerableTime -= dt;
      const blink = Math.floor(this.stats.invulnerableTime * 14) % 2 === 0;
      this.playerGroup.visible = blink;
    } else {
      this.playerGroup.visible = true;
    }
  }

  private updatePlayerShooting(dt: number) {
    this.shootCooldown -= dt;
    const isFiring = this.keys['Space'] || this.isTouchFiring;

    if (isFiring && this.shootCooldown <= 0) {
      this.shootCooldown = this.shootInterval;
      this.firePlayerWeapon();
    }
  }

  private firePlayerWeapon() {
    const lvl = this.stats.weaponLevel;
    audio.playLaser(lvl);

    const speed = 56;
    const pZ = this.playerZ - 1.5;
    const pY = 0.1;

    if (lvl === 1) {
      // Dual central lasers
      [-0.45, 0.45].forEach((offsetX) => {
        const mesh = createPlayerLaserMesh(1);
        mesh.position.set(this.playerX + offsetX, pY, pZ);
        this.scene.add(mesh);
        this.bullets.push({
          id: Math.random(),
          isPlayer: true,
          x: this.playerX + offsetX,
          y: pY,
          z: pZ,
          vx: 0,
          vz: -speed,
          damage: 28,
          mesh,
          radius: 0.35,
        });
      });
    } else if (lvl === 2) {
      // 4-way: 2 central heavy + 2 angled
      [-0.45, 0.45].forEach((offsetX) => {
        const mesh = createPlayerLaserMesh(2);
        mesh.position.set(this.playerX + offsetX, pY, pZ);
        this.scene.add(mesh);
        this.bullets.push({
          id: Math.random(),
          isPlayer: true,
          x: this.playerX + offsetX,
          y: pY,
          z: pZ,
          vx: 0,
          vz: -speed,
          damage: 32,
          mesh,
          radius: 0.38,
        });
      });

      // Angled side lasers
      [-1, 1].forEach((dir) => {
        const mesh = createPlayerLaserMesh(1);
        mesh.position.set(this.playerX + dir * 1.6, pY, pZ);
        mesh.rotation.y = -dir * 0.14;
        this.scene.add(mesh);
        this.bullets.push({
          id: Math.random(),
          isPlayer: true,
          x: this.playerX + dir * 1.6,
          y: pY,
          z: pZ,
          vx: dir * 7.5,
          vz: -speed * 0.98,
          damage: 22,
          mesh,
          radius: 0.35,
        });
      });
    } else {
      // Level 3: 5-way spread barrage
      // Central dual heavy
      [-0.35, 0.35].forEach((offsetX) => {
        const mesh = createPlayerLaserMesh(3);
        mesh.position.set(this.playerX + offsetX, pY, pZ);
        this.scene.add(mesh);
        this.bullets.push({
          id: Math.random(),
          isPlayer: true,
          x: this.playerX + offsetX,
          y: pY,
          z: pZ,
          vx: 0,
          vz: -speed,
          damage: 38,
          mesh,
          radius: 0.45,
        });
      });

      // Medium angled pair
      [-1, 1].forEach((dir) => {
        const mesh = createPlayerLaserMesh(2);
        mesh.position.set(this.playerX + dir * 1.2, pY, pZ);
        mesh.rotation.y = -dir * 0.16;
        this.scene.add(mesh);
        this.bullets.push({
          id: Math.random(),
          isPlayer: true,
          x: this.playerX + dir * 1.2,
          y: pY,
          z: pZ,
          vx: dir * 9,
          vz: -speed * 0.96,
          damage: 26,
          mesh,
          radius: 0.4,
        });
      });

      // Wide angled pair
      [-1, 1].forEach((dir) => {
        const mesh = createPlayerLaserMesh(1);
        mesh.position.set(this.playerX + dir * 1.8, pY, pZ + 0.3);
        mesh.rotation.y = -dir * 0.32;
        this.scene.add(mesh);
        this.bullets.push({
          id: Math.random(),
          isPlayer: true,
          x: this.playerX + dir * 1.8,
          y: pY,
          z: pZ + 0.3,
          vx: dir * 17,
          vz: -speed * 0.9,
          damage: 22,
          mesh,
          radius: 0.35,
        });
      });
    }
  }

  // Wave Spawning & Boss Progression
  private updateSpawning(dt: number) {
    if (this.bossEntity) return; // Boss already active

    // Trigger Boss when player clears 25 enemies or achieves high score
    if (this.stats.kills >= 24 || this.stats.score >= 4500) {
      if (this.state !== 'BOSS_WARNING') {
        this.startBossWarning();
      }
      return;
    }

    this.waveTimer -= dt;
    if (this.waveTimer <= 0) {
      this.spawnEnemyWave();
      // Dynamically accelerate waves
      this.waveTimer = Math.max(1.6, 3.4 - this.stats.kills * 0.05);
    }
  }

  private spawnEnemyWave() {
    this.enemySpawnCount++;
    const waveType = this.enemySpawnCount % 4;

    if (waveType === 1) {
      // V-Formation Scouts (3 ships)
      const centerX = (Math.random() - 0.5) * 12;
      [-1.8, 0, 1.8].forEach((offsetX, idx) => {
        const offsetZ = Math.abs(offsetX) * 0.8;
        this.spawnScout(centerX + offsetX, -22 - offsetZ, (Math.random() - 0.5) * 2);
      });
    } else if (waveType === 2) {
      // Gunship in center escorted by 2 scouts
      const x = (Math.random() - 0.5) * 8;
      this.spawnGunship(x, -24);
      this.spawnScout(x - 3.5, -26, 1.5);
      this.spawnScout(x + 3.5, -26, -1.5);
    } else if (waveType === 3) {
      // 2 Interceptors darting across
      this.spawnInterceptor(-8, -22, 5);
      this.spawnInterceptor(8, -22, -5);
    } else {
      // 4 Scouts line sweep
      const startX = Math.random() > 0.5 ? -10 : 10;
      const vx = startX < 0 ? 3.5 : -3.5;
      for (let i = 0; i < 4; i++) {
        setTimeout(() => {
          if (this.state === 'PLAYING') {
            this.spawnScout(startX, -22, vx);
          }
        }, i * 350);
      }
    }
  }

  private spawnScout(x: number, z: number, vx: number) {
    const variant = 8 + Math.floor(Math.random() * 4);
    const mesh = createScoutEnemy(variant);
    mesh.position.set(x, 0, z);
    this.scene.add(mesh);

    this.enemies.push({
      id: Math.random(),
      kind: 'scout',
      hp: 35,
      maxHp: 35,
      x,
      y: 0,
      z,
      vx,
      vz: 9 + Math.random() * 3,
      width: 1.8,
      length: 2.0,
      shootCooldown: 1.0 + Math.random() * 1.5,
      scoreValue: 120,
      mesh,
      timeAlive: 0,
      colorFlashTimer: 0,
      behaviorTimer: 0,
    });
  }

  private spawnGunship(x: number, z: number) {
    const variant = Math.random() > 0.5 ? 14 : 16;
    const mesh = createGunshipEnemy(variant);
    mesh.position.set(x, 0, z);
    this.scene.add(mesh);

    this.enemies.push({
      id: Math.random(),
      kind: 'gunship',
      hp: 190,
      maxHp: 190,
      x,
      y: 0,
      z,
      vx: (Math.random() - 0.5) * 3,
      vz: 5.5,
      width: 3.2,
      length: 2.8,
      shootCooldown: 1.2,
      scoreValue: 500,
      mesh,
      timeAlive: 0,
      colorFlashTimer: 0,
      behaviorTimer: 0,
    });
  }

  private spawnInterceptor(x: number, z: number, vx: number) {
    const variant = Math.random() > 0.5 ? 4 : 6;
    const mesh = createInterceptorEnemy(variant);
    mesh.position.set(x, 0, z);
    this.scene.add(mesh);

    this.enemies.push({
      id: Math.random(),
      kind: 'interceptor',
      hp: 60,
      maxHp: 60,
      x,
      y: 0,
      z,
      vx,
      vz: 14,
      width: 2.4,
      length: 2.2,
      shootCooldown: 0.6,
      scoreValue: 240,
      mesh,
      timeAlive: 0,
      colorFlashTimer: 0,
      behaviorTimer: 0,
    });
  }

  // Boss Warning & Spawning
  private startBossWarning() {
    this.state = 'BOSS_WARNING';
    this.onStateChange?.(this.state);
    audio.playWarningSiren();
    this.onScreenFlash?.('rgba(239, 68, 68, 0.45)');
    this.applyScreenShake(0.6);

    this.bossWarningTimer = 3.6; // 3.6 seconds warning screen
  }

  private spawnBoss() {
    const { group, core, turretL, turretR } = createBossBattleship(21);
    group.position.set(0, 0, -28);
    this.scene.add(group);

    this.bossCoreMesh = core;
    this.bossTurretL = turretL;
    this.bossTurretR = turretR;

    this.bossEntity = {
      id: 9999,
      kind: 'boss',
      hp: 1200,
      maxHp: 1200,
      x: 0,
      y: 0,
      z: -28,
      vx: 0,
      vz: 4.5, // Enters the screen
      width: 12.0,
      length: 7.0,
      shootCooldown: 2.0,
      scoreValue: 12000,
      mesh: group,
      phase: 1,
      timeAlive: 0,
      colorFlashTimer: 0,
      behaviorTimer: 0,
    };

    this.state = 'PLAYING';
    this.onStateChange?.(this.state);
    this.updateBossHpUI();
  }

  private updateBossHpUI() {
    if (this.bossEntity) {
      const isRage = this.bossEntity.hp <= this.bossEntity.maxHp * 0.5;
      this.onBossHpChange?.(Math.max(0, this.bossEntity.hp), this.bossEntity.maxHp, isRage);
    }
  }

  // Update Enemies & Boss
  private updateEnemies(dt: number) {
    // If waiting for warning to finish
    if (this.state === 'BOSS_WARNING') {
      this.bossWarningTimer -= dt;
      if (this.bossWarningTimer <= 0) {
        this.spawnBoss();
      }
    }

    // Update Boss if present
    if (this.bossEntity) {
      this.updateBossAI(this.bossEntity, dt);
    }

    // Update regular enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      enemy.timeAlive += dt;
      enemy.shootCooldown -= dt;

      // Behavior by type
      if (enemy.kind === 'scout') {
        // Sinusoidal flight path
        enemy.x += Math.sin(enemy.timeAlive * 3.2) * 4.5 * dt + enemy.vx * dt;
        enemy.z += enemy.vz * dt;
        enemy.mesh.rotation.z = -Math.cos(enemy.timeAlive * 3.2) * 0.25;

        // Shoot aimed bullet at player
        if (enemy.shootCooldown <= 0 && enemy.z > -16 && enemy.z < 2) {
          enemy.shootCooldown = 2.4;
          this.fireEnemyBulletAimed(enemy.x, enemy.z, 14);
        }
      } else if (enemy.kind === 'gunship') {
        // Hovers around Z = -6 to -4, swivels turret
        if (enemy.z < -5) {
          enemy.z += enemy.vz * dt;
        } else {
          // Strafe left and right
          enemy.x += Math.sin(enemy.timeAlive * 1.5) * 5.0 * dt;
          enemy.z += Math.sin(enemy.timeAlive * 0.8) * 1.0 * dt;
        }

        // Swivel dorsal turret towards player
        const turret = enemy.mesh.getObjectByName('turret');
        if (turret) {
          const angle = Math.atan2(this.playerX - enemy.x, this.playerZ - enemy.z);
          turret.rotation.y = angle;
        }

        // 3-way aimed bullet fan
        if (enemy.shootCooldown <= 0 && enemy.z > -12 && enemy.z < 6) {
          enemy.shootCooldown = 1.9;
          this.fireEnemySpread3(enemy.x, enemy.z + 1.2, 12);
        }
      } else if (enemy.kind === 'interceptor') {
        // Fast diagonal dive
        enemy.x += enemy.vx * dt;
        enemy.z += enemy.vz * dt;
        if (enemy.x < -11 || enemy.x > 11) enemy.vx *= -1;

        if (enemy.shootCooldown <= 0 && enemy.z > -14 && enemy.z < 0) {
          enemy.shootCooldown = 1.2;
          this.fireEnemyBulletAimed(enemy.x, enemy.z, 16);
        }
      }

      enemy.mesh.position.set(enemy.x, enemy.y, enemy.z);

      // Hit flash visual reset
      if (enemy.colorFlashTimer > 0) {
        enemy.colorFlashTimer -= dt;
      }

      // Despawn if out of screen bottom
      if (enemy.z > 18) {
        this.scene.remove(enemy.mesh);
        this.enemies.splice(i, 1);
      }
    }
  }

  // Boss AI Pattern
  private updateBossAI(boss: Enemy, dt: number) {
    boss.timeAlive += dt;
    boss.shootCooldown -= dt;
    boss.behaviorTimer += dt;

    // Phase check
    const isRage = boss.hp <= boss.maxHp * 0.5;
    if (isRage && boss.phase === 1) {
      boss.phase = 2;
      audio.playWarningSiren();
      this.onScreenFlash?.('rgba(239, 68, 68, 0.6)');
      this.applyScreenShake(0.7);
    }

    // Core pulsing & rage glow
    if (this.bossCoreMesh) {
      const pulseSpeed = isRage ? 16 : 6;
      const scale = 1.0 + Math.sin(boss.timeAlive * pulseSpeed) * 0.18;
      this.bossCoreMesh.scale.set(scale, scale, scale);
    }

    // Entry movement
    if (boss.z < -8) {
      boss.z += boss.vz * dt;
    } else {
      // Phase 1 / Phase 2 Movement Patterns
      const strafeSpeed = isRage ? 2.2 : 1.3;
      boss.x = Math.sin(boss.timeAlive * strafeSpeed) * 6.5;
      boss.z = -8 + Math.cos(boss.timeAlive * 0.8) * 1.5;
    }

    boss.mesh.position.set(boss.x, boss.y, boss.z);

    // Aim turrets at player
    if (this.bossTurretL && this.bossTurretR) {
      const angleL = Math.atan2(this.playerX - (boss.x - 3.6), this.playerZ - boss.z);
      const angleR = Math.atan2(this.playerX - (boss.x + 3.6), this.playerZ - boss.z);
      this.bossTurretL.rotation.y = angleL;
      this.bossTurretR.rotation.y = angleR;
    }

    // Engine thruster effects
    this.particles.createThrusterSparks(boss.x - 3.8, 0, boss.z - 3.8, true);
    this.particles.createThrusterSparks(boss.x + 3.8, 0, boss.z - 3.8, true);

    // Boss Firing Patterns
    if (boss.z >= -9 && boss.shootCooldown <= 0) {
      if (!isRage) {
        // Phase 1: 5-way spread fan + dual cannon blasts
        boss.shootCooldown = 1.8;
        this.fireEnemySpread5(boss.x, boss.z + 3.5, 12);
        // Heavy wing turrets
        setTimeout(() => {
          if (this.bossEntity) {
            this.fireEnemyBulletAimed(boss.x - 3.6, boss.z + 1.5, 15);
            this.fireEnemyBulletAimed(boss.x + 3.6, boss.z + 1.5, 15);
          }
        }, 300);
      } else {
        // Phase 2 (RAGE MODE): 360-degree rotating bullet spirals + rapid homing bursts!
        boss.shootCooldown = 1.35;
        this.fireBossRadialBurst(boss.x, boss.z + 1.4, boss.timeAlive * 4.0);

        // Targeted homing missile bursts
        setTimeout(() => {
          if (this.bossEntity) {
            this.fireEnemySpread3(boss.x - 3.6, boss.z + 1.5, 16);
            this.fireEnemySpread3(boss.x + 3.6, boss.z + 1.5, 16);
          }
        }, 400);
      }
    }
  }

  // Bullet Spawning Helpers
  private fireEnemyBulletAimed(startX: number, startZ: number, speed: number) {
    audio.playEnemyLaser();
    const dx = this.playerX - startX;
    const dz = this.playerZ - startZ;
    const len = Math.sqrt(dx * dx + dz * dz) || 1;

    const mesh = createEnemyBulletMesh();
    mesh.position.set(startX, 0.1, startZ);
    this.scene.add(mesh);

    this.bullets.push({
      id: Math.random(),
      isPlayer: false,
      x: startX,
      y: 0.1,
      z: startZ,
      vx: (dx / len) * speed,
      vz: (dz / len) * speed,
      damage: 1,
      mesh,
      radius: 0.3,
    });
  }

  private fireEnemySpread3(startX: number, startZ: number, speed: number) {
    audio.playEnemyLaser();
    const baseAngle = Math.atan2(this.playerX - startX, this.playerZ - startZ);
    [-0.32, 0, 0.32].forEach((offsetAngle) => {
      const angle = baseAngle + offsetAngle;
      const mesh = createEnemyBulletMesh();
      mesh.position.set(startX, 0.1, startZ);
      this.scene.add(mesh);

      this.bullets.push({
        id: Math.random(),
        isPlayer: false,
        x: startX,
        y: 0.1,
        z: startZ,
        vx: Math.sin(angle) * speed,
        vz: Math.cos(angle) * speed,
        damage: 1,
        mesh,
        radius: 0.3,
      });
    });
  }

  private fireEnemySpread5(startX: number, startZ: number, speed: number) {
    audio.playEnemyLaser();
    const baseAngle = Math.atan2(this.playerX - startX, this.playerZ - startZ);
    [-0.45, -0.22, 0, 0.22, 0.45].forEach((offsetAngle) => {
      const angle = baseAngle + offsetAngle;
      const mesh = createEnemyBulletMesh();
      mesh.position.set(startX, 0.1, startZ);
      this.scene.add(mesh);

      this.bullets.push({
        id: Math.random(),
        isPlayer: false,
        x: startX,
        y: 0.1,
        z: startZ,
        vx: Math.sin(angle) * speed,
        vz: Math.cos(angle) * speed,
        damage: 1,
        mesh,
        radius: 0.32,
      });
    });
  }

  private fireBossRadialBurst(startX: number, startZ: number, rotationOffset: number) {
    audio.playEnemyLaser();
    const bulletCount = 14;
    for (let i = 0; i < bulletCount; i++) {
      const angle = (i / bulletCount) * Math.PI * 2 + rotationOffset;
      const speed = 11;
      const mesh = createEnemyBulletMesh();
      mesh.position.set(startX, 0.1, startZ);
      this.scene.add(mesh);

      this.bullets.push({
        id: Math.random(),
        isPlayer: false,
        x: startX,
        y: 0.1,
        z: startZ,
        vx: Math.sin(angle) * speed,
        vz: Math.cos(angle) * speed,
        damage: 1,
        mesh,
        radius: 0.3,
      });
    }
  }

  // Update Projectiles
  private updateBullets(dt: number) {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.x += b.vx * dt;
      b.z += b.vz * dt;
      b.mesh.position.set(b.x, b.y, b.z);

      // Boundaries
      if (b.z < -30 || b.z > 20 || b.x < -18 || b.x > 18) {
        this.scene.remove(b.mesh);
        b.mesh.geometry.dispose();
        this.bullets.splice(i, 1);
      }
    }
  }

  // Update Pickups
  private updatePickups(dt: number) {
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      p.z += p.vz * dt;

      // Magnet attraction towards player if within 4.5 units
      const dx = this.playerX - p.x;
      const dz = this.playerZ - p.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < 5.0) {
        p.x += (dx / dist) * 12 * dt;
        p.z += (dz / dist) * 12 * dt;
      }

      p.mesh.position.set(p.x, p.y, p.z);
      p.mesh.rotation.y += p.rotationSpeed * dt;
      p.mesh.rotation.x += p.rotationSpeed * 0.5 * dt;

      // Collect pickup
      if (dist < 1.4) {
        this.collectPickup(p.kind);
        this.particles.createExplosion(p.x, p.y, p.z, false, 0x38bdf8);
        this.scene.remove(p.mesh);
        this.pickups.splice(i, 1);
        continue;
      }

      // Despawn out of bottom
      if (p.z > 18) {
        this.scene.remove(p.mesh);
        this.pickups.splice(i, 1);
      }
    }
  }

  private collectPickup(kind: PickupKind) {
    audio.playPickup(kind);

    if (kind === 'power') {
      if (this.stats.weaponLevel < 3) {
        this.stats.weaponLevel = (this.stats.weaponLevel + 1) as 1 | 2 | 3;
        this.onScreenFlash?.('rgba(6, 182, 212, 0.4)');
      } else {
        this.stats.score += 1000; // Bonus for max level
      }
    } else if (kind === 'bomb') {
      this.stats.bombs = Math.min(this.stats.bombs + 1, 5);
      this.onScreenFlash?.('rgba(249, 115, 22, 0.4)');
    } else if (kind === 'heart') {
      if (this.stats.lives < this.stats.maxLives) {
        this.stats.lives++;
        this.onScreenFlash?.('rgba(236, 72, 153, 0.4)');
      } else {
        this.stats.score += 1500;
      }
    } else if (kind === 'medal') {
      this.stats.score += 500;
      this.onScreenFlash?.('rgba(250, 204, 21, 0.35)');
    }

    this.notifyStats();
  }

  // Collisions
  private checkCollisions() {
    // 1. Player Bullets vs Enemies & Boss
    for (let bi = this.bullets.length - 1; bi >= 0; bi--) {
      const b = this.bullets[bi];
      if (!b.isPlayer) continue;

      let bulletHit = false;

      // Check vs Regular Enemies
      for (let ei = this.enemies.length - 1; ei >= 0; ei--) {
        const enemy = this.enemies[ei];
        const dx = Math.abs(b.x - enemy.x);
        const dz = Math.abs(b.z - enemy.z);

        if (dx < enemy.width * 0.5 + b.radius && dz < enemy.length * 0.5 + b.radius) {
          bulletHit = true;
          enemy.hp -= b.damage;
          enemy.colorFlashTimer = 0.08;

          // Spark particle
          this.particles.createExplosion(b.x, b.y, b.z, false, 0xfacc15);

          if (enemy.hp <= 0) {
            this.destroyEnemy(enemy, ei);
          }
          break;
        }
      }

      // Check vs Boss
      if (!bulletHit && this.bossEntity && this.bossEntity.hp > 0) {
        const dx = Math.abs(b.x - this.bossEntity.x);
        const dz = Math.abs(b.z - this.bossEntity.z);

        if (dx < this.bossEntity.width * 0.5 + b.radius && dz < this.bossEntity.length * 0.5 + b.radius) {
          bulletHit = true;
          this.bossEntity.hp -= b.damage;
          this.bossEntity.colorFlashTimer = 0.08;
          this.particles.createExplosion(b.x, b.y, b.z, false, 0xff0044);

          this.updateBossHpUI();

          if (this.bossEntity.hp <= 0) {
            this.triggerBossDefeat();
          }
        }
      }

      if (bulletHit) {
        this.scene.remove(b.mesh);
        b.mesh.geometry.dispose();
        this.bullets.splice(bi, 1);
      }
    }

    // 2. Enemy Bullets vs Player
    if (this.stats.invulnerableTime <= 0) {
      for (let bi = this.bullets.length - 1; bi >= 0; bi--) {
        const b = this.bullets[bi];
        if (b.isPlayer) continue;

        const dx = Math.abs(b.x - this.playerX);
        const dz = Math.abs(b.z - this.playerZ);

        if (dx < 0.65 && dz < 0.85) {
          this.scene.remove(b.mesh);
          b.mesh.geometry.dispose();
          this.bullets.splice(bi, 1);
          this.hitPlayer();
          break;
        }
      }

      // 3. Enemy Body vs Player Body Collision
      for (let ei = this.enemies.length - 1; ei >= 0; ei--) {
        const enemy = this.enemies[ei];
        const dx = Math.abs(enemy.x - this.playerX);
        const dz = Math.abs(enemy.z - this.playerZ);

        if (dx < (enemy.width * 0.4 + 0.6) && dz < (enemy.length * 0.4 + 0.8)) {
          this.destroyEnemy(enemy, ei);
          this.hitPlayer();
          break;
        }
      }
    }
  }

  private hitPlayer() {
    this.stats.lives--;
    this.stats.weaponLevel = Math.max(1, this.stats.weaponLevel - 1) as 1 | 2 | 3;
    this.stats.invulnerableTime = 1.6; // 1.6 seconds invulnerability
    this.notifyStats();

    audio.playPlayerHurt();
    audio.playExplosion('medium');
    this.particles.createExplosion(this.playerX, 0, this.playerZ, true, 0xef4444);
    this.onScreenFlash?.('rgba(239, 68, 68, 0.7)');
    this.applyScreenShake(0.75);

    if (this.stats.lives <= 0) {
      this.triggerGameOver();
    }
  }

  private destroyEnemy(enemy: Enemy, index: number) {
    this.stats.kills++;
    this.stats.score += enemy.scoreValue;
    this.notifyStats();

    const isLarge = enemy.kind === 'gunship';
    audio.playExplosion(isLarge ? 'medium' : 'small');
    this.particles.createExplosion(enemy.x, enemy.y, enemy.z, isLarge);
    this.applyScreenShake(isLarge ? 0.35 : 0.15);

    // Roll for Pickup drop
    const dropRoll = Math.random();
    if (dropRoll < 0.45) {
      let kind: PickupKind = 'power';
      if (dropRoll < 0.20) kind = 'power';
      else if (dropRoll < 0.30) kind = 'bomb';
      else if (dropRoll < 0.38) kind = 'heart';
      else kind = 'medal';

      this.spawnPickup(enemy.x, enemy.z, kind);
    }

    this.scene.remove(enemy.mesh);
    this.enemies.splice(index, 1);
  }

  private spawnPickup(x: number, z: number, kind: PickupKind) {
    const mesh = createPickupMesh(kind);
    mesh.position.set(x, 0.2, z);
    this.scene.add(mesh);

    this.pickups.push({
      id: Math.random(),
      kind,
      x,
      y: 0.2,
      z,
      vz: 4.5, // Floats downwards gently
      mesh,
      rotationSpeed: 3.5,
    });
  }

  // Boss Defeat Sequence
  private triggerBossDefeat() {
    if (!this.bossEntity) return;

    this.stats.score += this.bossEntity.scoreValue;
    this.notifyStats();

    audio.playExplosion('boss');
    this.applyScreenShake(1.0);
    this.onScreenFlash?.('rgba(255, 255, 255, 0.95)');

    // Queue 14 chain explosions across boss hull for dramatic arcade finale
    const b = this.bossEntity;
    for (let i = 0; i < 14; i++) {
      this.bossExplosionQueue.push({
        time: i * 0.15,
        x: b.x + (Math.random() - 0.5) * 8.0,
        y: (Math.random() - 0.5) * 1.5,
        z: b.z + (Math.random() - 0.5) * 6.0,
      });
    }

    // After chain explosions, grand finale
    setTimeout(() => {
      if (this.bossEntity) {
        this.particles.createExplosion(this.bossEntity.x, 0, this.bossEntity.z, true);
        this.scene.remove(this.bossEntity.mesh);
        this.bossEntity = null;
      }
      // Victory state
      this.state = 'VICTORY';
      this.onStateChange?.(this.state);
      audio.playVictory();
    }, 2200);
  }

  private updateBossExplosionQueue(dt: number) {
    if (this.bossExplosionQueue.length === 0) return;
    for (let i = this.bossExplosionQueue.length - 1; i >= 0; i--) {
      const exp = this.bossExplosionQueue[i];
      exp.time -= dt;
      if (exp.time <= 0) {
        audio.playExplosion('medium');
        this.particles.createExplosion(exp.x, exp.y, exp.z, true);
        this.applyScreenShake(0.4);
        this.bossExplosionQueue.splice(i, 1);
      }
    }
  }

  private triggerGameOver() {
    this.state = 'GAMEOVER';
    this.onStateChange?.(this.state);
    if (this.playerGroup) {
      this.playerGroup.visible = false;
    }
  }

  // Scrolling Atmosphere & Parallax
  private updateAtmosphere(dt: number) {
    // Water plane wave shimmer
    if (this.waterPlane) {
      this.waterPlane.position.z += 12 * dt;
      if (this.waterPlane.position.z > 20) {
        this.waterPlane.position.z = -20;
      }
    }

    // Scroll Islands
    this.islands.forEach((isl) => {
      isl.position.z += 12 * dt;
      if (isl.position.z > 35) {
        isl.position.z = -55 - Math.random() * 20;
        isl.position.x = (Math.random() - 0.5) * 36;
      }
    });

    // Scroll Clouds (fast parallax speed)
    this.clouds.forEach((cloud) => {
      cloud.position.z += 22 * dt;
      if (cloud.position.z > 35) {
        cloud.position.z = -65 - Math.random() * 20;
        cloud.position.x = (Math.random() - 0.5) * 44;
      }
    });
  }

  // Camera Follow & Shake
  private updateCamera(dt: number) {
    // Screen shake decay
    let shakeX = 0;
    let shakeY = 0;
    if (this.shakeIntensity > 0) {
      shakeX = (Math.random() - 0.5) * this.shakeIntensity * 1.8;
      shakeY = (Math.random() - 0.5) * this.shakeIntensity * 1.8;
      this.shakeIntensity = Math.max(0, this.shakeIntensity - dt * 2.2);
    }

    // Dynamic camera chase cam (subtly lerps X tracking the player)
    const targetCamX = this.playerX * 0.28 + shakeX;
    this.camera.position.x += (targetCamX - this.camera.position.x) * 6 * dt;
    this.camera.position.y = this.cameraBaseY + shakeY;
    this.camera.position.z = this.cameraBaseZ;

    // Look slightly ahead of player
    this.camera.lookAt(this.camera.position.x * 0.5, 0, this.playerZ - 8);
  }

  private notifyStats() {
    if (this.stats.score > this.stats.highScore) {
      this.stats.highScore = this.stats.score;
      localStorage.setItem('sky_striker_high_score', this.stats.highScore.toString());
    }
    this.onStatsChange?.({ ...this.stats });
  }

  private clearEntities() {
    this.enemies.forEach((e) => this.scene.remove(e.mesh));
    this.enemies = [];

    this.bullets.forEach((b) => {
      this.scene.remove(b.mesh);
      b.mesh.geometry.dispose();
    });
    this.bullets = [];

    this.pickups.forEach((p) => this.scene.remove(p.mesh));
    this.pickups = [];

    if (this.bossEntity) {
      this.scene.remove(this.bossEntity.mesh);
      this.bossEntity = null;
    }

    this.particles.clear();
    this.bossExplosionQueue = [];
  }

  public destroy() {
    this.isDestroyed = true;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
    }
    this.unbindEvents();
    this.clearEntities();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
    audio.cleanup();
  }
}
