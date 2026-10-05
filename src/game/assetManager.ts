import * as THREE from 'three';

class AssetManager {
  private textureLoader = new THREE.TextureLoader();
  private shipTextures: Map<string, THREE.Texture> = new Map();
  private tileTextures: Map<string, THREE.Texture> = new Map();
  private fallbackTexture: THREE.Texture;

  constructor() {
    // 1x1 white fallback texture
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 1, 1);
    this.fallbackTexture = new THREE.CanvasTexture(canvas);
  }

  // Load a texture with pixel-perfect filtering
  public loadPixelTexture(path: string): THREE.Texture {
    const tex = this.textureLoader.load(
      path,
      (loaded) => {
        loaded.magFilter = THREE.NearestFilter;
        loaded.minFilter = THREE.NearestFilter;
        loaded.generateMipmaps = false;
        loaded.needsUpdate = true;
      },
      undefined,
      (err) => {
        console.warn('Could not load texture:', path, err);
      }
    );
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
    return tex;
  }

  // Preload essential ships and tiles
  public preloadAll() {
    // Preload ships 0 to 23
    for (let i = 0; i < 24; i++) {
      const id = String(i).padStart(4, '0');
      const key = `ship_${id}`;
      this.shipTextures.set(key, this.loadPixelTexture(`/Ships/${key}.png`));
    }

    // Preload tiles (bullets, explosions, pickups, terrain)
    for (let i = 0; i <= 60; i++) {
      const id = String(i).padStart(4, '0');
      const key = `tile_${id}`;
      this.tileTextures.set(key, this.loadPixelTexture(`/Tiles/${key}.png`));
    }
  }

  public getShipTexture(index: number): THREE.Texture {
    const key = `ship_${String(index).padStart(4, '0')}`;
    return this.shipTextures.get(key) || this.loadPixelTexture(`/Ships/${key}.png`);
  }

  public getTileTexture(index: number): THREE.Texture {
    const key = `tile_${String(index).padStart(4, '0')}`;
    return this.tileTextures.get(key) || this.loadPixelTexture(`/Tiles/${key}.png`);
  }

  // Get material for a ship sprite mapped onto 3D planes
  public createShipMaterial(shipIndex: number, emissiveIntensity: number = 0.2): THREE.MeshStandardMaterial {
    const tex = this.getShipTexture(shipIndex);
    return new THREE.MeshStandardMaterial({
      map: tex,
      transparent: true,
      alphaTest: 0.15,
      roughness: 0.35,
      metalness: 0.5,
      emissive: new THREE.Color(0x222222),
      emissiveIntensity,
      side: THREE.DoubleSide,
    });
  }

  // Get material for a projectile
  public createBulletMaterial(tileIndex: number): THREE.MeshBasicMaterial {
    const tex = this.getTileTexture(tileIndex);
    return new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      alphaTest: 0.1,
      side: THREE.DoubleSide,
    });
  }

  // Get material for a pickup badge
  public createPickupMaterial(tileIndex: number): THREE.MeshBasicMaterial {
    const tex = this.getTileTexture(tileIndex);
    return new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      alphaTest: 0.1,
      side: THREE.DoubleSide,
    });
  }
}

export const assets = new AssetManager();
