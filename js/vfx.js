/**
 * Anime VFX Engine (Zero-Lag Studio Architecture)
 * - Layer 1: Additive Blending Renderers (Neon Glowing Lightning, Lasers, Energy Slashes)
 * - Layer 2: Local WebGL GLSL Shaders (Pulsing Energy Auras for Bankai, Full Cowling, Susano'o)
 * - Layer 3: Transient Shockwave Distortion System (Auto-disposing 350ms screen ripples for Ultimates)
 */

import { parsePixiColor, clamp } from './utils.js';

export class AnimeShaderManager {
    constructor(pixiApp) {
        this.app = pixiApp;
        this.enabled = typeof window !== 'undefined' && !!window.PIXI;
        this.time = 0;
        this.activeShockwave = null;
        this.shockwaveFilter = null;
        this.auraFilters = new Map();

        this.initShaders();
    }

    initShaders() {
        if (!this.enabled || !window.PIXI || !window.PIXI.Filter) return;

        try {
            const P = window.PIXI;

            // 1. Shockwave Distortion Fragment Shader (GLSL ES 3.0 for Pixi v8)
            const shockFrag = `
in vec2 vTextureCoord;
out vec4 finalColor;
uniform sampler2D uTexture;
uniform vec2 uCenter;
uniform float uProgress;
uniform float uAmplitude;
uniform float uWavelength;

void main() {
    float dist = length(vTextureCoord - uCenter);
    float diff = dist - uProgress;
    float factor = (1.0 - smoothstep(0.0, uWavelength, abs(diff))) * (1.0 - uProgress);
    vec2 dir = dist > 0.001 ? normalize(vTextureCoord - uCenter) : vec2(0.0);
    vec2 displaced = vTextureCoord + dir * factor * uAmplitude;
    finalColor = texture(uTexture, displaced);
}
`;

            this.shockwaveFilter = P.Filter.from({
                gl: {
                    vertex: P.defaultFilterVert,
                    fragment: shockFrag
                },
                resources: {
                    shockUniforms: {
                        uCenter: { value: [0.5, 0.5], type: 'vec2<f32>' },
                        uProgress: { value: 0.0, type: 'f32' },
                        uAmplitude: { value: 0.035, type: 'f32' },
                        uWavelength: { value: 0.07, type: 'f32' }
                    }
                }
            });
        } catch (err) {
            console.warn('AnimeShaderManager: Shockwave shader compilation failed, fallback disabled:', err);
            this.shockwaveFilter = null;
        }
    }

    /**
     * Get or create a local energy aura shader for a specific color
     * @param {string} colorHex - e.g. '#00e5ff' for Full Cowling, '#ff1744' for Bankai
     * @param {number} intensity - glow intensity multiplier
     */
    getAuraFilter(colorHex = '#00e5ff', intensity = 3.5) {
        if (!this.enabled || !window.PIXI || !window.PIXI.Filter) return null;

        if (this.auraFilters.has(colorHex)) {
            return this.auraFilters.get(colorHex);
        }

        try {
            const P = window.PIXI;
            const rgb = parsePixiColor(colorHex);
            const r = ((rgb.color >> 16) & 255) / 255;
            const g = ((rgb.color >> 8) & 255) / 255;
            const b = (rgb.color & 255) / 255;

            const auraFrag = `
in vec2 vTextureCoord;
out vec4 finalColor;
uniform sampler2D uTexture;
uniform float uTime;
uniform vec3 uColor;
uniform float uIntensity;

void main() {
    vec4 tex = texture(uTexture, vTextureCoord);
    vec2 center = vec2(0.5, 0.5);
    float dist = length(vTextureCoord - center);
    float wave = sin(dist * 32.0 - uTime * 6.5) * 0.5 + 0.5;
    float glow = exp(-dist * uIntensity) * wave;
    vec3 aura = uColor * glow * 1.8;
    finalColor = vec4(tex.rgb + aura, max(tex.a, glow * 0.9));
}
`;

            const filter = P.Filter.from({
                gl: {
                    vertex: P.defaultFilterVert,
                    fragment: auraFrag
                },
                resources: {
                    auraUniforms: {
                        uTime: { value: 0.0, type: 'f32' },
                        uColor: { value: [r, g, b], type: 'vec3<f32>' },
                        uIntensity: { value: intensity, type: 'f32' }
                    }
                }
            });

            this.auraFilters.set(colorHex, filter);
            return filter;
        } catch (err) {
            console.warn('AnimeShaderManager: Aura shader creation failed:', err);
            return null;
        }
    }

    /**
     * Trigger a transient shockwave (auto-terminates after duration)
     * @param {number} screenX - Viewport X coordinate (0 to canvas.width)
     * @param {number} screenY - Viewport Y coordinate (0 to canvas.height)
     * @param {number} duration - Duration in milliseconds (default 380ms)
     * @param {number} amplitude - Distortion strength (default 0.04)
     */
    triggerShockwave(screenX, screenY, duration = 380, amplitude = 0.04) {
        if (!this.enabled || !this.shockwaveFilter || !this.app || !this.app.stage) return;

        const w = (this.app.renderer && this.app.renderer.width) ? this.app.renderer.width : window.innerWidth;
        const h = (this.app.renderer && this.app.renderer.height) ? this.app.renderer.height : window.innerHeight;

        const normX = clamp(screenX / w, 0.0, 1.0);
        const normY = clamp(screenY / h, 0.0, 1.0);

        try {
            const uniforms = this.shockwaveFilter.resources.shockUniforms.uniforms;
            uniforms.uCenter = [normX, normY];
            uniforms.uProgress = 0.0;
            uniforms.uAmplitude = amplitude;
            uniforms.uWavelength = 0.08;

            this.activeShockwave = {
                duration,
                elapsed: 0,
                amplitude
            };

            // Apply filter to stage
            const currentFilters = this.app.stage.filters ? [...this.app.stage.filters] : [];
            if (!currentFilters.includes(this.shockwaveFilter)) {
                currentFilters.push(this.shockwaveFilter);
                this.app.stage.filters = currentFilters;
            }
        } catch (err) {
            console.warn('AnimeShaderManager: Failed to attach shockwave:', err);
            this.removeShockwave();
        }
    }

    removeShockwave() {
        this.activeShockwave = null;
        if (!this.app || !this.app.stage || !this.shockwaveFilter) return;

        try {
            if (this.app.stage.filters) {
                const updated = this.app.stage.filters.filter(f => f !== this.shockwaveFilter);
                this.app.stage.filters = updated.length > 0 ? updated : null;
            }
        } catch (err) {
            // Ignore filter removal errors
        }
    }

    update(dt) {
        this.time += dt * 0.001;

        // Update Aura Shader times
        for (const filter of this.auraFilters.values()) {
            if (filter && filter.resources && filter.resources.auraUniforms) {
                filter.resources.auraUniforms.uniforms.uTime = this.time;
            }
        }

        // Update Active Shockwave
        if (this.activeShockwave) {
            this.activeShockwave.elapsed += dt;
            const p = this.activeShockwave.elapsed / this.activeShockwave.duration;

            if (p >= 1.0) {
                this.removeShockwave();
            } else if (this.shockwaveFilter && this.shockwaveFilter.resources) {
                const uniforms = this.shockwaveFilter.resources.shockUniforms.uniforms;
                uniforms.uProgress = p * 0.9;
                uniforms.uAmplitude = this.activeShockwave.amplitude * (1.0 - p);
            }
        }
    }
}

/**
 * AdditiveVFXRenderer:
 * High-performance batched additive graphics renderer.
 * All graphics drawn onto layers with blendMode = 'add' naturally glow like anime energy!
 */
export class AdditiveVFXRenderer {
    /**
     * Draw jagged lightning bolt connecting start to end (Chidori / Full Cowling)
     */
    static drawLightning(g, x1, y1, x2, y2, color = 0x00e5ff, branches = 2, width = 3, alpha = 0.9) {
        if (!g) return;

        const dx = x2 - x1;
        const dy = y2 - y1;
        const dist = Math.hypot(dx, dy);
        if (dist < 4) return;

        const segments = Math.max(3, Math.floor(dist / 14));
        const perpX = -dy / dist;
        const perpY = dx / dist;

        // Core bright line
        g.moveTo(x1, y1);
        let lastX = x1;
        let lastY = y1;

        for (let i = 1; i < segments; i++) {
            const t = i / segments;
            const offset = (Math.random() - 0.5) * 16;
            const curX = x1 + dx * t + perpX * offset;
            const curY = y1 + dy * t + perpY * offset;
            g.lineTo(curX, curY);

            // Sub-branches
            if (branches > 0 && Math.random() < 0.25) {
                const bLen = (Math.random() + 0.5) * 12;
                const bAngle = Math.atan2(dy, dx) + (Math.random() - 0.5) * 1.2;
                g.moveTo(curX, curY)
                 .lineTo(curX + Math.cos(bAngle) * bLen, curY + Math.sin(bAngle) * bLen)
                 .stroke({ color: 0xffffff, width: width * 0.5, alpha: alpha * 0.7 });
                g.moveTo(curX, curY);
            }
            lastX = curX;
            lastY = curY;
        }

        g.lineTo(x2, y2);
        // Outer halo
        g.stroke({ color: color, width: width * 2, alpha: alpha * 0.5 });
        // Inner white hot core
        g.moveTo(x1, y1);
        g.lineTo(x2, y2);
        g.stroke({ color: 0xffffff, width: Math.max(1, width * 0.7), alpha: alpha });
    }

    /**
     * Draw glowing anime crescent energy wave (Getsuga Tenshou)
     */
    static drawCrescentBlade(g, x, y, angle, radius = 24, color = 0xff1744, alpha = 0.95) {
        if (!g) return;

        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);

        // Outer energy aura arc
        g.circle(x, y, radius)
         .stroke({ color: color, width: 8, alpha: alpha * 0.6 });

        // Inner glowing core
        g.circle(x - cosA * 4, y - sinA * 4, radius * 0.8)
         .stroke({ color: 0xffffff, width: 3, alpha: alpha });
    }

    /**
     * Draw photon beam laser with white core and colored outer halo (Excalibur)
     */
    static drawLaserBeam(g, x1, y1, x2, y2, width = 60, color = 0xffd700, alpha = 1.0) {
        if (!g) return;

        // Outer glowing halo (drawn first in add mode)
        g.moveTo(x1, y1)
         .lineTo(x2, y2)
         .stroke({ color: color, width: width, alpha: alpha * 0.5 });

        // Mid-energy cylinder
        g.moveTo(x1, y1)
         .lineTo(x2, y2)
         .stroke({ color: color, width: width * 0.55, alpha: alpha * 0.8 });

        // White burning core
        g.moveTo(x1, y1)
         .lineTo(x2, y2)
         .stroke({ color: 0xffffff, width: width * 0.25, alpha: alpha });
    }

    /**
     * Draw pulsing energy rings around player (Aura / Buffs)
     */
    static drawPulsingAura(g, x, y, radius, color = 0x00e5ff, time = 0, count = 3) {
        if (!g) return;

        for (let i = 0; i < count; i++) {
            const phase = (time * 1.5 + i * (1 / count)) % 1.0;
            const curRadius = radius + phase * 18;
            const alpha = (1.0 - phase) * 0.85;

            g.circle(x, y, curRadius)
             .stroke({ color: color, width: 2.5 * (1.0 - phase * 0.4), alpha });
        }
    }
}
