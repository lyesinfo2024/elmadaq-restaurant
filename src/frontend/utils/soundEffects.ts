// Web Audio API Synthesizer for crystal-clear restaurant notifications
// Works on all modern browsers (Chrome, Safari, Firefox, Edge, Mobile)
// without external audio file dependencies or network latency.

class SoundEffectPlayer {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.85;

  constructor() {
    // Restore mute preference from localStorage
    try {
      const savedMute = localStorage.getItem('restaurant_sound_muted');
      if (savedMute !== null) {
        this.isMuted = savedMute === 'true';
      }
      const savedVol = localStorage.getItem('restaurant_sound_volume');
      if (savedVol !== null) {
        this.volume = parseFloat(savedVol) || 0.85;
      }
    } catch {
      // ignore
    }
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return null;

    if (!this.ctx) {
      this.ctx = new AudioContextClass();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  // Pre-unlock audio on user gesture (e.g. click anywhere or click test sound)
  public unlockAudio() {
    const ctx = this.getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    try {
      localStorage.setItem('restaurant_sound_muted', String(muted));
    } catch {
      // ignore
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    try {
      localStorage.setItem('restaurant_sound_volume', String(this.volume));
    } catch {
      // ignore
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  /**
   * Sound 1: NEW ORDER - Urgent, energetic, distinct double-chime (D5 -> A5 -> D6 chime)
   * High attention bell for kitchen/admin receipt.
   */
  public playNewOrderSound() {
    if (this.isMuted) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(this.volume, now);
      masterGain.connect(ctx.destination);

      // Chime note helper
      const playTone = (freq: number, startTime: number, duration: number, type: OscillatorType = 'sine') => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, startTime);

        // Envelope: soft attack, bright ring, natural decay
        gain.gain.setValueAtTime(0.001, startTime);
        gain.gain.exponentialRampToValueAtTime(0.7, startTime + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        osc.connect(gain);
        gain.connect(masterGain);

        osc.start(startTime);
        osc.stop(startTime + duration);
      };

      // 3 ascending notes: 587.33 (D5), 880 (A5), 1174.66 (D6) with chime resonance
      playTone(587.33, now, 0.35, 'triangle');
      playTone(880.0, now + 0.12, 0.45, 'sine');
      playTone(1174.66, now + 0.26, 0.65, 'sine');

      // Second harmonic accent for extra punch (doorbell / cash register shimmer)
      playTone(1760.0, now + 0.28, 0.35, 'sine');
    } catch (err) {
      console.warn('[SoundPlayer] Failed to play new order sound:', err);
    }
  }

  /**
   * Sound 2: ORDER CONFIRMED - Pleasant, cheerful, authoritative chord (Major Triad: C5 -> E5 -> G5)
   * Signals successful acceptance and preparation start.
   */
  public playOrderConfirmedSound() {
    if (this.isMuted) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(this.volume * 0.9, now);
      masterGain.connect(ctx.destination);

      const playChordNote = (freq: number, startTime: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.001, startTime);
        gain.gain.exponentialRampToValueAtTime(0.6, startTime + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        osc.connect(gain);
        gain.connect(masterGain);

        osc.start(startTime);
        osc.stop(startTime + duration);
      };

      // C Major arpeggio + warm harmonic
      playChordNote(523.25, now, 0.4);       // C5
      playChordNote(659.25, now + 0.1, 0.45); // E5
      playChordNote(783.99, now + 0.2, 0.6);  // G5
      playChordNote(1046.5, now + 0.32, 0.7); // C6
    } catch (err) {
      console.warn('[SoundPlayer] Failed to play order confirmed sound:', err);
    }
  }

  /**
   * Sound 3: GENERAL NOTIFICATION / STATUS UPDATE (Gentle soft ding)
   */
  public playNotificationSound() {
    if (this.isMuted) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(740, now); // F#5

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(this.volume * 0.5, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.3);
    } catch {
      // ignore
    }
  }
}

export const soundPlayer = new SoundEffectPlayer();
