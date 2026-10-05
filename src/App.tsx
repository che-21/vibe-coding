/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from './game/gameEngine';
import { GameState, PlayerStats } from './game/types';
import { audio } from './game/audio';
import { getStandaloneHtml } from './game/standaloneHtml';
import { 
  Volume2, VolumeX, Music, Tv, Download, Copy, Check, 
  HelpCircle, RefreshCw, Play, Pause, Trophy, Zap, Shield, Sparkles
} from 'lucide-react';

const SHIPS = [
  {
    id: 0,
    name: 'BLUE INTERCEPTOR',
    role: '기동형 · 밸런스',
    desc: '균형 잡힌 기동성과 안정적인 듀얼 레이저 탄막을 구사하는 범용 전투기',
    speed: '★★★★☆',
    power: '★★★★☆',
    img: '/Ships/ship_0000.png',
    border: 'border-cyan-500',
    color: 'text-cyan-400',
    glow: 'shadow-[0_0_16px_rgba(6,182,212,0.4)]',
  },
  {
    id: 1,
    name: 'CRIMSON STRIKER',
    role: '화력형 · 고화력',
    desc: '강력한 중화포와 집중 공격으로 적 편대를 단숨에 격파하는 돌격 전투기',
    speed: '★★★☆☆',
    power: '★★★★★',
    img: '/Ships/ship_0001.png',
    border: 'border-red-500',
    color: 'text-red-400',
    glow: 'shadow-[0_0_16px_rgba(239,68,68,0.4)]',
  },
  {
    id: 2,
    name: 'EMERALD PHANTOM',
    role: '초고속 · 연사형',
    desc: '가장 빠른 회피 기동과 높은 연사 속도로 탄막 사이를 파고드는 스텔스기',
    speed: '★★★★★',
    power: '★★★☆☆',
    img: '/Ships/ship_0002.png',
    border: 'border-emerald-500',
    color: 'text-emerald-400',
    glow: 'shadow-[0_0_16px_rgba(16,185,129,0.4)]',
  },
  {
    id: 3,
    name: 'GOLDEN FORTRESS',
    role: '중장갑 · 확산탄',
    desc: '광역 부채꼴 확산탄과 탄탄한 장갑으로 전장을 장악하는 비행 요새',
    speed: '★★☆☆☆',
    power: '★★★★★',
    img: '/Ships/ship_0003.png',
    border: 'border-amber-500',
    color: 'text-amber-400',
    glow: 'shadow-[0_0_16px_rgba(245,158,11,0.4)]',
  },
];

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // Selected Player Ship (0..3)
  const [selectedShip, setSelectedShip] = useState<number>(0);

  // Game UI States
  const [gameState, setGameState] = useState<GameState>('START');
  const [stats, setStats] = useState<PlayerStats>({
    lives: 3,
    maxLives: 3,
    bombs: 3,
    score: 0,
    highScore: 0,
    weaponLevel: 1,
    invulnerableTime: 0,
    kills: 0,
  });

  // Boss UI State
  const [bossHp, setBossHp] = useState<{ hp: number; maxHp: number; isRage: boolean } | null>(null);

  // Settings & Toggles
  const [soundOn, setSoundOn] = useState(true);
  const [musicOn, setMusicOn] = useState(true);
  const [crtOn, setCrtOn] = useState(true);

  // Screen Flash
  const [flashColor, setFlashColor] = useState<string | null>(null);

  // Standalone HTML Modal
  const [showExportModal, setShowExportModal] = useState(false);
  const [copied, setCopied] = useState(false);

  // Controls Guide Modal
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Virtual touch controls for mobile
  const [isMobile, setIsMobile] = useState(false);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);

  // Initialize Game Engine
  useEffect(() => {
    if (!containerRef.current) return;

    const checkMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    setIsMobile(checkMobile);

    const engine = new GameEngine(containerRef.current);
    engineRef.current = engine;

    // Apply default ship
    engine.setPlayerShip(selectedShip);

    // Hook callbacks
    engine.onStatsChange = (newStats) => {
      setStats({ ...newStats });
    };

    engine.onStateChange = (newState) => {
      setGameState(newState);
      if (newState === 'GAMEOVER' || newState === 'VICTORY' || newState === 'START') {
        setBossHp(null);
      }
    };

    engine.onBossHpChange = (hp, maxHp, isRage) => {
      setBossHp({ hp, maxHp, isRage });
    };

    engine.onScreenFlash = (color) => {
      setFlashColor(color);
      setTimeout(() => setFlashColor(null), 90);
    };

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  const handleSelectShip = (id: number) => {
    setSelectedShip(id);
    engineRef.current?.setPlayerShip(id);
    audio.playLaser(2);
  };

  // Sync sound settings
  const toggleSound = useCallback(() => {
    setSoundOn((prev) => {
      const next = !prev;
      audio.setSoundEnabled(next);
      return next;
    });
  }, []);

  const toggleMusic = useCallback(() => {
    setMusicOn((prev) => {
      const next = !prev;
      audio.setMusicEnabled(next);
      if (next && gameState === 'PLAYING') {
        audio.startMusic();
      }
      return next;
    });
  }, [gameState]);

  const handleStartGame = () => {
    audio.startAudio();
    if (musicOn) audio.startMusic();
    engineRef.current?.setPlayerShip(selectedShip);
    engineRef.current?.startGame();
  };

  const handleRestart = () => {
    engineRef.current?.restartGame();
  };

  const handleBomb = () => {
    engineRef.current?.triggerBomb();
  };

  const handlePause = () => {
    engineRef.current?.pauseGame();
  };

  // Copy or Download Standalone HTML
  const handleCopyHtml = () => {
    const htmlCode = getStandaloneHtml();
    navigator.clipboard.writeText(htmlCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadHtml = () => {
    const htmlCode = getStandaloneHtml();
    const blob = new Blob([htmlCode], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sky-striker-1945.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Mobile Touch handlers for virtual joystick / dragging
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!engineRef.current || gameState !== 'PLAYING') return;
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    engineRef.current.isTouchFiring = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!engineRef.current || !touchStartPos.current || gameState !== 'PLAYING') return;
    const touch = e.touches[0];
    const dx = (touch.clientX - touchStartPos.current.x) * 0.055;
    const dz = (touch.clientY - touchStartPos.current.y) * 0.055;

    engineRef.current.touchMoveVector = {
      x: Math.max(-1, Math.min(1, dx)),
      z: Math.max(-1, Math.min(1, dz)),
    };
  };

  const handleTouchEnd = () => {
    if (!engineRef.current) return;
    touchStartPos.current = null;
    engineRef.current.touchMoveVector = { x: 0, z: 0 };
    engineRef.current.isTouchFiring = false;
  };

  const currentShipObj = SHIPS[selectedShip] || SHIPS[0];

  return (
    <div 
      className="relative w-screen h-screen overflow-hidden select-none bg-[#050814] text-slate-100 font-tech"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* 3D Three.js WebGL Canvas Mount */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full z-0 cursor-crosshair" />

      {/* Screen Flash overlay */}
      {flashColor && (
        <div 
          className="absolute inset-0 z-10 pointer-events-none transition-opacity duration-75"
          style={{ backgroundColor: flashColor }}
        />
      )}

      {/* CRT Scanline & Phosphor Vignette Filter */}
      {crtOn && (
        <>
          <div className="crt-lines absolute inset-0 z-20 pointer-events-none" />
          <div className="crt-vignette absolute inset-0 z-20 pointer-events-none" />
        </>
      )}

      {/* Top Controls Quick Toolbar */}
      <div className="absolute top-4 right-4 z-40 flex items-center gap-2 pointer-events-auto">
        <button
          onClick={toggleSound}
          title={soundOn ? '음향 효과 끄기' : '음향 효과 켜기'}
          className={`p-2 rounded-lg border backdrop-blur-md transition-colors ${
            soundOn ? 'bg-slate-900/80 border-cyan-500/40 text-cyan-400 hover:bg-slate-800' : 'bg-slate-900/80 border-slate-700 text-slate-500 hover:text-slate-300'
          }`}
        >
          {soundOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
        </button>

        <button
          onClick={toggleMusic}
          title={musicOn ? 'BGM 끄기' : 'BGM 켜기'}
          className={`p-2 rounded-lg border backdrop-blur-md transition-colors ${
            musicOn ? 'bg-slate-900/80 border-cyan-500/40 text-cyan-400 hover:bg-slate-800' : 'bg-slate-900/80 border-slate-700 text-slate-500 hover:text-slate-300'
          }`}
        >
          <Music size={16} />
        </button>

        <button
          onClick={() => setCrtOn(!crtOn)}
          title={crtOn ? 'CRT 스캔라인 끄기' : 'CRT 스캔라인 켜기'}
          className={`p-2 rounded-lg border backdrop-blur-md transition-colors ${
            crtOn ? 'bg-slate-900/80 border-cyan-500/40 text-cyan-400 hover:bg-slate-800' : 'bg-slate-900/80 border-slate-700 text-slate-500 hover:text-slate-300'
          }`}
        >
          <Tv size={16} />
        </button>

        <button
          onClick={() => setShowExportModal(true)}
          title="단일 HTML 코드 복사 및 다운로드"
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 backdrop-blur-md transition-colors"
        >
          <Download size={14} />
          <span className="hidden sm:inline">단일 HTML 복사</span>
        </button>

        <button
          onClick={() => setShowHelpModal(true)}
          title="조작법 안내"
          className="p-2 rounded-lg border border-slate-700 bg-slate-900/80 text-slate-300 hover:text-cyan-400 hover:border-cyan-500/40 backdrop-blur-md transition-colors"
        >
          <HelpCircle size={16} />
        </button>

        {gameState === 'PLAYING' && (
          <button
            onClick={handlePause}
            title="일시 정지"
            className="p-2 rounded-lg border border-slate-700 bg-slate-900/80 text-slate-300 hover:text-white backdrop-blur-md"
          >
            <Pause size={16} />
          </button>
        )}
      </div>

      {/* IN-GAME HUD UI */}
      {(gameState === 'PLAYING' || gameState === 'PAUSED' || gameState === 'BOSS_WARNING') && (
        <div className="absolute inset-0 z-30 pointer-events-none p-4 sm:p-5 flex flex-col justify-between">
          {/* Top Row: Lives/Bombs & Score */}
          <div className="flex justify-between items-start">
            {/* Lives, Bombs, Weapon Level with Kenney Pixel Icons */}
            <div className="bg-slate-950/85 backdrop-blur-md border border-slate-800/80 rounded-xl p-3 shadow-2xl pointer-events-auto">
              <div className="flex items-center gap-3 mb-2.5 pb-2 border-b border-slate-800">
                <div className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center p-1">
                  <img 
                    src={currentShipObj.img} 
                    alt={currentShipObj.name} 
                    className="w-8 h-8 object-contain [image-rendering:pixelated]" 
                  />
                </div>
                <div>
                  <div className="text-[9px] font-arcade text-slate-400">{currentShipObj.name}</div>
                  <div className="flex items-center gap-1 mt-1">
                    {Array.from({ length: stats.maxLives }).map((_, i) => (
                      <img
                        key={i}
                        src="/Tiles/tile_0017.png"
                        alt="Life"
                        className={`w-4 h-4 object-contain [image-rendering:pixelated] transition-all ${
                          i < stats.lives ? 'opacity-100 scale-105 drop-shadow-[0_0_6px_rgba(239,68,68,0.8)]' : 'opacity-25 grayscale scale-90'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Bombs Display */}
              <div className="flex items-center gap-1.5 mb-2.5">
                <span className="text-[9px] font-arcade text-slate-400 mr-1">BOMBS:</span>
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-6 h-6 rounded flex items-center justify-center transition-all ${
                      i < stats.bombs
                        ? 'bg-orange-950/70 border border-orange-500/70 shadow-[0_0_8px_rgba(249,115,22,0.4)]'
                        : 'bg-slate-900/60 border border-slate-800 opacity-25'
                    }`}
                  >
                    <img 
                      src="/Tiles/tile_0024.png" 
                      alt="Bomb" 
                      className="w-4 h-4 object-contain [image-rendering:pixelated]" 
                    />
                  </div>
                ))}
              </div>

              {/* Weapon Level */}
              <div className="flex items-center gap-2 pt-1 border-t border-slate-800/80 text-xs">
                <img 
                  src="/Tiles/tile_0025.png" 
                  alt="Power" 
                  className="w-4 h-4 object-contain [image-rendering:pixelated]" 
                />
                <span className="text-slate-400 font-arcade text-[9px]">WEAPON:</span>
                <span className={`font-arcade text-[10px] ${
                  stats.weaponLevel === 1 ? 'text-amber-400' : stats.weaponLevel === 2 ? 'text-cyan-400' : 'text-emerald-400 animate-pulse'
                }`}>
                  LV {stats.weaponLevel} {stats.weaponLevel === 1 ? '(DUAL)' : stats.weaponLevel === 2 ? '(QUAD)' : '(5-SPREAD)'}
                </span>
              </div>
            </div>

            {/* Score & High Score */}
            <div className="bg-slate-950/85 backdrop-blur-md border border-slate-800/80 rounded-xl p-3.5 shadow-2xl text-right">
              <div className="text-[10px] font-arcade tracking-wider text-slate-400 mb-1">SCORE</div>
              <div className="font-arcade text-xl sm:text-2xl text-cyan-400 neon-glow-cyan tracking-wider">
                {stats.score.toString().padStart(6, '0')}
              </div>
              <div className="flex items-center justify-end gap-1.5 text-xs text-amber-400 font-arcade mt-1.5">
                <Trophy size={13} />
                <span>HI: {stats.highScore.toString().padStart(6, '0')}</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1 font-arcade">
                KILLS: {stats.kills}
              </div>
            </div>
          </div>

          {/* Top-Center Boss Health Gauge */}
          {bossHp && (
            <div className="absolute top-5 left-1/2 -translate-x-1/2 w-[88%] max-w-lg text-center animate-in fade-in zoom-in-95 duration-300">
              <div className="flex items-center justify-between px-1 mb-1">
                <div className="font-arcade text-xs text-red-400 tracking-wider flex items-center gap-2 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]">
                  <img src="/Ships/ship_0021.png" alt="Boss" className="w-5 h-5 object-contain [image-rendering:pixelated]" />
                  <span>GOLIATH DREADNOUGHT</span>
                  {bossHp.isRage && (
                    <span className="text-pink-400 animate-pulse text-[10px]">[ENRAGED]</span>
                  )}
                </div>
                <div className="font-arcade text-[10px] text-slate-300">
                  {Math.max(0, Math.round((bossHp.hp / bossHp.maxHp) * 100))}%
                </div>
              </div>
              <div className="h-4 w-full bg-slate-950/90 border-2 border-red-500/80 rounded-md p-0.5 shadow-[0_0_16px_rgba(239,68,68,0.5)] overflow-hidden">
                <div
                  className={`h-full rounded-sm transition-all duration-150 ${
                    bossHp.isRage
                      ? 'bg-gradient-to-r from-red-600 via-pink-500 to-red-400'
                      : 'bg-gradient-to-r from-red-700 to-red-500'
                  }`}
                  style={{ width: `${Math.max(0, (bossHp.hp / bossHp.maxHp) * 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Bottom Row / Mega Bomb Button */}
          <div className="flex justify-between items-end pointer-events-auto">
            {/* Quick Helper pill */}
            <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 rounded-lg bg-slate-950/70 border border-slate-800 text-xs text-slate-400">
              <span>[WASD] 이동</span>
              <span>·</span>
              <span>[Space] 사격</span>
              <span>·</span>
              <span>[B/Shift] 필살기 폭탄</span>
            </div>

            {/* Mega Bomb Button */}
            <button
              onClick={handleBomb}
              disabled={stats.bombs <= 0}
              className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl font-arcade text-xs transition-all shadow-xl ${
                stats.bombs > 0
                  ? 'bg-gradient-to-b from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500 text-white border-2 border-amber-300 shadow-[0_0_20px_rgba(249,115,22,0.6)] active:scale-95'
                  : 'bg-slate-800/80 text-slate-500 border border-slate-700 cursor-not-allowed'
              }`}
            >
              <img src="/Tiles/tile_0024.png" alt="Bomb" className={`w-5 h-5 object-contain [image-rendering:pixelated] ${stats.bombs > 0 ? 'animate-bounce' : ''}`} />
              <span>MEGA BOMB ({stats.bombs})</span>
            </button>
          </div>
        </div>
      )}

      {/* WARNING SIREN BANNER */}
      {gameState === 'BOSS_WARNING' && (
        <div className="absolute inset-x-0 top-1/3 z-40 bg-red-600/90 border-y-4 border-amber-400 text-white py-5 text-center shadow-[0_0_40px_rgba(239,68,68,0.9)] animate-warning-flash">
          <div className="font-arcade text-lg sm:text-2xl tracking-widest text-amber-300 mb-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
            ⚠️ WARNING! ⚠️
          </div>
          <div className="font-arcade text-xs sm:text-sm tracking-wider text-white">
            A HUGE BATTLESHIP IS APPROACHING FAST
          </div>
        </div>
      )}

      {/* START TITLE SCREEN & HANGAR SHIP SELECTION */}
      {gameState === 'START' && (
        <div className="absolute inset-0 z-40 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-6 text-center overflow-y-auto">
          <div className="max-w-2xl w-full flex flex-col items-center animate-in fade-in zoom-in-95 duration-300 my-auto">
            {/* Retro Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-400 font-arcade text-[10px] mb-3 shadow-[0_0_12px_rgba(6,182,212,0.3)]">
              <span>★ KENNEY PIXEL SHMUP · 1945 RETRO 3D ★</span>
            </div>

            {/* Game Title */}
            <h1 className="font-arcade text-3xl sm:text-4xl lg:text-5xl text-cyan-400 neon-glow-cyan leading-tight tracking-wider mb-1">
              SKY STRIKER
            </h1>
            <div className="font-arcade text-sm sm:text-base text-red-500 neon-glow-red tracking-widest mb-4">
              1945 ARCADE EDITION
            </div>

            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed mb-6 max-w-lg">
              업로드된 픽셀 슈팅 에셋(Ships & Tiles)으로 강화된 레트로 3D 비행기 슈팅 게임! 
              출격할 에이스 전투기를 선택하고 보스를 격퇴하세요.
            </p>

            {/* HANGAR SHIP SELECTOR */}
            <div className="w-full mb-6 text-left">
              <div className="font-arcade text-[11px] text-amber-400 mb-2.5 flex items-center justify-between">
                <span>✈️ 전투기 선택 (SELECT YOUR FIGHTER)</span>
                <span className="text-[10px] text-slate-400 font-normal">클릭하여 선택</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {SHIPS.map((ship) => {
                  const isSelected = selectedShip === ship.id;
                  return (
                    <button
                      key={ship.id}
                      onClick={() => handleSelectShip(ship.id)}
                      className={`relative flex flex-col items-center p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? `bg-slate-800/90 ${ship.border} ${ship.glow} scale-102`
                          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50'
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                      )}
                      <div className="w-14 h-14 rounded-lg bg-slate-950/70 border border-slate-800 flex items-center justify-center mb-2.5 p-1">
                        <img 
                          src={ship.img} 
                          alt={ship.name} 
                          className="w-12 h-12 object-contain [image-rendering:pixelated] drop-shadow-md"
                        />
                      </div>
                      <div className={`font-arcade text-[9px] font-bold ${ship.color} mb-1 text-center w-full truncate`}>
                        {ship.name}
                      </div>
                      <div className="text-[10px] text-slate-300 font-semibold mb-1 text-center w-full">
                        {ship.role}
                      </div>
                      <div className="w-full text-[9px] text-slate-400 space-y-0.5 border-t border-slate-800/80 pt-1 mt-1">
                        <div className="flex justify-between">
                          <span>기동력</span>
                          <span className="text-amber-400">{ship.speed}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>화력</span>
                          <span className="text-red-400">{ship.power}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Control Keys Overview Box */}
            <div className="grid grid-cols-2 gap-2 w-full mb-6 text-left">
              <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 text-xs text-slate-300 flex items-center gap-2">
                <span className="font-arcade text-[9px] bg-slate-800 px-1.5 py-0.5 rounded text-cyan-400 border border-slate-700">WASD / 방향키</span>
                <span>기체 이동 (기울임 롤)</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 text-xs text-slate-300 flex items-center gap-2">
                <span className="font-arcade text-[9px] bg-slate-800 px-1.5 py-0.5 rounded text-cyan-400 border border-slate-700">SPACE</span>
                <span>일반 사격 (자동 연사)</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 text-xs text-slate-300 flex items-center gap-2">
                <span className="font-arcade text-[9px] bg-slate-800 px-1.5 py-0.5 rounded text-orange-400 border border-slate-700">B / SHIFT</span>
                <span>필살기 메가 폭탄</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 text-xs text-slate-300 flex items-center gap-2">
                <span className="font-arcade text-[9px] bg-slate-800 px-1.5 py-0.5 rounded text-amber-400 border border-slate-700">아이템</span>
                <span>[P]강화 [B]폭탄 [H]회복</span>
              </div>
            </div>

            {/* Start Button */}
            <button
              onClick={handleStartGame}
              className="px-8 py-3.5 rounded-xl font-arcade text-sm bg-gradient-to-r from-cyan-600 via-sky-500 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white border-2 border-cyan-300 shadow-[0_0_28px_rgba(6,182,212,0.6)] hover:scale-105 active:scale-95 transition-all mb-3.5 w-full sm:w-auto"
            >
              MISSION START (SPACE)
            </button>

            <button
              onClick={() => setShowExportModal(true)}
              className="text-xs text-slate-400 hover:text-amber-400 flex items-center gap-1.5 transition-colors"
            >
              <Download size={13} />
              <span>설치 없이 어디서나 단독 실행 가능한 단일 HTML 파일로 저장</span>
            </button>
          </div>
        </div>
      )}

      {/* PAUSE SCREEN */}
      {gameState === 'PAUSED' && (
        <div className="absolute inset-0 z-40 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <h2 className="font-arcade text-2xl text-cyan-400 mb-6">GAME PAUSED</h2>
            <div className="flex flex-col gap-3">
              <button
                onClick={handlePause}
                className="py-3 px-4 rounded-xl font-arcade text-xs bg-cyan-600 hover:bg-cyan-500 text-white border border-cyan-400 shadow-[0_0_16px_rgba(6,182,212,0.4)]"
              >
                RESUME MISSION
              </button>
              <button
                onClick={handleRestart}
                className="py-3 px-4 rounded-xl font-arcade text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
              >
                RESTART MISSION
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GAME OVER SCREEN */}
      {gameState === 'GAMEOVER' && (
        <div className="absolute inset-0 z-40 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
          <div className="max-w-md w-full bg-slate-900/90 border border-red-500/50 rounded-2xl p-7 shadow-[0_0_40px_rgba(239,68,68,0.3)]">
            <h2 className="font-arcade text-3xl text-red-500 neon-glow-red tracking-wider mb-2">
              GAME OVER
            </h2>
            <p className="text-slate-400 text-sm mb-6">전투기가 격추되었습니다.</p>

            <div className="bg-slate-950/80 rounded-xl p-4 border border-slate-800 mb-6 text-left">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-slate-400 font-arcade">FINAL SCORE</span>
                <span className="font-arcade text-lg text-cyan-400">{stats.score.toString().padStart(6, '0')}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-slate-400 font-arcade">HIGH SCORE</span>
                <span className="font-arcade text-sm text-amber-400">{stats.highScore.toString().padStart(6, '0')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400 font-arcade">ENEMIES DEFEATED</span>
                <span className="font-arcade text-sm text-slate-200">{stats.kills} SHIPS</span>
              </div>
            </div>

            <button
              onClick={handleRestart}
              className="w-full py-4 rounded-xl font-arcade text-xs bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white border-2 border-red-400 shadow-[0_0_20px_rgba(239,68,68,0.5)] transition-all hover:scale-102 active:scale-98 flex items-center justify-center gap-2"
            >
              <RefreshCw size={15} />
              <span>RETRY MISSION (PRESS R)</span>
            </button>
          </div>
        </div>
      )}

      {/* VICTORY SCREEN */}
      {gameState === 'VICTORY' && (
        <div className="absolute inset-0 z-40 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
          <div className="max-w-md w-full bg-slate-900/90 border border-amber-500/50 rounded-2xl p-7 shadow-[0_0_40px_rgba(245,158,11,0.3)]">
            <div className="inline-block px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[10px] font-arcade mb-2">
              ★ MISSION ACCOMPLISHED ★
            </div>
            <h2 className="font-arcade text-2xl sm:text-3xl text-amber-400 neon-glow-yellow tracking-wider mb-1">
              VICTORY!
            </h2>
            <p className="text-slate-300 text-sm mb-5">거대 공중전함 골리앗 격퇴 완료!</p>

            <div className="bg-slate-950/80 rounded-xl p-4 border border-slate-800 mb-6">
              <div className="text-[10px] font-arcade text-slate-400 mb-1">PILOT RANKING</div>
              <div className="font-arcade text-5xl font-bold text-amber-400 mb-1 drop-shadow-[0_0_12px_rgba(250,204,21,0.5)]">
                {stats.score >= 18000 ? 'S' : stats.score >= 11000 ? 'A' : 'B'}
              </div>
              <div className="font-arcade text-xs text-slate-300 mb-3">
                {stats.score >= 18000 ? 'SUPREME ACE PILOT' : stats.score >= 11000 ? 'MASTER AVIATOR' : 'VETERAN STRIKER'}
              </div>

              <div className="border-t border-slate-800/80 pt-3 flex justify-between items-center text-xs">
                <span className="text-slate-400 font-arcade">TOTAL SCORE</span>
                <span className="font-arcade text-base text-cyan-400">{stats.score.toString().padStart(6, '0')}</span>
              </div>
            </div>

            <button
              onClick={handleRestart}
              className="w-full py-4 rounded-xl font-arcade text-xs bg-gradient-to-r from-amber-500 to-cyan-500 hover:from-amber-400 hover:to-cyan-400 text-slate-950 font-bold border-2 border-amber-200 shadow-[0_0_24px_rgba(245,158,11,0.6)] transition-all hover:scale-102 active:scale-98 flex items-center justify-center gap-2"
            >
              <Play size={15} />
              <span>PLAY AGAIN (PRESS R)</span>
            </button>
          </div>
        </div>
      )}

      {/* STANDALONE SINGLE HTML EXPORT MODAL */}
      {showExportModal && (
        <div className="absolute inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-arcade text-sm text-cyan-400 flex items-center gap-2">
                <Download size={16} />
                <span>단일 HTML 파일 다운로드 & 복사</span>
              </h3>
              <button
                onClick={() => setShowExportModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              요청하신 <strong>Three.js 3D 로우폴리 비행기 슈팅 게임</strong>의 모든 코드(HTML, CSS, Three.js 씬, 사운드 신시사이저, 보스 AI)가 포함된 
              <strong>단일 HTML 파일</strong>입니다. Node.js나 빌드 설치 없이 더블 클릭만으로 브라우저에서 즉시 실행됩니다.
            </p>

            <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 text-[11px] font-mono text-slate-400 mb-5 max-h-40 overflow-y-auto">
              <code>{getStandaloneHtml().slice(0, 500)}... (단일 HTML 파일)</code>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCopyHtml}
                className="flex-1 py-3 px-4 rounded-xl font-tech text-sm font-semibold bg-cyan-600 hover:bg-cyan-500 text-white flex items-center justify-center gap-2 transition-all shadow-[0_0_16px_rgba(6,182,212,0.4)]"
              >
                {copied ? <Check size={16} className="text-emerald-300" /> : <Copy size={16} />}
                <span>{copied ? '복사 완료!' : '전체 코드 클립보드 복사'}</span>
              </button>

              <button
                onClick={handleDownloadHtml}
                className="flex-1 py-3 px-4 rounded-xl font-tech text-sm font-semibold bg-amber-600 hover:bg-amber-500 text-white flex items-center justify-center gap-2 transition-all shadow-[0_0_16px_rgba(245,158,11,0.4)]"
              >
                <Download size={16} />
                <span>.html 파일 다운로드</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONTROLS GUIDE MODAL */}
      {showHelpModal && (
        <div className="absolute inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-arcade text-sm text-cyan-400">조작 방법 및 에셋 안내</h3>
              <button onClick={() => setShowHelpModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3 text-xs text-slate-300 mb-6">
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="font-bold text-cyan-400 mb-1">🎮 비행기 조작</div>
                <div>- W, A, S, D 또는 방향키: 기체 이동 및 좌우 뱅킹 롤</div>
                <div>- Space Bar: 일반 사격 (누르고 있으면 자동 연사)</div>
                <div>- B 또는 Shift: 필살기 메가 폭탄 (화면 탄환 소거 + 광역 피해)</div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="font-bold text-amber-400 mb-1">💎 적용된 Kenney 에셋 (CC0)</div>
                <div>- 플레이어 기체 4종: Blue, Crimson, Emerald, Golden Striker</div>
                <div>- 적기 편대: Scout Drone, Heavy Gunship, Interceptor, Goliath Boss</div>
                <div>- 픽셀 탄환 및 [P]파워업, [B]폭탄, [H]회복 아이템</div>
              </div>
            </div>

            <button
              onClick={() => setShowHelpModal(false)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
