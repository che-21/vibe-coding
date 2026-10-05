import * as THREE from 'three';

export type GameState = 'START' | 'PLAYING' | 'PAUSED' | 'BOSS_WARNING' | 'GAMEOVER' | 'VICTORY';

export type WeaponLevel = 1 | 2 | 3;

export interface PlayerStats {
  lives: number;
  maxLives: number;
  bombs: number;
  score: number;
  highScore: number;
  weaponLevel: WeaponLevel;
  invulnerableTime: number; // seconds remaining
  kills: number;
}

export type EnemyKind = 'scout' | 'gunship' | 'interceptor' | 'boss';

export interface Enemy {
  id: number;
  kind: EnemyKind;
  hp: number;
  maxHp: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  width: number;
  length: number;
  shootCooldown: number;
  scoreValue: number;
  mesh: THREE.Group;
  phase?: number;
  timeAlive: number;
  colorFlashTimer: number;
  behaviorTimer: number;
}

export interface Bullet {
  id: number;
  isPlayer: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  damage: number;
  mesh: THREE.Mesh;
  radius: number;
}

export type PickupKind = 'power' | 'bomb' | 'heart' | 'medal';

export interface PickupItem {
  id: number;
  kind: PickupKind;
  x: number;
  y: number;
  z: number;
  vz: number;
  mesh: THREE.Group;
  rotationSpeed: number;
}

export interface Particle {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  scaleStart: number;
  colorStart: THREE.Color;
}

export interface Shockwave {
  mesh: THREE.Mesh;
  radius: number;
  maxRadius: number;
  growthSpeed: number;
  opacity: number;
}

export interface GameSettings {
  soundEnabled: boolean;
  musicEnabled: boolean;
  crtEnabled: boolean;
}
