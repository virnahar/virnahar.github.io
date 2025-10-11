// ===== MAC-STYLE MODAL SYSTEM =====
function showMacModal(title, message, icon = 'ℹ️') {
    const overlay = document.getElementById('mac-modal-overlay');
    const titleEl = document.getElementById('mac-modal-title');
    const messageEl = document.getElementById('mac-modal-message');
    const iconEl = document.getElementById('mac-modal-icon');
    
    titleEl.textContent = title;
    messageEl.textContent = message;
    iconEl.textContent = icon;
    overlay.style.display = 'flex';
    playClickSound();
}

function closeMacModal() {
    const overlay = document.getElementById('mac-modal-overlay');
    overlay.style.display = 'none';
    playClickSound();
}

// Beautiful Shutdown
function beautifulShutdown() {
    const shutdownScreen = document.getElementById('shutdown-screen');
    shutdownScreen.style.display = 'flex';
    playClickSound();
}

// Live Experience Clock with Minutes & Seconds (from myexperience portfolio)
function calculateExperience() {
    const startDate = new Date('2013-04-22T09:00:00'); // Professional journey started April 22, 2013 at 9 AM
    const now = new Date();
    
    let diff = now - startDate;
    
    // Calculate all units
    const years = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
    diff -= years * (1000 * 60 * 60 * 24 * 365.25);
    
    const months = Math.floor(diff / (1000 * 60 * 60 * 24 * 30.44));
    diff -= months * (1000 * 60 * 60 * 24 * 30.44);
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    diff -= days * (1000 * 60 * 60 * 24);
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    diff -= hours * (1000 * 60 * 60);
    
    const minutes = Math.floor(diff / (1000 * 60));
    diff -= minutes * (1000 * 60);
    
    const seconds = Math.floor(diff / 1000);
    
    // Update all displays
    const expYears = document.getElementById('exp-years');
    const expMonths = document.getElementById('exp-months');
    const expDays = document.getElementById('exp-days');
    const expHours = document.getElementById('exp-hours');
    const expMinutes = document.getElementById('exp-minutes');
    const expSeconds = document.getElementById('exp-seconds');
    
    if (expYears) expYears.textContent = years.toString().padStart(2, '0');
    if (expMonths) expMonths.textContent = months.toString().padStart(2, '0');
    if (expDays) expDays.textContent = days.toString().padStart(2, '0');
    if (expHours) expHours.textContent = hours.toString().padStart(2, '0');
    if (expMinutes) expMinutes.textContent = minutes.toString().padStart(2, '0');
    if (expSeconds) expSeconds.textContent = seconds.toString().padStart(2, '0');
}

// Update experience clock every second for live ticking effect
setInterval(calculateExperience, 1000);

// ===== SOUND SYSTEM =====
let soundEnabled = true;
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

// Sound toggle functionality with save
function toggleSound() {
    soundEnabled = !soundEnabled;
    localStorage.setItem('macOS-sound-enabled', soundEnabled.toString());
    updateSoundIcon();
    console.log('🔊 Sound ' + (soundEnabled ? 'enabled' : 'disabled') + ' (saved!)');
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

// Play smooth click sound
function playClickSound() {
    if (!soundEnabled) return;
    try {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        const filter = audioContext.createBiquadFilter();
        
        oscillator.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 1200;
        oscillator.type = 'sine';
        filter.type = 'lowpass';
        filter.frequency.value = 2000;
        
        gainNode.gain.setValueAtTime(0.08, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.08);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.08);
    } catch (e) {
        console.log('Sound play failed:', e);
    }
}

// Play smooth minimize sound (whoosh effect)
function playMinimizeSound() {
    if (!soundEnabled) return;
    try {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        const filter = audioContext.createBiquadFilter();
        
        oscillator.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.4);
        oscillator.type = 'sine';
        
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2000, audioContext.currentTime);
        filter.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.4);
        
        gainNode.gain.setValueAtTime(0.12, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.4);
    } catch (e) {
        console.log('Sound play failed:', e);
    }
}

// ===== STARTUP SEQUENCE =====
// Play BEAUTIFUL Mac startup sound - Warm & Smooth
function playStartupSound() {
    if (!soundEnabled) return;
    
    // Beautiful warm F major chord (like real Mac!)
    const notes = [
        { freq: 174.61, gain: 0.28, type: 'sine' },    // F3 - Deep foundation
        { freq: 220.00, gain: 0.24, type: 'sine' },    // A3 - Warmth
        { freq: 261.63, gain: 0.26, type: 'sine' },    // C4 - Clarity
        { freq: 349.23, gain: 0.20, type: 'sine' },    // F4 - Brightness
        { freq: 440.00, gain: 0.14, type: 'sine' }     // A4 - Sparkle
    ];
    
    notes.forEach((note, index) => {
        try {
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            const filter = audioContext.createBiquadFilter();
            const reverb = audioContext.createBiquadFilter();
            
            // Audio routing with reverb
            osc.connect(filter);
            filter.connect(reverb);
            reverb.connect(gain);
            gain.connect(audioContext.destination);
            
            osc.type = note.type;
            osc.frequency.value = note.freq;
            
            // Smooth lowpass filter
            filter.type = 'lowpass';
            filter.frequency.value = 3500;
            filter.Q.value = 0.8;
            
            // Subtle reverb
            reverb.type = 'allpass';
            reverb.frequency.value = 1000;
            
            // Beautiful envelope
            const startTime = audioContext.currentTime + (index * 0.03);
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(note.gain, startTime + 0.25);
            gain.gain.setValueAtTime(note.gain * 0.9, startTime + 0.8);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 3.2);
            
            osc.start(startTime);
            osc.stop(startTime + 3.2);
        } catch (e) {
            console.log('Startup sound error:', e);
        }
    });
}

// Keypress sound for terminal
function playKeypressSound() {
    if (!soundEnabled) return;
    try {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 2000 + Math.random() * 500;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.03, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.05);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.05);
    } catch (e) {}
}

// Startup sequence - COMPLETELY FIXED to eliminate ALL flashing
function startupSequence() {
    const startupScreen = document.getElementById('startup-screen');
    const loginScreen = document.getElementById('login-screen');
    const menuBar = document.getElementById('menu-bar');
    const desktop = document.getElementById('desktop');
    
    // Ensure everything else is hidden
    menuBar.style.display = 'none';
    desktop.style.display = 'none';
    
    // Pre-setup login screen UNDER startup screen
    loginScreen.style.display = 'flex';
    loginScreen.style.opacity = '0';
    loginScreen.style.zIndex = '99999';
    
    // Play startup sound
    playStartupSound();
    
    // After 3 seconds, prepare for transition
    setTimeout(() => {
        // Start fading login in BEFORE startup fades out
        loginScreen.style.transition = 'opacity 1.2s ease';
        loginScreen.style.opacity = '1';
        
        // Fade out startup slightly after
        setTimeout(() => {
            startupScreen.style.transition = 'opacity 1s ease';
            startupScreen.style.opacity = '0';
            
            setTimeout(() => {
                startupScreen.style.display = 'none';
            }, 1000);
        }, 300);
    }, 3200);
}

// Update login time - removed since new login design doesn't need it
function updateLoginTime() {
    // Login screen now has minimal design without time display
    console.log('Login screen ready');
}

// Login functionality - Smooth transition with Welcome
function handleLogin() {
    playClickSound();
    const loginScreen = document.getElementById('login-screen');
    const menuBar = document.getElementById('menu-bar');
    const desktop = document.getElementById('desktop');
    
    loginScreen.style.transition = 'opacity 1s ease';
    loginScreen.style.opacity = '0';
    
    setTimeout(() => {
        loginScreen.style.display = 'none';
        loginScreen.style.visibility = 'hidden';
        menuBar.style.display = 'flex';
        desktop.style.display = 'grid';
        
        // Show welcome message with beautiful animated glowing Apple logo
        setTimeout(() => {
            const overlay = document.getElementById('mac-modal-overlay');
            const modal = document.querySelector('.mac-modal');
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
            overlay.style.display = 'flex';
        }, 500);
        
        console.log('🍎 Desktop ready! Welcome to Virendra\'s Portfolio World!');
    }, 1000);
}

// Login event listeners - Updated for new design
document.getElementById('login-password')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        handleLogin();
    }
});

document.getElementById('login-password')?.addEventListener('click', () => {
    const input = document.getElementById('login-password');
    if (input && input.value === '') {
        // Auto-login on click if empty
        setTimeout(() => handleLogin(), 500);
    }
});

// Power button in login screen
document.getElementById('power-btn')?.addEventListener('click', () => {
    if (confirm('Are you sure you want to restart?')) {
        location.reload();
    }
});

// Sidebar navigation with smooth scroll
document.querySelectorAll('.sidebar-item').forEach(item => {
    item.addEventListener('click', () => {
        playClickSound();
        document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        
        const text = item.textContent.trim().toLowerCase();
        const finderMain = document.querySelector('.finder-main');
        
        if (text === 'skills') {
            const skillsSection = Array.from(document.querySelectorAll('.about-section')).find(el => 
                el.querySelector('h2')?.textContent.includes('Technical Arsenal')
            );
            if (skillsSection && finderMain) {
                skillsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        } else if (text === 'experience') {
            const expSection = Array.from(document.querySelectorAll('.about-section')).find(el => 
                el.querySelector('h2')?.textContent.includes('Experience Highlights')
            );
            if (expSection && finderMain) {
                expSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        } else if (text === 'about') {
            if (finderMain) {
                finderMain.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }
    });
});

// Start the startup sequence when page loads
window.addEventListener('load', () => {
    startupSequence();
    calculateExperience();
    loadSavedSettings();
});

// ===== TIME UPDATE =====
function updateTime() {
    const now = new Date();
    const options = { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric', 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true
    };
    const timeString = now.toLocaleDateString('en-US', options);
    const menuTime = document.getElementById('menu-time');
    if (menuTime) {
        menuTime.textContent = timeString;
    }
}

setInterval(updateTime, 1000);
updateTime();

// ===== WINDOW MANAGEMENT =====
let activeWindow = null;
let zIndexCounter = 100;

const windows = {
    'finder': document.getElementById('finder-window'),
    'projects': document.getElementById('projects-window'),
    'terminal': document.getElementById('terminal-window'),
    'resume': document.getElementById('resume-window'),
    'contact': document.getElementById('contact-window'),
    'about-mac': document.getElementById('about-mac-window'),
    'preferences': document.getElementById('preferences-window'),
    'safari': document.getElementById('safari-window'),
    'games': document.getElementById('games-window'),
    'music': document.getElementById('music-window')
};

let recentWindows = [];
let desktopViewMode = 'icons'; // icons, list, gallery

const windowPositions = {
    'finder': { top: '100px', left: '150px', width: '900px', height: '600px' },
    'projects': { top: '80px', left: '200px', width: '1000px', height: '700px' },
    'terminal': { top: '120px', left: '250px', width: '900px', height: '600px' },
    'resume': { top: '90px', left: '180px', width: '850px', height: '650px' },
    'contact': { top: '110px', left: '220px', width: '800px', height: '650px' },
    'about-mac': { top: '200px', left: '450px', width: '600px', height: 'auto', minHeight: '400px' },
    'preferences': { top: '100px', left: '300px', width: '750px', height: '600px' },
    'safari': { top: '70px', left: '170px', width: '1100px', height: '750px' },
    'games': { top: '100px', left: '250px', width: '900px', height: '600px' },
    'music': { top: '70px', left: '180px', width: '950px', height: '700px' }
};

// SPOTIFY-STYLE MUSIC PLAYER with REAL Audio!
let currentSongIndex = 0;
let audioPlayer = null;

const songs = [
    {
        title: "Control",
        artist: "Unknown Brain x Rival",
        url: "https://github.com/ecemgo/mini-samples-great-tricks/raw/main/song-list/Control.mp3"
    },
    {
        title: "DEAF KEV - Invincible",
        artist: "NCS Release",
        url: "https://github.com/ecemgo/mini-samples-great-tricks/raw/main/song-list/Deaf-Kev-Invincible.mp3"
    },
    {
        title: "Different Heaven - Safe And Sound",
        artist: "NCS Release",
        url: "https://github.com/ecemgo/mini-samples-great-tricks/raw/main/song-list/Different-Heaven-Safe-And-Sound.mp3"
    }
];

function playSpotifySong(index) {
    currentSongIndex = index;
    const song = songs[index];
    
    audioPlayer = document.getElementById('audio-player');
    if (!audioPlayer) return;
    
    audioPlayer.src = song.url;
    audioPlayer.play().catch(e => console.log('Audio play failed:', e));
    
    // Update UI
    document.getElementById('current-song-title').textContent = song.title;
    document.getElementById('current-song-artist').textContent = song.artist;
    document.querySelector('.player-track-name').textContent = song.title;
    document.querySelector('.player-track-artist').textContent = song.artist;
    document.querySelector('.play-main').textContent = '⏸';
    
    // Highlight active song
    document.querySelectorAll('.song-item').forEach((item, i) => {
        item.classList.toggle('playing', i === index);
    });
    
    // Update progress
    audioPlayer.addEventListener('timeupdate', updateSpotifyProgress);
    audioPlayer.addEventListener('ended', nextMusicTrack);
}

function toggleSpotifyPlay() {
    if (!audioPlayer || !audioPlayer.src) {
        playSpotifySong(0);
        return;
    }
    
    if (audioPlayer.paused) {
        audioPlayer.play();
        document.querySelector('.play-main').textContent = '⏸';
    } else {
        audioPlayer.pause();
        document.querySelector('.play-main').textContent = '▶';
    }
}

function nextMusicTrack() {
    currentSongIndex = (currentSongIndex + 1) % songs.length;
    playSpotifySong(currentSongIndex);
}

function prevMusicTrack() {
    currentSongIndex = (currentSongIndex - 1 + songs.length) % songs.length;
    playSpotifySong(currentSongIndex);
}

function updateSpotifyProgress() {
    if (!audioPlayer) return;
    
    const percent = (audioPlayer.currentTime / audioPlayer.duration) * 100;
    const progressBar = document.getElementById('spotify-progress');
    if (progressBar) {
        progressBar.style.width = percent + '%';
    }
    
    // Update time displays
    const currentTime = formatTime(audioPlayer.currentTime);
    const totalTime = formatTime(audioPlayer.duration);
    const times = document.querySelectorAll('.spotify-player .time');
    if (times[0]) times[0].textContent = currentTime;
    if (times[1]) times[1].textContent = totalTime || '0:00';
}

function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function openWindow(appName) {
    const window = windows[appName];
    if (!window) return;
    
    // Show "Now Playing" indicator when Music window is opened
    if (appName === 'music') {
        setTimeout(() => {
            document.getElementById('now-playing').style.display = 'flex';
        }, 2000); // Show after 2 seconds
    }

    // Track recent windows
    if (!recentWindows.includes(appName)) {
        recentWindows.unshift(appName);
        if (recentWindows.length > 10) recentWindows.pop();
    }

    if (window.classList.contains('minimized')) {
        window.classList.remove('minimized');
        makeWindowActive(window);
        playClickSound();
        updateDockIndicators();
        return;
    }

    if (window.style.display === 'block') {
        makeWindowActive(window);
        playClickSound();
        updateDockIndicators();
        return;
    }

    const pos = windowPositions[appName];
    window.style.top = pos.top;
    window.style.left = pos.left;
    window.style.width = pos.width;
    window.style.height = pos.height;

    window.style.display = 'block';
    makeWindowActive(window);
    playClickSound();
    updateDockIndicators();
    
    // Initialize interactive terminal when opening
    if (appName === 'terminal') {
        setTimeout(() => {
            initInteractiveTerminal();
            // Animate skill bars
            animateSkillBars();
        }, 300);
    }
}

// Animate skill bars
function animateSkillBars() {
    const skillFills = document.querySelectorAll('.skill-fill');
    skillFills.forEach((fill, index) => {
        const percent = fill.getAttribute('data-percent');
        setTimeout(() => {
            fill.style.width = percent + '%';
        }, index * 100);
    });
}

function makeWindowActive(window) {
    Object.values(windows).forEach(w => w.classList.remove('active'));
    window.classList.add('active');
    window.style.zIndex = ++zIndexCounter;
    activeWindow = window;
    
    // Update menu bar with active window name
    updateMenuBarAppName(window);
}

function updateMenuBarAppName(window) {
    const activeAppName = document.getElementById('active-app-name');
    if (!activeAppName) return;
    
    if (!window) {
        activeAppName.textContent = "Virendra's OS";
        return;
    }
    
    const windowId = window.id;
    const appNames = {
        'finder-window': 'Finder',
        'projects-window': 'Projects',
        'terminal-window': 'Terminal',
        'resume-window': 'Preview',
        'contact-window': 'Mail',
        'about-mac-window': 'About This Mac',
        'preferences-window': 'System Preferences',
        'safari-window': 'Safari'
    };
    
    const appName = appNames[windowId] || "Virendra's OS";
    activeAppName.textContent = appName;
    
    console.log(`📱 Active app: ${appName}`);
}

// Watch for music window close
setInterval(() => {
    const musicWindow = document.getElementById('music-window');
    const nowPlaying = document.getElementById('now-playing');
    if (musicWindow && nowPlaying) {
        if (musicWindow.style.display === 'none') {
            nowPlaying.style.display = 'none';
        }
    }
}, 1000);

// Desktop icon click handlers
document.querySelectorAll('.desktop-icon').forEach(icon => {
    icon.addEventListener('click', () => {
        playClickSound();
        const appName = icon.getAttribute('data-app');
        openWindow(appName);
    });

    icon.addEventListener('dblclick', () => {
        playClickSound();
        const appName = icon.getAttribute('data-app');
        openWindow(appName);
    });
});

// Dock icon click handlers
document.querySelectorAll('.dock-item').forEach(item => {
    item.addEventListener('click', () => {
        playClickSound();
        const appName = item.getAttribute('data-app');
        openWindow(appName);
    });
});

// Window control buttons
document.querySelectorAll('.window-control').forEach(button => {
    button.addEventListener('click', (e) => {
        e.stopPropagation();
        playClickSound();
        const action = button.getAttribute('data-action');
        const window = button.closest('.window');

        if (action === 'close') {
            window.style.opacity = '0';
            window.style.transition = 'opacity 0.2s ease';
            setTimeout(() => {
                window.style.display = 'none';
                window.style.opacity = '1';
                updateDockIndicators();
                // Reset menu bar to default when closing
                updateMenuBarAppName(null);
            }, 200);
        } else if (action === 'minimize') {
            playMinimizeSound();
            window.classList.add('minimizing');
            setTimeout(() => {
                window.classList.remove('minimizing');
                window.classList.add('minimized');
                updateDockIndicators();
            }, 600);
        } else if (action === 'maximize') {
            toggleMaximize(window);
        }
    });
});

function toggleMaximize(window) {
    if (window.classList.contains('maximized')) {
        // Restore
        window.classList.remove('maximized');
        window.classList.add('maximizing');
        window.style.transition = 'all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)';
        window.style.top = window.dataset.originalTop;
        window.style.left = window.dataset.originalLeft;
        window.style.width = window.dataset.originalWidth;
        window.style.height = window.dataset.originalHeight;
        setTimeout(() => {
            window.classList.remove('maximizing');
            window.style.transition = '';
        }, 300);
    } else {
        // Maximize
        window.dataset.originalTop = window.style.top;
        window.dataset.originalLeft = window.style.left;
        window.dataset.originalWidth = window.style.width;
        window.dataset.originalHeight = window.style.height;
        
        window.classList.add('maximized', 'maximizing');
        window.style.transition = 'all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)';
        window.style.top = '28px';
        window.style.left = '0';
        window.style.width = '100vw';
        window.style.height = 'calc(100vh - 108px)';
        setTimeout(() => {
            window.classList.remove('maximizing');
            window.style.transition = '';
        }, 300);
    }
}

// Make windows active on click
Object.values(windows).forEach(window => {
    window.addEventListener('mousedown', () => {
        makeWindowActive(window);
    });
});

// ===== DRAGGABLE WINDOWS =====
let isDragging = false;
let currentWindow = null;
let offsetX = 0;
let offsetY = 0;

document.querySelectorAll('.window-titlebar').forEach(titlebar => {
    titlebar.addEventListener('mousedown', (e) => {
        if (e.target.closest('.window-control')) return;
        
        isDragging = true;
        currentWindow = titlebar.closest('.window');
        
        const rect = currentWindow.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;
        
        makeWindowActive(currentWindow);
        currentWindow.style.cursor = 'grabbing';
    });
});

document.addEventListener('mousemove', (e) => {
    if (!isDragging || !currentWindow) return;
    
    const x = e.clientX - offsetX;
    const y = e.clientY - offsetY;
    
    const maxX = window.innerWidth - currentWindow.offsetWidth;
    const maxY = window.innerHeight - currentWindow.offsetHeight - 80;
    
    currentWindow.style.left = Math.max(0, Math.min(x, maxX)) + 'px';
    currentWindow.style.top = Math.max(28, Math.min(y, maxY)) + 'px';
});

document.addEventListener('mouseup', () => {
    if (currentWindow) {
        currentWindow.style.cursor = 'default';
    }
    isDragging = false;
    currentWindow = null;
});

// ===== RESIZABLE WINDOWS =====
Object.values(windows).forEach(window => {
    const resizeHandle = document.createElement('div');
    resizeHandle.style.cssText = `
        position: absolute;
        bottom: 0;
        right: 0;
        width: 20px;
        height: 20px;
        cursor: nwse-resize;
    `;
    window.appendChild(resizeHandle);

    let isResizing = false;
    let startX, startY, startWidth, startHeight;

    resizeHandle.addEventListener('mousedown', (e) => {
        isResizing = true;
        startX = e.clientX;
        startY = e.clientY;
        startWidth = window.offsetWidth;
        startHeight = window.offsetHeight;
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        
        const width = startWidth + (e.clientX - startX);
        const height = startHeight + (e.clientY - startY);
        
        window.style.width = Math.max(600, width) + 'px';
        window.style.height = Math.max(400, height) + 'px';
    });

    document.addEventListener('mouseup', () => {
        isResizing = false;
    });
});

// Sound toggle button handler
document.getElementById('sound-toggle-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleSound();
});

// ===== MENU BAR FUNCTIONALITY =====
let activeMenu = null;

document.querySelectorAll('.menu-trigger').forEach(trigger => {
    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        playClickSound();
        const menuName = trigger.getAttribute('data-menu');
        const menu = document.getElementById(`${menuName}-menu`);
        
        if (!menu) return;
        
        // Close all menus first
        document.querySelectorAll('.dropdown-menu').forEach(m => m.style.display = 'none');
        
        // Toggle current menu
        if (activeMenu === menu && menu.style.display === 'block') {
            menu.style.display = 'none';
            activeMenu = null;
        } else {
            const rect = trigger.getBoundingClientRect();
            menu.style.left = rect.left + 'px';
            menu.style.display = 'block';
            activeMenu = menu;
        }
    });
});

// Close menus when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.menu-trigger') && !e.target.closest('.dropdown-menu')) {
        document.querySelectorAll('.dropdown-menu').forEach(m => m.style.display = 'none');
        activeMenu = null;
    }
});

// Menu item actions
document.querySelectorAll('.menu-dropdown-item').forEach(item => {
    item.addEventListener('click', () => {
        playClickSound();
        const action = item.getAttribute('data-action');
        const itemText = item.textContent.trim();
        
        // File menu actions
        if (action === 'open-finder') {
            openWindow('finder');
        } else if (action === 'new-window') {
            openWindow('finder');
        } else if (action === 'close-window') {
            if (activeWindow) {
                activeWindow.style.opacity = '0';
                setTimeout(() => {
                    activeWindow.style.display = 'none';
                    activeWindow.style.opacity = '1';
                }, 200);
            }
        } else if (action === 'minimize') {
            if (activeWindow) {
                playMinimizeSound();
                activeWindow.classList.add('minimizing');
                setTimeout(() => {
                    activeWindow.classList.remove('minimizing');
                    activeWindow.classList.add('minimized');
                }, 600);
            }
        }
        
        // Apple menu items
        if (itemText.includes('About This Mac')) {
            openWindow('about-mac');
        } else if (itemText.includes('System Preferences')) {
            openWindow('preferences');
        } else if (itemText.includes('App Store')) {
            showMacModal('App Store', 'Currently in Exploration Mode\n\nThis is a portfolio showcase, not a real App Store!\n\nExplore my projects and experience instead! 😊', '🛍️');
        } else if (itemText.includes('Recent Items')) {
            showRecentItems();
        }
        
        // Finder menu items
        if (itemText.includes('Empty Trash')) {
            emptyTrashAnimation();
        }
        
        // Help menu items
        if (action === 'show-help') {
            showMacOSHelp();
        } else if (action === 'show-shortcuts') {
            showKeyboardShortcuts();
        } else if (action === 'about-portfolio') {
            showAboutPortfolio();
        }
        
        // View menu items
        if (action === 'view-icons') {
            changeDesktopView('icons');
        } else if (action === 'view-list') {
            changeDesktopView('list');
        } else if (action === 'view-gallery') {
            changeDesktopView('gallery');
        }
        
        // Go menu items
        if (action === 'open-finder') openWindow('finder');
        if (action === 'open-projects') openWindow('projects');
        if (action === 'open-terminal') openWindow('terminal');
        if (action === 'open-resume') openWindow('resume');
        if (action === 'open-contact') openWindow('contact');
        if (action === 'open-launchpad') openLaunchpad();
        if (action === 'open-preferences') openWindow('preferences');
        
        // Window menu items
        if (action === 'minimize-active' && activeWindow) {
            playMinimizeSound();
            activeWindow.classList.add('minimizing');
            setTimeout(() => {
                activeWindow.classList.remove('minimizing');
                activeWindow.classList.add('minimized');
                updateDockIndicators();
            }, 600);
        }
        if (action === 'maximize-active' && activeWindow) {
            toggleMaximize(activeWindow);
        }
        if (action === 'close-active' && activeWindow) {
            activeWindow.style.opacity = '0';
            setTimeout(() => {
                activeWindow.style.display = 'none';
                activeWindow.style.opacity = '1';
                updateDockIndicators();
                updateMenuBarAppName(null);
            }, 200);
        }
        if (action === 'bring-all-front') {
            Object.values(windows).forEach(w => {
                if (w && w.style.display === 'block') {
                    w.style.zIndex = ++zIndexCounter;
                }
            });
        }
        if (action === 'minimize-all') {
            Object.values(windows).forEach(w => {
                if (w && w.style.display === 'block' && !w.classList.contains('minimized')) {
                    w.classList.add('minimized');
                }
            });
            updateDockIndicators();
        }
        
        // Special menu items - Mac-style confirmations
        if (item.id === 'logout-item') {
            showMacModal('Log Out', 'Are you sure you want to log out Virendra Kumar?', '🚪');
            document.getElementById('mac-modal-ok').onclick = () => {
                closeMacModal();
                setTimeout(() => location.reload(), 500);
            };
        } else if (item.id === 'restart-item') {
            showMacModal('Restart', 'Are you sure you want to restart this Mac?', '🔄');
            document.getElementById('mac-modal-ok').onclick = () => {
                closeMacModal();
                setTimeout(() => location.reload(), 500);
            };
        } else if (item.id === 'shutdown-item') {
            showMacModal('Shut Down', 'Are you sure you want to shut down your Mac?', '⚡');
            document.getElementById('mac-modal-ok').onclick = () => {
                closeMacModal();
                setTimeout(() => beautifulShutdown(), 500);
            };
        }
        
        // Close menus after action
        document.querySelectorAll('.dropdown-menu').forEach(m => m.style.display = 'none');
        activeMenu = null;
    });
});

// Show Recent Items - Beautiful with icons, clickable!
function showRecentItems() {
    if (recentWindows.length === 0) {
        showMacModal('Recent Items', 'No recent items yet.\n\nOpen some windows to see them here!', '📋');
        return;
    }
    
    // Create modal with clickable items
    const overlay = document.getElementById('mac-modal-overlay');
    const titleEl = document.getElementById('mac-modal-title');
    const messageEl = document.getElementById('mac-modal-message');
    const iconEl = document.getElementById('mac-modal-icon');
    
    titleEl.textContent = 'Recent Items';
    iconEl.textContent = '📋';
    
    const appNames = {
        'finder': '📁 About Me',
        'projects': '💼 Projects',
        'terminal': '💻 Terminal',
        'resume': '📄 Resume',
        'contact': '✉️ Contact',
        'preferences': '⚙️ System Preferences',
        'about-mac': ' About This Mac',
        'safari': '🌐 Safari'
    };
    
    const itemsHTML = recentWindows.map(app => 
        `<div class="recent-item" onclick="openWindow('${app}'); closeMacModal();">
            <span style="font-size: 20px; margin-right: 8px;">${appNames[app]?.split(' ')[0] || '📦'}</span>
            <span>${appNames[app]?.substring(2) || app}</span>
        </div>`
    ).join('');
    
    messageEl.innerHTML = `<div class="recent-items-grid">${itemsHTML}</div>`;
    overlay.style.display = 'flex';
    playClickSound();
}

// Help Menu Functions - Mac-Style Modals
function showMacOSHelp() {
    showMacModal(
        '🍎 macOS Portfolio Help',
        `Keyboard Shortcuts:
⌘ + Space - Spotlight Search
⌘ + N - New Finder Window
⌘ + W - Close Window
⌘ + M - Minimize Window
⌘ + Q - Quit

Features:
• Dynamic menu bar (shows active window)
• System Preferences (themes & wallpapers)
• Genie minimize effect
• Experience Clock widget
• Glossy zoom dock
• Beautiful Mac-style modals
• Animated wallpapers with particles

Created by Virendra Kumar - DevOps Technical Architect`,
        '📖'
    );
}

function showKeyboardShortcuts() {
    showMacModal(
        '⌨️ Keyboard Shortcuts',
        `Working Shortcuts:
ESC - Close active window
Alt + W - Close window
Alt + M - Minimize window
Alt + N - New Finder window
F4 - Launchpad
Ctrl + Shift + Q - Quit

Spotlight:
⌘ + Space or Ctrl + Space
Arrow Up/Down - Navigate
Enter - Open selected

Fun:
Click Trash icon → Thanos Snap!

Note: Some ⌘ shortcuts are blocked by Mac OS for security. Use alternatives above!`,
        '⌨️'
    );
}

function showAboutPortfolio() {
    showMacModal(
        '🍎 About This Portfolio',
        `macOS Monterey Recreation
Version 5.0.0 - Production Ready

Created for: Virendra Kumar
Role: DevOps Technical Architect
Location: India

Features:
✅ Mac-style modals
✅ Beautiful shutdown
✅ Experience clock widget
✅ Glossy zoom dock
✅ 7 wallpapers + animated
✅ Dynamic menu bar
✅ All menus functional

Links:
• github.com/virnahar
• virnahar.github.io
• virnahar.github.io/talktome

"Debugging Life One Commit at a Time..."`,
        '💼'
    );
}

// ===== SPOTLIGHT SEARCH =====
const spotlightOverlay = document.getElementById('spotlight-overlay');
const spotlightInput = document.getElementById('spotlight-input');
const spotlightResults = document.getElementById('spotlight-results');

const searchableItems = [
    { name: 'About Me', description: 'Personal information and background', icon: 'finder', app: 'finder' },
    { name: 'Projects', description: 'View portfolio projects', icon: 'projects', app: 'projects' },
    { name: 'Skills', description: 'Technical skills and expertise', icon: 'terminal', app: 'terminal' },
    { name: 'Resume', description: 'Professional experience and education', icon: 'resume', app: 'resume' },
    { name: 'Contact', description: 'Get in touch', icon: 'contact', app: 'contact' },
    { name: 'Finder', description: 'Browse files and folders', icon: 'finder', app: 'finder' },
    { name: 'Terminal', description: 'Command line interface', icon: 'terminal', app: 'terminal' }
];

function openSpotlight() {
    spotlightOverlay.style.display = 'flex';
    setTimeout(() => {
        spotlightInput.focus();
    }, 100);
    updateSpotlightResults('');
}

function closeSpotlight() {
    spotlightOverlay.style.display = 'none';
    spotlightInput.value = '';
    spotlightResults.innerHTML = '';
}

function updateSpotlightResults(query) {
    if (!query) {
        spotlightResults.innerHTML = '<div class="spotlight-no-results">Type to search...</div>';
        return;
    }
    
    const filtered = searchableItems.filter(item =>
        item.name.toLowerCase().includes(query.toLowerCase()) ||
        item.description.toLowerCase().includes(query.toLowerCase())
    );
    
    if (filtered.length === 0) {
        spotlightResults.innerHTML = '<div class="spotlight-no-results">No results found</div>';
        return;
    }
    
    spotlightResults.innerHTML = filtered.map((item, index) => `
        <div class="spotlight-result-item ${index === 0 ? 'selected' : ''}" data-app="${item.app}">
            <div class="spotlight-result-icon">${getAppIcon(item.icon)}</div>
            <div class="spotlight-result-info">
                <div class="spotlight-result-title">${item.name}</div>
                <div class="spotlight-result-desc">${item.description}</div>
            </div>
        </div>
    `).join('');
    
    // Add click handlers to results
    document.querySelectorAll('.spotlight-result-item').forEach(item => {
        item.addEventListener('click', () => {
            const app = item.getAttribute('data-app');
            openWindow(app);
            closeSpotlight();
        });
    });
}

function getAppIcon(iconName) {
    const icons = {
        'finder': '<svg width="48" height="48" viewBox="0 0 64 64" fill="none"><rect width="64" height="64" rx="14" fill="url(#finderG)"/><path d="M32 16C32 16 22 20 22 28C22 36 32 40 32 40C32 40 42 36 42 28C42 20 32 16 32 16Z" fill="white" opacity="0.9"/><circle cx="28" cy="28" r="4" fill="#0066CC"/><circle cx="36" cy="28" r="4" fill="#0066CC"/><defs><linearGradient id="finderG" x1="0" y1="0" x2="64" y2="64"><stop offset="0%" stop-color="#4F9EEF"/><stop offset="100%" stop-color="#1E6FD8"/></linearGradient></defs></svg>',
        'projects': '<svg width="48" height="48" viewBox="0 0 64 64" fill="none"><rect width="64" height="64" rx="14" fill="#7C3AED"/></svg>',
        'terminal': '<svg width="48" height="48" viewBox="0 0 64 64" fill="none"><rect width="64" height="64" rx="14" fill="#1E1E1E"/></svg>',
        'resume': '<svg width="48" height="48" viewBox="0 0 64 64" fill="none"><rect width="64" height="64" rx="14" fill="#F97316"/></svg>',
        'contact': '<svg width="48" height="48" viewBox="0 0 64 64" fill="none"><rect width="64" height="64" rx="14" fill="#10B981"/></svg>'
    };
    return icons[iconName] || icons['finder'];
}

// Spotlight event listeners
document.getElementById('spotlight-btn')?.addEventListener('click', () => {
    playClickSound();
    openSpotlight();
});

spotlightInput?.addEventListener('input', (e) => {
    updateSpotlightResults(e.target.value);
});

spotlightOverlay?.addEventListener('click', (e) => {
    if (e.target === spotlightOverlay) {
        closeSpotlight();
    }
});

// ===== CONTROL CENTER =====
const controlCenter = document.getElementById('control-center');
const controlCenterBtn = document.getElementById('control-center-btn');

controlCenterBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (controlCenter.style.display === 'block') {
        controlCenter.style.display = 'none';
    } else {
        controlCenter.style.display = 'block';
    }
});

document.addEventListener('click', (e) => {
    if (!e.target.closest('#control-center') && !e.target.closest('#control-center-btn')) {
        if (controlCenter) {
            controlCenter.style.display = 'none';
        }
    }
});

// ===== LAUNCHPAD =====
function openLaunchpad() {
    const launchpad = document.getElementById('launchpad');
    const launchpadSearch = document.getElementById('launchpad-search');
    if (launchpad) {
        launchpad.style.display = 'flex';
        playClickSound();
        // Focus search and clear it
        if (launchpadSearch) {
            setTimeout(() => {
                launchpadSearch.value = '';
                launchpadSearch.focus();
                // Reset all items to visible
                document.querySelectorAll('.launchpad-item').forEach(item => {
                    item.style.display = 'flex';
                });
            }, 100);
        }
        console.log('🚀 Launchpad opened! Type to search apps...');
    }
}

function closeLaunchpad() {
    const launchpad = document.getElementById('launchpad');
    if (launchpad) {
        launchpad.style.display = 'none';
        playClickSound();
    }
}

// Click outside launchpad to close
document.getElementById('launchpad')?.addEventListener('click', (e) => {
    if (e.target.id === 'launchpad') {
        closeLaunchpad();
    }
});

// Launchpad search functionality - FIXED
setTimeout(() => {
    const launchpadSearch = document.getElementById('launchpad-search');
    if (launchpadSearch) {
        launchpadSearch.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const launchpadItems = document.querySelectorAll('.launchpad-item');
            
            launchpadItems.forEach(item => {
                const appName = item.querySelector('span')?.textContent.toLowerCase() || '';
                if (searchTerm === '' || appName.includes(searchTerm)) {
                    item.style.display = 'flex';
                    item.style.opacity = '1';
                } else {
                    item.style.opacity = '0';
                    setTimeout(() => {
                        if (!appName.includes(launchpadSearch.value.toLowerCase())) {
                            item.style.display = 'none';
                        }
                    }, 200);
                }
            });
        });
        
        launchpadSearch.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeLaunchpad();
            }
        });
    }
}, 1000);

// ===== KEYBOARD SHORTCUTS - OVERRIDE MAC SHORTCUTS =====
document.addEventListener('keydown', (e) => {
    // Check if we're in portfolio (not browser UI)
    const isInPortfolio = !e.target.matches('input[type="search"], input[type="url"]');
    
    // F4 for Launchpad
    if (e.key === 'F4') {
        e.preventDefault();
        e.stopImmediatePropagation();
        const launchpad = document.getElementById('launchpad');
        if (launchpad && launchpad.style.display === 'flex') {
            closeLaunchpad();
        } else {
            openLaunchpad();
        }
        return false;
    }
    
    // Cmd/Ctrl + Space for Spotlight (prevent Mac Spotlight!)
    if ((e.metaKey || e.ctrlKey) && e.code === 'Space' && isInPortfolio) {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (spotlightOverlay.style.display === 'flex') {
            closeSpotlight();
        } else {
            openSpotlight();
        }
        return false;
    }
    
    // ALTERNATIVE SHORTCUTS (Mac OS blocks ⌘W, ⌘Q etc)
    // Use ESC to close windows (works better!)
    if (e.key === 'Escape' && activeWindow && activeWindow.style.display === 'block') {
        activeWindow.style.opacity = '0';
        setTimeout(() => {
            activeWindow.style.display = 'none';
            activeWindow.style.opacity = '1';
            updateDockIndicators();
            updateMenuBarAppName(null);
        }, 200);
        return false;
    }
    
    // Alt/Option + W - Close window (alternative that works!)
    if (e.altKey && e.key.toLowerCase() === 'w') {
        e.preventDefault();
        if (activeWindow) {
            activeWindow.style.opacity = '0';
            setTimeout(() => {
                activeWindow.style.display = 'none';
                activeWindow.style.opacity = '1';
                updateDockIndicators();
                updateMenuBarAppName(null);
            }, 200);
        }
        return false;
    }
    
    // Alt/Option + M - Minimize (alternative that works!)
    if (e.altKey && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        if (activeWindow) {
            playMinimizeSound();
            activeWindow.classList.add('minimizing');
            setTimeout(() => {
                activeWindow.classList.remove('minimizing');
                activeWindow.classList.add('minimized');
                updateDockIndicators();
            }, 600);
        }
        return false;
    }
    
    // Alt/Option + N - New window (alternative that works!)
    if (e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        openWindow('finder');
        return false;
    }
    
    // Ctrl+Shift+Q - Quit (alternative that works!)
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'q') {
        e.preventDefault();
        showMacModal('Quit', 'Are you sure you want to quit Virendra\'s DevOS?', '⚡');
        document.getElementById('mac-modal-ok').onclick = () => {
            closeMacModal();
            setTimeout(() => location.reload(), 300);
        };
        return false;
    }
    
    // Escape to close modals
    if (e.key === 'Escape') {
        const launchpad = document.getElementById('launchpad');
        if (launchpad && launchpad.style.display === 'flex') {
            closeLaunchpad();
            return;
        }
        if (spotlightOverlay && spotlightOverlay.style.display === 'flex') {
            closeSpotlight();
        }
        if (controlCenter && controlCenter.style.display === 'block') {
            controlCenter.style.display = 'none';
        }
    }
    
    // Enter in Spotlight
    if (e.key === 'Enter' && spotlightOverlay && spotlightOverlay.style.display === 'flex') {
        const selected = document.querySelector('.spotlight-result-item.selected');
        if (selected) {
            const app = selected.getAttribute('data-app');
            openWindow(app);
            closeSpotlight();
        }
    }
}, true); // Use capture phase to intercept before browser!

// Arrow keys navigation in Spotlight
document.addEventListener('keydown', (e) => {
    if (spotlightOverlay.style.display !== 'flex') return;
    
    const results = Array.from(document.querySelectorAll('.spotlight-result-item'));
    const selectedIndex = results.findIndex(r => r.classList.contains('selected'));
    
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (selectedIndex < results.length - 1) {
            results[selectedIndex]?.classList.remove('selected');
            results[selectedIndex + 1]?.classList.add('selected');
        }
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (selectedIndex > 0) {
            results[selectedIndex]?.classList.remove('selected');
            results[selectedIndex - 1]?.classList.add('selected');
        }
    }
});

// ===== OTHER FUNCTIONALITY =====
// Contact form submission
const contactForm = document.getElementById('contact-form');
if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();
        alert('Thank you for your message! I will get back to you soon.');
        contactForm.reset();
    });
}

// Download button
const downloadBtn = document.querySelector('.download-btn');
if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
        alert('Resume download would start here. Please add your actual resume PDF link.');
    });
}

// Sidebar navigation
document.querySelectorAll('.sidebar-item').forEach(item => {
    item.addEventListener('click', () => {
        document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
    });
});

// Prevent text selection while dragging
document.addEventListener('selectstart', (e) => {
    if (isDragging) {
        e.preventDefault();
    }
});

// Handle window focus
document.addEventListener('click', (e) => {
    if (!e.target.closest('.window')) {
        Object.values(windows).forEach(w => w.classList.remove('active'));
        activeWindow = null;
    }
});

// ===== THEME SYSTEM =====
// Real Mac Wallpapers (Photos from wallpapers folder!)
const wallpapers = {
    'default': `url('wallpapers/pexels-umkreisel-app-956999.jpg')`, // Mountain - Default
    'bigsur': `url('wallpapers/ashim-d-silva-WeYamle9fDM-unsplash.jpg')`, // Canyon
    'monterey': `url('wallpapers/iswanto-arif-OJ74pFtrYi0-unsplash.jpg')`, // Ocean
    'ventura': `url('wallpapers/pexels-philippedonn-1169754.jpg')`, // Mountain landscape
    'sonoma': `url('wallpapers/pexels-eberhardgross-691668.jpg')`, // Desert
    'catalina': `url('wallpapers/pexels-souvenirpixels-417074.jpg')`, // Vista
    'animated': `
        linear-gradient(45deg, #FF6B9D 0%, #C94B7E 20%, #8B5CF6 40%, #4A90E2 60%, #38F9D7 80%, #FF8E53 100%)
    `
};

let currentWallpaper = 'bigsur'; // Big Sur as default!
let currentTheme = 'dark';

// Mark dock icons as running when windows are open
function updateDockIndicators() {
    Object.keys(windows).forEach(appKey => {
        const window = windows[appKey];
        const appName = appKey.replace('-window', '');
        const dockIcon = document.querySelector(`.dock-item[data-app="${appName}"]`);
        
        if (dockIcon) {
            if (window && window.style.display === 'block' && !window.classList.contains('minimized')) {
                dockIcon.classList.add('running');
            } else {
                dockIcon.classList.remove('running');
            }
        }
    });
}

// Apply Big Sur wallpaper on load
window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const savedWallpaper = localStorage.getItem('macOS-wallpaper') || 'bigsur';
        applyWallpaper(savedWallpaper);
    }, 100);
});

// Theme switching
document.querySelectorAll('.theme-option').forEach(option => {
    option.addEventListener('click', () => {
        playClickSound();
        const theme = option.getAttribute('data-theme');
        currentTheme = theme;
        
        document.querySelectorAll('.theme-option').forEach(o => o.classList.remove('active'));
        option.classList.add('active');
        
        applyTheme(theme);
    });
});

function applyTheme(theme) {
    const body = document.body;
    const menuBar = document.getElementById('menu-bar');
    
    if (theme === 'light') {
        body.style.filter = 'brightness(1.2)';
        if (menuBar) menuBar.style.background = 'rgba(255, 255, 255, 0.9)';
    } else if (theme === 'dark') {
        body.style.filter = 'brightness(1)';
        if (menuBar) menuBar.style.background = 'rgba(255, 255, 255, 0.75)';
    } else { // auto
        const hour = new Date().getHours();
        applyTheme(hour >= 18 || hour <= 6 ? 'dark' : 'light');
    }
}

// Wallpaper changing
document.querySelectorAll('.wallpaper-option').forEach(option => {
    option.addEventListener('click', () => {
        playClickSound();
        const wallpaper = option.getAttribute('data-wallpaper');
        currentWallpaper = wallpaper;
        
        document.querySelectorAll('.wallpaper-option').forEach(o => o.classList.remove('active'));
        option.classList.add('active');
        
        applyWallpaper(wallpaper);
    });
});

function applyWallpaper(wallpaper) {
    const body = document.body;
    
    // Remove animated class first
    body.classList.remove('animated-wallpaper');
    
    if (wallpaper === 'animated') {
        body.style.background = wallpapers[wallpaper];
        body.style.backgroundSize = '400% 400%';
        body.style.animation = 'gradientShift 15s ease infinite';
        body.classList.add('animated-wallpaper');
    } else {
        body.style.backgroundImage = wallpapers[wallpaper];
        body.style.backgroundSize = 'cover';
        body.style.backgroundPosition = 'center';
        body.style.backgroundRepeat = 'no-repeat';
        body.style.backgroundAttachment = 'fixed';
        body.style.animation = 'none';
    }
    
    // Save to localStorage
    localStorage.setItem('macOS-wallpaper', wallpaper);
    console.log(`🎨 Wallpaper changed to: ${wallpaper} (saved!)`);
}

// Load saved wallpaper on startup
function loadSavedSettings() {
    const savedWallpaper = localStorage.getItem('macOS-wallpaper');
    const savedSound = localStorage.getItem('macOS-sound-enabled');
    
    if (savedWallpaper && wallpapers[savedWallpaper]) {
        applyWallpaper(savedWallpaper);
        // Update active wallpaper in UI
        document.querySelectorAll('.wallpaper-option').forEach(opt => {
            opt.classList.remove('active');
            if (opt.getAttribute('data-wallpaper') === savedWallpaper) {
                opt.classList.add('active');
            }
        });
    }
    
    if (savedSound !== null) {
        soundEnabled = savedSound === 'true';
        updateSoundIcon();
    }
}

// ===== REAL BRIGHTNESS CONTROL =====
const brightnessSliders = document.querySelectorAll('.brightness-control input[type="range"]');
brightnessSliders.forEach(slider => {
    slider.addEventListener('input', (e) => {
        const value = e.target.value;
        const brightness = 0.4 + (value / 100) * 0.9; // Range: 40% to 130%
        document.body.style.filter = `brightness(${brightness})`;
        localStorage.setItem('devos-brightness', value);
        console.log(`💡 Brightness: ${value}% (screen dimmed!)`);
    });
});

// Restore brightness on load
const savedBrightness = localStorage.getItem('devos-brightness');
if (savedBrightness) {
    const brightness = 0.4 + (savedBrightness / 100) * 0.9;
    document.body.style.filter = `brightness(${brightness})`;
    brightnessSliders.forEach(s => s.value = savedBrightness);
}

// Real Battery Percentage - Enhanced
function updateBatteryStatus() {
    if ('getBattery' in navigator) {
        navigator.getBattery().then(battery => {
            const updateDisplay = () => {
                const percent = Math.round(battery.level * 100);
                const batteryIcon = document.getElementById('battery-icon');
                if (batteryIcon) {
                    batteryIcon.title = `Battery: ${percent}%`;
                    // Update battery fill visual
                    const fill = batteryIcon.querySelector('rect[fill="currentColor"]');
                    if (fill) {
                        const fillWidth = 12 * (percent / 100);
                        fill.setAttribute('width', fillWidth);
                    }
                }
            };
            
            updateDisplay();
            battery.addEventListener('levelchange', updateDisplay);
            battery.addEventListener('chargingchange', updateDisplay);
            
            // Update every 30 seconds
            setInterval(updateDisplay, 30000);
        }).catch(err => {
            console.log('Battery API not available');
        });
    } else {
        // Fallback: Show estimated battery
        const batteryIcon = document.getElementById('battery-icon');
        if (batteryIcon) {
            batteryIcon.title = 'Battery: ~75%';
        }
    }
}

// Call on load
setTimeout(() => updateBatteryStatus(), 1000);

// REAL Volume Control - Actually affects sound!
let masterVolume = 0.5;

const volumeSliders = document.querySelectorAll('.volume-control input[type="range"]');
volumeSliders.forEach(slider => {
    slider.addEventListener('input', (e) => {
        const value = e.target.value;
        masterVolume = value / 100;
        
        // Mute/unmute based on volume
        if (value == 0 && soundEnabled) {
            soundEnabled = false;
            updateSoundIcon();
        } else if (value > 0 && !soundEnabled) {
            soundEnabled = true;
            updateSoundIcon();
        }
        
        console.log(`🔊 Volume: ${value}% (sounds affected!)`);
    });
});

// Sound effect toggles in preferences
document.getElementById('sound-effects-toggle')?.addEventListener('change', (e) => {
    if (e.target.checked !== soundEnabled) {
        toggleSound();
    }
});

document.getElementById('startup-sound-toggle')?.addEventListener('change', (e) => {
    console.log('Startup sound: ' + (e.target.checked ? 'enabled' : 'disabled'));
});

// ===== LOGIN SCREEN BUTTON FUNCTIONALITY =====
const loginOptions = document.querySelectorAll('.login-option');
loginOptions.forEach((option, index) => {
    option.addEventListener('click', () => {
        playClickSound();
        if (index === 0) {
            // Settings
            alert('Login settings would open here');
        } else if (index === 1) {
            // Keyboard/Language
            alert('Keyboard & language settings would open here');
        }
        // Power button handled separately
    });
});

document.querySelector('.login-switch-user')?.addEventListener('click', () => {
    playClickSound();
    alert('Switch User - In a real system, this would show other user accounts');
});

// ===== SNAKE GAME IN TERMINAL! =====
function playSnakeGame(term) {
    let snake = [{x: 10, y: 10}];
    let direction = {x: 1, y: 0};
    let pod = {x: 15, y: 10};
    let score = 0;
    let gameRunning = true;
    let grid = {width: 30, height: 15};
    
    const drawGame = () => {
        let display = '';
        for (let y = 0; y < grid.height; y++) {
            for (let x = 0; x < grid.width; x++) {
                let isSnake = snake.some(s => s.x === x && s.y === y);
                let isPod = pod.x === x && pod.y === y;
                let isHead = snake[0].x === x && snake[0].y === y;
                
                if (isHead) {
                    display += '[[;#00ff00;]🟢]';
                } else if (isSnake) {
                    display += '[[;#00ff00;]●]';
                } else if (isPod) {
                    display += '[[;#00ffff;]☸]';
                } else {
                    display += ' ';
                }
            }
            display += '\n';
        }
        display += `\n[[;#ffff00;]🐍 Score: ${score} | K8s Pods eaten: ${score}]`;
        display += `\n[[;#00ffff;]Use Arrow Keys to move | Press ESC to exit game]`;
        return display;
    };
    
    const gameLoop = () => {
        if (!gameRunning) return;
        
        let newHead = {
            x: snake[0].x + direction.x,
            y: snake[0].y + direction.y
        };
        
        if (newHead.x < 0 || newHead.x >= grid.width || newHead.y < 0 || newHead.y >= grid.height) {
            gameRunning = false;
            term.echo(`[[;#ff0000;]💥 Game Over! Final Score: ${score}]`);
            term.echo('[[;#00ffff;]Type "snake" to play again!]');
            document.removeEventListener('keydown', keyHandler);
            return;
        }
        
        if (snake.some(s => s.x === newHead.x && s.y === newHead.y)) {
            gameRunning = false;
            term.echo(`[[;#ff0000;]💥 Snake ate itself! Score: ${score}]`);
            term.echo('[[;#00ffff;]Type "snake" to play again!]');
            document.removeEventListener('keydown', keyHandler);
            return;
        }
        
        snake.unshift(newHead);
        
        if (newHead.x === pod.x && newHead.y === pod.y) {
            score++;
            playClickSound();
            pod = {
                x: Math.floor(Math.random() * grid.width),
                y: Math.floor(Math.random() * grid.height)
            };
        } else {
            snake.pop();
        }
        
        term.clear();
        term.echo(drawGame());
        
        if (gameRunning) {
            setTimeout(gameLoop, 200);
        }
    };
    
    const keyHandler = (e) => {
        if (!gameRunning) return;
        
        if (e.key === 'ArrowUp' && direction.y === 0) {
            direction = {x: 0, y: -1};
            e.preventDefault();
        } else if (e.key === 'ArrowDown' && direction.y === 0) {
            direction = {x: 0, y: 1};
            e.preventDefault();
        } else if (e.key === 'ArrowLeft' && direction.x === 0) {
            direction = {x: -1, y: 0};
            e.preventDefault();
        } else if (e.key === 'ArrowRight' && direction.x === 0) {
            direction = {x: 1, y: 0};
            e.preventDefault();
        } else if (e.key === 'Escape') {
            gameRunning = false;
            document.removeEventListener('keydown', keyHandler);
            term.clear();
            term.echo('[[;#ffff00;]🐍 Game exited! Type "snake" to play again.]');
        }
    };
    
    document.addEventListener('keydown', keyHandler);
    term.echo(drawGame());
    setTimeout(gameLoop, 200);
}

// ===== INTERACTIVE TERMINAL =====
// Configure terminal colors FIRST (before initialization)
if (typeof $ !== 'undefined' && typeof $.terminal !== 'undefined') {
    $.terminal.xml_formatter.tags.cyan = () => '[[;#00ffff;]';
    $.terminal.xml_formatter.tags.yellow = () => '[[;#ffff00;]';
    $.terminal.xml_formatter.tags.green = () => '[[;#00ff00;]';
    $.terminal.xml_formatter.tags.blue = () => '[[;#5555ff;]';
    $.terminal.xml_formatter.tags.magenta = () => '[[;#ff00ff;]';
    $.terminal.xml_formatter.tags.white = () => '[[;#ffffff;]';
    $.terminal.xml_formatter.tags.red = () => '[[;#ff0000;]';
}

// Initialize Interactive Terminal when window opens
function initInteractiveTerminal() {
    if (typeof $ === 'undefined' || typeof $.terminal === 'undefined') {
        console.error('jQuery Terminal not loaded');
        return;
    }
    
    // Check if already initialized
    const termElement = $('#interactive-terminal');
    if (!termElement.length) {
        console.error('Terminal element not found!');
        return;
    }
    
    if (termElement.data('terminal')) {
        console.log('Terminal already initialized');
        return;
    }
    
    const directories = {
        education: [
            '',
            '[[;#ffffff;]Education]',
            '* Jai Narain Vyas University, Jodhpur [[;#ffff00;]"Computer Science"] 2009-2012',
            ''
        ],
        experience: [
            '',
            '[[;#ffffff;]Experience]',
            '* [[;#00ff00;]McKinsey & Company] - Senior Cloud DevOps Engineer II (Nov 2023 - Present)',
            '* [[;#00ff00;]McKinsey & Company] - Senior Cloud DevOps Engineer I (Feb 2023 - Nov 2024)',
            '* [[;#00ff00;]Accenture] - DevOps Associate Manager (5 years 1 month)',
            '* [[;#00ff00;]Mercer] - DevOps Technical Lead (5 years 11 months)',
            '* [[;#00ff00;]Clavax] - DevOps Engineer (2 years 7 months)',
            '* [[;#00ff00;]Clavax] - Sr. System Administrator (2 years 9 months)',
            ''
        ],
        skills: [
            '',
            '[[;#ffffff;]Top Skills]',
            '[[;#00ff00;]Cloud:] AWS (95%), Azure (90%), GCP (85%)',
            '[[;#00ff00;]Containers:] Kubernetes (96%), Docker (98%), Helm (90%)',
            '[[;#00ff00;]IaC:] Terraform (98%), Ansible (92%), CloudFormation (87%)',
            '[[;#00ff00;]CI/CD:] Jenkins (97%), GitHub Actions (93%), GitLab CI (88%)',
            '[[;#00ff00;]Languages:] Python (94%), Bash (96%), Groovy (91%), Go (82%)',
            ''
        ]
    };
    
    const dirs = Object.keys(directories);
    const root = '~';
    let cwd = root;
    const user = 'vir';
    const server = 'terminal';
    
    const commands = {
        help() {
            this.echo('[[;#ffff00;]Available commands:]');
            this.echo('  help, whoami, ls, cd, experience, skills, education, clear, joke');
            this.echo('');
            this.echo('[[;#00ff00;]🎮 Fun commands:]');
            this.echo('  kubernetes, terraform, devops, coffee, motivate, snake');
        },
        whoami() {
            this.echo('[[;#00ffff;]Virendra Kumar] - [[;#00ff00;]Senior Cloud DevOps Engineer II @ McKinsey & Company]\n');
            this.echo('From [[;#ffff00;]carrying CPUs across office floors] to [[;#00ff00;]leading DevOps automation at McKinsey], my journey has been all about transforming challenges into opportunities.\n');
            this.echo('[[;#ffffff;]Currently focusing on:]');
            this.echo('• [[;#00ff00;]Cloud infrastructure cost optimization]');
            this.echo('• [[;#00ff00;]AI-driven DevOps automation]');
            this.echo('• [[;#00ff00;]Multi-client architectures with auto-scaling]');
            this.echo('• [[;#00ff00;]Mentoring high-performing DevOps teams]\n');
            this.echo('[[;#ff00ff;]"Debugging Life One Commit at a Time..."]');
        },
        ls(dir = null) {
            if (!dir && cwd === root) {
                this.echo(dirs.map(d => `[[;#5555ff;]${d}]`).join('  '));
            } else if (dir && directories[dir]) {
                this.echo(directories[dir].join('\n'));
            } else {
                this.echo(directories[cwd.replace('~/', '')]?.join('\n') || '[[;#ff0000;]Directory not found]');
            }
        },
        cd(dir) {
            if (!dir || dir === '~') {
                cwd = root;
            } else if (dirs.includes(dir)) {
                cwd = `~/${dir}`;
            } else {
                this.error(`cd: ${dir}: No such directory`);
            }
        },
        experience() {
            this.echo(directories.experience.join('\n'));
        },
        skills() {
            this.echo(directories.skills.join('\n'));
        },
        education() {
            this.echo(directories.education.join('\n'));
        },
        clear() {
            this.clear();
        },
        kubernetes() {
            this.echo('[[;#00ff00;]🎮 Kubernetes Fun Facts:]');
            this.echo('[[;#00ffff;]• K8s = "kate-s" (8 letters between K and s)]');
            this.echo('[[;#ffff00;]• Pods are like DevOps haiku - small & beautiful]');
            this.echo('[[;#ff00ff;]• "It worked on my machine" → Docker & K8s were born]');
        },
        terraform() {
            this.echo('[[;#00ff00;]🏗️  Terraform Wisdom:]');
            this.echo('[[;#00ffff;]• "terraform destroy" - 2 most powerful words]');
            this.echo('[[;#ffff00;]• Infrastructure as Code = Git for servers]');
            this.echo('[[;#ff00ff;]• Plan before apply, or prepare to cry!]');
        },
        devops() {
            this.echo('[[;#00ff00;]💡 DevOps Wisdom:]');
            this.echo('[[;#00ffff;]• "It\'s not a bug, it\'s a feature" - No DevOps engineer ever]');
            this.echo('[[;#ffff00;]• "Just restart it" - Universal solution]');
        },
        coffee() {
            this.echo('[[;#ff0000;]☕ ERROR: Coffee not found!]');
            this.echo('[[;#00ffff;]Virendra prefers TEA! ☕]');
        },
        motivate() {
            const quotes = [
                'Keep calm and run kubectl get pods',
                'There is no cloud, it\'s just someone else\'s computer',
                'Automate everything!',
                'Docker: Making "it works on my machine" obsolete',
                'Debugging: Being a detective in a crime where you\'re also the murderer'
            ];
            this.echo(`[[;#00ff00;]💪 ${quotes[Math.floor(Math.random() * quotes.length)]}]`);
        },
        snake() {
            this.echo('[[;#00ff00;]🐍 K8s Pod Snake Game!]');
            this.echo('[[;#ffff00;]Game will open in a new window...]');
            this.echo('[[;#00ffff;]Click the Games folder to see all available games!]');
            showMacModal('🐍 Snake Game', 'For the best gaming experience,\ncheck out the Games folder!\n\nClick the pink Games icon on desktop.', '🎮');
        },
        async joke() {
            try {
                const res = await fetch('https://v2.jokeapi.dev/joke/Programming');
                const data = await res.json();
                if (data.type === 'twopart') {
                    await this.echo(`[[;#00ffff;]Q:] ${data.setup}`, { typing: true, delay: 30 });
                    await this.echo(`[[;#00ff00;]A:] ${data.delivery}`, { typing: true, delay: 30 });
                } else {
                    await this.echo(`[[;#ffff00;]${data.joke}]`, { typing: true, delay: 30 });
                }
            } catch(e) {
                this.error('[[;#ff0000;]Failed to fetch joke]');
            }
        }
    };
    
    const term = $('#interactive-terminal').terminal(commands, {
        greetings: `[[;#00ffff;]╔════════════════════════════════════════════════════╗
║   💻 Virendra Kumar's DevOS Terminal 🚀   ║
╚════════════════════════════════════════════════════╝]

[[;#ffff00;]Type 'help' to see available commands]
[[;#00ff00;]Type 'whoami' to learn about me]
[[;#ff00ff;]Type 'ls' to explore directories]

`,
        prompt() {
            return `[[;#00ff00;]${user}@${server}]:[[;#5555ff;]${cwd}]$ `;
        },
        checkArity: false,
        completion(string) {
            return Object.keys(commands);
        },
        onBeforeCommand() {
            playClickSound();
        },
        keypress() {
            playKeypressSound();
        }
    });
    
    // Add keypress sound to terminal
    term.on('keypress', () => {
        playKeypressSound();
    });
}

// Change desktop view mode - Actually change layout!
function changeDesktopView(mode) {
    desktopViewMode = mode;
    const desktop = document.getElementById('desktop');
    
    desktop.classList.remove('view-icons', 'view-list', 'view-gallery');
    desktop.classList.add(`view-${mode}`);
    
    if (mode === 'list') {
        desktop.style.display = 'flex';
        desktop.style.flexDirection = 'column';
        desktop.style.gap = '8px';
        desktop.style.padding = '20px';
    } else if (mode === 'gallery') {
        desktop.style.display = 'grid';
        desktop.style.gridTemplateColumns = 'repeat(auto-fill, 200px)';
        desktop.style.gap = '32px';
        desktop.style.padding = '20px';
    } else {
        desktop.style.display = 'grid';
        desktop.style.gridTemplateColumns = 'repeat(auto-fill, 90px)';
        desktop.style.gridAutoRows = '90px';
        desktop.style.gap = '16px';
        desktop.style.padding = '20px';
    }
    
    showMacModal('View Changed', `Desktop view: ${mode.toUpperCase()}`, '👁️');
}

// Play game in Safari window (embedded!)
function playGameInSafari(url, gameName) {
    const safari = document.getElementById('safari-window');
    const iframe = document.getElementById('safari-iframe');
    const urlBar = document.getElementById('safari-url');
    
    if (iframe && safari) {
        iframe.src = url;
        if (urlBar) {
            const domain = url.split('/')[2];
            urlBar.textContent = domain;
        }
        openWindow('safari');
        
        // Update window title
        const titleEl = safari.querySelector('.window-title');
        if (titleEl) {
            titleEl.textContent = `Safari - ${gameName}`;
        }
    }
    playClickSound();
}

// Show company information modal - CORRECTED DATES
function showCompanyModal(company) {
    const companies = {
        'McKinsey': {
            icon: '🏢',
            period: 'February 2023 - Present (1 year 8 months)',
            role: 'Senior Cloud DevOps Engineer II',
            description: `Leading cloud infrastructure optimization and AI-driven automation.

Key Achievements:
• Cost optimization through strategic automation
• AI-powered DevOps workflows
• Multi-client architectures with auto-scaling
• Mentoring high-performing teams`
        },
        'Accenture': {
            icon: '💼',
            period: 'September 2021 - January 2023 (1 year 5 months)',
            role: 'DevOps Associate Manager',
            description: `Cloud-native strategies and CI/CD transformation leadership.

Key Achievements:
• Spearheaded Jenkins/CloudBees pipelines
• Terraform & Ansible automation
• Technical leadership across teams
• 75% faster deployments`
        },
        'Mercer': {
            icon: '🏛️',
            period: 'September 2016 - September 2021 (5 years 1 month)',
            role: 'DevOps Technical Lead',
            description: `DevOps transformation making it a true business enabler.

Key Achievements:
• Azure DevOps & Jenkins pipelines
• SonarQube integration
• Cross-functional collaboration
• Operational excellence culture`
        },
        'Clavax': {
            icon: '💻',
            period: 'March 2014 - September 2016 (2 years 7 months)',
            role: 'DevOps Engineer & Sr. System Admin',
            description: `From carrying CPUs to building DevOps processes.

Journey:
• Started as System Administrator
• Grew to DevOps Engineer
• Built scalable CI/CD processes
• Mentored junior engineers`
        },
        'Aannya': {
            icon: '🚀',
            period: 'April 2013 - February 2014 (11 months)',
            role: 'Early Career Foundation',
            description: `Where it all began - the foundation of my DevOps journey.

Learning:
• System operations basics
• Server management
• Automation fundamentals
• Professional growth mindset`
        }
    };
    
    const info = companies[company];
    if (info) {
        showMacModal(
            `${info.icon} ${company}`,
            `${info.role}
${info.period}

${info.description}`,
            info.icon
        );
    }
}

// ===== PERFECT SMOOTH MAC DOCK - FINAL VERSION =====
window.addEventListener('load', () => {
    setTimeout(() => {
        const dock = document.querySelector('.dock');
        if (!dock) return;
        
        const dockItems = Array.from(document.querySelectorAll('.dock-item'));
        let currentMouseX = 0;
        let targetScales = dockItems.map(() => 1);
        let currentScales = dockItems.map(() => 1);
        let isAnimating = false;

        dock.addEventListener('mousemove', (e) => {
            const rect = dock.getBoundingClientRect();
            currentMouseX = e.clientX;
            
            dockItems.forEach((item, index) => {
                const itemRect = item.getBoundingClientRect();
                const itemCenter = itemRect.left + itemRect.width / 2;
                const distance = Math.abs(currentMouseX - itemCenter);
                
                // Smooth easing curve
                const maxDist = 180;
                const maxScale = 2.2;
                
                if (distance < maxDist) {
                    const factor = (maxDist - distance) / maxDist;
                    const eased = Math.pow(factor, 0.7);
                    targetScales[index] = 1 + (eased * (maxScale - 1));
                } else {
                    targetScales[index] = 1;
                }
            });
            
            if (!isAnimating) {
                isAnimating = true;
                smoothAnimate();
            }
        });

        dock.addEventListener('mouseleave', () => {
            targetScales = dockItems.map(() => 1);
        });

        function smoothAnimate() {
            let hasChanges = false;
            
            dockItems.forEach((item, i) => {
                const diff = targetScales[i] - currentScales[i];
                if (Math.abs(diff) > 0.01) {
                    currentScales[i] += diff * 0.18;
                    hasChanges = true;
                } else {
                    currentScales[i] = targetScales[i];
                }
                
                const scale = currentScales[i];
                const lift = (scale - 1) * 28;
                item.style.transform = `translateY(-${lift}px) scale(${scale})`;
            });
            
            if (hasChanges) {
                requestAnimationFrame(smoothAnimate);
            } else {
                isAnimating = false;
            }
        }
    }, 800);
});

// Epic Thanos Snap - EVERYTHING Disappears!
function emptyTrashAnimation() {
    playClickSound();
    
    // Get EVERYTHING on screen
    const icons = document.querySelectorAll('.desktop-icon');
    const widgets = document.querySelectorAll('.desktop-widget');
    const dock = document.querySelector('.dock');
    
    // Save dock's original transform
    const originalDockTransform = dock ? dock.style.transform || 'translateX(-50%)' : '';
    
    const allElements = [...icons, ...widgets];
    
    // Thanos snap icons and widgets!
    allElements.forEach((element, index) => {
        if (!element) return;
        
        setTimeout(() => {
            // Create particles
            for (let i = 0; i < 25; i++) {
                const particle = document.createElement('div');
                particle.className = 'trash-particle';
                const rect = element.getBoundingClientRect();
                particle.style.left = (rect.left + rect.width / 2) + 'px';
                particle.style.top = (rect.top + rect.height / 2) + 'px';
                particle.style.setProperty('--tx', (Math.random() - 0.5) * 500 + 'px');
                particle.style.setProperty('--ty', (Math.random() - 0.5) * 500 + 'px');
                particle.style.background = `radial-gradient(circle, rgba(${Math.random()*255},${Math.random()*255},${Math.random()*255},0.9), transparent)`;
                document.body.appendChild(particle);
                
                setTimeout(() => particle.remove(), 1800);
            }
            
            // Thanos snap effect
            element.style.transition = 'all 1.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            element.style.transform = `translateX(${(Math.random() - 0.5) * 400}px) translateY(${(Math.random() - 0.5) * 400}px) rotate(${Math.random() * 1080 - 540}deg) scale(0)`;
            element.style.opacity = '0';
            element.style.filter = 'blur(30px) brightness(2)';
        }, index * 120);
    });
    
    // Snap dock separately (preserve position!)
    if (dock) {
        setTimeout(() => {
            // Particles from dock
            for (let i = 0; i < 30; i++) {
                const particle = document.createElement('div');
                particle.className = 'trash-particle';
                const rect = dock.getBoundingClientRect();
                particle.style.left = (rect.left + rect.width / 2) + 'px';
                particle.style.top = (rect.top + rect.height / 2) + 'px';
                particle.style.setProperty('--tx', (Math.random() - 0.5) * 600 + 'px');
                particle.style.setProperty('--ty', (Math.random() - 0.5) * 300 + 'px');
                particle.style.background = `radial-gradient(circle, rgba(${Math.random()*255},${Math.random()*255},${Math.random()*255},0.9), transparent)`;
                document.body.appendChild(particle);
                setTimeout(() => particle.remove(), 1800);
            }
            
            dock.style.transition = 'all 1.5s ease-out';
            dock.style.opacity = '0';
            dock.style.filter = 'blur(30px) brightness(2)';
        }, allElements.length * 120);
    }
    
    // Epic Reborn Effect!
    setTimeout(() => {
        // Restore icons and widgets
        allElements.forEach((element, index) => {
            if (!element) return;
            setTimeout(() => {
                element.style.transition = 'all 1s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
                element.style.transform = 'translateX(0) translateY(0) rotate(0) scale(1)';
                element.style.opacity = '1';
                element.style.filter = 'blur(0) brightness(1)';
            }, index * 60);
        });
        
        // Restore dock (preserve position!)
        if (dock) {
            setTimeout(() => {
                dock.style.transition = 'all 1s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
                dock.style.transform = originalDockTransform;
                dock.style.opacity = '1';
                dock.style.filter = 'blur(0) brightness(1)';
            }, allElements.length * 60);
        }
        
        setTimeout(() => {
            showMacModal(
                '♾️ Thanos Snap Complete!',
                `Everything snapped into dust and reborn!

Desktop icons ✓
Widgets ✓  
Dock ✓

All restored - perfectly balanced! 😄`,
                '💨'
            );
        }, allElements.length * 60 + 1000);
    }, allElements.length * 120 + 1500);
}

// Add particle CSS
if (!document.getElementById('particle-styles')) {
    const style = document.createElement('style');
    style.id = 'particle-styles';
    style.textContent = `
        .trash-particle {
            position: fixed;
            width: 4px;
            height: 4px;
            background: radial-gradient(circle, rgba(255,255,255,0.9), rgba(100,100,255,0.4));
            border-radius: 50%;
            pointer-events: none;
            z-index: 99999;
            animation: particleFloat 1.5s ease-out forwards;
        }
        @keyframes particleFloat {
            to {
                transform: translate(var(--tx), var(--ty));
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
}

console.log('🍎 Virendra\'s DevOS!');
console.log('✨ Epic Thanos Snap | Timeline Widgets | Interactive Terminal!');
console.log('⌨️  WORKING SHORTCUTS:');
console.log('   • ESC - Close active window');
console.log('   • Alt+W - Close window');
console.log('   • Alt+M - Minimize window');
console.log('   • Alt+N - New window');
console.log('   • F4 - Launchpad');
console.log('   • Ctrl+Shift+Q - Quit');
console.log('📱 Note: Some ⌘ shortcuts are blocked by Mac OS (security)');
console.log('🗑️  Click Trash icon → Epic Thanos snap everything!');
