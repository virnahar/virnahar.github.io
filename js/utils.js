// ===== DEVOS UTILITIES — Clocks, Battery, Brightness, Theme, Wallpaper, Settings =====

// ===== LIVE EXPERIENCE CLOCK =====
function calculateExperience() {
    const startDate = new Date('2013-04-22T09:00:00');
    const now = new Date();

    let diff = now - startDate;

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

setInterval(calculateExperience, 1000);

// ===== MENU BAR CLOCK =====
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

// ===== BATTERY STATUS =====
function updateBatteryStatus() {
    const batteryFill = document.getElementById('battery-fill');
    const batteryPercent = document.getElementById('battery-percent');
    const chargingIcon = document.getElementById('battery-charging-icon');
    const batteryContainer = document.getElementById('battery-icon');

    function applyBatteryState(level, charging) {
        const percent = Math.round(level * 100);
        if (batteryPercent) batteryPercent.textContent = `${percent}%`;
        if (batteryContainer) batteryContainer.title = charging ? `Battery: ${percent}% (Charging)` : `Battery: ${percent}%`;
        if (batteryFill) {
            const fillWidth = 17 * (percent / 100);
            batteryFill.setAttribute('width', fillWidth);
            if (percent <= 20 && !charging) batteryFill.setAttribute('fill', '#FF3B30');
            else if (percent <= 50 && !charging) batteryFill.setAttribute('fill', '#FF9F0A');
            else batteryFill.setAttribute('fill', charging ? '#30D158' : 'currentColor');
        }
        if (chargingIcon) chargingIcon.style.display = charging ? 'block' : 'none';
    }

    if ('getBattery' in navigator) {
        navigator.getBattery().then(battery => {
            const refresh = () => applyBatteryState(battery.level, battery.charging);
            refresh();
            battery.addEventListener('levelchange', refresh);
            battery.addEventListener('chargingchange', refresh);
            setInterval(refresh, 30000);
        }).catch(() => {
            applyBatteryState(1, false);
            if (batteryPercent) batteryPercent.textContent = 'AC Power';
        });
    } else {
        applyBatteryState(1, false);
        if (batteryPercent) batteryPercent.textContent = 'AC Power';
    }
}

setTimeout(() => updateBatteryStatus(), 1000);

// ===== BRIGHTNESS CONTROL =====
let themeBrightness = 1;
let sliderBrightness = 1;

function applyBrightnessFilter() {
    document.body.style.filter = `brightness(${themeBrightness * sliderBrightness})`;
}

const brightnessSliders = document.querySelectorAll('.brightness-control input[type="range"]');
brightnessSliders.forEach(slider => {
    slider.addEventListener('input', (e) => {
        const value = e.target.value;
        sliderBrightness = 0.4 + (value / 100) * 0.9;
        applyBrightnessFilter();
        localStorage.setItem('devos-brightness', value);
    });
});

// Restore brightness on load
const savedBrightness = localStorage.getItem('devos-brightness');
if (savedBrightness) {
    sliderBrightness = 0.4 + (savedBrightness / 100) * 0.9;
    applyBrightnessFilter();
    brightnessSliders.forEach(s => s.value = savedBrightness);
}

// ===== VOLUME CONTROL =====
const volumeSliders = document.querySelectorAll('.volume-control input[type="range"]');
volumeSliders.forEach(slider => {
    slider.addEventListener('input', (e) => {
        const value = e.target.value;
        masterVolume = value / 100;

        if (value == 0 && soundEnabled) {
            soundEnabled = false;
            updateSoundIcon();
        } else if (value > 0 && !soundEnabled) {
            soundEnabled = true;
            updateSoundIcon();
        }
    });
});

// ===== SOUND EFFECT TOGGLES IN PREFERENCES =====
document.getElementById('sound-effects-toggle')?.addEventListener('change', (e) => {
    if (e.target.checked !== soundEnabled) {
        toggleSound();
    }
});

document.getElementById('startup-sound-toggle')?.addEventListener('change', (e) => {
    // Startup sound preference saved separately if needed
});

// ===== WALLPAPERS =====
const wallpapers = {
    'default': `url('wallpapers/pexels-umkreisel-app-956999.jpg')`,
    'bigsur': `url('wallpapers/ashim-d-silva-WeYamle9fDM-unsplash.jpg')`,
    'monterey': `url('wallpapers/iswanto-arif-OJ74pFtrYi0-unsplash.jpg')`,
    'ventura': `url('wallpapers/pexels-philippedonn-1169754.jpg')`,
    'sonoma': `url('wallpapers/pexels-eberhardgross-691668.jpg')`,
    'catalina': `url('wallpapers/pexels-souvenirpixels-417074.jpg')`,
    'animated': `linear-gradient(45deg, #FF6B9D 0%, #C94B7E 20%, #8B5CF6 40%, #4A90E2 60%, #38F9D7 80%, #FF8E53 100%)`,
    'aurora': `linear-gradient(135deg, #0f0c29 0%, #302b63 30%, #24243e 50%, #0f0c29 70%, #1a1a2e 100%)`,
    'ocean': `linear-gradient(180deg, #0077b6 0%, #00b4d8 25%, #90e0ef 50%, #caf0f8 75%, #023e8a 100%)`,
    'sunset': `linear-gradient(135deg, #1a1a2e 0%, #16213e 15%, #e94560 40%, #f97316 55%, #fbbf24 70%, #533483 85%, #0f3460 100%)`,
    'matrix': `linear-gradient(180deg, #000000 0%, #001a00 30%, #003300 50%, #001a00 70%, #000000 100%)`
};

var _dynamicWallpapers = ['animated','aurora','ocean','sunset','matrix'];

let currentWallpaper = 'bigsur';
let currentTheme = 'dark';

// ===== THEME SWITCHING =====
function applyTheme(theme) {
    const body = document.body;
    const menuBar = document.getElementById('menu-bar');

    if (theme === 'light') {
        body.classList.remove('dark-mode');
        if (menuBar) menuBar.style.background = '';
    } else if (theme === 'dark') {
        body.classList.add('dark-mode');
        if (menuBar) menuBar.style.background = '';
    } else { // auto
        const hour = new Date().getHours();
        applyTheme(hour >= 18 || hour <= 6 ? 'dark' : 'light');
    }
}

document.querySelectorAll('.theme-option').forEach(option => {
    option.addEventListener('click', () => {
        playClickSound();
        const theme = option.getAttribute('data-theme');
        currentTheme = theme;

        document.querySelectorAll('.theme-option').forEach(o => o.classList.remove('active'));
        option.classList.add('active');

        applyTheme(theme);
        localStorage.setItem('devos-theme', theme);
    });
});

// ===== WALLPAPER CHANGING =====
function applyWallpaper(wallpaper) {
    const body = document.body;

    body.classList.remove('animated-wallpaper');
    body.style.animation = 'none';

    if (_dynamicWallpapers.indexOf(wallpaper) !== -1) {
        body.style.background = wallpapers[wallpaper];
        body.style.backgroundSize = '400% 400%';
        body.classList.add('animated-wallpaper');
        var speeds = { animated: 15, aurora: 25, ocean: 20, sunset: 18, matrix: 10 };
        body.style.animation = 'gradientShift ' + (speeds[wallpaper] || 15) + 's ease infinite';
    } else {
        body.style.backgroundImage = wallpapers[wallpaper];
        body.style.backgroundSize = 'cover';
        body.style.backgroundPosition = 'center';
        body.style.backgroundRepeat = 'no-repeat';
        body.style.backgroundAttachment = 'fixed';
        body.style.animation = 'none';
    }

    localStorage.setItem('macOS-wallpaper', wallpaper);
}

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

// Apply Big Sur wallpaper on DOMContentLoaded
window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const savedWallpaper = localStorage.getItem('macOS-wallpaper') || 'bigsur';
        applyWallpaper(savedWallpaper);
    }, 100);
});

// ===== LOAD SAVED SETTINGS =====
function loadSavedSettings() {
    const savedWallpaper = localStorage.getItem('macOS-wallpaper');
    const savedSound = localStorage.getItem('macOS-sound-enabled');
    const savedTheme = localStorage.getItem('devos-theme');

    if (savedWallpaper && wallpapers[savedWallpaper]) {
        applyWallpaper(savedWallpaper);
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

    if (savedTheme) {
        currentTheme = savedTheme;
        applyTheme(savedTheme);
        document.querySelectorAll('.theme-option').forEach(o => {
            o.classList.remove('active');
            if (o.getAttribute('data-theme') === savedTheme) {
                o.classList.add('active');
            }
        });
    }
}

// Default to dark mode if no saved preference
if (!localStorage.getItem('devos-theme')) {
    applyTheme('dark');
}
