/**
 * Procedural Audio Manager using Web Audio API.
 * All sounds are synthesized — no external audio files needed.
 */
export class AudioManager {
    private ctx: AudioContext | null = null;
    private musicGain: GainNode | null = null;
    private sfxGain: GainNode | null = null;
    private musicOscs: OscillatorNode[] = [];
    private musicPlaying = false;
    private musicVolume = 0.5;
    private sfxVolume = 0.7;
    private muted = false;
    private masterMusicFilter: BiquadFilterNode | null = null;

    init() {
        if (this.ctx) return;
        this.ctx = new AudioContext();
        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.value = this.musicVolume * 0.3;
        this.musicGain.connect(this.ctx.destination);
        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.value = this.sfxVolume;
        this.sfxGain.connect(this.ctx.destination);
    }

    private ensureCtx() {
        if (!this.ctx) this.init();
        if (this.ctx?.state === 'suspended') this.ctx.resume();
        return this.ctx!;
    }

    setMusicVolume(v: number) {
        this.musicVolume = v;
        if (this.musicGain) this.musicGain.gain.value = this.muted ? 0 : v * 0.3;
    }

    setSfxVolume(v: number) {
        this.sfxVolume = v;
        if (this.sfxGain) this.sfxGain.gain.value = this.muted ? 0 : v;
    }

    setMuted(m: boolean) {
        this.muted = m;
        if (this.musicGain) this.musicGain.gain.value = m ? 0 : this.musicVolume * 0.3;
        if (this.sfxGain) this.sfxGain.gain.value = m ? 0 : this.sfxVolume;
    }

    get isMuted() {
        return this.muted;
    }

    /**
     * Open the master music filter cutoff as combo intensity rises (0..1),
     * brightening the ambient chord during streaks. Smoothed to avoid clicks.
     */
    setMusicIntensity(intensity: number) {
        if (!this.masterMusicFilter || !this.ctx) return;
        const clamped = Math.max(0, Math.min(1, intensity));
        const target = 800 + clamped * 1600; // 800Hz baseline up to 2400Hz
        this.masterMusicFilter.frequency.setTargetAtTime(target, this.ctx.currentTime, 0.3);
    }

    /** Short tense rising swish for a near-miss with an asteroid. */
    playCloseCall() {
        const ctx = this.ensureCtx();
        if (!this.sfxGain) return;
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(320, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 1400;
        filter.Q.value = 1.5;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
        osc.connect(filter).connect(gain).connect(this.sfxGain);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
    }


    /** Short whoosh noise burst for releasing from orbit */
    playThrust() {
        const ctx = this.ensureCtx();
        if (!this.sfxGain) return;
        const duration = 0.15;
        const bufferSize = ctx.sampleRate * duration;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
        }
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 1200;
        filter.Q.value = 0.8;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        source.connect(filter).connect(gain).connect(this.sfxGain);
        source.start();
        source.stop(ctx.currentTime + duration);
    }

    /** Magnetic zing for orbit capture */
    playCapture() {
        const ctx = this.ensureCtx();
        if (!this.sfxGain) return;
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.06);
        osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.12);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
        osc.connect(gain).connect(this.sfxGain);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
    }

    /** Ascending chime for Earth bonus */
    playBonus() {
        const ctx = this.ensureCtx();
        if (!this.sfxGain) return;
        const notes = [523, 659, 784]; // C5, E5, G5
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = freq;
            const gain = ctx.createGain();
            const t = ctx.currentTime + i * 0.08;
            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(0.18, t + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
            osc.connect(gain).connect(this.sfxGain!);
            osc.start(t);
            osc.stop(t + 0.28);
        });
    }

    /** Soft tick for UI clicks */
    playClick() {
        const ctx = this.ensureCtx();
        if (!this.sfxGain) return;
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = 1000;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
        osc.connect(gain).connect(this.sfxGain);
        osc.start();
        osc.stop(ctx.currentTime + 0.07);
    }

    /** Low rumble explosion */
    playExplosion() {
        const ctx = this.ensureCtx();
        if (!this.sfxGain) return;
        // Noise burst
        const duration = 0.5;
        const bufferSize = ctx.sampleRate * duration;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
        }
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + duration);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        source.connect(filter).connect(gain).connect(this.sfxGain);
        source.start();
        source.stop(ctx.currentTime + duration);
        // Low thud oscillator
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(120, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.3);
        const oscGain = ctx.createGain();
        oscGain.gain.setValueAtTime(0.3, ctx.currentTime);
        oscGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc.connect(oscGain).connect(this.sfxGain);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
    }

    /** Shimmering ascending arpeggio for unlocking a new visual theme */
    playThemeUnlock() {
        const ctx = this.ensureCtx();
        if (!this.sfxGain) return;
        // A minor 7 arc: A4, C5, E5, G5, A5 — warm, cinematic
        const notes = [440, 523, 659, 784, 880];
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            osc.type = 'triangle';
            osc.frequency.value = freq;
            const gain = ctx.createGain();
            const t = ctx.currentTime + i * 0.07;
            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(0.14, t + 0.03);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
            // Subtle shimmer — slight detuned overtone
            const shimmer = ctx.createOscillator();
            shimmer.type = 'sine';
            shimmer.frequency.value = freq * 2.01;
            const shimmerGain = ctx.createGain();
            shimmerGain.gain.setValueAtTime(0, t);
            shimmerGain.gain.linearRampToValueAtTime(0.04, t + 0.03);
            shimmerGain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
            osc.connect(gain).connect(this.sfxGain!);
            shimmer.connect(shimmerGain).connect(this.sfxGain!);
            osc.start(t);
            shimmer.start(t);
            osc.stop(t + 0.5);
            shimmer.stop(t + 0.45);
        });
    }

    /** Shield pickup — bright rising protective chime */
    playShieldPickup() {
        const ctx = this.ensureCtx();
        if (!this.sfxGain) return;
        const notes = [660, 880, 1100]; // E5, A5, C#6
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = freq;
            const gain = ctx.createGain();
            const t = ctx.currentTime + i * 0.06;
            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(0.16, t + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
            osc.connect(gain).connect(this.sfxGain!);
            osc.start(t);
            osc.stop(t + 0.35);
        });
    }

    /** Shield break — glass shatter burst */
    playShieldBreak() {
        const ctx = this.ensureCtx();
        if (!this.sfxGain) return;
        const duration = 0.25;
        const bufferSize = ctx.sampleRate * duration;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 1.5);
        }
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 2000;
        filter.Q.value = 1;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.22, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        source.connect(filter).connect(gain).connect(this.sfxGain);
        source.start();
        source.stop(ctx.currentTime + duration);
    }

    /** Magnet pickup — warm magnetic hum swell */
    playMagnetPickup() {
        const ctx = this.ensureCtx();
        if (!this.sfxGain) return;
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(550, ctx.currentTime + 0.15);
        osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        // Subtle shimmer overtone
        const shimmer = ctx.createOscillator();
        shimmer.type = 'sine';
        shimmer.frequency.setValueAtTime(880, ctx.currentTime);
        shimmer.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.15);
        const shimmerGain = ctx.createGain();
        shimmerGain.gain.setValueAtTime(0, ctx.currentTime);
        shimmerGain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 0.05);
        shimmerGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.connect(gain).connect(this.sfxGain);
        shimmer.connect(shimmerGain).connect(this.sfxGain);
        osc.start();
        shimmer.start();
        osc.stop(ctx.currentTime + 0.4);
        shimmer.stop(ctx.currentTime + 0.35);
    }

    /** Wormhole activation — dramatic descending whoosh */
    playWormholeActivate() {
        const ctx = this.ensureCtx();
        if (!this.sfxGain) return;
        // Sweeping tone
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(1200, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.5);
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(3000, ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.5);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc.connect(filter).connect(gain).connect(this.sfxGain);
        osc.start();
        osc.stop(ctx.currentTime + 0.55);
        // Noise burst for the warp
        const duration = 0.3;
        const bufferSize = ctx.sampleRate * duration;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
        }
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.value = 800;
        noiseFilter.Q.value = 0.5;
        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.12, ctx.currentTime);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        source.connect(noiseFilter).connect(noiseGain).connect(this.sfxGain);
        source.start();
        source.stop(ctx.currentTime + duration);
    }

    /** Gravity pulse — deep bass whomp with expanding shockwave feel */
    playGravityPulse() {
        const ctx = this.ensureCtx();
        if (!this.sfxGain) return;
        // Deep bass whomp
        const bass = ctx.createOscillator();
        bass.type = 'sine';
        bass.frequency.setValueAtTime(120, ctx.currentTime);
        bass.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.4);
        const bassGain = ctx.createGain();
        bassGain.gain.setValueAtTime(0.25, ctx.currentTime);
        bassGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        bass.connect(bassGain).connect(this.sfxGain);
        bass.start();
        bass.stop(ctx.currentTime + 0.55);

        // Mid-range pulse sweep for the "expanding ring" feel
        const mid = ctx.createOscillator();
        mid.type = 'triangle';
        mid.frequency.setValueAtTime(400, ctx.currentTime);
        mid.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.3);
        const midGain = ctx.createGain();
        midGain.gain.setValueAtTime(0.12, ctx.currentTime);
        midGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        mid.connect(midGain).connect(this.sfxGain);
        mid.start();
        mid.stop(ctx.currentTime + 0.4);

        // Noise burst for the shockwave texture
        const duration = 0.25;
        const bufferSize = ctx.sampleRate * duration;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 3);
        }
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = 'lowpass';
        noiseFilter.frequency.setValueAtTime(600, ctx.currentTime);
        noiseFilter.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + duration);
        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.15, ctx.currentTime);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        source.connect(noiseFilter).connect(noiseGain).connect(this.sfxGain);
        source.start();
        source.stop(ctx.currentTime + duration);
    }

    /** Combo escalation sound */
    playCombo(level: number) {
        const ctx = this.ensureCtx();
        if (!this.sfxGain) return;
        const baseFreq = 400 + level * 80;
        const osc = ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, ctx.currentTime + 0.08);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
        osc.connect(gain).connect(this.sfxGain);
        osc.start();
        osc.stop(ctx.currentTime + 0.14);
    }

    private createReverb(ctx: AudioContext): ConvolverNode {
        const convolver = ctx.createConvolver();
        const length = ctx.sampleRate * 4.0; // 4 second tail
        const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
        const left = impulse.getChannelData(0);
        const right = impulse.getChannelData(1);
        for (let i = 0; i < length; i++) {
            const decay = Math.pow(1 - i / length, 3);
            left[i] = (Math.random() * 2 - 1) * decay;
            right[i] = (Math.random() * 2 - 1) * decay;
        }
        convolver.buffer = impulse;
        return convolver;
    }

    /** Start looping ambient synth music */
    startMusic() {
        if (this.musicPlaying) return;
        const ctx = this.ensureCtx();
        if (!this.musicGain) return;
        this.musicPlaying = true;

        // Create a lush, spacey reverb
        const reverb = this.createReverb(ctx);

        // Master filter to keep it warm and ambient. Stored on the instance so
        // setMusicIntensity can open the cutoff when the player hits a combo.
        const masterFilter = ctx.createBiquadFilter();
        masterFilter.type = 'lowpass';
        masterFilter.frequency.value = 800;
        this.masterMusicFilter = masterFilter;

        masterFilter.connect(reverb);
        masterFilter.connect(this.musicGain); // Dry signal
        reverb.connect(this.musicGain);       // Wet signal (reverb)

        // Evolving ambient chord (C minor 9: C, Eb, G, Bb, D across octaves)
        const baseFreq = 65.41; // C2
        const chordRatios = [
            1,          // C2 (Root)
            1.189,      // Eb2 (Minor 3rd)
            1.498,      // G2 (Perfect 5th)
            1.781 * 2,  // Bb3 (Minor 7th up an octave)
            2.245 * 2,  // D4 (Major 9th up an octave)
        ];

        chordRatios.forEach((ratio, i) => {
            // Two slightly detuned oscillators per note for chorusing
            [0.996, 1.004].forEach((detuneMult) => {
                const osc = ctx.createOscillator();
                osc.type = i < 2 ? 'sine' : 'triangle'; // Deep lows, richer highs
                osc.frequency.value = baseFreq * ratio * detuneMult;

                // Individual slow filter per note for organic movement
                const filter = ctx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.value = 200 + (i * 100);

                // Very slow LFO on the filter cutoff
                const lfo = ctx.createOscillator();
                lfo.type = 'sine';
                lfo.frequency.value = 0.02 + Math.random() * 0.05;
                const lfoGain = ctx.createGain();
                lfoGain.gain.value = 150 + (i * 50);
                lfo.connect(lfoGain).connect(filter.frequency);
                lfo.start();

                // Individual gain node for slow volume swells
                const ampGain = ctx.createGain();
                ampGain.gain.value = 0;
                // Random swell times to keep it non-mechanical
                const swellTime = 4 + Math.random() * 4;
                ampGain.gain.setTargetAtTime((0.15 / chordRatios.length), ctx.currentTime, swellTime);

                osc.connect(filter).connect(ampGain).connect(masterFilter);
                osc.start();

                this.musicOscs.push(osc, lfo);
            });
        });
    }

    stopMusic() {
        this.musicOscs.forEach((o) => {
            try { o.stop(); } catch { /* already stopped */ }
        });
        this.musicOscs = [];
        this.musicPlaying = false;
    }

    get isPlaying() {
        return this.musicPlaying;
    }
}

export const audio = new AudioManager();
