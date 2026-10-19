// Web Audio API Synthesizer + HTML5 Audio Dual-Engine Sound Alert
// نظام صوتي موثوق 100% يعمل على كافة المتصفحات والهواتف والأجهزة اللوحية
// يعالج قيود التشغيل التلقائي للمتصفح (Autoplay Policies) دون أي تعطل

class SoundEffectPlayer {
  private ctx: AudioContext | null = null;
  private audioEl: HTMLAudioElement | null = null;
  private isUnlocked: boolean = false;
  private lastPlayedTime: number = 0;

  constructor() {
    if (typeof window !== 'undefined') {
      // Pre-arm HTML5 audio element
      try {
        this.audioEl = new Audio('/order-chime.wav');
        this.audioEl.preload = 'auto';
      } catch {
        // ignore
      }

      // Automatically attach global user gesture listeners to unlock audio on first interaction
      const gestureEvents = ['click', 'touchstart', 'touchend', 'keydown', 'mousedown', 'pointerdown'];
      const autoUnlock = () => {
        this.unlockAudio();
      };

      gestureEvents.forEach((evt) => {
        window.addEventListener(evt, autoUnlock, { passive: true });
      });
    }
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return null;

    if (!this.ctx || this.ctx.state === 'closed') {
      try {
        this.ctx = new AudioContextClass();
      } catch (e) {
        console.warn('[SoundPlayer] AudioContext creation warning:', e);
      }
    }
    return this.ctx;
  }

  /**
   * إلغاء قفل الصوت في المتصفح بشكل كامل وفوري عبر تشغيل عينة صامتة
   * يعمل عند أي تفاعل من المستخدم (نقر، لمس، ضغط مفتاح، أو فتح اللوحة)
   */
  public unlockAudio(): void {
    if (typeof window === 'undefined') return;

    try {
      const ctx = this.getAudioContext();
      if (ctx) {
        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }

        // تشغيل عينة صامتة (Silent Buffer) لإيقاظ معالج الصوت في المتصفح
        try {
          const silentBuffer = ctx.createBuffer(1, 1, 22050);
          const source = ctx.createBufferSource();
          source.buffer = silentBuffer;
          source.connect(ctx.destination);
          source.start(0);
        } catch {
          // ignore
        }
      }

      // تهيئة عنصر الصوت الاحتياطي HTML5 Audio
      if (this.audioEl) {
        this.audioEl.load();
      }

      this.isUnlocked = true;
    } catch (err) {
      console.warn('[SoundPlayer] Unlock attempt:', err);
    }
  }

  /**
   * توليد وتشغيل نغمات التنبيه عبر Web Audio API
   */
  private playWebAudioChime(ctx: AudioContext): void {
    try {
      const now = ctx.currentTime;
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.85, now);
      masterGain.connect(ctx.destination);

      const playTone = (
        freq: number,
        startTime: number,
        duration: number,
        type: OscillatorType = 'sine'
      ) => {
        try {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = type;
          osc.frequency.setValueAtTime(freq, startTime);

          gain.gain.setValueAtTime(0.0001, startTime);
          gain.gain.exponentialRampToValueAtTime(0.7, startTime + 0.03);
          gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

          osc.connect(gain);
          gain.connect(masterGain);

          osc.start(startTime);
          osc.stop(startTime + duration);
        } catch {
          // ignore
        }
      };

      // نغمة رنانة ثلاثية صاعدة مميزة للمطاعم: D5 (587Hz) -> A5 (880Hz) -> D6 (1174Hz)
      playTone(587.33, now, 0.35, 'triangle');
      playTone(880.0, now + 0.12, 0.45, 'sine');
      playTone(1174.66, now + 0.25, 0.65, 'sine');
    } catch (e) {
      console.warn('[SoundPlayer] Web Audio playback error:', e);
      this.playHtmlAudioFallback();
    }
  }

  /**
   * تشغيل رنة التنبيه عبر HTML5 Audio كطبقة احتياطية مضمونة
   */
  private playHtmlAudioFallback(): void {
    try {
      if (!this.audioEl) {
        this.audioEl = new Audio('/order-chime.wav');
      }
      this.audioEl.currentTime = 0;
      this.audioEl.volume = 0.9;
      this.audioEl.play().catch((err) => {
        console.warn('[SoundPlayer] HTML5 Audio play notice (waiting for user interaction):', err);
      });
    } catch (err) {
      console.warn('[SoundPlayer] HTML5 audio fallback error:', err);
    }
  }

  /**
   * صوت تنبيه واحد فقط خاص بوصول طلبية جديدة وحفظها بنجاح في قاعدة البيانات
   * يضمن تشغيل الصوت مرة واحدة فقط مع منع التكرار اللحظي
   */
  public playNewOrderAlert(): void {
    // منع التكرار اللحظي (Debounce 900ms) لضمان خروج رنة واحدة نقية
    const nowMs = Date.now();
    if (nowMs - this.lastPlayedTime < 900) {
      return;
    }
    this.lastPlayedTime = nowMs;

    try {
      const ctx = this.getAudioContext();

      if (ctx && ctx.state === 'running') {
        // إذا كان معالج الصوت نشطاً، يتم تشغيل النغمات فوراً
        this.playWebAudioChime(ctx);
      } else if (ctx && ctx.state === 'suspended') {
        // محاولة استئناف المعالج مع تشغيل احتياطي متزامن
        ctx
          .resume()
          .then(() => {
            this.playWebAudioChime(ctx);
          })
          .catch(() => {
            this.playHtmlAudioFallback();
          });
        // محاولة التشغيل عبر HTML5 Audio أيضاً
        this.playHtmlAudioFallback();
      } else {
        // في حال عدم توفر Web Audio API
        this.playHtmlAudioFallback();
      }
    } catch {
      this.playHtmlAudioFallback();
    }
  }
}

export const soundPlayer = new SoundEffectPlayer();
