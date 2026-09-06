class AudioManager {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.musicGain = null;
        this.sfxGain = null;
        this.masterVolume = 0.8;
        this.musicVolume = 0.5;
        this.sfxVolume = 0.8;
        this.musicPlaying = false;
        this.musicInterval = null;
        this.noiseBuffer = null;
    }

    init() {
        if (this.ctx) {
            if (this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
            return;
        }

        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioCtx();

            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
            this.masterGain.connect(this.ctx.destination);

            this.musicGain = this.ctx.createGain();
            this.musicGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
            this.musicGain.connect(this.masterGain);

            this.sfxGain = this.ctx.createGain();
            this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
            this.sfxGain.connect(this.masterGain);

            const bufferSize = this.ctx.sampleRate;
            this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const output = this.noiseBuffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                output[i] = Math.random() * 2 - 1;
            }
        } catch (e) {
            console.warn('Web Audio API not supported', e);
        }
    }

    setMasterVolume(val) {
        this.masterVolume = Math.max(0, Math.min(1, val));
        if (this.masterGain && this.ctx) {
            this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
        }
    }

    setMusicVolume(val) {
        this.musicVolume = Math.max(0, Math.min(1, val));
        if (this.musicGain && this.ctx) {
            this.musicGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
        }
    }

    setSfxVolume(val) {
        this.sfxVolume = Math.max(0, Math.min(1, val));
        if (this.sfxGain && this.ctx) {
            this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
        }
    }

    startMusic() {
        if (this.musicPlaying || !this.ctx) return;
        this.musicPlaying = true;

        let step = 0;
        // Wuxia oriental pentatonic scale (A minor pentatonic: A, C, D, E, G)
        const bassNotes = [110, 130.81, 146.83, 164.81, 196.00, 164.81, 146.83, 110];
        const melodyNotes = [220, 261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33];

        this.musicInterval = setInterval(() => {
            if (!this.musicPlaying || !this.ctx || this.ctx.state !== 'running') return;

            const t = this.ctx.currentTime;
            
            // Bass Drone / Guzheng Bass Pluck
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const filter = this.ctx.createBiquadFilter();

            const note = bassNotes[step % bassNotes.length];
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(note, t);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(360, t);
            filter.frequency.exponentialRampToValueAtTime(120, t + 0.3);

            gain.gain.setValueAtTime(0.24, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.musicGain);

            osc.start(t);
            osc.stop(t + 0.35);

            // Bamboo Flute / Zither Melody
            if (step % 2 === 0) {
                const leadOsc = this.ctx.createOscillator();
                const leadGain = this.ctx.createGain();
                const mNote = melodyNotes[(Math.floor(step / 2) * 3) % melodyNotes.length];

                leadOsc.type = 'sine';
                leadOsc.frequency.setValueAtTime(mNote, t);

                leadGain.gain.setValueAtTime(0.12, t);
                leadGain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);

                leadOsc.connect(leadGain);
                leadGain.connect(this.musicGain);

                leadOsc.start(t);
                leadOsc.stop(t + 0.6);
            }

            step++;
        }, 260);
    }

    stopMusic() {
        this.musicPlaying = false;
        if (this.musicInterval) {
            clearInterval(this.musicInterval);
            this.musicInterval = null;
        }
    }

    playGong() {
        // Ancient Bronze Bell / War Gong
        if (!this.ctx) return;
        const t = this.ctx.currentTime;

        const freqs = [180, 270, 360, 540];
        freqs.forEach((f, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = i % 2 === 0 ? 'sine' : 'triangle';
            osc.frequency.setValueAtTime(f, t);

            const vol = 0.3 / (i + 1);
            gain.gain.setValueAtTime(vol, t);
            gain.gain.exponentialRampToValueAtTime(0.0001, t + 2.5);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start(t);
            osc.stop(t + 2.6);
        });
    }

    playShoot(weaponName) {
        if (!this.ctx) return;
        const t = this.ctx.currentTime;

        if (weaponName.includes('ZANGETSU')) {
            this.playGetsuga();
            return;
        } else if (weaponName.includes('ONE FOR ALL')) {
            this.playSmash();
            return;
        } else if (weaponName.includes('KATON')) {
            this.playTone(550, 200, 'sine', 0.09, 0.3);
            this.playNoise(0.08, 1200, 200, 0.25);
            return;
        } else if (weaponName.includes('EXCALIBUR')) {
            this.playTone(520, 220, 'triangle', 0.14, 0.35);
            this.playNoise(0.09, 1400, 300, 0.2);
            return;
        } else if (weaponName.includes('BABYLON')) {
            this.playBabylonGate();
            return;
        }

        this.playTone(400, 160, 'triangle', 0.15, 0.3);
        this.playNoise(0.08, 600, 100, 0.2);
    }

    playGetsuga() {
        if (!this.ctx) return;
        this.playTone(280, 45, 'sawtooth', 0.32, 0.45);
        this.playNoise(0.25, 1400, 120, 0.4);
    }

    playSmash() {
        if (!this.ctx) return;
        this.playNoise(0.38, 450, 35, 0.6);
        this.playTone(180, 35, 'square', 0.22, 0.5);
    }

    playUnitedStates() {
        if (!this.ctx) return;
        this.playNoise(0.75, 700, 25, 0.7);
        this.playTone(220, 25, 'sawtooth', 0.55, 0.6);
        this.playTone(90, 20, 'square', 0.65, 0.5);
    }

    playChidori() {
        if (!this.ctx) return;
        this.playTone(900, 1600, 'sawtooth', 0.18, 0.35);
        this.playTone(1400, 600, 'square', 0.16, 0.25);
        this.playNoise(0.15, 3000, 800, 0.25);
    }

    playKamui() {
        if (!this.ctx) return;
        this.playTone(620, 80, 'sine', 0.45, 0.45);
        this.playTone(420, 50, 'triangle', 0.35, 0.35);
    }

    playExcalibur() {
        if (!this.ctx) return;
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((f) => this.playTone(f, f * 1.15, 'sine', 0.65, 0.22));
        this.playNoise(0.55, 2200, 350, 0.4);
    }

    playHolyBarrier() {
        if (!this.ctx) return;
        this.playTone(880, 1760, 'sine', 0.4, 0.3);
        this.playTone(1320, 2640, 'triangle', 0.3, 0.2);
    }

    playBabylonGate() {
        if (!this.ctx) return;
        this.playTone(720, 1300, 'triangle', 0.18, 0.3);
        this.playTone(360, 140, 'square', 0.12, 0.25);
    }

    playEnumaElish() {
        if (!this.ctx) return;
        this.playTone(130, 30, 'sawtooth', 0.85, 0.55);
        this.playTone(85, 18, 'square', 0.75, 0.5);
        this.playNoise(0.85, 900, 45, 0.65);
    }

    playShunpo() {
        if (!this.ctx) return;
        this.playTone(500, 150, 'sine', 0.1, 0.3);
        this.playNoise(0.08, 1200, 200, 0.2);
    }

    playBankai() {
        if (!this.ctx) return;
        this.playTone(150, 40, 'sawtooth', 0.6, 0.5);
        this.playNoise(0.4, 1800, 80, 0.5);
    }

    playMugetsu() {
        if (!this.ctx) return;
        this.playTone(220, 30, 'sawtooth', 0.8, 0.6);
        this.playNoise(0.7, 900, 30, 0.7);
    }

    playFullCowling() {
        if (!this.ctx) return;
        this.playTone(1200, 400, 'square', 0.25, 0.35);
        this.playNoise(0.2, 3500, 600, 0.3);
    }

    playSusanoo() {
        if (!this.ctx) return;
        this.playTone(180, 320, 'sine', 0.6, 0.45);
        this.playTone(90, 140, 'triangle', 0.6, 0.4);
    }

    playEnkidu() {
        if (!this.ctx) return;
        this.playTone(1200, 800, 'triangle', 0.15, 0.3);
        this.playTone(1600, 1100, 'square', 0.12, 0.25);
    }

    playMelee() {
        if (!this.ctx) return;
        // Sword slash wind swish
        this.playTone(320, 110, 'sine', 0.14, 0.3);
        this.playNoise(0.06, 500, 80, 0.15);
    }

    playPickup() {
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(587.33, t); // D5
        osc.frequency.exponentialRampToValueAtTime(880.00, t + 0.12); // A5

        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(t);
        osc.stop(t + 0.22);
    }

    playHit() {
        if (!this.ctx) return;
        // Weapon impact / flesh strike
        this.playNoise(0.07, 500, 80, 0.35);
        this.playTone(160, 60, 'square', 0.08, 0.22);
    }

    playExplosion() {
        if (!this.ctx) return;
        // Thunderous martial explosion / death strike
        this.playNoise(0.65, 320, 40, 0.65);
        this.playTone(110, 25, 'sawtooth', 0.5, 0.45);
    }

    playZoneWarning() {
        // Ancient War Drum + Gong alarm for Poison Miasma
        this.playGong();
        setTimeout(() => {
            if (this.ctx) {
                this.playTone(90, 40, 'triangle', 0.4, 0.4);
            }
        }, 300);
    }

    playVictory() {
        if (!this.ctx) return;
        // Grand imperial martial victory fanfare
        const notes = [440, 554.37, 659.25, 880];
        notes.forEach((freq, idx) => {
            setTimeout(() => {
                if (!this.ctx) return;
                const t = this.ctx.currentTime;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, t);

                gain.gain.setValueAtTime(0.35, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

                osc.connect(gain);
                gain.connect(this.sfxGain);

                osc.start(t);
                osc.stop(t + 0.55);
            }, idx * 170);
        });
    }

    playStep() {
        if (!this.ctx) return;
        this.playNoise(0.035, 280, 90, 0.07);
    }

    playWoodHit() {
        if (!this.ctx) return;
        this.playTone(160, 60, 'triangle', 0.08, 0.35);
        this.playNoise(0.06, 800, 200, 0.25);
    }

    playWoodBreak() {
        if (!this.ctx) return;
        this.playTone(320, 80, 'square', 0.14, 0.4);
        this.playNoise(0.22, 1600, 150, 0.45);
    }

    playTone(startFreq, endFreq, type, duration, volume) {
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(startFreq, t);
        osc.frequency.exponentialRampToValueAtTime(Math.max(10, endFreq), t + duration);

        gain.gain.setValueAtTime(volume, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(t);
        osc.stop(t + duration);
    }

    playNoise(duration, filterStart, filterEnd, volume) {
        if (!this.ctx || !this.noiseBuffer) return;
        const t = this.ctx.currentTime;

        const noise = this.ctx.createBufferSource();
        noise.buffer = this.noiseBuffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(filterStart, t);
        filter.frequency.exponentialRampToValueAtTime(Math.max(20, filterEnd), t + duration);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(volume, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);

        noise.start(t);
        noise.stop(t + duration);
    }
}

export const audio = new AudioManager();
