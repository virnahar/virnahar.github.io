/**
 * Hand Magic — PiP-only: clear camera + skeleton overlay. Desktop stays unobstructed.
 * Gestures: palm still → About Me (Resume) | point → scroll | ✌️ → Contact | 👍 → Terminal |
 * 👎 → Trash | ✊ → Sleep | 👌 → Restart | palm swipe → Shut Down
 */
(function() {
    'use strict';

    var active = false;
    var loaded = false;
    var hands = null;
    var camUtils = null;
    var mpCamera = null;
    var lastGestureFire = {};
    var GESTURE_COOLDOWN_MS = { default: 2200, ok_sign: 10000, thumbs_down: 5500, fist: 4200, palm_swipe_shutdown: 16000 };

    var root, videoEl, pipWrap, pipInner, previewVideo, pipParticleCanvas, pipParticleCtx, pipCanvas, pipCtx, pipLabel, liveGestureEl;
    var PIP_BASE_W = 280;
    var PIP_BASE_H = 210;
    var pipDpr = 1;
    var gmParticles = [];
    var GM_PARTICLE_MAX = 240;
    var lastGestureAnchorPip = { x: 140, y: 105 };

    var rawGesture = 'none';
    var stableGesture = 'none';
    var gestureFrames = 0;
    var handVisible = false;
    var pinchSnap = { armClose: false, closeStarted: 0 };
    var prevIndexTipY = null;
    var indexPoseScrolled = false;
    var filteredLandmarks = null;
    var drawLandmarks = null;
    var rafId = null;

    var openPalmResumeWaiting = false;
    var openPalmStillFrames = 0;
    var lastPalmPcForStill = null;
    var palmOpenSamples = [];

    var HAND_CONNECTIONS = [[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[17,18],[18,19],[19,20],[0,17]];

    /** Single-line UI copy */
    var GESTURE_LABEL = {
        none: 'No hand detected',
        open_palm: 'Open palm (still) → About Me',
        index_finger: 'Point — scroll',
        fist: 'Fist → Sleep',
        peace: 'Peace → Contact',
        thumbs_up: 'Thumbs up → Terminal',
        thumbs_down: 'Thumbs down → Trash',
        ok_sign: 'OK sign → Restart',
        palm_swipe_shutdown: 'Palm swipe → Shut Down'
    };

    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
    function lerp(a, b, t) { return a + (b - a) * t; }
    function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

    function getPalmCenter(lm) {
        var ids = [0, 1, 2, 5, 9, 13, 17];
        var x = 0, y = 0;
        for (var i = 0; i < ids.length; i++) { x += lm[ids[i]].x; y += lm[ids[i]].y; }
        return { x: x / ids.length, y: y / ids.length };
    }
    function getScale(lm) {
        return dist(lm[0], lm[9]) + dist(lm[5], lm[17]);
    }
    function smoothLm(lm) {
        if (!filteredLandmarks) {
            filteredLandmarks = lm.map(function(p) { return { x: p.x, y: p.y, z: p.z || 0 }; });
            return filteredLandmarks;
        }
        for (var i = 0; i < lm.length; i++) {
            filteredLandmarks[i].x = lerp(filteredLandmarks[i].x, lm[i].x, 0.36);
            filteredLandmarks[i].y = lerp(filteredLandmarks[i].y, lm[i].y, 0.36);
        }
        return filteredLandmarks;
    }
    function fingerStraight(lm, pip, dip, tip) {
        return lm[tip].y < lm[pip].y && lm[dip].y < lm[pip].y;
    }
    function fingerFolded(lm, pip, tip, pc, th) {
        return lm[tip].y >= lm[pip].y || dist(lm[tip], pc) < th;
    }
    function fingerExtendedFromWrist(lm, mcp, pip, dip, tip) {
        var w = lm[0];
        return dist(lm[tip], w) > dist(lm[pip], w) * 1.03 && dist(lm[tip], w) > dist(lm[mcp], w) * 0.88;
    }
    function fingerExtended(lm, mcp, pip, dip, tip, pc, sc) {
        var ft = sc * 0.26;
        return fingerStraight(lm, pip, dip, tip) && fingerExtendedFromWrist(lm, mcp, pip, dip, tip) && dist(lm[tip], pc) > sc * 0.31;
    }

    /**
     * Ordered to reduce conflicts: OK → 👍/👎 → ✌️ → palm → point → fist
     */
    function detectGesture(lm) {
        var pc = getPalmCenter(lm);
        var sc = getScale(lm);
        var ft = sc * 0.26;
        var w = lm[0];

        var idxS = fingerExtended(lm, 5, 6, 7, 8, pc, sc);
        var midS = fingerExtended(lm, 9, 10, 11, 12, pc, sc);
        var ringS = fingerExtended(lm, 13, 14, 15, 16, pc, sc);
        var pnkS = fingerExtended(lm, 17, 18, 19, 20, pc, sc);
        var thumbSp = dist(lm[4], pc) > sc * 0.24 && Math.abs(lm[4].x - lm[3].x) > sc * 0.045;
        var midF = fingerFolded(lm, 10, 12, pc, ft);
        var ringF = fingerFolded(lm, 14, 16, pc, ft);
        var pnkF = fingerFolded(lm, 18, 20, pc, ft);
        var thumbF = dist(lm[4], pc) < sc * 0.31;
        var idxF = fingerFolded(lm, 6, 8, pc, ft);
        var d48 = dist(lm[4], lm[8]);
        var d812 = dist(lm[8], lm[12]);

        var thumbIdxClose = d48 > sc * 0.05 && d48 < sc * 0.118;
        var indexCurledForOk = !idxS;
        var midTipUp = lm[12].y < lm[10].y - sc * 0.018;
        if (thumbIdxClose && indexCurledForOk && midS && ringF && pnkF && midTipUp) {
            return { gesture: 'ok_sign', anchor: pc, confidence: 0.86, sc: sc };
        }

        var thumbsUp = lm[4].y < lm[3].y - sc * 0.014 && idxF && midF && ringF && pnkF && dist(lm[4], w) > dist(lm[2], w) * 0.95 && d48 > sc * 0.2;
        if (thumbsUp) return { gesture: 'thumbs_up', anchor: lm[4], confidence: 0.88, sc: sc };

        var thumbsDown = lm[4].y > lm[3].y + sc * 0.012 && lm[4].y > lm[8].y + sc * 0.008 && idxF && midF && ringF && pnkF && dist(lm[4], w) > dist(lm[2], w) * 0.88;
        if (thumbsDown) return { gesture: 'thumbs_down', anchor: lm[4], confidence: 0.85, sc: sc };

        if (idxS && midS && ringF && pnkF && thumbF) {
            return { gesture: 'peace', anchor: pc, confidence: 0.9, sc: sc };
        }

        var palmSpread = d812 > sc * 0.2 && dist(lm[8], pc) > sc * 0.36 && dist(lm[16], pc) > sc * 0.3;
        if (idxS && midS && ringS && pnkS && thumbSp && palmSpread) return { gesture: 'open_palm', anchor: pc, confidence: 0.94, sc: sc };

        if (idxS && !midS && ringF && pnkF && thumbF) return { gesture: 'index_finger', anchor: lm[8], confidence: 0.92, sc: sc };

        var fistG = !idxS && midF && ringF && pnkF && dist(lm[8], pc) < sc * 0.24 && dist(lm[12], pc) < sc * 0.22 && dist(lm[4], pc) < sc * 0.36;
        if (fistG) return { gesture: 'fist', anchor: pc, confidence: 0.9, sc: sc };
        return { gesture: 'none', anchor: pc, confidence: 0.2, sc: sc };
    }

    function burstGestureParticles(gestureKey, ax, ay) {
        var hues = { peace: 285, thumbs_up: 42, thumbs_down: 8, open_palm: 195, fist: 265, ok_sign: 155, palm_swipe_shutdown: 218 };
        var h = hues[gestureKey] != null ? hues[gestureKey] : 200;
        var n = 48;
        var i;
        for (i = 0; i < n && gmParticles.length < GM_PARTICLE_MAX; i++) {
            var ang = Math.random() * Math.PI * 2;
            var sp = 1.2 + Math.random() * 4.2;
            gmParticles.push({
                x: ax + (Math.random() - 0.5) * 14,
                y: ay + (Math.random() - 0.5) * 14,
                vx: Math.cos(ang) * sp,
                vy: Math.sin(ang) * sp - 0.4,
                life: 0.55 + Math.random() * 0.65,
                r: 1.4 + Math.random() * 3.2,
                hue: h + (Math.random() - 0.5) * 40
            });
        }
    }

    function spawnTrailParticles(lm, cw, ch) {
        if (gmParticles.length >= GM_PARTICLE_MAX || Math.random() > 0.42) return;
        var ids = [4, 8, 12, 16, 20, 5, 9, 13];
        var id = ids[(Math.random() * ids.length) | 0];
        var p = lm[id];
        var x = (1 - p.x) * cw + (Math.random() - 0.5) * 8;
        var y = p.y * ch + (Math.random() - 0.5) * 8;
        gmParticles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 1.1,
            vy: -0.35 - Math.random() * 0.9,
            life: 0.35 + Math.random() * 0.45,
            r: 0.9 + Math.random() * 2.2,
            hue: 175 + Math.random() * 85
        });
    }

    function tickGestureParticles() {
        var i;
        for (i = gmParticles.length - 1; i >= 0; i--) {
            var p = gmParticles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy -= 0.028;
            p.vx *= 0.985;
            p.life -= 0.017;
            if (p.life <= 0) gmParticles.splice(i, 1);
        }
    }

    function drawGestureParticles(ctx) {
        if (!ctx || gmParticles.length === 0) return;
        var i;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (i = 0; i < gmParticles.length; i++) {
            var p = gmParticles[i];
            var a = Math.min(1, p.life * 1.85);
            ctx.fillStyle = 'hsla(' + p.hue + ',92%,68%,' + a + ')';
            ctx.shadowBlur = 10;
            ctx.shadowColor = 'hsla(' + p.hue + ',85%,55%,0.55)';
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.shadowBlur = 0;
        ctx.restore();
    }

    function fireDiscrete(g) {
        var cd = GESTURE_COOLDOWN_MS[g] != null ? GESTURE_COOLDOWN_MS[g] : GESTURE_COOLDOWN_MS.default;
        var now = performance.now();
        if (now - (lastGestureFire[g] || 0) < cd) return false;
        lastGestureFire[g] = now;
        burstGestureParticles(g, lastGestureAnchorPip.x, lastGestureAnchorPip.y);
        try {
            if (typeof unlockDevosAudioOnce === 'function') unlockDevosAudioOnce();
            if (typeof playClickSound === 'function') playClickSound();
        } catch (e) {}
        if (g === 'open_palm' && typeof openWindow === 'function') openWindow('resume');
        if (g === 'peace' && typeof openWindow === 'function') openWindow('contact');
        if (g === 'thumbs_up' && typeof openWindow === 'function') openWindow('terminal');
        if (g === 'thumbs_down' && typeof emptyTrashAnimation === 'function') emptyTrashAnimation();
        if (g === 'fist' && typeof window.performSleep === 'function') window.performSleep();
        if (g === 'ok_sign' && typeof window.performRestart === 'function') {
            if (typeof showNotification === 'function') showNotification('Hand Magic', 'OK — restarting…');
            window.performRestart();
        }
        return true;
    }

    /** Skeleton + soft bloom (PiP); particles render on layer below. */
    function drawHandOverlay(c, lm, cw, ch) {
        if (!lm || !c) return;
        function tc(p) {
            return { x: (1 - p.x) * cw, y: p.y * ch };
        }
        c.save();
        c.lineCap = 'round';
        c.lineJoin = 'round';
        var lineCol = 'rgba(120, 200, 255, 0.94)';
        var jointFill = 'rgba(210, 245, 255, 0.97)';
        var jointRing = 'rgba(80, 160, 255, 0.6)';
        var h;
        c.strokeStyle = 'rgba(100, 180, 255, 0.35)';
        c.lineWidth = 5;
        c.shadowBlur = 14;
        c.shadowColor = 'rgba(80, 200, 255, 0.5)';
        for (h = 0; h < HAND_CONNECTIONS.length; h++) {
            var ga = HAND_CONNECTIONS[h][0], gb = HAND_CONNECTIONS[h][1];
            var q1 = tc(lm[ga]), q2 = tc(lm[gb]);
            c.beginPath();
            c.moveTo(q1.x, q1.y);
            c.lineTo(q2.x, q2.y);
            c.stroke();
        }
        c.shadowBlur = 8;
        c.shadowColor = 'rgba(60, 140, 255, 0.4)';
        c.strokeStyle = lineCol;
        c.lineWidth = 2.35;
        for (h = 0; h < HAND_CONNECTIONS.length; h++) {
            var a = HAND_CONNECTIONS[h][0], b = HAND_CONNECTIONS[h][1];
            var p1 = tc(lm[a]), p2 = tc(lm[b]);
            c.beginPath();
            c.moveTo(p1.x, p1.y);
            c.lineTo(p2.x, p2.y);
            c.stroke();
        }
        c.shadowBlur = 0;
        var tips = [4, 8, 12, 16, 20];
        for (h = 0; h < tips.length; h++) {
            var p = tc(lm[tips[h]]);
            c.beginPath();
            c.arc(p.x, p.y, 6.5, 0, Math.PI * 2);
            c.fillStyle = 'rgba(140, 220, 255, 0.25)';
            c.fill();
            c.beginPath();
            c.arc(p.x, p.y, 5, 0, Math.PI * 2);
            c.fillStyle = jointFill;
            c.fill();
            c.strokeStyle = jointRing;
            c.lineWidth = 1.5;
            c.stroke();
        }
        c.restore();
    }

    function updateGestureCaption() {
        if (!liveGestureEl) return;
        var key = stableGesture !== 'none' ? stableGesture : rawGesture;
        liveGestureEl.textContent = GESTURE_LABEL[key] || GESTURE_LABEL.none;
    }

    function loop() {
        if (!active) return;
        rafId = requestAnimationFrame(loop);
        if (pipParticleCtx && pipParticleCanvas) {
            if (handVisible && drawLandmarks) spawnTrailParticles(drawLandmarks, PIP_BASE_W, PIP_BASE_H);
            tickGestureParticles();
            pipParticleCtx.clearRect(0, 0, PIP_BASE_W, PIP_BASE_H);
            drawGestureParticles(pipParticleCtx);
        }
        if (pipCtx && pipCanvas) {
            pipCtx.clearRect(0, 0, PIP_BASE_W, PIP_BASE_H);
            if (handVisible && drawLandmarks) drawHandOverlay(pipCtx, drawLandmarks, PIP_BASE_W, PIP_BASE_H);
        }
        updateGestureCaption();
    }

    function onResults(results) {
        if (!active) return;
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            handVisible = true;
            var rawLm = results.multiHandLandmarks[0];
            var lm = smoothLm(rawLm);
            drawLandmarks = lm;
            var d = detectGesture(lm);
            var sc = d.sc != null ? d.sc : getScale(lm);
            var pc = getPalmCenter(lm);
            var d48 = dist(lm[4], lm[8]);
            var nowT = performance.now();

            lastGestureAnchorPip.x = (1 - d.anchor.x) * PIP_BASE_W;
            lastGestureAnchorPip.y = d.anchor.y * PIP_BASE_H;

            if (d.gesture === rawGesture) gestureFrames++;
            else { rawGesture = d.gesture; gestureFrames = 1; }

            if (gestureFrames >= 4 && stableGesture !== d.gesture) {
                stableGesture = d.gesture;
                if (stableGesture === 'open_palm') {
                    openPalmResumeWaiting = true;
                    openPalmStillFrames = 0;
                    lastPalmPcForStill = { x: pc.x, y: pc.y };
                    palmOpenSamples = [{ x: pc.x, y: pc.y, t: nowT }];
                } else if (stableGesture === 'peace') {
                    fireDiscrete('peace');
                } else if (stableGesture === 'thumbs_up') {
                    fireDiscrete('thumbs_up');
                } else if (stableGesture === 'thumbs_down') {
                    fireDiscrete('thumbs_down');
                } else if (stableGesture === 'ok_sign') {
                    fireDiscrete('ok_sign');
                } else if (stableGesture === 'index_finger') {
                    prevIndexTipY = null;
                    indexPoseScrolled = false;
                } else if (stableGesture === 'fist') {
                    fireDiscrete('fist');
                }
                if (stableGesture !== 'open_palm') {
                    openPalmResumeWaiting = false;
                    openPalmStillFrames = 0;
                    lastPalmPcForStill = null;
                    palmOpenSamples = [];
                }
            }

            if (stableGesture === 'open_palm' && d.gesture === 'open_palm') {
                palmOpenSamples.push({ x: pc.x, y: pc.y, t: nowT });
                while (palmOpenSamples.length > 36) palmOpenSamples.shift();
                while (palmOpenSamples.length && nowT - palmOpenSamples[0].t > 900) palmOpenSamples.shift();
                var recent = palmOpenSamples;
                if (recent.length >= 11) {
                    var minX = 1, maxX = 0, minY = 1, maxY = 0;
                    var ri;
                    for (ri = 0; ri < recent.length; ri++) {
                        var s = recent[ri];
                        if (s.x < minX) minX = s.x;
                        if (s.x > maxX) maxX = s.x;
                        if (s.y < minY) minY = s.y;
                        if (s.y > maxY) maxY = s.y;
                    }
                    var spanX = maxX - minX;
                    var spanY = maxY - minY;
                    var t0 = recent[0].t;
                    var t1 = recent[recent.length - 1].t;
                    var dtWin = t1 - t0;
                    if (dtWin >= 360 && dtWin <= 1100 && spanX > 0.30 && spanY < 0.18 && minX < 0.42 && maxX > 0.58) {
                        var cdSwipe = GESTURE_COOLDOWN_MS.palm_swipe_shutdown;
                        if (nowT - (lastGestureFire.palm_swipe_shutdown || 0) >= cdSwipe) {
                            lastGestureFire.palm_swipe_shutdown = nowT;
                            openPalmResumeWaiting = false;
                            palmOpenSamples = [];
                            burstGestureParticles('palm_swipe_shutdown', lastGestureAnchorPip.x, lastGestureAnchorPip.y);
                            try {
                                if (typeof unlockDevosAudioOnce === 'function') unlockDevosAudioOnce();
                                if (typeof playClickSound === 'function') playClickSound();
                            } catch (eS) {}
                            if (typeof showNotification === 'function') {
                                showNotification('Hand Magic', 'Palm swipe — shutting down…');
                            }
                            if (typeof window !== 'undefined' && typeof window.performShutdown === 'function') {
                                window.performShutdown();
                            }
                        }
                    }
                }
                if (lastPalmPcForStill) {
                    var dpc = Math.hypot(pc.x - lastPalmPcForStill.x, pc.y - lastPalmPcForStill.y);
                    if (dpc < 0.0082) openPalmStillFrames++;
                    else openPalmStillFrames = 0;
                }
                lastPalmPcForStill = { x: pc.x, y: pc.y };
                if (openPalmResumeWaiting && openPalmStillFrames >= 11) {
                    fireDiscrete('open_palm');
                    openPalmResumeWaiting = false;
                }
            }

            if (stableGesture === 'index_finger' && d.gesture === 'index_finger') {
                var tip = rawLm[8];
                if (prevIndexTipY != null) {
                    var dy = tip.y - prevIndexTipY;
                    if (Math.abs(dy) > 0.0036) {
                        indexPoseScrolled = true;
                        if (typeof window.scrollFrontWindowBy === 'function') {
                            window.scrollFrontWindowBy(-dy * 185);
                        }
                    }
                }
                prevIndexTipY = tip.y;
            }
        } else {
            handVisible = false;
            rawGesture = 'none';
            gestureFrames = 0;
            filteredLandmarks = null;
            drawLandmarks = null;
            pinchSnap.armClose = false;
            pinchSnap.closeStarted = 0;
            prevIndexTipY = null;
            indexPoseScrolled = false;
            openPalmResumeWaiting = false;
            openPalmStillFrames = 0;
            lastPalmPcForStill = null;
            palmOpenSamples = [];
            if (stableGesture !== 'none') stableGesture = 'none';
        }
    }

    function resizePip() {
        pipDpr = Math.min(window.devicePixelRatio || 1, 2);
        if (!pipCanvas || !pipCtx) return;
        var bw = Math.round(PIP_BASE_W * pipDpr);
        var bh = Math.round(PIP_BASE_H * pipDpr);
        pipCanvas.width = bw;
        pipCanvas.height = bh;
        pipCanvas.style.width = PIP_BASE_W + 'px';
        pipCanvas.style.height = PIP_BASE_H + 'px';
        pipCtx.setTransform(pipDpr, 0, 0, pipDpr, 0, 0);
        if (pipParticleCanvas && pipParticleCtx) {
            pipParticleCanvas.width = bw;
            pipParticleCanvas.height = bh;
            pipParticleCanvas.style.width = PIP_BASE_W + 'px';
            pipParticleCanvas.style.height = PIP_BASE_H + 'px';
            pipParticleCtx.setTransform(pipDpr, 0, 0, pipDpr, 0, 0);
        }
    }

    function layoutPipForViewport() {
        var w = window.innerWidth;
        var h = window.innerHeight;
        var narrow = w <= 400;
        PIP_BASE_W = narrow ? Math.min(260, Math.max(220, Math.round(w * 0.58))) : 280;
        PIP_BASE_H = Math.round(PIP_BASE_W * 0.75);
        if (pipInner) {
            pipInner.style.width = PIP_BASE_W + 'px';
            pipInner.style.height = PIP_BASE_H + 'px';
        }
        if (liveGestureEl) liveGestureEl.style.maxWidth = PIP_BASE_W + 'px';
        var bottomPx = narrow ? Math.max(72, h * 0.11) : Math.max(88, h * 0.12);
        var rightPx = narrow ? 10 : 16;
        if (pipWrap) {
            pipWrap.style.bottom = 'max(' + Math.round(bottomPx) + 'px, calc(env(safe-area-inset-bottom, 0px) + 56px))';
            pipWrap.style.right = 'max(' + rightPx + 'px, env(safe-area-inset-right, 0px))';
        }
        resizePip();
    }

    function resize() {
        layoutPipForViewport();
    }

    function loadScript(src) {
        return new Promise(function(res, rej) {
            var s = document.createElement('script');
            s.src = src;
            s.onload = res;
            s.onerror = rej;
            document.head.appendChild(s);
        });
    }

    function removeGestureTour() {
        var el = document.getElementById('gesture-guide-tour');
        if (el && el.parentNode) el.parentNode.removeChild(el);
    }

    function showGestureTour() {
        removeGestureTour();
        if (!document.getElementById('gesture-guide-tour-styles')) {
            var st = document.createElement('style');
            st.id = 'gesture-guide-tour-styles';
            st.textContent = '#gesture-guide-tour{position:fixed;inset:0;z-index:10025;display:flex;align-items:center;justify-content:center;padding:max(16px,env(safe-area-inset-top)) max(16px,env(safe-area-inset-right)) max(16px,env(safe-area-inset-bottom)) max(16px,env(safe-area-inset-left));box-sizing:border-box;background:rgba(6,8,18,0.72);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);animation:gmTourIn 0.45s ease;}#gesture-guide-tour .gm-tour-card{max-width:min(480px,96vw);max-height:min(78vh,620px);overflow:hidden;display:flex;flex-direction:column;border-radius:18px;border:1px solid rgba(255,255,255,0.14);background:linear-gradient(165deg,rgba(28,32,48,0.97) 0%,rgba(14,16,26,0.98) 100%);box-shadow:0 24px 80px rgba(0,0,0,0.55),0 0 0 1px rgba(255,255,255,0.06) inset;font-family:-apple-system,BlinkMacSystemFont,sans-serif;color:#fff;pointer-events:auto;}#gesture-guide-tour .gm-tour-head{padding:18px 20px 10px;border-bottom:1px solid rgba(255,255,255,0.08);}#gesture-guide-tour .gm-tour-head h2{margin:0;font-size:19px;font-weight:650;letter-spacing:-0.02em;}#gesture-guide-tour .gm-tour-head p{margin:8px 0 0;font-size:13px;opacity:0.78;line-height:1.45;}#gesture-guide-tour .gm-tour-scroll{overflow-y:auto;padding:10px 16px 8px;flex:1;-webkit-overflow-scrolling:touch;}#gesture-guide-tour .gm-tour-row{display:flex;align-items:flex-start;gap:12px;padding:9px 11px;margin-bottom:5px;border-radius:12px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);font-size:12px;line-height:1.4;}#gesture-guide-tour .gm-tour-row span:first-child{flex-shrink:0;width:2.2em;text-align:center;font-size:17px;}#gesture-guide-tour .gm-tour-foot{padding:12px 16px 16px;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;border-top:1px solid rgba(255,255,255,0.08);}#gesture-guide-tour .gm-tour-count{font-size:12px;opacity:0.75;}#gesture-guide-tour .gm-tour-skip{padding:10px 20px;border-radius:11px;border:1px solid rgba(255,255,255,0.22);background:rgba(100,140,255,0.25);color:#fff;font-size:13px;font-weight:600;cursor:pointer;}#gesture-guide-tour .gm-tour-skip:hover{background:rgba(120,160,255,0.38);}@keyframes gmTourIn{from{opacity:0}to{opacity:1}}';
            document.head.appendChild(st);
        }
        var tour = document.createElement('div');
        tour.id = 'gesture-guide-tour';
        tour.setAttribute('role', 'dialog');
        tour.setAttribute('aria-label', 'Hand gesture guide');
        tour.innerHTML = '<div class="gm-tour-card"><div class="gm-tour-head"><h2>Hand Magic</h2><p>Only the <strong>corner preview</strong> shows your camera and hand outline. The desktop stays clear. Hold each pose briefly so it locks in.</p></div><div class="gm-tour-scroll"><div class="gm-tour-row"><span>✋</span><div><strong>Open palm</strong> (hold still) — About Me</div></div><div class="gm-tour-row"><span>↔️</span><div><strong>Horizontal palm swipe</strong> — Shut Down</div></div><div class="gm-tour-row"><span>☝️</span><div><strong>Point</strong> — scroll the front window</div></div><div class="gm-tour-row"><span>✌️</span><div><strong>Peace</strong> — Contact</div></div><div class="gm-tour-row"><span>👍</span><div><strong>Thumbs up</strong> — Terminal</div></div><div class="gm-tour-row"><span>👎</span><div><strong>Thumbs down</strong> — Trash</div></div><div class="gm-tour-row"><span>✊</span><div><strong>Fist</strong> — Sleep</div></div><div class="gm-tour-row"><span>👌</span><div><strong>OK</strong> (thumb + index circle, other fingers up) — Restart</div></div></div><div class="gm-tour-foot"><span class="gm-tour-count">Ready when you are</span><button type="button" class="gm-tour-skip" id="gm-tour-dismiss">Got it</button></div></div>';
        document.body.appendChild(tour);
        var dismiss = document.getElementById('gm-tour-dismiss');
        if (dismiss) dismiss.addEventListener('click', function() { removeGestureTour(); });
    }

    function ensureDom() {
        if (root) return;
        if (!document.getElementById('gesture-magic-root-styles')) {
            var rst = document.createElement('style');
            rst.id = 'gesture-magic-root-styles';
            rst.textContent = '#gesture-magic-exit{top:max(12px,env(safe-area-inset-top,0px))!important;right:max(12px,env(safe-area-inset-right,0px))!important;}#gesture-magic-hint{bottom:max(20px,calc(env(safe-area-inset-bottom,0px) + 12px))!important;padding-left:max(16px,env(safe-area-inset-left,0px))!important;padding-right:max(16px,env(safe-area-inset-right,0px))!important;}';
            document.head.appendChild(rst);
        }
        root = document.createElement('div');
        root.id = 'gesture-magic-root';
        root.setAttribute('aria-hidden', 'true');
        root.style.cssText = 'display:none;position:fixed;inset:0;z-index:9990;pointer-events:none;overflow:hidden;background:transparent;';

        videoEl = document.createElement('video');
        videoEl.setAttribute('playsinline', '');
        videoEl.setAttribute('autoplay', '');
        videoEl.muted = true;
        videoEl.setAttribute('aria-hidden', 'true');
        videoEl.style.cssText = 'position:fixed;width:2px;height:2px;opacity:0;pointer-events:none;top:0;left:0;object-fit:cover;transform:scaleX(-1);';

        pipWrap = document.createElement('div');
        pipWrap.className = 'gesture-magic-pip-wrap';
        pipWrap.style.cssText = 'position:absolute;z-index:6;display:flex;flex-direction:column;align-items:stretch;gap:8px;pointer-events:none;filter:drop-shadow(0 12px 28px rgba(0,0,0,0.4));';

        pipInner = document.createElement('div');
        pipInner.style.cssText = 'position:relative;border-radius:16px;overflow:hidden;border:1.5px solid rgba(255,255,255,0.42);background:#0a0c12;box-sizing:border-box;';

        previewVideo = document.createElement('video');
        previewVideo.setAttribute('playsinline', '');
        previewVideo.setAttribute('autoplay', '');
        previewVideo.muted = true;
        previewVideo.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transform:scaleX(-1);opacity:1;filter:saturate(1.05) contrast(1.04);';

        pipParticleCanvas = document.createElement('canvas');
        pipParticleCanvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:1;';
        pipParticleCtx = pipParticleCanvas.getContext('2d', { alpha: true, desynchronized: true });

        pipCanvas = document.createElement('canvas');
        pipCanvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:2;';
        pipCtx = pipCanvas.getContext('2d', { alpha: true, desynchronized: true });

        pipInner.appendChild(previewVideo);
        pipInner.appendChild(pipParticleCanvas);
        pipInner.appendChild(pipCanvas);

        pipLabel = document.createElement('div');
        pipLabel.style.cssText = 'font-size:10px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;color:rgba(255,255,255,0.5);text-align:center;text-shadow:0 1px 4px rgba(0,0,0,0.85);';
        pipLabel.textContent = 'Hand Magic';

        liveGestureEl = document.createElement('div');
        liveGestureEl.style.cssText = 'padding:8px 10px;border-radius:12px;background:rgba(14,16,28,0.9);border:1px solid rgba(255,255,255,0.12);color:rgba(255,255,255,0.94);font-size:12px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;line-height:1.35;text-align:center;font-weight:500;';
        liveGestureEl.textContent = GESTURE_LABEL.none;

        pipWrap.appendChild(pipInner);
        pipWrap.appendChild(pipLabel);
        pipWrap.appendChild(liveGestureEl);

        var exit = document.createElement('button');
        exit.type = 'button';
        exit.id = 'gesture-magic-exit';
        exit.textContent = 'Exit';
        exit.style.cssText = 'position:absolute;z-index:8;padding:8px 14px;border-radius:10px;border:1px solid rgba(255,255,255,0.22);background:rgba(22,24,36,0.88);color:#fff;font-size:12px;font-weight:600;cursor:pointer;pointer-events:auto;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);';
        exit.addEventListener('click', function() { window.toggleGestureMagic(false); });

        var hint = document.createElement('div');
        hint.id = 'gesture-magic-hint';
        hint.style.cssText = 'position:absolute;left:50%;transform:translateX(-50%);max-width:min(420px,92vw);padding:8px 14px;border-radius:11px;background:rgba(12,14,24,0.75);color:rgba(255,255,255,0.82);font-size:11px;font-family:-apple-system,sans-serif;text-align:center;pointer-events:none;border:1px solid rgba(255,255,255,0.1);line-height:1.4;';
        hint.textContent = 'Preview only in the corner — desktop stays clear';

        root.appendChild(videoEl);
        root.appendChild(pipWrap);
        root.appendChild(hint);
        root.appendChild(exit);
        document.body.appendChild(root);
        layoutPipForViewport();
        window.addEventListener('resize', resize);
    }

    async function startInternal() {
        ensureDom();
        if (!loaded) {
            await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js');
            await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js');
            loaded = true;
        }
        camUtils = window.Camera;
        hands = new window.Hands({
            locateFile: function(file) {
                return 'https://cdn.jsdelivr.net/npm/@mediapipe/hands/' + file;
            }
        });
        hands.setOptions({
            maxNumHands: 1,
            modelComplexity: 1,
            minDetectionConfidence: 0.78,
            minTrackingConfidence: 0.76
        });
        hands.onResults(onResults);

        var stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
        }).catch(function() {
            return navigator.mediaDevices.getUserMedia({ video: true });
        });
        videoEl.srcObject = stream;
        if (previewVideo) {
            previewVideo.srcObject = stream;
            var pv = previewVideo.play();
            if (pv && typeof pv.catch === 'function') pv.catch(function() {});
        }
        var vplay = videoEl.play();
        if (vplay && typeof vplay.catch === 'function') vplay.catch(function() {});

        mpCamera = new camUtils(videoEl, {
            onFrame: async function() {
                if (active && hands) await hands.send({ image: videoEl });
            },
            width: 1280,
            height: 720
        });
        mpCamera.start();
        active = true;
        root.style.display = 'block';
        rafId = requestAnimationFrame(loop);
        syncGestureMenuIcon();
        showGestureTour();
        setTimeout(function() {
            if (!active || !videoEl) return;
            var p = videoEl.play();
            if (p && typeof p.catch === 'function') p.catch(function() {});
            if (previewVideo) {
                var p2 = previewVideo.play();
                if (p2 && typeof p2.catch === 'function') p2.catch(function() {});
            }
        }, 80);
    }

    function stopInternal() {
        active = false;
        removeGestureTour();
        pinchSnap.armClose = false;
        pinchSnap.closeStarted = 0;
        openPalmResumeWaiting = false;
        openPalmStillFrames = 0;
        lastPalmPcForStill = null;
        palmOpenSamples = [];
        prevIndexTipY = null;
        indexPoseScrolled = false;
        gmParticles.length = 0;
        if (rafId) cancelAnimationFrame(rafId);
        rafId = null;
        if (mpCamera) {
            try { mpCamera.stop(); } catch (e) {}
            mpCamera = null;
        }
        if (hands) {
            try { hands.close(); } catch (e2) {}
            hands = null;
        }
        var camStream = videoEl && videoEl.srcObject;
        if (previewVideo) previewVideo.srcObject = null;
        if (videoEl) videoEl.srcObject = null;
        if (camStream) {
            camStream.getTracks().forEach(function(t) { t.stop(); });
        }
        if (root) root.style.display = 'none';
        syncGestureMenuIcon();
    }

    function syncGestureMenuIcon() {
        var btn = document.getElementById('gesture-magic-toggle');
        if (!btn) return;
        var on = active && root && root.style.display === 'block';
        btn.classList.toggle('gesture-magic-on', on);
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    }

    window.toggleGestureMagic = function(force) {
        var on = force === undefined ? !(root && root.style.display === 'block') : !!force;
        if (on) {
            if (typeof unlockDevosAudioOnce === 'function') unlockDevosAudioOnce();
            startInternal().catch(function(err) {
                console.warn('Gesture magic:', err);
                if (typeof showNotification === 'function') {
                    showNotification('Camera', 'Allow camera access to use hand gestures.');
                }
                syncGestureMenuIcon();
            });
        } else {
            stopInternal();
        }
    };

    window.isGestureMagicActive = function() {
        return !!(active && root && root.style.display === 'block');
    };

    document.addEventListener('DOMContentLoaded', function() {
        var btn = document.getElementById('gesture-magic-toggle');
        if (!btn) return;
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            window.toggleGestureMagic(!window.isGestureMagicActive());
        });
        btn.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                window.toggleGestureMagic(!window.isGestureMagicActive());
            }
        });
    });
})();
