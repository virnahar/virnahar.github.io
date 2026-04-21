/**
 * Tax Story — Three.js hero background.
 *
 * Upgrades over plain dot cloud:
 *  - Glowing sprite texture + additive blending → orbs that bloom where dense
 *  - Connection lines between nearby gold particles → data-network aesthetic
 *  - Camera parallax on mouse → genuine 3D depth (near particles move more)
 *
 * Performance budget:
 *  - Reduced particle counts (65 gold, 18 teal, 15 purple)
 *  - IntersectionObserver pauses rAF loop when hero is off-screen
 *  - Position + line updates every 2nd frame only
 *  - Additive blending skips depth sorting (order-independent transparency)
 *  - DynamicDrawUsage hint on frequently-updated buffers
 */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js';

export function initHeroThreeScene(canvasEl) {
  const W = canvasEl.clientWidth || 480;
  const H = canvasEl.clientHeight || 320;
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;

  // ── Scene ──────────────────────────────────────────────────────────────────
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, W / H, 0.1, 1000);
  camera.position.z = 230;

  const renderer = new THREE.WebGLRenderer({
    canvas: canvasEl,
    alpha: true,
    antialias: false,
    powerPreference: 'low-power',
  });
  renderer.setSize(W, H);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.2));
  renderer.setClearColor(0x000000, 0);

  // ── Glow sprite texture ────────────────────────────────────────────────────
  // Radial gradient → CanvasTexture. With AdditiveBlending, overlapping
  // particles accumulate brightness — dense clusters glow like star fields.
  let glowTex = null;
  if (!reduced) {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const ctx2d = c.getContext('2d');
    const g = ctx2d.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0,    'rgba(255,255,255,1)');
    g.addColorStop(0.38, 'rgba(255,255,255,0.65)');
    g.addColorStop(0.72, 'rgba(255,255,255,0.18)');
    g.addColorStop(1,    'rgba(255,255,255,0)');
    ctx2d.fillStyle = g;
    ctx2d.fillRect(0, 0, 64, 64);
    glowTex = new THREE.CanvasTexture(c);
  }

  const glowProps = glowTex
    ? { map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false }
    : {};

  // ── Primary gold particle cloud — 65 orbs ─────────────────────────────────
  const COUNT = reduced ? 28 : 65;
  const posArr    = new Float32Array(COUNT * 3);
  const velocities = new Float32Array(COUNT * 3);

  for (let i = 0; i < COUNT; i++) {
    posArr[i*3]   = (Math.random() - 0.5) * 360;
    posArr[i*3+1] = (Math.random() - 0.5) * 260;
    posArr[i*3+2] = (Math.random() - 0.5) * 130;
    velocities[i*3]   = (Math.random() - 0.5) * 0.06;
    velocities[i*3+1] = (Math.random() - 0.5) * 0.06;
    velocities[i*3+2] = (Math.random() - 0.5) * 0.03;
  }

  const goldGeo = new THREE.BufferGeometry();
  const goldAttr = new THREE.BufferAttribute(posArr, 3);
  goldAttr.setUsage(THREE.DynamicDrawUsage);
  goldGeo.setAttribute('position', goldAttr);

  const goldMat = new THREE.PointsMaterial({
    color: 0xd4af37,
    size: reduced ? 2.2 : 5.5,
    transparent: true,
    opacity: reduced ? 0.48 : 0.58,
    sizeAttenuation: true,
    ...glowProps,
  });
  scene.add(new THREE.Points(goldGeo, goldMat));

  // ── Connection lines — data-network aesthetic ──────────────────────────────
  // O(N²/2) proximity check on even frames with MAX_LINES cap keeps it cheap.
  const MAX_LINES   = 80;
  const LINE_DIST_SQ = 72 * 72;
  let lineGeo = null, lineMat = null, linePositions = null;

  if (!reduced) {
    linePositions = new Float32Array(MAX_LINES * 6); // 2 verts × 3 floats each
    lineGeo = new THREE.BufferGeometry();
    const lineAttr = new THREE.BufferAttribute(linePositions, 3);
    lineAttr.setUsage(THREE.DynamicDrawUsage);
    lineGeo.setAttribute('position', lineAttr);
    lineGeo.setDrawRange(0, 0);
    lineMat = new THREE.LineBasicMaterial({
      color: 0xd4af37,
      transparent: true,
      opacity: 0.09,
    });
    scene.add(new THREE.LineSegments(lineGeo, lineMat));
  }

  // ── Accent clouds — teal 18, purple 15 ────────────────────────────────────
  const tealGeo = new THREE.BufferGeometry();
  const tealMat = new THREE.PointsMaterial({
    color: 0x5ead9a, size: reduced ? 3.0 : 6.5,
    transparent: true, opacity: 0.28, sizeAttenuation: true,
    ...glowProps,
  });
  const purpleGeo = new THREE.BufferGeometry();
  const purpleMat = new THREE.PointsMaterial({
    color: 0xa78bfa, size: reduced ? 2.2 : 5.0,
    transparent: true, opacity: 0.24, sizeAttenuation: true,
    ...glowProps,
  });

  if (!reduced) {
    const COUNT2 = 18;
    const p2 = new Float32Array(COUNT2 * 3);
    for (let i = 0; i < COUNT2; i++) {
      p2[i*3]   = (Math.random() - 0.5) * 320;
      p2[i*3+1] = (Math.random() - 0.5) * 230;
      p2[i*3+2] = (Math.random() - 0.5) * 90;
    }
    tealGeo.setAttribute('position', new THREE.BufferAttribute(p2, 3));
    scene.add(new THREE.Points(tealGeo, tealMat));

    const COUNT3 = 15;
    const p3 = new Float32Array(COUNT3 * 3);
    for (let i = 0; i < COUNT3; i++) {
      p3[i*3]   = (Math.random() - 0.5) * 300;
      p3[i*3+1] = (Math.random() - 0.5) * 220;
      p3[i*3+2] = (Math.random() - 0.5) * 80;
    }
    purpleGeo.setAttribute('position', new THREE.BufferAttribute(p3, 3));
    scene.add(new THREE.Points(purpleGeo, purpleMat));
  }

  // ── Mouse → camera parallax ────────────────────────────────────────────────
  // Moving the camera (not rotating the scene) means near particles shift more
  // than far particles — actual 3D parallax depth cue.
  let targetX = 0, targetY = 0;
  const onMouse = (e) => {
    targetX = (e.clientX / window.innerWidth  - 0.5) * 2;
    targetY = (e.clientY / window.innerHeight - 0.5) * 2;
  };
  if (!reduced) window.addEventListener('mousemove', onMouse, { passive: true });

  // ── Animation loop ─────────────────────────────────────────────────────────
  let rafId = null, t = 0, frameCount = 0, isVisible = true;

  const animate = () => {
    rafId = requestAnimationFrame(animate);
    if (!isVisible) return;

    frameCount++;
    t += 0.009;

    // Camera parallax — lerped for smoothness
    camera.position.x += (targetX * 14 - camera.position.x) * 0.04;
    camera.position.y += (-targetY * 9  - camera.position.y) * 0.04;
    camera.lookAt(0, 0, 0);

    // Gentle autonomous drift
    scene.rotation.y = Math.sin(t * 0.14) * 0.09;
    scene.rotation.x = Math.sin(t * 0.09) * 0.04;

    // Position + line updates every 2nd frame
    if (frameCount % 2 === 0) {
      for (let i = 0; i < COUNT; i++) {
        posArr[i*3]   += velocities[i*3];
        posArr[i*3+1] += velocities[i*3+1];
        posArr[i*3+2] += velocities[i*3+2];
        if (Math.abs(posArr[i*3])   > 185) velocities[i*3]   *= -1;
        if (Math.abs(posArr[i*3+1]) > 135) velocities[i*3+1] *= -1;
        if (Math.abs(posArr[i*3+2]) > 68)  velocities[i*3+2] *= -1;
      }
      goldGeo.attributes.position.needsUpdate = true;

      // Rebuild live connection network
      if (lineGeo && linePositions) {
        let li = 0;
        for (let i = 0; i < COUNT && li < MAX_LINES; i++) {
          for (let j = i + 1; j < COUNT && li < MAX_LINES; j++) {
            const dx = posArr[i*3]   - posArr[j*3];
            const dy = posArr[i*3+1] - posArr[j*3+1];
            const dz = posArr[i*3+2] - posArr[j*3+2];
            if (dx*dx + dy*dy + dz*dz < LINE_DIST_SQ) {
              linePositions[li*6]   = posArr[i*3];
              linePositions[li*6+1] = posArr[i*3+1];
              linePositions[li*6+2] = posArr[i*3+2];
              linePositions[li*6+3] = posArr[j*3];
              linePositions[li*6+4] = posArr[j*3+1];
              linePositions[li*6+5] = posArr[j*3+2];
              li++;
            }
          }
        }
        lineGeo.setDrawRange(0, li * 2);
        lineGeo.attributes.position.needsUpdate = true;
      }
    }

    renderer.render(scene, camera);
  };

  if (reduced) {
    renderer.render(scene, camera);
  } else {
    animate();
  }

  // ── IntersectionObserver — pause when hero scrolls off-screen ──────────────
  const io = new IntersectionObserver(
    (entries) => { isVisible = entries[0].isIntersecting; },
    { threshold: 0 },
  );
  io.observe(canvasEl.parentElement || canvasEl);

  // ── Page-visibility awareness ──────────────────────────────────────────────
  const onVisibility = () => {
    if (reduced) return;
    if (document.hidden) {
      if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
    } else if (rafId === null) {
      animate();
    }
  };
  document.addEventListener('visibilitychange', onVisibility);

  // ── Resize ─────────────────────────────────────────────────────────────────
  const onResize = () => {
    const w = canvasEl.clientWidth;
    const h = canvasEl.clientHeight;
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    if (reduced) renderer.render(scene, camera);
  };
  const ro = new ResizeObserver(onResize);
  ro.observe(canvasEl.parentElement || canvasEl);

  // ── Cleanup ────────────────────────────────────────────────────────────────
  return () => {
    if (rafId !== null) cancelAnimationFrame(rafId);
    window.removeEventListener('mousemove', onMouse);
    document.removeEventListener('visibilitychange', onVisibility);
    io.disconnect();
    ro.disconnect();
    goldGeo.dispose();   goldMat.dispose();
    tealGeo.dispose();   tealMat.dispose();
    purpleGeo.dispose(); purpleMat.dispose();
    if (lineGeo)  lineGeo.dispose();
    if (lineMat)  lineMat.dispose();
    if (glowTex)  glowTex.dispose();
    renderer.dispose();
  };
}
