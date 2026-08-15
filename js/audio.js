/* ==========================================================================
   AEGIS — HUD Audio Engine
   Fully synthesized UI sounds via Web Audio API.
   All methods are lazy-init safe (respects browser autoplay policy).
   ========================================================================== */

class HUDAudioEngine {
  constructor() {
    this._ctx = null;
  }

  /** Lazily create or return the AudioContext */
  _getCtx() {
    if (!this._ctx) {
      this._ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return this._ctx;
  }

  /**
   * Unlock AudioContext after a user gesture.
   * Call this inside any click/keydown handler before playing sounds.
   */
  init() {
    try {
      const ctx = this._getCtx();
      if (ctx.state === 'suspended') ctx.resume();
    } catch (_) { /* silently ignore */ }
  }

  /**
   * Internal tone player.
   * @param {object} opts
   * @param {number}  [opts.frequency=440]   - Static frequency in Hz
   * @param {number}  [opts.startFreq]       - Start frequency for sweep
   * @param {number}  [opts.endFreq]         - End frequency for sweep
   * @param {string}  [opts.type='sine']     - OscillatorType
   * @param {number}  [opts.gain=0.25]       - Peak gain (0–1)
   * @param {number}  [opts.duration=0.15]   - Total duration in seconds
   * @param {number}  [opts.attack=0.01]     - Ramp-up time in seconds
   * @param {number}  [opts.delay=0]         - Delay before playback in seconds
   */
  _playTone({ frequency = 440, startFreq = null, endFreq = null, type = 'sine',
    gain = 0.25, duration = 0.15, attack = 0.01, delay = 0 } = {}) {
    try {
      const ctx = this._getCtx();
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.type = type;

      const startAt = ctx.currentTime + delay;

      if (startFreq !== null && endFreq !== null) {
        osc.frequency.setValueAtTime(startFreq, startAt);
        osc.frequency.linearRampToValueAtTime(endFreq, startAt + duration);
      } else {
        osc.frequency.setValueAtTime(frequency, startAt);
      }

      gainNode.gain.setValueAtTime(0, startAt);
      gainNode.gain.linearRampToValueAtTime(gain, startAt + attack);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

      osc.start(startAt);
      osc.stop(startAt + duration + 0.02);
    } catch (_) { /* silently ignore — audio not available */ }
  }

  /** Short crisp UI click beep */
  click() {
    this._playTone({ frequency: 820, type: 'sine', gain: 0.18, duration: 0.07, attack: 0.004 });
  }

  /** Ascending sweep — message transmitted */
  transmit() {
    this._playTone({ startFreq: 380, endFreq: 1100, type: 'sine', gain: 0.22, duration: 0.22, attack: 0.01 });
    this._playTone({ frequency: 1350, type: 'sine', gain: 0.13, duration: 0.1, attack: 0.005, delay: 0.2 });
  }

  /** Silent persona switch */
  toggle() {}

  /** Descending sawtooth buzz — error */
  error() {
    this._playTone({ startFreq: 320, endFreq: 75, type: 'sawtooth', gain: 0.28, duration: 0.45, attack: 0.01 });
  }

  /** Soft double-ping — AI response incoming */
  notification() {
    this._playTone({ frequency: 980, type: 'sine', gain: 0.14, duration: 0.18, attack: 0.02 });
    this._playTone({ frequency: 1220, type: 'sine', gain: 0.1, duration: 0.14, attack: 0.01, delay: 0.17 });
  }
}

export const soundFx = new HUDAudioEngine();