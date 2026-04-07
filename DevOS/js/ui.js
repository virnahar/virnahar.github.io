// ===== UI.JS — Window Management, Menus, Dock, Spotlight, Control Center, Launchpad, Keyboard Shortcuts =====
// Depends on: sounds.js (playClickSound, playMinimizeSound), utils.js (applyTheme), startup.js (showMacModal, closeMacModal, performShutdown, performRestart, performLogout, performSleep)

// ===== WINDOW MANAGEMENT GLOBALS =====
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
    'music': document.getElementById('music-window'),
    'calculator': document.getElementById('calculator-window'),
    'notes': document.getElementById('notes-window'),
    'codeeditor': document.getElementById('codeeditor-window'),
    'stickynotes': document.getElementById('stickynotes-window'),
    'monitor': document.getElementById('monitor-window')
};

let recentWindows = [];
let desktopViewMode = 'icons';

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
    'music': { top: '70px', left: '180px', width: '950px', height: '700px' },
    'calculator': { top: '120px', left: '400px', width: '260px', height: 'auto' },
    'notes': { top: '80px', left: '200px', width: '850px', height: '600px' },
    'codeeditor': { top: '90px', left: '180px', width: '950px', height: '650px' },
    'stickynotes': { top: '110px', left: '250px', width: '600px', height: '500px' },
    'monitor': { top: '60px', left: '120px', width: '1050px', height: '700px' }
};

// ===== OPEN WINDOW =====
function openWindow(appName) {
    const win = windows[appName];
    if (!win) return;

    if (appName === 'music') {
        setTimeout(() => {
            const np = document.getElementById('now-playing');
            if (np) np.style.display = 'flex';
        }, 2000);
    }

    if (!recentWindows.includes(appName)) {
        recentWindows.unshift(appName);
        if (recentWindows.length > 10) recentWindows.pop();
    }

    // V2: Dock bounce animation
    const dockItem = document.querySelector(`.dock-item[data-app="${appName}"]`);
    if (dockItem && win.style.display !== 'block') {
        dockItem.classList.add('launching');
        setTimeout(() => dockItem.classList.remove('launching'), 500);
    }

    if (win.classList.contains('minimized')) {
        win.classList.remove('minimized');
        makeWindowActive(win);
        playClickSound();
        updateDockIndicators();
        return;
    }

    if (win.style.display === 'block') {
        makeWindowActive(win);
        playClickSound();
        updateDockIndicators();
        return;
    }

    const pos = windowPositions[appName];
    if (pos) {
        win.style.top = pos.top;
        win.style.left = pos.left;
        win.style.width = pos.width;
        win.style.height = pos.height;
    }

    win.style.display = 'block';
    makeWindowActive(win);
    playClickSound();
    updateDockIndicators();

    if (appName === 'terminal') {
        setTimeout(() => {
            if (typeof initInteractiveTerminal === 'function') initInteractiveTerminal();
            animateSkillBars();
        }, 300);
    }

    if (appName === 'notes' && typeof initNotesApp === 'function') {
        setTimeout(() => initNotesApp(), 200);
    }
    if (appName === 'monitor' && typeof initMonitorDashboard === 'function') {
        setTimeout(function() { initMonitorDashboard(); }, 200);
    }
    if (appName === 'codeeditor' && typeof initCodeEditor === 'function') {
        setTimeout(() => initCodeEditor(), 200);
    }
}

/** Frontmost visible window: scroll main content (used by hand-gesture scroll). */
window.scrollFrontWindowBy = function(deltaY) {
    if (!deltaY || !isFinite(deltaY)) return;
    var list = Array.prototype.slice.call(document.querySelectorAll('.window'));
    var visible = list.filter(function(w) {
        return w.style.display === 'block' && !w.classList.contains('minimized');
    });
    visible.sort(function(a, b) {
        return (parseInt(getComputedStyle(b).zIndex, 10) || 0) - (parseInt(getComputedStyle(a).zIndex, 10) || 0);
    });
    var w = visible[0];
    if (!w) return;
    if (w.id === 'terminal-window' || w.classList.contains('terminal-window')) {
        var termScroll = w.querySelector('#interactive-terminal .terminal-scroller') ||
            w.querySelector('#interactive-terminal .terminal') ||
            w.querySelector('#interactive-terminal');
        if (termScroll) {
            termScroll.scrollTop += deltaY;
            return;
        }
    }
    var el = w.querySelector('.window-content') || w;
    el.scrollTop += deltaY;
};

// ===== ANIMATE SKILL BARS =====
function animateSkillBars() {
    const skillFills = document.querySelectorAll('.skill-fill');
    skillFills.forEach((fill, index) => {
        const percent = fill.getAttribute('data-percent');
        setTimeout(() => {
            fill.style.width = percent + '%';
        }, index * 100);
    });
}

// ===== MAKE WINDOW ACTIVE =====
function makeWindowActive(win) {
    Object.values(windows).forEach(w => { if (w) w.classList.remove('active'); });
    win.classList.add('active');
    win.style.zIndex = ++zIndexCounter;
    activeWindow = win;
    updateMenuBarAppName(win);
}

// ===== UPDATE MENU BAR APP NAME =====
function updateMenuBarAppName(win) {
    const activeAppName = document.getElementById('active-app-name');
    if (!activeAppName) return;

    if (!win) {
        activeAppName.textContent = "Virendra's OS";
        return;
    }

    const appNames = {
        'finder-window': 'Finder',
        'projects-window': 'Projects',
        'terminal-window': 'Terminal',
        'resume-window': 'Preview',
        'contact-window': 'Mail',
        'about-mac-window': 'About This Mac',
        'preferences-window': 'System Preferences',
        'safari-window': 'Safari',
        'games-window': 'Games',
        'music-window': 'Music',
        'calculator-window': 'Calculator',
        'notes-window': 'Notes',
        'codeeditor-window': 'Code Editor',
        'stickynotes-window': 'Sticky Notes',
        'monitor-window': 'DevOs Monitor'
    };

    activeAppName.textContent = appNames[win.id] || "Virendra's OS";
}

// ===== UPDATE DOCK INDICATORS =====
function updateDockIndicators() {
    Object.keys(windows).forEach(appKey => {
        const win = windows[appKey];
        const dockIcon = document.querySelector(`.dock-item[data-app="${appKey}"]`);
        if (dockIcon) {
            if (win && win.style.display === 'block' && !win.classList.contains('minimized')) {
                dockIcon.classList.add('running');
            } else {
                dockIcon.classList.remove('running');
            }
        }
    });
}

// ===== DESKTOP ICON HANDLERS =====
document.querySelectorAll('.desktop-icon').forEach(icon => {
    icon.addEventListener('click', () => {
        playClickSound();
        openWindow(icon.getAttribute('data-app'));
    });
    icon.addEventListener('dblclick', () => {
        playClickSound();
        openWindow(icon.getAttribute('data-app'));
    });
});

// ===== DOCK ITEM HANDLERS =====
document.querySelectorAll('.dock-item').forEach(item => {
    item.addEventListener('click', () => {
        playClickSound();
        openWindow(item.getAttribute('data-app'));
    });
});

// ===== WINDOW CONTROL BUTTONS =====
document.querySelectorAll('.window-control').forEach(button => {
    button.addEventListener('click', (e) => {
        e.stopPropagation();
        playClickSound();
        const action = button.getAttribute('data-action');
        const win = button.closest('.window');

        if (action === 'close') {
            win.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
            win.style.opacity = '0';
            win.style.transform = (win.style.transform || '') + ' scale(0.95)';
            setTimeout(() => {
                win.style.display = 'none';
                win.style.opacity = '';
                win.style.transform = '';
                win.style.transition = '';
                updateDockIndicators();
                updateMenuBarAppName(null);
            }, 200);
        } else if (action === 'minimize') {
            playMinimizeSound();
            win.classList.add('minimizing');
            setTimeout(() => {
                win.classList.remove('minimizing');
                win.classList.add('minimized');
                updateDockIndicators();
            }, 600);
        } else if (action === 'maximize') {
            toggleMaximize(win);
        }
    });
});

// ===== TOGGLE MAXIMIZE =====
function toggleMaximize(win) {
    if (win.classList.contains('maximized')) {
        win.classList.remove('maximized');
        win.classList.add('maximizing');
        win.style.transition = 'all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)';
        win.style.top = win.dataset.originalTop;
        win.style.left = win.dataset.originalLeft;
        win.style.width = win.dataset.originalWidth;
        win.style.height = win.dataset.originalHeight;
        win.style.borderRadius = '';
        setTimeout(() => {
            win.classList.remove('maximizing');
            win.style.transition = '';
        }, 300);
    } else {
        win.dataset.originalTop = win.style.top;
        win.dataset.originalLeft = win.style.left;
        win.dataset.originalWidth = win.style.width;
        win.dataset.originalHeight = win.style.height;

        win.classList.add('maximized', 'maximizing');
        win.style.transition = 'all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)';
        win.style.top = '28px';
        win.style.left = '0';
        win.style.width = '100vw';
        win.style.height = 'calc(100vh - 100px)';
        win.style.zIndex = ++zIndexCounter;
        win.style.borderRadius = '0';
        setTimeout(() => {
            win.classList.remove('maximizing');
            win.style.transition = '';
        }, 300);
    }
}

// ===== WINDOW ACTIVE ON POINTERDOWN =====
Object.values(windows).forEach(win => {
    if (!win) return;
    win.addEventListener('pointerdown', (e) => {
        if (e.target.closest('.window-control')) return;
        makeWindowActive(win);
    });
});

// ===== DRAGGABLE WINDOWS (pointer events for mouse + touch) =====
let isDragging = false;
let currentWindow = null;
let offsetX = 0;
let offsetY = 0;
let dragPointerId = null;

// V2: Window snap preview element
let snapPreview = null;

function dockReservePx() {
    return 80;
}

document.querySelectorAll('.window-titlebar').forEach(titlebar => {
    titlebar.addEventListener('pointerdown', (e) => {
        if (e.target.closest('.window-control')) return;
        if (e.pointerType === 'mouse' && e.button !== 0) return;

        e.preventDefault();
        isDragging = true;
        currentWindow = titlebar.closest('.window');
        dragPointerId = e.pointerId;

        const rect = currentWindow.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;

        makeWindowActive(currentWindow);
        currentWindow.style.cursor = 'grabbing';
        titlebar.setPointerCapture(e.pointerId);
    });

    titlebar.addEventListener('pointermove', (e) => {
        if (!isDragging || !currentWindow || e.pointerId !== dragPointerId) return;

        const x = e.clientX - offsetX;
        const y = e.clientY - offsetY;

        const maxX = window.innerWidth - currentWindow.offsetWidth;
        const maxY = window.innerHeight - currentWindow.offsetHeight - dockReservePx();

        currentWindow.style.left = Math.max(0, Math.min(x, maxX)) + 'px';
        currentWindow.style.top = Math.max(28, Math.min(y, maxY)) + 'px';

        // V2: Window snap preview
        const edgeThreshold = 20;
        if (e.clientX <= edgeThreshold) {
            showSnapPreview('left');
        } else if (e.clientX >= window.innerWidth - edgeThreshold) {
            showSnapPreview('right');
        } else {
            hideSnapPreview();
        }
    });

    function endWindowDrag(e) {
        if (e.pointerId !== dragPointerId) return;

        // V2: Snap on drop if preview is showing
        if (snapPreview && snapPreview.style.display === 'block' && currentWindow) {
            const edge = snapPreview.dataset.edge;
            windowSnap(currentWindow, edge);
        }
        hideSnapPreview();

        if (currentWindow) {
            currentWindow.style.cursor = 'default';
        }
        try {
            titlebar.releasePointerCapture(e.pointerId);
        } catch (_) {}
        isDragging = false;
        currentWindow = null;
        dragPointerId = null;
    }

    titlebar.addEventListener('pointerup', endWindowDrag);
    titlebar.addEventListener('pointercancel', endWindowDrag);
});

// ===== DOUBLE-CLICK TITLEBAR TO MAXIMIZE =====
document.querySelectorAll('.titlebar, .window-titlebar').forEach(tb => {
    tb.addEventListener('dblclick', (e) => {
        if (e.target.closest('.window-control')) return;
        const win = tb.closest('.window');
        if (win) toggleMaximize(win);
    });
});

// ===== RESIZABLE WINDOWS — V2: 16px grab area =====
document.querySelectorAll('.window').forEach(win => {
    if (win.querySelector('.resize-handle')) return;
    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'resize-handle';
    resizeHandle.style.cssText = 'position:absolute;bottom:0;right:0;width:16px;height:16px;cursor:nwse-resize;z-index:10;';
    win.appendChild(resizeHandle);

    resizeHandle.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        const startX = e.clientX;
        const startY = e.clientY;
        const startW = win.offsetWidth;
        const startH = win.offsetHeight;

        function onMove(ev) {
            const newW = Math.max(400, startW + (ev.clientX - startX));
            const newH = Math.max(300, startH + (ev.clientY - startY));
            win.style.width = newW + 'px';
            win.style.height = newH + 'px';
        }
        function onUp() {
            document.removeEventListener('pointermove', onMove);
            document.removeEventListener('pointerup', onUp);
        }
        document.addEventListener('pointermove', onMove);
        document.addEventListener('pointerup', onUp);
    });
});

// ===== SOUND TOGGLE BUTTON =====
document.getElementById('sound-toggle-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (typeof toggleSound === 'function') toggleSound();
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

        document.querySelectorAll('.dropdown-menu').forEach(m => m.style.display = 'none');

        if (activeMenu === menu && menu.style.display === 'block') {
            menu.style.display = 'none';
            activeMenu = null;
        } else {
            const rect = trigger.getBoundingClientRect();
            menu.style.left = rect.left + 'px';
            menu.style.display = 'block';
            menu.style.animation = 'none';
            menu.offsetHeight;
            menu.style.animation = 'menuSlideDown 0.2s ease';
            activeMenu = menu;
        }
    });
});

document.addEventListener('click', (e) => {
    if (!e.target.closest('.menu-trigger') && !e.target.closest('.dropdown-menu')) {
        document.querySelectorAll('.dropdown-menu').forEach(m => m.style.display = 'none');
        activeMenu = null;
    }
});

// ===== MENU ITEM ACTIONS =====
document.querySelectorAll('.menu-dropdown-item').forEach(item => {
    item.addEventListener('click', () => {
        playClickSound();
        const action = item.getAttribute('data-action');
        const itemText = item.textContent.trim();

        // File menu
        if (action === 'open-finder') openWindow('finder');
        if (action === 'new-window') openWindow('finder');
        if (action === 'close-window' && activeWindow) {
            _closeWindowAnimated(activeWindow);
        }
        if (action === 'minimize' && activeWindow) {
            playMinimizeSound();
            activeWindow.classList.add('minimizing');
            setTimeout(() => {
                activeWindow.classList.remove('minimizing');
                activeWindow.classList.add('minimized');
            }, 600);
        }

        // Apple menu items
        if (itemText.includes('About This Mac')) openWindow('about-mac');
        if (itemText.includes('System Preferences')) openWindow('preferences');
        if (itemText.includes('App Store')) {
            showMacModal('App Store', 'Currently in Exploration Mode\n\nThis is a portfolio showcase, not a real App Store!\n\nExplore my projects and experience instead!', '🛍️');
        }
        if (itemText.includes('Recent Items')) showRecentItems();

        // Finder menu items
        if (action === 'about-finder') {
            showMacModal('About Finder', "Finder v14.0 — DevOS Edition\n\nThe file manager for Virendra's portfolio.\nBrowse projects, skills, and experience like folders on a Mac.\n\nBuilt with HTML, CSS & JavaScript.", '📁');
        }
        if (itemText.includes('Empty Trash')) emptyTrashAnimation();

        // Help menu
        if (action === 'show-help') showMacOSHelp();
        if (action === 'show-shortcuts') showKeyboardShortcuts();
        if (action === 'about-portfolio') showAboutPortfolio();

        // View menu
        if (action === 'view-icons') changeDesktopView('icons');
        if (action === 'view-list') changeDesktopView('list');
        if (action === 'view-gallery') changeDesktopView('gallery');

        // Go menu
        if (action === 'open-projects') openWindow('projects');
        if (action === 'open-terminal') openWindow('terminal');
        if (action === 'open-resume') openWindow('resume');
        if (action === 'open-contact') openWindow('contact');
        if (action === 'open-launchpad') openLaunchpad();
        if (action === 'open-preferences') openWindow('preferences');

        // Window menu
        if (action === 'minimize-active' && activeWindow) {
            playMinimizeSound();
            activeWindow.classList.add('minimizing');
            setTimeout(() => {
                activeWindow.classList.remove('minimizing');
                activeWindow.classList.add('minimized');
                updateDockIndicators();
            }, 600);
        }
        if (action === 'maximize-active' && activeWindow) toggleMaximize(activeWindow);
        if (action === 'close-active' && activeWindow) {
            _closeWindowAnimated(activeWindow);
        }
        if (action === 'bring-all-front') {
            Object.values(windows).forEach(w => {
                if (w && w.style.display === 'block') w.style.zIndex = ++zIndexCounter;
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

        // Sleep
        if (item.id === 'sleep-item') performSleep();

        // Edit menu items
        if (itemText === 'Undo' || itemText.startsWith('Undo')) {
            showMacModal('Undo', 'Nothing to undo right now.\n\nThis is a portfolio — no editable content!', '↩️');
        } else if (itemText === 'Redo' || itemText.startsWith('Redo')) {
            showMacModal('Redo', 'Nothing to redo right now.', '↪️');
        } else if (itemText === 'Cut' || itemText.startsWith('Cut')) {
            showMacModal('Cut', 'Select text first, then use ⌘X to cut.\n\nTry selecting text in the Terminal!', '✂️');
        } else if (itemText === 'Copy' || itemText.startsWith('Copy')) {
            showMacModal('Copy', 'Select text first, then use ⌘C to copy.\n\nTip: Try copying terminal output!', '📋');
        } else if (itemText === 'Paste' || itemText.startsWith('Paste')) {
            showMacModal('Paste', 'Use ⌘V to paste from clipboard.\n\nTry pasting into the Terminal!', '📌');
        } else if (itemText === 'Select All' || itemText.startsWith('Select All')) {
            showMacModal('Select All', 'Use ⌘A to select all content.\n\nWorks in Terminal and text fields.', '🔤');
        }

        // View menu (text only)
        if (itemText === 'Show Path Bar') {
            showMacModal('Path Bar', 'Path bar is now visible in Finder windows.\n\nNavigate through: About Me → Skills → Experience', '📂');
        } else if (itemText === 'Show Status Bar') {
            showMacModal('Status Bar', 'Status bar is now visible.\n\n10 items • 2.4 GB available', '📊');
        }

        // Finder Preferences
        if (itemText === 'Preferences...' && item.closest('#finder-menu')) openWindow('preferences');

        // New Folder
        if (itemText.startsWith('New Folder')) {
            showMacModal('New Folder', 'Folders are read-only in this portfolio.\n\nBut feel free to explore all existing sections!', '📁');
        }

        // Mac-style confirmations
        if (item.id === 'logout-item') {
            showMacModal('Log Out', 'Are you sure you want to log out Virendra Kumar?', '🚪');
            document.getElementById('mac-modal-ok').onclick = () => {
                closeMacModal();
                setTimeout(() => performLogout(), 500);
            };
        } else if (item.id === 'restart-item') {
            showMacModal('Restart', 'Are you sure you want to restart this Mac?', '🔄');
            document.getElementById('mac-modal-ok').onclick = () => {
                closeMacModal();
                setTimeout(() => performRestart(), 500);
            };
        } else if (item.id === 'shutdown-item') {
            showMacModal('Shut Down', 'Are you sure you want to shut down your Mac?', '⚡');
            document.getElementById('mac-modal-ok').onclick = () => {
                closeMacModal();
                setTimeout(() => performShutdown(), 500);
            };
        }

        // Close menus
        document.querySelectorAll('.dropdown-menu').forEach(m => m.style.display = 'none');
        activeMenu = null;
    });
});

/** Close Terminal from in-shell `exit` / `quit` (same animation as red dot). */
window.closeTerminalWindowFromShell = function() {
    const tw = document.getElementById('terminal-window');
    if (!tw || tw.classList.contains('minimizing')) return;
    tw.classList.remove('minimized');
    if (tw.style.display === 'none') return;
    _closeWindowAnimated(tw);
};

// Shared close animation helper
function _closeWindowAnimated(win) {
    win.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
    win.style.opacity = '0';
    win.style.transform = (win.style.transform || '') + ' scale(0.95)';
    const ref = win;
    setTimeout(() => {
        ref.style.display = 'none';
        ref.style.opacity = '';
        ref.style.transform = '';
        ref.style.transition = '';
        updateDockIndicators();
        updateMenuBarAppName(null);
    }, 200);
}

// ===== SHOW RECENT ITEMS — V2: Launchpad-style grid =====
function showRecentItems() {
    if (recentWindows.length === 0) {
        showMacModal('Recent Items', 'No recent items yet.\n\nOpen some windows to see them here!', '📋');
        return;
    }

    const overlay = document.getElementById('mac-modal-overlay');
    const titleEl = document.getElementById('mac-modal-title');
    const messageEl = document.getElementById('mac-modal-message');
    const iconEl = document.getElementById('mac-modal-icon');

    titleEl.textContent = 'Recent Items';
    iconEl.textContent = '🕐';

    const appMeta = {
        'finder': { icon: '📁', label: 'About Me' },
        'projects': { icon: '💼', label: 'Projects' },
        'terminal': { icon: '💻', label: 'Terminal' },
        'resume': { icon: '📄', label: 'Resume' },
        'contact': { icon: '✉️', label: 'Contact' },
        'preferences': { icon: '⚙️', label: 'System Preferences' },
        'about-mac': { icon: '🖥️', label: 'About This Mac' },
        'safari': { icon: '🌐', label: 'Safari' },
        'games': { icon: '🎮', label: 'Games' },
        'music': { icon: '🎵', label: 'Music' },
        'calculator': { icon: '🔢', label: 'Calculator' },
        'notes': { icon: '📝', label: 'Notes' },
        'codeeditor': { icon: '👨‍💻', label: 'Code Editor' },
        'stickynotes': { icon: '🗒️', label: 'Sticky Notes' }
    };

    const itemsHTML = recentWindows.slice(0, 8).map(app => {
        const meta = appMeta[app] || { icon: '📦', label: app };
        return `<div class="recent-item" onclick="openWindow('${app}'); closeMacModal();" style="display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px 8px;border-radius:12px;cursor:pointer;transition:background 0.2s;min-width:80px;" onmouseover="this.style.background='rgba(255,255,255,0.15)'" onmouseout="this.style.background='transparent'">
            <span style="font-size:36px;display:block;">${meta.icon}</span>
            <span style="font-size:11px;text-align:center;opacity:0.9;">${meta.label}</span>
        </div>`;
    }).join('');

    messageEl.innerHTML = `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:8px 0;">${itemsHTML}</div>`;
    overlay.classList.add('welcome-active');
    overlay.style.display = 'flex';
    playClickSound();
}

// ===== HELP MENU FUNCTIONS =====
function showMacOSHelp() {
    showMacModal(
        'DevOS Help',
        `Shortcuts:\n⌘/Ctrl + Space — Spotlight Search\nF3 — Mission Control\nF4 — Launchpad\nEsc — Dismiss dialog or close active window (not Terminal; use exit or quit there)\nAlt + W/M/N — Close / Minimize / New window\n\nPhone & tablet:\n• Desktop icons orbit like on desktop (tap to open apps)\n• Floating widgets are hidden so the wallpaper and icons stay clear\n• Use the Dock and Launchpad (center Apple) for quick access\n\nHand Magic:\nMenu bar (hand icon) or Control Center. Corner preview only — camera + hand outline; desktop stays clear. Palm still → Resume; point → scroll / hold → Terminal; ✌️ → Contact; 👍 → Projects; fist → Finder; pinch → Trash; full palm swipe → Shut Down (strict).\n\nHighlights:\n• 10+ interactive apps with real functionality\n• Interactive terminal with 15+ commands\n• 7 games, 7 wallpapers, dark mode\n• Dynamic menu bar, genie minimize, dock zoom\n\nBuilt by Virendra Kumar — github.com/virnahar`,
        '📖'
    );
}

function showKeyboardShortcuts() {
    showMacModal(
        'Keyboard Shortcuts',
        `⌘/Ctrl + Space — Spotlight Search\nF3 — Mission Control\nF4 — Launchpad\nEsc — Dismiss dialog or close active window (Terminal: type exit or quit)\nAlt + W — Close window\nAlt + M — Minimize window\nAlt + N — New window (Finder)\nCtrl + Shift + Q — Shut Down\nDouble-click title bar — Maximize/Restore\n\nPhone / tablet: icons orbit automatically; tap Dock, Launchpad, or any icon.\n\nSpotlight Navigation:\nArrow Up/Down — Navigate results\nEnter — Open selected item`,
        '⌨️'
    );
}

function showAboutPortfolio() {
    showMacModal(
        'About This Portfolio',
        "DevOS v2.0 — A macOS-style portfolio by Virendra Kumar\n\nBuilt with vanilla HTML, CSS, and JavaScript. No frameworks.\nFeatures: 10+ apps, interactive terminal, 7 games, dark mode, real battery status, and much more.\n\nSource: github.com/virnahar",
        '💼'
    );
}

// ===== SPOTLIGHT SEARCH — V2 with calculator, recent files, web suggestions =====
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
    { name: 'Terminal', description: 'Command line interface', icon: 'terminal', app: 'terminal' },
    { name: 'Safari', description: 'Web browser', icon: 'safari', app: 'safari' },
    { name: 'Games', description: 'Play games', icon: 'games', app: 'games' },
    { name: 'Music', description: 'Listen to music', icon: 'music', app: 'music' },
    { name: 'Calculator', description: 'Quick calculations', icon: 'calculator', app: 'calculator' },
    { name: 'System Preferences', description: 'Settings and preferences', icon: 'preferences', app: 'preferences' },
    { name: 'Notes', description: 'Write and organize notes', icon: 'notes', app: 'notes' },
    { name: 'Code Editor', description: 'DevOps code editor', icon: 'codeeditor', app: 'codeeditor' },
    { name: 'Sticky Notes', description: 'Desktop sticky notes', icon: 'stickynotes', app: 'stickynotes' }
];

function openSpotlight() {
    if (spotlightOverlay) spotlightOverlay.style.display = 'flex';
    setTimeout(() => { if (spotlightInput) spotlightInput.focus(); }, 100);
    updateSpotlightResults('');
}

function closeSpotlight() {
    if (spotlightOverlay) spotlightOverlay.style.display = 'none';
    if (spotlightInput) spotlightInput.value = '';
    if (spotlightResults) spotlightResults.innerHTML = '';
}

function updateSpotlightResults(query) {
    if (!spotlightResults) return;

    if (!query) {
        // V2: Show recent files section
        let recentHTML = '';
        if (recentWindows.length > 0) {
            const recentItems = recentWindows.slice(0, 4).map(app => {
                const item = searchableItems.find(si => si.app === app);
                return item ? `<div class="spotlight-result-item" data-app="${app}">
                    <div class="spotlight-result-icon">${getAppIcon(item.icon)}</div>
                    <div class="spotlight-result-info">
                        <div class="spotlight-result-title">${item.name}</div>
                        <div class="spotlight-result-desc">Recently opened</div>
                    </div>
                </div>` : '';
            }).join('');
            recentHTML = `<div class="spotlight-section-label" style="padding:6px 12px;font-size:11px;color:#888;font-weight:600;text-transform:uppercase;">Recent</div>${recentItems}`;
        }
        spotlightResults.innerHTML = recentHTML || '<div class="spotlight-no-results">Type to search...</div>';
        _bindSpotlightClicks();
        return;
    }

    // V2: Inline calculator — detect math expressions
    const mathMatch = query.match(/^[\d\s+\-*/().%^]+$/);
    let calcResultHTML = '';
    if (mathMatch) {
        try {
            const sanitized = query.replace(/[^0-9+\-*/().%\s]/g, '').replace(/%/g, '/100');
            const result = Function('"use strict"; return (' + sanitized + ')')();
            if (typeof result === 'number' && isFinite(result)) {
                calcResultHTML = `<div class="spotlight-section-label" style="padding:6px 12px;font-size:11px;color:#888;font-weight:600;text-transform:uppercase;">Calculator</div>
                <div class="spotlight-result-item spotlight-calc-result" style="pointer-events:none;">
                    <div class="spotlight-result-icon" style="font-size:24px;">🔢</div>
                    <div class="spotlight-result-info">
                        <div class="spotlight-result-title" style="font-size:20px;font-weight:700;">${result}</div>
                        <div class="spotlight-result-desc">${query} =</div>
                    </div>
                </div>`;
            }
        } catch (_) {}
    }

    const filtered = searchableItems.filter(item =>
        item.name.toLowerCase().includes(query.toLowerCase()) ||
        item.description.toLowerCase().includes(query.toLowerCase())
    );

    let appResultsHTML = '';
    if (filtered.length > 0) {
        appResultsHTML = `<div class="spotlight-section-label" style="padding:6px 12px;font-size:11px;color:#888;font-weight:600;text-transform:uppercase;">Applications</div>` +
        filtered.map((item, index) => `
            <div class="spotlight-result-item ${!calcResultHTML && index === 0 ? 'selected' : ''}" data-app="${item.app}">
                <div class="spotlight-result-icon">${getAppIcon(item.icon)}</div>
                <div class="spotlight-result-info">
                    <div class="spotlight-result-title">${item.name}</div>
                    <div class="spotlight-result-desc">${item.description}</div>
                </div>
            </div>
        `).join('');
    }

    // V2: Web suggestion placeholder
    let webHTML = '';
    if (query.length > 2 && filtered.length === 0 && !calcResultHTML) {
        webHTML = `<div class="spotlight-section-label" style="padding:6px 12px;font-size:11px;color:#888;font-weight:600;text-transform:uppercase;">Web Suggestions</div>
        <div class="spotlight-result-item" data-url="https://www.google.com/search?q=${encodeURIComponent(query)}" style="cursor:pointer;">
            <div class="spotlight-result-icon" style="font-size:24px;">🌐</div>
            <div class="spotlight-result-info">
                <div class="spotlight-result-title">Search for "${query}"</div>
                <div class="spotlight-result-desc">Search the web</div>
            </div>
        </div>`;
    }

    if (!calcResultHTML && !appResultsHTML && !webHTML) {
        spotlightResults.innerHTML = '<div class="spotlight-no-results">No results found</div>';
        return;
    }

    spotlightResults.innerHTML = calcResultHTML + appResultsHTML + webHTML;
    _bindSpotlightClicks();
}

function _bindSpotlightClicks() {
    document.querySelectorAll('.spotlight-result-item').forEach(item => {
        item.addEventListener('click', () => {
            const app = item.getAttribute('data-app');
            const url = item.getAttribute('data-url');
            if (app) {
                openWindow(app);
                closeSpotlight();
            } else if (url) {
                window.open(url, '_blank');
                closeSpotlight();
            }
        });
    });
}

function getAppIcon(iconName) {
    const icons = {
        'finder': '<svg width="48" height="48" viewBox="0 0 64 64" fill="none"><rect width="64" height="64" rx="14" fill="url(#finderG)"/><path d="M32 16C32 16 22 20 22 28C22 36 32 40 32 40C32 40 42 36 42 28C42 20 32 16 32 16Z" fill="white" opacity="0.9"/><circle cx="28" cy="28" r="4" fill="#0066CC"/><circle cx="36" cy="28" r="4" fill="#0066CC"/><defs><linearGradient id="finderG" x1="0" y1="0" x2="64" y2="64"><stop offset="0%" stop-color="#4F9EEF"/><stop offset="100%" stop-color="#1E6FD8"/></linearGradient></defs></svg>',
        'projects': '<svg width="48" height="48" viewBox="0 0 64 64" fill="none"><rect width="64" height="64" rx="14" fill="#7C3AED"/></svg>',
        'terminal': '<svg width="48" height="48" viewBox="0 0 64 64" fill="none"><rect width="64" height="64" rx="14" fill="#1E1E1E"/></svg>',
        'resume': '<svg width="48" height="48" viewBox="0 0 64 64" fill="none"><rect width="64" height="64" rx="14" fill="#F97316"/></svg>',
        'contact': '<svg width="48" height="48" viewBox="0 0 64 64" fill="none"><rect width="64" height="64" rx="14" fill="#10B981"/></svg>',
        'calculator': '<svg width="48" height="48" viewBox="0 0 64 64" fill="none"><rect width="64" height="64" rx="14" fill="#3a3a3c"/><rect x="18" y="14" width="28" height="36" rx="4" fill="white" opacity="0.95"/><rect x="22" y="18" width="20" height="10" rx="2" fill="#1c1c1e"/></svg>',
        'games': '<svg width="48" height="48" viewBox="0 0 64 64" fill="none"><rect width="64" height="64" rx="14" fill="#764ba2"/></svg>',
        'music': '<svg width="48" height="48" viewBox="0 0 64 64" fill="none"><rect width="64" height="64" rx="14" fill="#FF2D55"/></svg>',
        'safari': '<svg width="48" height="48" viewBox="0 0 64 64" fill="none"><rect width="64" height="64" rx="14" fill="#0071e3"/></svg>',
        'preferences': '<svg width="48" height="48" viewBox="0 0 64 64" fill="none"><rect width="64" height="64" rx="14" fill="#8e8e93"/></svg>',
        'notes': '<svg width="48" height="48" viewBox="0 0 64 64" fill="none"><rect width="64" height="64" rx="14" fill="#FFD60A"/></svg>',
        'codeeditor': '<svg width="48" height="48" viewBox="0 0 64 64" fill="none"><rect width="64" height="64" rx="14" fill="#007ACC"/></svg>',
        'stickynotes': '<svg width="48" height="48" viewBox="0 0 64 64" fill="none"><rect width="64" height="64" rx="14" fill="#FFCC02"/></svg>'
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
    if (e.target === spotlightOverlay) closeSpotlight();
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
        if (controlCenter) controlCenter.style.display = 'none';
    }
});

// ===== LAUNCHPAD =====
function openLaunchpad() {
    const launchpad = document.getElementById('launchpad');
    const launchpadSearch = document.getElementById('launchpad-search');
    if (launchpad) {
        launchpad.style.display = 'flex';
        playClickSound();
        if (launchpadSearch) {
            setTimeout(() => {
                launchpadSearch.value = '';
                launchpadSearch.focus();
                document.querySelectorAll('.launchpad-item').forEach(item => {
                    item.style.display = 'flex';
                });
            }, 100);
        }
    }
}

function closeLaunchpad() {
    const launchpad = document.getElementById('launchpad');
    if (launchpad) {
        launchpad.style.display = 'none';
        playClickSound();
    }
}

document.getElementById('launchpad')?.addEventListener('click', (e) => {
    if (e.target.id === 'launchpad') closeLaunchpad();
});

// Launchpad search
setTimeout(() => {
    const launchpadSearch = document.getElementById('launchpad-search');
    if (launchpadSearch) {
        launchpadSearch.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            document.querySelectorAll('.launchpad-item').forEach(item => {
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
            if (e.key === 'Escape') closeLaunchpad();
        });
    }
}, 1000);

// ===== KEYBOARD SHORTCUTS =====
document.addEventListener('keydown', (e) => {
    const isInPortfolio = !e.target.matches('input[type="search"], input[type="url"]');

    // F3 for Mission Control (V2)
    if (e.key === 'F3') {
        e.preventDefault();
        e.stopImmediatePropagation();
        const mcOverlay = document.getElementById('mission-control-overlay');
        if (mcOverlay && mcOverlay.style.display === 'flex') {
            closeMissionControl();
        } else {
            openMissionControl();
        }
        return false;
    }

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

    // Cmd/Ctrl + Space for Spotlight
    if ((e.metaKey || e.ctrlKey) && e.code === 'Space' && isInPortfolio) {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (spotlightOverlay && spotlightOverlay.style.display === 'flex') {
            closeSpotlight();
        } else {
            openSpotlight();
        }
        return false;
    }

    // Escape: dismiss Mac modal first (restart/shutdown/etc.), then overlays, then windows (not Terminal)
    if (e.key === 'Escape') {
        const macOverlay = document.getElementById('mac-modal-overlay');
        if (macOverlay && macOverlay.style.display === 'flex') {
            e.preventDefault();
            e.stopPropagation();
            closeMacModal();
            return false;
        }

        const launchpad = document.getElementById('launchpad');
        if (launchpad && launchpad.style.display === 'flex') { closeLaunchpad(); return; }

        const mcOverlay = document.getElementById('mission-control-overlay');
        if (mcOverlay && mcOverlay.style.display === 'flex') { closeMissionControl(); return; }

        if (spotlightOverlay && spotlightOverlay.style.display === 'flex') { closeSpotlight(); return; }
        if (controlCenter && controlCenter.style.display === 'block') { controlCenter.style.display = 'none'; return; }

        if (activeWindow && activeWindow.style.display === 'block') {
            if (activeWindow.id === 'terminal-window' || activeWindow.classList.contains('terminal-window')) {
                return;
            }
            e.preventDefault();
            _closeWindowAnimated(activeWindow);
            return false;
        }
    }

    // Alt + W - Close window
    if (e.altKey && e.key.toLowerCase() === 'w') {
        e.preventDefault();
        if (activeWindow) _closeWindowAnimated(activeWindow);
        return false;
    }

    // Alt + M - Minimize
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

    // Alt + N - New window (Finder)
    if (e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        openWindow('finder');
        return false;
    }

    // Ctrl+Shift+Q — Shut Down
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'q') {
        e.preventDefault();
        showMacModal('Quit', "Are you sure you want to quit Virendra's DevOS?", '⚡');
        document.getElementById('mac-modal-ok').onclick = () => {
            closeMacModal();
            setTimeout(() => location.reload(), 300);
        };
        return false;
    }

    // Enter in Spotlight
    if (e.key === 'Enter' && spotlightOverlay && spotlightOverlay.style.display === 'flex') {
        const selected = document.querySelector('.spotlight-result-item.selected');
        if (selected) {
            const app = selected.getAttribute('data-app');
            const url = selected.getAttribute('data-url');
            if (app) { openWindow(app); closeSpotlight(); }
            else if (url) { window.open(url, '_blank'); closeSpotlight(); }
        }
    }
}, true);

// Arrow keys in Spotlight
document.addEventListener('keydown', (e) => {
    if (!spotlightOverlay || spotlightOverlay.style.display !== 'flex') return;

    const results = Array.from(document.querySelectorAll('.spotlight-result-item:not(.spotlight-calc-result)'));
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

// ===== CHANGE DESKTOP VIEW =====
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

// ===== MAC DOCK MAGNIFICATION EFFECT =====
window.addEventListener('load', () => {
    setTimeout(() => {
        const dock = document.querySelector('.dock');
        if (!dock) return;

        const dockItems = Array.from(document.querySelectorAll('.dock-item'));
        let currentMouseX = 0;
        let targetScales = dockItems.map(() => 1);
        let currentScales = dockItems.map(() => 1);
        let isAnimating = false;

        function updateDockMagnify(clientX) {
            currentMouseX = clientX;
            dockItems.forEach((item, index) => {
                const itemRect = item.getBoundingClientRect();
                const itemCenter = itemRect.left + itemRect.width / 2;
                const distance = Math.abs(currentMouseX - itemCenter);
                const maxDist = 100;
                const maxScale = 1.35;

                if (distance < maxDist) {
                    const factor = 1 - (distance / maxDist);
                    const eased = Math.cos((1 - factor) * Math.PI / 2);
                    targetScales[index] = 1 + (eased * (maxScale - 1));
                } else {
                    targetScales[index] = 1;
                }
            });
            if (!isAnimating) {
                isAnimating = true;
                smoothAnimate();
            }
        }

        dock.addEventListener('pointermove', (e) => {
            updateDockMagnify(e.clientX);
        });

        function resetScales() { targetScales = dockItems.map(() => 1); }
        dock.addEventListener('mouseleave', resetScales);
        dock.addEventListener('pointerleave', resetScales);
        dock.addEventListener('pointercancel', resetScales);

        function smoothAnimate() {
            let hasChanges = false;
            dockItems.forEach((item, i) => {
                const diff = targetScales[i] - currentScales[i];
                if (Math.abs(diff) > 0.005) {
                    currentScales[i] += diff * 0.22;
                    hasChanges = true;
                } else {
                    currentScales[i] = targetScales[i];
                }
                const scale = currentScales[i];
                const lift = (scale - 1) * 20;
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

// ===== THANOS SNAP EMPTY TRASH =====
function emptyTrashAnimation() {
    playClickSound();

    const icons = document.querySelectorAll('.desktop-icon');
    const widgets = document.querySelectorAll('.desktop-widget');
    const dock = document.querySelector('.dock');
    const originalDockTransform = 'translateX(-50%)';
    const allElements = [...icons, ...widgets];

    allElements.forEach((element, index) => {
        if (!element) return;
        setTimeout(() => {
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
            element.style.transition = 'all 1.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            element.style.transform = `translateX(${(Math.random() - 0.5) * 400}px) translateY(${(Math.random() - 0.5) * 400}px) rotate(${Math.random() * 1080 - 540}deg) scale(0)`;
            element.style.opacity = '0';
            element.style.filter = 'blur(30px) brightness(2)';
        }, index * 120);
    });

    if (dock) {
        setTimeout(() => {
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

    setTimeout(() => {
        allElements.forEach((element, index) => {
            if (!element) return;
            setTimeout(() => {
                element.style.transition = 'all 1s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
                element.style.transform = 'translateX(0) translateY(0) rotate(0) scale(1)';
                element.style.opacity = '1';
                element.style.filter = 'blur(0) brightness(1)';
            }, index * 60);
        });
        if (dock) {
            setTimeout(() => {
                dock.style.transition = 'all 1s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
                dock.style.transform = originalDockTransform;
                dock.style.opacity = '1';
                dock.style.filter = 'blur(0) brightness(1)';
            }, allElements.length * 60);
        }
        setTimeout(() => {
            showMacModal('Thanos Snap Complete!', 'Everything snapped into dust and reborn!\n\nDesktop icons ✓\nWidgets ✓\nDock ✓\n\nAll restored - perfectly balanced!', '💨');
        }, allElements.length * 60 + 1000);
    }, allElements.length * 120 + 1500);
}

// Inject particle styles
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
            to { transform: translate(var(--tx), var(--ty)); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
}

// ===== 3D TILT ON WIDGETS =====
document.querySelectorAll('.desktop-widget').forEach(widget => {
    widget.style.transformStyle = 'preserve-3d';
    widget.style.perspective = '800px';
    widget.style.touchAction = 'none';

    function applyTilt(e) {
        const rect = widget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const rotateX = ((y - rect.height / 2) / (rect.height / 2 || 1)) * -8;
        const rotateY = ((x - rect.width / 2) / (rect.width / 2 || 1)) * 8;
        widget.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
    }

    function clearTilt() { widget.style.transform = ''; }

    widget.addEventListener('pointermove', applyTilt);
    widget.addEventListener('mouseleave', clearTilt);
    widget.addEventListener('pointerleave', clearTilt);
    widget.addEventListener('pointercancel', clearTilt);
});

// ===== SCROLL REVEAL OBSERVER =====
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
            revealObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.1, root: document.querySelector('.finder-main') });

document.querySelectorAll('.about-section, .exp-item').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
    revealObserver.observe(el);
});

// ===== PREVENT TEXT SELECTION WHILE DRAGGING =====
document.addEventListener('selectstart', (e) => {
    if (isDragging) e.preventDefault();
});

// ===== WINDOW FOCUS HANDLER =====
document.addEventListener('click', (e) => {
    if (!e.target.closest('.window')) {
        Object.values(windows).forEach(w => { if (w) w.classList.remove('active'); });
        activeWindow = null;
    }
});

// ===== MUSIC WINDOW CLOSE WATCHER =====
setInterval(() => {
    const musicWindow = document.getElementById('music-window');
    const nowPlaying = document.getElementById('now-playing');
    if (musicWindow && nowPlaying) {
        if (musicWindow.style.display === 'none') nowPlaying.style.display = 'none';
    }
}, 1000);

// ===== V2: WINDOW SNAP (half-screen split) =====
function showSnapPreview(edge) {
    if (!snapPreview) {
        snapPreview = document.createElement('div');
        snapPreview.className = 'window-snap-preview';
        snapPreview.style.cssText = 'position:fixed;top:28px;width:50%;height:calc(100vh - 108px);background:rgba(0,122,255,0.15);border:2px solid rgba(0,122,255,0.5);border-radius:12px;z-index:9998;pointer-events:none;transition:opacity 0.15s ease;display:none;';
        document.body.appendChild(snapPreview);
    }
    snapPreview.style.display = 'block';
    snapPreview.dataset.edge = edge;
    if (edge === 'left') {
        snapPreview.style.left = '0';
        snapPreview.style.right = '';
    } else {
        snapPreview.style.left = '50%';
        snapPreview.style.right = '';
    }
}

function hideSnapPreview() {
    if (snapPreview) snapPreview.style.display = 'none';
}

function windowSnap(win, edge) {
    if (!win) return;
    win.dataset.originalTop = win.dataset.originalTop || win.style.top;
    win.dataset.originalLeft = win.dataset.originalLeft || win.style.left;
    win.dataset.originalWidth = win.dataset.originalWidth || win.style.width;
    win.dataset.originalHeight = win.dataset.originalHeight || win.style.height;

    win.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    win.style.top = '28px';
    win.style.width = '50vw';
    win.style.height = 'calc(100vh - 108px)';

    if (edge === 'left') {
        win.style.left = '0';
    } else {
        win.style.left = '50vw';
    }

    setTimeout(() => { win.style.transition = ''; }, 300);
}

// ===== V2: MISSION CONTROL =====
function openMissionControl() {
    let overlay = document.getElementById('mission-control-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'mission-control-overlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);z-index:99990;display:none;padding:60px 40px 40px;overflow:auto;cursor:pointer;';
        document.body.appendChild(overlay);
    }

    const openWins = [];
    Object.entries(windows).forEach(([key, win]) => {
        if (win && win.style.display === 'block' && !win.classList.contains('minimized')) {
            openWins.push({ key, win });
        }
    });

    overlay.innerHTML = '';

    if (openWins.length === 0) {
        overlay.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:rgba(255,255,255,0.6);font-size:18px;">No open windows</div>';
    } else {
        const label = document.createElement('div');
        label.style.cssText = 'color:rgba(255,255,255,0.7);font-size:13px;font-weight:600;margin-bottom:20px;text-align:center;text-transform:uppercase;letter-spacing:1px;';
        label.textContent = 'Mission Control';
        overlay.appendChild(label);

        const grid = document.createElement('div');
        const cols = openWins.length <= 2 ? openWins.length : openWins.length <= 4 ? 2 : 3;
        grid.style.cssText = `display:grid;grid-template-columns:repeat(${cols},1fr);gap:24px;max-width:1200px;margin:0 auto;`;
        overlay.appendChild(grid);

        openWins.forEach(({ key, win }) => {
            const card = document.createElement('div');
            card.style.cssText = 'background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:12px;padding:12px;cursor:pointer;transition:all 0.2s ease;overflow:hidden;';
            card.addEventListener('mouseover', () => { card.style.transform = 'scale(1.03)'; card.style.borderColor = 'rgba(0,122,255,0.6)'; });
            card.addEventListener('mouseout', () => { card.style.transform = ''; card.style.borderColor = 'rgba(255,255,255,0.15)'; });

            const titleBar = win.querySelector('.window-titlebar, .titlebar');
            const title = titleBar ? (titleBar.querySelector('.window-title')?.textContent || key) : key;

            const titleEl = document.createElement('div');
            titleEl.style.cssText = 'color:#fff;font-size:13px;font-weight:600;margin-bottom:8px;text-align:center;';
            titleEl.textContent = title;
            card.appendChild(titleEl);

            const preview = document.createElement('div');
            preview.style.cssText = 'width:100%;height:140px;background:rgba(30,30,30,0.8);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:32px;';
            preview.textContent = getAppIcon(key).includes('svg') ? '' : '🖥️';
            preview.innerHTML = getAppIcon(key);
            card.appendChild(preview);

            card.addEventListener('click', (e) => {
                e.stopPropagation();
                closeMissionControl();
                makeWindowActive(win);
            });
            grid.appendChild(card);
        });
    }

    overlay.style.display = 'flex';
    overlay.style.flexDirection = 'column';
    playClickSound();

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeMissionControl();
    }, { once: true });
}

function closeMissionControl() {
    const overlay = document.getElementById('mission-control-overlay');
    if (overlay) {
        overlay.style.display = 'none';
        overlay.innerHTML = '';
    }
}

// ===== DEFAULT DARK MODE ON LOAD =====
if (!localStorage.getItem('devos-theme')) {
    if (typeof applyTheme === 'function') applyTheme('dark');
}

// ===== ORBITING DESKTOP ICONS =====
window.addEventListener('load', function() {
    setTimeout(function() {
        var desktop = document.getElementById('desktop');
        if (!desktop) return;

        var icons = Array.from(desktop.querySelectorAll('.desktop-icon'));
        if (icons.length === 0) return;

        var centerX = desktop.offsetWidth / 2;
        var centerY = desktop.offsetHeight / 2;

        var appleLogo = document.createElement('div');
        appleLogo.id = 'desktop-apple-logo';
        appleLogo.style.cssText = 'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:1;display:flex;flex-direction:column;align-items:center;gap:12px;cursor:pointer;';

        var glowBg = document.createElement('div');
        glowBg.style.cssText = 'position:absolute;width:160px;height:160px;border-radius:50%;top:50%;left:50%;transform:translate(-50%,-55%);background:radial-gradient(circle,rgba(255,255,255,0.08) 0%,transparent 70%);pointer-events:none;transition:all 0.6s ease;';

        var svgWrap = document.createElement('div');
        svgWrap.style.cssText = 'position:relative;transition:transform 0.3s ease;';
        svgWrap.innerHTML = '<svg width="56" height="56" viewBox="0 0 24 24" fill="white" style="opacity:0.7;transition:opacity 0.4s ease,filter 0.4s ease;filter:drop-shadow(0 0 12px rgba(255,255,255,0.2));"><path d="M18.71,19.5C17.88,20.74 17,21.95 15.66,21.97C14.32,22 13.89,21.18 12.37,21.18C10.84,21.18 10.37,21.95 9.1,22C7.79,22.05 6.8,20.68 5.96,19.47C4.25,17 2.94,12.45 4.7,9.39C5.57,7.87 7.13,6.91 8.82,6.88C10.1,6.86 11.32,7.75 12.11,7.75C12.89,7.75 14.37,6.68 15.92,6.84C16.57,6.87 18.39,7.1 19.56,8.82C19.47,8.88 17.39,10.1 17.41,12.63C17.44,15.65 20.06,16.66 20.09,16.67C20.06,16.74 19.67,18.11 18.71,19.5M13,3.5C13.73,2.67 14.94,2.04 15.94,2C16.07,3.17 15.6,4.35 14.9,5.19C14.21,6.04 13.07,6.7 11.95,6.61C11.8,5.46 12.36,4.26 13,3.5Z"/></svg>';
        var svgEl = svgWrap.querySelector('svg');

        var textEl = document.createElement('div');
        textEl.style.cssText = 'color:rgba(255,255,255,0.45);font-size:12px;font-weight:500;font-family:-apple-system,BlinkMacSystemFont,sans-serif;letter-spacing:1.5px;text-transform:uppercase;transition:all 0.4s ease;';
        textEl.textContent = "Vir's DevOs";

        appleLogo.appendChild(glowBg);
        appleLogo.appendChild(svgWrap);
        appleLogo.appendChild(textEl);
        desktop.appendChild(appleLogo);

        appleLogo.addEventListener('mouseenter', function() {
            svgEl.style.opacity = '1';
            svgEl.style.filter = 'drop-shadow(0 0 25px rgba(255,255,255,0.5))';
            glowBg.style.width = '200px';
            glowBg.style.height = '200px';
            glowBg.style.background = 'radial-gradient(circle, rgba(255,255,255,0.14) 0%, transparent 70%)';
            textEl.style.color = 'rgba(255,255,255,0.75)';
            textEl.style.letterSpacing = '2.5px';
        });

        appleLogo.addEventListener('mouseleave', function() {
            svgEl.style.opacity = '0.7';
            svgEl.style.filter = 'drop-shadow(0 0 12px rgba(255,255,255,0.2))';
            svgWrap.style.transform = '';
            glowBg.style.width = '160px';
            glowBg.style.height = '160px';
            glowBg.style.background = 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)';
            textEl.style.color = 'rgba(255,255,255,0.45)';
            textEl.style.letterSpacing = '1.5px';
        });

        appleLogo.addEventListener('mousemove', function(e) {
            var rect = appleLogo.getBoundingClientRect();
            var x = (e.clientX - rect.left) / rect.width - 0.5;
            var y = (e.clientY - rect.top) / rect.height - 0.5;
            svgWrap.style.transform = 'rotateY(' + (x * 20) + 'deg) rotateX(' + (-y * 20) + 'deg)';
        });

        appleLogo.addEventListener('click', function() { openLaunchpad(); });

        var count = icons.length;
        var angle = 0;
        var radius = 120;

        function orbitIsNarrowPhone() {
            return typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 768px)').matches;
        }
        function orbitIsTouchTablet() {
            return (
                typeof window.matchMedia === 'function' &&
                window.matchMedia('(max-width: 1024px) and (pointer: coarse)').matches
            );
        }
        function currentOrbitSpeed() {
            if (orbitIsNarrowPhone() || orbitIsTouchTablet()) return 0.00115;
            return 0.0008;
        }

        function positionIcons() {
            centerX = desktop.offsetWidth / 2;
            centerY = desktop.offsetHeight / 2;
            var base = Math.min(centerX, centerY);
            if (orbitIsNarrowPhone()) {
                radius = base * 0.52;
                if (radius < 68) radius = 68;
                if (radius > 195) radius = 195;
            } else if (orbitIsTouchTablet()) {
                radius = base * 0.58;
                if (radius < 76) radius = 76;
                if (radius > 260) radius = 260;
            } else {
                radius = base * 0.64;
                if (radius < 80) radius = 80;
                if (radius > 300) radius = 300;
            }

            for (var i = 0; i < count; i++) {
                var a = angle + (i / count) * Math.PI * 2;
                var x = centerX + Math.cos(a) * radius - 38;
                var y = centerY + Math.sin(a) * radius - 45;
                icons[i].style.left = x + 'px';
                icons[i].style.top = y + 'px';
            }
        }

        function animate() {
            angle += currentOrbitSpeed();
            positionIcons();
            requestAnimationFrame(animate);
        }

        positionIcons();
        animate();

        window.addEventListener('resize', function() { positionIcons(); });
    }, 1500);
});

// ===== CONSOLE LOG MESSAGES =====
console.log("🍎 Virendra's DevOS v2.0!");
console.log('✨ Mission Control | Window Snap | Spotlight Calculator | Sticky Notes');
console.log('⌨️  WORKING SHORTCUTS:');
console.log('   • ESC - Close active window');
console.log('   • F3 - Mission Control');
console.log('   • Alt+W - Close window');
console.log('   • Alt+M - Minimize window');
console.log('   • Alt+N - New window');
console.log('   • F4 - Launchpad');
console.log('   • Ctrl+Space - Spotlight');
console.log('   • Ctrl+Shift+Q - Quit');
console.log('📱 Note: Some ⌘ shortcuts are blocked by Mac OS (security)');
console.log('🗑️  Click Trash icon → Epic Thanos snap everything!');
