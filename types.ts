export enum GameState {
  MENU,
  PLAYING,
  UPGRADING,
  GAME_OVER,
  VICTORY,
  ADMIN,
  CHAPTER_SELECT,
  CH3_SHOP,
  CH3_INVENTORY
}

export enum Chapter {
  CHAPTER1 = 1,
  CHAPTER2 = 2,
  CHAPTER3 = 3
}

export enum BossType {
  SKELETON_PRIME = 0,
  KING_PENGUIN = 1,
  GAMBLE_BOT = 2,
  VOID_REAPER = 3,
  AZATHOTH = 4,
  // Chapter 2 Bosses
  CH2_GUARDIAN = 5,
  CH2_ALCHEMIST = 6,
  CH2_DIRECTOR = 7,
  CH2_ENTITY = 8,
  CH2_SKELETON_KING = 9,
  // Chapter 3 Bosses
  CH3_MORTIMER = 10,
  CH3_VERMILLION = 11,
  CH3_VERDOLAGA = 12,
  CH3_CARAMELA = 13,
  CH3_SCRATCH = 14
}

export type SoulColor = 'RED' | 'BLUE' | 'GREEN';

export type SecondaryWeaponType =
  'NONE' | 'DRONES' | 'BEAM' | 'MINE' | 'EMP' | 'FLAMETHROWER' |
  'MISSILE' | 'CRYO' | 'SHIELD' | 'GRAVITY' | 'OVERCHARGE' |
  'CH2_BONE_STRIKE' | 'CH2_PIXEL_BLAST' | 'CH2_VOID_NOTES' | 'CH2_GLITCH_BOMB' | 'CH2_KR_BEAM';

export interface Vector2 {
  x: number;
  y: number;
}

export interface Entity {
  pos: Vector2;
  size: number;
  color: string;
}

export interface Player extends Entity {
  vel: Vector2;
  hp: number;
  maxHp: number;
  speed: number;

  // Phase 1 Stats
  dashCooldown: number;
  dashTimer: number;
  isDashing: boolean;
  invincibilityTimer: number;
  shootCooldown: number;
  damage: number;
  projectileSpeed: number;
  projectileSize: number;
  slowTimer: number;
  invertedControls: boolean;
  screenRotation: number;
  playAreaScale: number; // Used for "The Box" in Phase 2 as well

  // Phase 2: Soul Mode Stats
  isSoulMode: boolean; // Toggle for Phase 2 gameplay
  gravityDir: Vector2; // Direction of gravity (usually {x:0, y:1})
  isGrounded: boolean;
  jumpPower: number;
  krTimer: number; // Karmic Retribution poison timer
  krDamageAccumalator: number; // Stored damage that ticks down HP

  // Secondary Weapon System
  secondaryWeapon: SecondaryWeaponType;
  secondaryWeaponLevel: number;
  secondaryCooldownTimer: number;
  secondaryCooldownMax: number;
  secondaryDamageMult: number;
  activeDronesDuration: number;
  droneChargeCount: number;
  beamDuration: number;
  shieldDuration: number;
  chargeTimer: number;
  isCharging: boolean;
  godMode?: boolean;
  shieldDirection?: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

  // Chapter 3 Specific
  ch3Grounded?: boolean;
  ch3Jumping?: boolean;
  ch3Crouching?: boolean;
  ch3Coins?: number;
  ch3WeaponIdsOwned?: number[];
  ch3Loadout?: number[]; // indices into CH3_WEAPONS (max 3)
  parryTimer?: number;
  parryCooldown?: number;
  lastCh3Facing?: number;
  ch3RollingTimer?: number;
  ch3RollingCooldown?: number;
  ch3MirrorTimer?: number;
  ch3TimeStopTimer?: number;
  ch3SlotKeyWasDown?: boolean;
}

export interface Boss extends Entity {
  type: BossType;
  hp: number;
  maxHp: number;
  phase: number;
  attackTimer: number;
  state: 'IDLE' | 'ATTACKING' | 'STUNNED' | 'MOVING';
  moveTarget?: Vector2;
  angle: number;
  name: string;
  description: string;

  // Phase 1 Specifics
  slowTimer: number;
  freezeTimer: number;
  rouletteState?: 'IDLE' | 'SPINNING';
  rouletteTimer?: number;
  rouletteSpinTimer?: number;
  activeEffect?: string;
  modifiers?: {
    damage: number;
    fireRate: number;
    moveSpeed: number;
  };
  tentacles?: { angle: number, length: number, phase: number }[];
  realityGlitch?: number;
  // Chapter 2 Properties
  forceNoIframes?: boolean;
  glitchTimer?: number;

  // Chapter 3 Elemental Status (Progress Bars)
  fireAccumulation?: number;
  iceAccumulation?: number;
  fireTimer?: number;

  // Chapter 3 Combat Status
  stunAccumulation?: number;
  paralysisAccumulation?: number;
  poisonAccumulation?: number;
  stunTimer?: number;
  paralysisTimer?: number;
  paralysisImmunityTimer?: number;
  poisonTimer?: number;
}

export interface Bullet extends Entity {
  vel: Vector2;
  isEnemy: boolean;
  damage: number;
  lifetime: number;
  curve?: number;

  // Special Properties
  effect?: 'SLOW' | 'BURN' | 'FREEZE' | 'GRAVITY' | 'EMP' | 'REALITY_BREAK' | 'MELEE_ORB' | 'GAS' | 'CARTOON_HIT' | 'WAVE' | 'GLOW' | 'SPIRAL' | 'SLOW_PLAYER' | 'HOMING_SOFT' | 'BOOMERANG' | 'GHOST' | 'EXPLOSIVE' | 'HEAVY' | 'MELEE' | 'THUNDER';
  homing?: boolean;
  isMine?: boolean;
  mineTimer?: number;
  attachedToBoss?: boolean;
  isBeam?: boolean;
  piercing?: boolean;
  isDrone?: boolean;
  droneSticky?: boolean;
  clusterCount?: number;
  canSplit?: boolean;
  hasGravity?: boolean;
  ch3PlatformId?: number; // To track which platform we are on

  // Phase 2 / Azathoth / Judge Patterns
  isSafeZone?: boolean;
  safeZoneTimer?: number;
  isBone?: boolean; // Rectangular hitbox
  boneWidth?: number;
  boneHeight?: number;
  boneColor?: 'WHITE' | 'BLUE' | 'ORANGE'; // Ch2 Guardian mechanic
  isBlaster?: boolean; // Raycast beam warning -> fire
  blasterTimer?: number;
  blasterPhase?: 'WARN' | 'FIRE';
  // Ch2 Director - bouncing
  bounces?: number;
  maxBounces?: number;
  isMissile?: boolean;
  isParryable?: boolean;
}

export interface Particle extends Entity {
  vel: Vector2;
  life: number;
  maxLife: number;
  decay: number;
}

export interface Upgrade {
  id: string;
  name: string;
  description: string;
  rarity: 'COMMON' | 'RARE' | 'LEGENDARY' | 'MYTHIC';
  type?: 'SECONDARY_WEAPON' | 'STAT';
  weaponType?: SecondaryWeaponType;
  apply: (player: Player) => void;
  isWeaponUpgrade?: boolean;
  targetLevel?: number;
}

export interface CH3Weapon {
  id: number;
  name: string;
  price: number;
  description: string;
  effect: string;
  type: string;
}

export interface CH3Checkpoint {
  lastBossDefeated: number;
  coins: number;
  weaponsOwned: number[];
  loadout: number[];
}