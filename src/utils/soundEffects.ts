// Web Audio API sound effects & continuous YouTube timeout alarm for primary school learning

let sharedAudioCtx: AudioContext | null = null;
let alarmIntervalId: number | null = null;
let keepAliveOsc: OscillatorNode | null = null;
let keepAliveGain: GainNode | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedAudioCtx) {
    sharedAudioCtx = new AudioCtx();
  }
  if (sharedAudioCtx.state === "suspended") {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

/**
 * Unlocks AudioContext on user click and optionally keeps the audio thread active
 * while the child switches to the YouTube tab so the timeout alarm can ring in the background.
 */
export function startBackgroundAudioKeepAlive() {
  const ctx = getAudioContext();
  if (!ctx) return;

  stopBackgroundAudioKeepAlive();
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(40, ctx.currentTime);
    // Virtually silent gain so user hears nothing while watching, but browser keeps audio thread awake
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    keepAliveOsc = osc;
    keepAliveGain = gain;
  } catch {
    // ignore
  }
}

export function stopBackgroundAudioKeepAlive() {
  if (keepAliveOsc) {
    try {
      keepAliveOsc.stop();
      keepAliveOsc.disconnect();
    } catch {
      // ignore
    }
    keepAliveOsc = null;
  }
  if (keepAliveGain) {
    try {
      keepAliveGain.disconnect();
    } catch {
      // ignore
    }
    keepAliveGain = null;
  }
}

/**
 * Plays a single loud "TÚT - TÚT" alarm pulse.
 */
function playSingleAlarmBeep() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  // Two sharp high-pitched square-wave beeps ("TÚT - TÚT!") that cut through YouTube audio
  const pulses = [
    { freq: 960, start: 0, duration: 0.16, gain: 0.55 },
    { freq: 1120, start: 0.2, duration: 0.18, gain: 0.6 },
  ];

  pulses.forEach((p) => {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(p.freq, now + p.start);

    gainNode.gain.setValueAtTime(0.001, now + p.start);
    gainNode.gain.linearRampToValueAtTime(p.gain, now + p.start + 0.015);
    gainNode.gain.setValueAtTime(p.gain, now + p.start + p.duration - 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + p.start + p.duration);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(now + p.start);
    osc.stop(now + p.start + p.duration + 0.02);
  });
}

/**
 * Starts a continuous "Tút tút tút..." alarm loop when YouTube reward time runs out
 * so the child cannot continue watching/listening comfortably until turning it off.
 */
export function startContinuousAlarm() {
  stopContinuousAlarm();
  playSingleAlarmBeep();
  if (typeof window !== "undefined") {
    alarmIntervalId = window.setInterval(() => {
      playSingleAlarmBeep();
    }, 480);
  }
}

/**
 * Stops the continuous "Tút tút" alarm.
 */
export function stopContinuousAlarm() {
  if (alarmIntervalId !== null && typeof window !== "undefined") {
    window.clearInterval(alarmIntervalId);
    alarmIntervalId = null;
  }
}

/**
 * Plays a cheerful "Tèn ten tén!" ascending fanfare when the child answers correctly.
 */
export function playCorrectSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  // 3-note joyful fanfare: D5 -> G5 -> B5/D6 ("Tèn - ten - tén!")
  const notes = [
    { freq: 587.33, start: 0, duration: 0.14, gain: 0.22 }, // D5
    { freq: 783.99, start: 0.14, duration: 0.14, gain: 0.25 }, // G5
    { freq: 987.77, start: 0.28, duration: 0.42, gain: 0.3 }, // B5
    { freq: 1174.66, start: 0.32, duration: 0.45, gain: 0.2 }, // D6 harmonic
  ];

  notes.forEach((n) => {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(n.freq, now + n.start);

    gainNode.gain.setValueAtTime(0.001, now + n.start);
    gainNode.gain.exponentialRampToValueAtTime(n.gain, now + n.start + 0.025);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + n.start + n.duration);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(now + n.start);
    osc.stop(now + n.start + n.duration + 0.02);
  });
}

/**
 * Plays a playful descending two-tone "Ố ồ!" sound when the child answers wrong.
 */
export function playWrongSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  // Two descending syllables: "Ố" (higher) -> "ồ..." (lower with slight pitch drop)
  const syllables = [
    { freqStart: 440, freqEnd: 415, start: 0, duration: 0.18, gain: 0.25 }, // "Ố"
    { freqStart: 330, freqEnd: 261.63, start: 0.22, duration: 0.42, gain: 0.28 }, // "ồ..."
  ];

  syllables.forEach((s) => {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.type = "sawtooth";

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(950, now + s.start);

    osc.frequency.setValueAtTime(s.freqStart, now + s.start);
    osc.frequency.linearRampToValueAtTime(s.freqEnd, now + s.start + s.duration);

    gainNode.gain.setValueAtTime(0.001, now + s.start);
    gainNode.gain.linearRampToValueAtTime(s.gain, now + s.start + 0.03);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + s.start + s.duration);

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(now + s.start);
    osc.stop(now + s.start + s.duration + 0.02);
  });
}
