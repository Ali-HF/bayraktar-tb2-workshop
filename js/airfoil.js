/* ============================================================
   Bayraktar TB2 — NACA 4412 Airfoil Simulation
   ============================================================
   Canvas-based streamline animation with AoA control.
   Uses standard NACA 4-digit equations for profile generation.
   ============================================================ */

const AirfoilSim = (() => {
  let canvas, ctx;
  let animId;
  let particles = [];
  let aoa = 5;        // degrees
  let airspeed = 1.0; // multiplier
  let chord = 60;     // mm (root default)
  let thickness = 0.12; // 12%
  let camber = 0.04;    // 4%
  let camberPos = 0.4;  // 40%
  let running = false;

  const NUM_PARTICLES = 180;
  const PARTICLE_SPEED = 2;

  /* ── NACA 4-digit profile computation ── */
  function nacaThickness(x) {
    // x in [0, 1]
    const t = thickness;
    return (t / 0.2) * (
      0.2969 * Math.sqrt(x)
      - 0.1260 * x
      - 0.3516 * x * x
      + 0.2843 * x * x * x
      - 0.1015 * x * x * x * x
    );
  }

  function nacaCamberLine(x) {
    const m = camber;
    const p = camberPos;
    if (x < p) {
      return (m / (p * p)) * (2 * p * x - x * x);
    } else {
      return (m / ((1 - p) * (1 - p))) * ((1 - 2 * p) + 2 * p * x - x * x);
    }
  }

  function nacaCamberSlope(x) {
    const m = camber;
    const p = camberPos;
    if (x < p) {
      return (2 * m / (p * p)) * (p - x);
    } else {
      return (2 * m / ((1 - p) * (1 - p))) * (p - x);
    }
  }

  function getAirfoilPoints(numPoints) {
    const upper = [];
    const lower = [];
    for (let i = 0; i <= numPoints; i++) {
      const x = i / numPoints;
      const yt = nacaThickness(x);
      const yc = nacaCamberLine(x);
      const dyc = nacaCamberSlope(x);
      const theta = Math.atan(dyc);

      upper.push({
        x: x - yt * Math.sin(theta),
        y: yc + yt * Math.cos(theta)
      });
      lower.push({
        x: x + yt * Math.sin(theta),
        y: yc - yt * Math.cos(theta)
      });
    }
    return { upper, lower };
  }

  /* ── Coordinate transforms ── */
  function toScreen(px, py, canvasW, canvasH, scale, offsetX, offsetY, aoaRad) {
    // Rotate around (0.25, 0) — quarter chord
    const cx = 0.25, cy = 0;
    const dx = px - cx, dy = py - cy;
    const rx = dx * Math.cos(aoaRad) + dy * Math.sin(aoaRad) + cx;
    const ry = -dx * Math.sin(aoaRad) + dy * Math.cos(aoaRad) + cy;

    return {
      x: offsetX + rx * scale,
      y: offsetY - ry * scale
    };
  }

  /* ── Flow field (simplified potential flow around airfoil) ── */
  function flowVelocity(px, py, aoaRad) {
    // Simple uniform flow + circulation model
    const U = PARTICLE_SPEED * airspeed;
    const cosA = Math.cos(aoaRad);
    const sinA = Math.sin(aoaRad);

    // Distance from airfoil center
    const cx = 0.5, cy = 0;
    const dx = px - cx;
    const dy = py - cy;
    const r2 = dx * dx + dy * dy;
    const r = Math.sqrt(r2);

    // Base uniform flow
    let vx = U * cosA;
    let vy = U * sinA;

    if (r > 0.05 && r < 3) {
      // Circulation effect (Kutta condition approximation)
      const gamma = U * Math.PI * Math.sin(aoaRad + camber * 4) * 0.5;
      vx += gamma * dy / (2 * Math.PI * r2);
      vy -= gamma * dx / (2 * Math.PI * r2);

      // Speed up over top surface (Bernoulli effect)
      if (dy > 0 && r < 0.5) {
        vx *= 1 + 0.8 * (0.5 - r);
      }

      // Slow down under bottom surface slightly
      if (dy < 0 && r < 0.4) {
        vx *= 0.9;
      }

      // Deflection behind trailing edge (downwash)
      if (dx > 0.3 && Math.abs(dy) < 0.3) {
        vy += sinA * U * 0.3 * Math.exp(-dx);
      }
    }

    // Stall: turbulent separation on top
    if (aoa > 14 && dy > 0 && dx > 0.3 && r < 0.6) {
      vx *= 0.3 + Math.random() * 0.4;
      vy += (Math.random() - 0.5) * U * 0.5;
    }

    return { vx, vy };
  }

  /* ── Particle system ── */
  function initParticles(canvasW, canvasH) {
    particles = [];
    for (let i = 0; i < NUM_PARTICLES; i++) {
      particles.push(resetParticle(canvasW, canvasH));
    }
  }

  function resetParticle(canvasW, canvasH) {
    return {
      x: -0.5 + Math.random() * 0.3,
      y: -1.0 + Math.random() * 2.0,
      age: 0,
      maxAge: 100 + Math.random() * 150,
      size: 1.5 + Math.random() * 1.5
    };
  }

  /* ── Draw ── */
  function draw() {
    if (!canvas || !ctx) return;
    const W = canvas.width;
    const H = canvas.height;
    const scale = W * 0.45;
    const offsetX = W * 0.28;
    const offsetY = H * 0.52;
    const aoaRad = aoa * Math.PI / 180;

    // Clear
    ctx.fillStyle = '#2b2b2b';
    ctx.fillRect(0, 0, W, H);

    // Draw streamlines (particles)
    particles.forEach((p, i) => {
      const vel = flowVelocity(p.x, p.y, aoaRad);
      const speed = Math.sqrt(vel.vx * vel.vx + vel.vy * vel.vy);

      p.x += vel.vx * 0.008;
      p.y += vel.vy * 0.008;
      p.age++;

      // Reset if out of bounds or too old
      if (p.x > 2 || p.x < -1 || p.y > 2 || p.y < -2 || p.age > p.maxAge) {
        const np = resetParticle(W, H);
        p.x = np.x; p.y = np.y; p.age = 0; p.maxAge = np.maxAge;
      }

      // Check if inside airfoil — skip drawing
      const profile = getAirfoilPoints(20);
      const rotPx = (p.x - 0.25) * Math.cos(-aoaRad) + (p.y) * Math.sin(-aoaRad) + 0.25;
      const rotPy = -(p.x - 0.25) * Math.sin(-aoaRad) + (p.y) * Math.cos(-aoaRad);

      if (rotPx >= 0 && rotPx <= 1) {
        const idx = Math.floor(rotPx * 20);
        const ub = profile.upper[Math.min(idx, 20)];
        const lb = profile.lower[Math.min(idx, 20)];
        if (ub && lb && rotPy < ub.y && rotPy > lb.y) return; // inside airfoil
      }

      const screenPos = toScreen(p.x, p.y, W, H, scale, offsetX, offsetY, 0);

      // Color based on speed
      const speedNorm = Math.min(speed / (PARTICLE_SPEED * airspeed * 2), 1);
      const r = Math.floor(232 * speedNorm + 60 * (1 - speedNorm));
      const g = Math.floor(168 * speedNorm + 60 * (1 - speedNorm));
      const b = Math.floor(124 * speedNorm + 80 * (1 - speedNorm));
      const alpha = Math.min(1, (1 - p.age / p.maxAge) * 0.8);

      ctx.beginPath();
      ctx.arc(screenPos.x, screenPos.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
      ctx.fill();
    });

    // Draw airfoil profile
    drawAirfoil(W, H, scale, offsetX, offsetY, aoaRad);

    // Draw AoA arc indicator
    drawAoAIndicator(W, H, offsetX, offsetY, aoaRad);

    // Stall warning
    if (aoa > 14) {
      ctx.fillStyle = 'rgba(231, 76, 60, 0.85)';
      ctx.font = 'bold 18px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⚠ STALL WARNING', W / 2, 40);
    }

    if (running) animId = requestAnimationFrame(draw);
  }

  function drawAirfoil(W, H, scale, offsetX, offsetY, aoaRad) {
    const profile = getAirfoilPoints(80);

    // Upper surface
    ctx.beginPath();
    profile.upper.forEach((pt, i) => {
      const s = toScreen(pt.x, pt.y, W, H, scale, offsetX, offsetY, aoaRad);
      if (i === 0) ctx.moveTo(s.x, s.y);
      else ctx.lineTo(s.x, s.y);
    });

    // Connect back via lower surface (reversed)
    for (let i = profile.lower.length - 1; i >= 0; i--) {
      const s = toScreen(profile.lower[i].x, profile.lower[i].y, W, H, scale, offsetX, offsetY, aoaRad);
      ctx.lineTo(s.x, s.y);
    }

    ctx.closePath();
    ctx.fillStyle = 'rgba(60, 60, 60, 0.9)';
    ctx.fill();
    ctx.strokeStyle = '#e8a87c';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Camber line
    ctx.beginPath();
    ctx.setLineDash([4, 4]);
    for (let i = 0; i <= 80; i++) {
      const x = i / 80;
      const yc = nacaCamberLine(x);
      const s = toScreen(x, yc, W, H, scale, offsetX, offsetY, aoaRad);
      if (i === 0) ctx.moveTo(s.x, s.y);
      else ctx.lineTo(s.x, s.y);
    }
    ctx.strokeStyle = 'rgba(232, 168, 124, 0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.setLineDash([]);

    // Chord label
    const le = toScreen(0, 0, W, H, scale, offsetX, offsetY, aoaRad);
    const te = toScreen(1, 0, W, H, scale, offsetX, offsetY, aoaRad);
    ctx.fillStyle = '#999';
    ctx.font = '12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Chord: ${chord}mm`, (le.x + te.x) / 2, Math.max(le.y, te.y) + 30);
  }

  function drawAoAIndicator(W, H, offsetX, offsetY, aoaRad) {
    const cx = offsetX + W * 0.45 * 0.25;
    const cy = offsetY;
    const r = 40;

    // Horizon line
    ctx.beginPath();
    ctx.moveTo(cx - r - 10, cy);
    ctx.lineTo(cx + r + 10, cy);
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // AoA arc
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, -aoaRad, aoaRad > 0);
    ctx.strokeStyle = aoa > 14 ? '#e74c3c' : '#2ecc71';
    ctx.lineWidth = 2;
    ctx.stroke();

    // AoA label
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`α = ${aoa.toFixed(1)}°`, cx + r + 15, cy + 5);
  }

  /* ── Public API ── */
  function init(canvasId) {
    canvas = document.getElementById(canvasId);
    if (!canvas) return;
    ctx = canvas.getContext('2d');

    resizeCanvas();
    initParticles(canvas.width, canvas.height);
    start();

    window.addEventListener('resize', resizeCanvas);
  }

  function resizeCanvas() {
    if (!canvas) return;
    const parent = canvas.parentElement;
    canvas.width = parent.clientWidth;
    canvas.height = Math.max(400, parent.clientHeight);
  }

  function start() {
    if (running) return;
    running = true;
    draw();
  }

  function stop() {
    running = false;
    if (animId) cancelAnimationFrame(animId);
  }

  function setAoA(angle) {
    aoa = Math.max(-5, Math.min(20, angle));
    if (typeof Charts !== 'undefined' && Charts.updateCLMarker) {
      Charts.updateCLMarker(aoa);
    }
  }

  function setAirspeed(speed) {
    airspeed = Math.max(0.1, Math.min(3, speed));
  }

  function setChord(mode) {
    if (mode === 'root') {
      chord = 60;
      thickness = 7.2 / 60; // actual thickness ratio for root
    } else {
      chord = 40;
      thickness = 4.8 / 40; // actual thickness ratio for tip
    }
  }

  return { init, start, stop, setAoA, setAirspeed, setChord, getAirfoilPoints, nacaCamberLine };
})();
