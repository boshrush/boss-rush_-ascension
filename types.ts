export enum GameState {
  MENU,
  PLAYING,
  UPGRADING,
  GAME_OVER,
  VICTORY,
  ADMIN
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
  CH2_SKELETON_KING = 9
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
}

export interface Bullet extends Entity {
  vel: Vector2;
  isEnemy: boolean;
  damage: number;
  lifetime: number;
  curve?: number;

  // Special Properties
  effect?: 'SLOW' | 'BURN' | 'FREEZE' | 'GRAVITY' | 'EMP' | 'REALITY_BREAK';
  homing?: boolean;
  isMine?: boolean;
  mineTimer?: number;
  attachedToBoss?: boolean;
  isBeam?: boolean;
  piercing?: boolean;
  isDrone?: boolean;
  droneSticky?: boolean;
  clusterCount?: number;

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