// ===== APPS.JS — App-specific Logic: Music, Calculator, Resume, Safari, Company Modals, Contact, Sticky Notes, Code Editor, Notes =====
// Depends on: sounds.js (playClickSound), startup.js (showMacModal, closeMacModal), ui.js (openWindow)

// ===== SPOTIFY-STYLE MUSIC PLAYER =====
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

    const titleEl = document.getElementById('current-song-title');
    const artistEl = document.getElementById('current-song-artist');
    const trackName = document.querySelector('.player-track-name');
    const trackArtist = document.querySelector('.player-track-artist');
    const playBtn = document.querySelector('.play-main');

    if (titleEl) titleEl.textContent = song.title;
    if (artistEl) artistEl.textContent = song.artist;
    if (trackName) trackName.textContent = song.title;
    if (trackArtist) trackArtist.textContent = song.artist;
    if (playBtn) playBtn.textContent = '⏸';

    document.querySelectorAll('.song-item').forEach((item, i) => {
        item.classList.toggle('playing', i === index);
    });

    audioPlayer.removeEventListener('timeupdate', updateSpotifyProgress);
    audioPlayer.removeEventListener('ended', nextMusicTrack);
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
        const playBtn = document.querySelector('.play-main');
        if (playBtn) playBtn.textContent = '⏸';
    } else {
        audioPlayer.pause();
        const playBtn = document.querySelector('.play-main');
        if (playBtn) playBtn.textContent = '▶';
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
    if (progressBar) progressBar.style.width = percent + '%';

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

// ===== PLAY GAME IN SAFARI =====
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

        const titleEl = safari.querySelector('.window-title');
        if (titleEl) titleEl.textContent = `Safari - ${gameName}`;
    }
    playClickSound();
}

// ===== SHOW COMPANY MODAL — CORRECTED DATES =====
function showCompanyModal(company) {
    const companies = {
        'McKinsey': {
            icon: '🏢',
            period: 'February 2023 - Present (3+ years total at McKinsey)',
            role: 'Senior Cloud DevOps Engineer II (Nov 2024 - Present); previously Sr. Cloud DevOps Engineer I',
            description: `Enterprise-scale Azure platform — end-to-end DevOps platform.

Key achievements:
• 75% faster deployments — CI/CD across GitHub Actions, Azure DevOps, GitLab CI, ArgoCD
• $100K+ annual cloud savings; 15+ environments migrated to GitHub Actions, zero downtime
• Multi-tenant Helm framework; unified deployment framework
• DevSecOps: SAST, SCA, container scanning, secrets detection; SOC2 compliance
• Dynatrace observability; internal developer portal & Terraform Plan Visualizer; 20+ tech interviews`
        },
        'Accenture': {
            icon: '💼',
            period: 'September 2021 - January 2023 (1 year 5 months)',
            role: 'DevOps Associate Manager',
            description: `Enterprise clients — DevOps strategy, CI/CD, and infrastructure automation.

Key achievements:
• Led team of 10 DevOps engineers — pipeline-as-code, Terraform modules, Ansible playbook standards
• Jenkins & CloudBees CI/CD for multiple enterprise teams
• Terraform & Ansible provisioning; AWS and Azure environments
• Compliance docs and runbooks for knowledge transfer`
        },
        'Mercer': {
            icon: '🏛️',
            period: 'September 2016 - September 2021 (5 years 1 month)',
            role: 'Senior Software Engineer → Module Lead → DevOps Technical Lead',
            description: `Longest tenure — established and scaled DevOps practices.

Highlights:
• CI/CD for 70+ apps (Jenkins, Azure DevOps) with quality gates
• DevSecOps: SonarQube, OWASP ZAP, DefectDojo — significantly reduced security findings reaching production
• Cross-team standardization: shared Jenkins libraries and pipeline templates
• Mentored ~10 junior engineers; ARM templates & Azure release pipelines`
        },
        'Clavax': {
            icon: '💻',
            period: 'March 2014 - September 2016 (2 years 7 months)',
            role: 'System Administrator → Sr. System Administrator',
            description: `Hosting, GitLab, and ops for a software dev company.

Highlights:
• GitLab for 30+ developers — repos, CI runners, access control
• WHM/cPanel for 9+ client sites (~99.9% uptime); MySQL tuning & backups
• Bash automation (~2 hours/day manual work removed)
• Nagios/Zabbix monitoring; Linux (CentOS, Ubuntu, RHEL)`
        },
        'Aannya': {
            icon: '🚀',
            period: 'April 2013 - February 2014 (11 months)',
            role: 'System Engineer',
            description: `First role — call-center software, Linux & VoIP under SLA pressure.

Highlights:
• Asterisk-based VoIP for operations where downtime hit revenue
• On-site deployments: install, network, application setup
• Bash for maintenance & monitoring; incidents on night shifts & weekends
• Linux (CentOS, Ubuntu), Apache Tomcat, VoIP/SIP`
        }
    };

    const info = companies[company];
    if (info) {
        showMacModal(
            `${info.icon} ${company}`,
            `${info.role}\n${info.period}\n\n${info.description}`,
            info.icon
        );
    }
}

// ===== CALCULATOR APP =====
let calcCurrent = '0';
let calcPrevious = '';
let calcOperation = null;
let calcReset = false;

function calcUpdateDisplay() {
    const display = document.getElementById('calc-display');
    if (display) display.textContent = calcCurrent;
}

function calcDigit(d) {
    if (calcCurrent === '0' || calcReset) { calcCurrent = d; calcReset = false; }
    else if (calcCurrent.length < 15) calcCurrent += d;
    calcUpdateDisplay();
}

function calcDecimal() {
    if (calcReset) { calcCurrent = '0.'; calcReset = false; calcUpdateDisplay(); return; }
    if (!calcCurrent.includes('.')) calcCurrent += '.';
    calcUpdateDisplay();
}

function calcClear() {
    calcCurrent = '0'; calcPrevious = ''; calcOperation = null; calcReset = false;
    calcUpdateDisplay();
}

function calcToggleSign() {
    calcCurrent = String(-parseFloat(calcCurrent));
    calcUpdateDisplay();
}

function calcPercent() {
    calcCurrent = String(parseFloat(calcCurrent) / 100);
    calcUpdateDisplay();
}

function calcOp(op) {
    if (calcOperation && !calcReset) calcEquals();
    calcPrevious = calcCurrent;
    calcOperation = op;
    calcReset = true;
}

function calcEquals() {
    if (!calcOperation || !calcPrevious) return;
    const prev = parseFloat(calcPrevious);
    const curr = parseFloat(calcCurrent);
    let result;
    switch (calcOperation) {
        case '+': result = prev + curr; break;
        case '-': result = prev - curr; break;
        case '*': result = prev * curr; break;
        case '/': result = curr === 0 ? 'Error' : prev / curr; break;
    }
    calcCurrent = typeof result === 'number' ? String(Math.round(result * 1e10) / 1e10) : result;
    calcOperation = null;
    calcPrevious = '';
    calcReset = true;
    calcUpdateDisplay();
}

// ===== RESUME PDF DOWNLOAD =====
const downloadBtn = document.getElementById('download-resume-btn');
if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
        playClickSound();
        const resumeEl = document.querySelector('.resume-document');
        if (!resumeEl || typeof html2pdf === 'undefined') {
            showMacModal('Download', 'PDF generator is loading. Please try again in a moment.', '📄');
            return;
        }

        downloadBtn.textContent = 'Generating PDF...';
        downloadBtn.disabled = true;

        const opt = {
            margin: [10, 10, 10, 10],
            filename: 'Virendra_Kumar_Resume.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, letterRendering: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
            pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
        };

        const clone = resumeEl.cloneNode(true);
        const downloadSection = clone.querySelector('.resume-download');
        if (downloadSection) downloadSection.remove();

        clone.style.cssText = 'background:#fff!important;color:#1a1a1a!important;padding:36px 32px;max-width:780px;font-family:Inter,-apple-system,sans-serif;font-size:13px;line-height:1.5;';

        clone.querySelectorAll('*').forEach(el => {
            el.style.removeProperty('animation');
            el.style.removeProperty('transition');
            el.style.removeProperty('backdrop-filter');
            el.style.removeProperty('-webkit-backdrop-filter');
            el.style.removeProperty('filter');
            el.style.removeProperty('-webkit-background-clip');
            el.style.removeProperty('background-clip');
            el.style.removeProperty('-webkit-text-fill-color');
            el.style.opacity = '1';
            el.style.visibility = 'visible';
            var bg = getComputedStyle(el).background;
            if (!bg || bg === 'transparent' || bg.includes('gradient')) {
                el.style.background = 'transparent';
                el.style.backgroundImage = 'none';
            }
            el.style.color = el.style.color || '';
        });

        clone.querySelectorAll('h1').forEach(h => { h.style.cssText += ';color:#1A365D !important;font-size:24px;background:transparent !important;background-image:none !important;-webkit-text-fill-color:#1A365D !important;-webkit-background-clip:initial !important;'; });
        clone.querySelectorAll('h2').forEach(h => { h.style.cssText += ';color:#1A365D !important;font-size:14px;border-bottom:2px solid #2B6CB0;padding-bottom:4px;margin-top:16px;background:transparent !important;background-image:none !important;-webkit-text-fill-color:#1A365D !important;'; });
        clone.querySelectorAll('h3').forEach(h => { h.style.cssText += ';color:#1a1a1a !important;background:transparent !important;-webkit-text-fill-color:#1a1a1a !important;'; });
        clone.querySelectorAll('.resume-subtitle').forEach(s => { s.style.cssText += ';color:#2B6CB0 !important;font-size:13px;background:transparent !important;-webkit-text-fill-color:#2B6CB0 !important;'; });
        clone.querySelectorAll('.resume-contact span').forEach(s => {
            s.style.cssText += ';color:#555 !important;background:transparent !important;font-size:11px;-webkit-text-fill-color:#555 !important;';
        });
        clone.querySelectorAll('.resume-header').forEach(s => { s.style.cssText += ';background:transparent !important;border-bottom:1px solid #e0e0e0;padding-bottom:16px;margin-bottom:12px;'; });
        clone.querySelectorAll('.company').forEach(c => { c.style.cssText += ';color:#2B6CB0 !important;background:transparent !important;-webkit-text-fill-color:#2B6CB0 !important;'; });
        clone.querySelectorAll('.date').forEach(d => { d.style.cssText += ';color:#718096 !important;background:transparent !important;-webkit-text-fill-color:#718096 !important;'; });
        clone.querySelectorAll('li').forEach(l => { l.style.cssText += ';color:#333 !important;font-size:12px;background:transparent !important;-webkit-text-fill-color:#333 !important;'; });
        clone.querySelectorAll('p').forEach(p => { p.style.cssText += ';color:#333 !important;background:transparent !important;-webkit-text-fill-color:#333 !important;'; });
        clone.querySelectorAll('strong').forEach(s => { s.style.cssText += ';color:#1a1a1a !important;-webkit-text-fill-color:#1a1a1a !important;'; });
        clone.querySelectorAll('.resume-section').forEach(s => { s.style.cssText += ';background:transparent !important;margin-bottom:8px;'; });
        clone.querySelectorAll('.resume-item').forEach(s => { s.style.cssText += ';background:transparent !important;'; });

        clone.querySelectorAll('.resume-bento').forEach(g => {
            g.style.display = 'grid';
            g.style.gridTemplateColumns = 'repeat(4, 1fr)';
            g.style.gap = '6px';
            g.style.margin = '10px 0';
        });
        clone.querySelectorAll('.rb-card').forEach(c => {
            c.style.cssText = 'background:#eef2ff !important;border-radius:8px;padding:14px 10px;text-align:center;border:1px solid #d4dff7;opacity:1 !important;';
        });
        clone.querySelectorAll('.rb-num').forEach(n => { n.style.cssText = 'color:#1A365D !important;font-size:22px;font-weight:800;opacity:1 !important;'; });
        clone.querySelectorAll('.rb-label').forEach(l => { l.style.cssText = 'color:#555 !important;font-size:10px;opacity:1 !important;'; });
        clone.querySelectorAll('.rb-accent').forEach(c => { c.style.cssText = 'background:#1A365D !important;border-radius:8px;padding:14px 10px;text-align:center;border:none;opacity:1 !important;'; });
        clone.querySelectorAll('.rb-accent .rb-num, .rb-accent .rb-label').forEach(el => { el.style.cssText = 'color:#fff !important;opacity:1 !important;'; });
        clone.querySelectorAll('.rb-green').forEach(c => { c.style.cssText = 'background:#059669 !important;border-radius:8px;padding:14px 10px;text-align:center;border:none;opacity:1 !important;'; });
        clone.querySelectorAll('.rb-green .rb-num, .rb-green .rb-label').forEach(el => { el.style.cssText = 'color:#fff !important;opacity:1 !important;'; });
        clone.querySelectorAll('.certifications-list li').forEach(l => { l.style.color = '#333'; l.style.background = 'transparent'; });
        clone.querySelectorAll('ul').forEach(u => { u.style.background = 'transparent'; });

        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'position:fixed;top:0;left:-9999px;background:#fff;width:780px;z-index:-1;';
        wrapper.appendChild(clone);
        document.body.appendChild(wrapper);

        html2pdf().set(opt).from(clone).save().then(() => {
            wrapper.remove();
            downloadBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg> Download PDF`;
            downloadBtn.disabled = false;
        });
    });
}

// ===== SIDEBAR NAVIGATION =====
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
            if (skillsSection) skillsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else if (text === 'experience') {
            const expSection = Array.from(document.querySelectorAll('.about-section')).find(el =>
                el.querySelector('h2')?.textContent.includes('Experience Highlights')
            );
            if (expSection) expSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else if (text === 'about') {
            if (finderMain) finderMain.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });
});

// ===== LOGIN SCREEN BUTTON FUNCTIONALITY =====
const loginOptions = document.querySelectorAll('.login-option');
loginOptions.forEach((option, index) => {
    option.addEventListener('click', () => {
        playClickSound();
        if (index === 0) {
            showMacModal('System Preferences', 'Login settings would open here.', '⚙️');
        } else if (index === 1) {
            showMacModal('Keyboard & Language', 'Keyboard & language settings would open here.', '⌨️');
        }
    });
});

document.querySelector('.login-switch-user')?.addEventListener('click', () => {
    playClickSound();
    showMacModal('Switch User', 'In a real system, this would show other user accounts.', '👤');
});

// ===== V2: STICKY NOTES SYSTEM =====
var stickyNotes = [];
var stickyNextId = 1;

var stickyColorMap = {
    yellow: { bg: '#FFED8A', header: '#F5D547', text: '#5D4E00' },
    pink:   { bg: '#FFB8D1', header: '#FF8BB5', text: '#6B002E' },
    green:  { bg: '#B8F5B0', header: '#7EE875', text: '#1A4D15' },
    blue:   { bg: '#A8D8FF', header: '#6BB8F5', text: '#003366' },
    purple: { bg: '#D5B8FF', header: '#B48AFF', text: '#2D0060' },
    orange: { bg: '#FFD5A8', header: '#FFB86B', text: '#5A3000' }
};
var stickyDotColors = { yellow: '#F5D547', pink: '#FF8BB5', green: '#7EE875', blue: '#6BB8F5', purple: '#B48AFF', orange: '#FFB86B' };
var stickyColorNames = ['yellow', 'pink', 'green', 'blue', 'purple', 'orange'];

function createStickyNote(color) {
    color = color || 'yellow';
    var palette = stickyColorMap[color] || stickyColorMap.yellow;
    var id = 'sticky-' + (stickyNextId++);
    var vw = window.innerWidth, vh = window.innerHeight;
    var offsetX = Math.max(60, Math.floor(vw / 2 - 115 + (Math.random() - 0.5) * 320));
    var offsetY = Math.max(60, Math.floor(vh / 2 - 100 + (Math.random() - 0.5) * 260));

    var note = document.createElement('div');
    note.id = id;
    note.className = 'sticky-note';
    note.dataset.color = color;
    note.style.cssText = 'position:fixed;top:' + offsetY + 'px;left:' + offsetX + 'px;width:230px;min-height:200px;background:' + palette.bg + ';border-radius:6px;box-shadow:2px 4px 18px rgba(0,0,0,0.22);z-index:' + (++zIndexCounter) + ';font-family:"SF Pro Text",-apple-system,sans-serif;display:flex;flex-direction:column;';

    var header = document.createElement('div');
    header.style.cssText = 'background:' + palette.header + ';padding:7px 10px;border-radius:6px 6px 0 0;display:flex;align-items:center;justify-content:space-between;cursor:grab;user-select:none;';

    var colorStrip = document.createElement('div');
    colorStrip.style.cssText = 'display:flex;gap:5px;align-items:center;';
    stickyColorNames.forEach(function(cn) {
        var dot = document.createElement('div');
        dot.style.cssText = 'width:12px;height:12px;border-radius:50%;background:' + stickyDotColors[cn] + ';cursor:pointer;border:' + (cn === color ? '2px solid rgba(0,0,0,0.45)' : '1.5px solid rgba(0,0,0,0.15)') + ';transition:transform 0.12s;';
        dot.title = cn;
        dot.addEventListener('pointerdown', function(e) { e.stopPropagation(); });
        dot.addEventListener('click', function(e) {
            e.stopPropagation();
            var p = stickyColorMap[cn];
            note.dataset.color = cn;
            note.style.background = p.bg;
            header.style.background = p.header;
            content.style.color = p.text;
            var nd = stickyNotes.find(function(n) { return n.id === id; });
            if (nd) nd.color = cn;
            colorStrip.querySelectorAll('div').forEach(function(d) {
                d.style.border = (d.title === cn ? '2px solid rgba(0,0,0,0.45)' : '1.5px solid rgba(0,0,0,0.15)');
            });
            saveStickyNotes();
        });
        dot.addEventListener('mouseover', function() { dot.style.transform = 'scale(1.25)'; });
        dot.addEventListener('mouseout', function() { dot.style.transform = ''; });
        colorStrip.appendChild(dot);
    });
    header.appendChild(colorStrip);

    var closeBtn = document.createElement('div');
    closeBtn.style.cssText = 'width:18px;height:18px;border-radius:50%;background:rgba(0,0,0,0.18);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:11px;color:rgba(0,0,0,0.45);transition:background 0.15s;line-height:1;flex-shrink:0;';
    closeBtn.textContent = '×';
    closeBtn.addEventListener('mouseover', function() { closeBtn.style.background = '#ff3b30'; closeBtn.style.color = '#fff'; });
    closeBtn.addEventListener('mouseout', function() { closeBtn.style.background = 'rgba(0,0,0,0.18)'; closeBtn.style.color = 'rgba(0,0,0,0.45)'; });
    closeBtn.addEventListener('pointerdown', function(e) { e.stopPropagation(); });
    closeBtn.addEventListener('click', function(e) { e.stopPropagation(); deleteStickyNote(id); });
    header.appendChild(closeBtn);

    var content = document.createElement('div');
    content.contentEditable = 'true';
    content.style.cssText = 'flex:1;padding:10px 12px;font-size:13px;line-height:1.55;color:' + palette.text + ';outline:none;overflow-y:auto;min-height:130px;word-break:break-word;';
    content.textContent = 'New Note...';
    content.addEventListener('input', saveStickyNotes);
    content.addEventListener('focus', function() { if (content.textContent === 'New Note...') content.textContent = ''; });

    note.appendChild(header);
    note.appendChild(content);
    document.body.appendChild(note);

    var dragOffsetX = 0, dragOffsetY = 0, dragging = false;
    header.addEventListener('pointerdown', function(e) {
        dragging = true;
        dragOffsetX = e.clientX - note.getBoundingClientRect().left;
        dragOffsetY = e.clientY - note.getBoundingClientRect().top;
        note.style.zIndex = ++zIndexCounter;
        header.style.cursor = 'grabbing';
        header.setPointerCapture(e.pointerId);
    });
    header.addEventListener('pointermove', function(e) {
        if (!dragging) return;
        note.style.left = Math.max(0, e.clientX - dragOffsetX) + 'px';
        note.style.top = Math.max(0, e.clientY - dragOffsetY) + 'px';
    });
    header.addEventListener('pointerup', function(e) {
        dragging = false;
        header.style.cursor = 'grab';
        try { header.releasePointerCapture(e.pointerId); } catch (_) {}
        saveStickyNotes();
    });

    stickyNotes.push({ id: id, color: color, x: offsetX, y: offsetY, text: '' });
    saveStickyNotes();
    playClickSound();
    return note;
}

function deleteStickyNote(id) {
    var el = document.getElementById(id);
    if (el) {
        el.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
        el.style.opacity = '0';
        el.style.transform = 'scale(0.8)';
        setTimeout(function() { el.remove(); }, 200);
    }
    stickyNotes = stickyNotes.filter(function(n) { return n.id !== id; });
    saveStickyNotes();
}

function saveStickyNotes() {
    var data = stickyNotes.map(function(n) {
        var el = document.getElementById(n.id);
        if (!el) return n;
        var ce = el.querySelector('[contenteditable]');
        return {
            id: n.id,
            color: el.dataset.color || n.color,
            x: parseInt(el.style.left) || 0,
            y: parseInt(el.style.top) || 0,
            text: ce ? ce.textContent : ''
        };
    });
    try { localStorage.setItem('devos-sticky-notes', JSON.stringify(data)); } catch (_) {}
}

function loadStickyNotes() {
    try {
        var raw = localStorage.getItem('devos-sticky-notes');
        if (!raw) return;
        var data = JSON.parse(raw);
        if (!Array.isArray(data)) return;
        data.forEach(function(n) {
            var note = createStickyNote(n.color);
            if (note) {
                note.style.left = n.x + 'px';
                note.style.top = n.y + 'px';
                var ce = note.querySelector('[contenteditable]');
                if (ce && n.text) ce.textContent = n.text;
            }
        });
    } catch (_) {}
}

window.addEventListener('load', function() { setTimeout(loadStickyNotes, 2000); });

// Override: clicking sticky notes in dock creates a new note directly
window.addEventListener('load', function() {
    if (typeof openWindow === 'function') {
        var _base = openWindow;
        openWindow = function(name) {
            if (name === 'stickynotes') {
                createStickyNote('yellow');
                return;
            }
            _base(name);
        };
    }
});

// ===== V2: CODE EDITOR (VS Code / Cursor style with file browser, terminal, AI chat) =====
var codeEditorInitialized = false;

var codeFileTree = {
    'src': {
        type: 'folder', open: true, children: {
            'whoami.sh': { type: 'file', icon: '🐚', lang: 'Bash' },
            'ai_chat.py': { type: 'file', icon: '🐍', lang: 'Python' },
            'infra.tf': { type: 'file', icon: '🏗️', lang: 'Terraform' }
        }
    },
    '.github': {
        type: 'folder', open: false, children: {
            'deploy.yml': { type: 'file', icon: '🚀', lang: 'YAML' }
        }
    },
    'Dockerfile': { type: 'file', icon: '🐳', lang: 'Docker' },
    'README.md': { type: 'file', icon: '📖', lang: 'Markdown' }
};

var codeSamples = {
    'whoami.sh': { lang: 'Bash', code: '#!/bin/bash\n# ========================================\n#  whoami.sh — Virendra Kumar\n#  Senior Cloud DevOps Engineer II\n#  McKinsey & Company\n# ========================================\n\nNAME="Virendra Kumar"\nROLE="Senior Cloud DevOps Engineer II"\nCOMPANY="McKinsey & Company"\nEXPERIENCE="12+ years"\nLOCATION="Gurugram, India"\n\necho "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"\necho "  👋 Hello, I\'m $NAME"\necho "  💼 $ROLE @ $COMPANY"\necho "  📅 $EXPERIENCE in DevOps"\necho "  📍 $LOCATION"\necho "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"\n\n# Core Skills\ndeclare -A SKILLS=(\n  [Cloud]="Azure (30+ services), AWS"\n  [Containers]="Kubernetes, Docker, Helm, ArgoCD"\n  [IaC]="Terraform, Ansible"\n  [CI_CD]="GitHub Actions, Azure DevOps, GitLab CI"\n  [Data]="Databricks, PostgreSQL, Redis"\n  [Security]="SonarQube, JFrog Xray, Wiz, Gitleaks"\n  [Languages]="Bash, Python, Go, JavaScript"\n)\n\necho "\\n🛠️  Tech Stack:"\nfor category in "${!SKILLS[@]}"; do\n  printf "  %-12s → %s\\n" "$category" "${SKILLS[$category]}"\ndone\n\n# Impact\necho "\\n🏆 Key Achievements:"\necho "  • 75% faster deployments (CI/CD redesign)"\necho "  • \\$100K+ annual cloud savings"\necho "  • 15+ zero-downtime migrations"\necho "  • SOC2 compliance — zero critical findings"\necho "  • 14+ active certifications"\n\necho "\\n🔗 Links:"\necho "  GitHub:   github.com/virnahar"\necho "  LinkedIn: linkedin.com/in/virnahar"\necho "  Web:      virnahar.github.io"\n\necho "\\n✨ \\"Debugging Life One Commit at a Time...\\""\nexit 0' },

    'ai_chat.py': { lang: 'Python', code: '"""AI Portfolio Chat — Talk to Virendra\'s Resume\n\nAn AI-powered chatbot that answers questions about\nVirendra Kumar\'s experience, skills, and projects.\nPowered by LangChain + OpenAI.\n"""\nimport os\nfrom langchain.chat_models import ChatOpenAI\nfrom langchain.prompts import ChatPromptTemplate\nfrom langchain.memory import ConversationBufferMemory\n\nSYSTEM_PROMPT = """\nYou are an AI assistant for Virendra Kumar\'s portfolio.\nVirendra is a Senior Cloud DevOps Engineer II at McKinsey\nwith 12+ years of experience.\n\nKey facts:\n- Cloud: Azure (30+ services), AWS, Kubernetes, Terraform\n- CI/CD: GitHub Actions, Azure DevOps, ArgoCD\n- Impact: 75% faster deploys, $100K+ savings, SOC2 compliant\n- Certs: Azure DevOps Expert, Terraform Associate, RHCSA,\n         Databricks Architect, 14+ total\n- Career: McKinsey → Accenture → Mercer → Clavax → Aannya\n\nAnswer naturally. Be concise. Use bullet points.\n"""\n\ndef create_chat():\n    llm = ChatOpenAI(\n        model="gpt-4o-mini",\n        temperature=0.7,\n        api_key=os.getenv("OPENAI_API_KEY")\n    )\n\n    prompt = ChatPromptTemplate.from_messages([\n        ("system", SYSTEM_PROMPT),\n        ("human", "{input}")\n    ])\n\n    memory = ConversationBufferMemory(return_messages=True)\n    chain = prompt | llm\n    return chain, memory\n\ndef main():\n    chain, memory = create_chat()\n    print("🤖 Virendra\'s AI Portfolio Chat")\n    print("   Type \'quit\' to exit\\n")\n\n    while True:\n        user_input = input("You: ").strip()\n        if user_input.lower() in ("quit", "exit"):\n            print("\\n👋 Thanks for chatting!")\n            break\n\n        response = chain.invoke({"input": user_input})\n        print(f"\\nAI: {response.content}\\n")\n\nif __name__ == "__main__":\n    main()' },

    'infra.tf': { lang: 'Terraform', code: '# ============================================\n# Azure Kubernetes Service — Production Cluster\n# Author: Virendra Kumar\n# ============================================\n\nresource "azurerm_kubernetes_cluster" "aks" {\n  name                = "devos-aks-${var.environment}"\n  location            = azurerm_resource_group.rg.location\n  resource_group_name = azurerm_resource_group.rg.name\n  dns_prefix          = "devos-${var.environment}"\n  kubernetes_version  = var.kubernetes_version\n\n  default_node_pool {\n    name                = "system"\n    node_count          = var.node_count\n    vm_size             = "Standard_D4s_v3"\n    os_disk_size_gb     = 128\n    vnet_subnet_id      = azurerm_subnet.aks.id\n    enable_auto_scaling = true\n    min_count           = 2\n    max_count           = 10\n    zones               = [1, 2, 3]\n  }\n\n  identity {\n    type = "SystemAssigned"\n  }\n\n  network_profile {\n    network_plugin    = "azure"\n    load_balancer_sku = "standard"\n    network_policy    = "calico"\n  }\n\n  oms_agent {\n    log_analytics_workspace_id = azurerm_log_analytics_workspace.logs.id\n  }\n\n  tags = var.common_tags\n}\n\nresource "azurerm_container_registry" "acr" {\n  name                = "devosacr${var.environment}"\n  resource_group_name = azurerm_resource_group.rg.name\n  location            = azurerm_resource_group.rg.location\n  sku                 = "Premium"\n  admin_enabled       = false\n\n  georeplications {\n    location = "westeurope"\n  }\n}' },

    'deploy.yml': { lang: 'YAML', code: 'name: Deploy to AKS\non:\n  push:\n    branches: [main]\n  workflow_dispatch:\n\nenv:\n  ACR_NAME: devosacr\n  AKS_CLUSTER: devos-aks-prod\n  RESOURCE_GROUP: devos-rg-prod\n\njobs:\n  build-and-deploy:\n    runs-on: ubuntu-latest\n    permissions:\n      id-token: write\n      contents: read\n    steps:\n      - uses: actions/checkout@v4\n\n      - name: Azure Login (OIDC)\n        uses: azure/login@v2\n        with:\n          client-id: ${{ secrets.AZURE_CLIENT_ID }}\n          tenant-id: ${{ secrets.AZURE_TENANT_ID }}\n          subscription-id: ${{ secrets.AZURE_SUB_ID }}\n\n      - name: Build & Push to ACR\n        run: |\n          az acr build \\\n            --registry $ACR_NAME \\\n            --image app:${{ github.sha }} .\n\n      - name: Deploy to AKS\n        uses: azure/k8s-deploy@v5\n        with:\n          manifests: k8s/\n          images: ${{ env.ACR_NAME }}.azurecr.io/app:${{ github.sha }}\n          namespace: production' },

    'Dockerfile': { lang: 'Docker', code: 'FROM python:3.12-slim AS builder\nWORKDIR /app\nCOPY requirements.txt .\nRUN pip install --no-cache-dir --user -r requirements.txt\n\nFROM python:3.12-slim\nRUN groupadd -r appuser && useradd -r -g appuser appuser\nWORKDIR /app\nCOPY --from=builder /root/.local /root/.local\nCOPY . .\n\nENV PATH=/root/.local/bin:$PATH\nENV PYTHONUNBUFFERED=1\nEXPOSE 8000\n\nHEALTHCHECK --interval=30s --timeout=5s --retries=3 \\\n  CMD curl -f http://localhost:8000/healthz || exit 1\n\nUSER appuser\nCMD ["gunicorn", "app:create_app()", \\\n     "--bind", "0.0.0.0:8000", \\\n     "--workers", "4", \\\n     "--worker-class", "uvicorn.workers.UvicornWorker"]' },

    'README.md': { lang: 'Markdown', code: '# DevOS — Virendra Kumar\'s Portfolio\n\n> A macOS-style interactive portfolio built with vanilla HTML, CSS & JavaScript.\n\n## ✨ Features\n\n- 🖥️ Full macOS desktop simulation\n- 💻 Interactive terminal with 20+ commands\n- 🎮 7 playable games with sound effects\n- 📝 Notes app with localStorage persistence\n- 👨‍💻 Code editor with real DevOps samples\n- 🗒️ Draggable sticky notes\n- 🎵 Music player with embedded streaming\n- 🌓 Dark mode + 7 wallpapers\n- 📱 PWA — installable on mobile\n- ♿ Accessible — keyboard navigation\n\n## 🚀 Quick Start\n\n```bash\ngit clone https://github.com/virnahar/virnahar.github.io\ncd virnahar.github.io/DevOs\nopen index.html\n```\n\n## 🛠️ Tech Stack\n\n| Layer | Technology |\n|-------|------------|\n| Frontend | Vanilla HTML/CSS/JS |\n| Terminal | jQuery Terminal |\n| Audio | Web Audio API |\n| Hosting | GitHub Pages |\n| PWA | Service Worker |\n\n## 👤 Author\n\n**Virendra Kumar**\n- LinkedIn: [/in/virnahar](https://linkedin.com/in/virnahar)\n- GitHub: [@virnahar](https://github.com/virnahar)\n\n---\n*Built with ❤️ and way too much CSS*' }
};

function initCodeEditor() {
    if (codeEditorInitialized) return;
    codeEditorInitialized = true;

    var container = document.querySelector('#codeeditor-window .window-content');
    if (!container) return;

    container.innerHTML = '';
    container.style.cssText = 'display:flex;height:100%;background:#1e1e1e;color:#d4d4d4;font-family:"JetBrains Mono","Fira Code","SF Mono",monospace;overflow:hidden;font-size:13px;';

    var activeFile = 'whoami.sh';

    // === FILE BROWSER PANEL (LEFT 200px) ===
    var fileBrowser = document.createElement('div');
    fileBrowser.style.cssText = 'width:200px;background:#252526;border-right:1px solid #3c3c3c;display:flex;flex-direction:column;flex-shrink:0;overflow-y:auto;';

    var fbHeader = document.createElement('div');
    fbHeader.style.cssText = 'padding:10px 12px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#888;border-bottom:1px solid #3c3c3c;font-family:-apple-system,sans-serif;';
    fbHeader.textContent = 'EXPLORER';
    fileBrowser.appendChild(fbHeader);

    var fbProject = document.createElement('div');
    fbProject.style.cssText = 'padding:6px 12px;font-size:11px;font-weight:700;color:#ccc;font-family:-apple-system,sans-serif;';
    fbProject.textContent = '▾ DEVOS-PORTFOLIO';
    fileBrowser.appendChild(fbProject);

    function renderTree(tree, parent, depth) {
        var keys = Object.keys(tree);
        keys.forEach(function(name) {
            var node = tree[name];
            var item = document.createElement('div');
            var pad = 12 + depth * 16;
            if (node.type === 'folder') {
                item.style.cssText = 'padding:4px 8px 4px ' + pad + 'px;font-size:12px;cursor:pointer;color:#ccc;user-select:none;font-family:-apple-system,sans-serif;';
                item.textContent = (node.open ? '▾ ' : '▸ ') + '📁 ' + name;
                item.addEventListener('click', function() { node.open = !node.open; rebuildTree(); });
                parent.appendChild(item);
                if (node.open && node.children) renderTree(node.children, parent, depth + 1);
            } else {
                item.style.cssText = 'padding:4px 8px 4px ' + pad + 'px;font-size:12px;cursor:pointer;color:#bbb;transition:background 0.1s;border-radius:3px;margin:1px 4px;font-family:-apple-system,sans-serif;';
                item.dataset.file = name;
                if (name === activeFile) { item.style.background = '#37373d'; item.style.color = '#fff'; }
                item.textContent = (node.icon || '📄') + ' ' + name;
                item.addEventListener('click', function() { switchFile(name); });
                item.addEventListener('mouseover', function() { if (name !== activeFile) item.style.background = '#2a2d2e'; });
                item.addEventListener('mouseout', function() { if (name !== activeFile) item.style.background = ''; });
                parent.appendChild(item);
            }
        });
    }

    var fbTree = document.createElement('div');
    fbTree.style.cssText = 'padding:4px 0;';
    fileBrowser.appendChild(fbTree);

    function rebuildTree() { fbTree.innerHTML = ''; renderTree(codeFileTree, fbTree, 1); }
    rebuildTree();

    // === CENTER COLUMN (editor + terminal) ===
    var centerCol = document.createElement('div');
    centerCol.style.cssText = 'flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0;';

    // Tab bar
    var tabBar = document.createElement('div');
    tabBar.style.cssText = 'display:flex;background:#252526;border-bottom:1px solid #3c3c3c;flex-shrink:0;overflow-x:auto;height:36px;align-items:stretch;';
    centerCol.appendChild(tabBar);

    var openTabs = ['whoami.sh'];

    function renderTabs() {
        tabBar.innerHTML = '';
        openTabs.forEach(function(file) {
            var sample = codeSamples[file];
            if (!sample) return;
            var tab = document.createElement('div');
            var isActive = file === activeFile;
            tab.style.cssText = 'padding:0 14px;font-size:12px;cursor:pointer;border-right:1px solid #3c3c3c;display:flex;align-items:center;gap:6px;white-space:nowrap;background:' + (isActive ? '#1e1e1e' : '#2d2d2d') + ';color:' + (isActive ? '#fff' : '#969696') + ';position:relative;font-family:-apple-system,sans-serif;';
            if (isActive) tab.style.borderBottom = '2px solid #007acc';
            tab.innerHTML = file;
            tab.addEventListener('click', function() { switchFile(file); });
            tabBar.appendChild(tab);
        });
    }

    // Editor body (line numbers + textarea)
    var editorBody = document.createElement('div');
    editorBody.style.cssText = 'flex:1;display:flex;overflow:hidden;';

    var lineNums = document.createElement('div');
    lineNums.style.cssText = 'padding:12px 10px 12px 16px;text-align:right;color:#5a5a5a;font-size:13px;line-height:1.6;user-select:none;flex-shrink:0;min-width:44px;background:#1e1e1e;border-right:1px solid #2d2d2d;';

    var editorArea = document.createElement('textarea');
    editorArea.spellcheck = false;
    editorArea.style.cssText = 'flex:1;padding:12px 16px;background:#1e1e1e;color:#d4d4d4;border:none;outline:none;font-family:inherit;font-size:13px;line-height:1.6;resize:none;tab-size:2;white-space:pre;overflow:auto;';
    editorArea.addEventListener('input', updateLineNumbers);
    editorArea.addEventListener('scroll', function() { lineNums.scrollTop = editorArea.scrollTop; });
    editorArea.addEventListener('keydown', function(e) {
        if (e.key === 'Tab') {
            e.preventDefault();
            var s = editorArea.selectionStart, end = editorArea.selectionEnd;
            editorArea.value = editorArea.value.substring(0, s) + '  ' + editorArea.value.substring(end);
            editorArea.selectionStart = editorArea.selectionEnd = s + 2;
        }
    });

    editorBody.appendChild(lineNums);
    editorBody.appendChild(editorArea);
    centerCol.appendChild(editorBody);

    // === TERMINAL PANEL (BOTTOM 150px) ===
    var termPanel = document.createElement('div');
    termPanel.style.cssText = 'height:150px;flex-shrink:0;border-top:1px solid #3c3c3c;display:flex;flex-direction:column;background:#0d1117;';

    var termTabBar = document.createElement('div');
    termTabBar.style.cssText = 'display:flex;align-items:center;height:30px;background:#1a1a2e;border-bottom:1px solid #2d2d2d;padding:0 10px;gap:2px;flex-shrink:0;';

    var termTabTerminal = document.createElement('div');
    termTabTerminal.style.cssText = 'padding:4px 12px;font-size:11px;color:#fff;background:#0d1117;border-radius:4px 4px 0 0;cursor:pointer;font-family:-apple-system,sans-serif;border-bottom:2px solid #007acc;';
    termTabTerminal.textContent = 'TERMINAL';

    var termTabProblems = document.createElement('div');
    termTabProblems.style.cssText = 'padding:4px 12px;font-size:11px;color:#888;cursor:pointer;font-family:-apple-system,sans-serif;';
    termTabProblems.textContent = 'PROBLEMS';

    termTabBar.appendChild(termTabTerminal);
    termTabBar.appendChild(termTabProblems);
    termPanel.appendChild(termTabBar);

    var termContent = document.createElement('div');
    termContent.style.cssText = 'flex:1;padding:8px 12px;font-family:"JetBrains Mono","Fira Code","SF Mono",monospace;font-size:12px;color:#4ade80;overflow-y:auto;line-height:1.5;white-space:pre;';
    termContent.textContent = 'vir@devos:~/portfolio$ terraform plan\nRefreshing Terraform state in-memory prior to plan...\n\n\x1b[0mPlan: 3 to add, 1 to change, 0 to destroy.\n\nvir@devos:~/portfolio$ _';
    termPanel.appendChild(termContent);
    centerCol.appendChild(termPanel);

    // Status bar
    var statusBar = document.createElement('div');
    statusBar.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:3px 14px;background:#007acc;color:#fff;font-size:11px;flex-shrink:0;font-family:-apple-system,sans-serif;';
    statusBar.innerHTML = '<span>✓ Ready</span><span id="ce-lang">Bash</span><span>UTF-8 · LF · Spaces: 2</span>';
    centerCol.appendChild(statusBar);

    // === AI CHAT PANEL (RIGHT 280px) ===
    var aiResponses = {
        'Explain this code': {
            'whoami.sh': 'This Bash script is a creative self-introduction. It uses associative arrays to store your tech stack, printf for formatted output, and echo for key achievements. The shebang line ensures it runs in Bash.',
            'ai_chat.py': 'This Python script creates an AI-powered portfolio chatbot using LangChain. It uses ChatOpenAI with GPT-4o-mini, a system prompt with your career details, and ConversationBufferMemory for chat history.',
            'default': 'This code demonstrates DevOps best practices including infrastructure-as-code patterns, container orchestration, and CI/CD automation.'
        },
        'How to optimize?': {
            'whoami.sh': 'Consider using a here-document for the multi-line output, adding color codes with tput for terminal compatibility, and caching the associative array iteration.',
            'ai_chat.py': 'Add streaming responses for better UX, implement RAG with your actual resume/projects as vector embeddings, add rate limiting, and cache common questions.',
            'default': 'Consider adding caching layers, implementing retry logic, using async patterns where possible, and adding comprehensive error handling.'
        },
        'Add error handling': {
            'whoami.sh': 'Add set -euo pipefail at the top, wrap external commands in if blocks, add trap for cleanup on exit, and validate environment variables before use.',
            'ai_chat.py': 'Wrap API calls in try/except with specific exception types (RateLimitError, AuthError), add retry with exponential backoff, validate input length, and add graceful shutdown handling.',
            'default': 'Add try-catch blocks around external calls, implement retry logic with backoff, validate inputs, log errors with context, and add health check endpoints.'
        }
    };
    var aiChatHistory = [];

    var aiPanel = document.createElement('div');
    aiPanel.style.cssText = 'width:280px;background:#1a1a2e;border-left:1px solid #2d2d3d;display:flex;flex-direction:column;flex-shrink:0;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text",sans-serif;';

    var aiHeader = document.createElement('div');
    aiHeader.style.cssText = 'padding:12px 16px;font-size:13px;font-weight:700;color:#e2e8f0;border-bottom:1px solid #2d2d3d;display:flex;align-items:center;gap:8px;flex-shrink:0;';
    aiHeader.innerHTML = '<span style="font-size:16px;">✨</span> AI Assistant';
    aiPanel.appendChild(aiHeader);

    var aiChat = document.createElement('div');
    aiChat.style.cssText = 'flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:10px;';

    function addChatBubble(role, text) {
        var bubble = document.createElement('div');
        if (role === 'user') {
            bubble.style.cssText = 'align-self:flex-end;background:#3b3f8c;color:#e2e8f0;padding:8px 12px;border-radius:12px 12px 2px 12px;font-size:12.5px;line-height:1.5;max-width:90%;';
        } else {
            bubble.style.cssText = 'align-self:flex-start;background:#262640;color:#c8ccd4;padding:10px 12px;border-radius:12px 12px 12px 2px;font-size:12.5px;line-height:1.55;max-width:95%;border:1px solid #2d2d4a;';
        }
        bubble.textContent = text;
        aiChat.appendChild(bubble);
        aiChatHistory.push({ role: role, text: text });
        aiChat.scrollTop = aiChat.scrollHeight;
        return bubble;
    }

    addChatBubble('user', 'Explain this Terraform code');
    addChatBubble('ai', 'This Terraform configuration creates an Azure Kubernetes Service (AKS) cluster with auto-scaling, system-assigned identity, Calico network policy, and Log Analytics monitoring. It\'s configured for high availability across 3 zones.');
    addChatBubble('user', 'How do I add a node pool?');

    var chipContainer = document.createElement('div');
    chipContainer.style.cssText = 'padding:8px 12px;display:flex;flex-wrap:wrap;gap:6px;flex-shrink:0;border-top:1px solid #2d2d3d;';

    var chipLabels = ['Explain this code', 'How to optimize?', 'Add error handling'];
    chipLabels.forEach(function(label) {
        var chip = document.createElement('button');
        chip.style.cssText = 'padding:5px 10px;border-radius:14px;border:1px solid #3d3d5c;background:#1e1e3a;color:#a0a0d0;font-size:11px;cursor:pointer;transition:all 0.15s;font-family:inherit;white-space:nowrap;';
        chip.textContent = label;
        chip.addEventListener('mouseover', function() { chip.style.background = '#2a2a50'; chip.style.color = '#c0c0f0'; chip.style.borderColor = '#5555aa'; });
        chip.addEventListener('mouseout', function() { chip.style.background = '#1e1e3a'; chip.style.color = '#a0a0d0'; chip.style.borderColor = '#3d3d5c'; });
        chip.addEventListener('click', function() { handleAiQuery(label); });
        chipContainer.appendChild(chip);
    });

    aiPanel.appendChild(aiChat);
    aiPanel.appendChild(chipContainer);

    function handleAiQuery(query) {
        addChatBubble('user', query);
        var typing = addChatBubble('ai', '...');
        typing.style.fontStyle = 'italic';
        typing.style.color = '#666';

        setTimeout(function() {
            var responseMap = aiResponses[query];
            var responseText;
            if (responseMap) {
                responseText = responseMap[activeFile] || responseMap['default'];
            } else {
                responseText = 'That\'s a great question about ' + activeFile + '! This file follows DevOps best practices. I\'d recommend reviewing the documentation and considering automated testing for any changes.';
            }
            typing.textContent = responseText;
            typing.style.fontStyle = '';
            typing.style.color = '#c8ccd4';
            aiChat.scrollTop = aiChat.scrollHeight;
        }, 500);
    }

    var aiInput = document.createElement('div');
    aiInput.style.cssText = 'padding:10px 12px;border-top:1px solid #2d2d3d;flex-shrink:0;';
    var aiInputBox = document.createElement('input');
    aiInputBox.type = 'text';
    aiInputBox.placeholder = 'Ask AI about this code...';
    aiInputBox.style.cssText = 'width:100%;padding:8px 12px;border-radius:8px;border:1px solid #3d3d5c;background:#12121f;color:#e2e8f0;font-size:12px;outline:none;font-family:inherit;box-sizing:border-box;transition:border-color 0.15s;';
    aiInputBox.addEventListener('focus', function() { aiInputBox.style.borderColor = '#5555aa'; });
    aiInputBox.addEventListener('blur', function() { aiInputBox.style.borderColor = '#3d3d5c'; });
    aiInputBox.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            var query = aiInputBox.value.trim();
            if (!query) return;
            aiInputBox.value = '';
            handleAiQuery(query);
        }
    });
    aiInput.appendChild(aiInputBox);
    aiPanel.appendChild(aiInput);

    // Assemble layout
    container.appendChild(fileBrowser);
    container.appendChild(centerCol);
    container.appendChild(aiPanel);

    function switchFile(file) {
        var sample = codeSamples[file];
        if (!sample) return;
        activeFile = file;
        if (openTabs.indexOf(file) === -1) openTabs.push(file);
        editorArea.value = sample.code;
        updateLineNumbers();
        var lang = document.getElementById('ce-lang');
        if (lang) lang.textContent = sample.lang;
        renderTabs();
        rebuildTree();
    }

    function updateLineNumbers() {
        var lines = editorArea.value.split('\n').length;
        var html = '';
        for (var i = 1; i <= lines; i++) html += '<div style="line-height:1.6;">' + i + '</div>';
        lineNums.innerHTML = html;
    }

    switchFile('whoami.sh');
}

// ===== V2: NOTES APP (Always dark — Bear / Apple Notes style) =====
var notesAppInitialized = false;
var notesData = [];
var activeNoteId = null;

function initNotesApp() {
    if (notesAppInitialized) return;
    notesAppInitialized = true;

    var container = document.querySelector('#notes-window .window-content');
    if (!container) return;

    container.innerHTML = '';
    container.style.cssText = 'display:flex;height:100%;font-family:"SF Pro Text",-apple-system,BlinkMacSystemFont,sans-serif;overflow:hidden;background:#1c1c1e;';

    try {
        var saved = localStorage.getItem('devos-notes');
        if (saved) notesData = JSON.parse(saved);
    } catch (_) {}

    if (notesData.length === 0) {
        notesData = [
            { id: 'note-welcome', title: 'Welcome to Notes', content: "Welcome to DevOS Notes!\n\nThis is a macOS-style Notes app. You can:\n\n• Create new notes with the + button\n• Edit title and content in the right panel\n• Delete notes with the trash icon\n• All notes auto-save to localStorage\n\nTry creating a new note!", updated: Date.now() },
            { id: 'note-devops', title: 'DevOps Cheatsheet', content: "Kubernetes:\n  kubectl get pods -A\n  kubectl logs -f <pod>\n  kubectl rollout restart deploy/<name>\n\nDocker:\n  docker build -t app:latest .\n  docker compose up -d\n  docker system prune -af\n\nTerraform:\n  terraform init\n  terraform plan -out=plan.tfplan\n  terraform apply plan.tfplan\n\nGit:\n  git rebase -i HEAD~3\n  git cherry-pick <sha>", updated: Date.now() - 86400000 },
            { id: 'note-ideas', title: 'Project Ideas', content: "Portfolio:\n1. AI chatbot for resume Q&A\n2. Real-time analytics dashboard\n3. WebGL background effects\n4. Multi-language i18n\n5. GitHub Actions auto-deploy\n\nPersonal:\n- Photography gallery\n- Reading list tracker\n- Blog with MDX", updated: Date.now() - 172800000 }
        ];
    }

    // === LEFT SIDEBAR (220px) ===
    var sidebar = document.createElement('div');
    sidebar.style.cssText = 'width:220px;background:#1c1c1e;border-right:1px solid rgba(255,255,255,0.06);display:flex;flex-direction:column;flex-shrink:0;';

    var sidebarHeader = document.createElement('div');
    sidebarHeader.style.cssText = 'padding:14px 12px 10px;display:flex;justify-content:space-between;align-items:center;';

    var sidebarTitle = document.createElement('div');
    sidebarTitle.style.cssText = 'font-size:15px;font-weight:700;color:#f5f5f7;letter-spacing:-0.01em;';
    sidebarTitle.textContent = 'Notes';

    var btnGroup = document.createElement('div');
    btnGroup.style.cssText = 'display:flex;gap:6px;';

    var addBtn = document.createElement('button');
    addBtn.style.cssText = 'width:26px;height:26px;border-radius:6px;border:none;background:#e8a820;color:#1c1c1e;font-size:17px;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1;font-weight:700;';
    addBtn.textContent = '+';
    addBtn.title = 'New Note';
    addBtn.addEventListener('click', function() { createNote(); });

    var delBtn = document.createElement('button');
    delBtn.style.cssText = 'width:26px;height:26px;border-radius:6px;border:none;background:rgba(255,59,48,0.18);color:#ff453a;font-size:12px;cursor:pointer;display:flex;align-items:center;justify-content:center;';
    delBtn.textContent = '🗑';
    delBtn.addEventListener('click', function() { deleteActiveNote(); });

    btnGroup.appendChild(addBtn);
    btnGroup.appendChild(delBtn);
    sidebarHeader.appendChild(sidebarTitle);
    sidebarHeader.appendChild(btnGroup);
    sidebar.appendChild(sidebarHeader);

    var searchWrap = document.createElement('div');
    searchWrap.style.cssText = 'padding:0 10px 10px;';
    var searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search';
    searchInput.style.cssText = 'width:100%;padding:6px 10px;border-radius:8px;border:none;background:#2c2c2e;color:#98989d;font-size:12px;outline:none;box-sizing:border-box;font-family:inherit;';
    searchInput.addEventListener('input', function() { renderNoteList(searchInput.value.trim().toLowerCase()); });
    searchWrap.appendChild(searchInput);
    sidebar.appendChild(searchWrap);

    var noteList = document.createElement('div');
    noteList.id = 'notes-list';
    noteList.style.cssText = 'flex:1;overflow-y:auto;padding:2px 0;';
    sidebar.appendChild(noteList);

    // === RIGHT EDITOR ===
    var editor = document.createElement('div');
    editor.style.cssText = 'flex:1;display:flex;flex-direction:column;background:#1c1c1e;';

    var editorHeader = document.createElement('div');
    editorHeader.style.cssText = 'padding:18px 22px 10px;';

    var titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.placeholder = 'Note Title';
    titleInput.style.cssText = 'width:100%;border:none;outline:none;font-size:24px;font-weight:700;background:transparent;color:#f5f5f7;letter-spacing:-0.02em;font-family:inherit;';
    titleInput.addEventListener('input', function() { saveActiveNote(); });
    editorHeader.appendChild(titleInput);

    var dateLabel = document.createElement('div');
    dateLabel.style.cssText = 'font-size:11px;color:#636366;margin-top:6px;';
    editorHeader.appendChild(dateLabel);

    var editorBody = document.createElement('textarea');
    editorBody.placeholder = 'Start writing...';
    editorBody.style.cssText = 'flex:1;padding:14px 22px 22px;border:none;outline:none;font-size:15px;line-height:1.7;resize:none;background:transparent;color:#e5e5ea;font-family:"SF Pro Text",-apple-system,BlinkMacSystemFont,sans-serif;';
    editorBody.addEventListener('input', function() { saveActiveNote(); });

    editor.appendChild(editorHeader);
    editor.appendChild(editorBody);
    container.appendChild(sidebar);
    container.appendChild(editor);

    function renderNoteList(filter) {
        noteList.innerHTML = '';
        var sorted = notesData.slice().sort(function(a, b) { return b.updated - a.updated; });
        sorted.forEach(function(note) {
            if (filter && note.title.toLowerCase().indexOf(filter) === -1 && note.content.toLowerCase().indexOf(filter) === -1) return;
            var item = document.createElement('div');
            var isActive = note.id === activeNoteId;
            item.style.cssText = 'padding:9px 12px;cursor:pointer;margin:1px 6px;border-radius:6px;transition:background 0.12s;border-left:3px solid ' + (isActive ? '#e8a820' : 'transparent') + ';' + (isActive ? 'background:rgba(232,168,32,0.12);' : '');
            item.addEventListener('mouseover', function() { if (!isActive) item.style.background = 'rgba(255,255,255,0.04)'; });
            item.addEventListener('mouseout', function() { if (!isActive) item.style.background = ''; });

            var t = document.createElement('div');
            t.style.cssText = 'font-size:14px;font-weight:600;color:#f5f5f7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
            t.textContent = note.title || 'Untitled';

            var preview = document.createElement('div');
            preview.style.cssText = 'font-size:12px;color:#98989d;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
            preview.textContent = note.content.substring(0, 55);

            var date = document.createElement('div');
            date.style.cssText = 'font-size:11px;color:#48484a;margin-top:2px;';
            date.textContent = new Date(note.updated).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

            item.appendChild(t);
            item.appendChild(preview);
            item.appendChild(date);
            item.addEventListener('click', function() { selectNote(note.id); });
            noteList.appendChild(item);
        });
    }

    function selectNote(id) {
        activeNoteId = id;
        var note = notesData.find(function(n) { return n.id === id; });
        if (!note) return;
        titleInput.value = note.title;
        editorBody.value = note.content;
        dateLabel.textContent = new Date(note.updated).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        renderNoteList(searchInput.value.trim().toLowerCase());
    }

    function saveActiveNote() {
        if (!activeNoteId) return;
        var note = notesData.find(function(n) { return n.id === activeNoteId; });
        if (!note) return;
        note.title = titleInput.value;
        note.content = editorBody.value;
        note.updated = Date.now();
        try { localStorage.setItem('devos-notes', JSON.stringify(notesData)); } catch (_) {}
        renderNoteList(searchInput.value.trim().toLowerCase());
    }

    function createNote() {
        var id = 'note-' + Date.now();
        notesData.unshift({ id: id, title: 'New Note', content: '', updated: Date.now() });
        selectNote(id);
        titleInput.focus();
        titleInput.select();
        try { localStorage.setItem('devos-notes', JSON.stringify(notesData)); } catch (_) {}
        playClickSound();
    }

    function deleteActiveNote() {
        if (!activeNoteId) return;
        notesData = notesData.filter(function(n) { return n.id !== activeNoteId; });
        activeNoteId = notesData.length > 0 ? notesData[0].id : null;
        if (activeNoteId) selectNote(activeNoteId);
        else { titleInput.value = ''; editorBody.value = ''; dateLabel.textContent = ''; }
        try { localStorage.setItem('devos-notes', JSON.stringify(notesData)); } catch (_) {}
        renderNoteList(searchInput.value.trim().toLowerCase());
        playClickSound();
    }

    renderNoteList();
    if (notesData.length > 0) selectNote(notesData[0].id);
}

// ===== CONTACT FORM — Fun Submit Animation =====
document.addEventListener('click', function(e) {
    var btn = e.target.closest('#contact-submit-btn');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    handleContactSubmit();
});

function handleContactSubmit() {
    var btn = document.getElementById('contact-submit-btn');
    var form = document.getElementById('contact-form');
    if (!btn || !form) return;

    var name = form.querySelector('#name').value.trim();
    btn.disabled = true;
    btn.style.transition = 'all 0.3s ease';
    btn.style.background = '#ff9500';
    btn.textContent = 'Sending...';

    if (typeof playClickSound === 'function') playClickSound();

    setTimeout(function() {
        btn.style.background = '#34c759';
        btn.textContent = '✓ Sent!';

        setTimeout(function() {
            var section = form.closest('.contact-form-section');
            if (!section) return;

            var messages = [
                "Thanks " + (name || "friend") + "! Your message flew into the void... but I saw it! 🚀",
                "Message received! Well, almost. My inbox is still in terraform plan mode. 📋",
                "Got it! I'll reply faster than a kubectl rollout restart... someday. ⎈",
                "Your message is queued! ETA: right after my next coffee break. ☕",
                "Delivered! Now waiting in my priority queue... right behind 47 Jira tickets. 📝"
            ];
            var msg = messages[Math.floor(Math.random() * messages.length)];

            section.style.transition = 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
            section.style.opacity = '0';
            section.style.transform = 'scale(0.95) translateY(10px)';

            setTimeout(function() {
                section.innerHTML = '<div style="text-align:center;padding:60px 20px;">' +
                    '<div style="font-size:64px;margin-bottom:20px;animation:springIn 0.5s ease;">✉️</div>' +
                    '<h2 style="font-size:22px;font-weight:700;margin-bottom:12px;">Message Sent!</h2>' +
                    '<p style="font-size:15px;color:#888;line-height:1.6;max-width:400px;margin:0 auto 24px;">' + msg + '</p>' +
                    '<p style="font-size:13px;color:#666;">Meanwhile, find me on <a href="https://linkedin.com/in/virnahar" target="_blank" style="color:#007aff;text-decoration:none;font-weight:600;">LinkedIn</a> or <a href="https://github.com/virnahar" target="_blank" style="color:#007aff;text-decoration:none;font-weight:600;">GitHub</a></p>' +
                    '<button onclick="resetContactForm()" style="margin-top:24px;padding:10px 24px;border:none;background:#007aff;color:#fff;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;transition:transform 0.15s;">Send Another</button>' +
                    '</div>';
                section.style.opacity = '1';
                section.style.transform = 'scale(1) translateY(0)';
            }, 500);
        }, 800);
    }, 1200);

    return false;
}

function resetContactForm() {
    var section = document.querySelector('.contact-form-section');
    if (!section) return;
    section.style.transition = 'opacity 0.3s ease';
    section.style.opacity = '0';
    setTimeout(function() {
        section.innerHTML = '<h2>Send a Message</h2>' +
            '<form class="contact-form" id="contact-form" action="javascript:void(0)">' +
            '<div class="form-group"><label for="name">Name</label><input type="text" id="name" name="name" required></div>' +
            '<div class="form-group"><label for="email">Email</label><input type="email" id="email" name="email" required></div>' +
            '<div class="form-group"><label for="subject">Subject</label><input type="text" id="subject" name="subject" required></div>' +
            '<div class="form-group"><label for="message">Message</label><textarea id="message" name="message" rows="6" required></textarea></div>' +
            '<button type="submit" class="submit-btn" id="contact-submit-btn">Send Message</button>' +
            '</form>';
        section.style.opacity = '1';
    }, 300);
}
