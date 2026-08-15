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

  /**
   * Modern Mechanical-Electric Switch Sound.
   * Multi-layered physical & electrical synthesis:
   * - Solenoid / Relay mechanical heavy thump
   * - Dual-stage tactile metallic micro-switch clicks
   * - High-voltage electric arc / spark discharge crackle
   * - Electromagnetic capacitive charging/discharging surge
   *
   * @param {'jarvis'|'ultron'} [targetPersona='jarvis']
   */
  toggle(targetPersona = 'jarvis') {
    try {
      const ctx = this._getCtx();
      if (ctx.state === 'suspended') ctx.resume();

      const now = ctx.currentTime;
      const isUltron = targetPersona === 'ultron';

      // 1. MECHANICAL SOLENOID THUMP (Low punch mechanical actuator)
      const thumpOsc = ctx.createOscillator();
      const thumpGain = ctx.createGain();
      thumpOsc.connect(thumpGain);
      thumpGain.connect(ctx.destination);

      thumpOsc.type = isUltron ? 'sawtooth' : 'triangle';
      thumpOsc.frequency.setValueAtTime(isUltron ? 160 : 130, now);
      thumpOsc.frequency.exponentialRampToValueAtTime(32, now + 0.07);

      thumpGain.gain.setValueAtTime(0.32, now);
      thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);
      thumpOsc.start(now);
      thumpOsc.stop(now + 0.08);

      // 2. METALLIC TACTILE SWITCH CONTACT (Crisp micro-switch snap)
      const click1 = ctx.createOscillator();
      const click1Gain = ctx.createGain();
      click1.connect(click1Gain);
      click1Gain.connect(ctx.destination);

      click1.type = 'square';
      click1.frequency.setValueAtTime(2400, now + 0.002);
      click1.frequency.exponentialRampToValueAtTime(800, now + 0.018);

      click1Gain.gain.setValueAtTime(0.22, now + 0.002);
      click1Gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
      click1.start(now + 0.002);
      click1.stop(now + 0.025);

      // Secondary mechanical latch lock (18ms later)
      const click2 = ctx.createOscillator();
      const click2Gain = ctx.createGain();
      click2.connect(click2Gain);
      click2Gain.connect(ctx.destination);

      click2.type = 'sine';
      click2.frequency.setValueAtTime(isUltron ? 3100 : 3800, now + 0.022);
      click2.frequency.exponentialRampToValueAtTime(1200, now + 0.045);

      click2Gain.gain.setValueAtTime(0.18, now + 0.022);
      click2Gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
      click2.start(now + 0.022);
      click2.stop(now + 0.055);

      // 3. ELECTRIC SPARK / ARC DISCHARGE (Noise burst + High frequency crackle)
      const bufferSize = Math.floor(ctx.sampleRate * 0.045);
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        // High density random spark impulses
        output[i] = (Math.random() * 2 - 1) * (Math.random() > 0.3 ? 1 : 0.2);
      }

      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;

      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(isUltron ? 1800 : 3200, now + 0.005);
      noiseFilter.Q.setValueAtTime(3.5, now + 0.005);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.24, now + 0.005);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

      noiseSource.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(ctx.destination);

      noiseSource.start(now + 0.005);
      noiseSource.stop(now + 0.05);

      // 4. ELECTROMAGNETIC FLUX / CAPACITOR POWER SURGE
      const surgeOsc = ctx.createOscillator();
      const surgeGain = ctx.createGain();
      surgeOsc.connect(surgeGain);
      surgeGain.connect(ctx.destination);

      if (isUltron) {
        // Ultron: Heavy aggressive electric overload pulse
        surgeOsc.type = 'sawtooth';
        surgeOsc.frequency.setValueAtTime(750, now + 0.02);
        surgeOsc.frequency.exponentialRampToValueAtTime(140, now + 0.16);

        surgeGain.gain.setValueAtTime(0.19, now + 0.02);
        surgeGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.17);
      } else {
        // Jarvis: Clean cybernetic capacitor charge / harmonic laser pulse
        surgeOsc.type = 'sine';
        surgeOsc.frequency.setValueAtTime(340, now + 0.015);
        surgeOsc.frequency.exponentialRampToValueAtTime(1150, now + 0.15);

        surgeGain.gain.setValueAtTime(0.18, now + 0.015);
        surgeGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
      }

      surgeOsc.start(now + 0.015);
      surgeOsc.stop(now + 0.18);
    } catch (_) {
      // Fallback simple mechanical click
      this._playTone({ frequency: 600, type: 'square', gain: 0.2, duration: 0.08, attack: 0.005 });
    }
  }

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