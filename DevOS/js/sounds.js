// ===== GHOST CURSOR TRAIL =====
(function() {
    const canvas = document.getElementById('cursor-canvas');
    if (!canvas || window.matchMedia('(max-width: 767px), (pointer: coarse)').matches) return;
    const ctx = canvas.getContext('2d');
    let mouseMoved = false;
    const pointer = { x: 0.5 * window.innerWidth, y: 0.5 * window.innerHeight };
    const params = { pointsNumber: 40, widthFactor: 0.3, spring: 0.4, friction: 0.5 };
    const trail = [];
    for (let i = 0; i < params.pointsNumber; i++) {
        trail.push({ x: pointer.x, y: pointer.y, dx: 0, dy: 0 });
    }
    function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', (e) => { mouseMoved = true; pointer.x = e.clientX; pointer.y = e.clientY; });
    window.addEventListener('touchmove', (e) => { mouseMoved = true; pointer.x = e.targetTouches[0].clientX; pointer.y = e.targetTouches[0].clientY; });
    function animate(t) {
        if (!mouseMoved) {
            pointer.x = (0.5 + 0.3 * Math.cos(0.002 * t) * Math.sin(0.005 * t)) * window.innerWidth;
            pointer.y = (0.5 + 0.2 * Math.cos(0.005 * t) + 0.1 * Math.cos(0.01 * t)) * window.innerHeight;
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        trail.forEach((p, i) => {
            const prev = i === 0 ? pointer : trail[i - 1];
            const springVal = i === 0 ? 0.4 * params.spring : params.spring;
            p.dx += (prev.x - p.x) * springVal;
            p.dy += (prev.y - p.y) * springVal;
            p.dx *= params.friction;
            p.dy *= params.friction;
            p.x += p.dx;
            p.y += p.dy;
        });
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(trail[0].x, trail[0].y);
        for (let i = 1; i < trail.length - 1; i++) {
            const xc = 0.5 * (trail[i].x + trail[i + 1].x);
            const yc = 0.5 * (trail[i].y + trail[i + 1].y);
            ctx.quadraticCurveTo(trail[i].x, trail[i].y, xc, yc);
            ctx.lineWidth = params.widthFactor * (params.pointsNumber - i);
            ctx.strokeStyle = `hsla(${210 + i * 3}, 80%, 65%, ${1 - i / params.pointsNumber})`;
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(xc, yc);
        }
        requestAnimationFrame(animate);
    }
    animate(0);
})();

// ===== DEVOS AUDIO SYSTEM — Apple-Authentic Web Audio Synthesis =====

let soundEnabled = true;
let masterVolume = 0.42;
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

/** Call after a user gesture so Safari plays audio reliably */
function resumeDevosAudio() {
    try {
        if (audioContext.state === 'suspended') audioContext.resume();
    } catch (e) {}
}
window.resumeDevosAudio = resumeDevosAudio;

let _devosAudioUnlocked = false;
function unlockDevosAudioOnce() {
    if (_devosAudioUnlocked) return;
    _devosAudioUnlocked = true;
    resumeDevosAudio();
}
window.unlockDevosAudioOnce = unlockDevosAudioOnce;

/** Browsers require a user activation for Web Audio; we unlock on the lightest possible signals. */
(function setupDevosAudioUnlock() {
    const unlock = function() {
        unlockDevosAudioOnce();
    };
    const opts = { capture: true, passive: true };
    ['pointerdown', 'touchstart', 'keydown', 'wheel'].forEach(function(ev) {
        document.addEventListener(ev, unlock, opts);
    });
    window.addEventListener('focus', unlock, opts);
    document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'visible') resumeDevosAudio();
    });

    window.addEventListener('load', function() {
        resumeDevosAudio();
        try {
            const silent = new Audio(
                'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA=='
            );
            silent.volume = 0.0001;
            const p = silent.play();
            if (p && p.then) p.then(function() { resumeDevosAudio(); }).catch(function() {});
        } catch (e) {}
    });
})();

function toggleSound() {
    soundEnabled = !soundEnabled;
    localStorage.setItem('macOS-sound-enabled', soundEnabled.toString());
    updateSoundIcon();
}

function updateSoundIcon() {
    const soundIcon = document.getElementById('sound-icon');
    if (soundIcon) {
        if (soundEnabled) {
            soundIcon.innerHTML = '<path d="M14,3.23V5.29C16.89,6.15 19,8.83 19,12C19,15.17 16.89,17.84 14,18.7V20.77C18,19.86 21,16.28 21,12C21,7.72 18,4.14 14,3.23M16.5,12C16.5,10.23 15.5,8.71 14,7.97V16C15.5,15.29 16.5,13.76 16.5,12M3,9V15H7L12,20V4L7,9H3Z"/>';
        } else {
            soundIcon.innerHTML = '<path d="M12,4L9.91,6.09L12,8.18M4.27,3L3,4.27L7.73,9H3V15H7L12,20V13.27L16.25,17.53C15.58,18.04 14.83,18.46 14,18.7V20.77C15.38,20.45 16.63,19.82 17.68,18.96L19.73,21L21,19.73L12,10.73M19,12C19,12.94 18.8,13.82 18.46,14.64L19.97,16.15C20.62,14.91 21,13.5 21,12C21,7.72 18,4.14 14,3.23V5.29C16.89,6.15 19,8.83 19,12M16.5,12C16.5,10.23 15.5,8.71 14,7.97V10.18L16.45,12.63C16.5,12.43 16.5,12.21 16.5,12Z"/>';
        }
    }
}

// --- Helper: create white noise buffer ---
function _createNoiseBuffer(duration) {
    const sampleRate = audioContext.sampleRate;
    const length = sampleRate * duration;
    const buffer = audioContext.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    return buffer;
}

// --- Helper: simple convolver for reverb-like tail ---
function _createReverbImpulse(duration, decay) {
    const sampleRate = audioContext.sampleRate;
    const length = sampleRate * duration;
    const buffer = audioContext.createBuffer(2, length, sampleRate);
    for (let ch = 0; ch < 2; ch++) {
        const data = buffer.getChannelData(ch);
        for (let i = 0; i < length; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
        }
    }
    return buffer;
}

// ===== CLICK — soft glass tap (quieter attack / longer decay) =====
function playClickSound() {
    if (!soundEnabled) return;
    try {
        resumeDevosAudio();
        const now = audioContext.currentTime;
        const v = masterVolume;
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        const filter = audioContext.createBiquadFilter();
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(audioContext.destination);
        osc.frequency.value = 920;
        osc.type = 'sine';
        filter.type = 'lowpass';
        filter.frequency.value = 2400;
        filter.Q.value = 0.6;
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.045 * v, now + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
        osc.start(now);
        osc.stop(now + 0.12);
    } catch (e) {}
}

// ===== MINIMIZE — gentle descending whoosh =====
function playMinimizeSound() {
    if (!soundEnabled) return;
    try {
        const now = audioContext.currentTime;
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        const filter = audioContext.createBiquadFilter();
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(audioContext.destination);
        osc.frequency.setValueAtTime(700, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.3);
        osc.type = 'sine';
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1500, now);
        filter.frequency.exponentialRampToValueAtTime(400, now + 0.3);
        gain.gain.setValueAtTime(0.08 * masterVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
    } catch (e) {}
}

// ===== STARTUP — warm F-major stack, softer highs (closer to Mac boot warmth) =====
function playStartupSound() {
    if (!soundEnabled) return;
    resumeDevosAudio();
    var notes = [
        { freq: 174.61, gain: 0.22, type: 'sine' },
        { freq: 220.00, gain: 0.18, type: 'sine' },
        { freq: 261.63, gain: 0.19, type: 'sine' },
        { freq: 349.23, gain: 0.14, type: 'sine' },
        { freq: 440.00, gain: 0.09, type: 'sine' }
    ];
    var v = masterVolume;
    notes.forEach(function(note, i) {
        try {
            var osc = audioContext.createOscillator();
            var gain = audioContext.createGain();
            var filter = audioContext.createBiquadFilter();
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(audioContext.destination);
            osc.type = note.type;
            osc.frequency.value = note.freq;
            filter.type = 'lowpass';
            filter.frequency.value = 2800;
            filter.Q.value = 0.5;
            var t = audioContext.currentTime + (i * 0.035);
            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(note.gain * v, t + 0.32);
            gain.gain.linearRampToValueAtTime(note.gain * v * 0.88, t + 0.95);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 3.4);
            osc.start(t);
            osc.stop(t + 3.5);
        } catch (e) {}
    });
}

// ===== MACBOOK SLIDE-IN — airy lift (uses same engine as rest of UI) =====
function playMacbookSlideSound() {
    if (!soundEnabled) return;
    try {
        resumeDevosAudio();
        var t0 = audioContext.currentTime;
        var v = masterVolume;
        var chord = [
            { f: 329.63, g: 0.05 },
            { f: 392.0, g: 0.055 },
            { f: 493.88, g: 0.04 }
        ];
        for (var i = 0; i < chord.length; i++) {
            var o = audioContext.createOscillator();
            var g = audioContext.createGain();
            var lp = audioContext.createBiquadFilter();
            o.type = 'sine';
            o.frequency.value = chord[i].f;
            lp.type = 'lowpass';
            lp.frequency.value = 4200;
            lp.Q.value = 0.4;
            o.connect(lp).connect(g).connect(audioContext.destination);
            var st = t0 + i * 0.045;
            g.gain.setValueAtTime(0, st);
            g.gain.linearRampToValueAtTime(chord[i].g * v, st + 0.14);
            g.gain.exponentialRampToValueAtTime(0.001, st + 1.25);
            o.start(st);
            o.stop(st + 1.35);
        }
        var dur = 0.38;
        var noise = audioContext.createBufferSource();
        noise.buffer = _createNoiseBuffer(dur);
        var bp = audioContext.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.setValueAtTime(400, t0);
        bp.frequency.exponentialRampToValueAtTime(1800, t0 + dur);
        bp.Q.value = 0.7;
        var ng = audioContext.createGain();
        ng.gain.setValueAtTime(0, t0);
        ng.gain.linearRampToValueAtTime(0.028 * v, t0 + 0.04);
        ng.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
        noise.connect(bp).connect(ng).connect(audioContext.destination);
        noise.start(t0);
        noise.stop(t0 + dur);
    } catch (e) {}
}

// ===== FACE ID UNLOCK — two soft ascending blips (System sound–like) =====
function playFaceIDUnlockSound() {
    if (!soundEnabled) return;
    try {
        resumeDevosAudio();
        var t0 = audioContext.currentTime;
        var v = masterVolume;
        [784, 1174.66].forEach(function(freq, i) {
            var t = t0 + i * 0.09;
            var o = audioContext.createOscillator();
            o.type = 'sine';
            o.frequency.value = freq;
            var lp = audioContext.createBiquadFilter();
            lp.type = 'lowpass';
            lp.frequency.value = 6000;
            var g = audioContext.createGain();
            g.gain.setValueAtTime(0, t);
            g.gain.linearRampToValueAtTime(0.09 * v, t + 0.02);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
            o.connect(lp).connect(g).connect(audioContext.destination);
            o.start(t);
            o.stop(t + 0.25);
        });
    } catch (e) {}
}

// ===== KEYPRESS — very subtle soft tick =====
function playKeypressSound() {
    if (!soundEnabled) return;
    try {
        var osc = audioContext.createOscillator();
        var gain = audioContext.createGain();
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.frequency.value = 1800 + Math.random() * 400;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.02 * masterVolume, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.04);
        osc.start(audioContext.currentTime);
        osc.stop(audioContext.currentTime + 0.04);
    } catch (e) {}
}

// ===== NOTIFICATION — macOS tri-tone (like iMessage) =====
function playNotificationSound() {
    if (!soundEnabled) return;
    try {
        resumeDevosAudio();
        const now = audioContext.currentTime;
        const vol = masterVolume;
        const tones = [880, 1108.73, 1318.51]; // A5, C#6, E6 — ascending major triad

        tones.forEach((freq, i) => {
            const t = now + i * 0.1;
            const osc = audioContext.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = freq;
            const g = audioContext.createGain();
            g.gain.setValueAtTime(0, t);
            g.gain.linearRampToValueAtTime(0.095 * vol, t + 0.02);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
            const lp = audioContext.createBiquadFilter();
            lp.type = 'lowpass';
            lp.frequency.value = 5000;
            osc.connect(lp).connect(g).connect(audioContext.destination);
            osc.start(t);
            osc.stop(t + 0.2);
        });
    } catch (e) { /* silently fail */ }
}

// ===== TRASH — paper crumple (filtered noise burst) =====
function playTrashSound() {
    if (!soundEnabled) return;
    try {
        const now = audioContext.currentTime;
        const vol = masterVolume;
        const dur = 0.25;

        const noise = audioContext.createBufferSource();
        noise.buffer = _createNoiseBuffer(dur);

        const bp = audioContext.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.setValueAtTime(2000, now);
        bp.frequency.linearRampToValueAtTime(800, now + dur);
        bp.Q.value = 0.8;

        const hp = audioContext.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 300;

        const g = audioContext.createGain();
        g.gain.setValueAtTime(0.14 * vol, now);
        g.gain.setValueAtTime(0.10 * vol, now + 0.04);
        g.gain.linearRampToValueAtTime(0.15 * vol, now + 0.06);
        g.gain.exponentialRampToValueAtTime(0.001, now + dur);

        noise.connect(bp).connect(hp).connect(g).connect(audioContext.destination);
        noise.start(now);
        noise.stop(now + dur);
    } catch (e) { /* silently fail */ }
}

// ===== ERROR — macOS "bonk" (low thud) =====
function playErrorSound() {
    if (!soundEnabled) return;
    try {
        const now = audioContext.currentTime;
        const vol = masterVolume;

        // Low thud oscillator
        const osc = audioContext.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.15);
        const g = audioContext.createGain();
        g.gain.setValueAtTime(0.18 * vol, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        const lp = audioContext.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 400;
        osc.connect(lp).connect(g).connect(audioContext.destination);
        osc.start(now);
        osc.stop(now + 0.25);

        // Percussive noise layer
        const noise = audioContext.createBufferSource();
        noise.buffer = _createNoiseBuffer(0.06);
        const nBP = audioContext.createBiquadFilter();
        nBP.type = 'bandpass';
        nBP.frequency.value = 300;
        nBP.Q.value = 2;
        const nG = audioContext.createGain();
        nG.gain.setValueAtTime(0.08 * vol, now);
        nG.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        noise.connect(nBP).connect(nG).connect(audioContext.destination);
        noise.start(now);
        noise.stop(now + 0.06);
    } catch (e) { /* silently fail */ }
}

// ===== WINDOW OPEN — subtle ascending whoosh =====
function playWindowOpenSound() {
    if (!soundEnabled) return;
    try {
        const now = audioContext.currentTime;
        const vol = masterVolume;
        const dur = 0.15;

        const osc = audioContext.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + dur);
        const g = audioContext.createGain();
        g.gain.setValueAtTime(0.05 * vol, now);
        g.gain.linearRampToValueAtTime(0.07 * vol, now + dur * 0.4);
        g.gain.exponentialRampToValueAtTime(0.001, now + dur);
        const lp = audioContext.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 3000;
        osc.connect(lp).connect(g).connect(audioContext.destination);
        osc.start(now);
        osc.stop(now + dur);

        // Breathy noise layer
        const noise = audioContext.createBufferSource();
        noise.buffer = _createNoiseBuffer(dur);
        const nBP = audioContext.createBiquadFilter();
        nBP.type = 'bandpass';
        nBP.frequency.setValueAtTime(1000, now);
        nBP.frequency.exponentialRampToValueAtTime(3000, now + dur);
        nBP.Q.value = 0.5;
        const nG = audioContext.createGain();
        nG.gain.setValueAtTime(0.03 * vol, now);
        nG.gain.exponentialRampToValueAtTime(0.001, now + dur);
        noise.connect(nBP).connect(nG).connect(audioContext.destination);
        noise.start(now);
        noise.stop(now + dur);
    } catch (e) { /* silently fail */ }
}

// ===== WINDOW CLOSE — subtle descending whoosh =====
function playWindowCloseSound() {
    if (!soundEnabled) return;
    try {
        const now = audioContext.currentTime;
        const vol = masterVolume;
        const dur = 0.14;

        const osc = audioContext.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + dur);
        const g = audioContext.createGain();
        g.gain.setValueAtTime(0.06 * vol, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + dur);
        const lp = audioContext.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 3000;
        osc.connect(lp).connect(g).connect(audioContext.destination);
        osc.start(now);
        osc.stop(now + dur);

        const noise = audioContext.createBufferSource();
        noise.buffer = _createNoiseBuffer(dur);
        const nBP = audioContext.createBiquadFilter();
        nBP.type = 'bandpass';
        nBP.frequency.setValueAtTime(3000, now);
        nBP.frequency.exponentialRampToValueAtTime(800, now + dur);
        nBP.Q.value = 0.5;
        const nG = audioContext.createGain();
        nG.gain.setValueAtTime(0.03 * vol, now);
        nG.gain.exponentialRampToValueAtTime(0.001, now + dur);
        noise.connect(nBP).connect(nG).connect(audioContext.destination);
        noise.start(now);
        noise.stop(now + dur);
    } catch (e) { /* silently fail */ }
}

// ===== DOCK BOUNCE — rubbery bounce (quick pitch bend up-down) =====
function playDockBounceSound() {
    if (!soundEnabled) return;
    try {
        const now = audioContext.currentTime;
        const vol = masterVolume;

        const osc = audioContext.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.linearRampToValueAtTime(600, now + 0.04);
        osc.frequency.exponentialRampToValueAtTime(250, now + 0.12);
        const g = audioContext.createGain();
        g.gain.setValueAtTime(0.10 * vol, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        const lp = audioContext.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 1500;
        lp.Q.value = 2;
        osc.connect(lp).connect(g).connect(audioContext.destination);
        osc.start(now);
        osc.stop(now + 0.15);
    } catch (e) { /* silently fail */ }
}

// ===== SLEEP — gentle descending tone that fades =====
function playSleepSound() {
    if (!soundEnabled) return;
    try {
        const now = audioContext.currentTime;
        const vol = masterVolume;
        const dur = 1.5;

        const osc1 = audioContext.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(440, now);
        osc1.frequency.exponentialRampToValueAtTime(220, now + dur);
        const g1 = audioContext.createGain();
        g1.gain.setValueAtTime(0.12 * vol, now);
        g1.gain.exponentialRampToValueAtTime(0.001, now + dur);

        const osc2 = audioContext.createOscillator();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(660, now);
        osc2.frequency.exponentialRampToValueAtTime(330, now + dur);
        const g2 = audioContext.createGain();
        g2.gain.setValueAtTime(0.06 * vol, now);
        g2.gain.exponentialRampToValueAtTime(0.001, now + dur);

        const lp = audioContext.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(2000, now);
        lp.frequency.exponentialRampToValueAtTime(300, now + dur);

        osc1.connect(lp);
        osc2.connect(lp);
        const merge = audioContext.createGain();
        merge.gain.value = 1;
        g1.connect(merge);
        g2.connect(merge);
        lp.connect(g1);
        // Reconnect properly
        osc1.disconnect();
        osc2.disconnect();
        osc1.connect(g1).connect(audioContext.destination);
        osc2.connect(g2).connect(audioContext.destination);

        osc1.start(now);
        osc1.stop(now + dur);
        osc2.start(now);
        osc2.stop(now + dur);
    } catch (e) { /* silently fail */ }
}

// ===== WAKE — gentle ascending tone =====
function playWakeSound() {
    if (!soundEnabled) return;
    try {
        const now = audioContext.currentTime;
        const vol = masterVolume;
        const dur = 0.8;

        const osc1 = audioContext.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(220, now);
        osc1.frequency.exponentialRampToValueAtTime(440, now + dur);
        const g1 = audioContext.createGain();
        g1.gain.setValueAtTime(0, now);
        g1.gain.linearRampToValueAtTime(0.12 * vol, now + dur * 0.4);
        g1.gain.exponentialRampToValueAtTime(0.001, now + dur);

        const osc2 = audioContext.createOscillator();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(330, now);
        osc2.frequency.exponentialRampToValueAtTime(660, now + dur);
        const g2 = audioContext.createGain();
        g2.gain.setValueAtTime(0, now);
        g2.gain.linearRampToValueAtTime(0.06 * vol, now + dur * 0.4);
        g2.gain.exponentialRampToValueAtTime(0.001, now + dur);

        osc1.connect(g1).connect(audioContext.destination);
        osc2.connect(g2).connect(audioContext.destination);
        osc1.start(now);
        osc1.stop(now + dur);
        osc2.start(now);
        osc2.stop(now + dur);
    } catch (e) { /* silently fail */ }
}

// ===== GAME WIN — triumphant ascending arpeggio =====
function playGameWinSound() {
    if (!soundEnabled) return;
    try {
        const now = audioContext.currentTime;
        const vol = masterVolume;
        // C major arpeggio: C5 → E5 → G5 → C6
        const freqs = [523.25, 659.25, 783.99, 1046.50];

        freqs.forEach((freq, i) => {
            const t = now + i * 0.12;
            const osc = audioContext.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = freq;
            const g = audioContext.createGain();
            g.gain.setValueAtTime(0, t);
            g.gain.linearRampToValueAtTime(0.14 * vol, t + 0.03);
            g.gain.setValueAtTime(0.12 * vol, t + 0.1);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
            osc.connect(g).connect(audioContext.destination);
            osc.start(t);
            osc.stop(t + 0.5);

            // Shimmer overtone
            const tri = audioContext.createOscillator();
            tri.type = 'triangle';
            tri.frequency.value = freq * 2;
            const tg = audioContext.createGain();
            tg.gain.setValueAtTime(0, t);
            tg.gain.linearRampToValueAtTime(0.04 * vol, t + 0.03);
            tg.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
            tri.connect(tg).connect(audioContext.destination);
            tri.start(t);
            tri.stop(t + 0.35);
        });
    } catch (e) { /* silently fail */ }
}

// ===== GAME LOSE — descending sad trombone =====
function playGameLoseSound() {
    if (!soundEnabled) return;
    try {
        const now = audioContext.currentTime;
        const vol = masterVolume;
        // Bb4 → A4 → Ab4 → G4 (sad chromatic descent)
        const freqs = [466.16, 440.00, 415.30, 392.00];

        freqs.forEach((freq, i) => {
            const t = now + i * 0.25;
            const dur = i === 3 ? 0.8 : 0.22;

            const osc = audioContext.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.value = freq;
            const lp = audioContext.createBiquadFilter();
            lp.type = 'lowpass';
            lp.frequency.value = 1200;
            lp.Q.value = 1;
            const g = audioContext.createGain();
            g.gain.setValueAtTime(0, t);
            g.gain.linearRampToValueAtTime(0.10 * vol, t + 0.02);
            g.gain.exponentialRampToValueAtTime(0.001, t + dur);
            osc.connect(lp).connect(g).connect(audioContext.destination);
            osc.start(t);
            osc.stop(t + dur);
        });
    } catch (e) { /* silently fail */ }
}

// ===== GAME CLICK — subtle pop for interactions =====
function playGameClickSound() {
    if (!soundEnabled) return;
    try {
        const now = audioContext.currentTime;
        const vol = masterVolume;

        const osc = audioContext.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1600, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.04);
        const g = audioContext.createGain();
        g.gain.setValueAtTime(0.09 * vol, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        osc.connect(g).connect(audioContext.destination);
        osc.start(now);
        osc.stop(now + 0.06);

        // Tiny pop noise transient
        const noise = audioContext.createBufferSource();
        noise.buffer = _createNoiseBuffer(0.008);
        const bp = audioContext.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 5000;
        bp.Q.value = 2;
        const ng = audioContext.createGain();
        ng.gain.setValueAtTime(0.05 * vol, now);
        ng.gain.exponentialRampToValueAtTime(0.001, now + 0.008);
        noise.connect(bp).connect(ng).connect(audioContext.destination);
        noise.start(now);
        noise.stop(now + 0.008);
    } catch (e) { /* silently fail */ }
}
