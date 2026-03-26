$path = "components\GameCanvas.tsx"
$lines = Get-Content $path
$startIdx = 1707
$endIdx = 2040

$newText = @"
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
                bullets.current.push({ pos: {x,y}, vel: {x:vx, y:vy}, size: 10, color: '#f472b6', isEnemy: true, damage: 15, lifetime: 200, isParryable: true });
                return true;
            }
            return false;
        };

        // ── EL GUARDIÁN BINARIO ──────────────────────────
        if (b.type === BossType.CH2_GUARDIAN) {
            const attack = getAttackName('GUARDIAN');
            b.activeEffect = \`💻 GUARD PROTOCOL: \${attack}\`;

            if (attack === 'BINARY_RAIN') {
                ch2SoulColor.current = 'BLUE';
                if (b.customAttackTimer % Math.round(30 / spd) === 0) {
                    const cx = CH2_BOX.cx + ch2BoxOffsetX.current;
                    const bx = cx - ch2BoxW.current/2 + Math.random() * ch2BoxW.current;
                    if (!trySpawnParry(bx, CH2_BOX.cy - ch2BoxH.current/2 - 20, 0, 4.5 * spd)) {
                         bullets.current.push({ pos: { x: bx, y: CH2_BOX.cy - ch2BoxH.current/2 - 20 }, vel: { x: 0, y: 4.5 * spd }, size: 8, color: '#10b981', isEnemy: true, damage: 10, lifetime: 200, isBone: true, boneWidth: 10, boneHeight: 40, boneColor: 'WHITE' });
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
                     const ypos = p.gravityDir.y === 1 ? CH2_BOX.cy + ch2BoxH.current/2 - 10 : CH2_BOX.cy - ch2BoxH.current/2 + 10;
                     bullets.current.push({ pos: { x: CH2_BOX.cx + ch2BoxOffsetX.current + (Math.random() - 0.5) * ch2BoxW.current, y: ypos }, vel: { x: (Math.random() - 0.5) * 3, y: p.gravityDir.y * -2 }, size: 8, color: '#3b82f6', isEnemy: true, damage: 15, lifetime: 200 });
                }
            } else if (attack === 'LASER_GRID') {
                 b.boxState = 'MOVING';
                 ch2SoulColor.current = 'GREEN';
                 if (b.customAttackTimer % Math.round(90 / spd) === 0) {
                      const ang = Math.random() > 0.5 ? 0 : Math.PI/2;
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
            b.activeEffect = \`🧪 BREW: \${attack}\`;

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
                      bullets.current.push({ pos: { x: CH2_BOX.cx, y: CH2_BOX.cy + ch2BoxH.current/4 }, vel: { x: 0, y: 0 }, size: 8, color: '#22c55e', isEnemy: true, damage: 20, lifetime: 180, isBone: true, boneWidth: ch2BoxW.current * 0.8, boneHeight: ch2BoxH.current * 0.5, boneColor: 'WHITE' });
                 }
                 if (b.customAttackTimer % Math.round(40 / spd) === 0) {
                      bullets.current.push({ pos: { x: CH2_BOX.cx + (Math.random()-0.5)*ch2BoxW.current, y: CH2_BOX.cy - ch2BoxH.current/2 }, vel: { x: 0, y: 0 }, size: 5, color: '#fcd34d', isEnemy: false, damage: 0, lifetime: 160, isBone: true, boneWidth: 40, boneHeight: 10 }); // Friendly platform
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
            b.activeEffect = \`🎵 MEASURE: \${attack}\`;

            if (attack === 'RHYTHM_BEATS') {
                ch2SoulColor.current = 'BLUE';
                if (b.customAttackTimer % Math.round(45 / spd) === 0) {
                    const beatPos = CH2_BOX.cx + (Math.floor(Math.random() * 5) - 2) * 30;
                    bullets.current.push({ pos: { x: beatPos, y: CH2_BOX.cy - ch2BoxH.current/2 - 20 }, vel: { x: 0, y: 6 * spd }, size: 10, color: '#e2e8f0', isEnemy: true, damage: 20, lifetime: 120, effect: 'BOUNCE', maxBounces: 2 });
                }
            } else if (attack === 'SOUND_WAVES') {
                ch2SoulColor.current = 'RED';
                if (b.customAttackTimer % Math.round(90 / spd) === 0) {
                     for (let i=0; i<3; i++) {
                         bullets.current.push({ pos: { x: CH2_BOX.cx - ch2BoxW.current/2 - 20, y: p.pos.y + (i-1)*30 }, vel: { x: 4 * spd, y: 0 }, size: 8, color: '#475569', isEnemy: true, damage: 15, lifetime: 200, effect: 'WAVE' });
                     }
                }
            } else if (attack === 'BOX_COMPRESSION') {
                b.boxState = 'SHRINKING';
                ch2SoulColor.current = 'GREEN';
                if (b.customAttackTimer % Math.round(60 / spd) === 0) {
                     trySpawnParry(CH2_BOX.cx + (Math.random()-0.5)*100, CH2_BOX.cy - ch2BoxH.current, 0, 5) || 
                     bullets.current.push({ pos: { x: CH2_BOX.cx + (Math.random()-0.5)*100, y: CH2_BOX.cy - ch2BoxH.current }, vel: { x: 0, y: 5 }, size: 8, color: '#facc15', isEnemy: true, damage: 20, lifetime: 200 });
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
            b.activeEffect = \`ERR: \${attack}\`;

            if (attack === 'GLITCH_STORM') {
                ch2SoulColor.current = 'RED';
                ch2GlitchIntensity.current = 10;
                if (b.customAttackTimer % Math.round(10 / spd) === 0) {
                     bullets.current.push({ pos: { x: CH2_BOX.cx + (Math.random()-0.5)*ch2BoxW.current, y: CH2_BOX.cy - ch2BoxH.current/2 }, vel: { x: (Math.random()-0.5)*2, y: 5*spd }, size: 6, color: '#ec4899', isEnemy: true, damage: 15, lifetime: 100, effect: 'REALITY_BREAK' });
                }
            } else if (attack === 'TELEPORT_STRIKE') {
                ch2SoulColor.current = 'GREEN';
                if (b.customAttackTimer % Math.round(90 / spd) === 0) {
                     spawnParticles(b.pos, '#fff', 20, 5);
                     b.pos = { x: CH2_BOX.cx + (Math.random()-0.5)*ch2BoxW.current*1.5, y: CH2_BOX.cy + (Math.random()-0.5)*ch2BoxH.current*1.5 };
                     bullets.current.push({ pos: { ...b.pos }, vel: { x: 0, y: 0 }, size: 30, color: '#f43f5e', isEnemy: true, damage: 25, lifetime: 60, isBlaster: true, blasterTimer: 30, blasterPhase: 'WARN' });
                }
            } else if (attack === 'FAKE_BULLETS') {
                ch2SoulColor.current = 'BLUE';
                if (b.customAttackTimer % Math.round(20 / spd) === 0) {
                     const isFake = Math.random() > 0.5;
                     bullets.current.push({ pos: { x: CH2_BOX.cx + ch2BoxW.current/2 + 20, y: p.pos.y + (Math.random()-0.5)*20 }, vel: { x: -6*spd, y: 0 }, size: 8, color: isFake ? 'rgba(236,72,153,0.2)' : '#ec4899', isEnemy: true, damage: isFake ? 0 : 20, lifetime: 150 });
                }
            } else if (attack === 'BOX_SHIFT') {
                b.boxState = 'MOVING';
                ch2SoulColor.current = 'RED';
                if (b.customAttackTimer % Math.round(40 / spd) === 0) {
                     trySpawnParry(CH2_BOX.cx, CH2_BOX.cy, (Math.random()-0.5)*5, (Math.random()-0.5)*5) || 
                     bullets.current.push({ pos: { x: CH2_BOX.cx, y: CH2_BOX.cy }, vel: { x: (Math.random()-0.5)*5*spd, y: (Math.random()-0.5)*5*spd }, size: 10, color: '#f43f5e', isEnemy: true, damage: 20, lifetime: 150 });
                }
            }
        }

        // ── SKELETON KING ────────────────────────────────
        else if (b.type === BossType.CH2_SKELETON_KING) {
            const attack = getAttackName('SKELETON_KING');
            b.activeEffect = \`☠ KR: \${Math.round(p.krDamageAccumalator)} | \${attack}\`;

            if (p.krDamageAccumalator > 0 && frameCount.current % 30 === 0) {
                p.hp = Math.max(1, p.hp - p.krDamageAccumalator * 0.15);
            }

            if (attack === 'BONE_CAGE') {
                 ch2SoulColor.current = 'BLUE';
                 if (b.customAttackTimer % Math.round(60 / spd) === 0) {
                      const posTop = { x: p.pos.x, y: CH2_BOX.cy - ch2BoxH.current/2 - 20 };
                      const posBot = { x: p.pos.x, y: CH2_BOX.cy + ch2BoxH.current/2 + 20 };
                      bullets.current.push({ pos: posTop, vel: { x: 0, y: 3*spd }, size: 8, color: '#f1f5f9', isEnemy: true, damage: 15, lifetime: 100, isBone: true, boneWidth: 20, boneHeight: 60, boneColor: 'WHITE' });
                      bullets.current.push({ pos: posBot, vel: { x: 0, y: -3*spd }, size: 8, color: '#f1f5f9', isEnemy: true, damage: 15, lifetime: 100, isBone: true, boneWidth: 20, boneHeight: 60, boneColor: 'WHITE' });
                 }
            } else if (attack === 'GIGA_BLASTER') {
                 b.boxState = 'EXPANDING';
                 ch2SoulColor.current = 'RED';
                 if (b.customAttackTimer % Math.round(100 / spd) === 0) {
                      bullets.current.push({ pos: { x: CH2_BOX.cx - ch2BoxW.current/2 - 50, y: p.pos.y }, vel: { x: 0, y: 0 }, size: 40, color: '#94a3b8', isEnemy: true, damage: 30, lifetime: 120, isBlaster: true, blasterTimer: 80, blasterPhase: 'WARN' });
                 }
            } else if (attack === 'SWORD_SLASH') {
                 ch2SoulColor.current = 'GREEN';
                 if (b.customAttackTimer % Math.round(20 / spd) === 0) {
                      const a = Math.random() * Math.PI * 2;
                      bullets.current.push({ pos: { x: CH2_BOX.cx + Math.cos(a)*100, y: CH2_BOX.cy + Math.sin(a)*100 }, vel: { x: -Math.cos(a)*6*spd, y: -Math.sin(a)*6*spd }, size: 8, color: '#f1f5f9', isEnemy: true, damage: 20, lifetime: 100, isBone: true, boneWidth: 40, boneHeight: 10, boneColor: 'ORANGE' });
                 }
            } else if (attack === 'PARRY_ORBS') {
                 ch2SoulColor.current = 'BLUE';
                 if (b.customAttackTimer % Math.round(40 / spd) === 0) {
                      if (!trySpawnParry(CH2_BOX.cx + ch2BoxW.current/2, p.pos.y-20, -5*spd, -3)) {
                           bullets.current.push({ pos: { x: CH2_BOX.cx + ch2BoxW.current/2, y: p.pos.y }, vel: { x: -5*spd, y: 0 }, size: 8, color: '#f1f5f9', isEnemy: true, damage: 15, lifetime: 120, isBone: true, boneWidth: 20, boneHeight: 40, boneColor: 'BLUE' });
                      }
                 }
            }
        }
    };
"@
$lines = $lines[0..$startIdx] + ($newText -split "`r`n|`n") + $lines[$endIdx..($lines.Count - 1)]
Set-Content -Path $path -Value ($lines -join "`n")
