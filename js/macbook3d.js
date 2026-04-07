// ===== 3D MACBOOK BOOT ANIMATION — Clean Rewrite =====
(function() {
    'use strict';

    // ── DOM refs ──
    var canvasEl = document.getElementById('macbook-canvas');
    var cursorCanvas = document.getElementById('cursor-canvas');
    var startupScreen = document.getElementById('startup-screen');

    // ── Fallback guard ──
    if (!canvasEl || typeof THREE === 'undefined' || typeof gsap === 'undefined' || !THREE.GLTFLoader || !THREE.OrbitControls) {
        showFallback();
        return;
    }

    // Hide cursor trail until screen is on
    if (cursorCanvas) cursorCanvas.style.display = 'none';

    // ── State ──
    var phase = 'loading';
    var bootProgress = 0;
    var loginClickEnabled = false;
    var floatingTween = null;
    var renderLoopActive = false;
    var bootCompleted3d = false;
    var pointerDown = null;
    var faceIDRafId = null;
    var faceIDVerifyTimer = null;
    var faceIDFallbackInterval = null;
    var cachedWallpaperKey = '';
    var cachedWallpaperImg = null;
    var zoomHeroPhase = 0;
    var zoomLookTarget = new THREE.Vector3(0, 10.74, -0.36);
    var bootSequenceStarted = false;
    var zoomRedrawSkip = 0;
    /** When true and user is on login with a live camera stream, auto-start Face ID once. */
    var autoFaceLoginArmed = true;

    // ── Three.js objects ──
    var scene, camera, renderer, orbit, lightHolder;
    var macGroup, lidGroup, bottomGroup, screenLight;
    var sMat, sTex, sCanvas, sCtx;
    var videoEl = null;
    var videoStream = null;
    var videoInterval = null;
    /** Reused for Face ID when camera permission already granted (instant preview, one prompt). */
    var faceIDSharedVideo = null;
    var faceIDSharedStream = null;
    var faceIDVideoListenersBound = false;
    /** Laptop screen mesh for UV hit-testing (login clicks). */
    var laptopScreenMesh = null;
    var loginRaycaster = null;
    var loginPointerNdc = null;

    var LOGIN_TEX_W = 1024;
    var LOGIN_TEX_H = 680;
    /** No-camera login: single “open desktop” button (texture px). */
    var LOGIN_HIT_OPEN_DESKTOP = { x0: 300, y0: 312, x1: 724, y1: 398 };

    // Apple logo SVG path for canvas drawing
    var applePath = new Path2D('M15.57,13.41c0.03,2.67,2.34,3.56,2.37,3.57c-0.02,0.06-0.37,1.27-1.22,2.51c-0.73,1.07-1.49,2.14-2.68,2.16c-1.18,0.02-1.55-0.7-2.9-0.7c-1.35,0-1.76,0.68-2.87,0.72c-1.15,0.04-2.03-1.16-2.77-2.23c-1.51-2.18-2.66-6.16-1.11-8.85c0.77-1.34,2.14-2.18,3.63-2.2c1.13-0.02,2.21,0.76,2.9,0.76c0.69,0,1.99-0.94,3.35-0.8c0.57,0.02,2.18,0.23,3.21,1.74C17.5,10.16,15.55,11.22,15.57,13.41M13.15,5.56c0.61-0.74,1.02-1.77,0.91-2.8c-0.88,0.04-1.95,0.59-2.58,1.33c-0.57,0.66-1.07,1.71-0.93,2.72C11.59,6.88,12.54,6.3,13.15,5.56');

    // Wallpaper paths (must match js/utils.js `wallpapers` image entries)
    var WALLPAPER_IMAGES = {
        'default': 'wallpapers/pexels-umkreisel-app-956999.jpg',
        'bigsur': 'wallpapers/ashim-d-silva-WeYamle9fDM-unsplash.jpg',
        'monterey': 'wallpapers/iswanto-arif-OJ74pFtrYi0-unsplash.jpg',
        'ventura': 'wallpapers/pexels-philippedonn-1169754.jpg',
        'sonoma': 'wallpapers/pexels-eberhardgross-691668.jpg',
        'catalina': 'wallpapers/pexels-souvenirpixels-417074.jpg'
    };
    var WALLPAPER_GRADIENTS = {
        'animated': ['#FF6B9D', '#C94B7E', '#8B5CF6', '#4A90E2', '#38F9D7', '#FF8E53'],
        'aurora': ['#0f0c29', '#302b63', '#24243e', '#0f0c29', '#1a1a2e'],
        'ocean': ['#0077b6', '#00b4d8', '#90e0ef', '#caf0f8', '#023e8a'],
        'sunset': ['#1a1a2e', '#16213e', '#e94560', '#f97316', '#fbbf24', '#533483', '#0f3460'],
        'matrix': ['#000000', '#001a00', '#003300', '#001a00', '#000000']
    };

    // ── Init ──
    setupScene();
    loadModel();

    // =========================================================================
    //  SCENE SETUP
    // =========================================================================

    function setupScene() {
        scene = new THREE.Scene();

        camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 10, 1000);
        camera.position.set(0, 12, 65);

        renderer = new THREE.WebGLRenderer({ antialias: true, canvas: canvasEl, alpha: false });
        renderer.setClearColor(0x050508);
        renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
        renderer.setSize(innerWidth, innerHeight);

        // Lighting — soft, no harsh spots
        scene.add(new THREE.AmbientLight(0xffffff, 0.45));

        lightHolder = new THREE.Group();
        scene.add(lightHolder);

        var keyLight = new THREE.DirectionalLight(0xfff8f0, 0.55);
        keyLight.position.set(3, 10, 40);
        lightHolder.add(keyLight);

        // Orbit controls — for manual rotation only, never triggers login
        orbit = new THREE.OrbitControls(camera, canvasEl);
        orbit.minDistance = 38;
        orbit.maxDistance = 120;
        orbit.enablePan = false;
        orbit.enableDamping = true;
        orbit.dampingFactor = 0.05;
        orbit.target.set(0, 7, 0);

        // MacBook group — starts far below, will rise to y=-4
        macGroup = new THREE.Group();
        macGroup.position.set(0, -45, -10);
        scene.add(macGroup);

        lidGroup = new THREE.Group();
        macGroup.add(lidGroup);

        bottomGroup = new THREE.Group();
        macGroup.add(bottomGroup);

        // Screen canvas (texture drawn onto the MacBook screen)
        sCanvas = document.createElement('canvas');
        sCanvas.width = 1024;
        sCanvas.height = 680;
        sCtx = sCanvas.getContext('2d');

        sTex = new THREE.CanvasTexture(sCanvas);
        sTex.flipY = false;

        sMat = new THREE.MeshBasicMaterial({ map: sTex, transparent: true, opacity: 0, side: THREE.DoubleSide });

        window.addEventListener('resize', onResize);
    }

    function onResize() {
        camera.aspect = innerWidth / innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(innerWidth, innerHeight);
    }

    // =========================================================================
    //  MODEL LOADING
    // =========================================================================

    function loadModel() {
        new THREE.GLTFLoader().load('models/mac-noUv.glb', onModelLoaded, undefined, function() {
            showFallback();
        });
    }

    function onModelLoaded(glb) {
        var bodyMat = new THREE.MeshStandardMaterial({ color: 0x909094, metalness: 0.85, roughness: 0.18 });
        var darkMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1c, roughness: 0.9, metalness: 0.7 });
        var logoMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, emissive: 0x888888, emissiveIntensity: 0.2, metalness: 0.9, roughness: 0.1 });

        var children = [];
        for (var i = 0; i < glb.scene.children.length; i++) {
            children.push(glb.scene.children[i]);
        }

        children.forEach(function(child) {
            if (child.name === '_top') {
                lidGroup.add(child);
                for (var j = 0; j < child.children.length; j++) {
                    var m = child.children[j];
                    if (m.name === 'lid') m.material = bodyMat;
                    else if (m.name === 'logo') m.material = logoMat;
                    else m.material = darkMat;
                }
            } else if (child.name === '_bottom') {
                bottomGroup.add(child);
                for (var k = 0; k < child.children.length; k++) {
                    child.children[k].material = child.children[k].name === 'base' ? bodyMat : darkMat;
                }
            }
        });

        // Screen mesh
        laptopScreenMesh = new THREE.Mesh(new THREE.PlaneGeometry(29.4, 20), sMat);
        laptopScreenMesh.position.set(0, 10.5, -0.11);
        laptopScreenMesh.rotation.set(Math.PI, 0, 0);
        lidGroup.add(laptopScreenMesh);

        // Subtle screen glow — intensity 0.3 only
        screenLight = new THREE.PointLight(0xffffff, 0, 20);
        screenLight.position.set(0, 10.5, 3);
        lidGroup.add(screenLight);

        // Keyboard texture overlay
        var kbTex = new THREE.TextureLoader().load('models/keyboard-overlay.png');
        var kbMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(27.7, 11.6),
            new THREE.MeshBasicMaterial({ color: 0xffffff, alphaMap: kbTex, transparent: true })
        );
        kbMesh.rotation.set(-Math.PI / 2, 0, 0);
        kbMesh.position.set(0, 0.045, 7.21);
        bottomGroup.add(kbMesh);

        // Lid starts closed
        lidGroup.rotation.x = Math.PI * 0.5;

        phase = 'closed';
        startRenderLoop();
        beginSequence();
    }

    // =========================================================================
    //  CANVAS DRAWING HELPERS
    // =========================================================================

    function clearScreen() {
        sCtx.fillStyle = '#000';
        sCtx.fillRect(0, 0, 1024, 680);
    }

    function faceStreamLive() {
        return !!(faceIDSharedStream && faceIDSharedStream.getTracks().some(function(t) { return t.readyState === 'live'; }));
    }

    function ensureLoginRaycaster() {
        if (!loginRaycaster) {
            loginRaycaster = new THREE.Raycaster();
            loginPointerNdc = new THREE.Vector2();
        }
    }

    /** Map viewport click to 1024×680 login texture coords, or null if not on laptop screen. */
    function loginPointerToTex(clientX, clientY) {
        if (!laptopScreenMesh || !camera) return null;
        ensureLoginRaycaster();
        var rect = canvasEl.getBoundingClientRect();
        var w = rect.width || 1;
        var h = rect.height || 1;
        loginPointerNdc.x = ((clientX - rect.left) / w) * 2 - 1;
        loginPointerNdc.y = -((clientY - rect.top) / h) * 2 + 1;
        loginRaycaster.setFromCamera(loginPointerNdc, camera);
        var hits = loginRaycaster.intersectObject(laptopScreenMesh, false);
        if (!hits.length) return null;
        var uv = hits[0].uv;
        if (!uv) return null;
        var tx = uv.x * LOGIN_TEX_W;
        var ty = (1 - uv.y) * LOGIN_TEX_H;
        return { x: tx, y: ty };
    }

    function loginHitInRect(tx, ty, r) {
        return tx >= r.x0 && tx <= r.x1 && ty >= r.y0 && ty <= r.y1;
    }

    function getActiveFaceVideoEl() {
        if (videoEl && videoEl.srcObject) return videoEl;
        if (faceIDSharedVideo && faceIDSharedVideo.srcObject) return faceIDSharedVideo;
        return null;
    }

    /**
     * Circular mirrored camera preview (shared by login + Face ID flows).
     * @param {object} opts scanLine (bool), outerGlowPhase (number, optional radians for breathing ring)
     */
    function drawCircularMirrorVideo(ctx, vid, cx, cy, radius, opts) {
        opts = opts || {};
        var D = radius * 2;
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.clip();
        var vw = vid ? vid.videoWidth : 0;
        var vh = vid ? vid.videoHeight : 0;
        var hasFrame = vid && vw > 0 && vh > 0 && (vid.readyState >= 2 || (vid.readyState >= 1 && vid.currentTime > 0));
        if (hasFrame) {
            var sx;
            var sy;
            var sw;
            var sh;
            if (vw >= vh) {
                sh = vh;
                sw = vh;
                sx = (vw - sw) / 2;
                sy = 0;
            } else {
                sw = vw;
                sh = vw;
                sx = 0;
                sy = (vh - sh) / 2;
            }
            try {
                ctx.save();
                ctx.translate(cx, cy);
                ctx.scale(-1, 1);
                ctx.drawImage(vid, sx, sy, sw, sh, -radius, -radius, D, D);
                ctx.restore();
                var vig = ctx.createRadialGradient(cx, cy, radius * 0.25, cx, cy, radius);
                vig.addColorStop(0, 'rgba(0,0,0,0)');
                vig.addColorStop(0.78, 'rgba(0,0,0,0)');
                vig.addColorStop(1, 'rgba(0,0,0,0.28)');
                ctx.fillStyle = vig;
                ctx.beginPath();
                ctx.arc(cx, cy, radius, 0, Math.PI * 2);
                ctx.fill();
            } catch (drawErr) {
                hasFrame = false;
            }
        }
        if (!hasFrame) {
            var gWait = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
            gWait.addColorStop(0, '#1a1a22');
            gWait.addColorStop(1, '#050508');
            ctx.fillStyle = gWait;
            ctx.fillRect(cx - radius, cy - radius, D, D);
            ctx.fillStyle = 'rgba(255,255,255,0.28)';
            ctx.font = '13px -apple-system, BlinkMacSystemFont, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Starting camera…', cx, cy);
        }
        ctx.restore();

        ctx.strokeStyle = 'rgba(255,255,255,0.22)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx, cy, radius - 1, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(0,149,255,0.55)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.stroke();

        if (opts.outerGlowPhase != null) {
            var g = 0.35 + 0.25 * Math.sin(opts.outerGlowPhase);
            ctx.strokeStyle = 'rgba(100,200,255,' + g + ')';
            ctx.lineWidth = 2;
            ctx.shadowColor = 'rgba(80,180,255,0.5)';
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.arc(cx, cy, radius + 4, 0, Math.PI * 2);
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        if (opts.scanLine) {
            var scanPhase = (typeof performance !== 'undefined' ? performance.now() : Date.now()) * 0.0012;
            var scanT = (Math.sin(scanPhase) * 0.5 + 0.5);
            var scanY = cy - radius + scanT * (radius * 2);
            ctx.strokeStyle = 'rgba(0,122,255,0.35)';
            ctx.lineWidth = 2;
            ctx.shadowColor = 'rgba(0,149,255,0.4)';
            ctx.shadowBlur = 6;
            ctx.beginPath();
            var halfChord = Math.sqrt(Math.max(0, radius * radius - (scanY - cy) * (scanY - cy)));
            ctx.moveTo(cx - halfChord, scanY);
            ctx.lineTo(cx + halfChord, scanY);
            ctx.stroke();
            ctx.shadowBlur = 0;
        }
    }

    function drawApple(x, y, scale, color) {
        sCtx.save();
        sCtx.translate(x - 10 * scale, y - 10 * scale);
        sCtx.scale(scale, scale);
        sCtx.fillStyle = color || '#fff';
        sCtx.fill(applePath);
        sCtx.restore();
    }

    function playMacbookSlideInSound() {
        try {
            if (typeof playMacbookSlideSound === 'function') {
                playMacbookSlideSound();
            }
        } catch (e) {}
    }

    // =========================================================================
    //  SCREEN STATES
    // =========================================================================

    function drawBootScreen() {
        clearScreen();

        sCtx.save();
        sCtx.shadowColor = 'rgba(255,255,255,0.25)';
        sCtx.shadowBlur = 15;
        drawApple(512, 220, 3.8, '#fff');
        sCtx.restore();

        // Progress bar track
        sCtx.fillStyle = '#2a2a2a';
        sCtx.fillRect(395, 320, 234, 5);
        // Progress bar fill
        sCtx.fillStyle = '#fff';
        sCtx.fillRect(395, 320, bootProgress * 234, 5);

        var msgs = [
            { t: '> docker pull virnahar/devos:latest', role: 'cmd' },
            { t: '  Pulling... done', role: 'ok' },
            { t: '> Loading Kubernetes clusters...', role: 'cmd' },
            { t: '  aks-production ✓', role: 'ok' },
            { t: '  aks-staging ✓', role: 'ok' },
            { t: '> terraform init', role: 'cmd' },
            { t: '  Initialized!', role: 'ok' },
            { t: '> helm upgrade --install devos', role: 'cmd' },
            { t: '  Release upgraded!', role: 'ok' },
            { t: '> Starting DevOS v2.0...', role: 'cmd' },
            { t: '  ✓ Ready', role: 'ready' }
        ];
        sCtx.font = '13px "SF Mono", "JetBrains Mono", ui-monospace, Menlo, Monaco, Consolas, monospace';
        sCtx.textAlign = 'left';
        var lineH = 20;
        var baseY = 352;
        var visible = Math.floor(bootProgress * msgs.length);
        var row0 = Math.max(0, visible - 5);
        for (var i = row0; i < visible; i++) {
            var row = msgs[i];
            var y = baseY + (i - row0) * lineH;
            if (row.role === 'cmd') {
                sCtx.fillStyle = 'rgba(120, 210, 255, 0.95)';
                sCtx.shadowColor = 'rgba(80, 180, 255, 0.35)';
                sCtx.shadowBlur = 4;
            } else if (row.role === 'ready') {
                sCtx.fillStyle = 'rgba(160, 255, 200, 0.98)';
                sCtx.shadowColor = 'rgba(100, 255, 160, 0.4)';
                sCtx.shadowBlur = 6;
            } else {
                sCtx.fillStyle = 'rgba(210, 225, 245, 0.88)';
                sCtx.shadowColor = 'rgba(255,255,255,0.12)';
                sCtx.shadowBlur = 2;
            }
            sCtx.fillText(row.t, 300, y);
            sCtx.shadowBlur = 0;
        }

        sTex.needsUpdate = true;
    }

    function drawGoodbyeScreen() {
        clearScreen();
        sCtx.save();
        sCtx.shadowColor = 'rgba(255,255,255,0.35)';
        sCtx.shadowBlur = 28;
        drawApple(512, 160, 3.4, '#fff');
        sCtx.restore();
        sCtx.fillStyle = '#fff';
        sCtx.font = '300 34px -apple-system, BlinkMacSystemFont, sans-serif';
        sCtx.textAlign = 'center';
        sCtx.fillText('Goodbye!', 512, 300);
        sCtx.fillStyle = 'rgba(255,255,255,0.55)';
        sCtx.font = '15px -apple-system, BlinkMacSystemFont, sans-serif';
        sCtx.fillText('Thank you for visiting', 512, 338);
        sCtx.fillStyle = 'rgba(255,255,255,0.35)';
        sCtx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
        sCtx.fillText('Virendra Kumar — DevOps Technical Architect', 512, 368);
        sTex.needsUpdate = true;
    }

    function injectDesktopRevealStyles() {
        if (document.getElementById('devos-desktop-reveal-css')) return;
        var s = document.createElement('style');
        s.id = 'devos-desktop-reveal-css';
        s.textContent = '#menu-bar.devos-reveal-el,#desktop.devos-reveal-el,.dock.devos-reveal-el{will-change:transform,opacity;}';
        document.head.appendChild(s);
    }

    function drawLoginScreen(showRetry) {
        clearScreen();

        // Apple logo with glow
        sCtx.save();
        sCtx.shadowColor = 'rgba(255,255,255,0.35)';
        sCtx.shadowBlur = 30;
        drawApple(512, 130, 3.1, '#fff');
        sCtx.restore();

        // Name
        sCtx.fillStyle = '#fff';
        sCtx.font = 'bold 26px Arial';
        sCtx.textAlign = 'center';
        sCtx.fillText('Virendra Kumar', 512, 248);

        // Subtitle
        sCtx.fillStyle = '#888';
        sCtx.font = '13px Arial';
        sCtx.fillText("Virendra's DevOs", 512, 278);

        sCtx.fillStyle = 'rgba(255,255,255,0.12)';
        sCtx.fillRect(312, 318, 400, 56);
        sCtx.strokeStyle = 'rgba(255,255,255,0.22)';
        sCtx.lineWidth = 1;
        sCtx.strokeRect(312, 318, 400, 56);
        sCtx.fillStyle = '#eee';
        sCtx.font = '600 15px -apple-system, BlinkMacSystemFont, sans-serif';
        sCtx.fillText('Open DevOS', 512, 352);

        if (showRetry) {
            sCtx.fillStyle = 'rgba(255,120,120,0.75)';
            sCtx.font = '11px Arial';
            sCtx.fillText('Camera unavailable — use button or Enter below', 512, 398);
        } else {
            sCtx.fillStyle = 'rgba(255,255,255,0.35)';
            sCtx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
            sCtx.fillText('Allow camera in your browser to sign in with Face ID automatically', 512, 398);
        }

        sCtx.fillStyle = 'rgba(255,255,255,0.2)';
        sCtx.font = '11px Arial';
        sCtx.fillText('Enter key also opens the desktop', 512, 432);

        sTex.needsUpdate = true;
    }

    function drawFaceIDScreen() {
        clearScreen();

        // Keep login background: Apple logo + name
        sCtx.save();
        sCtx.shadowColor = 'rgba(255,255,255,0.35)';
        sCtx.shadowBlur = 30;
        drawApple(512, 80, 2.0, '#fff');
        sCtx.restore();
        sCtx.fillStyle = '#fff';
        sCtx.font = 'bold 18px Arial';
        sCtx.textAlign = 'center';
        sCtx.fillText('Virendra Kumar', 512, 120);

        // Camera-on indicator: Mac-style green pill + dot (blinks while Face ID active)
        var camT = (typeof performance !== 'undefined' ? performance.now() : Date.now()) * 0.0045;
        var camPulse = 0.42 + 0.58 * (0.5 + 0.5 * Math.sin(camT));
        sCtx.save();
        sCtx.fillStyle = 'rgba(0,0,0,0.4)';
        var nx = 470;
        var ny = 4;
        var nw = 84;
        var nh = 16;
        var nr = 8;
        sCtx.beginPath();
        sCtx.moveTo(nx + nr, ny);
        sCtx.lineTo(nx + nw - nr, ny);
        sCtx.quadraticCurveTo(nx + nw, ny, nx + nw, ny + nr);
        sCtx.lineTo(nx + nw, ny + nh - nr);
        sCtx.quadraticCurveTo(nx + nw, ny + nh, nx + nw - nr, ny + nh);
        sCtx.lineTo(nx + nr, ny + nh);
        sCtx.quadraticCurveTo(nx, ny + nh, nx, ny + nh - nr);
        sCtx.lineTo(nx, ny + nr);
        sCtx.quadraticCurveTo(nx, ny, nx + nr, ny);
        sCtx.closePath();
        sCtx.fill();
        sCtx.fillStyle = 'rgba(34,197,94,' + (0.55 + 0.45 * camPulse) + ')';
        sCtx.shadowColor = 'rgba(34,197,94,0.85)';
        sCtx.shadowBlur = 10 * camPulse;
        sCtx.beginPath();
        sCtx.arc(512, 12, 4.2, 0, Math.PI * 2);
        sCtx.fill();
        sCtx.shadowBlur = 0;
        sCtx.fillStyle = 'rgba(187,247,208,' + (0.35 + 0.5 * camPulse) + ')';
        sCtx.font = '700 7px -apple-system, BlinkMacSystemFont, sans-serif';
        sCtx.textAlign = 'center';
        sCtx.textBaseline = 'middle';
        sCtx.fillText('Camera', 524, 12);
        sCtx.restore();

        var cx = 512;
        var cy = 312;
        var radius = 128;
        var vidFace = getActiveFaceVideoEl();
        drawCircularMirrorVideo(sCtx, vidFace, cx, cy, radius, { scanLine: true });

        // Status text
        sCtx.fillStyle = '#fff';
        sCtx.font = 'bold 14px Arial';
        sCtx.textAlign = 'center';
        sCtx.fillText('Verifying Face ID...', 512, 468);

        sCtx.fillStyle = 'rgba(255,255,255,0.38)';
        sCtx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
        sCtx.fillText('Enter — skip and open desktop', 512, 508);

        sTex.needsUpdate = true;
    }

    function drawFaceIDSuccess() {
        clearScreen();

        sCtx.save();
        sCtx.shadowColor = 'rgba(255,255,255,0.35)';
        sCtx.shadowBlur = 30;
        drawApple(512, 80, 2.0, '#fff');
        sCtx.restore();
        sCtx.fillStyle = '#fff';
        sCtx.font = 'bold 18px Arial';
        sCtx.textAlign = 'center';
        sCtx.fillText('Virendra Kumar', 512, 120);

        // Green checkmark where the circle was
        sCtx.fillStyle = '#00ff00';
        sCtx.font = 'bold 48px Arial';
        sCtx.fillText('✓', 512, 325);
        sCtx.fillStyle = '#fff';
        sCtx.font = '16px Arial';
        sCtx.fillText('Face ID Verified', 512, 380);

        sTex.needsUpdate = true;
    }

    function drawWallpaperAreaDesktop() {
        var key = 'bigsur';
        try {
            key = localStorage.getItem('macOS-wallpaper') || 'bigsur';
        } catch (e) {}

        var y0 = 24;
        var h = 656;
        var w = 1024;

        if (WALLPAPER_IMAGES[key] && cachedWallpaperKey === key && cachedWallpaperImg && cachedWallpaperImg.complete && cachedWallpaperImg.naturalWidth) {
            var iw = cachedWallpaperImg.naturalWidth;
            var ih = cachedWallpaperImg.naturalHeight;
            var scale = Math.max(w / iw, h / ih);
            var dw = iw * scale;
            var dh = ih * scale;
            var dx = (w - dw) / 2;
            var dy = y0 + (h - dh) / 2;
            sCtx.drawImage(cachedWallpaperImg, dx, dy, dw, dh);
            return;
        }

        if (WALLPAPER_GRADIENTS[key]) {
            var stops = WALLPAPER_GRADIENTS[key];
            var lg = sCtx.createLinearGradient(0, y0, w, y0 + h);
            var denom = Math.max(1, stops.length - 1);
            for (var s = 0; s < stops.length; s++) {
                lg.addColorStop(s / denom, stops[s]);
            }
            sCtx.fillStyle = lg;
            sCtx.fillRect(0, y0, w, h);
            return;
        }

        if (WALLPAPER_IMAGES[key]) {
            if (cachedWallpaperKey !== key || !cachedWallpaperImg) {
                cachedWallpaperKey = key;
                cachedWallpaperImg = new Image();
                cachedWallpaperImg.onload = function() {
                    if (phase === 'desktop' || phase === 'zoomout') {
                        drawDesktopScreen();
                    }
                };
                cachedWallpaperImg.src = WALLPAPER_IMAGES[key];
            }
            var g = sCtx.createRadialGradient(512, y0 + h * 0.45, 40, 512, y0 + h * 0.5, 480);
            g.addColorStop(0, '#1e2a3a');
            g.addColorStop(0.55, '#0f1419');
            g.addColorStop(1, '#050508');
            sCtx.fillStyle = g;
            sCtx.fillRect(0, y0, w, h);
            sCtx.fillStyle = 'rgba(255,255,255,0.2)';
            sCtx.font = '12px Arial';
            sCtx.textAlign = 'center';
            sCtx.fillText('Loading wallpaper…', 512, y0 + h / 2);
            return;
        }

        var g2 = sCtx.createRadialGradient(512, y0 + h * 0.45, 50, 512, y0 + h * 0.5, 500);
        g2.addColorStop(0, '#1e2a3a');
        g2.addColorStop(0.5, '#0f1419');
        g2.addColorStop(1, '#050508');
        sCtx.fillStyle = g2;
        sCtx.fillRect(0, y0, w, h);
    }

    function drawDesktopScreen(showHeroApple, heroPulse) {
        showHeroApple = !!showHeroApple;
        heroPulse = typeof heroPulse === 'number' ? heroPulse : 0;

        clearScreen();

        sCtx.fillStyle = 'rgba(255,255,255,0.1)';
        sCtx.fillRect(0, 0, 1024, 24);
        sCtx.fillStyle = '#fff';
        sCtx.font = '10px Arial';
        sCtx.textAlign = 'left';
        sCtx.fillText("  Virendra's OS  File  Edit  View", 8, 16);

        drawWallpaperAreaDesktop();

        if (showHeroApple) {
            var pulse = 1 + Math.sin(heroPulse) * 0.08;
            sCtx.save();
            sCtx.shadowColor = 'rgba(255,255,255,0.45)';
            sCtx.shadowBlur = 32;
            drawApple(512, 338, 4.4 * pulse, '#ffffff');
            sCtx.restore();
            sCtx.shadowBlur = 0;
            sCtx.fillStyle = 'rgba(255,255,255,0.55)';
            sCtx.font = '600 12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
            sCtx.textAlign = 'center';
            sCtx.fillText("Vir's DevOs", 512, 408);
        }

        var apps = ['📁', '💻', '📝', '📄', '✉️', '🎵', '🎮', '👨‍💻', '📊', '⚙️'];
        sCtx.font = '28px serif';
        sCtx.textAlign = 'center';
        for (var i = 0; i < apps.length; i++) {
            sCtx.fillText(apps[i], 180 + (i % 5) * 160, 140 + Math.floor(i / 5) * 100);
        }

        sCtx.fillStyle = 'rgba(255,255,255,0.06)';
        sCtx.fillRect(250, 620, 524, 32);

        sTex.needsUpdate = true;
    }

    // =========================================================================
    //  MAIN ANIMATION SEQUENCE
    // =========================================================================

    function beginSequence() {
        try {
            if (typeof unlockDevosAudioOnce === 'function') unlockDevosAudioOnce();
            if (typeof resumeDevosAudio === 'function') resumeDevosAudio();
        } catch (e0) {}
        setTimeout(function() {
            playMacbookSlideInSound();
        }, 80);

        // Rise + settle pitch/roll before lid (y → 0 so orbit reads clearly)
        gsap.to(macGroup.position, { duration: 2.6, y: -4, ease: 'power1.out' });
        gsap.fromTo(
            macGroup.rotation,
            { x: 0.14, y: 0.1 },
            { duration: 2, x: 0.06, y: 0, ease: 'sine.out' }
        );

        // Lid opens 2–5s; full 360° yaw while lid moves (quick, smooth)
        gsap.to(lidGroup.rotation, {
            duration: 3,
            x: -Math.PI * 0.12,
            ease: 'power2.inOut',
            delay: 2
        });
        var spinLid = { angle: 0 };
        gsap.to(spinLid, {
            angle: Math.PI * 2,
            duration: 2.65,
            delay: 2,
            ease: 'power1.inOut',
            onUpdate: function() {
                macGroup.rotation.y = spinLid.angle;
            }
        });

        // ~4s: Screen turns on
        gsap.to(sMat, { duration: 0.5, opacity: 0.96, delay: 3.8 });
        gsap.to(screenLight, { duration: 0.6, intensity: 0.3, delay: 3.9 });

        // ~4s: Show cursor trail canvas
        setTimeout(function() {
            if (cursorCanvas) cursorCanvas.style.display = '';
        }, 4000);

        // 3–6s: Camera moves to face the screen (boot may already be on screen)
        gsap.to(camera.position, {
            duration: 3,
            x: 0,
            y: 14,
            z: 48,
            ease: 'power2.inOut',
            delay: 3,
            onUpdate: function() {
                camera.lookAt(0, 7, 0);
            }
        });

        // Boot on laptop as soon as lid is fully open (~5s), even if 360° still finishing
        setTimeout(function() {
            startBoot();
        }, 5000);

        // 6s: Gentle floating begins
        setTimeout(startFloating, 6000);
    }

    function startBoot() {
        if (bootSequenceStarted) return;
        bootSequenceStarted = true;
        phase = 'booting';

        try {
            if (typeof playStartupSound === 'function') playStartupSound();
        } catch (e) {}

        var bootInterval = setInterval(function() {
            bootProgress += 0.005;
            drawBootScreen();
            if (bootProgress >= 1) {
                clearInterval(bootInterval);
                transitionBootToLogin();
            }
        }, 33);
    }

    function startFloating() {
        floatingTween = gsap.to(macGroup.position, {
            y: '+=0.25',
            duration: 4,
            ease: 'sine.inOut',
            yoyo: true,
            repeat: -1
        });
    }

    // =========================================================================
    //  BOOT → LOGIN TRANSITION (fade through black)
    // =========================================================================

    function transitionBootToLogin() {
        var fadeProxy = { alpha: 1 };

        // Fade boot screen out over 0.3s
        gsap.to(fadeProxy, {
            alpha: 0,
            duration: 0.3,
            onUpdate: function() {
                sCtx.globalAlpha = fadeProxy.alpha;
                drawBootScreen();
                sCtx.globalAlpha = 1;
            },
            onComplete: function() {
                // Black frame
                clearScreen();
                sTex.needsUpdate = true;

                // Fade login screen in over 0.5s
                var fadeIn = { alpha: 0 };
                gsap.to(fadeIn, {
                    alpha: 1,
                    duration: 0.5,
                    onUpdate: function() {
                        sCtx.globalAlpha = fadeIn.alpha;
                        drawLoginScreen();
                        sCtx.globalAlpha = 1;
                    },
                    onComplete: function() {
                        phase = 'login';
                        loginClickEnabled = true;
                        autoFaceLoginArmed = true;
                        setTimeout(preloadFaceCameraWhenPermitted, 350);
                    }
                });
            }
        });
    }

    function ensureSharedFaceVideo() {
        if (!faceIDSharedVideo) {
            faceIDSharedVideo = document.createElement('video');
            faceIDSharedVideo.setAttribute('playsinline', '');
            faceIDSharedVideo.setAttribute('webkit-playsinline', 'true');
            faceIDSharedVideo.setAttribute('autoplay', '');
            faceIDSharedVideo.muted = true;
            faceIDSharedVideo.playsInline = true;
            faceIDSharedVideo.setAttribute('aria-hidden', 'true');
            faceIDSharedVideo.style.cssText = 'position:fixed!important;left:0!important;top:0!important;width:1px!important;height:1px!important;opacity:0!important;pointer-events:none!important;z-index:-1!important;object-fit:cover;';
            try {
                document.body.appendChild(faceIDSharedVideo);
            } catch (e) {}
        }
        return faceIDSharedVideo;
    }

    function releaseFacePreloadOnly() {
        if (faceIDSharedStream) {
            try {
                faceIDSharedStream.getTracks().forEach(function(t) { t.stop(); });
            } catch (e) {}
            faceIDSharedStream = null;
        }
        if (faceIDSharedVideo) {
            try {
                faceIDSharedVideo.srcObject = null;
            } catch (e2) {}
        }
    }

    function preloadFaceCameraWhenPermitted() {
        if (phase !== 'login' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
        if (faceIDSharedStream && faceIDSharedStream.getTracks().some(function(t) { return t.readyState === 'live'; })) return;
        function tryGet() {
            if (phase !== 'login') return;
            navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false })
                .then(function(stream) {
                    if (phase !== 'login') {
                        stream.getTracks().forEach(function(t) { t.stop(); });
                        return;
                    }
                    faceIDSharedStream = stream;
                    var v = ensureSharedFaceVideo();
                    v.srcObject = stream;
                    v.play().catch(function() {});
                })
                .catch(function() {});
        }
        if (navigator.permissions && navigator.permissions.query) {
            navigator.permissions.query({ name: 'camera' }).then(function(p) {
                if (p.state === 'granted') tryGet();
                p.addEventListener('change', function() {
                    if (p.state === 'granted' && phase === 'login' && (!faceIDSharedStream || !faceIDSharedStream.getTracks().some(function(t) { return t.readyState === 'live'; }))) {
                        tryGet();
                    }
                });
            }).catch(function() {
                setTimeout(function() {
                    if (phase === 'login') tryGet();
                }, 600);
            });
        } else {
            setTimeout(function() {
                if (phase === 'login') tryGet();
            }, 600);
        }
    }

    function stopFaceIDTimersOnly() {
        if (faceIDRafId != null) {
            cancelAnimationFrame(faceIDRafId);
            faceIDRafId = null;
        }
        if (faceIDVerifyTimer) {
            clearTimeout(faceIDVerifyTimer);
            faceIDVerifyTimer = null;
        }
        if (videoInterval) {
            clearInterval(videoInterval);
            videoInterval = null;
        }
        if (faceIDFallbackInterval) {
            clearInterval(faceIDFallbackInterval);
            faceIDFallbackInterval = null;
        }
    }

    // =========================================================================
    //  LOGIN — INPUT HANDLING
    // =========================================================================

    canvasEl.addEventListener('pointerdown', function(e) {
        try {
            if (typeof resumeDevosAudio === 'function') resumeDevosAudio();
        } catch (err) {}
        if (e.button !== 0) return;
        pointerDown = { x: e.clientX, y: e.clientY, t: typeof performance !== 'undefined' ? performance.now() : Date.now() };
    });

    canvasEl.addEventListener('pointerup', function(e) {
        if (e.button !== 0) return;
        if (phase !== 'login' || !loginClickEnabled || !pointerDown) {
            pointerDown = null;
            return;
        }
        var now = typeof performance !== 'undefined' ? performance.now() : Date.now();
        var dx = e.clientX - pointerDown.x;
        var dy = e.clientY - pointerDown.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        var dt = now - pointerDown.t;
        pointerDown = null;
        if (dist > 12 || dt > 900) return;

        var tex = loginPointerToTex(e.clientX, e.clientY);
        if (tex && loginHitInRect(tex.x, tex.y, LOGIN_HIT_OPEN_DESKTOP)) {
            directLogin();
            return;
        }

        var rect = canvasEl.getBoundingClientRect();
        var ny = (e.clientY - rect.top) / rect.height;
        if (ny >= 0.44 && ny < 0.58) {
            directLogin();
        }
    });

    canvasEl.addEventListener('pointercancel', function() {
        pointerDown = null;
    });

    document.addEventListener('keydown', function(e) {
        if (e.key !== 'Enter') return;
        if (phase === 'facelogin') {
            directLogin();
        } else if (phase === 'login' && loginClickEnabled) {
            directLogin();
        }
    });

    // =========================================================================
    //  DIRECT LOGIN
    // =========================================================================

    function directLogin() {
        if (phase !== 'login' && phase !== 'facelogin') return;
        autoFaceLoginArmed = false;
        if (phase === 'facelogin') {
            stopFaceIDTimersOnly();
        }
        stopCamera();
        phase = 'transitioning';
        loginClickEnabled = false;

        // White checkmark for 0.5s
        clearScreen();
        sCtx.fillStyle = '#fff';
        sCtx.font = 'bold 48px Arial';
        sCtx.textAlign = 'center';
        sCtx.fillText('✓', 512, 350);
        sTex.needsUpdate = true;

        setTimeout(function() {
            showDesktopAndZoom();
        }, 500);
    }

    // =========================================================================
    //  FACE ID LOGIN
    // =========================================================================

    var faceIDPlayToken = 0;

    function faceIDLogin() {
        if (phase !== 'login') return;
        stopFaceIDTimersOnly();

        var hasLive = faceIDSharedStream && faceIDSharedStream.getTracks().some(function(t) { return t.readyState === 'live'; });
        if (!hasLive) {
            releaseFacePreloadOnly();
            if (videoEl && videoEl !== faceIDSharedVideo) {
                try {
                    if (videoStream) videoStream.getTracks().forEach(function(t) { t.stop(); });
                } catch (e0) {}
                try {
                    if (videoEl.parentNode) videoEl.parentNode.removeChild(videoEl);
                } catch (e1) {}
                videoEl = null;
                videoStream = null;
            }
        }

        phase = 'facelogin';
        loginClickEnabled = false;

        if (hasLive) {
            onCameraGranted(faceIDSharedStream);
            return;
        }

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            onCameraDenied();
            return;
        }

        var tries = [
            { video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } },
            { video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' } },
            { video: { facingMode: 'user' } },
            { video: true }
        ];
        function attempt(i) {
            if (phase !== 'facelogin') return;
            if (i >= tries.length) {
                onCameraDenied();
                return;
            }
            navigator.mediaDevices.getUserMedia(tries[i])
                .then(onCameraGranted)
                .catch(function() {
                    attempt(i + 1);
                });
        }
        setTimeout(function() {
            if (phase === 'facelogin') attempt(0);
        }, 100);
    }

    function faceIDFrameLoop() {
        if (phase !== 'facelogin') return;
        drawFaceIDScreen();
        var v = getActiveFaceVideoEl();
        if (v && v.paused) {
            try {
                v.play();
            } catch (pe) {}
        }
        faceIDRafId = requestAnimationFrame(faceIDFrameLoop);
    }

    function scheduleFaceIDComplete() {
        if (faceIDVerifyTimer) clearTimeout(faceIDVerifyTimer);
        faceIDVerifyTimer = setTimeout(function() {
            faceIDVerifyTimer = null;
            if (phase !== 'facelogin') return;
            stopCamera();
            playFaceIDSuccessSound();
            drawFaceIDSuccess();

            setTimeout(function() {
                showDesktopAndZoom();
            }, 800);
        }, 2200);
    }

    function onCameraGranted(stream) {
        var myTok = ++faceIDPlayToken;
        videoStream = stream;
        faceIDSharedStream = stream;
        videoEl = ensureSharedFaceVideo();
        videoEl.srcObject = stream;

        if (faceIDFallbackInterval) {
            clearInterval(faceIDFallbackInterval);
            faceIDFallbackInterval = null;
        }
        faceIDFallbackInterval = setInterval(function() {
            if (phase !== 'facelogin' || faceIDPlayToken !== myTok) return;
            var v = getActiveFaceVideoEl();
            if (!v) return;
            if (v.paused) {
                try {
                    v.play();
                } catch (pe) {}
            }
            drawFaceIDScreen();
        }, 100);

        var faceIDFlowStarted = false;
        function beginFaceIDFlow() {
            if (faceIDFlowStarted || faceIDPlayToken !== myTok || phase !== 'facelogin') return;
            try {
                if (typeof resumeDevosAudio === 'function') resumeDevosAudio();
            } catch (e0) {}
            var attemptPlay = function(n) {
                if (faceIDFlowStarted || faceIDPlayToken !== myTok || phase !== 'facelogin') return;
                var vPlay = getActiveFaceVideoEl();
                var pr = vPlay ? vPlay.play() : null;
                if (pr && typeof pr.then === 'function') {
                    pr.then(function() {
                        if (faceIDFlowStarted || faceIDPlayToken !== myTok) return;
                        faceIDFlowStarted = true;
                        faceIDFrameLoop();
                        scheduleFaceIDComplete();
                    }).catch(function() {
                        if (n < 20) setTimeout(function() { attemptPlay(n + 1); }, 100);
                    });
                } else {
                    faceIDFlowStarted = true;
                    faceIDFrameLoop();
                    scheduleFaceIDComplete();
                }
            };
            attemptPlay(0);
        }

        function hookMeta() {
            if (faceIDPlayToken !== myTok) return;
            drawFaceIDScreen();
            beginFaceIDFlow();
        }
        videoEl.onloadedmetadata = hookMeta;
        videoEl.onloadeddata = function() { beginFaceIDFlow(); };
        videoEl.onplaying = function() { beginFaceIDFlow(); };
        videoEl.oncanplay = function() { beginFaceIDFlow(); };
        videoEl.oncanplaythrough = function() { beginFaceIDFlow(); };

        setTimeout(function() {
            if (faceIDPlayToken === myTok && phase === 'facelogin') beginFaceIDFlow();
        }, 50);
        setTimeout(function() {
            if (faceIDPlayToken === myTok && phase === 'facelogin') beginFaceIDFlow();
        }, 200);
        setTimeout(function() {
            if (faceIDPlayToken === myTok && phase === 'facelogin') beginFaceIDFlow();
        }, 600);
    }

    function onCameraDenied() {
        stopCamera();
        autoFaceLoginArmed = true;
        drawLoginScreen(true);
        phase = 'login';
        loginClickEnabled = true;
    }

    function stopCamera() {
        stopFaceIDTimersOnly();
        if (videoStream) {
            try {
                videoStream.getTracks().forEach(function(t) { t.stop(); });
            } catch (e) {}
            videoStream = null;
        }
        faceIDSharedStream = null;
        if (faceIDSharedVideo) {
            try {
                faceIDSharedVideo.srcObject = null;
            } catch (e2) {}
        }
        videoEl = null;
    }

    function playFaceIDSuccessSound() {
        try {
            if (typeof playFaceIDUnlockSound === 'function') {
                playFaceIDUnlockSound();
            }
        } catch (e) {}
    }

    // =========================================================================
    //  DESKTOP + ZOOM TO REAL UI
    // =========================================================================

    function showDesktopAndZoom() {
        phase = 'desktop';
        orbit.enabled = false;

        var hint = document.getElementById('macbook-hint');
        if (hint) hint.style.display = 'none';

        drawDesktopScreen(true, 0);

        requestAnimationFrame(function() {
            requestAnimationFrame(startZoomToReal);
        });
    }

    function syncZoomLookToDesktopApple() {
        var el = document.getElementById('desktop-apple-logo');
        var desk = document.getElementById('desktop');
        if (!el || !desk) return;
        var prevD = desk.style.display;
        var prevV = desk.style.visibility;
        var prevPE = desk.style.pointerEvents;
        desk.style.display = 'grid';
        desk.style.visibility = 'hidden';
        desk.style.pointerEvents = 'none';
        void desk.offsetHeight;
        var r = el.getBoundingClientRect();
        if (prevD) desk.style.display = prevD;
        else desk.style.removeProperty('display');
        if (prevV) desk.style.visibility = prevV;
        else desk.style.removeProperty('visibility');
        if (prevPE) desk.style.pointerEvents = prevPE;
        else desk.style.removeProperty('pointer-events');
        if (r.width < 2 || r.height < 2) return;
        var cx = (r.left + r.right) / 2;
        var cy = (r.top + r.bottom) / 2;
        var nx = (cx / window.innerWidth - 0.5) * 2;
        var ny = (cy / window.innerHeight - 0.5) * 2;
        zoomLookTarget.set(nx * 1.85, 10.68 - ny * 1.35, -0.32 - nx * 0.14);
    }

    function startZoomToReal() {
        phase = 'zoomout';
        zoomHeroPhase = 0;
        zoomRedrawSkip = 0;
        syncZoomLookToDesktopApple();

        if (floatingTween) {
            floatingTween.kill();
            floatingTween = null;
        }
        gsap.killTweensOf(macGroup.position);

        var look = zoomLookTarget;
        gsap.killTweensOf(macGroup.rotation);

        var zoomSec = 3.05;
        var tl = gsap.timeline();
        tl.to(camera.position, {
            duration: zoomSec,
            x: 0,
            y: 10.48,
            z: 15.1,
            ease: 'power2.inOut',
            onUpdate: function() {
                camera.lookAt(look);
            }
        }, 0)
        .to(camera, {
            duration: zoomSec,
            fov: 7.8,
            ease: 'power2.inOut',
            onUpdate: function() {
                camera.updateProjectionMatrix();
            }
        }, 0);

        var revealAt = Math.round(zoomSec * 1000 * 0.52);
        setTimeout(revealRealDesktop, revealAt);
    }

    function revealRealDesktop() {
        var menuBar = document.getElementById('menu-bar');
        var desktop = document.getElementById('desktop');
        var dock = document.querySelector('.dock');

        injectDesktopRevealStyles();

        function prepReveal(el) {
            if (!el) return;
            el.classList.add('devos-reveal-el');
            el.style.opacity = '0';
            el.style.transition = 'none';
            if (el.classList.contains('dock')) {
                el.style.transformOrigin = '50% 100%';
                el.style.transform = 'translateX(-50%) translateY(28px) scale(0.94)';
            } else if (el.classList.contains('menu-bar')) {
                el.style.transformOrigin = '50% 0%';
                el.style.transform = 'translateY(-14px) scale(0.985)';
            } else {
                el.style.transformOrigin = '50% 42%';
                el.style.transform = 'translateY(16px) scale(0.94)';
            }
        }

        if (menuBar) menuBar.style.display = 'flex';
        if (desktop) desktop.style.display = 'grid';
        if (dock) dock.style.display = 'flex';

        prepReveal(menuBar);
        prepReveal(desktop);
        prepReveal(dock);

        document.body.classList.add('logged-in');

        var easeOut = 'cubic-bezier(0.22, 1, 0.36, 1)';
        if (startupScreen) {
            startupScreen.style.opacity = '1';
            startupScreen.style.transition = 'opacity 1s cubic-bezier(0.33, 0.86, 0.32, 1), filter 1s ease';
            startupScreen.style.transformOrigin = '50% 48%';
            startupScreen.style.transform = 'scale(1)';
            startupScreen.style.filter = 'blur(0px)';
            requestAnimationFrame(function() {
                requestAnimationFrame(function() {
                    startupScreen.style.opacity = '0';
                    startupScreen.style.filter = 'blur(12px)';
                });
            });
            stopRenderLoop();
            bootCompleted3d = true;
            setTimeout(function() {
                startupScreen.style.display = 'none';
                startupScreen.style.transform = '';
                startupScreen.style.transformOrigin = '';
                startupScreen.style.filter = '';
                startupScreen.style.transition = '';
                phase = 'done';
            }, 1080);
        } else {
            bootCompleted3d = true;
            phase = 'done';
            stopRenderLoop();
        }

        requestAnimationFrame(function() {
            requestAnimationFrame(function() {
                if (menuBar) {
                    menuBar.style.transition = 'opacity 0.78s ' + easeOut + ', transform 0.82s ' + easeOut;
                    menuBar.style.opacity = '1';
                    menuBar.style.transform = 'translateY(0) scale(1)';
                }
                setTimeout(function() {
                    if (desktop) {
                        desktop.style.transition = 'opacity 0.82s ' + easeOut + ', transform 0.88s ' + easeOut;
                        desktop.style.opacity = '1';
                        desktop.style.transform = 'translateY(0) scale(1)';
                    }
                }, 36);
                setTimeout(function() {
                    if (dock) {
                        dock.style.transition = 'opacity 0.78s ' + easeOut + ', transform 0.82s ' + easeOut;
                        dock.style.opacity = '1';
                        dock.style.transform = 'translateX(-50%) translateY(0) scale(1)';
                    }
                }, 72);
            });
        });

        setTimeout(function() {
            [menuBar, desktop, dock].forEach(function(el) {
                if (!el) return;
                el.style.transition = '';
                el.style.opacity = '';
                el.style.transform = '';
                el.style.transformOrigin = '';
                el.classList.remove('devos-reveal-el');
            });
        }, 1650);

        if (!localStorage.getItem('devos-welcomed')) {
            localStorage.setItem('devos-welcomed', 'true');
            setTimeout(function() {
                if (typeof showNotification === 'function') {
                    showNotification('Welcome to DevOS!', 'Try ⌘/Ctrl+Space for Spotlight. Hand Magic: palm About Me, point scroll, ✌️ Contact, 👍 Terminal, 👎 Trash, ✊ Sleep, 👌 Restart, palm swipe Shut Down.');
                }
            }, 1650);
        }

        if (typeof calculateExperience === 'function') calculateExperience();
    }

    // =========================================================================
    //  RENDER LOOP
    // =========================================================================

    function startRenderLoop() {
        renderLoopActive = true;
        requestAnimationFrame(renderFrame);
    }

    function stopRenderLoop() {
        renderLoopActive = false;
    }

    function renderFrame() {
        if (!renderLoopActive) return;
        requestAnimationFrame(renderFrame);
        if (phase === 'done') return;
        if (phase === 'zoomout') {
            zoomRedrawSkip++;
            if (zoomRedrawSkip % 2 === 0) {
                zoomHeroPhase += 0.1;
                drawDesktopScreen(true, zoomHeroPhase);
            }
        }
        orbit.update();
        if (lightHolder) lightHolder.quaternion.copy(camera.quaternion);
        if (phase === 'login' && loginClickEnabled && faceStreamLive() && autoFaceLoginArmed) {
            autoFaceLoginArmed = false;
            faceIDLogin();
        }
        renderer.render(scene, camera);
    }

    // =========================================================================
    //  FALLBACK
    // =========================================================================

    function showFallback() {
        var loginEl = document.getElementById('login-screen');
        if (loginEl) {
            loginEl.style.display = 'flex';
            loginEl.style.opacity = '1';
        }
        var startupEl = document.getElementById('startup-screen');
        if (startupEl) {
            setTimeout(function() {
                startupEl.style.transition = 'opacity 1s';
                startupEl.style.opacity = '0';
                setTimeout(function() {
                    startupEl.style.display = 'none';
                }, 1000);
            }, 1500);
        }
    }

    // =========================================================================
    //  SHUTDOWN / RESTART — reverse lid + sink (keeps WebGL context; no innerHTML)
    // =========================================================================

    function transitionLogoutToLogin() {
        clearScreen();
        sTex.needsUpdate = true;
        var fadeIn = { alpha: 0 };
        gsap.to(fadeIn, {
            alpha: 1,
            duration: 0.7,
            ease: 'power2.out',
            onUpdate: function() {
                sCtx.globalAlpha = fadeIn.alpha;
                drawLoginScreen();
                sCtx.globalAlpha = 1;
            },
            onComplete: function() {
                phase = 'login';
                loginClickEnabled = true;
                autoFaceLoginArmed = true;
                if (orbit) orbit.enabled = true;
                setTimeout(preloadFaceCameraWhenPermitted, 350);
            }
        });
    }

    window._macbookLogoutSequence = function() {
        if (!bootCompleted3d || !scene || !renderer || !macGroup || !lidGroup) {
            return false;
        }

        if (floatingTween) {
            floatingTween.kill();
            floatingTween = null;
        }
        gsap.killTweensOf(macGroup.position);

        var startup = document.getElementById('startup-screen');
        if (startup) {
            startup.style.display = 'block';
            startup.style.opacity = '0';
            startup.style.pointerEvents = 'auto';
            startup.style.transition = 'opacity 0.55s ease';
            requestAnimationFrame(function() {
                startup.style.opacity = '1';
            });
        }

        phase = 'logout_anim';
        loginClickEnabled = false;
        if (orbit) orbit.enabled = false;

        startRenderLoop();

        gsap.timeline()
            .to(camera, {
                duration: 1.55,
                fov: 40,
                ease: 'power2.inOut',
                onUpdate: function() {
                    camera.updateProjectionMatrix();
                }
            }, 0)
            .to(camera.position, {
                duration: 1.6,
                x: 0,
                y: 14,
                z: 48,
                ease: 'power2.inOut',
                onUpdate: function() {
                    camera.lookAt(0, 7, 0);
                }
            }, 0)
            .to(macGroup.position, {
                y: -4,
                duration: 1,
                ease: 'power2.out'
            }, 0.15)
            .to(lidGroup.rotation, {
                x: -Math.PI * 0.12,
                duration: 0.6,
                ease: 'power2.out'
            }, 0.2)
            .call(function() {
                gsap.to(sMat, { opacity: 0.96, duration: 0.45 });
                gsap.to(screenLight, { intensity: 0.3, duration: 0.45 });
            }, null, 1.25)
            .call(function() {
                transitionLogoutToLogin();
            }, null, 1.55);

        return true;
    };

    window._macbookShutdownSequence = function(onComplete) {
        if (!bootCompleted3d || !scene || !renderer || !macGroup || !lidGroup) {
            if (typeof onComplete === 'function') onComplete();
            return;
        }

        if (floatingTween) {
            floatingTween.kill();
            floatingTween = null;
        }
        gsap.killTweensOf(macGroup.position);

        var startup = document.getElementById('startup-screen');
        if (startup) {
            startup.style.display = 'block';
            startup.style.opacity = '0';
            startup.style.pointerEvents = 'auto';
            startup.style.transition = 'opacity 0.6s ease';
            requestAnimationFrame(function() {
                startup.style.opacity = '1';
            });
        }

        phase = 'shutdown_anim';
        if (orbit) orbit.enabled = false;

        drawGoodbyeScreen();
        if (renderer && scene && camera) {
            try {
                renderer.render(scene, camera);
            } catch (eR) {}
        }

        startRenderLoop();

        var tl = gsap.timeline({
            onComplete: function() {
                stopRenderLoop();
                phase = 'done';
                if (typeof onComplete === 'function') onComplete();
            }
        });

        tl.to(camera, {
            fov: 40,
            duration: 1.65,
            ease: 'power3.out',
            onUpdate: function() {
                camera.updateProjectionMatrix();
            }
        }, 0)
        .to(camera.position, {
            x: 0,
            y: 14,
            z: 48,
            duration: 1.7,
            ease: 'power3.out',
            onUpdate: function() {
                camera.lookAt(0, 7, 0);
            }
        }, 0)
        .to(macGroup.position, {
            y: -4,
            duration: 1,
            ease: 'power2.out'
        }, 0.08)
        .call(function() {
            gsap.to(sMat, { opacity: 0.96, duration: 0.5 });
            gsap.to(screenLight, { intensity: 0.32, duration: 0.5 });
            drawGoodbyeScreen();
            if (renderer && scene && camera) {
                try {
                    renderer.render(scene, camera);
                } catch (eG) {}
            }
        }, null, 0.95)
        .to({ _hold: 0 }, { _hold: 1, duration: 2.65 })
        .to(sMat, { opacity: 0, duration: 0.65, ease: 'power2.in' })
        .to(screenLight, { intensity: 0, duration: 0.65, ease: 'power2.in' }, '<')
        .to(lidGroup.rotation, {
            x: Math.PI * 0.5,
            duration: 2.2,
            ease: 'power2.inOut'
        }, '-=0.35')
        .to(macGroup.position, {
            y: -45,
            duration: 2,
            ease: 'power3.in'
        }, '-=1.55');
    };

    window._macbookShutdown = function() {
        window._macbookShutdownSequence(function() {});
        return true;
    };

    window._macbookRestart = function() {
        if (typeof window.performRestart === 'function') {
            window.performRestart();
            return;
        }
        window._macbookShutdownSequence(function() {
            window.location.reload();
        });
    };

})();
