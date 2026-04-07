// ===== DEVOS STARTUP & SYSTEM — Modals, Power, Sleep, Notifications, Login, Boot =====

// ===== MAC-STYLE MODAL SYSTEM =====
function showMacModal(title, message, icon = 'ℹ️') {
    const overlay = document.getElementById('mac-modal-overlay');
    const titleEl = document.getElementById('mac-modal-title');
    const messageEl = document.getElementById('mac-modal-message');
    const iconEl = document.getElementById('mac-modal-icon');

    titleEl.textContent = title;
    messageEl.textContent = message;
    iconEl.textContent = icon;
    overlay.classList.add('welcome-active');
    overlay.style.display = 'flex';
    playClickSound();
}

function closeMacModal() {
    const overlay = document.getElementById('mac-modal-overlay');
    overlay.style.transition = 'opacity 0.2s ease';
    overlay.style.opacity = '0';
    setTimeout(() => {
        overlay.style.display = 'none';
        overlay.style.opacity = '';
        overlay.style.transition = '';
        overlay.classList.remove('welcome-active');
    }, 200);
    playClickSound();
}

// ===== SHUTDOWN =====
function performShutdown() {
    playClickSound();
    const shutdownEl = document.getElementById('shutdown-screen');
    if (!shutdownEl) return;

    document.querySelectorAll('.window').forEach(w => {
        w.style.transition = 'opacity 0.5s ease';
        w.style.opacity = '0';
    });

    setTimeout(() => {
        document.querySelectorAll('.window').forEach(w => w.style.display = 'none');
        const dock = document.querySelector('.dock');
        if (dock) {
            dock.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            dock.style.opacity = '0';
            dock.style.transform = 'translateX(-50%) translateY(20px)';
        }
        const menuBar = document.getElementById('menu-bar');
        if (menuBar) {
            menuBar.style.transition = 'opacity 0.5s ease';
            menuBar.style.opacity = '0';
            menuBar.style.display = 'none';
        }
        const desktop = document.getElementById('desktop');
        if (desktop) desktop.style.display = 'none';
        const expClock = document.getElementById('experience-clock');
        if (expClock) expClock.style.display = 'none';
        document.body.classList.remove('logged-in');
    }, 300);

    const showGoodbyeScreen = () => {
        shutdownEl.style.display = 'flex';
        shutdownEl.style.opacity = '1';
        const inner = shutdownEl.querySelector('.shutdown-content');
        if (inner) inner.style.display = '';
        try {
            const now = audioContext.currentTime;
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            osc.connect(gain);
            gain.connect(audioContext.destination);
            osc.frequency.value = 600;
            osc.type = 'sine';
            gain.gain.setValueAtTime(0.12 * masterVolume, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
            osc.start(now);
            osc.stop(now + 0.3);
        } catch (e) {}
    };

    const afterMacbookShutdown = () => {
        const inner = shutdownEl.querySelector('.shutdown-content');
        const startup = document.getElementById('startup-screen');
        function showBlackPowerOff() {
            shutdownEl.style.display = 'flex';
            shutdownEl.style.background = '#000';
            shutdownEl.style.opacity = '1';
            if (inner) inner.style.display = 'none';
        }
        if (startup && startup.style.display !== 'none') {
            startup.style.transition = 'opacity 1.05s ease';
            startup.style.opacity = '0';
            setTimeout(function() {
                startup.style.display = 'none';
                startup.style.opacity = '1';
                startup.style.transition = '';
                showBlackPowerOff();
            }, 1050);
        } else {
            showBlackPowerOff();
        }
        try {
            const now = audioContext.currentTime;
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            osc.connect(gain);
            gain.connect(audioContext.destination);
            osc.frequency.value = 480;
            osc.type = 'sine';
            gain.gain.setValueAtTime(0.08 * masterVolume, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
            osc.start(now);
            osc.stop(now + 0.25);
        } catch (e2) {}
    };

    setTimeout(() => {
        if (typeof window._macbookShutdownSequence === 'function') {
            window._macbookShutdownSequence(afterMacbookShutdown);
        } else {
            showGoodbyeScreen();
        }
    }, 320);
}

function beautifulShutdown() {
    performShutdown();
}

// ===== RESTART =====
function performRestart() {
    playClickSound();
    document.querySelectorAll('.window').forEach(w => {
        w.style.transition = 'opacity 0.5s ease';
        w.style.opacity = '0';
    });
    setTimeout(() => {
        document.querySelectorAll('.window').forEach(w => w.style.display = 'none');
        const dock = document.querySelector('.dock');
        if (dock) {
            dock.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            dock.style.opacity = '0';
            dock.style.transform = 'translateX(-50%) translateY(20px)';
        }
        const menuBar = document.getElementById('menu-bar');
        if (menuBar) {
            menuBar.style.transition = 'opacity 0.5s ease';
            menuBar.style.opacity = '0';
            menuBar.style.display = 'none';
        }
        const desktop = document.getElementById('desktop');
        if (desktop) desktop.style.display = 'none';
        const expClock = document.getElementById('experience-clock');
        if (expClock) expClock.style.display = 'none';
        document.body.classList.remove('logged-in');
    }, 300);

    setTimeout(() => {
        if (typeof window._macbookShutdownSequence === 'function') {
            window._macbookShutdownSequence(() => {
                location.reload();
            });
        } else {
            location.reload();
        }
    }, 320);
}

// ===== LOG OUT =====
function performLogout() {
    playClickSound();
    document.querySelectorAll('.window').forEach(w => {
        w.style.transition = 'opacity 0.3s ease';
        w.style.opacity = '0';
        setTimeout(() => { w.style.display = 'none'; }, 300);
    });

    setTimeout(() => {
        const dock = document.querySelector('.dock');
        const menuBar = document.getElementById('menu-bar');
        const expClock = document.getElementById('experience-clock');

        if (dock) {
            dock.style.display = 'none';
            dock.style.opacity = '1';
            dock.style.transform = 'translateX(-50%)';
        }
        if (menuBar) menuBar.style.display = 'none';
        if (expClock) expClock.style.display = 'none';
        document.body.classList.remove('logged-in');

        if (window._macbook3dActive && typeof window._macbookLogoutSequence === 'function' && window._macbookLogoutSequence()) {
            return;
        }

        const loginScreen = document.getElementById('login-screen');
        if (!loginScreen) return;
        loginScreen.style.display = 'flex';
        loginScreen.style.opacity = '0';
        loginScreen.style.transition = 'opacity 0.8s ease';
        setTimeout(() => { loginScreen.style.opacity = '1'; }, 50);
    }, 500);
}

// ===== SLEEP — V2: Glowing Apple logo + rotating DevOps sleep quotes =====
const sleepQuotes = [
    "Counting pods instead of sheep...",
    "kubectl get sleep --namespace=dreams",
    "Terraform destroying consciousness...",
    "docker pause brain",
    "git stash thoughts",
    "helm uninstall reality",
    "ArgoCD syncing to dreamland...",
    "Scaling replicas of ZZZ to 100..."
];

function performSleep() {
    playSleepSound();

    const sleepOverlay = document.createElement('div');
    sleepOverlay.id = 'sleep-overlay';
    sleepOverlay.classList.add('sleep-overlay');
    sleepOverlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:#000;opacity:0;z-index:999998;cursor:pointer;transition:opacity 1s ease;display:flex;flex-direction:column;align-items:center;justify-content:center;';

    // Glowing Apple logo
    const appleLogo = document.createElement('div');
    appleLogo.classList.add('sleep-apple-logo');
    appleLogo.innerHTML = `<svg width="80" height="80" viewBox="0 0 24 24" fill="currentColor" style="filter:drop-shadow(0 0 20px rgba(255,255,255,0.5)) drop-shadow(0 0 60px rgba(255,255,255,0.2));">
        <path d="M18.71,19.5C17.88,20.74 17,21.95 15.66,21.97C14.32,22 13.89,21.18 12.37,21.18C10.84,21.18 10.37,21.95 9.1,22C7.79,22.05 6.8,20.68 5.96,19.47C4.25,17 2.94,12.45 4.7,9.39C5.57,7.87 7.13,6.91 8.82,6.88C10.1,6.86 11.32,7.75 12.11,7.75C12.89,7.75 14.37,6.68 15.92,6.84C16.57,6.87 18.39,7.1 19.56,8.82C19.47,8.88 17.39,10.1 17.41,12.63C17.44,15.65 20.06,16.66 20.09,16.67C20.06,16.74 19.67,18.11 18.71,19.5M13,3.5C13.73,2.67 14.94,2.04 15.94,2C16.07,3.17 15.6,4.35 14.9,5.19C14.21,6.04 13.07,6.7 11.95,6.61C11.8,5.46 12.36,4.26 13,3.5Z"/>
    </svg>`;
    appleLogo.style.cssText = 'color:rgba(255,255,255,0.6);animation:sleepPulse 3s ease-in-out infinite;margin-bottom:40px;';

    // Sleep quote
    const quoteEl = document.createElement('div');
    quoteEl.style.cssText = 'color:rgba(255,255,255,0.35);font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:16px;font-weight:300;letter-spacing:0.5px;text-align:center;max-width:400px;transition:opacity 0.5s ease;';
    let quoteIndex = Math.floor(Math.random() * sleepQuotes.length);
    quoteEl.textContent = sleepQuotes[quoteIndex];

    sleepOverlay.appendChild(appleLogo);
    sleepOverlay.appendChild(quoteEl);
    document.body.appendChild(sleepOverlay);

    // Inject pulse animation if not present
    if (!document.getElementById('sleep-pulse-style')) {
        const style = document.createElement('style');
        style.id = 'sleep-pulse-style';
        style.textContent = `
            @keyframes sleepPulse {
                0%, 100% { opacity: 0.4; transform: scale(1); filter: drop-shadow(0 0 20px rgba(255,255,255,0.3)); }
                50% { opacity: 0.8; transform: scale(1.05); filter: drop-shadow(0 0 40px rgba(255,255,255,0.6)) drop-shadow(0 0 80px rgba(255,255,255,0.2)); }
            }
        `;
        document.head.appendChild(style);
    }

    requestAnimationFrame(() => { sleepOverlay.style.opacity = '1'; });

    // Rotate quotes every 4 seconds
    const quoteInterval = setInterval(() => {
        quoteEl.style.opacity = '0';
        setTimeout(() => {
            quoteIndex = (quoteIndex + 1) % sleepQuotes.length;
            quoteEl.textContent = sleepQuotes[quoteIndex];
            quoteEl.style.opacity = '1';
        }, 500);
    }, 4000);

    function wake() {
        clearInterval(quoteInterval);
        playWakeSound();
        sleepOverlay.style.opacity = '0';
        setTimeout(() => { sleepOverlay.remove(); }, 1000);
        document.removeEventListener('keydown', wake);
        document.removeEventListener('click', wake);
        document.removeEventListener('mousemove', wakeOnMove);
    }
    let moveCount = 0;
    function wakeOnMove() {
        moveCount++;
        if (moveCount > 3) wake();
    }
    setTimeout(() => {
        document.addEventListener('keydown', wake, { once: true });
        document.addEventListener('click', wake, { once: true });
        document.addEventListener('mousemove', wakeOnMove);
    }, 1500);
}

// ===== NOTIFICATION QUEUE =====
const notificationQueue = [];
let notificationShowing = false;

function showNotification(title, message) {
    notificationQueue.push({ title, message });
    if (!notificationShowing) processNotificationQueue();
}

function processNotificationQueue() {
    if (notificationQueue.length === 0) { notificationShowing = false; return; }
    notificationShowing = true;
    const { title, message } = notificationQueue.shift();
    const notif = document.getElementById('welcome-notification');
    if (!notif) { notificationShowing = false; return; }
    const strong = notif.querySelector('.notification-body strong');
    const p = notif.querySelector('.notification-body p');
    if (strong) strong.textContent = title;
    if (p) p.textContent = message;
    notif.style.display = 'block';
    notif.style.animation = 'none';
    notif.offsetHeight; // force reflow
    notif.style.animation = 'notificationSlide 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
    playNotificationSound();
    setTimeout(() => {
        notif.style.display = 'none';
        setTimeout(processNotificationQueue, 500);
    }, 5000);
}

// ===== LOGIN PARTICLES =====
function createLoginParticles() {
    const loginScreen = document.getElementById('login-screen');
    if (!loginScreen) return;
    const particleContainer = document.createElement('div');
    particleContainer.className = 'login-particles';
    particleContainer.style.cssText = 'position:absolute;top:0;left:0;right:0;bottom:0;overflow:hidden;pointer-events:none;z-index:0;';

    for (let i = 0; i < 30; i++) {
        const p = document.createElement('div');
        const size = Math.random() * 4 + 2;
        const x = Math.random() * 100;
        const duration = Math.random() * 15 + 10;
        const delay = Math.random() * 10;
        p.style.cssText = `
            position: absolute;
            width: ${size}px; height: ${size}px;
            background: rgba(255, 255, 255, ${Math.random() * 0.3 + 0.1});
            border-radius: 50%;
            left: ${x}%;
            bottom: -10px;
            animation: loginFloat ${duration}s ${delay}s linear infinite;
        `;
        particleContainer.appendChild(p);
    }
    loginScreen.insertBefore(particleContainer, loginScreen.firstChild);
}

// ===== STARTUP SEQUENCE =====
function startupSequence() {
    var loginScreen = document.getElementById('login-screen');
    var menuBar = document.getElementById('menu-bar');
    var desktop = document.getElementById('desktop');

    // Hide EVERYTHING — 3D MacBook handles the full boot/login/desktop flow
    if (menuBar) menuBar.style.display = 'none';
    if (desktop) desktop.style.display = 'none';
    var dock = document.querySelector('.dock');
    if (dock) dock.style.display = 'none';
    // Completely remove login screen — 3D MacBook renders login on its screen
    if (loginScreen) loginScreen.style.display = 'none';

    // Mark that 3D MacBook is handling everything
    window._macbook3dActive = true;
}

// ===== LOGIN HANDLER =====
function handleLogin() {
    playClickSound();
    const loginScreen = document.getElementById('login-screen');
    const menuBar = document.getElementById('menu-bar');
    const desktop = document.getElementById('desktop');

    loginScreen.style.transition = 'opacity 0.8s ease';
    loginScreen.style.opacity = '0';

    setTimeout(() => {
        loginScreen.style.display = 'none';
        document.body.classList.add('logged-in');
        menuBar.style.display = 'flex';
        desktop.style.display = 'grid';
        document.querySelector('.dock').style.display = 'flex';

        if (!localStorage.getItem('devos-welcomed')) {
            localStorage.setItem('devos-welcomed', 'true');

            setTimeout(() => {
                const overlay = document.getElementById('mac-modal-overlay');
                const titleEl = document.getElementById('mac-modal-title');
                const messageEl = document.getElementById('mac-modal-message');
                const iconEl = document.getElementById('mac-modal-icon');

                iconEl.innerHTML = `<svg class="welcome-apple-logo" width="80" height="80" viewBox="0 0 24 24" fill="url(#appleWelcome)">
                    <path d="M18.71,19.5C17.88,20.74 17,21.95 15.66,21.97C14.32,22 13.89,21.18 12.37,21.18C10.84,21.18 10.37,21.95 9.1,22C7.79,22.05 6.8,20.68 5.96,19.47C4.25,17 2.94,12.45 4.7,9.39C5.57,7.87 7.13,6.91 8.82,6.88C10.1,6.86 11.32,7.75 12.11,7.75C12.89,7.75 14.37,6.68 15.92,6.84C16.57,6.87 18.39,7.1 19.56,8.82C19.47,8.88 17.39,10.1 17.41,12.63C17.44,15.65 20.06,16.66 20.09,16.67C20.06,16.74 19.67,18.11 18.71,19.5M13,3.5C13.73,2.67 14.94,2.04 15.94,2C16.07,3.17 15.6,4.35 14.9,5.19C14.21,6.04 13.07,6.7 11.95,6.61C11.8,5.46 12.36,4.26 13,3.5Z"/>
                    <defs>
                        <linearGradient id="appleWelcome" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stop-color="#667eea"/>
                            <stop offset="100%" stop-color="#764ba2"/>
                        </linearGradient>
                    </defs>
                </svg>`;
                titleEl.textContent = "Welcome To Virendra's DevOS";
                messageEl.textContent = `Interactive Terminal • Experience Timeline • Real Mac Wallpapers\n\nClick OK to explore!`;
                overlay.classList.add('welcome-active');
                overlay.style.display = 'flex';
            }, 500);

            setTimeout(() => {
                showNotification('Welcome to DevOS!', 'Try ⌘/Ctrl+Space for Spotlight. Hand Magic uses a small corner preview only.');
            }, 3000);
            setTimeout(() => {
                showNotification('Tip', 'Double-click any window title bar to maximize it.');
            }, 10000);
            setTimeout(() => {
                showNotification('Fun', 'Try typing "matrix" or "neofetch" in the Terminal!');
            }, 20000);
        }
    }, 1000);
}

// ===== LOGIN EVENT LISTENERS =====
document.getElementById('login-password')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        handleLogin();
    }
});

document.getElementById('login-password')?.addEventListener('click', () => {
    const input = document.getElementById('login-password');
    if (input && input.value === '') {
        setTimeout(() => handleLogin(), 500);
    }
});

document.getElementById('power-btn')?.addEventListener('click', () => {
    if (confirm('Are you sure you want to restart?')) {
        location.reload();
    }
});

// ===== WINDOW.LOAD — kick off everything =====
window.addEventListener('load', () => {
    startupSequence();
    calculateExperience();
    loadSavedSettings();
});
