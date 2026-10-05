// Web Audio API Retro Sound Effects & Chiptune Synthesizer
import { PickupKind } from './types';

class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private isMusicPlaying = false;
  private musicTimer: number | null = null;
  private musicStep = 0;
  private soundEnabled = true;
  private musicEnabled = true;

  constructor() {
    // Initialized lazily on first user interaction to comply with browser autoplay policies
  }

  private initContext() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return;
    }
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.setValueAtTime(0.65, this.ctx.currentTime);
    this.sfxGain.connect(this.masterGain);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
    this.musicGain.connect(this.masterGain);

    // Create 1 second white noise buffer for explosions
    const bufferSize = this.ctx.sampleRate;
    this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
  }

  public setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setValueAtTime(enabled ? 0.65 : 0, this.ctx.currentTime);
    }
  }

  public setMusicEnabled(enabled: boolean) {
    this.musicEnabled = enabled;
    if (!enabled) {
      this.stopMusic();
    } else if (this.isMusicPlaying) {
      if (this.musicGain && this.ctx) {
        this.musicGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
      }
    }
  }

  public startAudio() {
    this.initContext();
  }

  // Laser pew pew
  public playLaser(level: number = 1) {
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = level === 3 ? 'sawtooth' : 'square';
    const startFreq = level === 1 ? 840 : level === 2 ? 960 : 1100;
    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(140, t + 0.12);

    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.12);
  }

  // Enemy bullet shot
  public playEnemyLaser() {
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(450, t);
    osc.frequency.exponentialRampToValueAtTime(180, t + 0.1);

    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.1);
  }

  // Explosion sound with noise & low rumble
  public playExplosion(kind: 'small' | 'medium' | 'boss' = 'small') {
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain || !this.noiseBuffer) return;

    const t = this.ctx.currentTime;
    const duration = kind === 'boss' ? 1.6 : kind === 'medium' ? 0.7 : 0.4;
    const peakVolume = kind === 'boss' ? 0.7 : kind === 'medium' ? 0.45 : 0.28;

    // Noise component
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    const startCutoff = kind === 'boss' ? 600 : kind === 'medium' ? 1000 : 1400;
    filter.frequency.setValueAtTime(startCutoff, t);
    filter.frequency.exponentialRampToValueAtTime(40, t + duration);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(peakVolume, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);

    noise.start(t);
    noise.stop(t + duration);

    // Bass punch
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(kind === 'boss' ? 120 : 160, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + (duration * 0.8));

    oscGain.gain.setValueAtTime(peakVolume * 0.9, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + (duration * 0.8));

    osc.connect(oscGain);
    oscGain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + (duration * 0.8));
  }

  // Mega Bomb sound: shockwave sweep + low rumble + crash
  public playBomb() {
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain || !this.noiseBuffer) return;

    const t = this.ctx.currentTime;
    const duration = 2.0;

    // Sub-bass sweep
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sawtooth';
    subOsc.frequency.setValueAtTime(140, t);
    subOsc.frequency.exponentialRampToValueAtTime(20, t + 1.2);

    const subFilter = this.ctx.createBiquadFilter();
    subFilter.type = 'lowpass';
    subFilter.frequency.setValueAtTime(350, t);
    subFilter.frequency.exponentialRampToValueAtTime(40, t + 1.5);

    subGain.gain.setValueAtTime(0.7, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    subOsc.connect(subFilter);
    subFilter.connect(subGain);
    subGain.connect(this.sfxGain);

    subOsc.start(t);
    subOsc.stop(t + duration);

    // Shockwave crash noise
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(400, t);
    noiseFilter.Q.setValueAtTime(1.5, t);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.55, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 1.8);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);

    noise.start(t);
    noise.stop(t + 1.8);
  }

  // Item pickup chimes
  public playPickup(kind: PickupKind) {
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const notes = kind === 'power'
      ? [330, 440, 554, 660, 880] // A major triad upward
      : kind === 'bomb'
      ? [261, 329, 392, 523, 659] // C major triumphant
      : kind === 'heart'
      ? [440, 554, 659, 880]      // Healing chord
      : [523, 659, 784, 1046];    // Medal sparkle

    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const t = this.ctx.currentTime + idx * 0.045;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.2);
    });
  }

  // Player hurt buzz
  public playPlayerHurt() {
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.35);

    gain.gain.setValueAtTime(0.45, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.35);
  }

  // Warning siren for boss encounter
  public playWarningSiren() {
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    for (let cycle = 0; cycle < 3; cycle++) {
      const t = this.ctx.currentTime + cycle * 0.6;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(740, t);
      osc.frequency.linearRampToValueAtTime(490, t + 0.28);
      osc.frequency.linearRampToValueAtTime(740, t + 0.55);

      gain.gain.setValueAtTime(0.28, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.58);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.58);
    }
  }

  // Victory fanfare
  public playVictory() {
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const notes = [
      { f: 523.25, d: 0.15, wait: 0 },
      { f: 523.25, d: 0.15, wait: 0.16 },
      { f: 523.25, d: 0.15, wait: 0.32 },
      { f: 659.25, d: 0.35, wait: 0.48 },
      { f: 587.33, d: 0.18, wait: 0.85 },
      { f: 659.25, d: 0.18, wait: 1.05 },
      { f: 783.99, d: 0.6, wait: 1.25 },
    ];

    notes.forEach((n) => {
      if (!this.ctx || !this.sfxGain) return;
      const t = this.ctx.currentTime + n.wait;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(n.f, t);

      gain.gain.setValueAtTime(0.28, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + n.d);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + n.d);
    });
  }

  // Retro Chiptune BGM Loop
  public startMusic() {
    if (this.isMusicPlaying || !this.musicEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    this.isMusicPlaying = true;
    this.musicStep = 0;

    // Bassline and lead patterns in D minor (classic 90s shoot 'em up energy)
    const bassNotes = [146.83, 146.83, 174.61, 164.81, 130.81, 130.81, 146.83, 110.0];
    const leadNotes = [293.66, 349.23, 440.0, 523.25, 440.0, 392.0, 349.23, 293.66, 440.0, 587.33];

    const stepInterval = 140; // ~107 BPM 16th notes
    this.musicTimer = window.setInterval(() => {
      if (!this.ctx || !this.musicGain || !this.musicEnabled || !this.isMusicPlaying) return;

      const t = this.ctx.currentTime;
      const bassNote = bassNotes[Math.floor(this.musicStep / 2) % bassNotes.length];
      const leadNote = leadNotes[this.musicStep % leadNotes.length];

      // Bass synth note
      if (this.musicStep % 2 === 0) {
        const bassOsc = this.ctx.createOscillator();
        const bassFilter = this.ctx.createBiquadFilter();
        const bGain = this.ctx.createGain();

        bassOsc.type = 'sawtooth';
        bassOsc.frequency.setValueAtTime(bassNote / 2, t);

        bassFilter.type = 'lowpass';
        bassFilter.frequency.setValueAtTime(600, t);
        bassFilter.frequency.exponentialRampToValueAtTime(100, t + 0.22);

        bGain.gain.setValueAtTime(0.18, t);
        bGain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

        bassOsc.connect(bassFilter);
        bassFilter.connect(bGain);
        bGain.connect(this.musicGain);

        bassOsc.start(t);
        bassOsc.stop(t + 0.22);
      }

      // Arpeggio / melody note
      if (this.musicStep % 2 === 1 || this.musicStep % 4 === 0) {
        const leadOsc = this.ctx.createOscillator();
        const lGain = this.ctx.createGain();

        leadOsc.type = 'square';
        leadOsc.frequency.setValueAtTime(leadNote, t);

        lGain.gain.setValueAtTime(0.08, t);
        lGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

        leadOsc.connect(lGain);
        lGain.connect(this.musicGain);

        leadOsc.start(t);
        leadOsc.stop(t + 0.12);
      }

      this.musicStep++;
    }, stepInterval);
  }

  public stopMusic() {
    this.isMusicPlaying = false;
    if (this.musicTimer !== null) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  public cleanup() {
    this.stopMusic();
    if (this.ctx && this.ctx.state !== 'closed') {
      this.ctx.close();
    }
    this.ctx = null;
  }
}

export const audio = new AudioManager();
