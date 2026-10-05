import * as THREE from 'three';
import { PickupKind } from './types';
import { assets } from './assetManager';

// Base cached materials for 3D trims & lighting
const mats = {
  thrusterFlame: new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.85,
  }),
  thrusterFlameRed: new THREE.MeshBasicMaterial({
    color: 0xef4444,
    transparent: true,
    opacity: 0.85,
  }),
  engineMetal: new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.5,
    metalness: 0.8,
    flatShading: true,
  }),
  canopy: new THREE.MeshPhysicalMaterial({
    color: 0x06b6d4,
    roughness: 0.1,
    metalness: 0.2,
    transmission: 0.8,
    transparent: true,
    opacity: 0.9,
  }),
  bossGlow: new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xff0000,
    emissiveIntensity: 1.4,
    roughness: 0.2,
  }),
  cloudMat: new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.95,
    metalness: 0.05,
    flatShading: true,
    transparent: true,
    opacity: 0.85,
  }),
  islandSand: new THREE.MeshStandardMaterial({
    color: 0xfde047,
    roughness: 0.9,
    flatShading: true,
  }),
  islandGreen: new THREE.MeshStandardMaterial({
    color: 0x15803d,
    roughness: 0.8,
    flatShading: true,
  }),
  islandRock: new THREE.MeshStandardMaterial({
    color: 0x4b5563,
    roughness: 0.8,
    flatShading: true,
  }),
};

// 1. Player Jet Fighter using Kenney Ship Sprites + 3D Chassis
export function createPlayerJet(shipIndex: number = 0): {
  group: THREE.Group;
  leftFlame: THREE.Mesh;
  rightFlame: THREE.Mesh;
  updateSkin: (newIndex: number) => void;
} {
  const jet = new THREE.Group();

  // 3D Chassis Base Plate
  const baseGeo = new THREE.BoxGeometry(2.4, 0.25, 2.5);
  const baseMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.5,
    metalness: 0.7,
    flatShading: true,
  });
  const baseMesh = new THREE.Mesh(baseGeo, baseMat);
  baseMesh.position.set(0, -0.05, 0);
  jet.add(baseMesh);

  // Top Textured Pixel Sprite Plane
  const shipTex = assets.getShipTexture(shipIndex);
  const spriteMat = new THREE.MeshStandardMaterial({
    map: shipTex,
    transparent: true,
    alphaTest: 0.1,
    roughness: 0.35,
    metalness: 0.4,
    emissive: new THREE.Color(0x334455),
    emissiveIntensity: 0.25,
    side: THREE.DoubleSide,
  });

  const spriteGeo = new THREE.PlaneGeometry(3.0, 3.0);
  const spriteMesh = new THREE.Mesh(spriteGeo, spriteMat);
  spriteMesh.rotation.x = -Math.PI / 2;
  spriteMesh.position.set(0, 0.12, 0);
  jet.add(spriteMesh);

  // Cockpit Canopy (Transparent 3D bubble over pixel cockpit)
  const canopyGeo = new THREE.BoxGeometry(0.48, 0.3, 0.8);
  const canopy = new THREE.Mesh(canopyGeo, mats.canopy);
  canopy.position.set(0, 0.28, -0.3);
  canopy.rotation.x = -0.15;
  jet.add(canopy);

  // Twin Wingtip Cannons
  const cannonGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.9, 6);
  [-1.35, 1.35].forEach((x) => {
    const cannon = new THREE.Mesh(cannonGeo, mats.engineMetal);
    cannon.rotation.x = Math.PI / 2;
    cannon.position.set(x, 0.05, -0.2);
    jet.add(cannon);

    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.2, 6), mats.thrusterFlame);
    tip.rotation.x = -Math.PI / 2;
    tip.position.set(x, 0.05, -0.7);
    jet.add(tip);
  });

  // Twin Jet Thruster Nozzles (Cylinders)
  const nozzleGeo = new THREE.CylinderGeometry(0.18, 0.22, 0.45, 8);
  const nozzleL = new THREE.Mesh(nozzleGeo, mats.engineMetal);
  nozzleL.rotation.x = Math.PI / 2;
  nozzleL.position.set(-0.35, 0, 1.25);
  jet.add(nozzleL);

  const nozzleR = new THREE.Mesh(nozzleGeo, mats.engineMetal);
  nozzleR.rotation.x = Math.PI / 2;
  nozzleR.position.set(0.35, 0, 1.25);
  jet.add(nozzleR);

  // Exhaust Flames
  const flameGeo = new THREE.ConeGeometry(0.18, 0.85, 6);
  const leftFlame = new THREE.Mesh(flameGeo, mats.thrusterFlame);
  leftFlame.rotation.x = Math.PI / 2;
  leftFlame.position.set(-0.35, 0, 1.8);
  jet.add(leftFlame);

  const rightFlame = new THREE.Mesh(flameGeo, mats.thrusterFlame);
  rightFlame.rotation.x = Math.PI / 2;
  rightFlame.position.set(0.35, 0, 1.8);
  jet.add(rightFlame);

  // Grounding Shadow Plane
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(1.4, 10),
    new THREE.MeshBasicMaterial({ color: 0x030712, transparent: true, opacity: 0.35 })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(0, -1.8, 0);
  jet.add(shadow);

  const updateSkin = (newIndex: number) => {
    spriteMat.map = assets.getShipTexture(newIndex);
    spriteMat.needsUpdate = true;
  };

  return { group: jet, leftFlame, rightFlame, updateSkin };
}

// 2. Scout Drone Enemy using Kenney Ship #8, 9, 10
export function createScoutEnemy(variant: number = 8): THREE.Group {
  const scout = new THREE.Group();

  // 3D Backing Plate
  const backGeo = new THREE.BoxGeometry(2.0, 0.2, 2.0);
  const backMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5, flatShading: true });
  const backMesh = new THREE.Mesh(backGeo, backMat);
  scout.add(backMesh);

  // Textured Sprite (facing downwards towards player)
  const tex = assets.getShipTexture(variant);
  const spriteMat = new THREE.MeshStandardMaterial({
    map: tex,
    transparent: true,
    alphaTest: 0.1,
    roughness: 0.4,
    metalness: 0.5,
    emissive: new THREE.Color(0xef4444),
    emissiveIntensity: 0.3,
    side: THREE.DoubleSide,
  });

  const sprite = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4), spriteMat);
  sprite.rotation.x = Math.PI / 2; // Facing top
  sprite.rotation.z = Math.PI; // Inverted towards player
  sprite.position.set(0, 0.12, 0);
  scout.add(sprite);

  // Rear Thruster Flame
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.6, 6), mats.thrusterFlameRed);
  flame.rotation.x = -Math.PI / 2;
  flame.position.set(0, 0, -1.2);
  scout.add(flame);

  return scout;
}

// 3. Medium Armored Gunship using Kenney Ship #14, 16 with Rotating 3D Turret
export function createGunshipEnemy(variant: number = 14): THREE.Group {
  const ship = new THREE.Group();

  // Heavy 3D Hull
  const hull = new THREE.Mesh(
    new THREE.BoxGeometry(3.0, 0.6, 3.0),
    new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4, metalness: 0.7, flatShading: true })
  );
  ship.add(hull);

  // Textured Ship Top
  const tex = assets.getShipTexture(variant);
  const spriteMat = new THREE.MeshStandardMaterial({
    map: tex,
    transparent: true,
    alphaTest: 0.1,
    roughness: 0.4,
    metalness: 0.5,
    emissive: new THREE.Color(0xf59e0b),
    emissiveIntensity: 0.25,
    side: THREE.DoubleSide,
  });
  const sprite = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.4), spriteMat);
  sprite.rotation.x = Math.PI / 2;
  sprite.rotation.z = Math.PI;
  sprite.position.set(0, 0.32, 0);
  ship.add(sprite);

  // Rotating Dorsal Turret Base
  const turretBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.65, 0.75, 0.35, 8),
    new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.3, metalness: 0.6, flatShading: true })
  );
  turretBase.position.set(0, 0.55, 0);
  turretBase.name = 'turret';
  ship.add(turretBase);

  // Dual Gun Barrels
  const barrelGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.9, 6);
  [-0.2, 0.2].forEach((x) => {
    const b = new THREE.Mesh(barrelGeo, mats.engineMetal);
    b.rotation.x = Math.PI / 2;
    b.position.set(x, 0.1, 0.5);
    turretBase.add(b);
  });

  // Dual Rear Heavy Thrusters
  [-0.7, 0.7].forEach((x) => {
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.7, 6), mats.thrusterFlameRed);
    flame.rotation.x = -Math.PI / 2;
    flame.position.set(x, 0, -1.8);
    ship.add(flame);
  });

  return ship;
}

// 4. Swift Interceptor using Kenney Ship #4, 6
export function createInterceptorEnemy(variant: number = 4): THREE.Group {
  const raider = new THREE.Group();

  const hull = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 0.18, 2.4),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, flatShading: true })
  );
  raider.add(hull);

  const tex = assets.getShipTexture(variant);
  const spriteMat = new THREE.MeshStandardMaterial({
    map: tex,
    transparent: true,
    alphaTest: 0.1,
    roughness: 0.35,
    emissive: new THREE.Color(0xdc2626),
    emissiveIntensity: 0.3,
    side: THREE.DoubleSide,
  });
  const sprite = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 2.8), spriteMat);
  sprite.rotation.x = Math.PI / 2;
  sprite.rotation.z = Math.PI;
  sprite.position.set(0, 0.12, 0);
  raider.add(sprite);

  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.7, 6), mats.thrusterFlameRed);
  flame.rotation.x = -Math.PI / 2;
  flame.position.set(0, 0, -1.4);
  raider.add(flame);

  return raider;
}

// 5. Massive Boss Battleship (Goliath Dreadnought) using Kenney Ship #21 / #23 + Armored Citadel
export function createBossBattleship(variant: number = 21): {
  group: THREE.Group;
  core: THREE.Mesh;
  turretL: THREE.Group;
  turretR: THREE.Group;
} {
  const boss = new THREE.Group();

  // Central Fortress Hull
  const hullGeo = new THREE.BoxGeometry(6.4, 1.4, 6.8);
  const hullMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4, metalness: 0.8, flatShading: true });
  const hull = new THREE.Mesh(hullGeo, hullMat);
  boss.add(hull);

  // Giant Flagship Sprite on Top Deck
  const tex = assets.getShipTexture(variant);
  const deckMat = new THREE.MeshStandardMaterial({
    map: tex,
    transparent: true,
    alphaTest: 0.1,
    roughness: 0.35,
    metalness: 0.6,
    emissive: new THREE.Color(0xef4444),
    emissiveIntensity: 0.35,
    side: THREE.DoubleSide,
  });
  const deckSprite = new THREE.Mesh(new THREE.PlaneGeometry(7.6, 7.6), deckMat);
  deckSprite.rotation.x = Math.PI / 2;
  deckSprite.rotation.z = Math.PI;
  deckSprite.position.set(0, 0.72, 0);
  boss.add(deckSprite);

  // Armored Command Citadel
  const bridge = new THREE.Mesh(
    new THREE.BoxGeometry(2.6, 1.2, 2.2),
    new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.35, metalness: 0.6, flatShading: true })
  );
  bridge.position.set(0, 1.2, -0.6);
  boss.add(bridge);

  // Glowing Bridge Sensor Visor
  const visor = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.4, 0.4), mats.bossGlow);
  visor.position.set(0, 1.4, 0.5);
  boss.add(visor);

  // Left & Right Armored Wings
  [-4.8, 4.8].forEach((x) => {
    const wing = new THREE.Mesh(
      new THREE.BoxGeometry(4.0, 0.6, 3.4),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.7, flatShading: true })
    );
    wing.position.set(x, -0.1, -0.4);
    boss.add(wing);

    const wingTip = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.7, 3.5),
      new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.3, flatShading: true })
    );
    wingTip.position.set(x > 0 ? x + 2.1 : x - 2.1, -0.1, -0.4);
    boss.add(wingTip);
  });

  // Glowing Reactor Core
  const coreGeo = new THREE.SphereGeometry(0.9, 12, 12);
  const core = new THREE.Mesh(coreGeo, mats.bossGlow);
  core.position.set(0, 0.9, 1.8);
  boss.add(core);

  // Reactor Core Cage
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.12, 6, 16), mats.engineMetal);
  ring.rotation.x = Math.PI / 2;
  ring.position.set(0, 0.9, 1.8);
  boss.add(ring);

  // Heavy Rotating Turrets on Wings
  function makeTurret() {
    const tGroup = new THREE.Group();
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.9, 1.0, 0.5, 8),
      new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.3, metalness: 0.7, flatShading: true })
    );
    tGroup.add(base);

    [-0.35, 0.35].forEach((x) => {
      const cannon = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 2.4, 8), mats.engineMetal);
      cannon.rotation.x = Math.PI / 2;
      cannon.position.set(x, 0.25, 1.2);
      tGroup.add(cannon);
    });
    return tGroup;
  }

  const turretL = makeTurret();
  turretL.position.set(-4.0, 0.5, 0.2);
  boss.add(turretL);

  const turretR = makeTurret();
  turretR.position.set(4.0, 0.5, 0.2);
  boss.add(turretR);

  // 4 Massive Rear Engines with Flames
  [-4.2, -1.8, 1.8, 4.2].forEach((x) => {
    const eng = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.7, 1.3, 8), mats.engineMetal);
    eng.rotation.x = Math.PI / 2;
    eng.position.set(x, 0, -3.6);
    boss.add(eng);

    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.55, 2.0, 6), mats.thrusterFlameRed);
    flame.rotation.x = -Math.PI / 2;
    flame.position.set(x, 0, -4.8);
    boss.add(flame);
  });

  return { group: boss, core, turretL, turretR };
}

// 6. Floating 3D Pickups using Kenney Pixel Art Badges
export function createPickupMesh(kind: PickupKind): THREE.Group {
  const group = new THREE.Group();

  // Map kind to specific Kenney Tile
  let tileIndex = 25; // Default: cyan powerup
  let haloColor = 0x06b6d4;

  if (kind === 'bomb') {
    tileIndex = 24; // Orange bomb tile
    haloColor = 0xf97316;
  } else if (kind === 'heart') {
    tileIndex = 17; // Red heart/health icon
    haloColor = 0xec4899;
  } else if (kind === 'medal') {
    tileIndex = 2; // Gold star / coin
    haloColor = 0xfbbf24;
  }

  // Spinning 3D Crystal Body
  const crystalMat = new THREE.MeshStandardMaterial({
    color: haloColor,
    emissive: haloColor,
    emissiveIntensity: 0.5,
    roughness: 0.2,
    metalness: 0.7,
    flatShading: true,
  });
  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.7, 0), crystalMat);
  group.add(crystal);

  // Pixel Badge Sprite inside Crystal
  const tex = assets.getTileTexture(tileIndex);
  const badgeMat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    alphaTest: 0.1,
    side: THREE.DoubleSide,
  });
  const badge = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), badgeMat);
  group.add(badge);

  // Glowing Outer Halo Ring
  const ringMat = new THREE.MeshBasicMaterial({
    color: haloColor,
    transparent: true,
    opacity: 0.85,
  });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.05, 4, 12), ringMat);
  group.add(ring);

  return group;
}

// 7. Projectile Geometries with Pixel Textures
export function createPlayerLaserMesh(level: number): THREE.Mesh {
  const tileIndex = level === 3 ? 3 : level === 2 ? 1 : 0;
  const tex = assets.getTileTexture(tileIndex);

  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    alphaTest: 0.1,
    side: THREE.DoubleSide,
  });

  const geo = new THREE.PlaneGeometry(0.8, 1.4);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

export function createEnemyBulletMesh(): THREE.Mesh {
  // Uses tile_0004.png or tile_0007.png
  const tex = assets.getTileTexture(4);
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    alphaTest: 0.1,
    side: THREE.DoubleSide,
  });

  const geo = new THREE.PlaneGeometry(0.65, 0.65);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

// 8. Low-Poly Clouds & Islands
export function createCloudCluster(): THREE.Group {
  const cloud = new THREE.Group();
  const puffCount = 5 + Math.floor(Math.random() * 4);
  const geo = new THREE.DodecahedronGeometry(1.2, 1);

  for (let i = 0; i < puffCount; i++) {
    const puff = new THREE.Mesh(geo, mats.cloudMat);
    const s = 0.8 + Math.random() * 1.4;
    puff.scale.set(s * 1.5, s * 0.7, s * 1.2);
    puff.position.set(
      (Math.random() - 0.5) * 3.5,
      (Math.random() - 0.5) * 0.6,
      (Math.random() - 0.5) * 2.5
    );
    cloud.add(puff);
  }

  return cloud;
}

export function createLowPolyIsland(): THREE.Group {
  const island = new THREE.Group();

  const sandGeo = new THREE.CylinderGeometry(3.5, 4.8, 0.6, 7);
  const sand = new THREE.Mesh(sandGeo, mats.islandSand);
  sand.position.set(0, -0.2, 0);
  island.add(sand);

  const peakGeo = new THREE.ConeGeometry(2.4, 2.8, 6);
  const peak = new THREE.Mesh(peakGeo, mats.islandGreen);
  peak.position.set(0.3, 1.1, -0.2);
  island.add(peak);

  const rockGeo = new THREE.ConeGeometry(1.4, 1.8, 5);
  const rock = new THREE.Mesh(rockGeo, mats.islandRock);
  rock.position.set(-1.2, 0.6, 0.8);
  island.add(rock);

  return island;
}

export { mats };
