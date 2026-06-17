/**
 * "A Letter For You" - Interactive Romantic Web Application
 * 
 * Features:
 * - 3D Envelope Opening & Slide-out Animation
 * - High-Performance Canvas Floating Hearts Particle System
 * - Custom Web Audio API Ambient Music Synth & Paper Rustle SFX
 * - Responsive Letter Detail View & Mute Controls
 * 
 * Customizable colors, typography, and letters are defined in index.html,
 * styles.css, and script.js. Check comments below to customize.
 */

// ==========================================================================
// 1. STATE VARIABLES & CONFIGURATION
// ==========================================================================
const CONFIG = {
  // Particle Options
  maxParticles: 55,
  particleColors: [
    'rgba(255, 117, 140, 0.75)',  // Blush pink
    'rgba(255, 94, 98, 0.7)',     // Warm pink-red
    'rgba(216, 17, 89, 0.65)',    // Crimson
    'rgba(247, 174, 248, 0.7)',   // Soft lavender-pink
    'rgba(212, 175, 55, 0.6)'     // Gold sparkle
  ],
  
  // Audio Config
  tempo: 1.3, // Seconds per beat for the background music arpeggiator
  synthVolume: 0.04 // Volume level for the romantic background music
};

// Application state
let state = {
  isEnvelopeOpen: false,
  isOpening: false,
  musicEnabled: true,
  sfxEnabled: true,
  audioInitialized: false
};

// AudioContext & Synthesizer variables
let audioCtx = null;
let musicVolumeNode = null;
let musicIntervalId = null;
let musicStep = 0;

// Chord Progression: [Root, 3rd, 5th, 7th/9th, Octave/Melody]
// Warm Romantic Progression: Fmaj9 -> Cmaj9 -> Dm9 -> Am9
const chords = [
  [41, 57, 60, 64, 67], // F2, A3, C4, E4, G4 (Fmaj9)
  [36, 55, 59, 62, 64], // C2, G3, B3, D4, E4 (Cmaj9)
  [38, 57, 60, 64, 65], // D2, A3, C4, E4, F4 (Dm9)
  [33, 52, 55, 59, 60]  // A1, E3, G3, B3, C4 (Am9)
];

// DOM Elements
const elements = {
  envelopeInteractive: document.getElementById('envelope-interactive'),
  envelopeFlap: document.getElementById('envelope-flap'),
  envelopeLetterPreview: document.getElementById('envelope-letter-preview'),
  envelopeSeal: document.getElementById('envelope-seal'),
  instructionText: document.getElementById('instruction-text'),
  letterOverlay: document.getElementById('letter-overlay'),
  btnReadAgain: document.getElementById('btn-read-again'),
  btnCloseLetter: document.getElementById('btn-close-letter'),
  toggleMusicBtn: document.getElementById('toggle-music'),
  toggleSfxBtn: document.getElementById('toggle-sfx'),
  canvas: document.getElementById('particles-canvas')
};

// Canvas context
const ctx = elements.canvas.getContext('2d');
let particles = [];

// ==========================================================================
// 2. CANVAS FLOATING HEARTS & SPARKLES SYSTEM
// ==========================================================================
class Particle {
  constructor() {
    this.reset(true);
  }

  reset(initiallyBottom = false) {
    this.type = Math.random() > 0.25 ? 'heart' : 'sparkle';
    this.size = Math.random() * (this.type === 'heart' ? 14 : 6) + 6;

    // Position x depending on envelope open state
    if (state.isEnvelopeOpen) {
      // Spawn ONLY on the sides of the letter image
      const modalWidth = Math.min(580, elements.canvas.width * 0.95);
      const leftBoundary = (elements.canvas.width - modalWidth) / 2;
      const rightBoundary = (elements.canvas.width + modalWidth) / 2;
      
      if (Math.random() > 0.5) {
        // Left side spawn
        this.x = Math.random() * (leftBoundary - 20);
      } else {
        // Right side spawn
        this.x = rightBoundary + 20 + Math.random() * (elements.canvas.width - rightBoundary - 20);
      }
      
      // Open state colors: light blue and pink hearts
      const openColors = [
        'rgba(173, 216, 230, 0.8)',  // Light blue
        'rgba(135, 206, 250, 0.8)',  // Sky blue
        'rgba(255, 182, 193, 0.85)', // Light pink
        'rgba(255, 105, 180, 0.75)'  // Rose pink
      ];
      this.color = openColors[Math.floor(Math.random() * openColors.length)];
    } else {
      // Normal spawn across the full width
      this.x = Math.random() * elements.canvas.width;
      this.color = CONFIG.particleColors[Math.floor(Math.random() * CONFIG.particleColors.length)];
    }

    // If initial load, scatter vertically, otherwise always spawn at bottom
    this.y = initiallyBottom 
      ? Math.random() * elements.canvas.height 
      : elements.canvas.height + this.size + 10;
      
    this.speedY = -(Math.random() * 0.8 + 0.4); // Floating upwards
    this.speedX = Math.random() * 0.4 - 0.2;     // Subtle horizontal drift
    this.swaySpeed = Math.random() * 0.02 + 0.01;
    this.swayValue = Math.random() * Math.PI * 2;
    this.opacity = 0;
    this.maxOpacity = Math.random() * 0.6 + 0.2;
    this.rotation = Math.random() * Math.PI * 0.1 - 0.05; // Slight tilt
  }

  update() {
    this.y += this.speedY;
    this.swayValue += this.swaySpeed;
    this.x += this.speedX + Math.sin(this.swayValue) * 0.25;

    // Fade in when entering from bottom, fade out when getting close to top
    if (this.y > elements.canvas.height - 100) {
      this.opacity = Math.min(this.maxOpacity, this.opacity + 0.02);
    } else if (this.y < 150) {
      this.opacity = Math.max(0, this.opacity - 0.015);
    } else {
      this.opacity = this.maxOpacity;
    }

    // Reset when offscreen top or sides
    if (this.y < -this.size || this.x < -this.size || this.x > elements.canvas.width + this.size || this.opacity <= 0 && this.y < elements.canvas.height - 200) {
      this.reset(false);
    }
  }

  draw() {
    ctx.save();
    ctx.globalAlpha = this.opacity;
    ctx.fillStyle = this.color;
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    if (this.type === 'heart') {
      // Draw Heart Shape
      ctx.beginPath();
      const s = this.size / 2;
      ctx.moveTo(0, s * 0.5);
      // Left curve
      ctx.bezierCurveTo(-s * 0.8, -s * 0.8, -s * 1.6, s * 0.2, 0, s * 1.5);
      // Right curve
      ctx.bezierCurveTo(s * 1.6, s * 0.2, s * 0.8, -s * 0.8, 0, s * 0.5);
      ctx.fill();
    } else {
      // Draw 4-point Sparkle/Star
      ctx.beginPath();
      const r = this.size / 2;
      ctx.moveTo(0, -r);
      ctx.quadraticCurveTo(0, 0, r, 0);
      ctx.quadraticCurveTo(0, 0, 0, r);
      ctx.quadraticCurveTo(0, 0, -r, 0);
      ctx.quadraticCurveTo(0, 0, 0, -r);
      ctx.fill();
    }
    ctx.restore();
  }
}

// Manage canvas dimensions dynamically
function resizeCanvas() {
  elements.canvas.width = window.innerWidth;
  elements.canvas.height = window.innerHeight;
  
  // Re-scatter existing particles on resize so they don't look weird
  particles.forEach(p => {
    if (p.x > elements.canvas.width) p.x = Math.random() * elements.canvas.width;
    if (p.y > elements.canvas.height) p.y = Math.random() * elements.canvas.height;
  });
}

function initParticles() {
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  
  for (let i = 0; i < CONFIG.maxParticles; i++) {
    particles.push(new Particle());
  }
}

function animateParticles() {
  ctx.clearRect(0, 0, elements.canvas.width, elements.canvas.height);
  
  particles.forEach(p => {
    p.update();
    p.draw();
  });
  
  requestAnimationFrame(animateParticles);
}

// ==========================================================================
// 3. WEB AUDIO API SYNTHESIZER (MUSIC & SFX)
// ==========================================================================

/**
 * Initializes the AudioContext upon first user interaction (browser security restriction).
 */
function initAudio() {
  if (state.audioInitialized) return;
  
  try {
    // Create audio context
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContextClass();
    
    // Master volume controls
    musicVolumeNode = audioCtx.createGain();
    musicVolumeNode.gain.value = state.musicEnabled ? CONFIG.synthVolume : 0;
    musicVolumeNode.connect(audioCtx.destination);
    
    state.audioInitialized = true;
    
    // Start background music loop
    if (state.musicEnabled) {
      startMusicLoop();
    }
  } catch (e) {
    console.warn("Web Audio API not supported in this browser:", e);
  }
}

/**
 * Ensures audio context is active (handles browser suspension states).
 */
function resumeAudioContext() {
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

/**
 * Synthesizes a realistic "paper rustle" sound effect using white noise
 * with biquad filter sweeps and volume envelopes.
 */
function playRustleSound() {
  if (!state.sfxEnabled) return;
  initAudio();
  resumeAudioContext();
  
  if (!audioCtx) return;

  const now = audioCtx.currentTime;
  const sampleRate = audioCtx.sampleRate;
  
  // Create a 0.4 second white noise buffer
  const bufferSize = sampleRate * 0.4;
  const buffer = audioCtx.createBuffer(1, bufferSize, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  // Create multiple short noise bursts representing the paper creases sliding
  const delays = [0, 0.06, 0.14, 0.22];
  
  delays.forEach((delay, idx) => {
    const noiseNode = audioCtx.createBufferSource();
    noiseNode.buffer = buffer;

    // Filter to isolate paper frequency (1.5kHz - 3kHz range)
    const bandpassFilter = audioCtx.createBiquadFilter();
    bandpassFilter.type = 'bandpass';
    bandpassFilter.frequency.value = 2200 + Math.random() * 500;
    bandpassFilter.Q.value = 2.5;

    // Highpass to eliminate bassy thuds, keeping only rustles
    const highpassFilter = audioCtx.createBiquadFilter();
    highpassFilter.type = 'highpass';
    highpassFilter.frequency.value = 1200;

    // Soft amplitude envelope
    const gainNode = audioCtx.createGain();
    const peakVolume = 0.15 * (1 - idx * 0.2); // Each subsequent crackle is softer
    
    gainNode.gain.setValueAtTime(0, now + delay);
    gainNode.gain.linearRampToValueAtTime(peakVolume, now + delay + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.1 + (Math.random() * 0.05));

    // Connect nodes
    noiseNode.connect(bandpassFilter);
    bandpassFilter.connect(highpassFilter);
    highpassFilter.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    // Play
    noiseNode.start(now + delay);
    noiseNode.stop(now + delay + 0.2);
  });
}

/**
 * Synthesizes a soft, romantic lofi piano note using lowpass filters, 
 * slight chorus detuning, and a long release (reverb simulation).
 */
function playPianoNote(midiNumber, startTime, duration = 3.0, volume = 1.0) {
  if (!audioCtx) return;

  const frequency = 440 * Math.pow(2, (midiNumber - 69) / 12);
  
  // Synthesize using double oscillators for rich chorused tone
  const osc1 = audioCtx.createOscillator();
  const osc2 = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();

  // Warm lofi keyboards combine triangle (warm baseline) & sine (pure fundamental)
  osc1.type = 'triangle';
  osc2.type = 'sine';
  osc2.detune.value = 8; // Detuning gives it a warm, lush acoustic chorus feel

  osc1.frequency.setValueAtTime(frequency, startTime);
  osc2.frequency.setValueAtTime(frequency, startTime);

  // Soft lowpass filter to make it warm, intimate, and dreamy (removes buzzer edge)
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(750, startTime);
  filter.frequency.exponentialRampToValueAtTime(450, startTime + duration * 0.8);

  // Envelope (soft attack, slow decay to mimic sustain pedal reverb)
  gainNode.gain.setValueAtTime(0, startTime);
  gainNode.gain.linearRampToValueAtTime(volume * 0.8, startTime + 0.08);
  gainNode.gain.setValueAtTime(volume * 0.8, startTime + 0.15);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  // Connect Nodes
  osc1.connect(filter);
  osc2.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(musicVolumeNode);

  // Start & Stop scheduling
  osc1.start(startTime);
  osc2.start(startTime);
  osc1.stop(startTime + duration);
  osc2.stop(startTime + duration);
}

/**
 * Sequencer loop that schedules the arpeggio beats.
 * Cycles through Fmaj9 -> Cmaj9 -> Dm9 -> Am9
 */
function scheduleNextMusicBeat() {
  if (!audioCtx || !state.musicEnabled) return;

  const now = audioCtx.currentTime;
  const beatDuration = CONFIG.tempo;
  
  // 16 beats per full progression cycle (4 beats per chord)
  const currentChordIdx = Math.floor((musicStep % 16) / 4);
  const chord = chords[currentChordIdx];
  const chordBeat = musicStep % 4;

  // Design a romantic arpeggio pattern
  if (chordBeat === 0) {
    // Beat 0: Soft low bass note + chord harmony pads
    playPianoNote(chord[0], now, beatDuration * 3.5, 0.95); // Deep Bass root
    playPianoNote(chord[1], now + 0.05, beatDuration * 2.5, 0.45); // Harmony 3rd
    playPianoNote(chord[2], now + 0.10, beatDuration * 2.5, 0.4);  // Harmony 5th
  } else if (chordBeat === 1) {
    // Beat 1: Higher arpeggio notes
    playPianoNote(chord[3], now, beatDuration * 2.0, 0.55); // Color 7th/9th
  } else if (chordBeat === 2) {
    // Beat 2: High melody spark note
    playPianoNote(chord[4], now, beatDuration * 2.0, 0.65); // High color/octave
  } else if (chordBeat === 3) {
    // Beat 3: Inner transition voice
    playPianoNote(chord[2], now, beatDuration * 1.5, 0.45); // Mid note
    
    // Add a tiny random melody ornament sometimes
    if (Math.random() > 0.65) {
      const melodyOrnament = chord[4] + (Math.random() > 0.5 ? 2 : -2); // Adjacent scale step
      playPianoNote(melodyOrnament, now + 0.5, beatDuration * 1.0, 0.3);
    }
  }

  musicStep++;
}

/**
 * Starts the scheduling loop for the synthesiser.
 */
function startMusicLoop() {
  if (musicIntervalId) return;
  
  // Play the first beat immediately
  scheduleNextMusicBeat();
  
  // Schedule every tempo interval
  musicIntervalId = setInterval(scheduleNextMusicBeat, CONFIG.tempo * 1000);
}

/**
 * Stops the synthesizer scheduling loop.
 */
function stopMusicLoop() {
  if (musicIntervalId) {
    clearInterval(musicIntervalId);
    musicIntervalId = null;
  }
}

// ==========================================================================
// 4. INTERACTIVE ENVELOPE FLOW CONTROLLER
// ==========================================================================

/**
 * Animates the envelope opening, slide-out, and opens full letter overlay.
 */
function openEnvelope() {
  if (state.isEnvelopeOpen || state.isOpening) return;
  state.isOpening = true;

  initAudio();
  resumeAudioContext();
  
  const envelope = elements.envelopeInteractive.querySelector('.envelope');
  
  // Step 1: Hide instructions and start flap rotation
  elements.instructionText.classList.add('fade-out');
  envelope.classList.add('opening');
  playRustleSound();

  // Step 2: Slide out the letter preview card
  setTimeout(() => {
    envelope.classList.add('opened');
    playRustleSound();
  }, 750);

  // Step 3: Trigger full letter overlay fade-in
  setTimeout(() => {
    elements.letterOverlay.classList.add('show');
    state.isEnvelopeOpen = true;
    // Instantly reset particles to spawn on the sides in pink and light blue
    particles.forEach(p => p.reset(false));
    state.isOpening = false;
  }, 1600);
}

/**
 * Reverses the envelope opening animation to fold it back.
 */
function closeEnvelope(onComplete = null) {
  if (!state.isEnvelopeOpen || state.isOpening) return;
  state.isOpening = true;

  const envelope = elements.envelopeInteractive.querySelector('.envelope');

  // Step 1: Fade out the detailed overlay
  elements.letterOverlay.classList.remove('show');
  
  setTimeout(() => {
    playRustleSound();
    // Step 2: Slide the letter preview card back in
    envelope.classList.remove('opened');
    
    setTimeout(() => {
      // Step 3: Flip the envelope top flap closed
      playRustleSound();
      envelope.classList.remove('opening');
      
      setTimeout(() => {
        // Step 4: Reset interface styles
        elements.instructionText.classList.remove('fade-out');
        state.isEnvelopeOpen = false;
        // Reset particles to spawn full screen in original colors
        particles.forEach(p => p.reset(false));
        state.isOpening = false;
        if (onComplete) onComplete();
      }, 800);
    }, 600);
  }, 400);
}

/**
 * Resets and replays the envelope opening animation automatically.
 */
function replayAnimation() {
  closeEnvelope(() => {
    // Small delay after closing before re-opening
    setTimeout(() => {
      openEnvelope();
    }, 400);
  });
}

// ==========================================================================
// 5. EVENT HANDLERS & INIT
// ==========================================================================
function setupEventListeners() {
  // Opening triggers: seal click or clicking envelope body
  elements.envelopeSeal.addEventListener('click', (e) => {
    e.stopPropagation();
    openEnvelope();
  });
  elements.envelopeInteractive.addEventListener('click', openEnvelope);

  // Closing letter triggers
  elements.btnCloseLetter.addEventListener('click', () => closeEnvelope());
  elements.btnReadAgain.addEventListener('click', replayAnimation);

  // Close letter by clicking backdrop wrapper (excluding card modal itself)
  elements.letterOverlay.addEventListener('click', (e) => {
    if (e.target === elements.letterOverlay) {
      closeEnvelope();
    }
  });

  // Music Mute Button
  elements.toggleMusicBtn.addEventListener('click', () => {
    state.musicEnabled = !state.musicEnabled;
    elements.toggleMusicBtn.classList.toggle('muted', !state.musicEnabled);
    
    // Toggle SVGs
    elements.toggleMusicBtn.querySelector('.icon-music-on').classList.toggle('hidden', !state.musicEnabled);
    elements.toggleMusicBtn.querySelector('.icon-music-off').classList.toggle('hidden', state.musicEnabled);

    initAudio();
    resumeAudioContext();

    if (musicVolumeNode) {
      // Smooth volume transition (fade in/out over 0.3s)
      const now = audioCtx.currentTime;
      musicVolumeNode.gain.cancelScheduledValues(now);
      musicVolumeNode.gain.setValueAtTime(musicVolumeNode.gain.value, now);
      musicVolumeNode.gain.linearRampToValueAtTime(state.musicEnabled ? CONFIG.synthVolume : 0, now + 0.3);
    }

    if (state.musicEnabled) {
      startMusicLoop();
    } else {
      stopMusicLoop();
    }
  });

  // Sound Effects Mute Button
  elements.toggleSfxBtn.addEventListener('click', () => {
    state.sfxEnabled = !state.sfxEnabled;
    elements.toggleSfxBtn.classList.toggle('muted', !state.sfxEnabled);

    // Toggle SVGs
    elements.toggleSfxBtn.querySelector('.icon-sfx-on').classList.toggle('hidden', !state.sfxEnabled);
    elements.toggleSfxBtn.querySelector('.icon-sfx-off').classList.toggle('hidden', state.sfxEnabled);

    // Touch audio context so it's initialized on click
    initAudio();
    resumeAudioContext();
  });

  // Global touch start triggers audio context initialize for mobile devices
  const unlockAudio = () => {
    initAudio();
    resumeAudioContext();
    document.removeEventListener('click', unlockAudio);
    document.removeEventListener('touchstart', unlockAudio);
  };
  document.addEventListener('click', unlockAudio);
  document.addEventListener('touchstart', unlockAudio);
}

// Initialization Entrypoint
document.addEventListener('DOMContentLoaded', () => {
  // Initialize canvas floating hearts
  initParticles();
  animateParticles();

  // Hook up user interface events
  setupEventListeners();
});
