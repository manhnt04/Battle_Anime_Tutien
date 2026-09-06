import { CONSTANTS, distance, clamp, lerp, randomRange, randomInt, setRandomSeed, parsePixiColor } from './utils.js';
import { GameMap } from './map.js';
import { Player } from './player.js';
import { Enemy } from './enemy.js';
import {
    ProjectilePool, MeleeAttack,
    BoomerangFan, SkillZone, TornadoEffect, LeapSlamEffect,
    SkyfallEffect, DashBlinkEffect, GhostThrustEffect, FireArrowArcEffect,
    ShunpoEffect, MugetsuWaveEffect, ManchesterSmashEffect, UnitedStatesSmashEffect,
    ChidoriDashEffect, KamuiVortexEffect, SusanooAuraEffect, StrikeAirEffect,
    ExcaliburBeamEffect, TripleGateEffect, EnkiduChainEffect, EnumaElishVortexEffect
} from './weapon.js';
import { LootManager } from './loot.js';
import { ParticleSystem } from './particles.js';
import { audio } from './audio.js';
import { AnimeShaderManager, AdditiveVFXRenderer } from './vfx.js';
import { NetworkManager } from './multiplayer.js';

export class Camera {
    constructor(width, height) {
        this.x = 0;
        this.y = 0;
        this.width = width;
        this.height = height;
        this.shakeX = 0;
        this.shakeY = 0;
        this.shakeIntensity = 0;
        this.target = null;
    }

    follow(target) {
        this.target = target;
    }

    update() {
        if (this.target && this.target.alive) {
            const targetX = this.target.x - this.width / 2;
            const targetY = this.target.y - this.height / 2;
            this.x = lerp(this.x, targetX, 0.08);
            this.y = lerp(this.y, targetY, 0.08);
        }

        if (this.shakeIntensity > 0) {
            this.shakeX = (Math.random() - 0.5) * this.shakeIntensity;
            this.shakeY = (Math.random() - 0.5) * this.shakeIntensity;
            this.shakeIntensity *= 0.9;
            if (this.shakeIntensity < 0.5) this.shakeIntensity = 0;
        } else {
            this.shakeX = 0;
            this.shakeY = 0;
        }

        this.x = clamp(this.x, 0, CONSTANTS.MAP_WIDTH - this.width);
        this.y = clamp(this.y, 0, CONSTANTS.MAP_HEIGHT - this.height);
    }

    addShake(amount) {
        this.shakeIntensity = Math.max(this.shakeIntensity, amount);
    }

    getRenderX() {
        return this.x + this.shakeX;
    }

    getRenderY() {
        return this.y + this.shakeY;
    }
}

export class SafeZone {
    constructor() {
        this.x = CONSTANTS.MAP_WIDTH / 2;
        this.y = CONSTANTS.MAP_HEIGHT / 2;
        this.radius = Math.max(CONSTANTS.MAP_WIDTH, CONSTANTS.MAP_HEIGHT) * 0.45;
        this.startRadius = this.radius;
        this.targetRadius = this.radius;
        this.startX = this.x;
        this.startY = this.y;
        this.nextX = this.x;
        this.nextY = this.y;
        this.shrinking = false;
        this.shrinkElapsed = 0;
        this.shrinkDuration = 30000;
        this.timeUntilShrink = 30000;
        this.damage = CONSTANTS.ZONE_DAMAGE;
        this.pulseTimer = 0;
    }

    update(dt) {
        this.timeUntilShrink -= dt;
        this.pulseTimer += 0.04;

        if (this.timeUntilShrink <= 0 && !this.shrinking) {
            this.startShrink();
        }

        if (this.shrinking) {
            this.shrinkElapsed += dt;
            const progress = Math.min(1, this.shrinkElapsed / this.shrinkDuration);
            // Frame-rate independent linear interpolation
            this.radius = lerp(this.startRadius, this.targetRadius, progress);
            this.x = lerp(this.startX, this.nextX, progress);
            this.y = lerp(this.startY, this.nextY, progress);

            if (progress >= 1) {
                this.shrinking = false;
                this.timeUntilShrink = 30000;
                this.startRadius = this.radius;
                this.startX = this.x;
                this.startY = this.y;
            }
        }
    }

    startShrink() {
        this.shrinking = true;
        this.shrinkElapsed = 0;
        this.startRadius = this.radius;
        this.startX = this.x;
        this.startY = this.y;
        this.targetRadius = Math.max(150, this.radius * 0.6);
        this.nextX = clamp(this.x + randomRange(-300, 300), 200, CONSTANTS.MAP_WIDTH - 200);
        this.nextY = clamp(this.y + randomRange(-300, 300), 200, CONSTANTS.MAP_HEIGHT - 200);
        audio.playZoneWarning();
    }

    isInside(x, y) {
        return distance(x, y, this.x, this.y) <= this.radius;
    }

    draw(ctx, camera) {
        const sx = this.x - camera.getRenderX();
        const sy = this.y - camera.getRenderY();

        ctx.save();
        const pulse = Math.sin(this.pulseTimer) * 2;
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.75)';
        ctx.shadowColor = '#00e5ff';
        ctx.shadowBlur = 10;
        ctx.lineWidth = 4 + pulse;
        ctx.setLineDash([20, 10]);
        ctx.beginPath();
        ctx.arc(sx, sy, Math.max(1, this.radius), 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.shadowBlur = 0;

        ctx.fillStyle = 'rgba(0, 229, 255, 0.025)';
        ctx.beginPath();
        ctx.arc(sx, sy, Math.max(1, this.radius), 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(123, 31, 162, 0.16)';
        ctx.beginPath();
        ctx.rect(-camera.shakeX, -camera.shakeY, camera.width, camera.height);
        ctx.arc(sx, sy, Math.max(1, this.radius), 0, Math.PI * 2, true);
        ctx.fill();

        if (this.shrinking) {
            ctx.strokeStyle = 'rgba(255, 215, 0, 0.45)';
            ctx.lineWidth = 2;
            ctx.setLineDash([10, 6]);
            ctx.beginPath();
            ctx.arc(this.nextX - camera.getRenderX(), this.nextY - camera.getRenderY(), Math.max(1, this.targetRadius), 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        ctx.restore();
    }

    drawPixi(g, camera) {
        if (!g) return;
        g.clear();
        const pulse = Math.sin(this.pulseTimer) * 2;
        const r = Math.max(1, this.radius);

        // Safe zone inner tint
        g.circle(this.x, this.y, r).fill({ color: 0x00e5ff, alpha: 0.025 });

        // Safe zone border ring
        g.circle(this.x, this.y, r).stroke({ color: 0x00e5ff, width: 4 + pulse, alpha: 0.85 });

        // Outer Poison Miasma (Độc Vụ)
        const strokeW = 3200;
        g.circle(this.x, this.y, r + strokeW / 2)
         .stroke({ color: 0x7b1fa2, width: strokeW, alpha: 0.18 });

        // Next safe zone preview if shrinking
        if (this.shrinking) {
            g.circle(this.nextX, this.nextY, Math.max(1, this.targetRadius))
             .stroke({ color: 0xffd700, width: 2, alpha: 0.5 });
        }
    }
}

export class Airdrop {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.height = 360;
        this.fallSpeed = 1.4;
        this.falling = true;
        this.looted = false;
        this.radius = 20;
        this.bobOffset = 0;
        this.view = null;
    }

    update(dt, particles) {
        if (this.falling) {
            this.height -= this.fallSpeed;
            if (this.height <= 0) {
                this.height = 0;
                this.falling = false;
                audio.playGong();
            }
        } else if (!this.looted) {
            this.bobOffset += 0.05;
            if (Math.random() < 0.35 && particles) {
                particles.airdropPillar(this.x, this.y);
            }
        }
    }

    initPixi(parentLayer) {
        if (typeof window === 'undefined' || !window.PIXI) return;
        this.destroyPixi();

        this.view = new window.PIXI.Container();
        this.view.position.set(this.x, this.y - this.height);

        this.g = new window.PIXI.Graphics();
        this.txt = new window.PIXI.Text({
            text: '⚡ BẢO RƯƠNG [F]',
            style: {
                fontSize: 12,
                fontWeight: 'bold',
                fill: 0xffffff,
                align: 'center'
            }
        });
        this.txt.anchor.set(0.5);
        this.txt.position.set(0, -26);

        this.view.addChild(this.g);
        this.view.addChild(this.txt);

        if (parentLayer) {
            parentLayer.addChild(this.view);
            this.parentLayer = parentLayer;
        }
        this.updatePixiView();
    }

    destroyPixi() {
        if (this.view) {
            if (this.parentLayer) {
                this.parentLayer.removeChild(this.view);
            }
            this.view.destroy({ children: true });
            this.view = null;
            this.parentLayer = null;
        }
    }

    updatePixiView() {
        if (!this.view) return;
        this.view.position.set(this.x, this.y - this.height);
        this.g.clear();

        if (this.falling) {
            this.txt.visible = false;
            const chuteY = -40;
            // Parachute
            this.g.arc(0, chuteY, 32, Math.PI, 0).fill({ color: 0xffd700, alpha: 0.85 });
            // Suspension lines
            this.g.moveTo(-30, chuteY).lineTo(-8, 0).stroke({ color: 0xffffff, width: 1.5, alpha: 0.6 });
            this.g.moveTo(30, chuteY).lineTo(8, 0).stroke({ color: 0xffffff, width: 1.5, alpha: 0.6 });
        } else {
            this.txt.visible = !this.looted;
        }

        // Box
        const boxCol = this.looted ? 0x424242 : 0xffb300;
        const borderCol = this.looted ? 0x616161 : 0xfff8e1;
        this.g.rect(-16, -12, 32, 24).fill({ color: boxCol, alpha: 1 });
        this.g.rect(-16, -12, 32, 24).stroke({ color: borderCol, width: 2.5, alpha: 1 });

        // Center jewel
        const jewelCol = this.looted ? 0x9e9e9e : 0xe040fb;
        this.g.circle(0, 0, 4.5).fill({ color: jewelCol, alpha: 1 });
    }

    draw(ctx, camera) {
        const sx = this.x - camera.getRenderX();
        const sy = this.y - camera.getRenderY() - this.height;

        ctx.save();

        if (this.falling) {
            const chuteY = sy - 40;
            ctx.fillStyle = 'rgba(255, 215, 0, 0.85)';
            ctx.shadowColor = '#ffd700';
            ctx.shadowBlur = 15;
            ctx.beginPath();
            ctx.arc(sx, chuteY, 32, Math.PI, 0);
            ctx.fill();

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(sx - 30, chuteY);
            ctx.lineTo(sx - 8, sy);
            ctx.moveTo(sx + 30, chuteY);
            ctx.lineTo(sx + 8, sy);
            ctx.stroke();
        }

        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = this.looted ? 0 : 20;
        ctx.fillStyle = this.looted ? '#424242' : '#ffb300';
        ctx.fillRect(sx - 16, sy - 12, 32, 24);

        ctx.strokeStyle = this.looted ? '#616161' : '#fff8e1';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(sx - 16, sy - 12, 32, 24);

        ctx.fillStyle = this.looted ? '#9e9e9e' : '#e040fb';
        ctx.beginPath();
        ctx.arc(sx, sy, 4.5, 0, Math.PI * 2);
        ctx.fill();

        if (!this.falling && !this.looted) {
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('⚡ BẢO RƯƠNG [F]', sx, sy - 20);
        }

        ctx.restore();
    }
}

export class Game {
    constructor(canvas, minimapCanvas) {
        this.canvas = canvas;
        this.ctx = (typeof window !== 'undefined' && window.PIXI)
            ? null
            : (canvas && typeof canvas.getContext === 'function' ? canvas.getContext('2d') : null);
        this.minimapCanvas = minimapCanvas;
        this.minimapCtx = minimapCanvas && typeof minimapCanvas.getContext === 'function'
            ? minimapCanvas.getContext('2d')
            : null;
        this.camera = new Camera(
            typeof window !== 'undefined' ? window.innerWidth : 1920,
            typeof window !== 'undefined' ? window.innerHeight : 1080
        );
        this.pixiApp = null;
        this.vfxManager = null;
        this.map = new GameMap();
        this.player = null;
        this.enemies = [];
        this.projectilePool = new ProjectilePool(140);
        this.meleeAttacks = [];
        this.activeSkills = [];
        this.skillZones = [];
        this.lootManager = new LootManager(this.map);
        this.particles = new ParticleSystem(600);
        this.particles.camera = this.camera;
        this.safeZone = new SafeZone();
        this.airdrops = [];
        this.airdropTimer = 35000;
        this.playerZoneTimer = 0;
        this.remotePlayers = new Map();
        this.isRoomMode = false;
        this.isRoomGuest = false;
        this.respawnTimer = 0;
        this.networkManager = new NetworkManager(this);
        this.input = {
            keys: {},
            mouse: { x: null, y: null, down: false, rightDown: false },
            joystick: { active: false, x: 0, y: 0 },
            camera: this.camera
        };
        this.state = 'menu';
        this.lastTime = 0;
        this.fixedStep = 1000 / 60;
        this.accumulator = 0;
        this.maxFrameDelta = 100;
        this.animationFrameId = null;
        this.boundLoop = this.loop.bind(this);
        this.minimapAccumulator = 0;
        this.minimapInterval = 1000 / 15;
        this.visualStateDirty = true;
        this.safeZoneVisualAccumulator = 1000 / 30;
        this.safeZoneVisualInterval = 1000 / 30;
        this.frameTimeSamples = new Float32Array(300);
        this.frameTimeSampleCount = 0;
        this.frameTimeSampleIndex = 0;
        this.frameTimeP95 = 0;
        this.updateTimeAvg = 0;
        this.renderTimeAvg = 0;
        this.gameTime = 0;
        this.playersAlive = 0;
        this.winner = null;
        this.screenShakeEnabled = true;
        this.showFps = true;
        this.fps = 0;
        this.frameCount = 0;
        this.lastFpsTime = 0;
        this.screenDarkenTimer = 0;
        this.screenFlashTimer = 0;
        this.lockedTarget = null;
        this.hitStopTimer = 0;

        this.setupInput();
        this.resize();
        if (typeof window !== 'undefined') {
            window.addEventListener('resize', () => this.resize());
        }
    }

    async initRenderer() {
        if (typeof window === 'undefined' || !window.PIXI) {
            if (this.canvas && typeof this.canvas.getContext === 'function' && !this.ctx) {
                this.ctx = this.canvas.getContext('2d');
            }
            return;
        }

        try {
            this.pixiApp = new window.PIXI.Application();
            const renderResolution = Math.min(window.devicePixelRatio || 1, 1.5);
            await this.pixiApp.init({
                canvas: this.canvas,
                width: window.innerWidth,
                height: window.innerHeight,
                backgroundColor: 0x1e2920,
                // Native DPR 2-3 multiplies fill-rate by 4-9x. A 1.5 cap is a
                // much better trade-off for the 6.94 ms budget of a 144 Hz frame.
                resolution: renderResolution,
                autoDensity: true,
                antialias: false,
                powerPreference: 'high-performance',
                // The game owns the only requestAnimationFrame loop. Leaving the
                // Pixi ticker running would render the same display list twice.
                autoStart: false
            });

            // Be explicit for Pixi versions/configurations that start the ticker
            // before Application.init() options are applied.
            this.pixiApp.stop();

            this.setupPixiLayers();
        } catch (err) {
            console.warn('PixiJS initialization failed, falling back to Canvas 2D:', err);
            this.pixiApp = null;
            if (this.canvas && typeof this.canvas.getContext === 'function') {
                this.ctx = this.canvas.getContext('2d');
            }
        }
    }

    setupPixiLayers() {
        if (!this.pixiApp) return;

        // Root world container
        this.worldContainer = new window.PIXI.Container();
        this.pixiApp.stage.addChild(this.worldContainer);

        // Layers in draw order
        this.groundLayer = new window.PIXI.Container();
        this.worldContainer.addChild(this.groundLayer);

        this.safeZoneLayer = new window.PIXI.Container();
        this.safeZoneGraphics = new window.PIXI.Graphics();
        this.safeZoneLayer.addChild(this.safeZoneGraphics);
        this.worldContainer.addChild(this.safeZoneLayer);

        this.skillZoneLayer = new window.PIXI.Container();
        this.skillZoneGraphics = new window.PIXI.Graphics();
        this.skillZoneLayer.addChild(this.skillZoneGraphics);
        this.worldContainer.addChild(this.skillZoneLayer);

        this.obstacleLayer = new window.PIXI.Container();
        this.worldContainer.addChild(this.obstacleLayer);

        this.airdropLayer = new window.PIXI.Container();
        this.worldContainer.addChild(this.airdropLayer);

        this.lootLayer = new window.PIXI.Container();
        this.worldContainer.addChild(this.lootLayer);

        // Attack Range Indicator Graphics (on the ground under characters)
        this.rangeIndicatorGraphics = new window.PIXI.Graphics();
        this.worldContainer.addChild(this.rangeIndicatorGraphics);

        this.characterLayer = new window.PIXI.Container();
        this.worldContainer.addChild(this.characterLayer);

        this.activeSkillLayer = new window.PIXI.Container();
        this.activeSkillGraphics = new window.PIXI.Graphics();
        this.activeSkillLayer.addChild(this.activeSkillGraphics);
        this.skillAimGraphics = new window.PIXI.Graphics();
        this.activeSkillLayer.addChild(this.skillAimGraphics);
        this.worldContainer.addChild(this.activeSkillLayer);

        // Target Lock Reticle Graphics (over characters and skills)
        this.targetLockGraphics = new window.PIXI.Graphics();
        this.worldContainer.addChild(this.targetLockGraphics);

        this.projectileLayer = new window.PIXI.Container();
        this.projectileGraphics = new window.PIXI.Graphics();
        this.projectileLayer.addChild(this.projectileGraphics);
        this.worldContainer.addChild(this.projectileLayer);

        this.particleLayer = new window.PIXI.Container();
        this.particleGraphics = new window.PIXI.Graphics();
        this.particleLayer.addChild(this.particleGraphics);
        this.worldContainer.addChild(this.particleLayer);

        // Additive glowing anime VFX layer (Neon / Blazing Energy)
        this.additiveLayer = new window.PIXI.Container();
        this.additiveGraphics = new window.PIXI.Graphics();
        this.additiveGraphics.blendMode = 'add';
        this.additiveLayer.addChild(this.additiveGraphics);
        this.worldContainer.addChild(this.additiveLayer);

        // High-Performance Anime VFX & Shader Manager
        this.vfxManager = new AnimeShaderManager(this.pixiApp);
        if (typeof window !== 'undefined') {
            window.vfxManager = this.vfxManager;
        }

        // Screen-space layers
        this.fogLayer = new window.PIXI.Container();
        this.fogGraphics = new window.PIXI.Graphics();
        this.fogLayer.addChild(this.fogGraphics);
        this.pixiApp.stage.addChild(this.fogLayer);

        // Fog geometry is invariant; only its screen-space position changes.
        // Building it once avoids re-tessellating two very wide circles every frame.
        const fogStrokeW = 1400;
        this.fogGraphics.circle(0, 0, 260 + fogStrokeW / 2)
            .stroke({ color: 0x050a08, width: fogStrokeW, alpha: 0.55 });
        this.fogGraphics.circle(0, 0, 170 + 90 / 2)
            .stroke({ color: 0x0a100c, width: 90, alpha: 0.2 });

        this.screenEffectGraphics = new window.PIXI.Graphics();
        this.pixiApp.stage.addChild(this.screenEffectGraphics);

        this.screenOverlayLayer = new window.PIXI.Container();
        this.fpsText = new window.PIXI.Text({
            text: '60 FPS',
            style: {
                fontFamily: 'monospace',
                fontSize: 14,
                fill: 0xffd700
            }
        });
        this.fpsText.position.set(10, 105);
        this.screenOverlayLayer.addChild(this.fpsText);
        this.pixiApp.stage.addChild(this.screenOverlayLayer);
    }

    setupInput() {
        if (typeof window === 'undefined') return;
        window.addEventListener('keydown', (e) => {
            this.input.keys[e.key.toLowerCase()] = true;

            if (this.state === 'playing') {
                if (e.key >= '1' && e.key <= '5') {
                    const slot = parseInt(e.key) - 1;
                    if (this.player) this.player.inventory.switchToSlot(slot);
                }

                // Spacebar: Normal Attack (Đánh thường)
                if (e.code === 'Space' || e.key === ' ') {
                    e.preventDefault();
                    this.playerShoot();
                    if (this.networkManager) this.networkManager.sendLocalAction('space_attack');
                }

                // Skill 1: J (hoặc Q)
                if (e.key.toLowerCase() === 'j' || e.key.toLowerCase() === 'q') {
                    this.playerUseSkill(0);
                    if (this.networkManager) this.networkManager.sendLocalAction('skill', { index: 0 });
                }

                // Skill 2: K (hoặc E)
                if (e.key.toLowerCase() === 'k' || e.key.toLowerCase() === 'e') {
                    const weapon = this.player?.inventory?.getCurrentWeapon();
                    if (weapon && weapon.skills && weapon.skills[1] && this.player.canUseSkill(1)) {
                        this.playerUseSkill(1);
                        if (this.networkManager) this.networkManager.sendLocalAction('skill', { index: 1 });
                    }
                }

                // Skill 3 (Tuyệt Kỹ): L (hoặc R)
                if (e.key.toLowerCase() === 'l' || e.key.toLowerCase() === 'r') {
                    const weapon = this.player?.inventory?.getCurrentWeapon();
                    if (weapon && weapon.skills && weapon.skills[2] && this.player.canUseSkill(2)) {
                        this.playerUseSkill(2);
                        if (this.networkManager) this.networkManager.sendLocalAction('skill', { index: 2 });
                    } else if (this.player) {
                        this.player.inventory.reload();
                    }
                }

                if (e.key.toLowerCase() === 'f') {
                    this.tryPickup();
                }
                if (e.key === 'Escape') {
                    this.pause();
                }
            }
        });

        window.addEventListener('keyup', (e) => {
            this.input.keys[e.key.toLowerCase()] = false;
        });

        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.input.mouse.x = e.clientX - rect.left;
            this.input.mouse.y = e.clientY - rect.top;
        });

        this.canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0) this.input.mouse.down = true;
            if (e.button === 2) this.input.mouse.rightDown = true;
            if (this.state === 'playing') {
                if (e.button === 0) {
                    this.playerShoot();
                    if (this.networkManager) this.networkManager.sendLocalAction('shoot');
                }
                if (e.button === 2) {
                    this.playerMelee();
                    if (this.networkManager) this.networkManager.sendLocalAction('melee');
                }
            }
        });

        this.canvas.addEventListener('mouseup', (e) => {
            if (e.button === 0) this.input.mouse.down = false;
            if (e.button === 2) this.input.mouse.rightDown = false;
        });

        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        this.setupMobileControls();
    }

    setupMobileControls() {
        if (typeof document === 'undefined') return;

        // Virtual Analog Joystick (Liên Quân Mobile Style)
        const joystickZone = document.getElementById('joystick-zone');
        const joystickBase = document.getElementById('joystick-base');
        const joystickKnob = document.getElementById('joystick-knob');

        if (joystickZone && joystickKnob) {
            const maxRadius = 46;
            let touchId = null;
            let baseRect = null;

            const updateBasePos = () => {
                if (joystickBase) baseRect = joystickBase.getBoundingClientRect();
            };

            const handleMove = (clientX, clientY) => {
                if (!baseRect) updateBasePos();
                const centerX = baseRect.left + baseRect.width / 2;
                const centerY = baseRect.top + baseRect.height / 2;
                const dx = clientX - centerX;
                const dy = clientY - centerY;
                const dist = Math.hypot(dx, dy);

                const clampedDist = Math.min(dist, maxRadius);
                const angle = Math.atan2(dy, dx);
                const knobX = Math.cos(angle) * clampedDist;
                const knobY = Math.sin(angle) * clampedDist;

                joystickKnob.style.transform = `translate(${knobX}px, ${knobY}px)`;
                this.input.joystick.active = dist > 5;
                this.input.joystick.x = knobX / maxRadius;
                this.input.joystick.y = knobY / maxRadius;
            };

            const handleEnd = () => {
                touchId = null;
                joystickKnob.style.transform = 'translate(0px, 0px)';
                this.input.joystick.active = false;
                this.input.joystick.x = 0;
                this.input.joystick.y = 0;
            };

            joystickZone.addEventListener('touchstart', (e) => {
                e.preventDefault();
                if (touchId !== null) return;
                const touch = e.changedTouches[0];
                touchId = touch.identifier;
                updateBasePos();
                handleMove(touch.clientX, touch.clientY);
            }, { passive: false });

            joystickZone.addEventListener('touchmove', (e) => {
                e.preventDefault();
                for (let i = 0; i < e.changedTouches.length; i++) {
                    const touch = e.changedTouches[i];
                    if (touch.identifier === touchId) {
                        handleMove(touch.clientX, touch.clientY);
                        break;
                    }
                }
            }, { passive: false });

            const onTouchEnd = (e) => {
                for (let i = 0; i < e.changedTouches.length; i++) {
                    if (e.changedTouches[i].identifier === touchId) {
                        handleEnd();
                        break;
                    }
                }
            };
            joystickZone.addEventListener('touchend', onTouchEnd);
            joystickZone.addEventListener('touchcancel', onTouchEnd);

            // Mouse interaction for desktop testing
            let isMouseDown = false;
            joystickZone.addEventListener('mousedown', (e) => {
                isMouseDown = true;
                updateBasePos();
                handleMove(e.clientX, e.clientY);
            });
            window.addEventListener('mousemove', (e) => {
                if (isMouseDown) {
                    handleMove(e.clientX, e.clientY);
                }
            });
            window.addEventListener('mouseup', () => {
                if (isMouseDown) {
                    isMouseDown = false;
                    handleEnd();
                }
            });
        }

        // Mobile Attack Button (Large 80px Action)
        const btnAttack = document.getElementById('btn-mobile-attack');
        if (btnAttack) {
            let attackInterval = null;
            const startAttack = (e) => {
                if (e) e.preventDefault();
                this.autoAimNearestTarget(360);
                this.playerShoot();
                if (!attackInterval) {
                    attackInterval = setInterval(() => {
                        if (this.state === 'playing') {
                            this.autoAimNearestTarget(360);
                            this.playerShoot();
                        }
                    }, 190);
                }
            };
            const stopAttack = (e) => {
                if (e && e.cancelable) e.preventDefault();
                if (attackInterval) {
                    clearInterval(attackInterval);
                    attackInterval = null;
                }
            };

            btnAttack.addEventListener('touchstart', startAttack, { passive: false });
            btnAttack.addEventListener('touchend', stopAttack);
            btnAttack.addEventListener('touchcancel', stopAttack);
            btnAttack.addEventListener('mousedown', startAttack);
            btnAttack.addEventListener('mouseup', stopAttack);
            btnAttack.addEventListener('mouseleave', stopAttack);
        }

        // Mobile Skill Buttons: hold, drag to aim, release to cast.
        const setupSkillBtn = (id, skillIndex) => {
            const btn = document.getElementById(id);
            if (!btn) return;
            let activeTouchId = null;
            let startX = 0;
            let startY = 0;
            let aimPoint = null;
            let dragged = false;
            let suppressClickUntil = 0;

            const getRange = () => {
                const weapon = this.player?.inventory?.getCurrentWeapon();
                const skill = weapon?.skills?.[skillIndex];
                return Math.max(100, skill?.range || skill?.radius || 220);
            };

            const updateAim = (clientX, clientY) => {
                if (!this.player) return;
                const dx = clientX - startX;
                const dy = clientY - startY;
                const dragDistance = Math.hypot(dx, dy);
                if (dragDistance > 8) dragged = true;
                const angle = dragDistance > 1 ? Math.atan2(dy, dx) : this.player.angle;
                const range = getRange();
                const castDistance = Math.max(40, range * Math.min(1, dragDistance / 90));
                aimPoint = {
                    x: this.player.x + Math.cos(angle) * castDistance,
                    y: this.player.y + Math.sin(angle) * castDistance
                };
                if (this.map && typeof this.map.clampSkillTarget === 'function') {
                    aimPoint = this.map.clampSkillTarget(
                        this.player.x,
                        this.player.y,
                        aimPoint.x,
                        aimPoint.y,
                        5
                    );
                }
                this.drawSkillAim(aimPoint, range);
            };

            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                if (activeTouchId !== null || !this.player?.canUseSkill(skillIndex)) return;
                const touch = e.changedTouches[0];
                activeTouchId = touch.identifier;
                startX = touch.clientX;
                startY = touch.clientY;
                dragged = false;
                updateAim(startX, startY);
            }, { passive: false });

            btn.addEventListener('touchmove', (e) => {
                e.preventDefault();
                for (let i = 0; i < e.changedTouches.length; i++) {
                    const touch = e.changedTouches[i];
                    if (touch.identifier === activeTouchId) {
                        updateAim(touch.clientX, touch.clientY);
                        break;
                    }
                }
            }, { passive: false });

            const finishAim = (e, cancelled) => {
                for (let i = 0; i < e.changedTouches.length; i++) {
                    if (e.changedTouches[i].identifier !== activeTouchId) continue;
                    e.preventDefault();
                    suppressClickUntil = performance.now() + 500;
                    if (!cancelled && this.player) {
                        const range = getRange();
                        if (!dragged) {
                            aimPoint = {
                                x: this.player.x + Math.cos(this.player.angle) * range,
                                y: this.player.y + Math.sin(this.player.angle) * range
                            };
                        }
                        this.playerUseSkill(skillIndex, aimPoint);
                    }
                    activeTouchId = null;
                    aimPoint = null;
                    this.clearSkillAim();
                    break;
                }
            };

            btn.addEventListener('touchend', (e) => finishAim(e, false), { passive: false });
            btn.addEventListener('touchcancel', (e) => finishAim(e, true), { passive: false });

            // Mouse click remains useful when testing the mobile HUD on desktop.
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                if (performance.now() < suppressClickUntil || !this.player) return;
                const range = getRange();
                this.playerUseSkill(skillIndex, {
                    x: this.player.x + Math.cos(this.player.angle) * range,
                    y: this.player.y + Math.sin(this.player.angle) * range
                });
            });
        };

        setupSkillBtn('btn-mobile-skill-0', 0);
        setupSkillBtn('btn-mobile-skill-1', 1);
        setupSkillBtn('btn-mobile-skill-2', 2);

        // Mobile Pickup [F]
        const btnPickup = document.getElementById('btn-mobile-pickup');
        if (btnPickup) {
            const triggerPickup = (e) => {
                if (e) e.preventDefault();
                this.tryPickup();
            };
            btnPickup.addEventListener('touchstart', triggerPickup, { passive: false });
            btnPickup.addEventListener('click', triggerPickup);
        }

        // Mobile Heal / Medicine
        const btnHeal = document.getElementById('btn-mobile-heal');
        if (btnHeal) {
            const triggerHeal = (e) => {
                if (e) e.preventDefault();
                this.healWithMedicine();
            };
            btnHeal.addEventListener('touchstart', triggerHeal, { passive: false });
            btnHeal.addEventListener('click', triggerHeal);
        }
    }

    drawSkillAim(targetPoint, range) {
        if (!this.skillAimGraphics || !this.player || !targetPoint) return;
        this.skillAimGraphics.clear();
        this.skillAimGraphics.moveTo(this.player.x, this.player.y)
            .lineTo(targetPoint.x, targetPoint.y)
            .stroke({ color: 0x00e5ff, width: 3, alpha: 0.75 });
        this.skillAimGraphics.circle(targetPoint.x, targetPoint.y, 18)
            .stroke({ color: 0xffd700, width: 3, alpha: 0.9 });
        this.skillAimGraphics.circle(this.player.x, this.player.y, range)
            .stroke({ color: 0x00e5ff, width: 1, alpha: 0.2 });
    }

    clearSkillAim() {
        if (this.skillAimGraphics) this.skillAimGraphics.clear();
    }

    updateLockedTarget() {
        if (!this.player || !this.player.alive) {
            this.lockedTarget = null;
            return null;
        }

        const weapon = this.player.inventory.getCurrentWeapon();
        const baseRange = weapon ? (weapon.range || 60) : 40;
        // Acquisition range: allows locking target as player approaches
        const searchRange = weapon?.type === 'ranged' ? Math.max(baseRange + 120, 520) : Math.max(baseRange * 3.0, 320);

        let bestTarget = null;
        let bestScore = -Infinity;

        // Collect all potential targets: enemies and remote players
        const candidates = [];
        if (this.enemies) {
            for (let i = 0; i < this.enemies.length; i++) {
                const e = this.enemies[i];
                if (e && e.alive) candidates.push(e);
            }
        }
        if (this.remotePlayers) {
            for (const rp of this.remotePlayers.values()) {
                if (rp && rp.alive) candidates.push(rp);
            }
        }

        for (let i = 0; i < candidates.length; i++) {
            const candidate = candidates[i];
            const dist = distance(this.player.x, this.player.y, candidate.x, candidate.y);
            if (dist > searchRange) continue;

            const hasLOS = !this.map || typeof this.map.hasLineOfSight !== 'function' ||
                this.map.hasLineOfSight(this.player.x, this.player.y, candidate.x, candidate.y);

            // Normalized distance: 1 (closest) -> 0 (at searchRange)
            const distScore = 1 - (dist / searchRange);

            // Normalized HP: 1 (lowest HP) -> 0 (full HP) for finishing low-health foes
            const maxHp = candidate.maxHealth || 100;
            const hpRatio = clamp((candidate.health || 0) / maxHp, 0, 1);
            const hpScore = 1 - hpRatio;

            // Angle difference between player heading and candidate
            const targetAngle = Math.atan2(candidate.y - this.player.y, candidate.x - this.player.x);
            let angleDiff = Math.abs(this.player.angle - targetAngle);
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            angleDiff = Math.abs(angleDiff);
            const angleScore = (Math.cos(angleDiff) + 1) / 2; // 1 in front, 0 behind

            // In-attack-range bonus
            const inRangeBonus = dist <= (baseRange + (candidate.radius || 20)) ? 0.35 : 0;

            // Target stickiness (avoid rapid hopping)
            const stickinessBonus = (this.lockedTarget === candidate) ? 0.30 : 0;

            // Line-of-sight multiplier
            const losMultiplier = hasLOS ? 1.0 : 0.2;

            // Composite Utility Score (utility scoring formula)
            const score = ((distScore * 0.45) + (hpScore * 0.25) + (angleScore * 0.30) + inRangeBonus + stickinessBonus) * losMultiplier;

            if (score > bestScore) {
                bestScore = score;
                bestTarget = candidate;
            }
        }

        // Secondary fallback: breakable crates if no enemy in range and close by
        if (!bestTarget && this.map && this.map.crates) {
            let minCrateDist = baseRange + 30;
            for (let i = 0; i < this.map.crates.length; i++) {
                const crate = this.map.crates[i];
                if (crate && crate.alive) {
                    const d = distance(this.player.x, this.player.y, crate.centerX, crate.centerY);
                    if (d < minCrateDist) {
                        minCrateDist = d;
                        bestTarget = crate;
                    }
                }
            }
        }

        this.lockedTarget = bestTarget;
        return bestTarget;
    }

    applyHitStop(duration = 70, shake = 4) {
        this.hitStopTimer = Math.max(this.hitStopTimer, duration);
        if (this.screenShakeEnabled && shake > 0) {
            this.camera.addShake(shake);
        }
    }

    autoAimNearestTarget(range = 500) {
        if (!this.player || !this.player.alive) return null;
        this.updateLockedTarget();
        if (this.lockedTarget) {
            const tx = this.lockedTarget.centerX !== undefined ? this.lockedTarget.centerX : this.lockedTarget.x;
            const ty = this.lockedTarget.centerY !== undefined ? this.lockedTarget.centerY : this.lockedTarget.y;
            this.player.angle = Math.atan2(ty - this.player.y, tx - this.player.x);
            return this.lockedTarget;
        }
        return null;
    }

    healWithMedicine() {
        if (!this.player || !this.player.alive) return;
        if (this.player.health >= this.player.maxHealth) {
            if (window.ui && typeof window.ui.addNotification === 'function') {
                window.ui.addNotification('Khí huyết đã tràn đầy, không cần dùng dược!', 'info');
            }
            return;
        }
        if ((this.player.medicines || 0) <= 0) {
            if (window.ui && typeof window.ui.addNotification === 'function') {
                window.ui.addNotification('Đã hết Đan Dược! Hãy phá thùng gỗ hoặc mở rương để tìm thêm.', 'warning');
            }
            return;
        }

        this.player.medicines--;
        this.player.heal(35);
        this.particles.heal(this.player.x, this.player.y);
        audio.playPickup();
        if (window.ui && typeof window.ui.addNotification === 'function') {
            window.ui.addNotification(`Uống Đan Dược hồi phục 35 Khí Huyết! (Còn ${this.player.medicines})`, 'success');
        }
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.camera.width = this.canvas.width;
        this.camera.height = this.canvas.height;
        if (this.pixiApp && this.pixiApp.renderer) {
            this.pixiApp.renderer.resize(window.innerWidth, window.innerHeight);
        }
    }

    applyWorldSeed(seed) {
        this.roomSeed = seed;
        this.currentGeneratedSeed = seed;
        setRandomSeed(seed);
        this.map.generateObstacles();
        this.lootManager.generateLoot(CONSTANTS.LOOT_COUNT);
        if (this.pixiApp) {
            this.map.initPixi(this.groundLayer, this.obstacleLayer);
            this.lootManager.initPixi(this.lootLayer);
        }
        setRandomSeed(null);
    }

    start() {
        audio.init();
        audio.startMusic();
        audio.playGong();

        // Deterministic Map & Loot Generation for Rooms
        if (this.isRoomMode && this.roomSeed) {
            setRandomSeed(this.roomSeed);
            this.currentGeneratedSeed = this.roomSeed;
        } else {
            setRandomSeed(null);
        }

        this.map.generateObstacles();
        this.lootManager.generateLoot(CONSTANTS.LOOT_COUNT);

        // Switch to unseeded random for player spawn points & combat randomness
        setRandomSeed(null);

        const spawn = this.map.getRandomSpawnPoint(CONSTANTS.PLAYER_RADIUS, 0);
        this.player = new Player(spawn.x, spawn.y, true);
        this.camera.follow(this.player);

        this.enemies = [];
        const enemyCount = (typeof this.customEnemyCount === 'number') ? this.customEnemyCount : CONSTANTS.MAX_ENEMIES;
        let enemyTypes = ['basic', 'basic', 'basic', 'aggressive', 'aggressive', 'cautious', 'cautious', 'sniper'];
        if (this.customDifficulty === 'easy') {
            enemyTypes = ['basic', 'basic', 'cautious'];
        } else if (this.customDifficulty === 'hard') {
            enemyTypes = ['aggressive', 'aggressive', 'aggressive', 'sniper'];
        }

        for (let i = 0; i < enemyCount; i++) {
            const pos = this.map.getRandomSpawnPoint(CONSTANTS.ENEMY_RADIUS, 280);
            const type = enemyTypes[randomInt(0, enemyTypes.length - 1)];
            const enemy = new Enemy(pos.x, pos.y, type);
            if (this.customDifficulty === 'easy') {
                enemy.damageModifier = 0.7;
            } else if (this.customDifficulty === 'hard') {
                enemy.damageModifier = 1.35;
                enemy.speed *= 1.15;
            }
            this.enemies.push(enemy);
        }

        if (this.pixiApp) {
            this.characterLayer.removeChildren();
            this.airdropLayer.removeChildren();
            this.map.initPixi(this.groundLayer, this.obstacleLayer);
            this.player.initPixi(this.characterLayer);
            for (let i = 0; i < this.enemies.length; i++) {
                this.enemies[i].initPixi(this.characterLayer);
            }
            this.lootManager.initPixi(this.lootLayer);
        }

        this.projectilePool.clear();
        this.meleeAttacks = [];
        this.activeSkills = [];
        this.skillZones = [];
        this.airdrops = [];
        this.airdropTimer = 35000;
        this.playerZoneTimer = 0;
        this.particles.clear();
        this.lockedTarget = null;
        this.hitStopTimer = 0;
        this.safeZone = new SafeZone();
        if (this.isRoomMode) {
            this.safeZone.radius = 999999;
            this.safeZone.startRadius = 999999;
            this.safeZone.targetRadius = 999999;
            this.safeZone.damage = 0;
            this.safeZone.isInside = () => true;
            this.safeZone.update = () => {};
            this.safeZone.draw = () => {};
            this.safeZone.drawPixi = (g) => { if (g) g.clear(); };
            if (this.isRoomGuest) {
                this.enemies = [];
            }
        }
        this.gameTime = 0;
        this.state = 'playing';
        this.lastTime = performance.now();
        this.accumulator = 0;
        this.minimapAccumulator = this.minimapInterval;
        this.visualStateDirty = true;
        this.safeZoneVisualAccumulator = this.safeZoneVisualInterval;
        this.frameTimeSampleCount = 0;
        this.frameTimeSampleIndex = 0;
        this.frameTimeP95 = 0;
        this.updateTimeAvg = 0;
        this.renderTimeAvg = 0;
        this.playersAlive = CONSTANTS.MAX_ENEMIES + 1;

        // Starting a new match must never leave an older RAF chain alive.
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
        }
        this.animationFrameId = requestAnimationFrame(this.boundLoop);
    }

    pause() {
        if (this.state === 'playing') {
            this.state = 'paused';
        } else if (this.state === 'paused') {
            this.state = 'playing';
            this.lastTime = performance.now();
            this.accumulator = 0;
        }
    }

    getTargets() {
        const list = [];
        if (this.player && this.player.alive) list.push(this.player);
        for (let i = 0; i < this.enemies.length; i++) {
            if (this.enemies[i].alive) list.push(this.enemies[i]);
        }
        if (this.remotePlayers) {
            for (const rp of this.remotePlayers.values()) {
                if (rp && rp.alive) list.push(rp);
            }
        }
        return list;
    }

    spawnAirdrop() {
        const angle = randomRange(0, Math.PI * 2);
        const dist = randomRange(40, this.safeZone.radius * 0.75);
        const ax = clamp(this.safeZone.x + Math.cos(angle) * dist, 200, CONSTANTS.MAP_WIDTH - 200);
        const ay = clamp(this.safeZone.y + Math.sin(angle) * dist, 200, CONSTANTS.MAP_HEIGHT - 200);

        const airdrop = new Airdrop(ax, ay);
        if (this.airdropLayer) {
            airdrop.initPixi(this.airdropLayer);
        }
        this.airdrops.push(airdrop);
        audio.playGong();

        if (window.ui && typeof window.ui.addNotification === 'function') {
            window.ui.addNotification('⚡ KỲ BẢO GIÁNG THẾ! Rương thần bí giáng trần!', 'warning');
        }
    }

    playerUseSkill(index, targetPointOverride = null) {
        if (!this.player || !this.player.alive) return;
        if (this.player.buffs && this.player.buffs.stun > 0) return;

        const activeWeapon = this.player.inventory.getCurrentWeapon();
        const activeSkill = activeWeapon?.skills?.[index];
        const defaultSkillRange = Math.max(100, activeSkill?.range || activeSkill?.radius || 220);
        let targetPoint = targetPointOverride || {
            x: this.player.x + Math.cos(this.player.angle) * defaultSkillRange,
            y: this.player.y + Math.sin(this.player.angle) * defaultSkillRange
        };

        if (this.map && typeof this.map.clampSkillTarget === 'function') {
            targetPoint = this.map.clampSkillTarget(
                this.player.x,
                this.player.y,
                targetPoint.x,
                targetPoint.y,
                5
            );
        }

        // Every directional/ground-targeted skill follows the selected drag
        // vector. Movement will take control of facing again on the next step.
        this.player.angle = Math.atan2(targetPoint.y - this.player.y, targetPoint.x - this.player.x);

        const res = this.player.useSkill(index, targetPoint, this);
        if (res) {
            if (this.networkManager) {
                this.networkManager.sendLocalAction('skill', { index, targetPoint, angle: this.player.angle });
            }
            audio.playShoot('KIEM_KHI');
            if (this.screenShakeEnabled) {
                this.camera.addShake(index === 2 ? 10 : 4);
            }
            if (index === 2 && this.vfxManager) {
                const screenX = this.player.x - this.camera.x;
                const screenY = this.player.y - this.camera.y;
                this.vfxManager.triggerShockwave(screenX, screenY, 400, 0.045);
            }
        }
    }

    fireRapidVolley(owner, count, damage, color) {
        if (!owner || !owner.alive) return;
        let fired = 0;
        const interval = setInterval(() => {
            if (!owner || !owner.alive || fired >= count) {
                clearInterval(interval);
                return;
            }
            fired++;

            let targetAngle = owner.angle;
            let nearest = null;
            let minDist = 500;
            const targets = owner === this.player ? this.enemies : [this.player];
            for (let i = 0; i < targets.length; i++) {
                const t = targets[i];
                if (t && t.alive) {
                    const d = distance(owner.x, owner.y, t.x, t.y);
                    if (d < minDist) {
                        minDist = d;
                        nearest = t;
                    }
                }
            }
            if (nearest) {
                targetAngle = Math.atan2(nearest.y - owner.y, nearest.x - owner.x);
            }

            this.projectilePool.spawn(
                owner.x + Math.cos(targetAngle) * 20,
                owner.y + Math.sin(targetAngle) * 20,
                targetAngle + randomRange(-0.06, 0.06),
                {
                    speed: 14,
                    range: 520,
                    damage: damage || 15,
                    radius: 3.5,
                    color: color || '#4caf6d',
                    pierce: 1
                },
                owner
            );
            audio.playShoot('BACH_HOP_CUNG');
        }, 120);
    }

    playerShoot() {
        if (!this.player || !this.player.alive) return;
        if (this.player.buffs && this.player.buffs.stun > 0) return;
        const weapon = this.player.inventory.getCurrentWeapon();
        if (!weapon) return;

        // Auto Lock-on aim towards locked target
        this.updateLockedTarget();
        if (this.lockedTarget && (this.lockedTarget.alive || this.lockedTarget.isCrate)) {
            const tx = this.lockedTarget.centerX !== undefined ? this.lockedTarget.centerX : this.lockedTarget.x;
            const ty = this.lockedTarget.centerY !== undefined ? this.lockedTarget.centerY : this.lockedTarget.y;
            this.player.angle = Math.atan2(ty - this.player.y, tx - this.player.x);
        } else if (this.input.mouse && this.input.mouse.x !== null) {
            const worldMouseX = this.input.mouse.x + this.camera.getRenderX();
            const worldMouseY = this.input.mouse.y + this.camera.getRenderY();
            this.player.angle = Math.atan2(worldMouseY - this.player.y, worldMouseX - this.player.x);
        }

        if (weapon.type === 'boomerang') {
            const results = weapon.fire(this.player);
            if (!results) return;
            audio.playShoot(weapon.name);
            const fan = new BoomerangFan(
                this.player,
                this.player.angle,
                results[0].data ? (results[0].data.range || 80) : (results[0].range || 80),
                results[0].data ? (results[0].data.damage || 2) : (results[0].damage || 2),
                weapon.color || '#ff7a45'
            );
            this.activeSkills.push(fan);
            if (this.screenShakeEnabled) this.camera.addShake(2);
            return;
        }

        const results = weapon.fire(this.player);
        if (!results) {
            if (weapon.type === 'ranged' && weapon.currentAmmo === 0) {
                this.player.inventory.reload();
            }
            return;
        }

        audio.playShoot(weapon.name);

        let hasProjectile = false;
        for (let i = 0; i < results.length; i++) {
            const item = results[i];
            if (item.type === 'melee') {
                let dmg = item.damage !== undefined ? item.damage : weapon.damage;
                const isBuffed = (this.player.buffs && (
                    this.player.buffs.demonForm > 0 ||
                    this.player.buffs.bloodAura > 0 ||
                    this.player.buffs.bankai > 0 ||
                    this.player.buffs.mugetsu > 0 ||
                    this.player.buffs.fullCowling > 0
                ));
                if (this.player.buffs && this.player.buffs.demonForm > 0) dmg *= 2;
                if (this.player.buffs && this.player.buffs.bloodAura > 0) dmg *= 1.5;
                if (!isBuffed) {
                    dmg = Math.min(dmg, 5);
                }

                const attack = new MeleeAttack(
                    this.player.x + Math.cos(this.player.angle) * this.player.radius,
                    this.player.y + Math.sin(this.player.angle) * this.player.radius,
                    this.player.angle,
                    item.range || weapon.range,
                    Math.PI / 1.4,
                    dmg,
                    this.player,
                    item.color || weapon.color
                );
                if (item.knockback) attack.knockback = item.knockback;
                if (item.stunChance) {
                    attack.stunChance = item.stunChance;
                    attack.stunDuration = item.stunDuration;
                }
                this.player.meleeAttacks.push(attack);
                audio.playMelee();
                if (this.particles && typeof this.particles.slash === 'function') {
                    this.particles.slash(
                        this.player.x + Math.cos(this.player.angle) * ((item.range || weapon.range) * 0.6),
                        this.player.y + Math.sin(this.player.angle) * ((item.range || weapon.range) * 0.6),
                        this.player.angle,
                        item.color || weapon.color
                    );
                }
            } else if (item.type === 'projectile') {
                hasProjectile = true;
                const pdata = item.data ? { ...item.data } : { ...item };
                const isBuffed = (this.player.buffs && (
                    this.player.buffs.demonForm > 0 ||
                    this.player.buffs.bloodAura > 0 ||
                    this.player.buffs.susanoo > 0
                ));
                if (this.player.buffs && this.player.buffs.demonForm > 0) pdata.damage *= 2;
                if (this.player.buffs && this.player.buffs.bloodAura > 0) pdata.damage *= 1.5;
                if (!isBuffed && !pdata.isGetsuga) {
                    pdata.damage = Math.min(pdata.damage, 5);
                }
                const spreadAngle = item.spread || 0;
                const fireAngle = this.player.angle + spreadAngle;
                this.projectilePool.spawn(
                    this.player.x + Math.cos(this.player.angle) * 20,
                    this.player.y + Math.sin(this.player.angle) * 20,
                    item.angle !== undefined ? item.angle : fireAngle,
                    pdata,
                    this.player
                );
            }
        }

        if (hasProjectile) {
            this.particles.muzzleFlash(
                this.player.x + Math.cos(this.player.angle) * 20,
                this.player.y + Math.sin(this.player.angle) * 20,
                this.player.angle,
                weapon.color
            );
        }

        if (this.screenShakeEnabled) {
            if (weapon.name.includes('ZANGETSU') || weapon.name.includes('ONE FOR ALL') || weapon.name.includes('EXCALIBUR')) {
                this.camera.addShake(5);
            } else if (weapon.name.includes('BÁCH HỢP') || weapon.name.includes('LONG UYỆT')) {
                this.camera.addShake(4);
            } else {
                this.camera.addShake(2);
            }
        }
    }

    playerMelee() {
        if (!this.player || !this.player.alive) return;
        if (this.player.buffs && this.player.buffs.stun > 0) return;
        const weapon = this.player.inventory.getCurrentWeapon();
        if (!weapon || weapon.type !== 'melee') {
            this.player.inventory.switchToSlot(0);
        }

        // Auto Lock-on aim towards locked target
        this.updateLockedTarget();
        if (this.lockedTarget && (this.lockedTarget.alive || this.lockedTarget.isCrate)) {
            const tx = this.lockedTarget.centerX !== undefined ? this.lockedTarget.centerX : this.lockedTarget.x;
            const ty = this.lockedTarget.centerY !== undefined ? this.lockedTarget.centerY : this.lockedTarget.y;
            this.player.angle = Math.atan2(ty - this.player.y, tx - this.player.x);
        } else if (this.input.mouse && this.input.mouse.x !== null) {
            const worldMouseX = this.input.mouse.x + this.camera.getRenderX();
            const worldMouseY = this.input.mouse.y + this.camera.getRenderY();
            this.player.angle = Math.atan2(worldMouseY - this.player.y, worldMouseX - this.player.x);
        }

        const meleeWeapon = this.player.inventory.getCurrentWeapon();
        let dmg = meleeWeapon.damage;
        const isBuffed = (this.player.buffs && (
            this.player.buffs.demonForm > 0 ||
            this.player.buffs.bloodAura > 0 ||
            this.player.buffs.bankai > 0 ||
            this.player.buffs.mugetsu > 0 ||
            this.player.buffs.fullCowling > 0
        ));
        if (this.player.buffs && this.player.buffs.demonForm > 0) dmg *= 2;
        if (this.player.buffs && this.player.buffs.bloodAura > 0) dmg *= 1.5;
        if (!isBuffed) {
            dmg = Math.min(dmg, 5);
        }

        const attack = new MeleeAttack(
            this.player.x + Math.cos(this.player.angle) * this.player.radius,
            this.player.y + Math.sin(this.player.angle) * this.player.radius,
            this.player.angle,
            meleeWeapon.range,
            Math.PI / 1.4,
            dmg,
            this.player
        );
        this.player.meleeAttacks.push(attack);
        audio.playMelee();

        if (this.particles && typeof this.particles.slash === 'function') {
            this.particles.slash(
                this.player.x + Math.cos(this.player.angle) * (meleeWeapon.range * 0.6),
                this.player.y + Math.sin(this.player.angle) * (meleeWeapon.range * 0.6),
                this.player.angle,
                meleeWeapon.color
            );
        }

        if (this.screenShakeEnabled) {
            this.camera.addShake(4);
        }
    }

    tryPickup() {
        if (!this.player || !this.player.alive) return;

        for (let i = 0; i < this.airdrops.length; i++) {
            const drop = this.airdrops[i];
            if (!drop.falling && !drop.looted) {
                const dist = distance(this.player.x, this.player.y, drop.x, drop.y);
                if (dist < this.player.radius + drop.radius + 15) {
                    drop.looted = true;
                    audio.playPickup();
                    this.particles.pickup(drop.x, drop.y);

                    const divineWeapons = [
                        'ZANGETSU', 'ONE_FOR_ALL', 'KATON', 'EXCALIBUR', 'GATE_OF_BABYLON',
                        'ZANGETSU', 'ONE_FOR_ALL', 'KATON'
                    ];
                    const pickedDivine = divineWeapons[randomInt(0, divineWeapons.length - 1)];
                    const droppedKey = this.player.inventory.setSingleWeapon(pickedDivine);
                    if (droppedKey && droppedKey !== 'QUYEN_CUOC' && droppedKey !== 'FISTS') {
                        this.lootManager.spawnWeapon(this.player.x, this.player.y, droppedKey);
                    }
                    this.player.addArmor(50);
                    this.player.heal(50);
                    this.player.medicines = Math.min(this.player.maxMedicines || 5, (this.player.medicines || 0) + 1);

                    if (window.ui && typeof window.ui.addNotification === 'function') {
                        window.ui.addNotification(`Nhận được Thần Khí: ${pickedDivine} & Đại Hoàn Đan!`, 'success');
                    }
                    return;
                }
            }
        }

        const item = this.lootManager.checkPickup(this.player.x, this.player.y, this.player.radius + 20);
        if (!item) return;

        audio.playPickup();
        this.particles.pickup(item.x, item.y);

        if (item.type === 'weapon' || item.type === 'melee') {
            const droppedKey = this.player.inventory.setSingleWeapon(item.rawKey || item.name);
            if (droppedKey && droppedKey !== 'QUYEN_CUOC' && droppedKey !== 'FISTS') {
                this.lootManager.spawnWeapon(this.player.x, this.player.y, droppedKey);
                if (window.ui && typeof window.ui.addNotification === 'function') {
                    window.ui.addNotification(`Hoán đổi thần binh: Đã rơi ${droppedKey} ra đất!`, 'info');
                }
            } else {
                if (window.ui && typeof window.ui.addNotification === 'function') {
                    window.ui.addNotification(`Trang bị thần binh: ${item.name}!`, 'success');
                }
            }
        } else if (item.type === 'health') {
            this.player.heal(item.value);
            this.player.medicines = Math.min(this.player.maxMedicines || 5, (this.player.medicines || 0) + 1);
            if (window.ui && typeof window.ui.addNotification === 'function') {
                window.ui.addNotification(`Nhặt Đan Dược! (Hiện có: ${this.player.medicines})`, 'info');
            }
        } else if (item.type === 'armor') {
            this.player.addArmor(item.value);
        } else if (item.type === 'ammo') {
            this.player.inventory.addAmmo(item.ammoType, item.amount);
        }
    }

    update(dt) {
        if (this.state !== 'playing') return;

        // Hit-Stop Micro-Freeze (Liên Quân / Anime Impact Feeling)
        if (this.hitStopTimer > 0) {
            this.hitStopTimer = Math.max(0, this.hitStopTimer - dt);
            dt *= 0.15;
        }

        this.gameTime += dt;
        if (this.screenDarkenTimer > 0) {
            this.screenDarkenTimer = Math.max(0, this.screenDarkenTimer - dt);
        }
        if (this.screenFlashTimer > 0) {
            this.screenFlashTimer = Math.max(0, this.screenFlashTimer - dt);
        }
        this.safeZone.update(dt);
        if (this.vfxManager) {
            this.vfxManager.update(dt);
        }

        this.airdropTimer -= dt;
        if (this.airdropTimer <= 0) {
            this.spawnAirdrop();
            this.airdropTimer = randomRange(45000, 60000);
        }

        for (let i = this.airdrops.length - 1; i >= 0; i--) {
            this.airdrops[i].update(dt, this.particles);
        }

        // Update player
        if (this.player && this.player.alive) {
            this.player.update(this.input, this.map, dt);

            // Poison Zone damage with exact 1-second accumulator tick
            if (!this.safeZone.isInside(this.player.x, this.player.y)) {
                this.playerZoneTimer += dt;
                if (this.playerZoneTimer >= 1000) {
                    this.playerZoneTimer = 0;
                    this.player.takeDamage(this.safeZone.damage);
                    this.particles.zoneDamage(this.player.x, this.player.y);
                    if (this.player.health <= 0) {
                        this.playerDied(this.player, null);
                    }
                }
            } else {
                this.playerZoneTimer = 0;
            }
        }

        // Update enemies
        for (let i = 0; i < this.enemies.length; i++) {
            const enemy = this.enemies[i];
            if (enemy.alive) {
                enemy.updateAI(this.player, this.enemies, this.map, this.lootManager, this.safeZone, dt, this.airdrops);
                enemy.update(null, this.map, dt);

                if (enemy.state === 'attack' && enemy.target === this.player) {
                    if (this.map.hasLineOfSight(enemy.x, enemy.y, this.player.x, this.player.y)) {
                        const results = enemy.tryFire();
                        if (results) {
                            for (let j = 0; j < results.length; j++) {
                                const result = results[j];
                                if (result.type === 'projectile') {
                                    this.projectilePool.spawn(
                                        enemy.x + Math.cos(enemy.angle) * 20,
                                        enemy.y + Math.sin(enemy.angle) * 20,
                                        result.angle,
                                        result.data,
                                        enemy
                                    );
                                }
                            }
                        }
                    }
                }

                // Enemy zone damage with individual accumulator
                if (!this.safeZone.isInside(enemy.x, enemy.y)) {
                    enemy.zoneTimer = (enemy.zoneTimer || 0) + dt;
                    if (enemy.zoneTimer >= 1000) {
                        enemy.zoneTimer = 0;
                        enemy.takeDamage(this.safeZone.damage);
                        if (enemy.health <= 0) {
                            this.playerDied(enemy, null);
                        }
                    }
                } else {
                    enemy.zoneTimer = 0;
                }
            }
        }

        // Update remote players
        if (this.remotePlayers) {
            for (const rp of this.remotePlayers.values()) {
                if (rp.alive) {
                    rp.update(null, this.map, dt);
                }
            }
        }

        // Continuous Auto Lock-on Target Selection (Liên Quân Mobile Style)
        this.updateLockedTarget();

        const targets = this.getTargets();

        // Update skill zones (fire ring, hell zone, etc.)
        for (let i = this.skillZones.length - 1; i >= 0; i--) {
            const zone = this.skillZones[i];
            zone.update(dt, targets, this.map, this);
            if (!zone.alive) {
                this.skillZones.splice(i, 1);
            }
        }

        // Update active skills (fans, leap slams, tornados, skyfall, dashes, etc.)
        for (let i = this.activeSkills.length - 1; i >= 0; i--) {
            const skill = this.activeSkills[i];
            if (typeof skill.update === 'function') {
                skill.update(dt, targets, this.map, this);
            }
            if (!skill.alive) {
                this.activeSkills.splice(i, 1);
            }
        }

        // Update projectiles via ProjectilePool (zero-allocation)
        const pool = this.projectilePool.pool;

        for (let i = 0; i < pool.length; i++) {
            const proj = pool[i];
            if (!proj.active) continue;

            proj.update();
            if (!proj.active) continue;

            // Breakable crate collision check
            const hitCrate = this.map.findCrateAt(proj.x, proj.y, proj.radius);
            if (hitCrate) {
                const broken = hitCrate.takeDamage(proj.damage);
                this.particles.woodSplinter(hitCrate.centerX, hitCrate.centerY, false);
                audio.playWoodHit();
                if (proj.owner === this.player) {
                    this.applyHitStop(40, 2);
                }
                if (broken) {
                    this.map.destroyCrate(hitCrate, this.lootManager, this.particles, audio);
                }
                proj.active = false;
                proj.alive = false;
                continue;
            }

            // Map terrain collision check
            if (this.map.checkCollision(proj.x, proj.y, proj.radius)) {
                this.particles.hit(proj.x, proj.y, '#ffd700');
                proj.active = false;
                proj.alive = false;
                continue;
            }

            // Hit target check
            for (let t = 0; t < targets.length; t++) {
                const target = targets[t];
                if (target && target.alive && target !== proj.owner && (!proj.piercedTargets || !proj.piercedTargets.has(target))) {
                    const dist = distance(proj.x, proj.y, target.x, target.y);
                    if (dist < target.radius + proj.radius) {
                        if (proj.piercedTargets) proj.piercedTargets.add(target);
                        target.takeDamage(proj.damage);
                        this.particles.hit(target.x, target.y, target.color);
                        audio.playHit();

                        if (proj.owner === this.player) {
                            this.applyHitStop(70, 3.5);
                        }

                        if (proj.owner && proj.owner.buffs && proj.owner.buffs.bloodAura > 0) {
                            proj.owner.heal(Math.round(proj.damage * 0.2));
                        }

                        if (this.screenShakeEnabled && target === this.player) {
                            this.camera.addShake(5);
                        }

                        if (!target.alive) {
                            this.playerDied(target, proj.owner);
                        }

                        if (proj.pierce && proj.pierce > 0) {
                            proj.pierce--;
                        } else {
                            proj.active = false;
                            proj.alive = false;
                            break;
                        }
                    }
                }
            }
        }

        // Update melee attacks
        for (let a = 0; a < targets.length; a++) {
            const attacker = targets[a];
            if (!attacker || !attacker.alive) continue;
            for (let m = 0; m < attacker.meleeAttacks.length; m++) {
                const attack = attacker.meleeAttacks[m];

                // Hit target players/enemies
                for (let t = 0; t < targets.length; t++) {
                    const target = targets[t];
                    if (target && target.alive && target !== attacker &&
                        this.map.hasLineOfSight(attacker.x, attacker.y, target.x, target.y) &&
                        attack.checkHit(target)) {
                        target.takeDamage(attack.damage);
                        this.particles.hit(target.x, target.y, target.color);
                        audio.playHit();

                        if (attacker === this.player) {
                            this.applyHitStop(80, 5);
                        }

                        // KIẾM KHÍ HỘ THỂ (bladeShield reflection): reflects 20 damage + knockback
                        if (target.buffs && target.buffs.bladeShield > 0) {
                            attacker.takeDamage(20);
                            const kbAngle = Math.atan2(attacker.y - target.y, attacker.x - target.x);
                            attacker.x += Math.cos(kbAngle) * 35;
                            attacker.y += Math.sin(kbAngle) * 35;
                            this.particles.hit(attacker.x, attacker.y, '#4aa8ff');
                            if (!attacker.alive) {
                                this.playerDied(attacker, target);
                            }
                        }

                        // HUYẾT LONG HỘ THỂ (bloodAura lifesteal): heal 20%
                        if (attacker.buffs && attacker.buffs.bloodAura > 0) {
                            attacker.heal(Math.round(attack.damage * 0.2));
                        }

                        // Weapon knockback (e.g. Long Uyệt Đao, Detroit Smash)
                        if (attack.knockback && attack.knockback > 0) {
                            const kbAngle = attack.angle;
                            target.x += Math.cos(kbAngle) * (attack.knockback * 100);
                            target.y += Math.sin(kbAngle) * (attack.knockback * 100);
                        }

                        // Stun chance (e.g. One For All Detroit Smash)
                        if (attack.stunChance && Math.random() < attack.stunChance && target.buffs) {
                            target.buffs.stun = Math.max(target.buffs.stun || 0, attack.stunDuration || 500);
                        }

                        if (!target.alive) {
                            this.playerDied(target, attacker);
                        }
                    }
                }

                // Hit breakable crates
                const nearbyObs = this.map.getNearbyObstacles(
                    attacker.x - attack.range - 35,
                    attacker.y - attack.range - 35,
                    attacker.x + attack.range + 35,
                    attacker.y + attack.range + 35
                );
                for (let o = 0; o < nearbyObs.length; o++) {
                    const obs = nearbyObs[o];
                    if (obs.subtype === 'crate' && obs.alive && attack.checkHit(obs)) {
                        const broken = obs.takeDamage(attack.damage);
                        this.particles.woodSplinter(obs.centerX, obs.centerY, false);
                        audio.playWoodHit();
                        if (attacker === this.player) {
                            this.applyHitStop(50, 2.5);
                        }
                        if (broken) {
                            this.map.destroyCrate(obs, this.lootManager, this.particles, audio);
                        }
                    }
                }
            }
        }

        this.lootManager.update();
        this.particles.update();
        this.camera.update();

        this.checkWinCondition();
    }

    playerDied(victim, killer) {
        victim.alive = false;
        this.particles.death(victim.x, victim.y, victim.color);
        audio.playExplosion();

        const weapon = victim.inventory.getCurrentWeapon();
        if (weapon && weapon.name !== 'QUYỀN CƯỚC' && weapon.name !== 'FISTS') {
            this.lootManager.spawnWeapon(victim.x, victim.y, weapon.rawKey || weapon.name);
        }

        if (killer && killer !== victim) {
            killer.kills++;
        }

        if (this.isRoomMode) {
            if (victim === this.player) {
                if (window.ui && typeof window.ui.addNotification === 'function') {
                    window.ui.addNotification('Ngươi đã trọng thương! Đang vận công hồi sinh sau 3 giây...', 'warning');
                }
                setTimeout(() => {
                    if (this.state === 'playing' && this.player) {
                        const spawn = this.map.getRandomSpawnPoint(CONSTANTS.PLAYER_RADIUS, 0);
                        this.player.x = spawn.x;
                        this.player.y = spawn.y;
                        this.player.health = this.player.maxHealth;
                        this.player.armor = 50;
                        this.player.alive = true;
                        this.player.buffs = { stun: 0, bladeShield: 0, bloodAura: 0, speedBoost: 0, stealth: 0 };
                        if (this.particles) this.particles.heal(this.player.x, this.player.y);
                        if (window.ui && typeof window.ui.addNotification === 'function') {
                            window.ui.addNotification('✨ Ngươi đã niết bàn hồi sinh! Tiếp tục chiến đấu!', 'gold');
                        }
                    }
                }, 3000);
            }
            return;
        }

        if (victim === this.player) {
            const place = this.getAliveCount() + 1;
            setTimeout(() => {
                this.state = 'gameover';
                this.showGameOver(place);
            }, 1000);
        }
    }

    checkWinCondition() {
        if (this.isRoomMode) return;
        const alive = this.getAliveCount();
        this.playersAlive = alive;

        if (this.player && this.player.alive && alive === 1) {
            this.state = 'victory';
            audio.playVictory();
            this.showVictory();
        }
    }

    getAliveCount() {
        let count = 0;
        if (this.player && this.player.alive) count++;
        for (let i = 0; i < this.enemies.length; i++) {
            if (this.enemies[i].alive) count++;
        }
        return count;
    }

    draw() {
        if (this.pixiApp) {
            this.drawPixi(this.visualStateDirty);
            this.visualStateDirty = false;
        } else if (this.ctx) {
            this.drawCanvas2D();
        }
    }

    drawPixi(visualsDirty = true) {
        const cam = this.camera;
        const player = this.player;

        // GPU matrix translate world container by camera render offset
        this.worldContainer.position.set(-cam.getRenderX(), -cam.getRenderY());

        // SafeZone Poison Miasma
        if (visualsDirty) {
            this.safeZoneVisualAccumulator += this.fixedStep;
            if (this.safeZoneVisualAccumulator >= this.safeZoneVisualInterval) {
                this.safeZone.drawPixi(this.safeZoneGraphics, cam);
                this.safeZoneVisualAccumulator %= this.safeZoneVisualInterval;
            }
        }

        // Airdrops
        if (visualsDirty) {
            for (let i = 0; i < this.airdrops.length; i++) {
                this.airdrops[i].updatePixiView();
            }
        }

        // Skill Zones on ground
        if (visualsDirty) {
            this.skillZoneGraphics.clear();
            for (let i = 0; i < this.skillZones.length; i++) {
                if (this.skillZones[i].alive) {
                    this.skillZones[i].drawPixi(this.skillZoneGraphics);
                }
            }
        }

        // Breakable Crates update on hit flash
        if (visualsDirty) {
            for (let i = 0; i < this.map.crates.length; i++) {
                const crate = this.map.crates[i];
                if (crate.view && crate.hitFlash > 0) {
                    crate.updatePixiView();
                    crate.hitFlash = Math.max(0, crate.hitFlash - 16);
                }
            }
        }

        // LINE OF SIGHT FILTER: Draw enemies only if in player's LOS
        if (visualsDirty) {
            for (let i = 0; i < this.enemies.length; i++) {
                const enemy = this.enemies[i];
                if (enemy.alive) {
                    const inLOS = player && player.alive ? this.map.hasLineOfSight(player.x, player.y, enemy.x, enemy.y) : true;
                    enemy.updatePixiView(inLOS);
                } else if (enemy.view) {
                    enemy.view.visible = false;
                }
            }

            // Remote Players
            if (this.remotePlayers) {
                for (const rp of this.remotePlayers.values()) {
                    if (rp.alive) {
                        const inLOS = player && player.alive ? this.map.hasLineOfSight(player.x, player.y, rp.x, rp.y) : true;
                        rp.updatePixiView(inLOS);
                    } else if (rp.view) {
                        rp.view.visible = false;
                    }
                }
            }

            // Player
            if (player && player.alive) {
                player.updatePixiView(true);
            } else if (player && player.view) {
                player.view.visible = false;
            }

            // Attack Range Indicator Circle (Vòng tròn tầm đánh thường Liên Quân Mobile)
            if (this.rangeIndicatorGraphics) {
                this.rangeIndicatorGraphics.clear();
                if (player && player.alive) {
                    const curWeapon = player.inventory.getCurrentWeapon();
                    const range = curWeapon ? (curWeapon.range || 60) : 40;
                    const wpColor = parsePixiColor(curWeapon?.color || '#00e5ff');

                    // Soft inner fill area
                    this.rangeIndicatorGraphics.circle(player.x, player.y, range)
                        .fill({ color: wpColor, alpha: 0.05 });

                    // Smooth outer boundary ring
                    this.rangeIndicatorGraphics.circle(player.x, player.y, range)
                        .stroke({ color: wpColor, width: 1.5, alpha: 0.35 });

                    // 4 cardinal rotating notch accents
                    const notchLen = 6;
                    const baseRot = (this.gameTime * 0.001) % (Math.PI * 2);
                    for (let a = 0; a < 4; a++) {
                        const ang = baseRot + (a * Math.PI / 2);
                        const x1 = player.x + Math.cos(ang) * (range - notchLen);
                        const y1 = player.y + Math.sin(ang) * (range - notchLen);
                        const x2 = player.x + Math.cos(ang) * (range + notchLen);
                        const y2 = player.y + Math.sin(ang) * (range + notchLen);
                        this.rangeIndicatorGraphics.moveTo(x1, y1).lineTo(x2, y2)
                            .stroke({ color: wpColor, width: 2, alpha: 0.6 });
                    }
                }
            }

            // Target Lock Reticle (Hồng tâm gim kẻ địch Liên Quân Mobile)
            if (this.targetLockGraphics) {
                this.targetLockGraphics.clear();
                if (player && player.alive && this.lockedTarget && (this.lockedTarget.alive || this.lockedTarget.isCrate)) {
                    const tx = this.lockedTarget.centerX !== undefined ? this.lockedTarget.centerX : this.lockedTarget.x;
                    const ty = this.lockedTarget.centerY !== undefined ? this.lockedTarget.centerY : this.lockedTarget.y;
                    const tr = this.lockedTarget.radius || 22;
                    const rot = (this.gameTime * 0.003) % (Math.PI * 2);
                    const pulse = Math.sin(this.gameTime * 0.01) * 3;
                    const reticleR = tr + 12 + pulse;

                    // 1. Rotating corner bracket arcs
                    for (let b = 0; b < 4; b++) {
                        const angle = rot + (b * Math.PI / 2);
                        const bracketStart = angle - 0.22;
                        const bracketEnd = angle + 0.22;
                        this.targetLockGraphics.arc(tx, ty, reticleR, bracketStart, bracketEnd)
                            .stroke({ color: 0xff1744, width: 2.5, alpha: 0.9 });
                    }

                    // 2. Inner targeting ring
                    this.targetLockGraphics.circle(tx, ty, reticleR)
                        .stroke({ color: 0xff5252, width: 1, alpha: 0.35 });

                    // 3. Floating indicator triangle pointing down at target
                    const arrowY = ty - tr - 16 + Math.sin(this.gameTime * 0.008) * 3;
                    this.targetLockGraphics.poly([
                        tx, arrowY + 8,
                        tx - 6, arrowY,
                        tx + 6, arrowY
                    ]).fill({ color: 0xff1744, alpha: 0.95 });
                }
            }
        }

        // Active skills (fans, leap slams, skyfalls, dashes, etc.)
        if (visualsDirty) {
            this.activeSkillGraphics.clear();
            if (this.additiveGraphics) this.additiveGraphics.clear();
            for (let i = 0; i < this.activeSkills.length; i++) {
                if (this.activeSkills[i].alive && typeof this.activeSkills[i].drawPixi === 'function') {
                    this.activeSkills[i].drawPixi(this.activeSkillGraphics, this.additiveGraphics);
                }
            }
        }

        // Active projectiles from pool
        if (visualsDirty) {
            this.projectileGraphics.clear();
            const pool = this.projectilePool.pool;
            for (let i = 0; i < pool.length; i++) {
                if (pool[i].active) {
                    pool[i].drawPixi(this.projectileGraphics);
                }
            }
        }

        // Particles (batched on GPU with Additive Blending for sparks)
        if (visualsDirty) this.particles.drawPixi(this.particleGraphics, this.additiveGraphics);

        // FOG OF WAR: Radial vision vignette on screen-space fogLayer
        if (player && player.alive) {
            const px = player.x - cam.getRenderX();
            const py = player.y - cam.getRenderY();
            this.fogGraphics.visible = true;
            this.fogGraphics.position.set(px, py);
        } else {
            this.fogGraphics.visible = false;
        }

        // Screen darken & flash overlays (United States of Smash / Excalibur)
        if (visualsDirty && this.screenEffectGraphics) {
            this.screenEffectGraphics.clear();
            if (this.screenDarkenTimer > 0) {
                const alpha = (this.screenDarkenTimer / 1000) * 0.75;
                this.screenEffectGraphics.rect(0, 0, cam.width, cam.height).fill({ color: 0x000000, alpha });
            }
            if (this.screenFlashTimer > 0) {
                const alpha = (this.screenFlashTimer / 800) * 0.65;
                this.screenEffectGraphics.rect(0, 0, cam.width, cam.height).fill({ color: 0xfff8e1, alpha });
            }
        }

        // FPS Text
        if (this.fpsText) {
            this.fpsText.visible = this.showFps;
            this.fpsText.text = `${this.fps} FPS | work p95 ${this.frameTimeP95.toFixed(1)}ms | U ${this.updateTimeAvg.toFixed(1)} R ${this.renderTimeAvg.toFixed(1)}`;
        }

        // Render full display list via PixiJS WebGL
        this.pixiApp.render();
    }

    drawCanvas2D() {
        const ctx = this.ctx;
        const cam = this.camera;
        const player = this.player;

        ctx.fillStyle = '#1e2920';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw map terrain & obstacles
        this.map.draw(ctx, { x: cam.getRenderX(), y: cam.getRenderY(), width: cam.width, height: cam.height });

        // Draw Poison Miasma safe zone
        this.safeZone.draw(ctx, cam);

        // Draw Airdrops
        for (let i = 0; i < this.airdrops.length; i++) {
            this.airdrops[i].draw(ctx, cam);
        }

        const renderCam = { x: cam.getRenderX(), y: cam.getRenderY() };

        // Draw skill zones on ground
        for (let i = 0; i < this.skillZones.length; i++) {
            this.skillZones[i].draw(ctx, renderCam);
        }

        // Draw loot
        this.lootManager.draw(ctx, { x: cam.getRenderX(), y: cam.getRenderY(), width: cam.width, height: cam.height });

        // LINE OF SIGHT FILTER: Draw enemies only if in player's LOS
        for (let i = 0; i < this.enemies.length; i++) {
            const enemy = this.enemies[i];
            if (enemy.alive) {
                const inLOS = player && player.alive ? this.map.hasLineOfSight(player.x, player.y, enemy.x, enemy.y) : true;
                if (inLOS) {
                    enemy.draw(ctx, renderCam);
                }
            }
        }

        // Draw remote players
        if (this.remotePlayers) {
            for (const rp of this.remotePlayers.values()) {
                if (rp.alive) {
                    const inLOS = player && player.alive ? this.map.hasLineOfSight(player.x, player.y, rp.x, rp.y) : true;
                    if (inLOS) {
                        rp.draw(ctx, renderCam);
                    }
                }
            }
        }

        // Draw Attack Range Circle
        if (player && player.alive) {
            const curWeapon = player.inventory.getCurrentWeapon();
            const range = curWeapon ? (curWeapon.range || 60) : 40;
            const rx = player.x - renderCam.x;
            const ry = player.y - renderCam.y;
            const color = curWeapon?.color || '#00e5ff';

            ctx.save();
            ctx.beginPath();
            ctx.arc(rx, ry, range, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0, 229, 255, 0.05)';
            ctx.fill();

            ctx.strokeStyle = color;
            ctx.globalAlpha = 0.35;
            ctx.lineWidth = 1.5;
            ctx.setLineDash([8, 6]);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
        }

        // Draw player
        if (player && player.alive) {
            player.draw(ctx, renderCam);
        }

        // Draw Target Lock Reticle
        if (player && player.alive && this.lockedTarget && (this.lockedTarget.alive || this.lockedTarget.isCrate)) {
            const tx = (this.lockedTarget.centerX !== undefined ? this.lockedTarget.centerX : this.lockedTarget.x) - renderCam.x;
            const ty = (this.lockedTarget.centerY !== undefined ? this.lockedTarget.centerY : this.lockedTarget.y) - renderCam.y;
            const tr = this.lockedTarget.radius || 22;
            const rot = (this.gameTime * 0.003) % (Math.PI * 2);
            const pulse = Math.sin(this.gameTime * 0.01) * 3;
            const reticleR = tr + 12 + pulse;

            ctx.save();
            ctx.strokeStyle = '#ff1744';
            ctx.lineWidth = 2.5;
            for (let b = 0; b < 4; b++) {
                const angle = rot + (b * Math.PI / 2);
                ctx.beginPath();
                ctx.arc(tx, ty, reticleR, angle - 0.22, angle + 0.22);
                ctx.stroke();
            }

            ctx.strokeStyle = 'rgba(255, 82, 82, 0.35)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(tx, ty, reticleR, 0, Math.PI * 2);
            ctx.stroke();

            // Downward arrow
            const arrowY = ty - tr - 16 + Math.sin(this.gameTime * 0.008) * 3;
            ctx.fillStyle = '#ff1744';
            ctx.beginPath();
            ctx.moveTo(tx, arrowY + 8);
            ctx.lineTo(tx - 6, arrowY);
            ctx.lineTo(tx + 6, arrowY);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }

        // Draw active skills (fans, leap slams, skyfalls, dashes, etc.)
        for (let i = 0; i < this.activeSkills.length; i++) {
            this.activeSkills[i].draw(ctx, renderCam);
        }

        // Draw active projectiles from pool
        const pool = this.projectilePool.pool;
        for (let i = 0; i < pool.length; i++) {
            if (pool[i].active) {
                pool[i].draw(ctx, renderCam);
            }
        }

        // Draw particles (batched)
        this.particles.draw(ctx, cam);

        // FOG OF WAR: Radial vision vignette
        if (player && player.alive) {
            const px = player.x - cam.getRenderX();
            const py = player.y - cam.getRenderY();
            const grad = ctx.createRadialGradient(px, py, 260, px, py, 800);
            grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
            grad.addColorStop(0.5, 'rgba(10, 16, 12, 0.15)');
            grad.addColorStop(1, 'rgba(5, 10, 8, 0.45)');

            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }

        // Screen darken & flash overlays (United States of Smash / Excalibur)
        if (this.screenDarkenTimer > 0) {
            const alpha = (this.screenDarkenTimer / 1000) * 0.75;
            ctx.save();
            ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            ctx.restore();
        }
        if (this.screenFlashTimer > 0) {
            const alpha = (this.screenFlashTimer / 800) * 0.65;
            ctx.save();
            ctx.fillStyle = `rgba(255, 248, 225, ${alpha})`;
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            ctx.restore();
        }

        // Draw FPS
        if (this.showFps) {
            ctx.fillStyle = 'rgba(255, 215, 0, 0.65)';
            ctx.font = '14px monospace';
            ctx.fillText(`${this.fps} FPS`, 10, 20);
        }
    }

    updateMinimap() {
        this.map.drawMinimap(
            this.minimapCtx,
            { x: this.camera.x, y: this.camera.y, width: this.camera.width, height: this.camera.height },
            [this.player],
            this.enemies,
            this.safeZone
        );
    }

    loop(timestamp) {
        const frameWorkStart = performance.now();
        // This callback is now executing, so no frame is currently pending.
        this.animationFrameId = null;

        if (this.state !== 'playing' && this.state !== 'paused') return;

        const rawDt = timestamp - this.lastTime;
        this.lastTime = timestamp;

        this.frameCount++;
        if (timestamp - this.lastFpsTime >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastFpsTime = timestamp;

            if (this.frameTimeSampleCount > 0) {
                const sortedFrameTimes = Array.from(
                    this.frameTimeSamples.subarray(0, this.frameTimeSampleCount)
                ).sort((a, b) => a - b);
                const p95Index = Math.min(
                    sortedFrameTimes.length - 1,
                    Math.floor(sortedFrameTimes.length * 0.95)
                );
                this.frameTimeP95 = sortedFrameTimes[p95Index];
            }
        }

        if (this.state === 'playing') {
            // Keep gameplay deterministic and preserve the original 60 FPS
            // tuning while allowing rendering at 120/144/240 Hz. Limit catch-up
            // work after a suspended/background tab to avoid a spiral of death.
            this.accumulator += Math.min(Math.max(rawDt, 0), this.maxFrameDelta);
            let simulationSteps = 0;
            const updateStart = performance.now();
            while (this.accumulator >= this.fixedStep && simulationSteps < 6) {
                this.update(this.fixedStep);
                this.accumulator -= this.fixedStep;
                simulationSteps++;
            }
            const updateCost = performance.now() - updateStart;
            this.updateTimeAvg += (updateCost - this.updateTimeAvg) * 0.05;

            this.visualStateDirty = simulationSteps > 0;

            if (simulationSteps === 6) {
                this.accumulator = 0;
            }

            const renderStart = performance.now();
            this.draw();
            const renderCost = performance.now() - renderStart;
            this.renderTimeAvg += (renderCost - this.renderTimeAvg) * 0.05;

            // The minimap is informational UI; redrawing it at display refresh
            // rate repeats LOS queries and Canvas2D work without visible benefit.
            this.minimapAccumulator += rawDt;
            if (this.minimapAccumulator >= this.minimapInterval) {
                this.updateMinimap();
                this.minimapAccumulator %= this.minimapInterval;
            }

            const frameCost = performance.now() - frameWorkStart;
            this.frameTimeSamples[this.frameTimeSampleIndex] = frameCost;
            this.frameTimeSampleIndex = (this.frameTimeSampleIndex + 1) % this.frameTimeSamples.length;
            this.frameTimeSampleCount = Math.min(this.frameTimeSampleCount + 1, this.frameTimeSamples.length);
        }

        this.animationFrameId = requestAnimationFrame(this.boundLoop);
    }

    showVictory() {}

    showGameOver(place) {}
}
