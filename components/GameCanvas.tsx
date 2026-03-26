import React, { useRef, useEffect, useState } from 'react';
import { GameState, BossType, Player, Boss, Bullet, Particle, Vector2, Upgrade, SecondaryWeaponType, SoulColor, Chapter } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, PLAYER_BASE_STATS, COLORS, BOSS_CONFIGS, UPGRADE_POOL, SECONDARY_WEAPON_STATS, SOUL_PHYSICS, CH2_BOX, CH3_BOSS_CONFIGS, CH3_WEAPONS, CH3_PHYSICS, CH2_ATTACK_PATTERNS } from '../constants';
import { Rocket, Skull, Shield, Zap, Heart, RefreshCw, Crosshair, AlertTriangle, Lock, Unlock, Plus, Database, Target, Cpu, ArrowUpCircle, Ghost } from 'lucide-react';

const useInput = (canvasRef: React.RefObject<HTMLCanvasElement>) => {
    const keys = useRef<Set<string>>(new Set());
    const mouse = useRef<Vector2>({ x: 0, y: 0 });
    const mouseDown = useRef(false);
    const rightMouseDown = useRef(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => keys.current.add(e.code);
        const handleKeyUp = (e: KeyboardEvent) => keys.current.delete(e.code);
        const handleMouseDown = (e: MouseEvent) => {
            if (e.button === 0) mouseDown.current = true;
            if (e.button === 2) rightMouseDown.current = true;
        };
        const handleMouseUp = (e: MouseEvent) => {
            if (e.button === 0) mouseDown.current = false;
            if (e.button === 2) rightMouseDown.current = false;
        };
        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault();
        };

        const handleMouseMove = (e: MouseEvent) => {
            const canvas = canvasRef.current;
            if (canvas) {
                const rect = canvas.getBoundingClientRect();
                const scaleX = CANVAS_WIDTH / rect.width;
                const scaleY = CANVAS_HEIGHT / rect.height;
                mouse.current = {
                    x: (e.clientX - rect.left) * scaleX,
                    y: (e.clientY - rect.top) * scaleY
                };
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        window.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('mouseup', handleMouseUp);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('contextmenu', handleContextMenu);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('mousedown', handleMouseDown);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('contextmenu', handleContextMenu);
        };
    }, []);

    return { keys, mouse, mouseDown, rightMouseDown };
};

export const GameCanvas: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { keys, mouseDown, rightMouseDown } = useInput(canvasRef);

    // Game State Refs
    const gameState = useRef<GameState>(GameState.MENU);
    const player = useRef<Player>({
        pos: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT - 100 },
        size: 8,
        color: COLORS.player,
        vel: { x: 0, y: 0 },
        hp: PLAYER_BASE_STATS.hp,
        maxHp: PLAYER_BASE_STATS.hp,
        speed: PLAYER_BASE_STATS.speed,
        dashCooldown: PLAYER_BASE_STATS.dashCooldown,
        dashTimer: 0,
        isDashing: false,
        invincibilityTimer: 0,
        shootCooldown: PLAYER_BASE_STATS.fireRate,
        damage: PLAYER_BASE_STATS.damage,
        projectileSpeed: PLAYER_BASE_STATS.projectileSpeed,
        projectileSize: PLAYER_BASE_STATS.projectileSize,
        slowTimer: 0,
        invertedControls: false,
        screenRotation: 0,
        playAreaScale: 1.0,
        secondaryWeapon: 'NONE',
        secondaryWeaponLevel: 0,
        secondaryCooldownTimer: 0,
        secondaryCooldownMax: 0,
        secondaryDamageMult: 1,
        activeDronesDuration: 0,
        droneChargeCount: 0,
        beamDuration: 0,
        shieldDuration: 0,
        chargeTimer: 0,
        isCharging: false,

        // Phase 2 Init
        jumpPower: SOUL_PHYSICS.jumpPower,
        krTimer: 0,
        krDamageAccumalator: 0,

        // Chapter 3 Specific
        ch3Grounded: true,
        ch3Jumping: false,
        ch3Crouching: false,
        parryTimer: 0
    });

    const currentChapter = useRef<number>(1); // 1, 2, or 3
    const ch3Coins = useRef<number>(0);
    const ch3WeaponsOwned = useRef<number[]>([1]); // Weapon IDs from CH3_WEAPONS
    const ch3Loadout = useRef<number[]>([1, -1]); // Indices/IDs of equipped weapons (Slot A, Slot B)
    const ch3LastBossDefeated = useRef<number>(0);

    const boss = useRef<Boss | null>(null);
    const bossCounters = useRef<Record<string, number>>({});
    const bullets = useRef<Bullet[]>([]);
    const particles = useRef<Particle[]>([]);
    const frameCount = useRef(0);
    const shakeIntensity = useRef(0);
    const currentBossIndex = useRef(0);
    const hudGlitch = useRef(0);
    const newGamePlusCount = useRef(0);
    const selectedCh3Slot = useRef(0); // 0 or 1

    // Chapter 2 State
    const ch2SoulColor = useRef<SoulColor>('RED');
    const ch2BoxW = useRef(CH2_BOX.baseW);
    const ch2BoxH = useRef(CH2_BOX.baseH);
    const ch2BoxOffsetX = useRef(0);
    const ch2ColorPhaseTimer = useRef(0);
    const ch2FightWindowTimer = useRef(0);
    const ch2IsFightAvailable = useRef(false);
    const ch2GlitchIntensity = useRef(0);

    // Chapter 3 UI State
    const [ch3CoinsUI, setCh3CoinsUI] = useState(0);
    const [ch3OwnedUI, setCh3OwnedUI] = useState<number[]>([1]);
    const [ch3LoadoutUI, setCh3LoadoutUI] = useState<number[]>([1, -1, -1]);
    const [unlockedChapters, setUnlockedChapters] = useState<number[]>([1]); // [1, 2, 3]
    const [selectedChapter, setSelectedChapter] = useState(1);
    const [startBossIndex, setStartBossIndex] = useState(0);

    // UI State
    const [uiState, setUiState] = useState<GameState>(GameState.MENU);
    const [bossHp, setBossHp] = useState({ current: 0, max: 100 });
    const [playerHp, setPlayerHp] = useState({ current: 0, max: 100 });
    const [availableUpgrades, setAvailableUpgrades] = useState<Upgrade[]>([]);
    const [bossName, setBossName] = useState("");
    const [bossModifiers, setBossModifiers] = useState<string[]>([]);
    const [collectedUpgrades, setCollectedUpgrades] = useState<{ upgrade: Upgrade; count: number }[]>([]);
    const [deathsUntilReset, setDeathsUntilReset] = useState(10);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordInput, setPasswordInput] = useState('');
    const [loginError, setLoginError] = useState(false);
    const [phase2Unlocked, setPhase2Unlocked] = useState(() => localStorage.getItem('boss_rush_phase2_unlocked') === 'true');
    const [adminWeaponLevel, setAdminWeaponLevel] = useState(0);
    const [godModeEnabled, setGodModeEnabled] = useState(false);
    const [chapter3Unlocked, setChapter3Unlocked] = useState(() => localStorage.getItem('boss_rush_chapter3_unlocked') === 'true');
    const isAdminAuthenticated = useRef(false);
    const secretRiftActive = useRef(false);
    const secretSequence = useRef<string[]>([]);
    const ch1SecondarySeenCount = useRef(0);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = ['DOWN', 'DOWN', 'RIGHT', 'RIGHT', 'UP'];
            let key = '';
            if (e.code === 'ArrowDown' || e.code === 'KeyS') key = 'DOWN';
            if (e.code === 'ArrowRight' || e.code === 'KeyD') key = 'RIGHT';
            if (e.code === 'ArrowUp' || e.code === 'KeyW') key = 'UP';

            if (key) {
                secretSequence.current.push(key);
                if (secretSequence.current.length > target.length) {
                    secretSequence.current.shift();
                }
                if (JSON.stringify(secretSequence.current) === JSON.stringify(target)) {
                    secretRiftActive.current = true;
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    useEffect(() => {
        // Check persistence
        try {
            const ph2Unlocked = localStorage.getItem('boss_rush_phase2_unlocked') === 'true';
            if (ph2Unlocked) {
                setPhase2Unlocked(true);
                setUnlockedChapters(prev => prev.includes(2) ? prev : [...prev, 2]);
            }

            const ch3Unlocked = localStorage.getItem('boss_rush_chapter3_unlocked') === 'true';
            if (ch3Unlocked) {
                setChapter3Unlocked(true);
                setUnlockedChapters(prev => prev.includes(3) ? prev : [...prev, 3]);
            }

            const ch3CoinsStore = localStorage.getItem('chapter3_coins');
            if (ch3CoinsStore) {
                ch3Coins.current = parseInt(ch3CoinsStore) || 0;
                setCh3CoinsUI(ch3Coins.current);
            }

            const ch3OwnedStore = localStorage.getItem('chapter3_weapons_owned');
            if (ch3OwnedStore) {
                const parsed = JSON.parse(ch3OwnedStore);
                if (Array.isArray(parsed)) {
                    ch3WeaponsOwned.current = parsed;
                    setCh3OwnedUI(ch3WeaponsOwned.current);
                }
            }

            const ch3LoadoutStore = localStorage.getItem('chapter3_loadout');
            if (ch3LoadoutStore) {
                const parsed = JSON.parse(ch3LoadoutStore);
                if (Array.isArray(parsed)) {
                    ch3Loadout.current = parsed.slice(0, 2);
                    setCh3LoadoutUI(ch3Loadout.current);
                }
            }

            const ch3CheckpointStore = localStorage.getItem('chapter3_checkpoint');
            if (ch3CheckpointStore) {
                const cp = JSON.parse(ch3CheckpointStore);
                if (cp && typeof cp.lastBossDefeated === 'number') {
                    ch3LastBossDefeated.current = cp.lastBossDefeated;
                }
            }
        } catch (e) {
            console.error("Save data corrupted, resetting to defaults", e);
        }
    }, []);

    const spawnParticles = (pos: Vector2, color: string, count: number, speed: number) => {
        // Optimization: Limit max particles based on game intensity
        const limit = boss.current?.type === BossType.AZATHOTH ? 300 : 500;
        if (particles.current.length > limit) return;

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const v = Math.random() * speed;
            particles.current.push({
                pos: { ...pos },
                vel: { x: Math.cos(angle) * v, y: Math.sin(angle) * v },
                size: Math.random() * 3 + 1,
                color: color,
                life: 1.0,
                maxLife: 1.0,
                decay: 0.02 + Math.random() * 0.03
            });
        }
    };

    const initBoss = (index: number) => {
        let config;
        let configIndex = index;

        if (currentChapter.current === 3) {
            configIndex = index % CH3_BOSS_CONFIGS.length;
            config = CH3_BOSS_CONFIGS[configIndex];
        } else {
            configIndex = index % BOSS_CONFIGS.length;
            config = BOSS_CONFIGS[configIndex];
        }

        if (!config) {
            gameState.current = GameState.VICTORY;
            setUiState(GameState.VICTORY);
            return;
        }

        setBossName(config.name);

        // Scaling Logic
        const encounters = bossCounters.current[config.name] || 0;
        const hpMultiplier = 1 + (Math.floor(encounters / 2) * 0.10);
        const ngpMultiplier = Math.pow(3, newGamePlusCount.current); // x3 per NG+ cycle
        const scaledHp = Math.floor(config.hp * hpMultiplier * ngpMultiplier);

        bossCounters.current[config.name] = encounters + 1;

        const activeMods = [];
        if (hpMultiplier > 1) {
            activeMods.push(`VETERAN SCALE: HP +${Math.round((hpMultiplier - 1) * 100)}%`);
        }
        if (newGamePlusCount.current > 0) {
            activeMods.push(`NEW GAME+${newGamePlusCount.current}: HP/DMG x${ngpMultiplier}`);
        }
        setBossModifiers(activeMods);

        player.current.screenRotation = 0;
        player.current.invertedControls = false;
        player.current.playAreaScale = 1.0;
        hudGlitch.current = 0;

        boss.current = {
            type: (currentChapter.current === 3 ? configIndex + 10 : configIndex) as BossType,
            pos: { x: currentChapter.current === 3 ? CANVAS_WIDTH * 0.75 : CANVAS_WIDTH / 2, y: currentChapter.current === 3 ? CH3_PHYSICS.groundY - (config.size || 50) : 100 },
            size: config.size,
            color: config.color,
            hp: scaledHp,
            maxHp: scaledHp,
            phase: 1,
            attackTimer: 0,
            state: 'IDLE',
            angle: 0,
            vel: { x: 0, y: 0 },
            customState: 'IDLE',
            name: config.name,
            description: config.description || "A formidable foe.",
            reward: config.reward || 0,
            slowTimer: 0,
            freezeTimer: 0,
            fireAccumulation: 0,
            iceAccumulation: 0,
            fireTimer: 0,
            modifiers: { damage: Math.pow(3, newGamePlusCount.current), fireRate: 1, moveSpeed: 1 }, // NG+ damage multiplier
            tentacles: configIndex === 4 && currentChapter.current === 1 ? Array(8).fill(0).map((_, i) => ({ angle: (Math.PI * 2 / 8) * i, length: 0, phase: i })) : undefined,
            realityGlitch: 0
        };
    };

    const startGame = (chapter: number = 1, startIdx: number = 0) => {
        let finalStartIdx = startIdx;
        if (chapter === 2 && startIdx < 5) finalStartIdx = 5;
        if (chapter === 3) finalStartIdx = 0; // Chapter 3 ALWAYS starts from the beginning

        currentChapter.current = chapter;
        currentBossIndex.current = finalStartIdx;

        ch1SecondarySeenCount.current = 0;
        let nextUpgrades = [...collectedUpgrades];
        let nextDeaths = deathsUntilReset;

        if (gameState.current === GameState.MENU) {
            nextUpgrades = [];
            nextDeaths = 10;
            bossCounters.current = {};
        } else if (gameState.current === GameState.GAME_OVER) {
            nextDeaths -= 1;
            if (nextDeaths <= 0) {
                nextUpgrades = [];
                nextDeaths = 10;
                bossCounters.current = {};
            }
        } else if (gameState.current === GameState.VICTORY) {
            nextDeaths = 10;
            newGamePlusCount.current += 1; // Increment NG+ counter on new game after victory
        } else if (gameState.current === GameState.ADMIN) {
            nextDeaths = 10;
            bossCounters.current = {};
        }

        // Reset Chapter 3 stats if starting new run or from menu
        if (chapter === 3 && (gameState.current === GameState.MENU || gameState.current === GameState.VICTORY)) {
            // Keep coins and owned weapons, but reset health etc
        }

        setCollectedUpgrades(nextUpgrades);
        setDeathsUntilReset(nextDeaths);

        player.current = {
            pos: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT - 100 },
            size: 8,
            color: COLORS.player,
            vel: { x: 0, y: 0 },
            hp: PLAYER_BASE_STATS.hp,
            maxHp: PLAYER_BASE_STATS.hp,
            speed: PLAYER_BASE_STATS.speed,
            dashCooldown: PLAYER_BASE_STATS.dashCooldown,
            dashTimer: 0,
            isDashing: false,
            invincibilityTimer: 0,
            shootCooldown: PLAYER_BASE_STATS.fireRate,
            damage: PLAYER_BASE_STATS.damage,
            projectileSpeed: PLAYER_BASE_STATS.projectileSpeed,
            projectileSize: PLAYER_BASE_STATS.projectileSize,
            slowTimer: 0,
            invertedControls: false,
            screenRotation: 0,
            secondaryWeapon: 'NONE',
            secondaryWeaponLevel: 0,
            secondaryCooldownTimer: 0,
            secondaryCooldownMax: 0,
            secondaryDamageMult: 1,
            activeDronesDuration: 0,
            droneChargeCount: 0,
            beamDuration: 0,
            shieldDuration: 0,
            chargeTimer: 0,
            isCharging: false,
            godMode: godModeEnabled,
            shieldDirection: 'UP',

            isSoulMode: (chapter === 2 && currentBossIndex.current >= 5), // Chapter 2 boss 5+ is soul mode
            gravityDir: { x: 0, y: 1 },
            isGrounded: false,
            jumpPower: SOUL_PHYSICS.jumpPower,
            krTimer: 0,
            krDamageAccumalator: 0,

            // Chapter 3 specific resets
            ch3Grounded: true,
            ch3Jumping: false,
            ch3Crouching: false,
            parryTimer: 0,
            ch3RollingTimer: 0,
            ch3RollingCooldown: 0,
            playAreaScale: 1.0
        };

        // Chapter 1 & 2 Specific Setup
        if (chapter === 2 && currentBossIndex.current >= 5) {
            player.current.pos = { x: CH2_BOX.cx, y: CH2_BOX.cy };
            player.current.speed = SOUL_PHYSICS.soulSpeed;
            player.current.size = 6;
            player.current.hp = 100;
            player.current.maxHp = 100;
            player.current.playAreaScale = 0.6;

            ch2BoxW.current = CH2_BOX.baseW;
            ch2BoxH.current = CH2_BOX.baseH;
            ch2BoxOffsetX.current = 0;
            ch2SoulColor.current = 'RED';
            ch2ColorPhaseTimer.current = 0;
            ch2GlitchIntensity.current = 0;
            ch2IsFightAvailable.current = false;
        } else if (chapter === 3) {
            player.current.pos = { x: 100, y: CH3_PHYSICS.groundY - 40 };
            player.current.size = 20; // Cartoon character is larger
            player.current.speed = CH3_PHYSICS.moveSpeed;
        }

        nextUpgrades.forEach(item => {
            for (let i = 0; i < item.count; i++) {
                if (item.upgrade.apply) item.upgrade.apply(player.current);
            }
        });

        player.current.hp = player.current.maxHp;
        bullets.current = [];
        particles.current = [];
        frameCount.current = 0;
        shakeIntensity.current = 0;
        hudGlitch.current = 0;
        ch2GlitchIntensity.current = 0;

        initBoss(currentBossIndex.current);

        gameState.current = GameState.PLAYING;
        setUiState(GameState.PLAYING);
    };

    const fireCh3Weapon = (slotIdx: number = 0) => {
        const p = player.current;
        const b = boss.current;
        const weaponId = ch3Loadout.current[slotIdx];

        if (weaponId === -1 || p.shootCooldown > 0) return;
        const weapon = CH3_WEAPONS.find(w => w.id === weaponId);
        if (!weapon) return;

        const damage = p.damage;

        // Calculate Direction
        let shootDirX = p.lastCh3Facing || 1;
        let shootDirY = 0;
        if (keys.current.has('KeyW') || keys.current.has('ArrowUp')) {
            shootDirY = -1;
            if (!keys.current.has('KeyA') && !keys.current.has('ArrowLeft') && !keys.current.has('KeyD') && !keys.current.has('ArrowRight')) shootDirX = 0;
        } else if (keys.current.has('KeyS') || keys.current.has('ArrowDown')) {
            shootDirY = 1;
            if (!keys.current.has('KeyA') && !keys.current.has('ArrowLeft') && !keys.current.has('KeyD') && !keys.current.has('ArrowRight')) shootDirX = 0;
        }
        const mag = Math.sqrt(shootDirX * shootDirX + shootDirY * shootDirY) || 1;
        const dirX = shootDirX / mag;
        const dirY = shootDirY / mag;

        const bulletY = p.ch3Crouching ? p.pos.y + 5 : p.pos.y - 15;
        const pos = { x: p.pos.x + (shootDirX * 25), y: bulletY };

        switch (weapon.effect) {
            case 'NORMAL':
                bullets.current.push({ pos, vel: { x: dirX * p.projectileSpeed, y: dirY * p.projectileSpeed }, size: p.projectileSize, color: '#facc15', isEnemy: false, damage, lifetime: 120 });
                break;
            case 'DOUBLE':
                bullets.current.push({
                    pos: { x: pos.x - dirY * 10, y: pos.y + dirX * 10 },
                    vel: { x: dirX * p.projectileSpeed, y: dirY * p.projectileSpeed },
                    size: p.projectileSize, color: '#facc15', isEnemy: false, damage: damage * 0.7, lifetime: 120
                });
                bullets.current.push({
                    pos: { x: pos.x + dirY * 10, y: pos.y - dirX * 10 },
                    vel: { x: dirX * p.projectileSpeed, y: dirY * p.projectileSpeed },
                    size: p.projectileSize, color: '#facc15', isEnemy: false, damage: damage * 0.7, lifetime: 120
                });
                break;
            case 'BEAM':
                p.beamDuration = 60;
                break;
            case 'EXPLOSIVE':
                bullets.current.push({ pos, vel: { x: dirX * p.projectileSpeed * 0.8, y: dirY * p.projectileSpeed * 0.8 }, size: 12, color: '#f97316', isEnemy: false, damage: damage * 2, lifetime: 120, clusterCount: 8, effect: 'EXPLOSIVE' });
                break;
            case 'BOOMERANG':
                bullets.current.push({ pos, vel: { x: dirX * 12, y: dirY * 12 }, size: 10, color: '#fbbf24', isEnemy: false, damage, lifetime: 120, bounces: 0, maxBounces: 1, effect: 'BOOMERANG' });
                break;
            case 'POISON':
                bullets.current.push({ pos, vel: { x: dirX * 5, y: dirY * 5 }, size: 15, color: '#22c55e', isEnemy: false, damage: damage * 0.2, lifetime: 200, effect: 'GAS' });
                break;
            case 'BOUNCE':
                bullets.current.push({ pos, vel: { x: dirX * 10, y: dirY * 10 }, size: 8, color: '#60a5fa', isEnemy: false, damage, lifetime: 300, bounces: 0, maxBounces: 5 });
                break;
            case 'SPREAD':
                const colors = ['#f472b6', '#fbbf24', '#60a5fa', '#34d399', '#facc15', '#fff'];
                for (let i = 0; i < 8; i++) {
                    const baseAngle = Math.atan2(dirY, dirX);
                    const angle = baseAngle + (Math.random() - 0.5) * 1.2;
                    const speed = 8 + Math.random() * 6;
                    bullets.current.push({
                        pos: { ...pos },
                        vel: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
                        size: 4 + Math.random() * 4,
                        color: colors[Math.floor(Math.random() * colors.length)],
                        isEnemy: false,
                        damage: damage * 0.4,
                        lifetime: 60 + Math.random() * 40
                    });
                }
                break;
            case 'TRIPLE':
                const tripleBaseAngle = Math.atan2(dirY, dirX);
                for (let i = -1; i <= 1; i++) {
                    const angle = tripleBaseAngle + i * 0.2;
                    bullets.current.push({ pos, vel: { x: Math.cos(angle) * 12, y: Math.sin(angle) * 12 }, size: 8, color: '#ef4444', isEnemy: false, damage, lifetime: 100, effect: 'BURN' });
                }
                break;
            case 'FREEZE':
                bullets.current.push({ pos, vel: { x: dirX * 15, y: dirY * 15 }, size: 12, color: '#bae6fd', isEnemy: false, damage: damage * 0.5, lifetime: 100, effect: 'FREEZE' });
                break;
            case 'HOMING':
                bullets.current.push({ pos, vel: { x: dirX * 8, y: dirY * 8 }, size: 10, color: '#c084fc', isEnemy: false, damage, lifetime: 200, homing: true });
                break;
            case 'STICKY':
                bullets.current.push({ pos, vel: { x: dirX * 10, y: dirY * 10 }, size: 8, color: '#f472b6', isEnemy: false, damage: damage * 0.5, lifetime: 300, attachedToBoss: false, isMine: true }); // Using Mine logic for sticky
                break;
            case 'WAVE':
                bullets.current.push({ pos, vel: { x: dirX * 8, y: dirY * 8 }, size: 100, color: 'rgba(255,255,255,0.2)', isEnemy: false, damage: damage * 1.5, lifetime: 40 });
                break;
            case 'HEAVY':
                bullets.current.push({ pos, vel: { x: dirX * 5, y: dirY * 5 }, size: 40, color: '#78350f', isEnemy: false, damage: damage * 5, lifetime: 150, effect: 'HEAVY' });
                shakeIntensity.current = 10;
                break;
            case 'MELEE':
                bullets.current.push({ pos, vel: { x: dirX * 2, y: dirY * 2 }, size: 80, color: 'rgba(255,255,255,0.5)', isEnemy: false, damage: damage * 10, lifetime: 15, effect: 'MELEE' });
                break;
            case 'THUNDER':
                if (b) {
                    for (let i = 0; i < 3; i++) {
                        const x = b.pos.x + (i - 1) * 100;
                        bullets.current.push({ pos: { x, y: 0 }, vel: { x: 0, y: 25 }, size: 30, color: '#facc15', isEnemy: false, damage: damage * 2, lifetime: 30, effect: 'THUNDER' });
                    }
                }
                break;
            case 'ORBITAL':
                for (let i = 0; i < 3; i++) {
                    bullets.current.push({ pos: { ...p.pos }, vel: { x: (Math.random() - 0.5) * 5, y: (Math.random() - 0.5) * 5 }, size: 20, color: 'rgba(255,255,255,0.4)', isEnemy: false, damage: damage * 0.5, lifetime: 600, effect: 'GHOST' });
                }
                break;
            case 'MIRROR':
                p.ch3MirrorTimer = 180; // 3 seconds of reflection
                bullets.current.push({ pos, vel: { x: dirX * p.projectileSpeed, y: dirY * p.projectileSpeed }, size: p.projectileSize, color: '#fff', isEnemy: false, damage, lifetime: 120 });
                break;
            case 'TIME_STOP':
                p.ch3TimeStopTimer = 180; // 3 seconds
                p.secondaryCooldownTimer = 1800; // 30s
                break;
            case 'ULTIMATE':
                bullets.current.push({ pos, vel: { x: dirX * 4, y: dirY * 4 }, size: 150, color: 'rgba(239, 68, 68, 0.4)', isEnemy: false, damage: damage * 10, lifetime: 300, piercing: true, effect: 'ULTIMATE' });
                p.secondaryCooldownTimer = 999999; // 1 use per life
                break;
        }

        if (weapon.effect !== 'TIME_STOP' && weapon.effect !== 'ULTIMATE') {
            p.shootCooldown = PLAYER_BASE_STATS.fireRate * 2;
        }
    };

    const fireSecondary = () => {
        // ... (Keep existing for Ch 1 & 2)
        const p = player.current;
        const b = boss.current;
        if (p.secondaryWeapon === 'NONE' || p.secondaryCooldownTimer > 0) return;

        const stats = SECONDARY_WEAPON_STATS[p.secondaryWeapon];
        const damage = stats.damage * p.secondaryDamageMult;
        const lvl = p.secondaryWeaponLevel;

        switch (p.secondaryWeapon) {
            case 'DRONES':
                p.activeDronesDuration = lvl >= 3 ? 360 : 300;
                if (lvl >= 3) p.droneChargeCount = 0;
                break;
            case 'BEAM':
                p.beamDuration = lvl >= 2 ? 90 : 60;
                if (lvl >= 3) {
                    shakeIntensity.current = 25;
                    spawnParticles(p.pos, '#a78bfa', 40, 12);
                }
                break;
            case 'MINE':
                {
                    let angle = -Math.PI / 2;
                    if (p.isSoulMode && b) angle = Math.atan2(b.pos.y - p.pos.y, b.pos.x - p.pos.x);
                    bullets.current.push({
                        pos: { ...p.pos }, vel: { x: Math.cos(angle) * 12, y: Math.sin(angle) * 12 }, size: 8, color: stats.color,
                        isEnemy: false, damage: damage * (lvl >= 1 ? 1.3 : 1), lifetime: 200, isMine: true
                    });
                }
                break;
            case 'EMP':
                bullets.current.forEach(bul => {
                    if (bul.isEnemy) {
                        if (lvl >= 3) { bul.vel = { x: 0, y: 0 }; bul.color = '#fff'; }
                        else { bul.lifetime = 0; spawnParticles(bul.pos, '#22d3ee', 3, 2); }
                    }
                });
                if (b) {
                    b.slowTimer = lvl >= 1 ? 400 : 300;
                    if (lvl >= 3) {
                        b.freezeTimer = 180;
                        hudGlitch.current = 15;
                        for (let i = 0; i < 5; i++) {
                            spawnParticles(p.pos, '#22d3ee', 20, 10 + i * 2);
                        }
                    }
                }
                shakeIntensity.current = lvl >= 3 ? 20 : 10;
                spawnParticles(p.pos, '#22d3ee', lvl >= 3 ? 200 : 100, lvl >= 3 ? 25 : 15);
                break;
            case 'FLAMETHROWER':
                {
                    const count = lvl >= 3 ? 60 : 30; // Buffed: Increased fire volume
                    const arc = lvl >= 3 ? Math.PI : 0.6; // Slightly wider arc
                    let baseAngle = -Math.PI / 2;
                    if (p.isSoulMode && b) baseAngle = Math.atan2(b.pos.y - p.pos.y, b.pos.x - b.pos.x);
                    for (let i = 0; i < count; i++) {
                        const angle = baseAngle + (Math.random() - 0.5) * arc;
                        const speed = 6 + Math.random() * (lvl >= 3 ? 15 : 6); // Faster particles
                        bullets.current.push({
                            pos: { ...p.pos }, vel: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
                            size: (6 + Math.random() * 4) * (lvl >= 3 ? 2.5 : 1), // Larger particles
                            color: lvl >= 3 ? (Math.random() > 0.6 ? '#fff' : (Math.random() > 0.3 ? '#60a5fa' : stats.color)) : stats.color,
                            isEnemy: false, damage: damage * (lvl >= 1 ? 1.5 : 1),
                            lifetime: (lvl >= 3 ? 50 : 45) + Math.random() * 25, effect: 'BURN' // Longer lifetime = Better range
                        });
                    }
                    if (lvl >= 3) shakeIntensity.current = 8; // More shake for power feel
                }
                break;
            case 'MISSILE':
                const mCount = lvl >= 3 ? 3 : 1;
                const startI = mCount === 1 ? 0 : -1;
                const endI = mCount === 1 ? 0 : 1;
                for (let i = startI; i <= endI; i++) {
                    bullets.current.push({
                        pos: { ...p.pos }, vel: { x: i * 5, y: -5 }, size: lvl >= 3 ? 25 : 10, color: stats.color,
                        isEnemy: false, damage: damage * (lvl >= 3 ? 3 : 1), lifetime: lvl >= 3 ? 600 : 300,
                        homing: true, clusterCount: lvl >= 2 ? (lvl >= 3 ? 8 : 5) : 0, isMissile: true
                    });
                }
                if (lvl >= 3) spawnParticles(p.pos, '#fff', 20, 5);
                break;
            case 'CRYO':
                {
                    let angle = -Math.PI / 2;
                    if (p.isSoulMode && b) angle = Math.atan2(b.pos.y - p.pos.y, b.pos.x - b.pos.x);
                    bullets.current.push({
                        pos: { ...p.pos }, vel: { x: Math.cos(angle) * 12, y: Math.sin(angle) * 12 }, size: 12 + (lvl * 2), color: stats.color,
                        isEnemy: false, damage: damage, lifetime: 100, effect: 'FREEZE'
                    });
                    if (lvl >= 3) {
                        shakeIntensity.current = 15;
                        for (let i = 0; i < 30; i++) {
                            const partAngle = Math.random() * Math.PI * 2;
                            const dist = Math.random() * 100;
                            spawnParticles({ x: p.pos.x + Math.cos(partAngle) * dist, y: p.pos.y + Math.sin(partAngle) * dist }, '#bae6fd', 10, 5);
                        }
                    }
                    spawnParticles(p.pos, '#bae6fd', lvl >= 3 ? 150 : 80, 15);
                }
                break;
            case 'SHIELD':
                p.shieldDuration = 180;
                break;
            case 'GRAVITY':
                {
                    let spawnPos = { x: p.pos.x, y: p.pos.y - 150 };
                    if (p.isSoulMode && b) {
                        spawnPos = { ...b.pos };
                    }
                    bullets.current.push({
                        pos: spawnPos, vel: { x: 0, y: 0 }, size: lvl >= 1 ? 5 : 2,
                        color: stats.color, isEnemy: false, damage: damage, lifetime: lvl >= 3 ? 400 : 300, effect: 'GRAVITY'
                    });
                }
                break;
            case 'OVERCHARGE':
                p.isCharging = true; p.chargeTimer = 0;
                if (lvl >= 3) {
                    shakeIntensity.current = 5;
                    spawnParticles(p.pos, '#f472b6', 20, 5);
                }
                break;
            case 'CH2_BONE_STRIKE':
                {
                    let angle = -Math.PI / 2;
                    if (p.isSoulMode && b) angle = Math.atan2(b.pos.y - p.pos.y, b.pos.x - b.pos.x);
                    const isLvl3 = lvl >= 3;
                    if (isLvl3) {
                        shakeIntensity.current = 20;
                        spawnParticles(p.pos, '#60a5fa', 15, 8);
                    }
                    bullets.current.push({
                        pos: { x: p.pos.x, y: p.pos.y }, vel: { x: Math.cos(angle) * 15, y: Math.sin(angle) * 15 }, size: 10 + (lvl * 5), color: isLvl3 ? '#60a5fa' : stats.color,
                        isEnemy: false, damage: damage * (lvl >= 1 ? 1.5 : 1), lifetime: 100, piercing: true, isBone: true, boneWidth: 20 + lvl * 10, boneHeight: 60 + lvl * 20,
                        effect: isLvl3 ? 'GLOW' : undefined
                    });
                }
                break;
            case 'CH2_PIXEL_BLAST':
                {
                    let baseAngle = -Math.PI / 2;
                    if (p.isSoulMode && b) baseAngle = Math.atan2(b.pos.y - p.pos.y, b.pos.x - b.pos.x);
                    const pixelCount = lvl >= 2 ? (lvl >= 3 ? 25 : 15) : 8;
                    for (let i = 0; i < pixelCount; i++) {
                        const angle = baseAngle + (Math.random() - 0.5) * (lvl >= 3 ? Math.PI * 1.2 : 0.8);
                        const speed = 8 + Math.random() * (lvl >= 3 ? 12 : 8);
                        const pColor = lvl >= 3 ? `hsl(${Math.random() * 360}, 80%, 60%)` : stats.color;
                        bullets.current.push({
                            pos: { ...p.pos }, vel: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
                            size: lvl >= 3 ? 8 : 6, color: pColor,
                            isEnemy: false, damage: damage, lifetime: 40 + Math.random() * 20
                        });
                    }
                    if (lvl >= 3) shakeIntensity.current = 10;
                }
                break;
            case 'CH2_VOID_NOTES':
                {
                    let baseAngle = -Math.PI / 2;
                    if (p.isSoulMode && b) baseAngle = Math.atan2(b.pos.y - p.pos.y, b.pos.x - b.pos.x);
                    const noteCount = lvl >= 3 ? 5 : (lvl >= 1 ? 3 : 1);
                    for (let i = 0; i < noteCount; i++) {
                        const angle = baseAngle + (i - (noteCount - 1) / 2) * (lvl >= 3 ? 0.3 : 0.5);
                        bullets.current.push({
                            pos: { ...p.pos }, vel: { x: Math.cos(angle) * 10, y: Math.sin(angle) * 10 }, size: lvl >= 3 ? 12 : 8, color: stats.color,
                            isEnemy: false, damage: damage, lifetime: 300, bounces: 0, maxBounces: lvl >= 3 ? 15 : 3,
                            effect: lvl >= 3 ? 'WAVE' : undefined
                        });
                    }
                }
                break;
            case 'CH2_GLITCH_BOMB':
                {
                    let angle = -Math.PI / 2;
                    if (p.isSoulMode && b) angle = Math.atan2(b.pos.y - p.pos.y, b.pos.x - b.pos.x);
                    bullets.current.push({
                        pos: { ...p.pos }, vel: { x: Math.cos(angle) * 8, y: Math.sin(angle) * 8 }, size: lvl >= 3 ? 25 : 15, color: lvl >= 3 ? '#ff00ff' : stats.color,
                        isEnemy: false, damage: damage * (lvl >= 1 ? 2 : 1), lifetime: 60, clusterCount: lvl >= 3 ? 20 : 6, effect: 'REALITY_BREAK'
                    });
                    if (lvl >= 3) hudGlitch.current = 20;
                }
                break;
            case 'CH2_KR_BEAM':
                p.beamDuration = lvl >= 3 ? 120 : (lvl >= 2 ? 60 : 30);
                shakeIntensity.current = lvl >= 3 ? 35 : 15;
                if (lvl >= 3) spawnParticles(p.pos, '#000', 30, 10);
                break;
        }

        if (p.secondaryWeapon !== 'OVERCHARGE') {
            p.secondaryCooldownTimer = p.secondaryCooldownMax;
            if (p.secondaryWeapon === 'BEAM' && lvl >= 1) p.secondaryCooldownTimer *= 0.7;
        }
    };

    const handleSecondaryLogic = () => {
        const p = player.current;
        const b = boss.current;
        const lvl = p.secondaryWeaponLevel;

        if (p.secondaryCooldownTimer > 0) p.secondaryCooldownTimer--;

        if (p.activeDronesDuration > 0) {
            p.activeDronesDuration--;
            if (p.activeDronesDuration % 10 === 0 && b) {
                for (let i = 0; i < 3; i++) {
                    const offsetAngle = (frameCount.current * 0.05) + (i * (Math.PI * 2 / 3));
                    const spawnX = p.pos.x + Math.cos(offsetAngle) * 40;
                    const spawnY = p.pos.y + Math.sin(offsetAngle) * 40;
                    const angle = Math.atan2(b.pos.y - spawnY, b.pos.x - spawnX);
                    bullets.current.push({
                        pos: { x: spawnX, y: spawnY }, vel: { x: Math.cos(angle) * 10, y: Math.sin(angle) * 10 },
                        size: lvl >= 3 ? 5 : 3, color: lvl >= 3 ? '#fff' : SECONDARY_WEAPON_STATS.DRONES.color, isEnemy: false,
                        damage: SECONDARY_WEAPON_STATS.DRONES.damage * p.secondaryDamageMult, lifetime: 100,
                        isDrone: true, piercing: lvl >= 1, droneSticky: lvl >= 3
                    });
                    if (lvl >= 3) {
                        spawnParticles({ x: spawnX, y: spawnY }, '#34d399', 2, 4);
                    }
                }
            }
            if (lvl >= 3 && p.activeDronesDuration === 1 && b && p.droneChargeCount > 0) {
                const dmg = p.droneChargeCount * (SECONDARY_WEAPON_STATS.DRONES.damage * p.secondaryDamageMult) * 2;
                b.hp -= dmg; shakeIntensity.current = 40; spawnParticles(b.pos, '#34d399', 100, 20);

                // FIX: Remove stuck drones visually when they explode
                for (let i = bullets.current.length - 1; i >= 0; i--) {
                    const bul = bullets.current[i];
                    if (bul.isDrone && bul.attachedToBoss) {
                        spawnParticles(bul.pos, '#34d399', 10, 5);
                        bullets.current.splice(i, 1);
                    }
                }
            }
        }

        if (p.beamDuration > 0 && b) {
            p.beamDuration--;
            const isSoul = p.isSoulMode;
            if (lvl >= 3) {
                // Level 3 beam always hits if boss is above player or in soul mode
                if (b.pos.y < p.pos.y || isSoul) {
                    b.hp -= (SECONDARY_WEAPON_STATS.BEAM.damage * p.secondaryDamageMult) * 2;
                    if (frameCount.current % 3 === 0) {
                        spawnParticles(b.pos, '#a78bfa', 8, 12);
                        spawnParticles(b.pos, '#fff', 4, 15);
                        shakeIntensity.current = Math.max(shakeIntensity.current, 5);
                    }
                }
            } else {
                // Lower levels require horizontal alignment or soul mode
                const hit = isSoul || (Math.abs(b.pos.x - p.pos.x) < (b.size + 10) && b.pos.y < p.pos.y);
                if (hit) {
                    let tickDmg = SECONDARY_WEAPON_STATS.BEAM.damage * p.secondaryDamageMult;
                    if (lvl >= 2) tickDmg *= 1.2;
                    b.hp -= tickDmg;
                    if (frameCount.current % 5 === 0) spawnParticles({ x: b.pos.x, y: b.pos.y + b.size }, '#a78bfa', 2, 5);
                }
            }
        }

        if (p.shieldDuration > 0) {
            p.shieldDuration--;
            bullets.current.forEach(bul => {
                if (bul.isEnemy) {
                    const dist = Math.sqrt((bul.pos.x - p.pos.x) ** 2 + (bul.pos.y - p.pos.y) ** 2);
                    const radius = lvl >= 1 ? 90 : 60;
                    if (dist < radius && bul.pos.y < p.pos.y) {
                        bul.isEnemy = false; bul.color = '#818cf8';
                        const reflectSpeed = lvl >= 3 ? 3.0 : 1.5;
                        bul.vel.x = -bul.vel.x * reflectSpeed; bul.vel.y = -bul.vel.y * reflectSpeed;
                        bul.lifetime = 100;
                        if (lvl >= 2) bul.damage *= 1.5; if (lvl >= 3) bul.damage *= 3;
                    }
                }
            });
        }

        if (p.isCharging) {
            const chargeRate = lvl >= 1 ? 2 : 1;
            p.chargeTimer += chargeRate;
            spawnParticles(p.pos, '#f472b6', 1, 2);
            if (p.chargeTimer >= 60) {
                p.isCharging = false;
                let dmg = SECONDARY_WEAPON_STATS.OVERCHARGE.damage * p.secondaryDamageMult;
                if (lvl >= 2) dmg *= 1.5;

                let angle = -Math.PI / 2;
                if (p.isSoulMode && b) angle = Math.atan2(b.pos.y - p.pos.y, b.pos.x - b.pos.x);

                if (lvl >= 3) {
                    bullets.current.push({
                        pos: { x: p.pos.x, y: p.pos.y - 20 }, vel: { x: Math.cos(angle) * 20, y: Math.sin(angle) * 20 }, size: 80, color: '#f472b6',
                        isEnemy: false, damage: dmg, lifetime: 10, isBeam: true
                    });
                    setTimeout(() => {
                        if (boss.current) {
                            boss.current.hp -= dmg * 2;
                            spawnParticles(boss.current.pos, '#f472b6', 80, 12);
                            spawnParticles(boss.current.pos, '#fff', 40, 15);
                            shakeIntensity.current = 40;
                            hudGlitch.current = 15;
                        }
                    }, 200);
                } else {
                    bullets.current.push({
                        pos: { x: p.pos.x, y: p.pos.y - 20 }, vel: { x: Math.cos(angle) * 20, y: Math.sin(angle) * 20 }, size: 50, color: '#f472b6',
                        isEnemy: false, damage: dmg, lifetime: 100
                    });
                }
                p.secondaryCooldownTimer = p.secondaryCooldownMax; shakeIntensity.current = 25;
            }
        }
    };

    const handleBossLogic = () => {
        if (!boss.current) return;
        const b = boss.current;

        // Chapter 2 bosses use their own logic
        if (b.type >= BossType.CH2_GUARDIAN) {
            handleCh2BossLogic();
            return;
        }

        if (b.freezeTimer > 0) { b.freezeTimer--; return; }
        if (b.slowTimer > 0) {
            b.slowTimer--;
            if (frameCount.current % 20 === 0) spawnParticles(b.pos, '#bae6fd', 2, 2);
        }

        const isSlowed = b.slowTimer > 0;
        if (isSlowed && frameCount.current % 2 === 0) return;

        const p = player.current;

        const hpPercent = b.hp / b.maxHp;
        if (b.type !== BossType.AZATHOTH) {
            if (hpPercent < 0.33 && b.phase < 3) { b.phase = 3; spawnParticles(b.pos, '#fff', 50, 10); shakeIntensity.current = 15; }
            else if (hpPercent < 0.66 && b.phase < 2) { b.phase = 2; spawnParticles(b.pos, '#fff', 30, 8); shakeIntensity.current = 10; }
        } else {
            // Azathoth Phases
            if (hpPercent < 0.20 && b.phase < 5) { b.phase = 5; b.activeEffect = "REALITY COLLAPSE"; shakeIntensity.current = 40; hudGlitch.current = 50; }
            else if (hpPercent < 0.40 && b.phase < 4) { b.phase = 4; b.activeEffect = "FALSE HOPE"; shakeIntensity.current = 20; }
            else if (hpPercent < 0.60 && b.phase < 3) { b.phase = 3; b.activeEffect = "EVENT HORIZON"; shakeIntensity.current = 20; }
            else if (hpPercent < 0.80 && b.phase < 2) { b.phase = 2; b.activeEffect = "NEURAL CORRUPTION"; shakeIntensity.current = 15; }
        }

        b.attackTimer++;

        // --- BOSS 1: SKELETON PRIME ---
        if (b.type === BossType.SKELETON_PRIME) {
            const fireRate = b.phase === 3 ? 10 : (b.phase === 2 ? 20 : 30);
            b.pos.x += Math.sin(frameCount.current * 0.05) * 2;

            // FASE 3: EFECTO INFERNAL
            if (b.phase === 3) {
                shakeIntensity.current = Math.max(shakeIntensity.current, 2);
                if (frameCount.current % 120 === 0) {
                    // Mega Láser Horizontal Aleatorio
                    const laserY = 100 + Math.random() * (CANVAS_HEIGHT - 200);
                    spawnParticles({ x: 0, y: laserY }, '#ef4444', 10, 5);
                    setTimeout(() => {
                        if (boss.current?.type === BossType.SKELETON_PRIME && boss.current.phase === 3) {
                            for (let i = 0; i < CANVAS_WIDTH; i += 30) {
                                bullets.current.push({ pos: { x: i, y: laserY }, vel: { x: 0, y: 0 }, size: 12, color: '#ef4444', isEnemy: true, damage: 20, lifetime: 40 });
                            }
                            shakeIntensity.current = 10;
                        }
                    }, 600);
                }
            }

            if (b.attackTimer % fireRate === 0) {
                const angle = Math.atan2(p.pos.y - b.pos.y, p.pos.x - b.pos.x);
                bullets.current.push({ pos: { ...b.pos }, vel: { x: Math.cos(angle) * 7, y: Math.sin(angle) * 7 }, size: 6, color: COLORS.enemyBullet, isEnemy: true, damage: 10, lifetime: 300 });
            }
            if (b.phase >= 2 && b.attackTimer % 180 === 0) {
                for (let i = 0; i < CANVAS_WIDTH; i += 40) {
                    if (Math.abs(i - p.pos.x) < 80) continue;
                    bullets.current.push({ pos: { x: i, y: -20 }, vel: { x: 0, y: 5 }, size: 10, color: COLORS.enemyBulletSpecial, isEnemy: true, damage: 15, lifetime: 200 });
                }
            }
        }
        // --- BOSS 2: KING SLAMMER ---
        else if (b.type === BossType.KING_PENGUIN) {
            if (b.state === 'IDLE' && b.attackTimer > 120) { b.state = 'MOVING'; b.moveTarget = { ...p.pos }; b.attackTimer = 0; }
            if (b.state === 'MOVING' && b.moveTarget) {
                const dx = b.moveTarget.x - b.pos.x; const dy = b.moveTarget.y - b.pos.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 10) { b.pos.x += (dx / dist) * 10; b.pos.y += (dy / dist) * 10; }
                else {
                    shakeIntensity.current = 20; b.state = 'IDLE';
                    for (let i = 0; i < 360; i += (b.phase === 3 ? 10 : 20)) {
                        const rad = (i * Math.PI) / 180;
                        bullets.current.push({ pos: { ...b.pos }, vel: { x: Math.cos(rad) * 6, y: Math.sin(rad) * 6 }, size: 5, color: COLORS.enemyBullet, isEnemy: true, damage: 15, lifetime: 100 });
                    }
                }
            }
        }
        // --- BOSS 3: CHANCE-O-TRON (OVERHAUL) ---
        else if (b.type === BossType.GAMBLE_BOT) {
            if (!b.modifiers) b.modifiers = { damage: 1, fireRate: 1, moveSpeed: 1 };
            if (b.rouletteTimer === undefined) b.rouletteTimer = 0;
            b.rouletteTimer++;

            // Roulette Logic (Faster Spin)
            if (b.rouletteState === 'IDLE' && b.rouletteTimer >= 500) { b.rouletteState = 'SPINNING'; b.rouletteSpinTimer = 90; spawnParticles(b.pos, '#fbbf24', 20, 5); }
            if (b.rouletteState === 'SPINNING') {
                b.rouletteSpinTimer = (b.rouletteSpinTimer || 0) - 1;
                if (b.rouletteSpinTimer <= 0) {
                    const roll = Math.random();
                    b.modifiers = { damage: 1, fireRate: 1, moveSpeed: 1 };
                    if (roll < 0.20) { b.hp = Math.min(b.maxHp, b.hp + b.maxHp * 0.10); b.activeEffect = "JACKPOT! HEAL +10%"; spawnParticles(b.pos, '#22c55e', 40, 8); }
                    else if (roll < 0.60) { b.modifiers.damage = 1.8; b.activeEffect = "HIGH ROLLER! DMG x1.8"; spawnParticles(b.pos, '#ef4444', 40, 8); }
                    else if (roll < 0.90) { b.modifiers.fireRate = 2.5; b.activeEffect = "BLITZ! RATE x2.5"; spawnParticles(b.pos, '#eab308', 40, 8); }
                    else { b.modifiers.fireRate = 0.5; b.modifiers.moveSpeed = 0.5; b.activeEffect = "BUST... SLOWED"; spawnParticles(b.pos, '#64748b', 40, 8); }
                    b.rouletteState = 'IDLE'; b.rouletteTimer = 0;
                }
            }

            b.pos.x = CANVAS_WIDTH / 2 + Math.sin(frameCount.current * 0.03 * b.modifiers.moveSpeed) * 200;

            // PHASE 1: DICE & CHIP STREAMS
            if (b.phase === 1) {
                // Explosive Dice
                if (b.attackTimer % Math.max(30, Math.floor(60 / b.modifiers.fireRate)) === 0) {
                    const angle = Math.atan2(p.pos.y - b.pos.y, p.pos.x - b.pos.x);
                    bullets.current.push({
                        pos: { ...b.pos }, vel: { x: Math.cos(angle) * 8, y: Math.sin(angle) * 8 },
                        size: 15, color: '#ffffff', isEnemy: true, damage: 15 * b.modifiers.damage, lifetime: 60,
                        clusterCount: 6 // Explodes on timeout
                    });
                }
                // Chip Streams
                if (b.attackTimer % Math.max(4, Math.floor(8 / b.modifiers.fireRate)) === 0) {
                    const spread = Math.sin(frameCount.current * 0.15);
                    bullets.current.push({
                        pos: { ...b.pos }, vel: { x: spread * 6, y: 7 },
                        size: 7, color: frameCount.current % 10 < 5 ? '#ef4444' : '#000000',
                        isEnemy: true, damage: 8 * b.modifiers.damage, lifetime: 200
                    });
                }
            }
            // PHASE 2: SLOT MACHINE BALLS (FIXED)
            else if (b.phase === 2) {
                // Slot Machine Projectiles (Falling Balls instead of stuck beams)
                if (b.attackTimer % 90 === 0) {
                    const count = 5;
                    for (let i = 0; i < count; i++) {
                        const startX = (CANVAS_WIDTH / count) * i + 40;
                        bullets.current.push({
                            pos: { x: startX, y: -20 }, vel: { x: (Math.random() - 0.5) * 1, y: 8 },
                            size: 25, color: '#ec4899', isEnemy: true, damage: 15 * b.modifiers.damage, lifetime: 120
                        });
                    }
                }
                // Ring Bursts
                if (b.attackTimer % 20 === 0) {
                    const angle = frameCount.current * 0.1;
                    for (let i = 0; i < 6; i++) {
                        const a = angle + (Math.PI * 2 / 6) * i;
                        bullets.current.push({
                            pos: { ...b.pos }, vel: { x: Math.cos(a) * 8, y: Math.sin(a) * 8 },
                            size: 6, color: '#eab308', isEnemy: true, damage: 10 * b.modifiers.damage, lifetime: 200
                        });
                    }
                }
            }
            // PHASE 3: JACKPOT STORM (Rain + Cards)
            else {
                // FASE 3: EFECTO NEÓN
                if (frameCount.current % 10 === 0) {
                    const colors = ['#f472b6', '#4ade80', '#fbbf24', '#60a5fa'];
                    spawnParticles(b.pos, colors[Math.floor(Math.random() * colors.length)], 5, 4);
                }

                // Coin Rain (Gravity)
                if (b.attackTimer % 3 === 0) {
                    bullets.current.push({
                        pos: { x: Math.random() * CANVAS_WIDTH, y: -20 },
                        vel: { x: (Math.random() - 0.5) * 2, y: 5 + Math.random() * 8 },
                        size: 8, color: '#eab308', isEnemy: true, damage: 12 * b.modifiers.damage, lifetime: 250,
                        effect: 'GRAVITY' // Reusing gravity visual/logic (black hole like, but falling down)
                    });
                }
                // Homing/Bouncing Cards
                if (b.attackTimer % 30 === 0) {
                    const angle = Math.random() * Math.PI * 2;
                    bullets.current.push({
                        pos: { ...b.pos }, vel: { x: Math.cos(angle) * 7, y: Math.sin(angle) * 7 },
                        size: 12, color: '#fff', isEnemy: true, damage: 18 * b.modifiers.damage, lifetime: 300,
                        curve: 0.08, homing: true // Aggressive tracking
                    });
                }
            }
        }
        // --- BOSS 4: VOID REAPER (BUFFED PHASE 3) ---
        else if (b.type === BossType.VOID_REAPER) {
            b.pos.x += (CANVAS_WIDTH / 2 - b.pos.x) * 0.05; b.pos.y += (CANVAS_HEIGHT / 2 - b.pos.y) * 0.05;

            // Arm logic
            const arms = b.phase * 2 + 2;
            const spinSpeed = b.phase === 3 ? 0.15 : 0.05 * b.phase; // Triple speed in P3

            if (b.attackTimer % (b.phase === 3 ? 2 : 4) === 0) {
                for (let i = 0; i < arms; i++) {
                    const angle = (frameCount.current * spinSpeed) + (Math.PI * 2 / arms) * i;
                    bullets.current.push({ pos: { ...b.pos }, vel: { x: Math.cos(angle) * (b.phase === 3 ? 8 : 5), y: Math.sin(angle) * (b.phase === 3 ? 8 : 5) }, size: 4, color: COLORS.enemyBullet, isEnemy: true, damage: 8, lifetime: 400 });
                }
            }

            // BUFFED PHASE 3: VOID STORM
            if (b.phase === 3) {
                // 1. Random Void Slashes
                if (b.attackTimer % 20 === 0) {
                    const isHorizontal = Math.random() > 0.5;
                    const fixed = Math.random() * (isHorizontal ? CANVAS_HEIGHT : CANVAS_WIDTH);
                    // Warning line
                    spawnParticles(isHorizontal ? { x: CANVAS_WIDTH / 2, y: fixed } : { x: fixed, y: CANVAS_HEIGHT / 2 }, '#7f1d1d', 5, 10);

                    setTimeout(() => {
                        for (let i = 0; i < (isHorizontal ? CANVAS_WIDTH : CANVAS_HEIGHT); i += 20) {
                            bullets.current.push({
                                pos: isHorizontal ? { x: i, y: fixed } : { x: fixed, y: i },
                                vel: isHorizontal ? { x: 0, y: (Math.random() - 0.5) * 2 } : { x: (Math.random() - 0.5) * 2, y: 0 },
                                size: 6, color: '#7f1d1d', isEnemy: true, damage: 15, lifetime: 60
                            });
                        }
                    }, 500); // 0.5s delay before slash
                }

                // 2. Void Rain (Top down fast)
                if (b.attackTimer % 5 === 0) {
                    bullets.current.push({
                        pos: { x: Math.random() * CANVAS_WIDTH, y: -10 },
                        vel: { x: 0, y: 12 },
                        size: 5, color: '#000', isEnemy: true, damage: 10, lifetime: 100
                    });
                }
            }
        }
        // --- BOSS 5: AZATHOTH ---
        else if (b.type === BossType.AZATHOTH) {
            // Tentacle Animation
            b.tentacles?.forEach((t, i) => {
                t.angle += 0.02 * (i % 2 === 0 ? 1 : -1);
                t.length = 150 + Math.sin(frameCount.current * 0.05 + i) * 50;
            });

            // PHASE 1: NON-EUCLIDEAN (Rotation)
            if (b.phase >= 1) {
                p.screenRotation = Math.sin(frameCount.current * 0.01) * 0.15; // Slow chaotic rotation
                if (b.attackTimer % 5 === 0) {
                    const spiralAngle = (frameCount.current * 0.1);
                    bullets.current.push({
                        pos: { ...b.pos },
                        vel: { x: Math.cos(spiralAngle) * 4, y: Math.sin(spiralAngle) * 4 },
                        size: 6, color: '#a855f7', isEnemy: true, damage: 10, lifetime: 400, curve: 0.02
                    });
                }
            }

            // PHASE 2: NEURAL CORRUPTION (Inverted Controls)
            if (b.phase >= 2) {
                if (frameCount.current % 600 < 300) {
                    if (!p.invertedControls) spawnParticles(p.pos, '#ef4444', 20, 5);
                    p.invertedControls = true;
                } else {
                    if (p.invertedControls) spawnParticles(p.pos, '#22c55e', 20, 5);
                    p.invertedControls = false;
                }
            }

            // PHASE 3: EVENT HORIZON (Shrinking Arena)
            if (b.phase >= 3) {
                p.playAreaScale = 0.7 + Math.sin(frameCount.current * 0.02) * 0.2; // Pulsing arena
                if (b.attackTimer % 60 === 0) {
                    // Giant wall laser
                    bullets.current.push({
                        pos: { x: Math.random() * CANVAS_WIDTH, y: 0 },
                        vel: { x: 0, y: 8 },
                        size: 40, color: '#4c1d95', isEnemy: true, damage: 20, lifetime: 100, isBeam: true
                    });
                }
            }

            // PHASE 4: FALSE HOPE (Fake Safe Zones)
            if (b.phase >= 4) {
                if (b.attackTimer % 180 === 0) {
                    // Spawn Safe Zone Marker
                    bullets.current.push({
                        pos: { x: Math.random() * CANVAS_WIDTH * 0.8 + 50, y: Math.random() * CANVAS_HEIGHT * 0.8 + 50 },
                        vel: { x: 0, y: 0 }, size: 80, color: '#22c55e', isEnemy: true, damage: 0, lifetime: 120,
                        isSafeZone: true, safeZoneTimer: 120
                    });
                }
            }

            // PHASE 5: REALITY COLLAPSE (HUD Break, Chaos)
            if (b.phase >= 5) {
                hudGlitch.current = Math.random() * 20;
                p.screenRotation += Math.sin(frameCount.current * 0.1) * 0.05; // Intense shake
                if (b.attackTimer % 2 === 0) {
                    // Pure chaos
                    const a = Math.random() * Math.PI * 2;
                    bullets.current.push({
                        pos: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 },
                        vel: { x: Math.cos(a) * 6, y: Math.sin(a) * 6 },
                        size: 4, color: Math.random() > 0.5 ? '#000' : '#fff', isEnemy: true, damage: 15, lifetime: 200
                    });
                }
            }
        }
    };

    // ═══════════════════════════════════════════════
    // CHAPTER 3 BOSS LOGIC
    // ═══════════════════════════════════════════════
    const handleCh3BossLogic = () => {
        const b = boss.current;
        const p = player.current;
        if (!b) return;

        if (!(b.paralysisTimer !== undefined && b.paralysisTimer > 0)) {
            b.attackTimer++;
        }

        // Phase Transitions
        if (b.hp < b.maxHp * 0.33 && b.phase === 2) {
            b.phase = 3;
            spawnParticles(b.pos, '#fff', 50, 10);
            shakeIntensity.current = 20;
        } else if (b.hp < b.maxHp * 0.66 && b.phase === 1) {
            b.phase = 2;
            spawnParticles(b.pos, '#fff', 30, 8);
            shakeIntensity.current = 15;
        }

        // --- ELEMENTAL STATUSES (Ch3 Only) ---
        // Decay accumulation bars over time so they drain if you stop hitting
        // Decay accumulations
        const decay = 0.05;
        if (b.fireAccumulation !== undefined && b.fireAccumulation > 0) b.fireAccumulation = Math.max(0, b.fireAccumulation - decay);
        if (b.iceAccumulation !== undefined && b.iceAccumulation > 0) b.iceAccumulation = Math.max(0, b.iceAccumulation - decay);
        if (b.stunAccumulation !== undefined && b.stunAccumulation > 0) b.stunAccumulation = Math.max(0, b.stunAccumulation - decay);
        if (b.paralysisAccumulation !== undefined && b.paralysisAccumulation > 0) b.paralysisAccumulation = Math.max(0, b.paralysisAccumulation - decay);

        // Burn: deals damage over time and spawns fire particles
        if (b.fireTimer !== undefined && b.fireTimer > 0) {
            b.fireTimer--;
            if (b.fireTimer % 8 === 0) {
                b.hp = Math.max(0, b.hp - p.damage * 0.3);
                spawnParticles({ x: b.pos.x + (Math.random() - 0.5) * b.size, y: b.pos.y - b.size * 0.5 }, '#f97316', 3, 3);
            }
        }

        // Freeze: boss moves slower and freezeTimer ticks down
        if (b.freezeTimer !== undefined && b.freezeTimer > 0) {
            b.freezeTimer--;
            if (b.freezeTimer % 12 === 0) spawnParticles(b.pos, '#bae6fd', 2, 2);
        }

        // Stun: stops boss movement and spawns yellow particles
        if (b.stunTimer !== undefined && b.stunTimer > 0) {
            b.stunTimer--;
            if (b.stunTimer % 10 === 0) spawnParticles(b.pos, '#facc15', 3, 3);
        }

        if (b.paralysisTimer !== undefined && b.paralysisTimer > 0) {
            b.paralysisTimer--;
            if (b.paralysisTimer === 0) b.paralysisImmunityTimer = 120; // 2s recovery
            if (b.paralysisTimer % 10 === 0) spawnParticles(b.pos, '#818cf8', 2, 2);
        }

        if (b.paralysisImmunityTimer !== undefined && b.paralysisImmunityTimer > 0) {
            b.paralysisImmunityTimer--;
        }

        // --- STUN GUARD ---
        if (b.stunTimer !== undefined && b.stunTimer > 0) return;

        // --- BOSS 1: MORTIMER EL PAYASO (Clown) ---
        if (b.type === BossType.CH3_MORTIMER) {
            const freq = b.phase === 3 ? 35 : (b.phase === 2 ? 55 : 75);

            if (b.attackTimer % freq === 0) {
                let attackType = Math.floor(Math.random() * (b.phase >= 2 ? 4 : 3));

                // Mirror Counter: Prioritize Bumper Car Charge
                if (p.ch3MirrorTimer && p.ch3MirrorTimer > 0 && Math.random() > 0.3) {
                    attackType = 2;
                }

                if (attackType === 0) {
                    // Juggling Balls
                    for (let i = 0; i < (b.phase * 3) + 2; i++) {
                        bullets.current.push({
                            pos: { x: b.pos.x - 50, y: b.pos.y - 100 },
                            vel: { x: -3 - Math.random() * 8, y: -5 - Math.random() * 10 },
                            size: 15, color: (i % 2 === 0 ? '#ef4444' : '#3b82f6'),
                            isEnemy: true, damage: 15, lifetime: 200, hasGravity: true
                        });
                    }
                } else if (attackType === 1) {
                    // Honk Honk!
                    for (let i = 0; i < 8 + b.phase * 4; i++) {
                        const targetAngle = Math.atan2(p.pos.y - b.pos.y, p.pos.x - b.pos.x);
                        const angle = targetAngle + (i / 10) - 0.5;
                        bullets.current.push({
                            pos: { x: b.pos.x - 30, y: b.pos.y },
                            vel: { x: Math.cos(angle) * 12, y: Math.sin(angle) * 12 },
                            size: 10, color: '#facc15', isEnemy: true, damage: 10, lifetime: 120, canSplit: true
                        });
                    }
                } else if (attackType === 2) {
                    // Bumper Car Charge
                    b.vel.x = -15 - (b.phase * 5);
                    b.customState = 'CHARGING';
                } else if (attackType === 3 && b.phase >= 2) {
                    // Phase 2 New: Exploding Balloon Animals
                    for (let i = 0; i < 3; i++) {
                        bullets.current.push({
                            pos: { x: b.pos.x - 50, y: b.pos.y + (i - 1) * 80 },
                            vel: { x: -4, y: (Math.random() - 0.5) * 4 },
                            size: 25, color: i === 0 ? '#f472b6' : (i === 1 ? '#60a5fa' : '#34d399'),
                            isEnemy: true, damage: 20, lifetime: 120, clusterCount: 10 // clusterCount triggers explosion on death
                        });
                    }
                }
            }

            if (b.phase === 3 && frameCount.current % 10 === 0) {
                // Phase 3: Dangerous Confetti Trail
                bullets.current.push({
                    pos: { x: b.pos.x, y: b.pos.y },
                    vel: { x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 2 },
                    size: 6, color: `hsl(${Math.random() * 360}, 70%, 50%)`,
                    isEnemy: true, damage: 5, lifetime: 60
                });
            }

            if (b.customState === 'CHARGING') {
                b.pos.x += b.vel.x;
                if (b.pos.x < 50) {
                    b.pos.x = 50;
                    b.vel.x = 8;
                    b.customState = 'RETURNING';
                    shakeIntensity.current = 15;
                }
            } else if (b.customState === 'RETURNING') {
                b.pos.x += b.vel.x;
                if (b.pos.x >= CANVAS_WIDTH * 0.75) {
                    b.pos.x = CANVAS_WIDTH * 0.75;
                    b.customState = 'IDLE';
                }
            } else {
                let speedMult = b.phase === 3 ? 1.5 : 1.0;
                if (!b.targetPos) b.targetPos = { x: CANVAS_WIDTH * 0.75, y: CANVAS_HEIGHT * 0.5 };
                if (frameCount.current % 120 === 0) {
                    b.targetPos = {
                        x: Math.max(100, Math.min(CANVAS_WIDTH - 100, b.pos.x + (Math.random() - 0.5) * 400)),
                        y: Math.max(100, Math.min(CANVAS_HEIGHT - 100, b.pos.y + (Math.random() - 0.5) * 300))
                    };
                }
                b.pos.x += (b.targetPos.x - b.pos.x) * 0.02 * speedMult;
                b.pos.y += (b.targetPos.y - b.pos.y) * 0.02 * speedMult;
            }
        }

        // --- BOSS 2: LA BARONESA VERMILLION (Vampire) ---
        else if (b.type === BossType.CH3_VERMILLION) {
            const freq = b.phase === 3 ? 25 : (b.phase === 2 ? 40 : 55);

            if (b.attackTimer % freq === 0) {
                let attackType = Math.floor(Math.random() * (b.phase >= 2 ? 4 : 3));

                // Mirror Counter: Prioritize Cloak Sweep
                if (p.ch3MirrorTimer && p.ch3MirrorTimer > 0 && Math.random() > 0.3) {
                    attackType = 2;
                }

                if (attackType === 0) {
                    // Bats (Homing Sweep)
                    for (let i = 0; i < 3 + b.phase; i++) {
                        const angle = Math.atan2(p.pos.y - (b.pos.y + (i - 1) * 50), p.pos.x - b.pos.x);
                        bullets.current.push({
                            pos: { x: b.pos.x, y: b.pos.y + (i - 1) * 50 },
                            vel: { x: Math.cos(angle) * 10, y: Math.sin(angle) * 10 },
                            size: 12, color: '#000', isEnemy: true, damage: 15, lifetime: 120,
                            effect: 'HOMING_SOFT'
                        });
                    }
                } else if (attackType === 1) {
                    // Blood Wine (Parabolic Drops)
                    for (let i = 0; i < 15 + b.phase * 5; i++) {
                        bullets.current.push({
                            pos: { x: b.pos.x - Math.random() * 500, y: -20 },
                            vel: { x: 0, y: 5 + Math.random() * 5 },
                            size: 8, color: '#991b1b', isEnemy: true, damage: 10, lifetime: 150
                        });
                    }
                } else if (attackType === 2) {
                    // Vampire Cloak Sweep
                    const angle = Math.atan2(p.pos.y - b.pos.y, p.pos.x - b.pos.x);
                    bullets.current.push({
                        pos: { x: b.pos.x, y: b.pos.y },
                        vel: { x: Math.cos(angle) * 20, y: Math.sin(angle) * 20 },
                        size: 80, color: 'rgba(127, 29, 29, 0.5)', isEnemy: true, damage: 25, lifetime: 60
                    });
                } else if (attackType === 3 && b.phase >= 2) {
                    // Phase 2 New: Shadow Step (Teleport)
                    spawnParticles(b.pos, '#000', 30, 5);
                    b.pos.x = 100 + Math.random() * (CANVAS_WIDTH - 200);
                    b.pos.y = 100 + Math.random() * (CANVAS_HEIGHT - 300);
                    spawnParticles(b.pos, '#000', 30, 5);
                    // Leave bats behind
                    for (let a = 0; a < Math.PI * 2; a += 0.8) {
                        bullets.current.push({
                            pos: { ...b.pos }, vel: { x: Math.cos(a) * 5, y: Math.sin(a) * 5 },
                            size: 10, color: '#1e1b4b', isEnemy: true, damage: 15, lifetime: 100
                        });
                    }
                }
            }

            if (b.phase === 3 && frameCount.current % 20 === 0) {
                // Phase 3: Constant Blood Rain
                bullets.current.push({
                    pos: { x: Math.random() * CANVAS_WIDTH, y: -20 },
                    vel: { x: (Math.random() - 0.5) * 2, y: 6 },
                    size: 6, color: '#7f1d1d', isEnemy: true, damage: 8, lifetime: 120
                });
            }

            // Vermillion AI: Swooping movement independent of player X
            if (!b.targetPos) b.targetPos = { x: CANVAS_WIDTH * 0.8, y: CANVAS_HEIGHT * 0.3 };
            if (frameCount.current % 90 === 0) {
                b.targetPos = {
                    x: Math.max(50, Math.min(CANVAS_WIDTH - 50, CANVAS_WIDTH * Math.random())),
                    y: Math.max(50, Math.min(CANVAS_HEIGHT - 200, CANVAS_HEIGHT * Math.random()))
                };
            }
            b.pos.x += (b.targetPos.x - b.pos.x) * 0.015;
            b.pos.y += (b.targetPos.y - b.pos.y) * 0.015;
        }

        // --- BOSS 3: DR. VERDOLAGA (Botanist) ---
        else if (b.type === BossType.CH3_VERDOLAGA) {
            const freq = b.phase === 3 ? 25 : (b.phase === 2 ? 40 : 55);

            if (b.attackTimer % freq === 0) {
                let attackType = Math.floor(Math.random() * (b.phase >= 2 ? 4 : 3));

                // Mirror Counter: Prioritize Root Surge
                if (p.ch3MirrorTimer && p.ch3MirrorTimer > 0 && Math.random() > 0.3) {
                    attackType = 2;
                }

                if (attackType === 0) {
                    // Seed Spitting (Multi-shot)
                    for (let i = 0; i < 5 + b.phase * 2; i++) {
                        setTimeout(() => {
                            if (!boss.current) return;
                            const targetAngle = Math.atan2(p.pos.y - boss.current.pos.y, p.pos.x - boss.current.pos.x);
                            const spread = (Math.random() - 0.5) * 0.5;
                            bullets.current.push({
                                pos: { x: boss.current.pos.x, y: boss.current.pos.y },
                                vel: { x: Math.cos(targetAngle + spread) * 10, y: Math.sin(targetAngle + spread) * 10 },
                                size: 10, color: '#16a34a', isEnemy: true, damage: 12, lifetime: 120
                            });
                        }, i * 100);
                    }
                } else if (attackType === 1) {
                    // Toxic Gas (Large slow clouds)
                    const angle = Math.atan2(p.pos.y - b.pos.y, p.pos.x - b.pos.x);
                    bullets.current.push({
                        pos: { x: b.pos.x, y: b.pos.y },
                        vel: { x: Math.cos(angle) * 3, y: Math.sin(angle) * 3 },
                        size: 90, color: 'rgba(34, 197, 94, 0.3)', isEnemy: true, damage: 5, lifetime: 200, effect: 'GAS'
                    });
                } else if (attackType === 2) {
                    // Root Surge
                    for (let x = 100; x < CANVAS_WIDTH - 200; x += 150) {
                        bullets.current.push({
                            pos: { x, y: CH3_PHYSICS.groundY + 50 },
                            vel: { x: 0, y: -20 },
                            size: 30, color: '#4d7c0f', isEnemy: true, damage: 25, lifetime: 30
                        });
                    }
                } else if (attackType === 3 && b.phase >= 2) {
                    // Phase 2 New: Thorny Vines (Ground Hazards)
                    for (let i = 0; i < 3; i++) {
                        bullets.current.push({
                            pos: { x: 100 + Math.random() * (CANVAS_WIDTH - 200), y: CH3_PHYSICS.groundY - 20 },
                            vel: { x: 0, y: 0 },
                            size: 40, color: '#166534', isEnemy: true, damage: 15, lifetime: 180, isBone: true, boneWidth: 20, boneHeight: 80
                        });
                    }
                }
            }

            if (b.phase === 3 && frameCount.current % 40 === 0) {
                // Phase 3: Spores Overload (Tracking spores)
                bullets.current.push({
                    pos: { x: b.pos.x, y: b.pos.y },
                    vel: { x: (p.pos.x - b.pos.x) * 0.05, y: (p.pos.y - b.pos.y) * 0.05 },
                    size: 30, color: 'rgba(22, 101, 52, 0.6)', isEnemy: true, damage: 10, lifetime: 150, effect: 'GAS'
                });
            }

            // Verdolaga AI: Move back and forth aggressively
            if (!b.targetPos) b.targetPos = { x: CANVAS_WIDTH * 0.9, y: CANVAS_HEIGHT * 0.5 };
            if (frameCount.current % 150 === 0) {
                b.targetPos = {
                    x: Math.max(200, Math.min(CANVAS_WIDTH - 100, b.pos.x + (Math.random() - 0.5) * 500)),
                    y: Math.max(100, Math.min(CANVAS_HEIGHT - 100, CANVAS_HEIGHT * Math.random()))
                };
            }
            b.pos.x += (b.targetPos.x - b.pos.x) * 0.02;
            b.pos.y += (b.targetPos.y - b.pos.y) * 0.02;
        }

        // --- BOSS 4: CARAMELA LA HECHICERA (Candy Witch) ---
        else if (b.type === BossType.CH3_CARAMELA) {
            const freq = b.phase === 3 ? 15 : (b.phase === 2 ? 30 : 45);

            if (b.attackTimer % freq === 0) {
                let attackType = Math.floor(Math.random() * (b.phase >= 2 ? 4 : 3));

                // Mirror Counter: Prioritize Sticky/Spiral and move in
                if (p.ch3MirrorTimer && p.ch3MirrorTimer > 0) {
                    b.targetPos = { x: p.pos.x + (p.pos.x < b.pos.x ? 50 : -50), y: p.pos.y };
                    attackType = Math.random() > 0.5 ? 1 : 2;
                }

                if (attackType === 0) {
                    // Candy Rain (Parabolic)
                    for (let i = 0; i < 10 + b.phase * 5; i++) {
                        bullets.current.push({
                            pos: { x: b.pos.x, y: b.pos.y },
                            vel: { x: -5 - Math.random() * 10, y: -10 - Math.random() * 5 },
                            size: 10, color: `hsl(${Math.random() * 360}, 70%, 70%)`, isEnemy: true, damage: 15, lifetime: 200, hasGravity: true
                        });
                    }
                } else if (attackType === 1) {
                    // Sticky Bubblegum
                    const angle = Math.atan2(p.pos.y - b.pos.y, p.pos.x - b.pos.x);
                    bullets.current.push({
                        pos: { x: b.pos.x, y: b.pos.y },
                        vel: { x: Math.cos(angle) * 12, y: Math.sin(angle) * 12 },
                        size: 40, color: '#f472b6', isEnemy: true, damage: 10, lifetime: 120, effect: 'SLOW_PLAYER'
                    });
                } else if (attackType === 2) {
                    // Sweets Spiral (Sugar Storm)
                    const count = 12 + b.phase * 4;
                    for (let i = 0; i < count; i++) {
                        const angle = (i / count) * Math.PI * 2;
                        bullets.current.push({
                            pos: { x: b.pos.x, y: b.pos.y },
                            vel: { x: Math.cos(angle) * 6, y: Math.sin(angle) * 6 },
                            size: 12, color: '#fb7185', isEnemy: true, damage: 20, lifetime: 180, effect: 'SPIRAL'
                        });
                    }
                } else if (attackType === 3 && b.phase >= 2) {
                    // Phase 2/3 New: Cookie March (Rolling projectiles)
                    for (let i = 0; i < 2; i++) {
                        const fromRight = Math.random() > 0.5;
                        const spawnX = fromRight ? CANVAS_WIDTH : 0;
                        const velX = fromRight ? -6 - Math.random() * 4 : 6 + Math.random() * 4;
                        bullets.current.push({
                            pos: { x: spawnX, y: CH3_PHYSICS.groundY - 30 },
                            vel: { x: velX, y: 0 },
                            size: 30, color: '#92400e', isEnemy: true, damage: 20, lifetime: 200, effect: 'SPIRAL'
                        });
                    }
                }
            }

            if (b.phase === 3 && frameCount.current % 100 === 0) {
                // Phase 3: Giant Jawbreaker
                const angle = Math.atan2(p.pos.y - b.pos.y, p.pos.x - b.pos.x);
                bullets.current.push({
                    pos: { x: b.pos.x, y: b.pos.y },
                    vel: { x: Math.cos(angle) * 5, y: Math.sin(angle) * 5 },
                    size: 60, color: `hsl(${frameCount.current % 360}, 80%, 60%)`, isEnemy: true, damage: 30, lifetime: 250, canSplit: true
                });
            }

            // Caramela AI: Glide smoothly
            if (!b.targetPos) b.targetPos = { x: CANVAS_WIDTH * 0.8, y: CANVAS_HEIGHT * 0.5 };

            // Mirror Counter: Move aggressively closer
            if (p.ch3MirrorTimer && p.ch3MirrorTimer > 0) {
                b.pos.x += ((p.pos.x + (p.pos.x < b.pos.x ? 50 : -50)) - b.pos.x) * 0.05;
                b.pos.y += (p.pos.y - b.pos.y) * 0.05;
            } else {
                if (frameCount.current % 60 === 0) {
                    b.targetPos = {
                        x: Math.max(100, Math.min(CANVAS_WIDTH - 100, b.pos.x + (Math.random() - 0.5) * 300)),
                        y: Math.max(100, Math.min(CANVAS_HEIGHT - 100, b.pos.y + (Math.random() - 0.5) * 300))
                    };
                }
                b.pos.x += (b.targetPos.x - b.pos.x) * 0.015;
                b.pos.y += (b.targetPos.y - b.pos.y) * 0.015;
            }
        }

        // --- BOSS 5: EL GRAN DIABLO SCRATCH (The Devil) ---
        else if (b.type === BossType.CH3_SCRATCH) {
            const freq = b.phase === 3 ? 15 : (b.phase === 2 ? 30 : 45);

            // Constant hellfire particles in Phase 3
            if (b.phase === 3 && frameCount.current % 10 === 0) {
                spawnParticles({ x: Math.random() * CANVAS_WIDTH, y: CH3_PHYSICS.groundY }, '#ef4444', 1, 2);
            }

            // Phase 2 New: Hellish Suction (Pull player)
            if (b.phase >= 2) {
                const dx = b.pos.x - p.pos.x;
                const dy = b.pos.y - p.pos.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 400) {
                    p.pos.x += dx * 0.015;
                    p.pos.y += dy * 0.015;
                }
            }

            if (b.attackTimer % freq === 0) {
                let attackType = Math.floor(Math.random() * (b.phase >= 2 ? 5 : 4));

                // Mirror Counter: Prioritize Pitchfork Thrust
                if (p.ch3MirrorTimer && p.ch3MirrorTimer > 0 && Math.random() > 0.2) {
                    attackType = 0;
                }

                if (attackType === 0) {
                    // Pitchfork Thrust
                    const angle = Math.atan2(p.pos.y - b.pos.y, p.pos.x - b.pos.x);
                    bullets.current.push({
                        pos: { x: b.pos.x, y: b.pos.y },
                        vel: { x: Math.cos(angle) * 30, y: Math.sin(angle) * 30 },
                        size: 70, color: 'rgba(127, 29, 29, 0.8)', isEnemy: true, damage: 40, lifetime: 30, effect: 'BEAM'
                    });
                } else if (attackType === 1) {
                    // Cursed Rain
                    for (let x = 0; x < CANVAS_WIDTH; x += 120 - b.phase * 20) {
                        bullets.current.push({
                            pos: { x, y: -20 },
                            vel: { x: 0, y: 10 },
                            size: 15, color: '#450a0a', isEnemy: true, damage: 20, lifetime: 120
                        });
                    }
                } else if (attackType === 2) {
                    // Demon Skulls 
                    const baseAngle = Math.atan2(p.pos.y - b.pos.y, p.pos.x - b.pos.x);
                    for (let i = 0; i < 3 + b.phase; i++) {
                        const spreadAngle = baseAngle + (i - (3 + b.phase) / 2) * 0.2;
                        bullets.current.push({
                            pos: { x: b.pos.x, y: b.pos.y },
                            vel: { x: Math.cos(spreadAngle) * 8, y: Math.sin(spreadAngle) * 8 },
                            size: 25, color: '#fff', isEnemy: true, damage: 25, lifetime: 200, effect: 'HOMING_SOFT'
                        });
                    }
                } else if (attackType === 3) {
                    // Pentagram Explosion
                    for (let i = 0; i < 16; i++) {
                        const angle = (i / 16) * Math.PI * 2;
                        bullets.current.push({
                            pos: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 },
                            vel: { x: Math.cos(angle) * 7, y: Math.sin(angle) * 7 },
                            size: 15, color: '#ef4444', isEnemy: true, damage: 15, lifetime: 120, effect: 'SPIRAL'
                        });
                    }
                } else if (attackType === 4 && b.phase >= 2) {
                    // Phase 2/3 New: Trident Fan
                    const baseAngle = Math.atan2(p.pos.y - b.pos.y, p.pos.x - b.pos.x);
                    for (let i = -2; i <= 2; i++) {
                        const angle = baseAngle + i * 0.3;
                        bullets.current.push({
                            pos: { x: b.pos.x, y: b.pos.y },
                            vel: { x: Math.cos(angle) * 12, y: Math.sin(angle) * 12 },
                            size: 15, color: '#ef4444', isEnemy: true, damage: 20, lifetime: 100
                        });
                    }
                }
            }

            if (b.phase === 3 && frameCount.current % 40 === 0) {
                // Phase 3: Final Judgment Beams
                const x = Math.random() * CANVAS_WIDTH;
                bullets.current.push({
                    pos: { x, y: 0 },
                    vel: { x: 0, y: 0 },
                    size: 40, color: 'rgba(239, 68, 68, 0.4)', isEnemy: true, damage: 30, lifetime: 60, effect: 'BEAM'
                });
            }

            // Scratch AI: Positioning
            if (!b.targetPos) b.targetPos = { x: CANVAS_WIDTH * 0.7, y: CANVAS_HEIGHT * 0.4 };
            if (frameCount.current % 60 === 0) {
                b.targetPos = {
                    x: Math.max(100, Math.min(CANVAS_WIDTH - 100, b.pos.x + (Math.random() - 0.5) * 300)),
                    y: Math.max(100, Math.min(CH3_PHYSICS.groundY - 150, b.pos.y + (Math.random() - 0.5) * 200))
                };
            }
            b.pos.x += (b.targetPos.x - b.pos.x) * 0.015;
            b.pos.y += (b.targetPos.y - b.pos.y) * 0.015;
        }
    };

    // ═══════════════════════════════════════════════
    // ═══════════════════════════════════════════════
    // CHAPTER 2 BOSS LOGIC
    // ═══════════════════════════════════════════════
    const handleCh2BossLogic = () => {
        if (!boss.current) return;
        const b = boss.current;
        const p = player.current;
        const spd = 1 + (b.phase - 1) * 0.25;

        // Runner Phase (< 20% HP)
        const hpPct = b.hp / b.maxHp;
        if (hpPct <= 0.2 && b.phase < 4) {
            b.phase = 4;
            spawnParticles(b.pos, '#fff', 100, 15);
            shakeIntensity.current = 30;
            b.boxState = 'BROKEN';
            ch2BoxW.current = 700;
            ch2BoxH.current = 500;
            ch2SoulColor.current = 'RED'; // Free movement
        } else if (hpPct <= 0.5 && b.phase < 3) {
            b.phase = 3;
            spawnParticles(b.pos, '#ff0', 40, 10);
            shakeIntensity.current = 15;
            b.currentAttackIndex = undefined; // Force pick new attack
        } else if (hpPct <= 0.75 && b.phase < 2) {
            b.phase = 2;
            spawnParticles(b.pos, '#fff', 30, 8);
            b.currentAttackIndex = undefined;
        }

        b.attackTimer++;

        // Initialize attack rotation if not set
        if (b.currentAttackIndex === undefined) {
            b.currentAttackIndex = Math.floor(Math.random() * 4);
            b.customAttackTimer = 0;
            b.boxState = 'NORMAL';
        }
        b.customAttackTimer = (b.customAttackTimer || 0) + 1;

        // Change attack every 12 seconds (720 frames) approx, or earlier if forced
        if (b.customAttackTimer > 700 && b.phase !== 4) {
            b.currentAttackIndex = Math.floor(Math.random() * 4);
            b.customAttackTimer = 0;
            b.boxState = 'NORMAL';
            ch2SoulColor.current = 'RED'; // Reset soul
        }

        // Apply Box States (lerped in main update)
        if (b.boxState === 'SHRINKING') {
            ch2BoxW.current = Math.max(80, ch2BoxW.current - 1);
            ch2BoxH.current = Math.max(80, ch2BoxH.current - 1);
        } else if (b.boxState === 'EXPANDING') {
            ch2BoxW.current = Math.min(300, ch2BoxW.current + 2);
            ch2BoxH.current = Math.min(220, ch2BoxH.current + 2);
        } else if (b.boxState === 'MOVING') {
            ch2BoxOffsetX.current = Math.sin(frameCount.current * 0.03) * 120;
        } else if (b.boxState === 'NORMAL') {
            ch2BoxW.current += (240 - ch2BoxW.current) * 0.05;
            ch2BoxH.current += (160 - ch2BoxH.current) * 0.05;
            ch2BoxOffsetX.current *= 0.9;
        }

        // Fight window: every 300 frames, open a 70-frame window
        if (ch2FightWindowTimer.current > 0) ch2FightWindowTimer.current--;
        if (b.attackTimer % 300 === 0) {
            ch2IsFightAvailable.current = true;
            ch2FightWindowTimer.current = 70;
        }
        if (ch2FightWindowTimer.current === 0 && ch2IsFightAvailable.current) {
            ch2IsFightAvailable.current = false;
        }

        if (b.phase === 4) {
            // RUNNER PHASE - Universal for all Ch2 Bosses
            b.activeEffect = '⚠️ SOBREVIVE ⚠️';
            b.forceNoIframes = false; // Give player a chance
            if (b.customAttackTimer % 15 === 0) {
                // Fall from top
                bullets.current.push({
                    pos: { x: Math.random() * 800, y: -20 },
                    vel: { x: (Math.random() - 0.5) * 2, y: 7 + Math.random() * 5 },
                    size: 8, color: '#ef4444', isEnemy: true, damage: 15, lifetime: 200
                });
            }
            if (b.customAttackTimer % 45 === 0) {
                // Parry-able bullet to give heals/cooldowns during runner phase
                bullets.current.push({
                    pos: { x: 800, y: Math.random() * 600 },
                    vel: { x: -8, y: 0 }, size: 12, color: '#f472b6', isEnemy: true, damage: 20, lifetime: 200, isParryable: true
                });
            }
            return; // Skip normal attacks
        }

        const getAttackName = (typeCode: string) => {
            const patterns = (CH2_ATTACK_PATTERNS as Record<string, string[]>)[typeCode];
            return patterns ? patterns[b.currentAttackIndex!] : 'NONE';
        };

        // Helper to spawn a parry-able bullet sometimes
        const trySpawnParry = (x: number, y: number, vx: number, vy: number) => {
            if (Math.random() < 0.15) {
                bullets.current.push({ pos: { x, y }, vel: { x: vx, y: vy }, size: 10, color: '#f472b6', isEnemy: true, damage: 15, lifetime: 200, isParryable: true });
                return true;
            }
            return false;
        };

        // ── EL GUARDIÁN BINARIO ──────────────────────────
        if (b.type === BossType.CH2_GUARDIAN) {
            const attack = getAttackName('GUARDIAN');
            b.activeEffect = `💻 GUARD PROTOCOL: ${attack}`;

            if (attack === 'BINARY_RAIN') {
                ch2SoulColor.current = 'BLUE';
                if (b.customAttackTimer % Math.round(30 / spd) === 0) {
                    const cx = CH2_BOX.cx + ch2BoxOffsetX.current;
                    const bx = cx - ch2BoxW.current / 2 + Math.random() * ch2BoxW.current;
                    if (!trySpawnParry(bx, CH2_BOX.cy - ch2BoxH.current / 2 - 20, 0, 4.5 * spd)) {
                        bullets.current.push({ pos: { x: bx, y: CH2_BOX.cy - ch2BoxH.current / 2 - 20 }, vel: { x: 0, y: 4.5 * spd }, size: 8, color: '#10b981', isEnemy: true, damage: 10, lifetime: 200, isBone: true, boneWidth: 10, boneHeight: 40, boneColor: 'WHITE' });
                    }
                }
            } else if (attack === 'ROTATING_WALLS') {
                ch2SoulColor.current = 'RED';
                if (b.customAttackTimer % Math.round(60 / spd) === 0) {
                    // Simple sweeping walls from side
                    const fromLeft = Math.random() > 0.5;
                    bullets.current.push({ pos: { x: fromLeft ? CH2_BOX.cx - ch2BoxW.current - 50 : CH2_BOX.cx + ch2BoxW.current + 50, y: CH2_BOX.cy + (Math.random() - 0.5) * ch2BoxH.current }, vel: { x: (fromLeft ? 1 : -1) * 3 * spd, y: 0 }, size: 8, color: '#e5e7eb', isEnemy: true, damage: 15, lifetime: 200, isBone: true, boneWidth: 30, boneHeight: Math.random() > 0.5 ? 90 : 40, boneColor: 'WHITE' });
                }
            } else if (attack === 'GRAVITY_FLIP') {
                ch2SoulColor.current = 'BLUE';
                if (b.customAttackTimer % 180 === 0) {
                    p.gravityDir.y = (p.gravityDir.y === 1) ? -1 : 1; // Flip gravity!
                    hudGlitch.current = 10;
                    shakeIntensity.current = 5;
                }
                if (b.customAttackTimer % Math.round(40 / spd) === 0) {
                    const ypos = p.gravityDir.y === 1 ? CH2_BOX.cy + ch2BoxH.current / 2 - 10 : CH2_BOX.cy - ch2BoxH.current / 2 + 10;
                    bullets.current.push({ pos: { x: CH2_BOX.cx + ch2BoxOffsetX.current + (Math.random() - 0.5) * ch2BoxW.current, y: ypos }, vel: { x: (Math.random() - 0.5) * 3, y: p.gravityDir.y * -2 }, size: 8, color: '#3b82f6', isEnemy: true, damage: 15, lifetime: 200 });
                }
            } else if (attack === 'LASER_GRID') {
                b.boxState = 'MOVING';
                ch2SoulColor.current = 'GREEN';
                if (b.customAttackTimer % Math.round(90 / spd) === 0) {
                    const ang = Math.random() > 0.5 ? 0 : Math.PI / 2;
                    bullets.current.push({ pos: { x: CH2_BOX.cx, y: CH2_BOX.cy }, vel: { x: 0, y: 0 }, size: 20, color: '#f97316', isEnemy: true, damage: 20, lifetime: 80, isBlaster: true, blasterTimer: 50, blasterPhase: 'WARN', angle: ang });
                }
            }

            // --- MAGNET EFFECT FOR SECRET RIFT ---
            if (secretRiftActive.current) {
                const riftX = CH2_BOX.cx + ch2BoxOffsetX.current;
                const riftY = CH2_BOX.cy;
                const pullStr = 0.5; // Magnet pull strength

                bullets.current.forEach(bul => {
                    if (bul.isEnemy || bul.isBone) {
                        const drx = riftX - bul.pos.x;
                        const dry = riftY - bul.pos.y;
                        const distRift = Math.sqrt(drx * drx + dry * dry);
                        if (distRift > 10 && distRift < 300) {
                            bul.vel.x += (drx / distRift) * pullStr;
                            bul.vel.y += (dry / distRift) * pullStr;
                        }
                    }
                });

                const distPlayerRift = Math.sqrt((p.pos.x - riftX) ** 2 + (p.pos.y - riftY) ** 2);
                if (distPlayerRift < 20) p.invincibilityTimer = 2;
            }
        }

        // ── EL ALQUIMISTA DE PÍXELES ─────────────────────
        else if (b.type === BossType.CH2_ALCHEMIST) {
            const attack = getAttackName('ALCHEMIST');
            b.activeEffect = `🧪 BREW: ${attack}`;

            if (attack === 'POTION_THROW') {
                b.boxState = 'EXPANDING';
                ch2SoulColor.current = 'RED';
                if (b.customAttackTimer % Math.round(50 / spd) === 0) {
                    const isP = trySpawnParry(b.pos.x, b.pos.y, (p.pos.x - b.pos.x) * 0.02, (p.pos.y - b.pos.y) * 0.02);
                    if (!isP) {
                        bullets.current.push({ pos: { x: b.pos.x, y: b.pos.y }, vel: { x: (p.pos.x - b.pos.x) * 0.02, y: -4 }, size: 12, color: '#a855f7', isEnemy: true, damage: 15, lifetime: 200, effect: 'GAS' });
                    }
                }
            } else if (attack === 'TOXIC_FLOOR') {
                ch2SoulColor.current = 'BLUE';
                if (b.customAttackTimer % Math.round(200 / spd) === 0) {
                    bullets.current.push({ pos: { x: CH2_BOX.cx, y: CH2_BOX.cy + ch2BoxH.current / 4 }, vel: { x: 0, y: 0 }, size: 8, color: '#22c55e', isEnemy: true, damage: 20, lifetime: 180, isBone: true, boneWidth: ch2BoxW.current * 0.8, boneHeight: ch2BoxH.current * 0.5, boneColor: 'WHITE' });
                }
                if (b.customAttackTimer % Math.round(40 / spd) === 0) {
                    bullets.current.push({ pos: { x: CH2_BOX.cx + (Math.random() - 0.5) * ch2BoxW.current, y: CH2_BOX.cy - ch2BoxH.current / 2 }, vel: { x: 0, y: 0 }, size: 5, color: '#fcd34d', isEnemy: false, damage: 0, lifetime: 160, isBone: true, boneWidth: 40, boneHeight: 10 }); // Friendly platform
                }
            } else if (attack === 'ICE_SHARDS') {
                ch2SoulColor.current = 'GREEN';
                if (b.customAttackTimer % Math.round(25 / spd) === 0) {
                    const side = Math.floor(Math.random() * 4);
                    const cx = CH2_BOX.cx, cy = CH2_BOX.cy, bw = ch2BoxW.current / 2, bh = ch2BoxH.current / 2;
                    const posMap = [{ x: cx - bw, y: cy }, { x: cx + bw, y: cy }, { x: cx, y: cy - bh }, { x: cx, y: cy + bh }];
                    const velMap = [{ x: 5 * spd, y: 0 }, { x: -5 * spd, y: 0 }, { x: 0, y: 5 * spd }, { x: 0, y: -5 * spd }];
                    bullets.current.push({ pos: posMap[side], vel: velMap[side], size: 7, color: '#38bdf8', isEnemy: true, damage: 15, lifetime: 200, effect: 'FREEZE' });
                }
            } else if (attack === 'SOUL_CONFUSION') {
                b.boxState = 'SHRINKING';
                if (b.customAttackTimer % 120 === 0) {
                    ch2SoulColor.current = ['RED', 'BLUE', 'GREEN'][Math.floor(Math.random() * 3)] as SoulColor;
                    hudGlitch.current = 5;
                }
                if (b.customAttackTimer % Math.round(20 / spd) === 0) {
                    const ang = Math.random() * Math.PI * 2;
                    trySpawnParry(CH2_BOX.cx + Math.cos(ang) * 150, CH2_BOX.cy + Math.sin(ang) * 150, Math.cos(ang + Math.PI) * 4 * spd, Math.sin(ang + Math.PI) * 4 * spd) ||
                        bullets.current.push({ pos: { x: CH2_BOX.cx + Math.cos(ang) * 150, y: CH2_BOX.cy + Math.sin(ang) * 150 }, vel: { x: Math.cos(ang + Math.PI) * 4 * spd, y: Math.sin(ang + Math.PI) * 4 * spd }, size: 8, color: '#a855f7', isEnemy: true, damage: 15, lifetime: 200 });
                }
            }
        }

        // ── SINFONÍA DEL VACÍO ───────────────────────────
        else if (b.type === BossType.CH2_DIRECTOR) {
            const attack = getAttackName('DIRECTOR');
            b.activeEffect = `🎵 MEASURE: ${attack}`;

            if (attack === 'RHYTHM_BEATS') {
                ch2SoulColor.current = 'BLUE';
                if (b.customAttackTimer % Math.round(45 / spd) === 0) {
                    const beatPos = CH2_BOX.cx + (Math.floor(Math.random() * 5) - 2) * 30;
                    bullets.current.push({ pos: { x: beatPos, y: CH2_BOX.cy - ch2BoxH.current / 2 - 20 }, vel: { x: 0, y: 6 * spd }, size: 10, color: '#e2e8f0', isEnemy: true, damage: 20, lifetime: 120, effect: 'BOUNCE', maxBounces: 2 });
                }
            } else if (attack === 'SOUND_WAVES') {
                ch2SoulColor.current = 'RED';
                if (b.customAttackTimer % Math.round(90 / spd) === 0) {
                    for (let i = 0; i < 3; i++) {
                        bullets.current.push({ pos: { x: CH2_BOX.cx - ch2BoxW.current / 2 - 20, y: p.pos.y + (i - 1) * 30 }, vel: { x: 4 * spd, y: 0 }, size: 8, color: '#475569', isEnemy: true, damage: 15, lifetime: 200, effect: 'WAVE' });
                    }
                }
            } else if (attack === 'BOX_COMPRESSION') {
                b.boxState = 'SHRINKING';
                ch2SoulColor.current = 'GREEN';
                if (b.customAttackTimer % Math.round(60 / spd) === 0) {
                    trySpawnParry(CH2_BOX.cx + (Math.random() - 0.5) * 100, CH2_BOX.cy - ch2BoxH.current, 0, 5) ||
                        bullets.current.push({ pos: { x: CH2_BOX.cx + (Math.random() - 0.5) * 100, y: CH2_BOX.cy - ch2BoxH.current }, vel: { x: 0, y: 5 }, size: 8, color: '#facc15', isEnemy: true, damage: 20, lifetime: 200 });
                }
            } else if (attack === 'CRESCENDO') {
                ch2SoulColor.current = 'RED';
                if (b.customAttackTimer % Math.round(15 / spd) === 0) {
                    const a = b.customAttackTimer * 0.1;
                    bullets.current.push({ pos: { x: CH2_BOX.cx + Math.cos(a) * 30, y: CH2_BOX.cy + Math.sin(a) * 30 }, vel: { x: Math.cos(a) * 5 * spd, y: Math.sin(a) * 5 * spd }, size: 6, color: '#94a3b8', isEnemy: true, damage: 12, lifetime: 150 });
                }
            }
        }

        // ── LA ENTIDAD ───────────────────────────────────
        else if (b.type === BossType.CH2_ENTITY) {
            const attack = getAttackName('ENTITY');
            b.activeEffect = `ERR: ${attack}`;

            if (attack === 'GLITCH_STORM') {
                ch2SoulColor.current = 'RED';
                ch2GlitchIntensity.current = 10;
                if (b.customAttackTimer % Math.round(10 / spd) === 0) {
                    bullets.current.push({ pos: { x: CH2_BOX.cx + (Math.random() - 0.5) * ch2BoxW.current, y: CH2_BOX.cy - ch2BoxH.current / 2 }, vel: { x: (Math.random() - 0.5) * 2, y: 5 * spd }, size: 6, color: '#ec4899', isEnemy: true, damage: 15, lifetime: 100, effect: 'REALITY_BREAK' });
                }
            } else if (attack === 'TELEPORT_STRIKE') {
                ch2SoulColor.current = 'GREEN';
                if (b.customAttackTimer % Math.round(90 / spd) === 0) {
                    spawnParticles(b.pos, '#fff', 20, 5);
                    b.pos = { x: CH2_BOX.cx + (Math.random() - 0.5) * ch2BoxW.current * 1.5, y: CH2_BOX.cy + (Math.random() - 0.5) * ch2BoxH.current * 1.5 };
                    bullets.current.push({ pos: { ...b.pos }, vel: { x: 0, y: 0 }, size: 30, color: '#f43f5e', isEnemy: true, damage: 25, lifetime: 60, isBlaster: true, blasterTimer: 30, blasterPhase: 'WARN' });
                }
            } else if (attack === 'FAKE_BULLETS') {
                ch2SoulColor.current = 'BLUE';
                if (b.customAttackTimer % Math.round(20 / spd) === 0) {
                    const isFake = Math.random() > 0.5;
                    bullets.current.push({ pos: { x: CH2_BOX.cx + ch2BoxW.current / 2 + 20, y: p.pos.y + (Math.random() - 0.5) * 20 }, vel: { x: -6 * spd, y: 0 }, size: 8, color: isFake ? 'rgba(236,72,153,0.2)' : '#ec4899', isEnemy: true, damage: isFake ? 0 : 20, lifetime: 150 });
                }
            } else if (attack === 'BOX_SHIFT') {
                b.boxState = 'MOVING';
                ch2SoulColor.current = 'RED';
                if (b.customAttackTimer % Math.round(40 / spd) === 0) {
                    trySpawnParry(CH2_BOX.cx, CH2_BOX.cy, (Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5) ||
                        bullets.current.push({ pos: { x: CH2_BOX.cx, y: CH2_BOX.cy }, vel: { x: (Math.random() - 0.5) * 5 * spd, y: (Math.random() - 0.5) * 5 * spd }, size: 10, color: '#f43f5e', isEnemy: true, damage: 20, lifetime: 150 });
                }
            }
        }

        // ── SKELETON KING ────────────────────────────────
        else if (b.type === BossType.CH2_SKELETON_KING) {
            const attack = getAttackName('SKELETON_KING');
            b.activeEffect = `☠ KR: ${Math.round(p.krDamageAccumalator)} | ${attack}`;

            if (p.krDamageAccumalator > 0 && frameCount.current % 30 === 0) {
                p.hp = Math.max(1, p.hp - p.krDamageAccumalator * 0.15);
            }

            if (attack === 'BONE_CAGE') {
                ch2SoulColor.current = 'BLUE';
                if (b.customAttackTimer % Math.round(60 / spd) === 0) {
                    const posTop = { x: p.pos.x, y: CH2_BOX.cy - ch2BoxH.current / 2 - 20 };
                    const posBot = { x: p.pos.x, y: CH2_BOX.cy + ch2BoxH.current / 2 + 20 };
                    bullets.current.push({ pos: posTop, vel: { x: 0, y: 3 * spd }, size: 8, color: '#f1f5f9', isEnemy: true, damage: 15, lifetime: 100, isBone: true, boneWidth: 20, boneHeight: 60, boneColor: 'WHITE' });
                    bullets.current.push({ pos: posBot, vel: { x: 0, y: -3 * spd }, size: 8, color: '#f1f5f9', isEnemy: true, damage: 15, lifetime: 100, isBone: true, boneWidth: 20, boneHeight: 60, boneColor: 'WHITE' });
                }
            } else if (attack === 'GIGA_BLASTER') {
                b.boxState = 'EXPANDING';
                ch2SoulColor.current = 'RED';
                if (b.customAttackTimer % Math.round(100 / spd) === 0) {
                    bullets.current.push({ pos: { x: CH2_BOX.cx - ch2BoxW.current / 2 - 50, y: p.pos.y }, vel: { x: 0, y: 0 }, size: 40, color: '#94a3b8', isEnemy: true, damage: 30, lifetime: 120, isBlaster: true, blasterTimer: 80, blasterPhase: 'WARN' });
                }
            } else if (attack === 'SWORD_SLASH') {
                ch2SoulColor.current = 'GREEN';
                if (b.customAttackTimer % Math.round(20 / spd) === 0) {
                    const a = Math.random() * Math.PI * 2;
                    bullets.current.push({ pos: { x: CH2_BOX.cx + Math.cos(a) * 100, y: CH2_BOX.cy + Math.sin(a) * 100 }, vel: { x: -Math.cos(a) * 6 * spd, y: -Math.sin(a) * 6 * spd }, size: 8, color: '#f1f5f9', isEnemy: true, damage: 20, lifetime: 100, isBone: true, boneWidth: 40, boneHeight: 10, boneColor: 'ORANGE' });
                }
            } else if (attack === 'PARRY_ORBS') {
                ch2SoulColor.current = 'BLUE';
                if (b.customAttackTimer % Math.round(40 / spd) === 0) {
                    if (!trySpawnParry(CH2_BOX.cx + ch2BoxW.current / 2, p.pos.y - 20, -5 * spd, -3)) {
                        bullets.current.push({ pos: { x: CH2_BOX.cx + ch2BoxW.current / 2, y: p.pos.y }, vel: { x: -5 * spd, y: 0 }, size: 8, color: '#f1f5f9', isEnemy: true, damage: 15, lifetime: 120, isBone: true, boneWidth: 20, boneHeight: 40, boneColor: 'BLUE' });
                    }
                }
            }
        }
    };

    const showUpgrades = () => {
        const p = player.current;

        let selection: Upgrade[] = [];
        let pool = [...UPGRADE_POOL];

        // Filter Chapter 2 Pool: Only HP, Damage, and Cooldown
        if (currentBossIndex.current >= 5) {
            pool = pool.filter(u => u.id === 'hp_up' || u.id === 'dmg_up' || u.id === 'sec_cd' || u.id === 'dash_cd' || u.id === 'sec_dmg' || u.id === 'sec_dmg_titan');
        } else {
            // Chapter 1
            const totalWeaponsCollected = collectedUpgrades.filter(u => u.upgrade.type === 'SECONDARY_WEAPON').length + (p.secondaryWeapon !== 'NONE' ? 1 : 0);
            if (totalWeaponsCollected >= 2 && p.secondaryWeapon !== 'NONE') {
                pool = pool.filter(u => u.type !== 'SECONDARY_WEAPON' || u.weaponType === p.secondaryWeapon);
            }
        }

        const statPool = pool.filter(u => u.type === 'STAT').sort(() => 0.5 - Math.random());
        const otherPool = pool.filter(u => u.type !== 'STAT').sort(() => 0.5 - Math.random());

        // Ensure at least 1 stat upgrade
        selection = [];
        if (statPool.length > 0) selection.push(statPool.pop()!);

        // Fill the rest with a mix
        const remainingPool = [...statPool, ...otherPool].sort(() => 0.5 - Math.random());
        while (selection.length < 3 && remainingPool.length > 0) {
            selection.push(remainingPool.pop()!);
        }

        let weaponUpgrade: Upgrade | undefined;

        if (p.secondaryWeapon !== 'NONE' && p.secondaryWeaponLevel < 3) {
            const nextLevel = p.secondaryWeaponLevel + 1;
            let chance = 0;

            if (nextLevel === 1) chance = 0.8;
            else if (nextLevel === 2) chance = 0.4;
            else if (nextLevel === 3) chance = 0.1;

            if (Math.random() < chance) {
                const upgradeName = nextLevel === 3 ? `${p.secondaryWeapon} - PROTOCOL: MADNESS` : `${p.secondaryWeapon} MK-${nextLevel}`;
                const rarity = nextLevel === 1 ? 'RARE' : (nextLevel === 2 ? 'LEGENDARY' : 'MYTHIC');

                let description = "Upgrade Weapon";
                if (nextLevel === 1) description = "Level 1: Improved Efficiency & Power";
                if (nextLevel === 2) description = "Level 2: Advanced Mechanics & Multihit";
                if (nextLevel === 3) description = "Level 3: TOTAL DESTRUCTION (LOCURA)";

                weaponUpgrade = {
                    id: `upg_${p.secondaryWeapon}_${nextLevel}`,
                    name: upgradeName, description: description, rarity: rarity, type: 'SECONDARY_WEAPON',
                    isWeaponUpgrade: true, targetLevel: nextLevel, apply: (pl) => { pl.secondaryWeaponLevel = nextLevel; }
                };
            }
        }

        // Ch2 Boss Specific Weapons Override
        if (currentBossIndex.current >= 5) {
            let bossWeaponId: SecondaryWeaponType | undefined;
            let weaponName = "";
            let description = "";

            switch (currentBossIndex.current) {
                case 5: bossWeaponId = 'CH2_BONE_STRIKE'; weaponName = "Bone Strike"; description = "SECONDARY: Fires a piercing bone. Replaces current."; break;
                case 6: bossWeaponId = 'CH2_PIXEL_BLAST'; weaponName = "Pixel Blast"; description = "SECONDARY: Shotgun blast of magic pixels. Replaces current."; break;
                case 7: bossWeaponId = 'CH2_VOID_NOTES'; weaponName = "Void Notes"; description = "SECONDARY: Fire bouncing musical notes. Replaces current."; break;
                case 8: bossWeaponId = 'CH2_GLITCH_BOMB'; weaponName = "Glitch Bomb"; description = "SECONDARY: Drops a chaotic reality-breaking bomb. Replaces current."; break;
                case 9: bossWeaponId = 'CH2_KR_BEAM'; weaponName = "Karmic Blaster"; description = "SECONDARY: Summon a miniature blaster beam. Replaces current."; break;
            }

            if (bossWeaponId && p.secondaryWeapon !== bossWeaponId) {
                // Lower drop chance for boss weapons (e.g., 20% chance)
                if (Math.random() < 0.2) {
                    weaponUpgrade = {
                        id: `w_ch2_${bossWeaponId}`,
                        name: weaponName,
                        description: description,
                        rarity: 'MYTHIC',
                        type: 'SECONDARY_WEAPON',
                        weaponType: bossWeaponId,
                        apply: (pl) => { pl.secondaryWeapon = bossWeaponId as SecondaryWeaponType; pl.secondaryCooldownMax = SECONDARY_WEAPON_STATS[bossWeaponId as SecondaryWeaponType].cooldown; }
                    };
                }
            }
        }

        if (weaponUpgrade) {
            // Replace a non-stat upgrade if possible, so we don't lose the guaranteed stat
            const nonStatIndex = selection.findIndex(u => u.type !== 'STAT');
            if (nonStatIndex >= 0) {
                selection[nonStatIndex] = weaponUpgrade;
            } else {
                selection[0] = weaponUpgrade;
            }
        }

        setAvailableUpgrades(selection.sort(() => 0.5 - Math.random()));
        gameState.current = GameState.UPGRADING;
        setUiState(GameState.UPGRADING);
    };

    const selectUpgrade = (upgrade: Upgrade) => {
        if (upgrade.isWeaponUpgrade) {
            setCollectedUpgrades(prev => {
                if (prev.some(u => u.upgrade.id === upgrade.id)) return prev;
                return [...prev, { upgrade, count: 1 }];
            });
        } else if (upgrade.type === 'SECONDARY_WEAPON') {
            player.current.secondaryWeaponLevel = 0;
            setCollectedUpgrades(prev => {
                const filtered = prev.filter(u => u.upgrade.type !== 'SECONDARY_WEAPON' && !u.upgrade.isWeaponUpgrade);
                return [...filtered, { upgrade, count: 1 }];
            });
        } else {
            setCollectedUpgrades(prev => {
                const existingIndex = prev.findIndex(u => u.upgrade.id === upgrade.id);
                if (existingIndex >= 0) {
                    const newUpgrades = [...prev];
                    newUpgrades[existingIndex] = { ...newUpgrades[existingIndex], count: newUpgrades[existingIndex].count + 1 };
                    return newUpgrades;
                } else { return [...prev, { upgrade, count: 1 }]; }
            });
        }

        upgrade.apply(player.current);

        currentBossIndex.current += 1;
        const isChapterEnd = (currentChapter.current === 1 && currentBossIndex.current === 5) ||
            (currentChapter.current === 2 && currentBossIndex.current === 10);

        if (isChapterEnd) {
            if (currentChapter.current === 2) {
                gameState.current = GameState.VICTORY;
                setUiState(GameState.VICTORY);
                unlockChapter(3);
            } else {
                // Transition will be handled by the update loop timeout
                gameState.current = GameState.MENU;
                setUiState(GameState.MENU);
            }
        } else {
            if (currentBossIndex.current >= 5) {
                // Reset ch2 dynamic state for the next boss
                ch2BoxW.current = CH2_BOX.baseW;
                ch2BoxH.current = CH2_BOX.baseH;
                ch2BoxOffsetX.current = 0;
                ch2SoulColor.current = 'RED';
                ch2ColorPhaseTimer.current = 0;
                ch2GlitchIntensity.current = 0;
                ch2IsFightAvailable.current = false;
                player.current.krDamageAccumalator = 0;
                player.current.pos = { x: CH2_BOX.cx, y: CH2_BOX.cy };
            }
            initBoss(currentBossIndex.current);
            bullets.current = [];
            particles.current = [];
            player.current.hp = Math.min(player.current.maxHp, player.current.hp + 20);
            gameState.current = GameState.PLAYING;
            setUiState(GameState.PLAYING);
        }
    };

    const unlockChapter = (chapter: number) => {
        if (chapter === 2) {
            setPhase2Unlocked(true);
            localStorage.setItem('boss_rush_phase2_unlocked', 'true');
            setUnlockedChapters(prev => prev.includes(2) ? prev : [...prev, 2]);
        } else if (chapter === 3) {
            setChapter3Unlocked(true);
            localStorage.setItem('boss_rush_chapter3_unlocked', 'true');
            setUnlockedChapters(prev => prev.includes(3) ? prev : [...prev, 3]);
        }
    };

    const handleAdminLogin = async () => {
        const inputBytes = new TextEncoder().encode(passwordInput);
        const hashBuffer = await crypto.subtle.digest('SHA-256', inputBytes);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        // The hash below corresponds to the current admin password
        if (hashHex === '0e22f99d0c1af8fbeae27ba0db4338fa3863e7242d0562cdd1df437ede42fa81') {
            isAdminAuthenticated.current = true;
            setUiState(GameState.ADMIN);
            setPasswordInput('');
            setLoginError(false);
            setShowPasswordModal(false);
        } else if (passwordInput.toUpperCase() === 'CARTOON') {
            // Unlock Chapter 3 secret code
            setChapter3Unlocked(true);
            localStorage.setItem('boss_rush_chapter3_unlocked', 'true');
            setPasswordInput('');
            setLoginError(false);
            setShowPasswordModal(false);
            setUiState(GameState.CHAPTER_SELECT);
        } else {
            setLoginError(true);
        }
    };

    const adminAddUpgrade = (upgrade: Upgrade) => {
        // Add to inventory without advancing
        if (upgrade.type === 'SECONDARY_WEAPON') {
            const wType = upgrade.weaponType as SecondaryWeaponType;
            const level = adminWeaponLevel;

            // Create a "virtual" upgrade that includes the level in its apply logic
            // This ensures that when startGame re-applies collectedUpgrades, the level is preserved
            const virtualUpgrade: Upgrade = {
                ...upgrade,
                id: `admin_w_${wType}_lvl${level}`,
                apply: (pl) => {
                    pl.secondaryWeapon = wType;
                    pl.secondaryWeaponLevel = level;
                    pl.secondaryCooldownMax = SECONDARY_WEAPON_STATS[wType].cooldown;
                }
            };

            player.current.secondaryWeapon = wType;
            player.current.secondaryWeaponLevel = level;
            player.current.secondaryCooldownMax = SECONDARY_WEAPON_STATS[wType].cooldown;

            setCollectedUpgrades(prev => {
                const filtered = prev.filter(u => u.upgrade.type !== 'SECONDARY_WEAPON' && !u.upgrade.isWeaponUpgrade);
                return [...filtered, { upgrade: virtualUpgrade, count: 1 }];
            });
        } else {
            upgrade.apply(player.current);
            setCollectedUpgrades(prev => {
                const existingIndex = prev.findIndex(u => u.upgrade.id === upgrade.id);
                if (existingIndex >= 0) {
                    const newUpgrades = [...prev];
                    newUpgrades[existingIndex] = { ...newUpgrades[existingIndex], count: newUpgrades[existingIndex].count + 1 };
                    return newUpgrades;
                } else { return [...prev, { upgrade, count: 1 }]; }
            });
        }
    };

    // --- PHASE 2 PHYSICS ---
    const updateSoulPhysics = () => {
        const p = player.current;
        const physics = SOUL_PHYSICS;

        const color = ch2SoulColor.current;
        const isCh2 = currentBossIndex.current >= 5;

        // Soul Color Logic
        if (isCh2 && color === 'RED') {
            // RED SOUL: Free movement in all directions, no gravity
            let dx = 0, dy = 0;
            if (keys.current.has('KeyA') || keys.current.has('ArrowLeft')) dx -= 1;
            if (keys.current.has('KeyD') || keys.current.has('ArrowRight')) dx += 1;
            if (keys.current.has('KeyW') || keys.current.has('ArrowUp')) dy -= 1;
            if (keys.current.has('KeyS') || keys.current.has('ArrowDown')) dy += 1;

            p.vel.x = dx * physics.soulSpeed;
            p.vel.y = dy * physics.soulSpeed;
            p.isGrounded = false;
        } else if (isCh2 && color === 'GREEN') {
            // GREEN SOUL: Fixed position (center of box)
            const targetX = CH2_BOX.cx + ch2BoxOffsetX.current;
            const targetY = CH2_BOX.cy;
            p.pos.x = targetX;
            p.pos.y = targetY;
            p.vel = { x: 0, y: 0 };

            if (keys.current.has('KeyW') || keys.current.has('ArrowUp')) { p.shieldDirection = 'UP'; }
            else if (keys.current.has('KeyS') || keys.current.has('ArrowDown')) { p.shieldDirection = 'DOWN'; }
            else if (keys.current.has('KeyA') || keys.current.has('ArrowLeft')) { p.shieldDirection = 'LEFT'; }
            else if (keys.current.has('KeyD') || keys.current.has('ArrowRight')) { p.shieldDirection = 'RIGHT'; }
        } else {
            // BLUE SOUL (or default Phase 2 physics)
            // Gravity
            if (!p.isGrounded) {
                p.vel.x += p.gravityDir.x * physics.gravity;
                p.vel.y += p.gravityDir.y * physics.gravity;
            }

            // Terminal Velocity
            const term = physics.terminalVelocity;
            p.vel.x = Math.max(-term, Math.min(term, p.vel.x));
            p.vel.y = Math.max(-term, Math.min(term, p.vel.y));

            // Movement (Horizontal for vertical gravity)
            let moveDir = 0;
            if (keys.current.has('KeyA') || keys.current.has('ArrowLeft')) moveDir -= 1;
            if (keys.current.has('KeyD') || keys.current.has('ArrowRight')) moveDir += 1;

            if (p.gravityDir.y !== 0) {
                p.vel.x = moveDir * physics.soulSpeed;
            } else {
                let vMove = 0;
                if (keys.current.has('KeyW') || keys.current.has('ArrowUp')) vMove -= 1;
                if (keys.current.has('KeyS') || keys.current.has('ArrowDown')) vMove += 1;
                p.vel.y = vMove * physics.soulSpeed;
            }

            // Jump
            if ((keys.current.has('Space') || keys.current.has('ArrowUp') || keys.current.has('KeyW')) && p.isGrounded) {
                p.vel.x -= p.gravityDir.x * physics.jumpPower;
                p.vel.y -= p.gravityDir.y * physics.jumpPower;
                p.isGrounded = false;
            }
            // Short hop
            if (p.gravityDir.y === 1 && p.vel.y < 0 && !keys.current.has('Space')) p.vel.y *= 0.5;
        }


        // Apply Velocity
        p.pos.x += p.vel.x;
        p.pos.y += p.vel.y;

        // Box Collision - Ch2 uses dynamic smaller box
        const boxCx = isCh2 ? CH2_BOX.cx + ch2BoxOffsetX.current : CANVAS_WIDTH / 2;
        const boxCy = isCh2 ? CH2_BOX.cy : CANVAS_HEIGHT / 2;
        const halfW = isCh2 ? ch2BoxW.current / 2 : SOUL_PHYSICS.boxSize / 2;
        const halfH = isCh2 ? ch2BoxH.current / 2 : SOUL_PHYSICS.boxSize / 2;

        const minX = boxCx - halfW + p.size;
        const maxX = boxCx + halfW - p.size;
        const minY = boxCy - halfH + p.size;
        const maxY = boxCy + halfH - p.size;

        p.isGrounded = false;
        if (p.pos.y >= maxY) { p.pos.y = maxY; if (p.gravityDir.y === 1) { p.isGrounded = true; p.vel.y = 0; } }
        if (p.pos.y <= minY) { p.pos.y = minY; if (p.gravityDir.y === -1) { p.isGrounded = true; p.vel.y = 0; } }
        if (p.pos.x >= maxX) { p.pos.x = maxX; if (p.gravityDir.x === 1) { p.isGrounded = true; p.vel.x = 0; } }
        if (p.pos.x <= minX) { p.pos.x = minX; if (p.gravityDir.x === -1) { p.isGrounded = true; p.vel.x = 0; } }

        // Ch2: FIGHT via Left Click during fight window
        if (isCh2 && ch2IsFightAvailable.current && boss.current && (mouseDown.current || keys.current.has('KeyZ'))) {
            boss.current.hp -= player.current.damage * 8;
            ch2IsFightAvailable.current = false;
            ch2FightWindowTimer.current = 0;
            spawnParticles(boss.current.pos, '#facc15', 20, 8);
            shakeIntensity.current = 8;
        }

        // KR Processing
        if (p.krDamageAccumalator > 0 && frameCount.current % 60 === 0) {
            p.krDamageAccumalator -= 1;
            p.hp -= 1;
            if (p.hp <= 0) p.hp = 1;
        }
    };

    const updateCh3Physics = () => {
        const p = player.current;
        const physics = CH3_PHYSICS;

        // Reset horizontal velocity
        p.vel.x = 0;

        // Horizontal Controls & Facing
        if (keys.current.has('KeyA') || keys.current.has('ArrowLeft')) {
            p.vel.x = -physics.moveSpeed;
            p.lastCh3Facing = -1;
        }
        if (keys.current.has('KeyD') || keys.current.has('ArrowRight')) {
            p.vel.x = physics.moveSpeed;
            p.lastCh3Facing = 1;
        }
        if (!p.lastCh3Facing) p.lastCh3Facing = 1; // Default to Right

        // Stationary Aiming: If holding W/Up, stop moving horizontally
        if (keys.current.has('KeyW') || keys.current.has('ArrowUp')) {
            p.vel.x = 0;
        }

        // Crouch (S or Down)
        const wantsToCrouch = (keys.current.has('KeyS') || keys.current.has('ArrowDown'));
        p.ch3Crouching = wantsToCrouch && p.ch3Grounded;

        if (p.ch3Crouching) {
            p.vel.x *= 0.2; // Move much slower while crouching
            p.size = 12; // Lower hit box height (visually handled in draw)
        } else {
            p.size = 20; // Normal hit box
        }

        // Roll/Dodge Logic
        if (p.ch3RollingCooldown && p.ch3RollingCooldown > 0) p.ch3RollingCooldown--;
        if (p.ch3RollingTimer && p.ch3RollingTimer > 0) {
            p.ch3RollingTimer--;
            p.invincibilityTimer = 2; // Invincible during roll
            const rollSpeedMultiplier = 2.5;
            p.vel.x = (p.lastCh3Facing || 1) * physics.moveSpeed * rollSpeedMultiplier;
            if (frameCount.current % 2 === 0) spawnParticles(p.pos, p.color, 1, 1);
        }

        if (keys.current.has('ShiftLeft') || keys.current.has('ShiftRight')) {
            if ((!p.ch3RollingCooldown || p.ch3RollingCooldown <= 0) && (!p.ch3RollingTimer || p.ch3RollingTimer <= 0)) {
                p.ch3RollingTimer = 20; // 20 frames of rolling
                p.ch3RollingCooldown = 60; // 1 second cooldown
                spawnParticles(p.pos, '#fff', 10, 3);
            }
        }

        // Parry Logic (Cleanup)
        p.parryTimer = 0;
        p.parryCooldown = 0;

        // Jump (Only Space for Chapter 3 as requested)
        const wantsToJump = keys.current.has('Space');
        if (wantsToJump && p.ch3Grounded && !p.ch3Crouching && !p.ch3Jumping) {
            p.vel.y = -physics.jumpPower;
            p.ch3Grounded = false;
            p.ch3Jumping = true;
            spawnParticles(p.pos, '#fef3c7', 5, 2);
        }

        // Apply Gravity
        if (!p.ch3Grounded) {
            p.vel.y += physics.gravity;
            if (p.vel.y > physics.terminalVelocity) p.vel.y = physics.terminalVelocity;
        }

        // Apply Velocity
        p.pos.x += p.vel.x;
        p.pos.y += p.vel.y;

        // Wall Collision
        p.pos.x = Math.max(p.size, Math.min(CANVAS_WIDTH - p.size, p.pos.x));

        // Grounded check (Floor or Platform)
        if (p.ch3Grounded) {
            const onFloor = p.pos.y >= physics.groundY - p.size - 2;
            let onPlatform = false;
            for (const plat of physics.platforms) {
                if (Math.abs(p.pos.y + p.size - plat.y) < 5 &&
                    p.pos.x + p.size > plat.x && p.pos.x - p.size < plat.x + plat.w) {
                    onPlatform = true;
                    break;
                }
            }
            if (!onFloor && !onPlatform) {
                p.ch3Grounded = false;
            }
        }

        // Platform Collision (Jump-Through from bottom)
        // Allow dropping down by holding S or Down Arrow
        const isTryingToDrop = keys.current.has('KeyS') || keys.current.has('ArrowDown');

        let landedOnPlatform = false;
        if (p.vel.y >= 0 && !isTryingToDrop) {
            for (const plat of physics.platforms) {
                // Check if player's bottom edge crossed the platform's top edge
                const prevY = p.pos.y - p.vel.y;
                const bottomY = p.pos.y + p.size;
                const prevBottomY = prevY + p.size;

                if (prevBottomY <= plat.y && bottomY >= plat.y) {
                    // Check horizontal bounds (with a slight forgiving edge)
                    if (p.pos.x + p.size > plat.x && p.pos.x - p.size < plat.x + plat.w) {
                        p.pos.y = plat.y - p.size;
                        p.vel.y = 0;
                        p.ch3Grounded = true;
                        p.ch3Jumping = false;
                        landedOnPlatform = true;
                        break;
                    }
                }
            }
        }

        // Ground Collision (Floor)
        const floorY = physics.groundY;
        if (!landedOnPlatform && p.pos.y >= floorY - p.size) {
            p.pos.y = floorY - p.size;
            p.vel.y = 0;
            p.ch3Grounded = true;
            p.ch3Jumping = false;
        }

        // Wall Collision
        p.pos.x = Math.max(p.size, Math.min(CANVAS_WIDTH - p.size, p.pos.x));
    };

    const update = () => {
        if (gameState.current !== GameState.PLAYING) return;
        frameCount.current++;
        const p = player.current;
        const isTimeStopped = p.ch3TimeStopTimer && p.ch3TimeStopTimer > 0;

        if (p.godMode) {
            p.hp = p.maxHp;
            p.invincibilityTimer = 10;
            p.krDamageAccumalator = 0;
        }

        if (p.isSoulMode) {
            updateSoulPhysics();
        } else if (currentChapter.current === 3) {
            updateCh3Physics();
        } else {
            // Standard Ship Physics
            let dx = 0;
            let dy = 0;
            if (keys.current.has('KeyW') || keys.current.has('ArrowUp')) dy -= 1;
            if (keys.current.has('KeyS') || keys.current.has('ArrowDown')) dy += 1;
            if (keys.current.has('KeyA') || keys.current.has('ArrowLeft')) dx -= 1;
            if (keys.current.has('KeyD') || keys.current.has('ArrowRight')) dx += 1;

            if (p.invertedControls) { dx = -dx; dy = -dy; }

            if (dx !== 0 || dy !== 0) {
                const len = Math.sqrt(dx * dx + dy * dy);
                dx /= len;
                dy /= len;
            }

            let currentSpeed = p.speed;
            if (p.isCharging) currentSpeed *= 0.2;
            if (p.slowTimer > 0) {
                p.slowTimer--;
                currentSpeed *= 0.5;
                if (frameCount.current % 10 === 0) spawnParticles(p.pos, '#a855f7', 1, 1);
            }

            if (p.dashTimer > 0) p.dashTimer--;
            if (keys.current.has('Space') && p.dashTimer === 0 && !p.isCharging) {
                p.isDashing = true;
                p.dashTimer = p.dashCooldown;
                p.vel = { x: dx * currentSpeed * 4, y: dy * currentSpeed * 4 };
                spawnParticles(p.pos, '#fff', 10, 2);
            }

            if (p.isDashing) {
                p.pos.x += p.vel.x; p.pos.y += p.vel.y;
                p.vel.x *= 0.8; p.vel.y *= 0.8;
                if (Math.abs(p.vel.x) < 1 && Math.abs(p.vel.y) < 1) p.isDashing = false;
            } else {
                p.pos.x += dx * currentSpeed; p.pos.y += dy * currentSpeed;
            }

            const maxX = CANVAS_WIDTH * (0.5 + p.playAreaScale / 2);
            const minX = CANVAS_WIDTH * (0.5 - p.playAreaScale / 2);
            const maxY = CANVAS_HEIGHT * (0.5 + p.playAreaScale / 2);
            const minY = CANVAS_HEIGHT * (0.5 - p.playAreaScale / 2);

            p.pos.x = Math.max(minX + p.size, Math.min(maxX - p.size, p.pos.x));
            p.pos.y = Math.max(minY + p.size, Math.min(maxY - p.size, p.pos.y));

        } // Fin del bloque de físicas (Soul o Ship)

        // --- AYUDA PARA LA BRECHA (GLOBAL) ---
        if ((isAdminAuthenticated.current || secretRiftActive.current) && currentBossIndex.current === 5) {
            const safeX = 422 + ch2BoxOffsetX.current;
            const safeY = 385;
            const distToSafe = Math.sqrt((player.current.pos.x - safeX) ** 2 + (player.current.pos.y - safeY) ** 2);

            // Imán (Magnetismo)
            if (distToSafe < 30 && distToSafe > 0.1) {
                player.current.pos.x += (safeX - player.current.pos.x) * 0.15;
                player.current.pos.y += (safeY - player.current.pos.y) * 0.15;
            }

            // Inmortalidad y Estabilizador de HP SOLO si el código secreto está activo
            if (distToSafe < 18) {
                player.current.hp = player.current.maxHp;
                player.current.krDamageAccumalator = 0;
                player.current.invincibilityTimer = Math.max(player.current.invincibilityTimer, 15);
            }
        }

        if (p.invincibilityTimer > 0) p.invincibilityTimer--;
        if (p.ch3MirrorTimer && p.ch3MirrorTimer > 0) p.ch3MirrorTimer--;
        if (p.ch3TimeStopTimer && p.ch3TimeStopTimer > 0) p.ch3TimeStopTimer--;
        if (p.shootCooldown > 0) p.shootCooldown--;

        // Shooting Logic
        if (!p.isSoulMode && p.shootCooldown <= 0 && !p.isCharging) {
            if (currentChapter.current === 3) {
                if (mouseDown.current || keys.current.has('KeyJ')) {
                    fireCh3Weapon(0);
                    p.shootCooldown = PLAYER_BASE_STATS.fireRate;
                } else if (rightMouseDown.current || keys.current.has('KeyK')) {
                    fireCh3Weapon(1);
                    p.shootCooldown = PLAYER_BASE_STATS.fireRate;
                }
            } else if (mouseDown.current || keys.current.has('KeyJ') || keys.current.has('KeyZ')) {
                // Top-down shooting for Chapters 1 & 2
                bullets.current.push({
                    pos: { x: p.pos.x, y: p.pos.y - 10 }, vel: { x: 0, y: -p.projectileSpeed },
                    size: p.projectileSize, color: COLORS.playerBullet, isEnemy: false, damage: p.damage, lifetime: 100
                });
                p.shootCooldown = PLAYER_BASE_STATS.fireRate;
            }
        }

        if (currentChapter.current === 3 && keys.current.has('KeyQ')) {
            if (!p.ch3SlotKeyWasDown) {
                selectedCh3Slot.current = (selectedCh3Slot.current + 1) % 2;
                p.ch3SlotKeyWasDown = true;
            }
        } else {
            p.ch3SlotKeyWasDown = false;
        }

        handleSecondaryLogic();
        // Secondary/Abilities Trigger Separation
        if (currentChapter.current === 3) {
            // Chapter 3: E triggers the currently selected loadout slot
            if (keys.current.has('KeyE')) fireCh3Weapon();
        } else {
            // Chapters 1 & 2: Only trigger on Right Click, K or E keys
            if (rightMouseDown.current || keys.current.has('KeyK') || keys.current.has('KeyE')) {
                fireSecondary();
            }
        }

        if (currentChapter.current === 1) handleBossLogic();
        else if (currentChapter.current === 2) handleCh2BossLogic();
        else if (currentChapter.current === 3) {
            if (!isTimeStopped) {
                handleCh3BossLogic();
            }
            // Boss Collision Damage for Chapter 3
            if (boss.current && player.current.invincibilityTimer <= 0 && !player.current.isDashing) {
                const b = boss.current;
                const dx = p.pos.x - b.pos.x;
                const dy = p.pos.y - b.pos.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < (p.size + b.size * 0.7)) {
                    p.hp -= 20 * Math.pow(3, newGamePlusCount.current);
                    p.invincibilityTimer = 60;
                    shakeIntensity.current = 15;
                    spawnParticles(p.pos, '#ef4444', 10, 5);
                }
            }
        }

        for (let i = bullets.current.length - 1; i >= 0; i--) {
            const b = bullets.current[i];

            // --- CHAPTER 3 BULLET PHYSICS (ENEMY ONLY) ---
            if (currentChapter.current === 3 && b.isEnemy) {
                // Sky Fall: Shots high up or moving up eventually fall
                if (b.hasGravity && (b.pos.y < 150 || b.vel.y < 0)) {
                    b.vel.y += 0.25;
                }

                // Normal Split: Enemy shots split into two after travel
                if (b.canSplit && b.lifetime === 90) {
                    b.canSplit = false;
                    const angle = Math.atan2(b.vel.y, b.vel.x);
                    const speed = Math.sqrt(b.vel.x * b.vel.x + b.vel.y * b.vel.y);

                    const spread = 0.5;
                    bullets.current.push({
                        ...b, pos: { ...b.pos }, vel: { x: Math.cos(angle + spread) * speed, y: Math.sin(angle + spread) * speed },
                        size: b.size * 0.8, damage: b.damage, canSplit: false, lifetime: 120
                    });
                    bullets.current.push({
                        ...b, pos: { ...b.pos }, vel: { x: Math.cos(angle - spread) * speed, y: Math.sin(angle - spread) * speed },
                        size: b.size * 0.8, damage: b.damage, canSplit: false, lifetime: 120
                    });
                    b.lifetime = 0;
                }
            }

            if (b.isSafeZone) {
                b.safeZoneTimer = (b.safeZoneTimer || 0) - 1;
                b.color = b.safeZoneTimer % 20 < 10 ? '#22c55e' : '#fff';
                if (b.safeZoneTimer <= 0) {

                    bullets.current.splice(i, 1);
                    for (let k = 0; k < 12; k++) {
                        const a = (Math.PI * 2 / 12) * k;
                        bullets.current.push({
                            pos: { ...b.pos }, vel: { x: Math.cos(a) * 6, y: Math.sin(a) * 6 },
                            size: 6, color: '#ef4444', isEnemy: true, damage: 15, lifetime: 60
                        });
                    }
                    spawnParticles(b.pos, '#ef4444', 20, 5);
                    shakeIntensity.current = 10;
                    continue;
                }
                continue;
            }

            if (b.isMine && b.attachedToBoss && boss.current) {
                b.pos.x = boss.current.pos.x + (b.vel.x);
                b.pos.y = boss.current.pos.y + (b.vel.y);
                b.lifetime--;
                if (b.lifetime <= 0) {
                    boss.current.hp -= b.damage;
                    spawnParticles(b.pos, '#fb923c', 20, 5);
                    shakeIntensity.current = 5;
                    if (player.current.secondaryWeapon === 'MINE' && player.current.secondaryWeaponLevel >= 2) {
                        const isLvl3 = player.current.secondaryWeaponLevel >= 3;
                        const count = isLvl3 ? 8 : 3;
                        for (let k = 0; k < count; k++) {
                            const angle = (Math.PI * 2 / count) * k;
                            bullets.current.push({
                                pos: { x: b.pos.x, y: b.pos.y }, vel: { x: Math.cos(angle) * (isLvl3 ? 8 : 5), y: Math.sin(angle) * (isLvl3 ? 8 : 5) },
                                size: isLvl3 ? 8 : 5, color: isLvl3 ? '#fff' : '#fb923c', isEnemy: false, damage: b.damage * 0.5, lifetime: 50, isMine: false
                            });
                        }
                        if (isLvl3) {
                            shakeIntensity.current = 20;
                            spawnParticles(b.pos, '#fff', 40, 10);
                            spawnParticles(b.pos, '#fb923c', 40, 15);
                        }
                    }
                    bullets.current.splice(i, 1);
                    continue;
                }
                if (player.current.secondaryWeaponLevel >= 3) {
                    const pulse = Math.sin(frameCount.current * 0.2) * 5;
                    b.size = 15 + pulse;
                    if (frameCount.current % 5 === 0) spawnParticles(b.pos, '#fff', 1, 2);
                } else {
                    if (frameCount.current % 10 === 0) b.color = '#fff'; else b.color = '#fb923c';
                }
                continue;
            }

            if (b.isDrone && b.droneSticky && b.attachedToBoss && boss.current) {
                b.pos.x = boss.current.pos.x + (b.vel.x);
                b.pos.y = boss.current.pos.y + (b.vel.y);
                b.color = frameCount.current % 4 < 2 ? '#34d399' : '#fff';
                continue;
            }

            if (b.effect === 'GRAVITY') {
                // FIX: Only player black hole (isEnemy = false) should grow and suck
                if (!b.isEnemy) {
                    b.size += 0.2;
                    if (player.current.secondaryWeaponLevel >= 3) b.size += 0.3;
                    bullets.current.forEach(other => {
                        if (other !== b && other.isEnemy) {
                            const dx = b.pos.x - other.pos.x; const dy = b.pos.y - other.pos.y;
                            const dist = Math.sqrt(dx * dx + dy * dy);
                            if (dist < (player.current.secondaryWeaponLevel >= 1 ? 250 : 150)) { other.pos.x += dx * 0.05; other.pos.y += dy * 0.05; }
                            if (dist < b.size) { other.lifetime = 0; if (player.current.secondaryWeaponLevel >= 2) spawnParticles(b.pos, '#4c1d95', 1, 5); }
                        }
                    });
                    if (boss.current) {
                        const dx = b.pos.x - boss.current.pos.x; const dy = b.pos.y - boss.current.pos.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist < 200) { boss.current.pos.x += dx * 0.005; boss.current.pos.y += dy * 0.005; boss.current.hp -= b.damage * 0.05; }
                    }
                }
            }

            if (b.effect === 'GHOST' && !b.isEnemy) {
                const target = boss.current ? boss.current.pos : { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 };
                const dx = target.x - b.pos.x;
                const dy = target.y - b.pos.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                // Seeking + Wavy movement
                const seekStr = 0.08;
                b.vel.x += (dx / dist) * seekStr + Math.sin(frameCount.current * 0.1) * 0.2;
                b.vel.y += (dy / dist) * seekStr + Math.cos(frameCount.current * 0.1) * 0.2;

                const speed = Math.sqrt(b.vel.x * b.vel.x + b.vel.y * b.vel.y);
                const maxSpeed = 4;
                if (speed > maxSpeed) {
                    b.vel.x = (b.vel.x / speed) * maxSpeed;
                    b.vel.y = (b.vel.y / speed) * maxSpeed;
                }
            }

            if (b.homing && b.lifetime > 0 && boss.current) {
                const angle = Math.atan2(boss.current.pos.y - b.pos.y, boss.current.pos.x - b.pos.x);
                const speed = Math.sqrt(b.vel.x * b.vel.x + b.vel.y * b.vel.y);
                const turnRate = (player.current.secondaryWeapon === 'MISSILE' && player.current.secondaryWeaponLevel >= 1) ? 0.8 : 0.5;
                b.vel.x += Math.cos(angle) * turnRate; b.vel.y += Math.sin(angle) * turnRate;
                const newSpeed = Math.sqrt(b.vel.x * b.vel.x + b.vel.y * b.vel.y);
                b.vel.x = (b.vel.x / newSpeed) * speed; b.vel.y = (b.vel.y / newSpeed) * speed;
            }

            if (b.curve && b.curve > 0 && b.isEnemy) {
                const angle = Math.atan2(p.pos.y - b.pos.y, p.pos.x - b.pos.x);
                b.vel.x += Math.cos(angle) * 0.5; b.vel.y += Math.sin(angle) * 0.5;
                const speed = Math.sqrt(b.vel.x ** 2 + b.vel.y ** 2);
                if (speed > 8) { b.vel.x = (b.vel.x / speed) * 8; b.vel.y = (b.vel.y / speed) * 8; }
            }

            if (b.effect === 'HOMING_SOFT' && b.isEnemy) {
                const angle = Math.atan2(p.pos.y - b.pos.y, p.pos.x - b.pos.x);
                const turnSpeed = 0.05;
                const currentAngle = Math.atan2(b.vel.y, b.vel.x);
                let diff = angle - currentAngle;
                let safety = 0;
                while (diff < -Math.PI && safety < 10) { diff += Math.PI * 2; safety++; }
                safety = 0;
                while (diff > Math.PI && safety < 10) { diff -= Math.PI * 2; safety++; }
                const newAngle = currentAngle + diff * turnSpeed;
                const speed = Math.sqrt(b.vel.x ** 2 + b.vel.y ** 2);
                b.vel.x = Math.cos(newAngle) * speed;
                b.vel.y = Math.sin(newAngle) * speed;
            }

            if (b.effect === 'SPIRAL') {
                const speed = Math.sqrt(b.vel.x ** 2 + b.vel.y ** 2);
                const angle = Math.atan2(b.vel.y, b.vel.x) + 0.05;
                b.vel.x = Math.cos(angle) * speed;
                b.vel.y = Math.sin(angle) * speed;
            }

            if (b.effect === 'SLOW_PLAYER' && b.isEnemy) {
                const dist = Math.sqrt((b.pos.x - p.pos.x) ** 2 + (b.pos.y - p.pos.y) ** 2);
                if (dist < b.size + p.size) { p.slowTimer = 20; }
            }

            if (b.effect === 'GAS') {
                b.size += 0.5;
                if (!b.isEnemy && boss.current) {
                    const dx = b.pos.x - boss.current.pos.x;
                    const dy = b.pos.y - boss.current.pos.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < b.size && frameCount.current % 15 === 0) {
                        boss.current.hp -= b.damage;
                        spawnParticles(boss.current.pos, '#22c55e', 1, 2);
                    }
                } else {
                    const dist = Math.sqrt((b.pos.x - p.pos.x) ** 2 + (b.pos.y - p.pos.y) ** 2);
                    if (dist < b.size && frameCount.current % 10 === 0) {
                        if (p.invincibilityTimer <= 0) p.hp -= b.damage;
                    }
                }
            }

            // Apply Gravity Effect (Physics)
            if (b.isEnemy && b.effect === 'GRAVITY') {
                b.vel.y += 0.15;
            }

            // Boomerang Return Logic
            if (b.effect === 'BOOMERANG' && !b.isEnemy) {
                if (b.lifetime < 60) { // Halfway through its life
                    const angle = Math.atan2(p.pos.y - b.pos.y, p.pos.x - b.pos.x);
                    const speed = 12;
                    b.vel.x += Math.cos(angle) * 1.5;
                    b.vel.y += Math.sin(angle) * 1.5;
                    const curSpeed = Math.sqrt(b.vel.x * b.vel.x + b.vel.y * b.vel.y);
                    if (curSpeed > speed) {
                        b.vel.x = (b.vel.x / curSpeed) * speed;
                        b.vel.y = (b.vel.y / curSpeed) * speed;
                    }
                }
            }

            // Time Stop: Enemy bullets freeze
            if (!(isTimeStopped && b.isEnemy)) {
                b.pos.x += b.vel.x; b.pos.y += b.vel.y;
            }
            b.lifetime--;

            // Bounce Logic for Player Bullets (Rainbow Beam / Bounce effect)
            if (!b.isEnemy && b.maxBounces !== undefined && b.bounces !== undefined) {
                const groundY = currentChapter.current === 3 ? CH3_PHYSICS.groundY : CANVAS_HEIGHT;
                if (b.pos.x <= 0 || b.pos.x >= CANVAS_WIDTH) {
                    b.vel.x *= -1;
                    b.bounces++;
                    spawnParticles(b.pos, b.color, 3, 2);
                }
                if (b.pos.y <= 0 || b.pos.y >= groundY) {
                    b.vel.y *= -1;
                    b.bounces++;
                    spawnParticles(b.pos, b.color, 3, 2);
                }
                if (b.bounces > b.maxBounces) b.lifetime = 0;
            }

            // Gaster Blaster logic
            if (b.isEnemy && b.isBlaster) {
                if (b.blasterTimer && b.blasterTimer > 0) {
                    b.blasterTimer--;
                    if (b.blasterTimer === 0 && b.blasterPhase === 'WARN') {
                        b.blasterPhase = 'FIRE';
                        b.blasterTimer = 15; // Fire duration
                        shakeIntensity.current = Math.max(shakeIntensity.current, 12);
                    }
                }
                if (b.blasterPhase === 'FIRE') {
                    // Ray collision check
                    const p = player.current;
                    const bLeft = CH2_BOX.cx + ch2BoxOffsetX.current - ch2BoxW.current / 2;
                    const bRight = CH2_BOX.cx + ch2BoxOffsetX.current + ch2BoxW.current / 2;
                    const bTop = CH2_BOX.cy - ch2BoxH.current / 2;
                    const bBot = CH2_BOX.cy + ch2BoxH.current / 2;
                    const isH = Math.abs(b.pos.x - (CH2_BOX.cx + ch2BoxOffsetX.current)) > ch2BoxW.current / 2;
                    let hit = false;
                    if (isH) { hit = Math.abs(p.pos.y - b.pos.y) < (12 + p.size); }
                    else { hit = Math.abs(p.pos.x - b.pos.x) < (12 + p.size); }

                    // --- PROTECCIÓN DE BRECHA PARA BLASTERS ---
                    const safeX = 422 + ch2BoxOffsetX.current;
                    const safeY = 385;
                    const inSafeSpot = Math.sqrt((p.pos.x - safeX) ** 2 + (p.pos.y - safeY) ** 2) < 15;
                    if (hit && inSafeSpot && (isAdminAuthenticated.current || secretRiftActive.current)) hit = false;

                    if (hit && (p.invincibilityTimer <= 0 || boss.current?.forceNoIframes)) {
                        p.hp -= b.damage * Math.pow(3, newGamePlusCount.current);
                        p.invincibilityTimer = 60;
                        if (boss.current?.type === BossType.CH2_SKELETON_KING) {
                            p.krDamageAccumalator += 10;
                        }
                    }
                    if (b.blasterTimer === 0) b.lifetime = 0;
                }
            }

            // Ch2 Director: Bouncing bullets off box walls
            if (b.isEnemy && b.maxBounces !== undefined && b.bounces !== undefined) {
                const bLeft = CH2_BOX.cx + ch2BoxOffsetX.current - ch2BoxW.current / 2;
                const bRight = CH2_BOX.cx + ch2BoxOffsetX.current + ch2BoxW.current / 2;
                const bTop = CH2_BOX.cy - ch2BoxH.current / 2;
                const bBot = CH2_BOX.cy + ch2BoxH.current / 2;
                if (b.pos.x <= bLeft || b.pos.x >= bRight) { b.vel.x *= -1; b.pos.x = Math.max(bLeft, Math.min(bRight, b.pos.x)); b.bounces++; }
                if (b.pos.y <= bTop || b.pos.y >= bBot) { b.vel.y *= -1; b.pos.y = Math.max(bTop, Math.min(bBot, b.pos.y)); b.bounces++; }
                if (b.bounces > b.maxBounces) b.lifetime = 0;
            }

            if (b.isEnemy) {
                const dx = b.pos.x - p.pos.x; const dy = b.pos.y - p.pos.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                // Bone collision uses rectangular box check
                let hit = false;
                if (b.isBone && b.boneWidth && b.boneHeight) {
                    hit = Math.abs(b.pos.x - p.pos.x) < (b.boneWidth / 2 + p.size) && Math.abs(b.pos.y - p.pos.y) < (b.boneHeight / 2 + p.size);
                } else {
                    hit = dist < b.size + p.size;
                }

                // --- MAGIC MIRROR BARRIER ---
                if (!hit && p.ch3MirrorTimer && p.ch3MirrorTimer > 0) {
                    const facing = p.lastCh3Facing || 1;
                    const barrierX = p.pos.x + facing * 40;
                    const barrierY = p.pos.y;
                    const bDist = Math.sqrt((b.pos.x - barrierX) ** 2 + (b.pos.y - barrierY) ** 2);
                    if (bDist < b.size + 40) {
                        // Reflect!
                        b.isEnemy = false;
                        b.color = '#fff';
                        b.vel.x *= -1.2;
                        b.vel.y *= -1.2;
                        spawnParticles(b.pos, '#fff', 5, 2);
                        continue;
                    }
                }
                // BLUE bone: safe if NOT moving
                if (hit && b.boneColor === 'BLUE' && Math.abs(p.vel.x) < 0.5 && Math.abs(p.vel.y) < 0.5) hit = false;
                // ORANGE bone: safe if moving
                if (hit && b.boneColor === 'ORANGE' && (Math.abs(p.vel.x) > 0.5 || Math.abs(p.vel.y) > 0.5)) hit = false;

                // --- BRECHA DE SEGURIDAD (PROTECCIÓN ABSOLUTA) ---
                const safeX = 422 + ch2BoxOffsetX.current;
                const safeY = 385;
                const inSafeSpot = Math.sqrt((p.pos.x - safeX) ** 2 + (p.pos.y - safeY) ** 2) < 15;
                if (hit && inSafeSpot && (isAdminAuthenticated.current || secretRiftActive.current)) {
                    hit = false; // Inmunidad total en el radio de la brecha
                }

                const canHit = !p.isDashing && (p.invincibilityTimer <= 0 || (boss.current?.forceNoIframes));

                let blockedByShield = false;
                if (currentBossIndex.current >= 5 && ch2SoulColor.current === 'GREEN' && b.color === '#22c55e') {
                    const dx = b.pos.x - p.pos.x;
                    const dy = b.pos.y - p.pos.y;
                    if (Math.abs(dx) > Math.abs(dy)) {
                        if (dx > 0 && p.shieldDirection === 'RIGHT') blockedByShield = true;
                        if (dx < 0 && p.shieldDirection === 'LEFT') blockedByShield = true;
                    } else {
                        if (dy > 0 && p.shieldDirection === 'DOWN') blockedByShield = true;
                        if (dy < 0 && p.shieldDirection === 'UP') blockedByShield = true;
                    }
                }

                let parried = false;
                const isCh2Parry = currentChapter.current === 2 && hit && b.isParryable && p.isDashing;
                const isCh3Parry = currentChapter.current === 3 && hit && b.isParryable && p.parryTimer && p.parryTimer > 0;

                if (isCh3Parry || isCh2Parry) {
                    parried = true;
                    spawnParticles(b.pos, '#f0abfc', 20, 6); // Magenta explosion
                    shakeIntensity.current = Math.max(shakeIntensity.current, 10);
                    p.invincibilityTimer = 60; // Reward: 1s iframes

                    if (isCh2Parry) {
                        p.secondaryCooldownTimer = 0; // Reward for Ch2: Instant secondary
                        if (p.hp < p.maxHp) p.hp = Math.min(p.maxHp, p.hp + 5);
                    } else if (isCh3Parry) {
                        if (p.hp < p.maxHp) p.hp = Math.min(p.maxHp, p.hp + 5); // Reward: minor heal
                    }

                    // Super Jump if MELEE_ORB
                    if (b.effect === 'MELEE_ORB') {
                        p.vel.y = -CH3_PHYSICS.jumpPower * 1.5;
                        p.ch3Grounded = false;
                        p.ch3Jumping = true;
                        spawnParticles(p.pos, '#fef3c7', 30, 8);
                    }

                    if (!b.piercing) { bullets.current.splice(i, 1); continue; }
                }

                if (parried) {
                    // Collision handled by parry
                } else if (hit && blockedByShield) {
                    spawnParticles(b.pos, '#22c55e', 5, 2);
                    if (!b.piercing) { bullets.current.splice(i, 1); continue; }
                } else if (hit && canHit && !blockedByShield) {
                    p.hp -= b.damage * Math.pow(3, newGamePlusCount.current); shakeIntensity.current = 10;
                    spawnParticles(p.pos, '#ef4444', 8, 4);
                    if (!boss.current?.forceNoIframes) p.invincibilityTimer = 60;
                    // KR: Skeleton King hits accumulate poison
                    if (boss.current?.type === BossType.CH2_SKELETON_KING) {
                        p.krDamageAccumalator = Math.min(50, p.krDamageAccumalator + b.damage * 0.5);
                    }
                    if (b.effect === 'SLOW') p.slowTimer = 120;
                    if (!b.piercing) { bullets.current.splice(i, 1); continue; }
                }
            } else {
                if (boss.current && b.effect !== 'GRAVITY') {
                    const bx = boss.current.pos.x; const by = boss.current.pos.y; const bs = boss.current.size;
                    if (Math.abs(b.pos.x - bx) < bs && Math.abs(b.pos.y - by) < bs) {
                        if (b.effect === 'FREEZE') {
                            const isIceAge = player.current.secondaryWeapon === 'CRYO' && player.current.secondaryWeaponLevel >= 3;
                            boss.current.slowTimer = 300; if (isIceAge) boss.current.freezeTimer = 120;
                            spawnParticles(boss.current.pos, '#bae6fd', 20, 5);
                        }
                        if (b.isMine) { b.attachedToBoss = true; b.vel.x = b.pos.x - bx; b.vel.y = b.pos.y - by; continue; }
                        if (b.isDrone && b.droneSticky) { b.attachedToBoss = true; b.vel.x = b.pos.x - bx; b.vel.y = b.pos.y - by; player.current.droneChargeCount++; continue; }

                        let damageDealt = b.damage;
                        if (boss.current.freezeTimer > 0) damageDealt *= 2;

                        // --- ULTIMATE (Alma del Diablo) ---
                        if (b.effect === 'ULTIMATE') {
                            if (boss.current.type === BossType.CH3_SCRATCH) {
                                damageDealt = boss.current.maxHp * 0.5; // Deals 50% max HP
                                spawnParticles(boss.current.pos, '#fecaca', 100, 20);
                                shakeIntensity.current = 50;
                            } else {
                                damageDealt = 0; // Does nothing to other bosses
                            }
                        }

                        // --- Elemental Accumulation (Ch3) ---
                        if (currentChapter.current === 3) {
                            if (b.effect === 'BURN') {
                                boss.current.fireAccumulation = (boss.current.fireAccumulation || 0) + 3;
                                if (boss.current.fireAccumulation >= 100) {
                                    boss.current.fireAccumulation = 0;
                                    boss.current.fireTimer = 300; // 5 seconds of burn
                                    spawnParticles(boss.current.pos, '#f97316', 20, 5);
                                }
                            }
                            if (b.effect === 'FREEZE') {
                                boss.current.iceAccumulation = (boss.current.iceAccumulation || 0) + 5;
                                if (boss.current.iceAccumulation >= 100) {
                                    boss.current.iceAccumulation = 0;
                                    boss.current.freezeTimer = 180; // 3 seconds of freeze
                                    spawnParticles(boss.current.pos, '#bae6fd', 30, 3);
                                }
                            }
                            if (b.effect === 'EXPLOSIVE' || b.effect === 'HEAVY' || b.effect === 'MELEE') {
                                const stunGain = b.effect === 'MELEE' ? 15 : 4;
                                boss.current.stunAccumulation = (boss.current.stunAccumulation || 0) + stunGain;
                                if (boss.current.stunAccumulation >= 100) {
                                    boss.current.stunAccumulation = 0;
                                    boss.current.stunTimer = 120; // 2 seconds of stun
                                    spawnParticles(boss.current.pos, '#facc15', 30, 8);
                                }
                            }
                            if (b.effect === 'THUNDER') {
                                const isImmune = boss.current.paralysisImmunityTimer !== undefined && boss.current.paralysisImmunityTimer > 0;
                                const isParalyzed = boss.current.paralysisTimer !== undefined && boss.current.paralysisTimer > 0;
                                if (!isImmune && !isParalyzed) {
                                    boss.current.paralysisAccumulation = (boss.current.paralysisAccumulation || 0) + 6;
                                    if (boss.current.paralysisAccumulation >= 100) {
                                        boss.current.paralysisAccumulation = 0;
                                        boss.current.paralysisTimer = 240; // 4 seconds of paralysis
                                        spawnParticles(boss.current.pos, '#818cf8', 40, 6);
                                    }
                                }
                            }
                        }

                        boss.current.hp = Math.max(0, boss.current.hp - damageDealt);
                        spawnParticles(b.pos, b.color, 2, 3);

                        if (b.clusterCount && b.clusterCount > 0) {
                            for (let k = 0; k < b.clusterCount; k++) {
                                const a = Math.random() * Math.PI * 2;
                                bullets.current.push({
                                    pos: { ...b.pos }, vel: { x: Math.cos(a) * 5, y: Math.sin(a) * 5 },
                                    size: 4, color: b.color, isEnemy: false, damage: b.damage * 0.3, lifetime: 30
                                });
                            }
                        }
                        if (!b.piercing) { bullets.current.splice(i, 1); }
                        continue;
                    }
                }
            }

            if (b.lifetime <= 0 || (b.effect === 'CARTOON_HIT' && b.isEnemy)) {
                // Enemy cluster bullets explode on timeout
                if (b.clusterCount && b.clusterCount > 0) {
                    for (let k = 0; k < b.clusterCount; k++) {
                        const a = Math.random() * Math.PI * 2;
                        bullets.current.push({
                            pos: { ...b.pos }, vel: { x: Math.cos(a) * 5, y: Math.sin(a) * 5 },
                            size: b.effect === 'CARTOON_HIT' ? 10 : 5,
                            color: b.effect === 'CARTOON_HIT' ? '#facc15' : '#ef4444',
                            isEnemy: b.isEnemy,
                            damage: b.damage * 0.5,
                            lifetime: 40
                        });
                    }
                    spawnParticles(b.pos, '#ffffff', 5, 2);
                }
                bullets.current.splice(i, 1);
            } else if (b.pos.x < -100 || b.pos.x > CANVAS_WIDTH + 100 || b.pos.y < -100 || b.pos.y > CANVAS_HEIGHT + 100) {
                bullets.current.splice(i, 1);
            }
        }

        if (p.hp <= 0) {
            gameState.current = GameState.GAME_OVER;
            setUiState(GameState.GAME_OVER);
        }

        // --- FAILSAFE GLOBAL PARA LA BRECHA ---
        if (isAdminAuthenticated.current) {
            const inSafeSpot = Math.abs(p.pos.x - 422) < 3 && Math.abs(p.pos.y - 385) < 3;
            if (inSafeSpot) {
                if (p.hp < 10) p.hp = 10; // Curación instantánea si algo falla
                p.krDamageAccumalator = 0; // Eliminamos veneno acumulado
            }
        }

        if (boss.current && boss.current.hp <= 0) {
            shakeIntensity.current = 30;
            spawnParticles(boss.current.pos, boss.current.color, 100, 15);

            const isCh1Boss5 = currentChapter.current === 1 && currentBossIndex.current === 4;
            const isCh2Boss5 = currentChapter.current === 2 && currentBossIndex.current === 9;
            const isCh3 = currentChapter.current === 3;

            // Unlock Chapter 2
            if (isCh1Boss5) unlockChapter(2);
            // Unlock Chapter 3
            if (isCh2Boss5) unlockChapter(3);

            if (isCh3) {
                // Award coins from boss reward
                const reward = boss.current.reward || 100;
                ch3Coins.current += reward;
                setCh3CoinsUI(ch3Coins.current);
                localStorage.setItem('chapter3_coins', ch3Coins.current.toString());

                // Update checkpoint
                const currentReached = currentBossIndex.current + 1; // 1-indexed for the checkpoint log
                if (currentReached > ch3LastBossDefeated.current && currentReached <= 14) {
                    ch3LastBossDefeated.current = currentReached;
                    localStorage.setItem("chapter3_checkpoint", JSON.stringify({
                        lastBossDefeated: ch3LastBossDefeated.current,
                        coins: ch3Coins.current,
                        weaponsOwned: ch3WeaponsOwned.current,
                        loadout: ch3Loadout.current
                    }));
                }

                // Show "¡SUPERADO!" seal animation trigger would go here
            }

            const isFinalBoss = (currentChapter.current === 1 && currentBossIndex.current === 4) ||
                (currentChapter.current === 2 && currentBossIndex.current === 9) ||
                (currentChapter.current === 3 && currentBossIndex.current === 4);

            boss.current = null;

            if (isCh1Boss5) {
                setTimeout(() => { startGame(2, 5); }, 2000);
            } else if (isCh3) {
                // Determine if we should go to the next boss or show victory
                if (!isFinalBoss) {
                    currentBossIndex.current++;
                    setTimeout(() => { initBoss(currentBossIndex.current); }, 1500); // Spawn next boss
                } else {
                    setTimeout(() => {
                        setUiState(GameState.CH3_SHOP); // Or Victory Screen based on design
                        gameState.current = GameState.CH3_SHOP;
                    }, 1500);
                }
            } else if (isFinalBoss && currentChapter.current === 2) {
                // Chapter 2 final victory
                setTimeout(() => {
                    setUiState(GameState.VICTORY);
                    gameState.current = GameState.VICTORY;
                }, 1500);
            } else {
                setTimeout(() => { showUpgrades(); }, 1500);
            }
        }

        for (let i = particles.current.length - 1; i >= 0; i--) {
            const part = particles.current[i];
            part.pos.x += part.vel.x; part.pos.y += part.vel.y; part.life -= part.decay;
            if (part.life <= 0) particles.current.splice(i, 1);
        }

        if (shakeIntensity.current > 0) shakeIntensity.current *= 0.9;
        if (shakeIntensity.current < 0.5) shakeIntensity.current = 0;

        if (hudGlitch.current > 0) hudGlitch.current *= 0.9;

        if (frameCount.current % 5 === 0 && boss.current) {
            setPlayerHp({ current: p.hp, max: p.maxHp });
            if (boss.current.type === BossType.AZATHOTH && boss.current.phase >= 5) {
                setBossHp({ current: boss.current.maxHp * 0.9 + Math.random() * 1000, max: boss.current.maxHp });
            } else {
                setBossHp({ current: boss.current.hp, max: boss.current.maxHp });
            }

            const currentDynamicEffect = boss.current.activeEffect;
            if (currentDynamicEffect) {
                setBossModifiers(prev => {
                    const staticMods = prev.filter(m => m.startsWith("VETERAN"));
                    if (prev.includes(currentDynamicEffect)) return prev;
                    return [...staticMods, currentDynamicEffect];
                });
            }
        }
    };

    const draw = (ctx: CanvasRenderingContext2D) => {
        const p = player.current;
        const isTimeStopped = p.ch3TimeStopTimer && p.ch3TimeStopTimer > 0;

        ctx.save();
        if (isTimeStopped) {
            ctx.filter = 'grayscale(100%) brightness(1.2) contrast(0.8)';
        }
        const isRiftActive = currentBossIndex.current === 5 && (isAdminAuthenticated.current || secretRiftActive.current);
        const distToRift = isRiftActive ? Math.sqrt((p.pos.x - (422 + ch2BoxOffsetX.current)) ** 2 + (p.pos.y - 385) ** 2) : 999;
        const isInRiftSafeZone = isRiftActive && distToRift < 18;

        // --- GLOBAL TRANSFORMS ---
        // (ctx.save already called above)
        if (p.screenRotation !== 0) {
            ctx.translate(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
            ctx.rotate(p.screenRotation);
            ctx.translate(-CANVAS_WIDTH / 2, -CANVAS_HEIGHT / 2);
        }

        // --- CHAPTER 3 BACKGROUND (Watercolor Style) ---
        if (currentChapter.current === 3) {
            // Paper texture effect
            ctx.fillStyle = '#fef3c7'; // Creamy paper color
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

            // Hand-painted hills/curtains (simplified)
            ctx.fillStyle = 'rgba(127, 29, 29, 0.1)'; // Deep red curtains back
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(200, 100, 400, 0);
            ctx.quadraticCurveTo(600, 100, 800, 0);
            ctx.fill();

            const groundY = CH3_PHYSICS.groundY;
            // Floor (Watercolor Wood)
            const floorGrad = ctx.createLinearGradient(0, groundY, 0, CANVAS_HEIGHT);
            floorGrad.addColorStop(0, '#451a03'); // Darker wood
            floorGrad.addColorStop(1, '#78350f'); // Lighter wood
            ctx.fillStyle = floorGrad;
            ctx.fillRect(0, groundY, CANVAS_WIDTH, CANVAS_HEIGHT - groundY);

            // Floor Border (Thick Ink Line)
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.moveTo(0, groundY);
            ctx.lineTo(CANVAS_WIDTH, groundY);
            ctx.stroke();

            // Ground pattern (Hand-drawn dust clouds)
            ctx.fillStyle = 'rgba(0,0,0,0.05)';
            for (let i = 0; i < CANVAS_WIDTH; i += 80) {
                const x = (i + (frameCount.current * 0.5) % 80);
                ctx.beginPath();
                ctx.ellipse(x, groundY + 20, 30, 10, 0, 0, Math.PI * 2);
                ctx.fill();
            }
        } else {
            ctx.fillStyle = COLORS.background;
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        }

        // ═══════════════════════════════════════════════
        // OVERLAY DE EFECTOS ESPECIALES (Fases Finales)
        // ═══════════════════════════════════════════════
        if (boss.current && boss.current.phase >= 3) {
            const b = boss.current;
            const isCap2 = b.type >= BossType.CH2_GUARDIAN;

            // --- CAPÍTULO 1 ---
            if (!isCap2) {
                if (b.type === BossType.SKELETON_PRIME) {
                    const pulse = Math.sin(frameCount.current * 0.05) * 0.15 + 0.1;
                    ctx.fillStyle = `rgba(239, 68, 68, ${pulse})`;
                    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
                    for (let i = 0; i < 5; i++) {
                        const x = (frameCount.current * 2 + i * 200) % CANVAS_WIDTH;
                        const y = (Math.sin(frameCount.current * 0.01 + i) * 100 + 300) % CANVAS_HEIGHT;
                        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
                        ctx.fillRect(x, y, 2, 2);
                    }
                } else if (b.type === BossType.KING_PENGUIN) {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                    for (let i = 0; i < 20; i++) {
                        const x = (frameCount.current * 4 + i * 60) % CANVAS_WIDTH;
                        const y = (frameCount.current * 7 + i * 110) % CANVAS_HEIGHT;
                        ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill();
                    }
                    const grad = ctx.createRadialGradient(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 100, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 500);
                    grad.addColorStop(0, 'transparent'); grad.addColorStop(1, 'rgba(186, 230, 253, 0.4)');
                    ctx.fillStyle = grad; ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
                } else if (b.type === BossType.GAMBLE_BOT) {
                    const spotlight = Math.floor(frameCount.current / 40) % 4;
                    const colors = ['rgba(244, 114, 182, 0.15)', 'rgba(74, 222, 128, 0.15)', 'rgba(251, 191, 36, 0.15)', 'rgba(96, 165, 250, 0.15)'];
                    ctx.fillStyle = colors[spotlight];
                    ctx.beginPath(); ctx.moveTo(CANVAS_WIDTH / 2, 0); ctx.lineTo(spotlight * 200 - 100, CANVAS_HEIGHT); ctx.lineTo((spotlight + 1) * 200 + 100, CANVAS_HEIGHT); ctx.fill();
                } else if (b.type === BossType.VOID_REAPER) {
                    if (frameCount.current % 4 === 0) {
                        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
                        const y = Math.random() * CANVAS_HEIGHT;
                        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_WIDTH, y); ctx.stroke();
                    }
                    hudGlitch.current = Math.max(hudGlitch.current, 5);
                }
            }
            // --- CAPÍTULO 2 ---
            else {
                if (b.type === BossType.CH2_GUARDIAN) {
                    ctx.fillStyle = 'rgba(34, 197, 94, 0.12)';
                    ctx.font = '10px monospace';
                    for (let i = 0; i < 12; i++) {
                        const x = (i * 65) % CANVAS_WIDTH;
                        const y = (frameCount.current * 4 + i * 170) % CANVAS_HEIGHT;
                        ctx.fillText(Math.random() > 0.5 ? "1" : "0", x, y);
                    }
                } else if (b.type === BossType.CH2_ALCHEMIST) {
                    const hue = (frameCount.current % 360);
                    ctx.fillStyle = `hsla(${hue}, 70%, 50%, 0.06)`;
                    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
                    for (let i = 0; i < 6; i++) {
                        const x = (i * 130 + Math.sin(frameCount.current * 0.04 + i) * 40) % CANVAS_WIDTH;
                        const y = CANVAS_HEIGHT - (frameCount.current * 2.5 + i * 90) % CANVAS_HEIGHT;
                        ctx.fillStyle = `hsla(${(hue + i * 60) % 360}, 60%, 50%, 0.25)`;
                        ctx.beginPath(); ctx.arc(x, y, 6 + i, 0, Math.PI * 2); ctx.fill();
                    }
                } else if (b.type === BossType.CH2_DIRECTOR) {
                    ctx.fillStyle = '#000';
                    ctx.fillRect(0, 0, CANVAS_WIDTH, 50); ctx.fillRect(0, CANVAS_HEIGHT - 50, CANVAS_WIDTH, 50);
                    for (let i = 0; i < 8; i++) {
                        ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.15})`;
                        ctx.fillRect(Math.random() * CANVAS_WIDTH, 0, 1, CANVAS_HEIGHT);
                    }
                } else if (b.type === BossType.CH2_ENTITY) {
                    hudGlitch.current = Math.max(hudGlitch.current, 15);
                    ch2GlitchIntensity.current = Math.max(ch2GlitchIntensity.current, 12);
                    if (frameCount.current % 3 === 0) {
                        ctx.fillStyle = 'rgba(255, 0, 120, 0.2)';
                        ctx.fillRect(0, Math.random() * CANVAS_HEIGHT, CANVAS_WIDTH, 15);
                    }
                }
            }
        }

        // --- POST-PROCESS EFFECTS (LEVEL 3 SECONDARIES) ---
        if (player.current.secondaryWeaponLevel >= 3) {
            const p = player.current;
            if (p.secondaryWeapon === 'EMP' && p.secondaryCooldownTimer > p.secondaryCooldownMax - 30) {
                // Cyber Grid Flash
                ctx.strokeStyle = 'rgba(34, 211, 238, 0.3)';
                ctx.lineWidth = 2;
                for (let i = 0; i < CANVAS_WIDTH; i += 40) {
                    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, CANVAS_HEIGHT); ctx.stroke();
                }
                for (let i = 0; i < CANVAS_HEIGHT; i += 40) {
                    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(CANVAS_WIDTH, i); ctx.stroke();
                }
            }
            if (p.secondaryWeapon === 'CRYO' && p.secondaryCooldownTimer > p.secondaryCooldownMax - 60) {
                // Frost Vignette
                const grad = ctx.createRadialGradient(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 200, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 500);
                grad.addColorStop(0, 'transparent');
                grad.addColorStop(1, 'rgba(186, 230, 253, 0.4)');
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            }
        }

        if (shakeIntensity.current > 0) {
            const dx = (Math.random() - 0.5) * shakeIntensity.current;
            const dy = (Math.random() - 0.5) * shakeIntensity.current;
            ctx.translate(dx, dy);
        }

        // --- GRID ---
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < CANVAS_WIDTH; i += 50) { ctx.moveTo(i, 0); ctx.lineTo(i, CANVAS_HEIGHT); }
        for (let i = 0; i < CANVAS_HEIGHT; i += 50) { ctx.moveTo(0, i); ctx.lineTo(CANVAS_WIDTH, i); }
        ctx.stroke();

        // --- PLAY AREA ---
        if (p.playAreaScale < 1.0) {
            const maxX = CANVAS_WIDTH * (0.5 + p.playAreaScale / 2);
            const minX = CANVAS_WIDTH * (0.5 - p.playAreaScale / 2);
            const maxY = CANVAS_HEIGHT * (0.5 + p.playAreaScale / 2);
            const minY = CANVAS_HEIGHT * (0.5 - p.playAreaScale / 2);
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 4;
            ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
        }

        // --- CH3 PLATFORMS ---
        if (currentChapter.current === 3) {
            ctx.fillStyle = '#451a03'; // Dark brown base
            ctx.strokeStyle = '#000';  // Cartoon outline
            ctx.lineWidth = 4;
            ctx.lineJoin = 'round';
            for (const plat of CH3_PHYSICS.platforms) {
                // Draw platform box
                ctx.beginPath();
                ctx.rect(plat.x, plat.y, plat.w, plat.h);
                ctx.fill();
                ctx.stroke();

                // Draw a lighter top edge for 3D/Cartoon effect
                ctx.fillStyle = '#d97706';
                ctx.fillRect(plat.x + 2, plat.y + 2, plat.w - 4, 6);
            }
        }

        // --- PLAYER ---
        if (p.invincibilityTimer % 4 < 2 || p.godMode || isInRiftSafeZone) {
            const px = Math.round(p.pos.x);
            const py = Math.round(p.pos.y);
            ctx.fillStyle = p.slowTimer > 0 ? '#a855f7' : (p.isDashing ? '#fff' : p.color);

            if (p.isCharging) {
                ctx.fillStyle = `rgba(244, 114, 182, ${p.chargeTimer / 60})`;
                ctx.beginPath(); ctx.arc(px, py, p.size * 3, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = p.color;
            }

            if (currentChapter.current === 3) {
                // CHAPTER 3: CARTOON CHARACTER (Cuphead style)
                const bob = Math.sin(frameCount.current * 0.2) * 4;
                const legMove = Math.sin(frameCount.current * 0.3) * 12;
                const isMoving = Math.abs(p.vel.x || 0) > 0.1;
                const isCrouching = p.ch3Crouching;
                const dir = p.lastCh3Facing || 1;

                ctx.save();
                ctx.translate(px, py + (isCrouching ? 5 : 0));
                ctx.scale(dir, 1); // Flip based on direction

                // Roll rotation
                if (p.ch3RollingTimer && p.ch3RollingTimer > 0) {
                    ctx.rotate((20 - p.ch3RollingTimer) * 0.4);
                }

                // Thick Outline Style for everything
                ctx.lineJoin = 'round';
                ctx.lineCap = 'round';

                // Legs (Thick Ink)
                ctx.lineWidth = 8;
                ctx.strokeStyle = '#000';
                if (!p.ch3Grounded) {
                    ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(-15, 12); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(5, 0); ctx.lineTo(10, 8); ctx.stroke();
                } else if (isMoving && !isCrouching) {
                    ctx.beginPath(); ctx.moveTo(-5, 5); ctx.lineTo(-legMove, 18); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(5, 5); ctx.lineTo(legMove, 18); ctx.stroke();
                } else {
                    ctx.beginPath(); ctx.moveTo(-6, 5); ctx.lineTo(-6, 18); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(6, 5); ctx.lineTo(6, 18); ctx.stroke();
                }

                // Inner Legs (Colored)
                ctx.lineWidth = 4;
                ctx.strokeStyle = p.color;
                if (!p.ch3Grounded) {
                    ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(-15, 12); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(5, 0); ctx.lineTo(10, 8); ctx.stroke();
                } else if (isMoving && !isCrouching) {
                    ctx.beginPath(); ctx.moveTo(-5, 5); ctx.lineTo(-legMove, 18); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(5, 5); ctx.lineTo(legMove, 18); ctx.stroke();
                } else {
                    ctx.beginPath(); ctx.moveTo(-6, 5); ctx.lineTo(-6, 18); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(6, 5); ctx.lineTo(6, 18); ctx.stroke();
                }

                // Body (Rubber-hose style body)
                ctx.fillStyle = p.color;
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.ellipse(0, bob - (isCrouching ? 5 : 20), 22, isCrouching ? 15 : 30, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                // Face Overlay (Whitish circle)
                ctx.fillStyle = '#fff9f0';
                ctx.beginPath();
                ctx.ellipse(5, bob - (isCrouching ? 8 : 25), 15, 12, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                // Pacman Eyes
                ctx.fillStyle = '#000';
                // Left Eye
                ctx.beginPath(); ctx.ellipse(8, bob - (isCrouching ? 10 : 28), 3, 5, 0.1, 0, Math.PI * 2); ctx.fill();
                // Right Eye
                ctx.beginPath(); ctx.ellipse(15, bob - (isCrouching ? 10 : 28), 3, 5, -0.1, 0, Math.PI * 2); ctx.fill();

                // Sinister Grin
                ctx.beginPath();
                ctx.arc(10, bob - (isCrouching ? 2 : 20), 6, 0.2, Math.PI - 0.2);
                ctx.stroke();

                // Gloved Hand/Gun
                ctx.fillStyle = '#fff';
                ctx.strokeStyle = '#000';
                ctx.beginPath();
                ctx.arc(20, bob - 15, 8, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                // Fingers pointing
                ctx.fillStyle = '#000';
                ctx.fillRect(25, bob - 18, 12, 4);

                ctx.restore();

                // --- MIRROR BARRIER ---
                if (p.ch3MirrorTimer && p.ch3MirrorTimer > 0) {
                    const facing = p.lastCh3Facing || 1;
                    const mbx = px + facing * 40;
                    const mby = py;
                    const pulse = Math.sin(frameCount.current * 0.2) * 5;

                    ctx.save();
                    ctx.translate(mbx, mby);
                    ctx.globalAlpha = (p.ch3MirrorTimer / 180) * 0.8;

                    // Crystalline Shield effect
                    const grad = ctx.createLinearGradient(-15, -60, 15, 60);
                    grad.addColorStop(0, '#bae6fd');
                    grad.addColorStop(0.5, '#fff');
                    grad.addColorStop(1, '#bae6fd');

                    ctx.fillStyle = grad;
                    ctx.strokeStyle = '#fff';
                    ctx.lineWidth = 3;

                    ctx.beginPath();
                    ctx.roundRect(-8 + pulse * 0.3, -50, 16, 100, 8);
                    ctx.fill();
                    ctx.stroke();

                    // Decorative shine lines
                    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
                    ctx.beginPath(); ctx.moveTo(-2, -30); ctx.lineTo(-2, 30); ctx.stroke();

                    ctx.restore();
                }
            }
            else {
                // CHAPTER 1 & 2: SHIP / SOUL
                ctx.beginPath();
                ctx.moveTo(px, py - p.size * 1.5);
                ctx.lineTo(px - p.size, py + p.size);
                ctx.lineTo(px + p.size, py + p.size);
                ctx.fill();
            }

            if (p.slowTimer > 0) {
                ctx.strokeStyle = '#a855f7';
                ctx.beginPath(); ctx.arc(px, py, p.size * 2, 0, Math.PI * 2 * (p.slowTimer / 120)); ctx.stroke();
            }
            if (p.shieldDuration > 0) {
                const isLvl3 = p.secondaryWeaponLevel >= 3;
                ctx.strokeStyle = isLvl3 ? '#60a5fa' : '#818cf8';
                ctx.lineWidth = p.secondaryWeaponLevel >= 2 ? 5 : 3;

                const radius = p.size + (p.secondaryWeaponLevel >= 1 ? 25 : 15);
                if (isLvl3) {
                    // Hexagonal Aegis
                    ctx.beginPath();
                    for (let i = 0; i < 6; i++) {
                        const angle = (Math.PI / 3) * i + frameCount.current * 0.02;
                        const hx = px + Math.cos(angle) * radius;
                        const hy = py + Math.sin(angle) * radius;
                        if (i === 0) ctx.moveTo(hx, hy); else ctx.lineTo(hx, hy);
                    }
                    ctx.closePath();
                    ctx.stroke();
                    ctx.fillStyle = 'rgba(96, 165, 250, 0.1)';
                    ctx.fill();
                } else {
                    ctx.beginPath(); ctx.arc(px, py, radius, Math.PI, 0); ctx.stroke();
                }
            }
        }

        // --- BOSS ---
        const b = boss.current;

        // --- BEAMS (Special Render) ---
        if (p.beamDuration > 0) {
            const width = p.secondaryWeaponLevel >= 3 ? CANVAS_WIDTH : 10;
            let xPos = p.secondaryWeaponLevel >= 3 ? 0 : p.pos.x - 5;
            if (p.isSoulMode && b) {
                xPos = b.pos.x - width / 2;
            }
            const alpha = p.beamDuration / 60 + 0.2;
            ctx.fillStyle = `rgba(167, 139, 250, ${alpha})`;
            ctx.fillRect(xPos, 0, width, CANVAS_HEIGHT);

            if (p.secondaryWeaponLevel >= 3) {
                // Solar Beam Core
                ctx.fillStyle = `rgba(255, 255, 255, ${alpha + 0.3})`;
                ctx.fillRect(xPos + width * 0.4, 0, width * 0.2, CANVAS_HEIGHT);

                // Lightning Arcs
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                for (let i = 0; i < 3; i++) {
                    ctx.beginPath();
                    let curY = 0;
                    let curX = xPos + Math.random() * width;
                    ctx.moveTo(curX, curY);
                    while (curY < CANVAS_HEIGHT) {
                        curY += 20;
                        curX += (Math.random() - 0.5) * 40;
                        ctx.lineTo(curX, curY);
                    }
                    ctx.stroke();
                }
            }
        }

        if (b) {
            const bx = Math.round(b.pos.x);
            const by = Math.round(b.pos.y);
            ctx.fillStyle = (b.slowTimer > 0 || b.freezeTimer > 0) ? '#bae6fd' : b.color;

            if (b.type === BossType.SKELETON_PRIME) {
                ctx.beginPath(); ctx.arc(bx, by, b.size, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#000'; ctx.fillRect(bx - 15, by - 5, 10, 10); ctx.fillRect(bx + 5, by - 5, 10, 10);
            } else if (b.type === BossType.KING_PENGUIN) {
                ctx.beginPath(); ctx.arc(bx, by, b.size, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(bx, by + 10, b.size * 0.7, 0, Math.PI * 2); ctx.fill();
            } else if (b.type === BossType.GAMBLE_BOT) {
                ctx.fillRect(bx - b.size, by - b.size, b.size * 2, b.size * 2);
                if (b.type === BossType.GAMBLE_BOT) {
                    const wheelY = by - b.size - 30;
                    if (b.rouletteState === 'SPINNING') {
                        ctx.save(); ctx.translate(bx, wheelY); ctx.rotate(frameCount.current * 0.5);
                        ['#22c55e', '#ef4444', '#eab308', '#64748b'].forEach((col, i) => {
                            ctx.beginPath(); ctx.fillStyle = col; ctx.moveTo(0, 0); ctx.arc(0, 0, 20, (Math.PI / 2) * i, (Math.PI / 2) * (i + 1)); ctx.fill();
                        });
                        ctx.restore();
                    } else if (b.rouletteTimer !== undefined && b.rouletteTimer > 0) {
                        const timeLeft = 600 - b.rouletteTimer; const width = (timeLeft / 600) * 60;
                        ctx.fillStyle = '#333'; ctx.fillRect(bx - 30, wheelY + 5, 60, 4);
                        ctx.fillStyle = '#fff'; ctx.fillRect(bx - 30, wheelY + 5, width, 4);
                    }
                }
            } else if (b.type === BossType.AZATHOTH) {
                // Tentacles
                b.tentacles?.forEach(t => {
                    ctx.strokeStyle = '#4c1d95'; ctx.lineWidth = 8;
                    ctx.beginPath();
                    const startX = bx + Math.cos(t.angle) * 40; const startY = by + Math.sin(t.angle) * 40;
                    ctx.moveTo(startX, startY);
                    ctx.quadraticCurveTo(
                        startX + Math.cos(t.angle) * t.length * 0.5 + Math.sin(frameCount.current * 0.1) * 20,
                        startY + Math.sin(t.angle) * t.length * 0.5 + Math.cos(frameCount.current * 0.1) * 20,
                        startX + Math.cos(t.angle) * t.length,
                        startY + Math.sin(t.angle) * t.length
                    );
                    ctx.stroke();
                });
                ctx.fillStyle = '#1e1b4b'; ctx.beginPath(); ctx.arc(bx, by, b.size, 0, Math.PI * 2); ctx.fill();
                // Eyes
                for (let i = 0; i < 5; i++) {
                    const ex = bx + Math.cos(frameCount.current * 0.02 + i * 1.2) * 40;
                    const ey = by + Math.sin(frameCount.current * 0.03 + i * 1.2) * 40;
                    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex, ey, 15, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(ex + Math.sin(frameCount.current * 0.1) * 5, ey, 5, 0, Math.PI * 2); ctx.fill();
                }
            } else if (currentChapter.current === 3) {
                // CHAPTER 3: CARTOON BOSS RENDERING
                const bx = boss.current.pos.x;
                const by = boss.current.pos.y;
                const bossType = boss.current.type;
                const bob = Math.sin(frameCount.current * 0.05) * 15;
                const tilt = Math.cos(frameCount.current * 0.04) * 0.1;

                ctx.save();
                ctx.translate(bx, by + bob);
                ctx.rotate(tilt);

                // Thick Outline Style
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 6;
                ctx.lineJoin = 'round';

                const drawEyes = (yOffset = -20) => {
                    ctx.fillStyle = '#fff';
                    ctx.beginPath(); ctx.ellipse(-20, yOffset, 15, 20, 0.2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                    ctx.beginPath(); ctx.ellipse(20, yOffset, 15, 20, -0.2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                    ctx.fillStyle = '#000';
                    ctx.beginPath(); ctx.arc(-15, yOffset + 5, 5, 0, Math.PI * 2); ctx.fill();
                    ctx.beginPath(); ctx.arc(15, yOffset + 5, 5, 0, Math.PI * 2); ctx.fill();
                };

                switch (bossType) {
                    case BossType.CH3_MORTIMER: // Mortimer (Clown)
                        ctx.fillStyle = '#fff';
                        ctx.beginPath(); ctx.ellipse(0, 0, 60, 70, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                        ctx.fillStyle = '#ef4444'; // Red Nose
                        ctx.beginPath(); ctx.arc(0, 5, 12, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                        ctx.fillStyle = '#fb923c'; // Orange Hair
                        ctx.beginPath(); ctx.arc(-50, -30, 25, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                        ctx.beginPath(); ctx.arc(50, -30, 25, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                        drawEyes(-25);
                        break;
                    case BossType.CH3_VERMILLION: // Baronesa (Vampire)
                        ctx.fillStyle = '#1e1b4b'; // Dark Cape 
                        ctx.beginPath(); ctx.moveTo(-70, 0); ctx.lineTo(0, -90); ctx.lineTo(70, 0); ctx.lineTo(0, 110); ctx.closePath(); ctx.fill(); ctx.stroke();
                        ctx.fillStyle = '#fef3c7'; // Face
                        ctx.beginPath(); ctx.ellipse(0, -35, 30, 35, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                        drawEyes(-35);
                        break;
                    case BossType.CH3_VERDOLAGA: // Verdolaga (Plant)
                        ctx.fillStyle = '#15803d'; // Green Face
                        ctx.beginPath(); ctx.ellipse(0, 0, 70, 60, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                        ctx.fillStyle = '#facc15'; // Petals/Hair
                        for (let i = 0; i < 8; i++) {
                            ctx.save();
                            ctx.rotate((i / 8) * Math.PI * 2 + frameCount.current * 0.01);
                            ctx.beginPath(); ctx.ellipse(85, 0, 25, 20, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                            ctx.restore();
                        }
                        drawEyes(-10);
                        break;
                    case BossType.CH3_CARAMELA: // Caramela (Witch)
                        ctx.fillStyle = '#f472b6'; // Pink
                        ctx.beginPath(); ctx.ellipse(0, 0, 50, 60, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                        ctx.fillStyle = '#701a75'; // Hat
                        ctx.beginPath(); ctx.moveTo(-60, -15); ctx.lineTo(60, -15); ctx.lineTo(0, -130); ctx.closePath(); ctx.fill(); ctx.stroke();
                        drawEyes(-20);
                        break;
                    case BossType.CH3_SCRATCH: // Scratch (Devil)
                        ctx.fillStyle = '#ef4444'; // Red
                        ctx.beginPath(); ctx.ellipse(0, 0, 80, 90, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                        ctx.fillStyle = '#000'; // Horns
                        ctx.beginPath(); ctx.moveTo(-35, -70); ctx.quadraticCurveTo(-50, -110, -70, -100); ctx.stroke();
                        ctx.beginPath(); ctx.moveTo(35, -70); ctx.quadraticCurveTo(50, -110, 70, -100); ctx.stroke();
                        drawEyes(-30);
                        break;
                }

                ctx.restore();
            } else {
                for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(bx + (Math.random() - 0.5) * 20, by + (Math.random() - 0.5) * 20, b.size * 0.8, 0, Math.PI * 2); ctx.fill(); }
            }

            if (b.freezeTimer > 0) { ctx.strokeStyle = '#bae6fd'; ctx.lineWidth = 4; ctx.strokeRect(bx - b.size - 10, by - b.size - 10, b.size * 2 + 20, b.size * 2 + 20); }

            // --- ELEMENTAL STATUS BARS (Ch3 Only) ---
            if (currentChapter.current === 3) {
                const barW = 120;
                const barH = 8;
                const barX = b.pos.x - barW / 2;
                let barY = b.pos.y + b.size + 20;

                const drawStatusBar = (label: string, value: number, max: number, fillColor: string, bgColor: string, isActive: boolean, activeLabel: string) => {
                    // Background
                    ctx.globalAlpha = 0.85;
                    ctx.fillStyle = '#1a0000';
                    ctx.beginPath();
                    ctx.roundRect(barX - 2, barY - 2, barW + 4, barH + 10, 4);
                    ctx.fill();

                    // Bar background
                    ctx.fillStyle = bgColor;
                    ctx.fillRect(barX, barY, barW, barH);

                    // Fill
                    ctx.fillStyle = fillColor;
                    const fillW = barW * Math.min(1, value / max);
                    if (fillW > 0) ctx.fillRect(barX, barY, fillW, barH);

                    // Active status overlay
                    if (isActive) {
                        const pulse = 0.6 + Math.sin(frameCount.current * 0.2) * 0.4;
                        ctx.globalAlpha = pulse;
                        ctx.fillStyle = fillColor;
                        ctx.fillRect(barX, barY, barW, barH);
                        ctx.globalAlpha = 0.85;
                    }

                    // Label
                    ctx.globalAlpha = 1;
                    ctx.fillStyle = '#fff';
                    ctx.font = 'bold 8px monospace';
                    ctx.textAlign = 'center';
                    ctx.fillText(isActive ? activeLabel : label, barX + barW / 2, barY + barH - 1);
                    ctx.textAlign = 'left';
                    barY += barH + 10;
                };

                const fAcc = b.fireAccumulation || 0;
                const fTime = b.fireTimer || 0;
                if (fAcc > 0 || fTime > 0) drawStatusBar('🔥 FUEGO', fAcc, 100, '#f97316', '#450a00', fTime > 0, '🔥 ARDIENDO!');

                const iAcc = b.iceAccumulation || 0;
                const iTime = b.freezeTimer || 0;
                if (iAcc > 0 || iTime > 0) drawStatusBar('🧊 HIELO', iAcc, 100, '#7dd3fc', '#0c1a2e', iTime > 0, '🧊 CONGELADO!');

                const sAcc = b.stunAccumulation || 0;
                const sTime = b.stunTimer || 0;
                if (sAcc > 0 || sTime > 0) drawStatusBar('💫 STUN', sAcc, 100, '#facc15', '#422006', sTime > 0, '💫 MAREADO!');

                const pAcc = b.paralysisAccumulation || 0;
                const pTime = b.paralysisTimer || 0;
                if (pAcc > 0 || pTime > 0) drawStatusBar('⚡ PARALISIS', pAcc, 100, '#818cf8', '#1e1b4b', pTime > 0, '⚡ PARALIZADO!');

                ctx.globalAlpha = 1;
            }
        }

        // --- BATCH RENDER BULLETS (OPTIMIZATION) ---
        const bulletGroups: Record<string, Bullet[]> = {};
        const specialBullets: Bullet[] = [];

        bullets.current.forEach(bul => {
            if (bul.isSafeZone || (bul.isBeam && bul.damage > 50) || bul.effect === 'GRAVITY' || bul.isBone || bul.isBlaster) {
                specialBullets.push(bul);
            } else {
                if (!bulletGroups[bul.color]) bulletGroups[bul.color] = [];
                bulletGroups[bul.color].push(bul);
            }
        });

        specialBullets.forEach(bul => {
            if (bul.isSafeZone) {
                ctx.strokeStyle = bul.color; ctx.lineWidth = 3;
                ctx.beginPath(); ctx.arc(bul.pos.x, bul.pos.y, bul.size, 0, Math.PI * 2); ctx.stroke();
                ctx.fillStyle = `rgba(34, 197, 94, 0.2)`; ctx.fill();
                ctx.beginPath(); ctx.arc(bul.pos.x, bul.pos.y, bul.size * (bul.safeZoneTimer! / 120), 0, Math.PI * 2); ctx.stroke();
            } else if (bul.isBone) {
                // Draw Bone
                const bw = bul.boneWidth || 10;
                const bh = bul.boneHeight || 10;
                ctx.fillStyle = '#fff';
                ctx.fillRect(bul.pos.x - bw / 2, bul.pos.y - bh / 2, bw, bh);
                // Bone ends
                ctx.beginPath(); ctx.arc(bul.pos.x - bw / 2, bul.pos.y - bh / 2, 5, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(bul.pos.x + bw / 2, bul.pos.y - bh / 2, 5, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(bul.pos.x - bw / 2, bul.pos.y + bh / 2, 5, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(bul.pos.x + bw / 2, bul.pos.y + bh / 2, 5, 0, Math.PI * 2); ctx.fill();
            } else if (bul.effect === 'GRAVITY') {
                const isLvl3 = player.current.secondaryWeaponLevel >= 3;
                ctx.beginPath(); ctx.fillStyle = '#000'; ctx.arc(bul.pos.x, bul.pos.y, bul.size, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = '#4c1d95'; ctx.lineWidth = 2; ctx.stroke();

                if (isLvl3) {
                    // Accretion Disk
                    ctx.strokeStyle = 'rgba(139, 92, 246, 0.6)';
                    ctx.lineWidth = 4;
                    ctx.beginPath();
                    ctx.ellipse(bul.pos.x, bul.pos.y, bul.size * 2, bul.size * 0.8, frameCount.current * 0.1, 0, Math.PI * 2);
                    ctx.stroke();
                    if (frameCount.current % 2 === 0) spawnParticles(bul.pos, '#8b5cf6', 1, 3);
                }
            } else if (bul.isBeam) {
                const isLvl3 = player.current.secondaryWeaponLevel >= 3;
                if (isLvl3) {
                    // Omega Cannon Blast
                    const colors = ['#f472b6', '#fff', '#db2777'];
                    colors.forEach((c, idx) => {
                        ctx.beginPath(); ctx.moveTo(bul.pos.x + (idx - 1) * 10, 0); ctx.lineTo(bul.pos.x + (idx - 1) * 10, CANVAS_HEIGHT);
                        ctx.strokeStyle = c; ctx.lineWidth = bul.size * (1 - idx * 0.2); ctx.stroke();
                    });
                } else {
                    ctx.beginPath(); ctx.moveTo(bul.pos.x, 0); ctx.lineTo(bul.pos.x, CANVAS_HEIGHT);
                    ctx.strokeStyle = '#f472b6'; ctx.lineWidth = bul.size; ctx.stroke();
                }
            } else if (bul.isBlaster) {
                const bLeft = CH2_BOX.cx + ch2BoxOffsetX.current - ch2BoxW.current / 2;
                const bRight = CH2_BOX.cx + ch2BoxOffsetX.current + ch2BoxW.current / 2;
                const bTop = CH2_BOX.cy - ch2BoxH.current / 2;
                const bBot = CH2_BOX.cy + ch2BoxH.current / 2;

                if (bul.blasterPhase === 'WARN') {
                    ctx.strokeStyle = 'rgba(239,68,68,0.5)'; ctx.lineWidth = 1; ctx.setLineDash([5, 5]);
                } else {
                    ctx.strokeStyle = '#fff'; ctx.lineWidth = 25; ctx.setLineDash([]);
                    ctx.shadowBlur = 15; ctx.shadowColor = '#06b6d4';
                }
                ctx.beginPath();
                const isH = Math.abs(bul.pos.x - (CH2_BOX.cx + ch2BoxOffsetX.current)) > ch2BoxW.current / 2;
                if (isH) { ctx.moveTo(bLeft, bul.pos.y); ctx.lineTo(bRight, bul.pos.y); }
                else { ctx.moveTo(bul.pos.x, bTop); ctx.lineTo(bul.pos.x, bBot); }
                ctx.stroke();
                ctx.setLineDash([]); ctx.shadowBlur = 0;
            } else if (bul.effect === 'MELEE_ORB') {
                // Cartoonish Parry Orb
                const pulse = Math.sin(frameCount.current * 0.2) * 5;
                const orbSize = bul.size + pulse;

                // Outer Glow
                ctx.shadowBlur = 15;
                ctx.shadowColor = '#f0abfc';
                ctx.fillStyle = '#ff00ff';
                ctx.beginPath();
                ctx.arc(bul.pos.x, bul.pos.y, orbSize, 0, Math.PI * 2);
                ctx.fill();

                // Inner highlight
                ctx.shadowBlur = 0;
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(bul.pos.x - orbSize * 0.3, bul.pos.y - orbSize * 0.3, orbSize * 0.2, 0, Math.PI * 2);
                ctx.fill();

                // Outline
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 3;
                ctx.stroke();
            }
        });

        for (const [color, group] of Object.entries(bulletGroups)) {
            const isMissileGroup = group.some(b => b.isMissile);
            const isLvl3Missile = isMissileGroup && player.current.secondaryWeaponLevel >= 3;

            ctx.fillStyle = color;
            ctx.beginPath();
            for (let i = 0; i < group.length; i++) {
                const bul = group[i];
                const bx = Math.round(bul.pos.x);
                const by = Math.round(bul.pos.y);

                if (bul.effect === 'GHOST') {
                    // Ethereal Ghost Render
                    ctx.save();
                    ctx.translate(bx, by);
                    ctx.globalAlpha = 0.4 + Math.sin(frameCount.current * 0.1 + i) * 0.2;
                    ctx.fillStyle = '#fff';

                    // Ghost body
                    ctx.beginPath();
                    ctx.arc(0, 0, bul.size, Math.PI, 0);
                    ctx.lineTo(bul.size, bul.size);
                    // Wavy bottom
                    for (let x = 1; x >= -1; x -= 0.5) {
                        ctx.lineTo(x * bul.size, bul.size + Math.sin(frameCount.current * 0.2 + x * 5) * 5);
                    }
                    ctx.lineTo(-bul.size, 0);
                    ctx.fill();

                    // Eyes
                    ctx.fillStyle = '#000';
                    ctx.beginPath(); ctx.arc(-4, -2, 2, 0, Math.PI * 2); ctx.fill();
                    ctx.beginPath(); ctx.arc(4, -2, 2, 0, Math.PI * 2); ctx.fill();

                    ctx.restore();
                    continue;
                }

                if (bul.isMissile && player.current.secondaryWeaponLevel >= 3) {
                    // Epic Missile Trail
                    spawnParticles(bul.pos, '#fff', 1, 2);
                    spawnParticles(bul.pos, '#facc15', 1, 1);
                }

                if (color === '#ffffff') {
                    ctx.rect(bx - bul.size, by - bul.size, bul.size * 2, bul.size * 2);
                } else if (color === '#ef4444' && bul.vel.x > 10) {
                    ctx.moveTo(bx, by);
                    ctx.lineTo(bx - bul.vel.x * 2, by - bul.vel.y * 2);
                } else {
                    ctx.moveTo(bx + bul.size, by);
                    ctx.arc(bx, by, bul.size, 0, Math.PI * 2);
                }
            }
            ctx.fill();
            if (color === '#ef4444') {
                ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 3; ctx.stroke();
            }
        }

        // --- PARTICLES ---
        particles.current.forEach(part => {
            ctx.fillStyle = part.color; ctx.globalAlpha = part.life;
            ctx.beginPath(); ctx.arc(Math.round(part.pos.x), Math.round(part.pos.y), part.size, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 1.0;
        });

        // ═══ CHAPTER 2 RENDER ═══
        if (currentBossIndex.current >= 5 && p.isSoulMode) {
            const bw = ch2BoxW.current;
            const bh = ch2BoxH.current;
            const bx = CH2_BOX.cx + ch2BoxOffsetX.current;
            const by = CH2_BOX.cy;

            // Glitch offset
            const gx = ch2GlitchIntensity.current > 0 ? (Math.random() - 0.5) * ch2GlitchIntensity.current : 0;
            const gy = ch2GlitchIntensity.current > 0 ? (Math.random() - 0.5) * ch2GlitchIntensity.current * 0.5 : 0;

            // Background for box
            ctx.fillStyle = 'rgba(0,0,0,0.85)';
            ctx.fillRect(bx - bw / 2 + gx, by - bh / 2 + gy, bw, bh);

            // White border (Undertale style)
            ctx.strokeStyle = ch2GlitchIntensity.current > 10 ? `hsl(${Math.random() * 360},100%,70%)` : '#ffffff';
            ctx.lineWidth = 3;
            ctx.strokeRect(bx - bw / 2 + gx, by - bh / 2 + gy, bw, bh);

            // Draw Secret Rift if active and Boss 1
            if (secretRiftActive.current && boss.current?.type === BossType.CH2_GUARDIAN) {
                ctx.save();
                const riftRad = 15 + Math.sin(frameCount.current * 0.1) * 3;

                // Outer glow
                const grad = ctx.createRadialGradient(bx, by, riftRad * 0.5, bx, by, riftRad * 2);
                grad.addColorStop(0, 'rgba(168, 85, 247, 0.8)'); // Purple glow
                grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(bx, by, riftRad * 2, 0, Math.PI * 2);
                ctx.fill();

                // Inner black hole
                ctx.fillStyle = '#000';
                ctx.beginPath();
                ctx.arc(bx, by, riftRad, 0, Math.PI * 2);
                ctx.fill();

                // Swirling particles
                ctx.strokeStyle = '#a855f7';
                ctx.lineWidth = 2;
                for (let i = 0; i < 3; i++) {
                    const ang = frameCount.current * 0.05 + (i * Math.PI * 2 / 3);
                    const dist = riftRad + 5 + Math.cos(frameCount.current * 0.1 + i) * 5;
                    ctx.beginPath();
                    ctx.arc(bx + Math.cos(ang) * dist, by + Math.sin(ang) * dist, 2, 0, Math.PI * 2);
                    ctx.stroke();
                }
                ctx.restore();
            }

            // Draw Ch2 Boss
            const cb = boss.current;
            if (cb) {
                const cbx = Math.round(CANVAS_WIDTH / 2);
                const cby = 110;
                ctx.save();
                if (cb.type === BossType.CH2_GUARDIAN) {
                    // Skull-like guardian
                    ctx.fillStyle = cb.color; ctx.beginPath(); ctx.arc(cbx, cby, 45, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = '#0f172a';
                    ctx.beginPath(); ctx.ellipse(cbx - 15, cby - 5, 10, 12, 0, 0, Math.PI * 2); ctx.fill();
                    ctx.beginPath(); ctx.ellipse(cbx + 15, cby - 5, 10, 12, 0, 0, Math.PI * 2); ctx.fill();
                    // Teeth
                    for (let i = 0; i < 5; i++) { ctx.fillStyle = '#0f172a'; ctx.fillRect(cbx - 20 + i * 10, cby + 20, 6, 12); }
                } else if (cb.type === BossType.CH2_ALCHEMIST) {
                    // Robed alchemist
                    ctx.fillStyle = cb.color; ctx.beginPath(); ctx.arc(cbx, cby - 15, 22, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = '#7c3aed'; ctx.beginPath(); ctx.moveTo(cbx - 30, cby + 10); ctx.lineTo(cbx + 30, cby + 10); ctx.lineTo(cbx + 20, cby + 60); ctx.lineTo(cbx - 20, cby + 60); ctx.closePath(); ctx.fill();
                    // Magic aura
                    const sc = ch2SoulColor.current;
                    ctx.strokeStyle = sc === 'GREEN' ? '#22c55e' : (sc === 'BLUE' ? '#3b82f6' : '#f472b6');
                    ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cbx, cby, 60 + Math.sin(frameCount.current * 0.1) * 8, 0, Math.PI * 2); ctx.stroke();
                } else if (cb.type === BossType.CH2_DIRECTOR) {
                    // Conductor silhouette
                    ctx.fillStyle = '#1e293b'; ctx.fillRect(cbx - 25, cby - 35, 50, 70);
                    ctx.beginPath(); ctx.arc(cbx, cby - 45, 20, 0, Math.PI * 2); ctx.fill();
                    // Baton
                    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 3;
                    ctx.beginPath(); ctx.moveTo(cbx + 25, cby - 20); ctx.lineTo(cbx + 60 + Math.sin(frameCount.current * 0.2) * 10, cby + 10 + Math.cos(frameCount.current * 0.2) * 10); ctx.stroke();
                    // Musical notes floating
                    ctx.fillStyle = '#64748b'; ctx.font = '20px serif';
                    ctx.fillText('♪', cbx - 50 + Math.sin(frameCount.current * 0.05) * 10, cby - 20 + Math.cos(frameCount.current * 0.07) * 10);
                    ctx.fillText('♫', cbx + 40 + Math.sin(frameCount.current * 0.08 + 1) * 10, cby + Math.cos(frameCount.current * 0.06) * 10);
                } else if (cb.type === BossType.CH2_ENTITY) {
                    // Flowey-like entity
                    const petals = 6;
                    for (let i = 0; i < petals; i++) {
                        const ang = (Math.PI * 2 / petals) * i + frameCount.current * 0.02;
                        ctx.fillStyle = cb.phase >= 3 ? `hsl(${(frameCount.current * 3 + i * 60) % 360},100%,60%)` : '#ec4899';
                        ctx.beginPath(); ctx.ellipse(cbx + Math.cos(ang) * 40, cby + Math.sin(ang) * 40, 18, 10, ang, 0, Math.PI * 2); ctx.fill();
                    }
                    ctx.fillStyle = '#fbbf24'; ctx.beginPath(); ctx.arc(cbx, cby, 22, 0, Math.PI * 2); ctx.fill();
                    // Eyes
                    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(cbx - 7, cby - 3, 5, 0, Math.PI * 2); ctx.fill();
                    ctx.beginPath(); ctx.arc(cbx + 7, cby - 3, 5, 0, Math.PI * 2); ctx.fill();
                    ctx.beginPath(); ctx.arc(cbx, cby + 8, 10, 0, Math.PI); ctx.fill(); // Mouth
                } else if (cb.type === BossType.CH2_SKELETON_KING) {
                    // Skeleton King
                    ctx.fillStyle = cb.color; ctx.beginPath(); ctx.arc(cbx, cby, 35, 0, Math.PI * 2); ctx.fill();
                    // Crown
                    ctx.fillStyle = '#facc15';
                    ctx.beginPath(); ctx.moveTo(cbx - 30, cby - 32); ctx.lineTo(cbx - 30, cby - 55); ctx.lineTo(cbx - 15, cby - 45); ctx.lineTo(cbx, cby - 60); ctx.lineTo(cbx + 15, cby - 45); ctx.lineTo(cbx + 30, cby - 55); ctx.lineTo(cbx + 30, cby - 32); ctx.closePath(); ctx.fill();
                    // Eyes (eye sockets)
                    ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.ellipse(cbx - 12, cby - 5, 9, 11, 0, 0, Math.PI * 2); ctx.fill();
                    ctx.beginPath(); ctx.ellipse(cbx + 12, cby - 5, 9, 11, 0, 0, Math.PI * 2); ctx.fill();
                    // KR glow
                    if (p.krDamageAccumalator > 0) {
                        ctx.strokeStyle = `rgba(239,68,68,${Math.min(0.8, p.krDamageAccumalator / 50)})`;
                        ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(cbx, cby, 50 + Math.sin(frameCount.current * 0.15) * 5, 0, Math.PI * 2); ctx.stroke();
                    }
                }
                ctx.restore();

                // Boss HP bar (Ch2 style - white/yellow like Undertale)
                const barW = 300; const barH = 20;
                const barX = CANVAS_WIDTH / 2 - barW / 2;
                const barY = cby + 65;
                ctx.fillStyle = '#000'; ctx.fillRect(barX - 2, barY - 2, barW + 4, barH + 4);
                ctx.fillStyle = '#facc15'; ctx.fillRect(barX, barY, barW * (cb.hp / cb.maxHp), barH);
                ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(barX, barY, barW, barH);
            }

            // Soul (heart shape)
            if (p.invincibilityTimer % 4 < 2 || p.invincibilityTimer === 0 || p.godMode || isInRiftSafeZone) {
                const sc = ch2SoulColor.current;
                const soulColor = sc === 'GREEN' ? '#22c55e' : (sc === 'BLUE' ? '#3b82f6' : '#ef4444');
                const sx = Math.round(p.pos.x); const sy = Math.round(p.pos.y);
                ctx.fillStyle = soulColor;
                ctx.beginPath();
                const hs = 6;
                ctx.moveTo(sx, sy + hs);
                ctx.bezierCurveTo(sx - hs * 1.8, sy + hs * 0.3, sx - hs * 1.8, sy - hs * 0.8, sx, sy - hs * 0.2);
                ctx.bezierCurveTo(sx + hs * 1.8, sy - hs * 0.8, sx + hs * 1.8, sy + hs * 0.3, sx, sy + hs);
                ctx.fill();

                if (sc === 'GREEN' && p.shieldDirection) {
                    ctx.strokeStyle = '#4ade80';
                    ctx.lineWidth = 4;
                    ctx.beginPath();
                    const shieldDist = 18;
                    const sd = p.shieldDirection;
                    if (sd === 'UP') { ctx.moveTo(sx - 15, sy - shieldDist); ctx.lineTo(sx + 15, sy - shieldDist); }
                    else if (sd === 'DOWN') { ctx.moveTo(sx - 15, sy + shieldDist); ctx.lineTo(sx + 15, sy + shieldDist); }
                    else if (sd === 'LEFT') { ctx.moveTo(sx - shieldDist, sy - 15); ctx.lineTo(sx - shieldDist, sy + 15); }
                    else if (sd === 'RIGHT') { ctx.moveTo(sx + shieldDist, sy - 15); ctx.lineTo(sx + shieldDist, sy + 15); }
                    ctx.stroke();
                }
            }

            // FIGHT button indicator
            if (ch2IsFightAvailable.current) {
                const flash = Math.floor(ch2FightWindowTimer.current / 5) % 2 === 0;
                ctx.fillStyle = flash ? '#facc15' : '#fbbf24';
                ctx.font = 'bold 22px monospace';
                ctx.textAlign = 'center';
                ctx.fillText('[ LUCHAR ] (Z)', CANVAS_WIDTH / 2, by + bh / 2 + 30);
                ctx.textAlign = 'left';
            }

            // Bone color indicator (Guardian phase 3)
            if (boss.current?.type === BossType.CH2_GUARDIAN && boss.current.phase === 3) {
                const isBlue = Math.floor(ch2ColorPhaseTimer.current / 120) % 2 === 0;
                ctx.fillStyle = isBlue ? '#3b82f6' : '#f97316';
                ctx.font = 'bold 16px monospace';
                ctx.textAlign = 'center';
                ctx.fillText(isBlue ? '🔵 QUIETO - NO TE MUEVAS' : '🟠 NARANJA - ¡MUÉVETE!', CANVAS_WIDTH / 2, by - bh / 2 - 12);
                ctx.textAlign = 'left';
            }

            if (ch2GlitchIntensity.current > 0) ch2GlitchIntensity.current *= 0.9;

            // --- INDICADOR DE LA BRECHA (VISIBLE) ---
            if (currentBossIndex.current === 5 && isAdminAuthenticated.current) {
                ctx.fillStyle = frameCount.current % 60 < 30 ? 'rgba(239, 68, 68, 0.8)' : 'rgba(239, 68, 68, 0.3)';
                ctx.fillRect(421, 384, 3, 3); // Punto rojo visible

                // Confirmación clara
                if (Math.abs(player.current.pos.x - 422) < 2 && Math.abs(player.current.pos.y - 385) < 2) {
                    ctx.fillStyle = '#ef4444';
                    ctx.font = 'bold 10px monospace';
                    ctx.textAlign = 'left';
                    ctx.fillText("BRECHA ACTIVA", 435, 388);
                }
            }
        }

        ctx.restore();
    };

    const getUpgradeIcon = (id: string, size: number = 16) => {
        if (id.includes('w_')) return <Target size={size} className="text-purple-400" />;
        if (id.includes('hp')) return <Heart size={size} className="text-red-400" />;
        if (id.includes('spd') || id.includes('dash')) return <Zap size={size} className="text-yellow-400" />;
        if (id.includes('dmg') || id.includes('fire') || id.includes('bullet')) return <Crosshair size={size} className="text-blue-400" />;
        if (id.includes('sec_')) return <Cpu size={size} className="text-purple-400" />;
        if (id.includes('upg_')) return <ArrowUpCircle size={size} className="text-yellow-400 animate-pulse" />;
        return <Shield size={size} className="text-blue-400" />;
    };

    useEffect(() => {
        let animationFrameId: number;
        let lastTime = performance.now();
        let accumulator = 0;
        const timestep = 1000 / 60; // 16.67ms per update

        const render = (currentTime: number) => {
            const deltaTime = currentTime - lastTime;
            lastTime = currentTime;

            // Cap deltaTime to avoid "spiral of death" when tab is inactive
            const cappedDelta = Math.min(deltaTime, 100);
            accumulator += cappedDelta;

            const canvas = canvasRef.current;
            if (canvas) {
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    // Run logic updates in fixed steps
                    while (accumulator >= timestep) {
                        update();
                        accumulator -= timestep;
                    }
                    // Render current state
                    draw(ctx);
                }
            }
            animationFrameId = window.requestAnimationFrame(render);
        };
        animationFrameId = window.requestAnimationFrame(render);

        return () => {
            window.cancelAnimationFrame(animationFrameId);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="relative w-full h-screen flex items-center justify-center bg-zinc-950" onContextMenu={(e) => e.preventDefault()}>
            <div className="scanline"></div>

            <canvas
                ref={canvasRef}
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                className="border-2 border-slate-700 rounded-sm shadow-2xl bg-black max-w-full max-h-full cursor-crosshair"
                style={{
                    width: 'min(100vw, 800px)', height: 'min(100vh, 600px)',
                    filter: hudGlitch.current > 10 ? `hue-rotate(${Math.random() * 360}deg) contrast(1.5)` : 'none'
                }}
            />

            <div
                className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4"
                style={{
                    width: 'min(100vw, 800px)', height: 'min(100vh, 600px)', margin: 'auto',
                    transform: hudGlitch.current > 5 ? `translate(${Math.random() * 10}px, ${Math.random() * 10}px)` : 'none'
                }}
            >

                {uiState === GameState.PLAYING && (
                    <div className="w-full h-full flex flex-col justify-between p-4 bg-transparent relative">
                        {currentChapter.current === 3 ? (
                            <>
                                {/* CARTOON HUD TOP (Health & Boss) */}
                                <div className="flex justify-between items-start w-full">
                                    <div className="flex gap-2">
                                        {Array.from({ length: Math.ceil(playerHp.current / 20) }).map((_, i) => (
                                            <div key={i} className="w-8 h-12 bg-white border-4 border-black rounded-sm flex items-center justify-center -rotate-6 shadow-md">
                                                <Heart size={16} fill="#ef4444" className="text-black" />
                                            </div>
                                        ))}
                                        <div className="ml-2 font-black text-2xl text-black italic" style={{ textShadow: '2px 2px #fff' }}>
                                            HP: {Math.floor(playerHp.current)}
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-end">
                                        <div className="bg-[#92400e] px-4 py-1 border-4 border-black -rotate-2 shadow-lg">
                                            <span className="text-white font-black text-xl italic uppercase tracking-tighter">{bossName}</span>
                                        </div>
                                        <div className="w-64 h-6 bg-white border-4 border-black mt-2 -rotate-1 relative overflow-hidden">
                                            <div
                                                className="h-full bg-[#ef4444] transition-all duration-300"
                                                style={{ width: `${(bossHp.current / bossHp.max) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* CARTOON HUD BOTTOM (Weapons & Coins) */}
                                <div className="flex justify-between items-end w-full">
                                    <div className="flex flex-col gap-2 items-start">
                                        <div className="flex items-center gap-2 bg-yellow-400 px-4 py-2 border-4 border-black rounded-lg shadow-lg rotate-3">
                                            <span className="text-black font-black text-2xl italic">${ch3CoinsUI}</span>
                                        </div>
                                        <div className={`px-3 py-1 border-4 border-black rounded-md shadow-md -rotate-2 text-xs font-black transition-colors ${(!player.current.ch3RollingCooldown || player.current.ch3RollingCooldown <= 0) ? 'bg-white text-black' : 'bg-slate-400 text-slate-700'}`}>
                                            SHIFT: ROLL {(!player.current.ch3RollingCooldown || player.current.ch3RollingCooldown <= 0) ? 'READY' : 'WAIT'}
                                        </div>
                                        {/* SECONDARY WEAPON COOLDOWN */}
                                        {player.current.secondaryWeapon !== 'NONE' && (
                                            <div className="w-48 h-6 bg-white border-4 border-black rotate-1 relative overflow-hidden mt-1 shadow-md">
                                                <div
                                                    className="h-full bg-purple-500"
                                                    style={{ width: `${100 - (player.current.secondaryCooldownTimer / 1800) * 100}%` }}
                                                />
                                                <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-black uppercase">
                                                    {player.current.secondaryCooldownTimer > 0 ? 'RECHARGING' : 'ABILITY READY'}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex gap-4">
                                        {[0, 1].map(idx => {
                                            const wId = ch3Loadout.current[idx];
                                            const weapon = CH3_WEAPONS.find(w => w.id === wId);
                                            const isSelected = selectedCh3Slot.current === idx;
                                            return (
                                                <div key={idx} className={`w-28 h-16 bg-white border-8 border-black rounded-xl p-2 flex flex-col items-center justify-center transition-all ${isSelected ? 'scale-110 -translate-y-4 shadow-2xl bg-yellow-200' : 'opacity-40 grayscale'} `}>
                                                    <span className="text-[10px] font-black uppercase text-black leading-none">{idx === 0 ? 'SLOT A' : 'SLOT B'}</span>
                                                    <span className="text-xs font-black text-[#92400e] text-center leading-tight">{weapon?.name || '---'}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="absolute top-4 right-4 flex flex-col items-end gap-2 pointer-events-none">
                                    <div className="flex items-center gap-2 bg-red-950/80 border border-red-800 p-2 rounded shadow-lg backdrop-blur-sm mb-2">
                                        <AlertTriangle size={16} className="text-red-500 animate-pulse" />
                                        <div className="flex flex-col items-end leading-none">
                                            <span className="text-[10px] text-red-300 font-bold uppercase tracking-wider">System Reboots</span>
                                            <span className="text-lg font-bold text-red-100">{deathsUntilReset} / 10 REMAINING</span>
                                        </div>
                                    </div>

                                    {collectedUpgrades.map((item, idx) => (
                                        <div key={idx} className="flex items-center gap-3 bg-slate-950/80 border border-slate-800 p-2 rounded shadow-lg backdrop-blur-sm animate-[fadeIn_0.5s_ease-out] flex-row-reverse text-right">
                                            <div className="bg-slate-900 p-1 rounded border border-slate-700">
                                                {getUpgradeIcon(item.upgrade.id, 14)}
                                            </div>
                                            <div className="flex flex-col leading-none items-end">
                                                <span className="text-xs text-slate-300 font-bold tracking-wide uppercase">{item.upgrade.name}</span>
                                                <span className="text-[10px] text-slate-500">{item.upgrade.rarity}</span>
                                            </div>
                                            <div className="mr-2 flex items-center justify-center bg-yellow-500/20 text-yellow-400 text-xs font-bold px-1.5 py-0.5 rounded border border-yellow-500/30">
                                                x{item.count}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="w-full h-full flex flex-col justify-between pointer-events-none">
                                    <div className="flex flex-col items-center mt-2">
                                        <h2 className="text-red-500 font-bold text-xl tracking-[0.2em] animate-pulse drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]">
                                            {bossName}
                                        </h2>
                                        {bossModifiers.length > 0 && (
                                            <div className="flex flex-col items-center gap-1 mt-1">
                                                <div className="text-[10px] text-red-400 font-bold tracking-widest border-b border-red-900/50 mb-1">THREAT MODIFIERS</div>
                                                {bossModifiers.map((mod, i) => (
                                                    <div key={i} className="text-xs text-yellow-300 font-mono bg-red-950/40 px-2 py-0.5 rounded border border-red-900/50">
                                                        {mod}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        <div className="w-3/4 h-6 bg-slate-900 border-2 border-red-900 skew-x-[-20deg] overflow-hidden relative mt-2">
                                            <div className="h-full bg-red-600 transition-all duration-200" style={{ width: `${(bossHp.current / bossHp.max) * 100}%` }} />
                                        </div>
                                    </div>

                                    <div className="w-full flex justify-between items-end mb-4">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-blue-400 font-bold tracking-widest text-lg">SYSTEM INTEGRITY</span>
                                            <div className="w-64 h-4 bg-slate-900 border border-blue-900 rounded">
                                                <div className="h-full bg-blue-500 transition-all duration-100" style={{ width: `${(playerHp.current / playerHp.max) * 100}%` }} />
                                            </div>
                                            <div className="text-blue-300 text-sm">{Math.floor(playerHp.current)} / {Math.floor(playerHp.max)}</div>
                                        </div>

                                        <div className="flex flex-col items-end gap-1">
                                            <span className="text-purple-400 font-bold tracking-widest text-lg uppercase">
                                                {player.current.secondaryWeapon !== 'NONE' ? player.current.secondaryWeapon : 'NO MODULE'}
                                            </span>
                                            {player.current.secondaryWeapon !== 'NONE' && (
                                                <div className="flex flex-col items-end">
                                                    <div className="w-48 h-4 bg-slate-900 border border-purple-900 rounded relative overflow-hidden">
                                                        <div className="h-full bg-purple-900 transition-all duration-75 absolute right-0 top-0 bottom-0" style={{ width: `${(player.current.secondaryCooldownTimer / player.current.secondaryCooldownMax) * 100}%`, opacity: 0.5 }} />
                                                        <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold tracking-widest">
                                                            {player.current.secondaryCooldownTimer > 0 ? 'RECHARGING...' : 'READY [R-CLICK]'}
                                                        </div>
                                                    </div>
                                                    <span className="text-[10px] text-purple-300 mt-1">LEVEL {player.current.secondaryWeaponLevel} {player.current.secondaryWeaponLevel === 3 ? '(MAX)' : ''}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {player.current.invertedControls && (
                            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-red-600 text-white px-4 py-1 rounded font-bold animate-pulse">
                                WARNING: CONTROLS INVERTED
                            </div>
                        )}

                        <div className="text-xs text-slate-500 font-mono absolute bottom-4 left-1/2 -translate-x-1/2">
                            WASD Move | SPACE Dash | L-CLICK Fire | R-CLICK Ability | Q Switch Weapon
                        </div>
                    </div>
                )}

                {uiState === GameState.UPGRADING && (
                    <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center pointer-events-auto backdrop-blur-md z-50 p-8">
                        <div className="mb-12 text-center animate-[fadeIn_0.5s_ease-out]">
                            <h2 className="text-4xl font-black text-cyan-400 tracking-[0.3em] uppercase drop-shadow-[0_0_15px_rgba(34,211,238,0.5)] mb-2">
                                System Evolution
                            </h2>
                            <div className="h-1 w-64 bg-cyan-900 mx-auto"></div>
                            <p className="text-slate-400 mt-4 font-mono text-sm tracking-widest italic">CHOOSE AN AUGMENTATION TO PROCEED</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl px-4">
                            {availableUpgrades.map((upg, idx) => (
                                <button
                                    key={upg.id}
                                    onClick={() => selectUpgrade(upg)}
                                    className="group relative aspect-square bg-slate-900/80 border-2 border-slate-800 p-8 rounded-2xl flex flex-col items-center justify-center text-center hover:border-cyan-500 hover:bg-slate-800 transition-all duration-300 hover:scale-105 hover:shadow-[0_0_40px_rgba(34,211,238,0.3)] animate-[slideUp_0.5s_ease-out] fill-mode-forwards"
                                    style={{ animationDelay: `${idx * 0.15}s` }}
                                >
                                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-slate-950 border border-slate-700 rounded-full text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] group-hover:text-cyan-400 group-hover:border-cyan-400 transition-colors shadow-lg">
                                        {upg.rarity}
                                    </div>

                                    <div className="w-20 h-20 bg-slate-950 rounded-2xl border-2 border-slate-800 flex items-center justify-center mb-6 group-hover:border-cyan-500 group-hover:rotate-12 transition-all shadow-inner">
                                        {getUpgradeIcon(upg.id, 40)}
                                    </div>

                                    <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-tighter group-hover:text-cyan-400 transition-colors">
                                        {upg.name}
                                    </h3>

                                    <div className="text-xs text-slate-400 font-bold leading-relaxed mb-8 group-hover:text-slate-200 transition-colors h-12 flex items-center justify-center px-4">
                                        {upg.description || "Experimental protocol augmentation."}
                                    </div>

                                    <div className="mt-4 px-6 py-2.5 bg-cyan-950/50 rounded-lg font-black text-[10px] text-cyan-400 uppercase tracking-widest border border-cyan-800 group-hover:bg-cyan-500 group-hover:text-white group-hover:border-cyan-400 transition-all">
                                        EQUIP MODULE
                                    </div>
                                </button>
                            ))}
                        </div>

                        <div className="mt-12 text-slate-600 font-mono text-[10px] uppercase tracking-tighter animate-pulse">
                            Hardware synchronization in progress... 98%
                        </div>
                    </div>
                )}

                {uiState === GameState.MENU && (
                    <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center pointer-events-auto backdrop-blur-sm z-50">
                        <h1 className="text-6xl font-black text-white tracking-tighter mb-2" style={{ textShadow: '4px 4px 0px #ef4444' }}>
                            BOSS RUSH
                        </h1>
                        <button
                            onClick={() => setUiState(GameState.CHAPTER_SELECT)}
                            className="group relative px-8 py-4 bg-transparent border-2 border-white text-white font-bold text-xl uppercase tracking-widest hover:bg-white hover:text-black transition-all"
                        >
                            <Target size={24} className="inline mr-2" />
                            SELECT CHAPTER
                            <div className="absolute inset-0 bg-white/20 scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
                        </button>

                        <div className="mt-8 text-slate-400 text-sm flex flex-col items-center gap-2">
                            <div className="flex items-center gap-2"><Rocket size={16} /> Movement: WASD / Arrows</div>
                            <div className="flex items-center gap-2"><Zap size={16} /> Dash: Space (Invincible)</div>
                            <div className="flex items-center gap-2"><Skull size={16} /> Shoot: Click / J</div>
                            <div className="flex items-center gap-2"><Target size={16} /> Ability: R-Click / K</div>
                        </div>

                        <button
                            onClick={() => setShowPasswordModal(true)}
                            className="absolute bottom-4 right-4 text-slate-600 hover:text-white transition-colors"
                        >
                            <Lock size={16} />
                        </button>

                        {showPasswordModal && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-50">
                                <div className="bg-slate-900 border border-slate-700 p-8 rounded shadow-2xl flex flex-col gap-4 w-96">
                                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                        <Lock size={20} className="text-cyan-400" /> Security Clearance
                                    </h3>
                                    <input
                                        type="password"
                                        value={passwordInput}
                                        onChange={(e) => setPasswordInput(e.target.value)}
                                        placeholder="Enter Access Code"
                                        className="bg-black border border-slate-600 p-3 text-white focus:outline-none focus:border-cyan-500 font-mono tracking-widest"
                                        onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
                                        autoFocus
                                    />
                                    {loginError && <span className="text-red-500 text-xs">ACCESS DENIED</span>}
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => { setShowPasswordModal(false); setLoginError(false); setPasswordInput(''); }} className="px-4 py-2 text-slate-400 hover:text-white">Cancel</button>
                                        <button onClick={handleAdminLogin} className="px-4 py-2 bg-cyan-900 text-cyan-100 hover:bg-cyan-700">Login</button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {uiState === GameState.ADMIN && (
                    <div className="absolute inset-0 bg-slate-950/98 flex flex-col p-8 pointer-events-auto overflow-y-auto">
                        <div className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
                            <h1 className="text-4xl font-black text-cyan-400 tracking-widest flex items-center gap-4">
                                <Database size={32} /> ADMIN CONSOLE
                            </h1>
                            <button
                                onClick={() => { setUiState(GameState.MENU); }}
                                className="text-slate-500 hover:text-white"
                            >
                                Log Out
                            </button>
                        </div>

                        <div className="flex gap-8 h-full">
                            <div className="flex-1 overflow-y-auto">
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-slate-400 font-bold uppercase tracking-widest">Inject Upgrades</h2>
                                    <div className="flex items-center gap-2 bg-slate-900 p-1 rounded border border-slate-700">
                                        <span className="text-[10px] text-slate-500 font-bold px-2 uppercase">Weapon Level:</span>
                                        {[0, 1, 2, 3].map(lvl => (
                                            <button
                                                key={lvl}
                                                onClick={() => {
                                                    setAdminWeaponLevel(lvl);
                                                    if (player.current.secondaryWeapon !== 'NONE') {
                                                        player.current.secondaryWeaponLevel = lvl;
                                                        // Update the existing virtual upgrade in collectedUpgrades so it persists on restart
                                                        setCollectedUpgrades(prev => {
                                                            return prev.map(item => {
                                                                if (item.upgrade.type === 'SECONDARY_WEAPON') {
                                                                    const wType = item.upgrade.weaponType;
                                                                    return {
                                                                        ...item,
                                                                        upgrade: {
                                                                            ...item.upgrade,
                                                                            id: `admin_w_${wType}_lvl${lvl}`,
                                                                            apply: (pl: Player) => {
                                                                                pl.secondaryWeapon = wType as SecondaryWeaponType;
                                                                                pl.secondaryWeaponLevel = lvl;
                                                                                pl.secondaryCooldownMax = SECONDARY_WEAPON_STATS[wType as SecondaryWeaponType].cooldown;
                                                                            }
                                                                        }
                                                                    };
                                                                }
                                                                return item;
                                                            });
                                                        });
                                                    }
                                                }}
                                                className={`px-3 py-1 text-xs font-bold rounded transition-colors ${adminWeaponLevel === lvl ? 'bg-cyan-600 text-white shadow-[0_0_10px_rgba(8,145,178,0.5)]' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                                            >
                                                L{lvl}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    {UPGRADE_POOL.map((upg) => (
                                        <div key={upg.id} className="bg-slate-900 border border-slate-800 p-4 rounded flex justify-between items-center group hover:border-cyan-500 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className="p-2 bg-black rounded border border-slate-700">
                                                    {getUpgradeIcon(upg.id, 20)}
                                                </div>
                                                <div>
                                                    <div className="text-white font-bold">{upg.name}</div>
                                                    <div className="text-xs text-slate-500">{upg.rarity}</div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => adminAddUpgrade(upg)}
                                                className="p-2 bg-slate-800 hover:bg-cyan-600 text-white rounded transition-colors"
                                            >
                                                <Plus size={20} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="w-80 border-l border-slate-800 pl-8 flex flex-col">
                                <h2 className="text-slate-400 font-bold mb-4 uppercase tracking-widest">Current Loadout</h2>
                                <div className="flex-1 bg-black/50 rounded border border-slate-800 p-4 mb-4 overflow-y-auto">
                                    {collectedUpgrades.length === 0 && (
                                        <div className="text-slate-600 text-center mt-10">No modifications active.</div>
                                    )}
                                    {collectedUpgrades.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center text-sm border-b border-slate-800/50 py-2 last:border-0">
                                            <span className="text-slate-300">{item.upgrade.name}</span>
                                            <span className="text-cyan-400 font-mono font-bold">x{item.count}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex flex-col gap-2">
                                    <button
                                        onClick={() => setGodModeEnabled(!godModeEnabled)}
                                        className={`w-full py-3 font-bold uppercase tracking-widest flex items-center justify-center gap-2 border-2 transition-colors ${godModeEnabled ? 'bg-red-600 border-red-500 text-white' : 'bg-transparent border-red-900 text-red-500 hover:bg-red-900/30'}`}
                                    >
                                        <Heart size={20} /> {godModeEnabled ? "VIDA INFINITA: ACTIVA" : "VIDA INFINITA: INACTIVA"}
                                    </button>
                                    <button
                                        onClick={() => {
                                            unlockChapter(2);
                                            unlockChapter(3);
                                        }}
                                        className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-bold uppercase tracking-widest shadow-lg shadow-green-900/20 flex items-center justify-center gap-2 mt-2"
                                    >
                                        <Unlock size={20} /> UNLOCK ALL CHAPTERS
                                    </button>
                                    <button
                                        onClick={() => startGame(3)}
                                        className="w-full py-4 bg-orange-600 hover:bg-orange-500 text-white font-bold uppercase tracking-widest shadow-lg shadow-orange-900/20 flex items-center justify-center gap-2"
                                    >
                                        <Target size={20} /> Capítulo 3
                                    </button>
                                    <button
                                        onClick={() => startGame(2)}
                                        className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white font-bold uppercase tracking-widest shadow-lg shadow-purple-900/20 flex items-center justify-center gap-2"
                                    >
                                        <Ghost size={20} /> Capítulo 2
                                    </button>
                                    <button
                                        onClick={() => startGame(1)}
                                        className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-bold uppercase tracking-widest shadow-lg shadow-cyan-900/20 flex items-center justify-center gap-2"
                                    >
                                        <Rocket size={20} /> Launch Game
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {uiState === GameState.GAME_OVER && (
                    <div className="absolute inset-0 bg-red-950/90 flex flex-col items-center justify-center pointer-events-auto backdrop-blur-md z-50">
                        <h1 className="text-6xl font-black text-red-500 tracking-widest mb-4">CRITICAL FAILURE</h1>
                        <p className="text-white text-xl mb-8">System destroyed by {bossName}</p>
                        <div className="mb-8 p-4 bg-black/40 rounded border border-red-800 text-center">
                            <p className="text-red-300 text-sm mb-1">EMERGENCY BACKUP POWER</p>
                            <p className="text-2xl font-bold text-white">{deathsUntilReset} / 10 Reboots Remaining</p>
                            <p className="text-slate-400 text-xs mt-2">Upgrades will persist until power depletion.</p>
                        </div>
                        <button
                            onClick={() => startGame(player.current.isSoulMode ? 2 : (currentChapter.current === 3 ? 3 : 1))}
                            className="px-8 py-3 bg-red-600 text-white font-bold rounded shadow-lg hover:bg-red-500 transition-colors flex items-center gap-2"
                        >
                            <RefreshCw size={20} /> Reboot System
                        </button>
                    </div>
                )}

                {uiState === GameState.VICTORY && (
                    <div className="absolute inset-0 bg-blue-950/90 flex flex-col items-center justify-center pointer-events-auto backdrop-blur-md z-50">
                        <h1 className="text-6xl font-black text-yellow-400 tracking-widest mb-4">ASCENSION COMPLETE</h1>
                        <p className="text-white text-xl mb-8">All targets neutralized.</p>
                        <button
                            onClick={() => startGame(player.current.isSoulMode ? 2 : (currentChapter.current === 3 ? 3 : 1))}
                            className="px-8 py-3 bg-yellow-500 text-black font-bold rounded shadow-lg hover:bg-yellow-400 transition-colors"
                        >
                            Play Again (New Game+)
                        </button>
                    </div>
                )}

                {uiState === GameState.CHAPTER_SELECT && (
                    <div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center p-8 z-50 overflow-y-auto pointer-events-auto">
                        <div className="relative mb-8">
                            <h2 className="text-5xl font-black text-white italic tracking-tighter flex items-center gap-4 drop-shadow-[0_2px_4px_rgba(34,211,238,0.5)]">
                                <Target size={40} className="text-cyan-400 animate-pulse" /> MISSION SELECTION
                            </h2>
                            <div className="h-1 w-full bg-cyan-900 mt-2"></div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl">
                            {/* Chapter 1 */}
                            <div className="bg-slate-900 border-2 border-blue-500/50 p-6 rounded-2xl flex flex-col items-center text-center hover:border-blue-400 transition-all group overflow-hidden relative">
                                <div className="absolute top-0 right-0 p-2 bg-blue-500/10 rounded-bl-xl text-[10px] font-bold text-blue-400">SCI-FI CLASSIC</div>
                                <h3 className="text-2xl font-black text-blue-400 mb-2">CHAPTER 1</h3>
                                <p className="text-slate-400 text-xs mb-6 h-12">Combat subroutines in the deep blue grid. Neutralize the 5 sentinels.</p>

                                <div className="flex flex-col gap-2 w-full mt-auto">
                                    <button
                                        onClick={() => startGame(1, 0)}
                                        className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg active:translate-y-1"
                                    >
                                        REBOOT FROM START
                                    </button>
                                </div>
                            </div>

                            {/* Chapter 2 */}
                            <div className={`bg-slate-900 border-2 ${phase2Unlocked ? 'border-purple-500/50 hover:border-purple-400' : 'border-slate-800'} p-6 rounded-2xl flex flex-col items-center text-center transition-all group relative`}>
                                {!phase2Unlocked && (
                                    <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center rounded-2xl">
                                        <Lock size={48} className="text-slate-600 mb-2 animate-bounce" />
                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Defeat Chapter 1 to Unlock</span>
                                    </div>
                                )}
                                <div className="absolute top-0 right-0 p-2 bg-purple-500/10 rounded-bl-xl text-[10px] font-bold text-purple-400 uppercase">Void Soul</div>
                                <h3 className={`text-2xl font-black ${phase2Unlocked ? 'text-purple-400' : 'text-slate-600'} mb-2`}>CHAPTER 2</h3>
                                <p className="text-slate-400 text-xs mb-6 h-12">The digital afterlife. Merge your soul with the architecture.</p>

                                <div className="flex flex-col gap-2 w-full mt-auto">
                                    <button
                                        onClick={() => startGame(2, 5)}
                                        disabled={!phase2Unlocked}
                                        className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-all shadow-lg active:translate-y-1"
                                    >
                                        ENTER THE VOID
                                    </button>
                                </div>
                            </div>

                            {/* Chapter 3 */}
                            <div className={`bg-slate-900 border-2 ${chapter3Unlocked ? 'border-orange-500/50 hover:border-orange-400' : 'border-slate-800'} p-6 rounded-2xl flex flex-col items-center text-center transition-all group relative`}>
                                {!chapter3Unlocked && (
                                    <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center rounded-2xl">
                                        <Lock size={48} className="text-slate-600 mb-2 animate-bounce" />
                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Defeat Chapter 2 to Unlock</span>
                                    </div>
                                )}
                                <div className="absolute top-0 right-0 p-2 bg-orange-500/10 rounded-bl-xl text-[10px] font-bold text-orange-400 uppercase italic">Cartoon Chaos</div>
                                <h3 className={`text-2xl font-black ${chapter3Unlocked ? 'text-orange-400' : 'text-slate-600'} mb-2 italic`}>CHAPTER 3</h3>
                                <p className="text-slate-400 text-xs mb-6 h-12">Hand-painted nightmares. High velocity jazz combat.</p>

                                <div className="flex flex-col gap-2 w-full mt-auto">
                                    <button
                                        onClick={() => {
                                            setUiState(GameState.CH3_SHOP);
                                            gameState.current = GameState.CH3_SHOP;
                                        }}
                                        disabled={!chapter3Unlocked}
                                        className="w-full py-3 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl transition-all shadow-lg active:translate-y-1 italic"
                                    >
                                        GO CARTOON!
                                    </button>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => setUiState(GameState.MENU)}
                            className="mt-12 text-slate-500 hover:text-white flex items-center gap-2 group transition-colors"
                        >
                            <RefreshCw size={14} className="group-hover:rotate-180 transition-transform duration-500" />
                            Return to Main Menu
                        </button>
                    </div>
                )}

                {uiState === GameState.CH3_SHOP && (
                    <div className="absolute inset-0 bg-[#fef3c7] flex flex-col p-8 z-50 pointer-events-auto overflow-hidden">
                        {/* Cartoon Background pattern */}
                        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#d97706 2px, transparent 2px)', backgroundSize: '20px 20px' }}></div>

                        <div className="relative flex justify-between items-center mb-8 border-b-4 border-[#d97706] pb-4">
                            <h2 className="text-5xl font-black text-[#92400e] italic tracking-tighter" style={{ textShadow: '2px 2px 0px #fff' }}>
                                PORKY'S WEAPON SHOP
                            </h2>
                            <div className="flex items-center gap-6">
                                <div className="bg-[#fbbf24] px-6 py-2 rounded-full border-4 border-[#92400e] flex items-center gap-3">
                                    <div className="w-8 h-8 bg-yellow-400 rounded-full border-2 border-yellow-600 flex items-center justify-center font-bold text-yellow-900">$</div>
                                    <span className="text-2xl font-black text-[#92400e]">{ch3CoinsUI} COINS</span>
                                </div>
                                <button onClick={() => setUiState(GameState.CH3_INVENTORY)} className="px-6 py-2 bg-[#92400e] text-white font-bold rounded hover:bg-[#78350f] transition-colors">
                                    MY GEAR
                                </button>
                                <button onClick={() => setUiState(GameState.CHAPTER_SELECT)} className="text-[#92400e] font-bold underline">BACK</button>
                            </div>
                        </div>

                        <div className="relative grid grid-cols-1 md:grid-cols-4 gap-6 overflow-y-auto pb-12 pr-4 scrollbar-hide">
                            {CH3_WEAPONS.map(weapon => {
                                const isOwned = ch3OwnedUI.includes(weapon.id);
                                const canAfford = ch3Coins.current >= weapon.price;

                                return (
                                    <div key={weapon.id} className={`bg-white border-4 p-6 rounded-2xl flex flex-col aspect-[4/5] ${isOwned ? 'border-green-500' : 'border-[#92400e]'} shadow-[8px_8px_0px_rgba(146,64,14,0.2)] hover:-translate-y-1 transition-transform`}>
                                        <div className="flex justify-between items-start mb-4">
                                            <span className="text-[10px] font-black bg-[#fef3c7] px-2 py-1 rounded border-2 border-[#92400e] uppercase text-[#92400e]">{weapon.type}</span>
                                            <span className="font-black text-2xl text-[#92400e]">${weapon.price}</span>
                                        </div>
                                        <h3 className="text-2xl font-black text-[#451a03] mb-2 uppercase tracking-tighter leading-none">{weapon.name}</h3>
                                        <p className="text-xs text-[#78350f] font-bold leading-snug flex-1 mb-6">{weapon.description}</p>

                                        {isOwned ? (
                                            <div className="w-full py-3 bg-green-100 text-green-700 font-black text-center rounded-xl border-2 border-green-500 uppercase tracking-widest">OWNED</div>
                                        ) : (
                                            <button
                                                disabled={!canAfford}
                                                onClick={() => {
                                                    ch3Coins.current -= weapon.price;
                                                    setCh3CoinsUI(ch3Coins.current);
                                                    ch3WeaponsOwned.current = [...ch3WeaponsOwned.current, weapon.id];
                                                    setCh3OwnedUI(ch3WeaponsOwned.current);
                                                    localStorage.setItem('chapter3_coins', ch3Coins.current.toString());
                                                    localStorage.setItem('chapter3_weapons_owned', JSON.stringify(ch3WeaponsOwned.current));
                                                }}
                                                className={`w-full py-3 font-black rounded-xl border-b-[6px] transition-all active:border-b-0 active:translate-y-1 ${canAfford ? 'bg-yellow-400 border-yellow-700 hover:bg-yellow-300 text-[#78350f]' : 'bg-slate-200 border-slate-400 text-slate-400 cursor-not-allowed'}`}
                                            >
                                                BUY MODULE
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {uiState === GameState.CH3_INVENTORY && (
                    <div className="absolute inset-0 bg-[#dcfce7] flex flex-col p-8 z-50 pointer-events-auto overflow-hidden border-[12px] border-[#166534]">
                        <h2 className="text-6xl font-black text-[#14532d] mb-8 italic" style={{ textShadow: '3px 3px 0px #fff' }}>GEAR UP!</h2>

                        <div className="flex gap-8 h-[calc(100%-80px)]">
                            {/* Owned List */}
                            <div className="w-1/2 bg-white/60 rounded-3xl p-8 border-4 border-[#166534] flex flex-col shadow-[inset_0_2px_10px_rgba(0,0,0,0.1)]">
                                <h3 className="text-3xl font-black text-[#166534] mb-6 underline decoration-4 underline-offset-8 italic">COLLECTION</h3>
                                <div className="flex-1 grid grid-cols-2 gap-4 overflow-y-auto pr-4 scrollbar-hide">
                                    {ch3OwnedUI.map(id => {
                                        const weapon = CH3_WEAPONS.find(w => w.id === id);
                                        const isEquippedA = ch3LoadoutUI[0] === id;
                                        const isEquippedB = ch3LoadoutUI[1] === id;

                                        return (
                                            <div key={id} className={`p-4 rounded-2xl border-4 aspect-square flex flex-col justify-between transition-all ${isEquippedA || isEquippedB ? 'bg-yellow-100 border-yellow-500 shadow-lg scale-[0.98]' : 'bg-white border-[#166534] hover:border-green-600 shadow-md'}`}>
                                                <div>
                                                    <div className="font-black text-[#14532d] uppercase text-sm leading-none bg-green-50 px-2 py-1 rounded inline-block mb-2">{weapon?.name}</div>
                                                    <div className="text-[10px] text-[#166534] font-bold opacity-70 uppercase tracking-tighter">{weapon?.type}</div>
                                                </div>

                                                <div className="flex flex-col gap-2 mt-auto">
                                                    <button
                                                        onClick={() => {
                                                            const newLoadout: [number, number] = [id, ch3Loadout.current[1]];
                                                            ch3Loadout.current = newLoadout;
                                                            setCh3LoadoutUI(newLoadout);
                                                            localStorage.setItem('chapter3_loadout', JSON.stringify(newLoadout));
                                                        }}
                                                        className={`w-full py-2 text-[10px] font-black rounded-lg border-b-4 transition-all active:border-b-0 active:translate-y-1 ${isEquippedA ? 'bg-yellow-500 border-yellow-800 text-yellow-900' : 'bg-white border-slate-300 text-slate-500 hover:bg-slate-50'}`}
                                                    >
                                                        EQUIP SLOT A
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            const newLoadout: [number, number] = [ch3Loadout.current[0], id];
                                                            ch3Loadout.current = newLoadout;
                                                            setCh3LoadoutUI(newLoadout);
                                                            localStorage.setItem('chapter3_loadout', JSON.stringify(newLoadout));
                                                        }}
                                                        className={`w-full py-2 text-[10px] font-black rounded-lg border-b-4 transition-all active:border-b-0 active:translate-y-1 ${isEquippedB ? 'bg-yellow-500 border-yellow-800 text-yellow-900' : 'bg-white border-slate-300 text-slate-500 hover:bg-slate-50'}`}
                                                    >
                                                        EQUIP SLOT B
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Current Loadout & Launch */}
                            <div className="flex-1 flex flex-col justify-between">
                                <div className="space-y-6">
                                    <div className="bg-[#fbbf24] border-4 border-[#92400e] p-6 rounded-3xl shadow-[8px_8px_0px_#92400e]">
                                        <h4 className="text-xl font-black text-[#78350f] mb-4">ACTIVE LOADOUT</h4>
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-4 bg-white/80 p-3 rounded-xl border-2 border-[#92400e]">
                                                <div className="w-12 h-12 bg-orange-200 rounded-lg flex items-center justify-center font-black text-2xl text-orange-800">A</div>
                                                <div>
                                                    <div className="font-black text-[#451a03]">{CH3_WEAPONS.find(w => w.id === ch3LoadoutUI[0])?.name || 'Empty'}</div>
                                                    <div className="text-[10px] font-bold text-[#92400e] uppercase">{CH3_WEAPONS.find(w => w.id === ch3LoadoutUI[0])?.type || 'Select a weapon'}</div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 bg-white/80 p-3 rounded-xl border-2 border-[#92400e]">
                                                <div className="w-12 h-12 bg-orange-200 rounded-lg flex items-center justify-center font-black text-2xl text-orange-800">B</div>
                                                <div>
                                                    <div className="font-black text-[#451a03]">{CH3_WEAPONS.find(w => w.id === ch3LoadoutUI[1])?.name || 'Empty'}</div>
                                                    <div className="text-[10px] font-bold text-[#92400e] uppercase">{CH3_WEAPONS.find(w => w.id === ch3LoadoutUI[1])?.type || 'Select a weapon'}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-4">
                                    <button
                                        onClick={() => startGame(3, ch3LastBossDefeated.current)}
                                        className="w-full py-6 bg-red-600 hover:bg-red-500 text-white font-black text-4xl rounded-3xl border-b-[10px] border-red-900 active:border-b-0 active:translate-y-2 transition-all shadow-2xl"
                                        style={{ textShadow: '3px 3px 0px #000' }}
                                    >
                                        READY! GO!
                                    </button>
                                    <button
                                        onClick={() => setUiState(GameState.CH3_SHOP)}
                                        className="text-center font-black text-[#14532d] hover:underline"
                                    >
                                        GO BACK TO SHOP
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
};
