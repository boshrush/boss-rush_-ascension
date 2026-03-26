import { Upgrade, SecondaryWeaponType, BossType, CH3Weapon } from './types';

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;

export const PLAYER_BASE_STATS = {
  hp: 100,
  speed: 5,
  damage: 5,
  projectileSpeed: 12,
  projectileSize: 6,
  dashCooldown: 60, // frames
  fireRate: 8, // frames between shots
};

export const COLORS = {
  player: '#3b82f6', // blue-500
  playerBullet: '#60a5fa', // blue-400
  enemy: '#ef4444', // red-500
  enemyBullet: '#f87171', // red-400
  enemyBulletSpecial: '#fbbf24', // amber-400
  background: '#0f172a', // slate-900
  uiOverlay: 'rgba(0, 0, 0, 0.7)',
  accent: '#22d3ee', // cyan-400
};

export const SECONDARY_WEAPON_STATS: Record<SecondaryWeaponType, { cooldown: number, damage: number, color: string }> = {
  NONE: { cooldown: 0, damage: 0, color: '#000' },
  DRONES: { cooldown: 600, damage: 1.5, color: '#34d399' }, // 10s CD
  BEAM: { cooldown: 480, damage: 1, color: '#a78bfa' }, // 8s CD, dmg per tick
  MINE: { cooldown: 300, damage: 75, color: '#fb923c' }, // 5s CD
  EMP: { cooldown: 900, damage: 10, color: '#22d3ee' }, // 15s CD
  FLAMETHROWER: { cooldown: 180, damage: 6, color: '#f87171' }, // 3s CD
  MISSILE: { cooldown: 180, damage: 30, color: '#facc15' }, // 3s CD
  CRYO: { cooldown: 420, damage: 20, color: '#bae6fd' }, // 7s CD
  SHIELD: { cooldown: 720, damage: 0, color: '#818cf8' }, // 12s CD
  GRAVITY: { cooldown: 1200, damage: 2.5, color: '#4c1d95' }, // 20s CD
  OVERCHARGE: { cooldown: 600, damage: 150, color: '#f472b6' }, // 10s CD
  CH2_BONE_STRIKE: { cooldown: 180, damage: 30, color: '#e5e7eb' },
  CH2_PIXEL_BLAST: { cooldown: 240, damage: 40, color: '#a855f7' },
  CH2_VOID_NOTES: { cooldown: 120, damage: 15, color: '#1e293b' },
  CH2_GLITCH_BOMB: { cooldown: 300, damage: 75, color: '#ec4899' },
  CH2_KR_BEAM: { cooldown: 480, damage: 17.5, color: '#f1f5f9' },
};

export const BOSS_CONFIGS = [
  {
    name: "OSTEON, THE JUDGE",
    hp: 1200,
    color: '#e2e8f0', // slate-200
    size: 40,
  },
  {
    name: "KING SLAMMER",
    hp: 1800,
    color: '#facc15', // yellow-400
    size: 60,
  },
  {
    name: "CHANCE-O-TRON 3000",
    hp: 1500,
    color: '#ec4899', // pink-500
    size: 45,
  },
  {
    name: "THE ENDLESS SWARM",
    hp: 2500,
    color: '#7f1d1d', // red-900
    size: 80,
  },
  {
    name: "AZATHOTH, THE PRIMORDIAL",
    hp: 10000,
    color: '#4c1d95', // violet-900
    size: 100,
  },
  // ─── CHAPTER 2 BOSSES ───
  {
    name: "EL GUARDIÁN BINARIO",
    hp: 1000,
    color: '#e5e7eb',
    size: 50,
  },
  {
    name: "EL ALQUIMISTA DE PÍXELES",
    hp: 1800,
    color: '#a855f7',
    size: 45,
  },
  {
    name: "SINFONÍA DEL VACÍO",
    hp: 2000,
    color: '#1e293b',
    size: 55,
  },
  {
    name: "LA ENTIDAD",
    hp: 2500,
    color: '#ec4899',
    size: 60,
  },
  {
    name: "SKELETON KING",
    hp: 3000,
    color: '#f1f5f9',
    size: 50,
  },
];

export const CH3_BOSS_CONFIGS = [
  {
    name: "MORTIMER EL PAYASO",
    hp: 2000,
    color: '#f97316',
    size: 60,
    reward: 80,
    description: "🎪 Circus on Fire"
  },
  {
    name: "LA BARONESA VERMILLION",
    hp: 3500,
    color: '#8b5cf6',
    size: 55,
    reward: 120,
    description: "🃏 Floating Casino"
  },
  {
    name: "DR. VERDOLAGA",
    hp: 4500,
    color: '#22c55e',
    size: 70,
    reward: 160,
    description: "🌿 Enchanted Garden"
  },
  {
    name: "CARAMELA LA HECHICERA",
    hp: 6000,
    color: '#f472b6',
    size: 50,
    reward: 200,
    description: "🍭 Candy Factory"
  },
  {
    name: "EL GRAN DIABLO SCRATCH",
    hp: 12000,
    color: '#ef4444',
    size: 80,
    reward: 400,
    description: "😈 Cartoon Hell"
  },
];

// Chapter 2 Bullet Box
export const CH2_BOX = {
  cx: 400,  // center X
  cy: 370,  // center Y (lower half of screen)
  baseW: 240,
  baseH: 160,
};

export const CH2_ATTACK_PATTERNS = {
  GUARDIAN: ['BINARY_RAIN', 'ROTATING_WALLS', 'GRAVITY_FLIP', 'LASER_GRID'],
  ALCHEMIST: ['POTION_THROW', 'TOXIC_FLOOR', 'ICE_SHARDS', 'SOUL_CONFUSION'],
  DIRECTOR: ['RHYTHM_BEATS', 'SOUND_WAVES', 'BOX_COMPRESSION', 'CRESCENDO'],
  ENTITY: ['GLITCH_STORM', 'TELEPORT_STRIKE', 'FAKE_BULLETS', 'BOX_SHIFT'],
  SKELETON_KING: ['BONE_CAGE', 'GIGA_BLASTER', 'SWORD_SLASH', 'PARRY_ORBS']
};

export const SOUL_PHYSICS = {
  gravity: 0.25,
  jumpPower: 6,
  terminalVelocity: 8,
  boxSize: 300, // Size of the bullet hell box
  soulSpeed: 4, // Default Red soul speed
  blueGravity: 0.35, // Heavier gravity
  yellowSpeed: 6 // Faster speed without gravity
};

export const UPGRADE_POOL: Upgrade[] = [
  // --- BASE STAT UPGRADES ---
  {
    id: 'dmg_up',
    name: 'Plasma Overcharge',
    description: 'Increase Primary Damage by 25%',
    rarity: 'COMMON',
    type: 'STAT',
    apply: (p) => { p.damage *= 1.25; }
  },
  {
    id: 'hp_up',
    name: 'Nano-Weave Armor',
    description: 'Restore 50% HP and Increase Max HP by 20%',
    rarity: 'COMMON',
    type: 'STAT',
    apply: (p) => {
      p.maxHp *= 1.2;
      p.hp = Math.min(p.maxHp, p.hp + (p.maxHp * 0.5));
    }
  },
  {
    id: 'spd_up',
    name: 'Grav-Boots',
    description: 'Increase Movement Speed by 15%',
    rarity: 'COMMON',
    type: 'STAT',
    apply: (p) => { p.speed *= 1.15; }
  },
  {
    id: 'fire_rate',
    name: 'Rapid Fire Servo',
    description: 'Shoot 20% faster',
    rarity: 'RARE',
    type: 'STAT',
    apply: (p) => { p.shootCooldown = Math.max(2, p.shootCooldown * 0.8); }
  },
  {
    id: 'dash_cd',
    name: 'Phase Shift Module',
    description: 'Dash cooldown reduced by 30%',
    rarity: 'RARE',
    type: 'STAT',
    apply: (p) => { p.dashCooldown *= 0.7; }
  },
  {
    id: 'bullet_size',
    name: 'Heavy Caliber',
    description: 'Projectiles are 50% larger and hit harder',
    rarity: 'LEGENDARY',
    type: 'STAT',
    apply: (p) => { p.projectileSize *= 1.5; p.damage *= 1.2; }
  },
  // --- SECONDARY WEAPON STAT UPGRADES ---
  {
    id: 'sec_cd',
    name: 'Tech Reloader',
    description: 'Secondary Weapon Cooldown -20%',
    rarity: 'RARE',
    type: 'STAT',
    apply: (p) => { p.secondaryCooldownMax *= 0.8; }
  },
  {
    id: 'sec_dmg',
    name: 'Ability Amplifier',
    description: 'Secondary Weapon Damage +10%',
    rarity: 'RARE',
    type: 'STAT',
    apply: (p) => { p.secondaryDamageMult *= 1.1; }
  },
  {
    id: 'sec_dmg_titan',
    name: 'Titan Reactor',
    description: 'Secondary Weapon Damage +30%',
    rarity: 'LEGENDARY',
    type: 'STAT',
    apply: (p) => { p.secondaryDamageMult *= 1.3; }
  },

  // --- SECONDARY WEAPONS ---
  {
    id: 'w_drones',
    name: 'Assault Drones',
    description: 'SECONDARY: Summons drones to fire at enemies. Replaces current secondary.',
    rarity: 'LEGENDARY',
    type: 'SECONDARY_WEAPON',
    weaponType: 'DRONES',
    apply: (p) => { p.secondaryWeapon = 'DRONES'; p.secondaryCooldownMax = SECONDARY_WEAPON_STATS.DRONES.cooldown; }
  },
  {
    id: 'w_beam',
    name: 'Piercing Beam',
    description: 'SECONDARY: Fires a powerful continuous laser. Replaces current secondary.',
    rarity: 'LEGENDARY',
    type: 'SECONDARY_WEAPON',
    weaponType: 'BEAM',
    apply: (p) => { p.secondaryWeapon = 'BEAM'; p.secondaryCooldownMax = SECONDARY_WEAPON_STATS.BEAM.cooldown; }
  },
  {
    id: 'w_mine',
    name: 'Magnetic Mine',
    description: 'SECONDARY: Latch a bomb onto the boss. Replaces current secondary.',
    rarity: 'LEGENDARY',
    type: 'SECONDARY_WEAPON',
    weaponType: 'MINE',
    apply: (p) => { p.secondaryWeapon = 'MINE'; p.secondaryCooldownMax = SECONDARY_WEAPON_STATS.MINE.cooldown; }
  },
  {
    id: 'w_emp',
    name: 'EMP Pulse',
    description: 'SECONDARY: Clears bullets and slows boss. Replaces current secondary.',
    rarity: 'LEGENDARY',
    type: 'SECONDARY_WEAPON',
    weaponType: 'EMP',
    apply: (p) => { p.secondaryWeapon = 'EMP'; p.secondaryCooldownMax = SECONDARY_WEAPON_STATS.EMP.cooldown; }
  },
  {
    id: 'w_flame',
    name: 'Plasma Thrower',
    description: 'SECONDARY: Short range high damage stream. Replaces current secondary.',
    rarity: 'LEGENDARY',
    type: 'SECONDARY_WEAPON',
    weaponType: 'FLAMETHROWER',
    apply: (p) => { p.secondaryWeapon = 'FLAMETHROWER'; p.secondaryCooldownMax = SECONDARY_WEAPON_STATS.FLAMETHROWER.cooldown; }
  },
  {
    id: 'w_missile',
    name: 'Homing Missiles',
    description: 'SECONDARY: Tracking missiles. Replaces current secondary.',
    rarity: 'LEGENDARY',
    type: 'SECONDARY_WEAPON',
    weaponType: 'MISSILE',
    apply: (p) => { p.secondaryWeapon = 'MISSILE'; p.secondaryCooldownMax = SECONDARY_WEAPON_STATS.MISSILE.cooldown; }
  },
  {
    id: 'w_cryo',
    name: 'Cryo Shot',
    description: 'SECONDARY: Freezes boss to slow them down. Replaces current secondary.',
    rarity: 'LEGENDARY',
    type: 'SECONDARY_WEAPON',
    weaponType: 'CRYO',
    apply: (p) => { p.secondaryWeapon = 'CRYO'; p.secondaryCooldownMax = SECONDARY_WEAPON_STATS.CRYO.cooldown; }
  },
  {
    id: 'w_shield',
    name: 'Reflector Shield',
    description: 'SECONDARY: Reflects enemy projectiles. Replaces current secondary.',
    rarity: 'LEGENDARY',
    type: 'SECONDARY_WEAPON',
    weaponType: 'SHIELD',
    apply: (p) => { p.secondaryWeapon = 'SHIELD'; p.secondaryCooldownMax = SECONDARY_WEAPON_STATS.SHIELD.cooldown; }
  },
  {
    id: 'w_grav',
    name: 'Gravity Field',
    description: 'SECONDARY: Black hole that eats bullets and damages boss. Replaces current secondary.',
    rarity: 'LEGENDARY',
    type: 'SECONDARY_WEAPON',
    weaponType: 'GRAVITY',
    apply: (p) => { p.secondaryWeapon = 'GRAVITY'; p.secondaryCooldownMax = SECONDARY_WEAPON_STATS.GRAVITY.cooldown; }
  },
  {
    id: 'w_charge',
    name: 'Overcharge Cannon',
    description: 'SECONDARY: Charge up a massive blast. Replaces current secondary.',
    rarity: 'LEGENDARY',
    type: 'SECONDARY_WEAPON',
    weaponType: 'OVERCHARGE',
    apply: (p) => { p.secondaryWeapon = 'OVERCHARGE'; p.secondaryCooldownMax = SECONDARY_WEAPON_STATS.OVERCHARGE.cooldown; }
  }
];

export const CH3_PHYSICS = {
  gravity: 0.4,
  jumpPower: 10,
  groundY: 520,
  moveSpeed: 4.5,
  terminalVelocity: 12,
  platforms: [
    { x: 150, y: 420, w: 150, h: 20 },
    { x: 500, y: 420, w: 150, h: 20 },
    { x: 325, y: 310, w: 150, h: 20 }
  ]
};

export const CH3_WEAPONS: CH3Weapon[] = [
  { id: 1, name: "Cañón Básico", price: 0, description: "Disparo recto estándar", effect: "NORMAL", type: "PROJECTILE" },
  { id: 2, name: "Doble Disparo", price: 50, description: "Dos balas paralelas", effect: "DOUBLE", type: "PROJECTILE" },
  { id: 3, name: "Láser Continuo", price: 80, description: "Rayo constante horizontal", effect: "BEAM", type: "CONTINUOUS" },
  { id: 4, name: "Bomba de Jazz", price: 100, description: "Explosión en área al impactar", effect: "EXPLOSIVE", type: "PROJECTILE" },
  { id: 5, name: "Bumerán Cartoon", price: 120, description: "Proyectil que regresa al jugador", effect: "BOOMERANG", type: "PROJECTILE" },
  { id: 6, name: "Esporas Tóxicas", price: 130, description: "Nube de veneno que daña over time", effect: "POISON", type: "AREA" },
  { id: 7, name: "Rayo Arcoiris", price: 150, description: "Rebota en paredes hasta 3 veces", effect: "BOUNCE", type: "PROJECTILE" },
  { id: 8, name: "Confeti Explosivo", price: 160, description: "Dispersión aleatoria de 6 proyectiles", effect: "SPREAD", type: "PROJECTILE" },
  { id: 9, name: "Tridente de Fuego", price: 170, description: "3 balas en abanico ígneas", effect: "TRIPLE", type: "PROJECTILE" },
  { id: 10, name: "Hielo Cartoon", price: 180, description: "Ralentiza al boss 2 segundos", effect: "FREEZE", type: "PROJECTILE" },
  { id: 11, name: "Carta Maldita", price: 200, description: "Proyectil que sigue al boss lentamente", effect: "HOMING", type: "PROJECTILE" },
  { id: 12, name: "Caramelo Adherente", price: 210, description: "Pega al boss y daña over time", effect: "STICKY", type: "PROJECTILE" },
  { id: 13, name: "Acordeón Sónico", price: 220, description: "Onda expansiva vertical + horizontal", effect: "WAVE", type: "AREA" },
  { id: 14, name: "Tuba Infernal", price: 250, description: "Proyectil gigante lento, daño enorme", effect: "HEAVY", type: "PROJECTILE" },
  { id: 15, name: "Guante de Boxeo", price: 260, description: "Daño masivo en rango cercano", effect: "MELEE", type: "CLOSE_RANGE" },
  { id: 16, name: "Trueno Celestial", price: 280, description: "Rayos que caen desde arriba en 3 posiciones", effect: "THUNDER", type: "STRIKE" },
  { id: 17, name: "Fantasmas Jaula", price: 300, description: "3 fantasmas que orbitan y atacan solos", effect: "ORBITAL", type: "ENTITY" },
  { id: 18, name: "Espejo Mágico", price: 320, description: "Clon que dispara en dirección opuesta", effect: "MIRROR", type: "ENTITY" },
  { id: 19, name: "Reloj del Tiempo", price: 380, description: "Ralentiza todo 2 segundos (cooldown 30s)", effect: "TIME_STOP", type: "SPECIAL" },
  { id: 20, name: "Alma del Diablo", price: 500, description: "Atraviesa todo, daño masivo. 1 sola carga por vida", effect: "ULTIMATE", type: "SPECIAL" }
];