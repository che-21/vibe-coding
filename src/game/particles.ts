import * as THREE from 'three';
import { Particle, Shockwave } from './types';

export class ParticleManager {
  private scene: THREE.Scene;
  private particles: Particle[] = [];
  private shockwaves: Shockwave[] = [];
  private sparkGeo = new THREE.BoxGeometry(0.18, 0.18, 0.18);
  private smokeGeo = new THREE.DodecahedronGeometry(0.28, 0);
  private ringGeo = new THREE.TorusGeometry(1, 0.15, 6, 24);

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  // Create high-impact explosion burst
  public createExplosion(x: number, y: number, z: number, isLarge: boolean = false, customColor?: number) {
    const count = isLarge ? 55 : 22;
    const colors = customColor
      ? [customColor, 0xffffff, 0xfacc15]
      : [0xff4422, 0xffaa00, 0xfacc15, 0xef4444, 0xffffff, 0x475569];

    for (let i = 0; i < count; i++) {
      const col = colors[Math.floor(Math.random() * colors.length)];
      const isSmoke = Math.random() > 0.65;
      const mat = new THREE.MeshBasicMaterial({
        color: col,
        transparent: true,
        opacity: 0.95,
      });

      const mesh = new THREE.Mesh(isSmoke ? this.smokeGeo : this.sparkGeo, mat);
      mesh.position.set(
        x + (Math.random() - 0.5) * 0.8,
        y + (Math.random() - 0.5) * 0.8,
        z + (Math.random() - 0.5) * 0.8
      );

      const speed = (isLarge ? 7 : 4) * (0.4 + Math.random() * 0.9);
      const angle = Math.random() * Math.PI * 2;
      const elev = (Math.random() - 0.5) * Math.PI * 0.8;

      const p: Particle = {
        mesh,
        vx: Math.cos(angle) * Math.cos(elev) * speed,
        vy: Math.sin(elev) * speed * 0.8,
        vz: Math.sin(angle) * Math.cos(elev) * speed,
        life: 0,
        maxLife: (isLarge ? 0.9 : 0.55) * (0.6 + Math.random() * 0.5),
        scaleStart: isLarge ? 1.4 : 0.8,
        colorStart: new THREE.Color(col),
      };

      this.scene.add(mesh);
      this.particles.push(p);
    }
  }

  // Mega Bomb Shockwave expanding ring
  public createBombShockwave(x: number, y: number, z: number) {
    const mat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(this.ringGeo, mat);
    mesh.rotation.x = Math.PI / 2;
    mesh.position.set(x, y, z);
    this.scene.add(mesh);

    this.shockwaves.push({
      mesh,
      radius: 1,
      maxRadius: 28,
      growthSpeed: 38,
      opacity: 0.9,
    });

    // Also blast out 80 glowing energetic particles
    for (let i = 0; i < 80; i++) {
      const matP = new THREE.MeshBasicMaterial({
        color: Math.random() > 0.3 ? 0x38bdf8 : 0xffffff,
        transparent: true,
        opacity: 0.95,
      });
      const pMesh = new THREE.Mesh(this.sparkGeo, matP);
      pMesh.position.set(x, y, z);

      const angle = (i / 80) * Math.PI * 2 + (Math.random() - 0.5) * 0.1;
      const speed = 16 + Math.random() * 8;

      this.scene.add(pMesh);
      this.particles.push({
        mesh: pMesh,
        vx: Math.cos(angle) * speed,
        vy: (Math.random() - 0.5) * 2,
        vz: Math.sin(angle) * speed,
        life: 0,
        maxLife: 0.8,
        scaleStart: 1.2,
        colorStart: new THREE.Color(0x38bdf8),
      });
    }
  }

  // Engine thruster spark / smoke trail
  public createThrusterSparks(x: number, y: number, z: number, isBoss: boolean = false) {
    if (Math.random() > 0.4) return;
    const mat = new THREE.MeshBasicMaterial({
      color: isBoss ? 0xef4444 : 0x38bdf8,
      transparent: true,
      opacity: 0.7,
    });
    const mesh = new THREE.Mesh(this.sparkGeo, mat);
    mesh.position.set(
      x + (Math.random() - 0.5) * 0.2,
      y + (Math.random() - 0.5) * 0.2,
      z
    );

    this.scene.add(mesh);
    this.particles.push({
      mesh,
      vx: (Math.random() - 0.5) * 0.8,
      vy: (Math.random() - 0.5) * 0.8,
      vz: 4 + Math.random() * 3, // Drift backwards
      life: 0,
      maxLife: 0.25,
      scaleStart: 0.45,
      colorStart: new THREE.Color(isBoss ? 0xef4444 : 0x38bdf8),
    });
  }

  public update(dt: number) {
    // Update individual debris particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;

      if (p.life >= p.maxLife) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        if (Array.isArray(p.mesh.material)) {
          p.mesh.material.forEach((m: THREE.Material) => m.dispose());
        } else {
          p.mesh.material.dispose();
        }
        this.particles.splice(i, 1);
        continue;
      }

      const progress = p.life / p.maxLife;
      // Movement
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;

      // Slight drag
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.vz *= 0.96;

      // Shrink and fade
      const scale = p.scaleStart * (1 - progress);
      p.mesh.scale.set(scale, scale, scale);
      p.mesh.rotation.x += dt * 5;
      p.mesh.rotation.y += dt * 7;

      const mat = p.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = 1 - progress;
    }

    // Update Shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const s = this.shockwaves[i];
      s.radius += s.growthSpeed * dt;
      s.opacity = Math.max(0, 1 - s.radius / s.maxRadius);

      const scale = s.radius;
      s.mesh.scale.set(scale, scale, scale);

      const mat = s.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = s.opacity;

      if (s.radius >= s.maxRadius || s.opacity <= 0) {
        this.scene.remove(s.mesh);
        s.mesh.geometry.dispose();
        mat.dispose();
        this.shockwaves.splice(i, 1);
      }
    }
  }

  public clear() {
    this.particles.forEach(p => {
      this.scene.remove(p.mesh);
    });
    this.particles = [];
    this.shockwaves.forEach(s => {
      this.scene.remove(s.mesh);
    });
    this.shockwaves = [];
  }
}
