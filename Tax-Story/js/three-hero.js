/**
 * Tax Story — Three.js hero background particle field.
 * Floating financial data nodes with mouse-reactive tilt.
 */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js';

export function initHeroThreeScene(canvasEl) {
  const W = canvasEl.clientWidth || 480;
  const H = canvasEl.clientHeight || 320;

  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;

  // ── Scene ──────────────────────────────────────────────
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
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setClearColor(0x000000, 0);

  // ── Primary gold particle cloud ────────────────────────
  const COUNT = reduced ? 40 : 110;
  const posArr = new Float32Array(COUNT * 3);
  const velocities = [];

  for (let i = 0; i < COUNT; i++) {
    posArr[i * 3]     = (Math.random() - 0.5) * 360;
    posArr[i * 3 + 1] = (Math.random() - 0.5) * 260;
    posArr[i * 3 + 2] = (Math.random() - 0.5) * 130;
    velocities.push({
      x: (Math.random() - 0.5) * 0.07,
      y: (Math.random() - 0.5) * 0.07,
      z: (Math.random() - 0.5) * 0.035,
    });
  }

  const goldGeo = new THREE.BufferGeometry();
  goldGeo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
  const goldMat = new THREE.PointsMaterial({
    color: 0xd4af37,
    size: 2.0,
    transparent: true,
    opacity: 0.5,
    sizeAttenuation: true,
  });
  const goldPoints = new THREE.Points(goldGeo, goldMat);
  scene.add(goldPoints);

  // ── Secondary teal + purple accent clouds ──────────────
  // Skipped entirely when the user prefers reduced motion.
  const tealGeo = new THREE.BufferGeometry();
  const tealMat = new THREE.PointsMaterial({
    color: 0x5ead9a,
    size: 3.0,
    transparent: true,
    opacity: 0.32,
    sizeAttenuation: true,
  });
  const purpleGeo = new THREE.BufferGeometry();
  const purpleMat = new THREE.PointsMaterial({
    color: 0xa78bfa,
    size: 2.2,
    transparent: true,
    opacity: 0.28,
    sizeAttenuation: true,
  });

  if (!reduced) {
    const COUNT2 = 35;
    const posArr2 = new Float32Array(COUNT2 * 3);
    for (let i = 0; i < COUNT2; i++) {
      posArr2[i * 3]     = (Math.random() - 0.5) * 320;
      posArr2[i * 3 + 1] = (Math.random() - 0.5) * 230;
      posArr2[i * 3 + 2] = (Math.random() - 0.5) * 90;
    }
    tealGeo.setAttribute('position', new THREE.BufferAttribute(posArr2, 3));
    scene.add(new THREE.Points(tealGeo, tealMat));

    const COUNT3 = 25;
    const posArr3 = new Float32Array(COUNT3 * 3);
    for (let i = 0; i < COUNT3; i++) {
      posArr3[i * 3]     = (Math.random() - 0.5) * 300;
      posArr3[i * 3 + 1] = (Math.random() - 0.5) * 220;
      posArr3[i * 3 + 2] = (Math.random() - 0.5) * 80;
    }
    purpleGeo.setAttribute('position', new THREE.BufferAttribute(posArr3, 3));
    scene.add(new THREE.Points(purpleGeo, purpleMat));
  }

  // ── Mouse-reactive tilt ────────────────────────────────
  let mouseX = 0, mouseY = 0;
  const onMouse = (e) => {
    mouseX = (e.clientX / window.innerWidth  - 0.5) * 2;
    mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
  };
  if (!reduced) {
    window.addEventListener('mousemove', onMouse, { passive: true });
  }

  // ── Animation loop ─────────────────────────────────────
  let rafId = null;
  let t = 0;

  const animate = () => {
    rafId = requestAnimationFrame(animate);
    t += 0.012;

    for (let i = 0; i < COUNT; i++) {
      posArr[i * 3]     += velocities[i].x;
      posArr[i * 3 + 1] += velocities[i].y;
      posArr[i * 3 + 2] += velocities[i].z;
      if (Math.abs(posArr[i * 3])     > 185) velocities[i].x *= -1;
      if (Math.abs(posArr[i * 3 + 1]) > 135) velocities[i].y *= -1;
      if (Math.abs(posArr[i * 3 + 2]) > 68)  velocities[i].z *= -1;
    }
    goldGeo.attributes.position.needsUpdate = true;

    scene.rotation.y = Math.sin(t * 0.18) * 0.14 + mouseX * 0.07;
    scene.rotation.x = Math.sin(t * 0.12) * 0.06 - mouseY * 0.04;

    goldMat.opacity = 0.42 + Math.sin(t * 0.9) * 0.10;

    renderer.render(scene, camera);
  };

  if (reduced) {
    // Single static render, no rAF loop.
    renderer.render(scene, camera);
  } else {
    animate();
  }

  // ── Page-visibility awareness ──────────────────────────
  const onVisibility = () => {
    if (reduced) return;
    if (document.hidden) {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    } else if (rafId === null) {
      animate();
    }
  };
  document.addEventListener('visibilitychange', onVisibility);

  // ── Resize ─────────────────────────────────────────────
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

  // ── Cleanup ────────────────────────────────────────────
  return () => {
    if (rafId !== null) cancelAnimationFrame(rafId);
    window.removeEventListener('mousemove', onMouse);
    document.removeEventListener('visibilitychange', onVisibility);
    ro.disconnect();
    goldGeo.dispose(); goldMat.dispose();
    tealGeo.dispose(); tealMat.dispose();
    purpleGeo.dispose(); purpleMat.dispose();
    renderer.dispose();
  };
}
