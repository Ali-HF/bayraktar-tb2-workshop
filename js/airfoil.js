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
  let visualizationMode = 'particles'; // 'particles' or 'streamlines'

  const NUM_PARTICLES = 600;
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

  /* ── Flow field — surface-conforming potential flow ── */
  function flowVelocity(px, py, aoaRad) {
    const U = PARTICLE_SPEED * airspeed;

    // Transform to local airfoil coordinates (rotate by -AoA around quarter-chord)
    const rx = (px - 0.25) * Math.cos(-aoaRad) + py * Math.sin(-aoaRad) + 0.25;
    const ry = -(px - 0.25) * Math.sin(-aoaRad) + py * Math.cos(-aoaRad);

    // Start with uniform freestream in local coords
    let vx_loc = U;
    let vy_loc = 0;

    // Only apply airfoil effects in the relevant region
    if (rx > -0.3 && rx < 1.5) {
      const clampX = Math.max(0.001, Math.min(0.999, rx));
      const yc = nacaCamberLine(clampX);
      const yt = nacaThickness(clampX);
      const dyc = nacaCamberSlope(clampX);
      const y_upper = yc + yt;
      const y_lower = yc - yt;

      // Which surface are we nearest?
      const distFromCamber = ry - yc;
      const nearestSurfY = (distFromCamber >= 0) ? y_upper : y_lower;
      const signedDist = ry - nearestSurfY; // positive = safely outside, negative = inside

      // Surface tangent and outward normal
      const theta = Math.atan(dyc);
      const tx = Math.cos(theta);
      const ty = Math.sin(theta);
      // Outward normal (points away from surface)
      const nx = (distFromCamber >= 0) ? -Math.sin(theta) : Math.sin(theta);
      const ny = (distFromCamber >= 0) ? Math.cos(theta) : -Math.cos(theta);

      // ── Surface-normal repulsion: prevents particles from ever reaching the body ──
      const repulsionRange = 0.12; // how far out the repulsion reaches
      if (rx >= -0.05 && rx <= 1.05) {
        const dist = Math.abs(signedDist);
        if (dist < repulsionRange) {
          // Exponential repulsion — very strong close to surface, fades with distance
          const strength = U * 1.8 * Math.exp(-dist / 0.025);
          vx_loc += nx * strength;
          vy_loc += ny * strength;
        }
      }

      // ── Surface-tangent guidance: makes particles follow the contour (Coanda) ──
      const influenceRange = Math.max(0.12, yt * 4);
      const absDist = Math.abs(signedDist);
      if (absDist < influenceRange && rx >= -0.05 && rx <= 1.05) {
        const proximity = 1.0 - absDist / influenceRange;
        // Speed varies: faster over top (Bernoulli), normal under bottom
        let surfaceSpeed = U;
        if (distFromCamber >= 0) {
          surfaceSpeed = U * (1.0 + 0.5 * Math.sin(Math.PI * clampX) * (thickness / 0.12));
        } else {
          surfaceSpeed = U * (1.0 + 0.15 * Math.sin(Math.PI * clampX) * (thickness / 0.12));
        }

        const blend = proximity * proximity * 0.7;
        vx_loc = vx_loc * (1 - blend) + tx * surfaceSpeed * blend;
        vy_loc = vy_loc * (1 - blend) + ty * surfaceSpeed * blend;
      }

      // ── Leading edge stagnation split: deflect particles up or down before nose ──
      if (rx < 0.15 && rx > -0.25) {
        const dyLE = ry - yc;
        const rLE = Math.sqrt((rx * rx) + (dyLE * dyLE));
        if (rLE < 0.25 && rLE > 0.001) {
          // Strong radial push that decays with distance
          const pushStrength = U * 2.0 * Math.exp(-rLE / 0.06);
          const pushX = (rx / rLE) * pushStrength * 0.3;  // slight upstream slow
          const pushY = (dyLE / rLE) * pushStrength;       // strong vertical split
          vx_loc -= pushX;
          vy_loc += pushY;
        }
      }
    }

    // Circulation for lift (vortex at quarter-chord)
    const dx_v = rx - 0.25;
    const dy_v = ry;
    const r2_v = dx_v * dx_v + dy_v * dy_v;
    if (r2_v > 0.02) {
      const gamma = U * Math.PI * Math.sin(aoaRad + camber * 4) * 0.35;
      vx_loc += gamma * dy_v / (2 * Math.PI * r2_v);
      vy_loc -= gamma * dx_v / (2 * Math.PI * r2_v);
    }

    // Downwash behind trailing edge
    if (rx > 1.0) {
      vy_loc -= U * Math.sin(aoaRad) * 0.35 * Math.exp(-1.5 * (rx - 1.0));
    }

    // Stall turbulence
    if (aoa > 14 && ry > 0 && rx > 0.3 && rx < 1.3) {
      const stallFactor = Math.min(1, (aoa - 14) / 6);
      vx_loc *= (1 - 0.5 * stallFactor) + Math.random() * 0.25 * stallFactor;
      vy_loc += (Math.random() - 0.5) * U * 0.7 * stallFactor;
    }

    // Ensure minimum forward velocity
    vx_loc = Math.max(U * 0.15, vx_loc);

    // Transform back to global coordinates
    const vx = vx_loc * Math.cos(aoaRad) - vy_loc * Math.sin(aoaRad);
    const vy = vx_loc * Math.sin(aoaRad) + vy_loc * Math.cos(aoaRad);

    return { vx, vy };
  }

  /* ── Project a point out of the airfoil body onto the nearest surface ── */
  function projectOutOfAirfoil(px, py, aoaRad) {
    let rx = (px - 0.25) * Math.cos(-aoaRad) + py * Math.sin(-aoaRad) + 0.25;
    let ry = -(px - 0.25) * Math.sin(-aoaRad) + py * Math.cos(-aoaRad);

    if (rx < -0.02 || rx > 1.02) return { x: px, y: py };

    const clampX = Math.max(0, Math.min(1, rx));
    const yc = nacaCamberLine(clampX);
    const yt = nacaThickness(clampX);
    const y_upper = yc + yt;
    const y_lower = yc - yt;

    if (ry < y_upper && ry > y_lower) {
      // Inside — project to whichever surface via camber line
      if (ry >= yc) {
        ry = y_upper + 0.008;
      } else {
        ry = y_lower - 0.008;
      }
      // Nudge downstream to prevent re-entry on next frame
      rx += 0.008;
      const newX = (rx - 0.25) * Math.cos(aoaRad) - ry * Math.sin(aoaRad) + 0.25;
      const newY = (rx - 0.25) * Math.sin(aoaRad) + ry * Math.cos(aoaRad);
      return { x: newX, y: newY };
    }
    return { x: px, y: py };
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
      size: 1.2 + Math.random() * 1.5
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

    if (visualizationMode === 'particles') {
      particles.forEach((p, i) => {
        const vel = flowVelocity(p.x, p.y, aoaRad);
        const speed = Math.sqrt(vel.vx * vel.vx + vel.vy * vel.vy);

        p.x += vel.vx * 0.008;
        p.y += vel.vy * 0.008;
        p.age++;

        if (p.x > 2 || p.x < -1 || p.y > 2 || p.y < -2 || p.age > p.maxAge) {
          const np = resetParticle(W, H);
          p.x = np.x; p.y = np.y; p.age = 0; p.maxAge = np.maxAge;
        }

        // Project out of airfoil body
        const proj = projectOutOfAirfoil(p.x, p.y, aoaRad);
        p.x = proj.x;
        p.y = proj.y;

        const screenPos = toScreen(p.x, p.y, W, H, scale, offsetX, offsetY, 0);

        const speedNorm = Math.min(speed / (PARTICLE_SPEED * airspeed * 2), 1);
        const r = Math.floor(232 * speedNorm + 60 * (1 - speedNorm));
        const g = Math.floor(168 * speedNorm + 60 * (1 - speedNorm));
        const b = Math.floor(124 * speedNorm + 80 * (1 - speedNorm));
        const alpha = Math.min(1, (1 - p.age / p.maxAge) * 0.85);

        ctx.beginPath();
        ctx.arc(screenPos.x, screenPos.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
        ctx.fill();
      });
    } else {
      const numLines = 45;
      for (let j = 0; j < numLines; j++) {
        let px = -0.5;
        let py = -1.1 + (j / numLines) * 2.2;
        let lastScreen = null;

        for (let step = 0; step < 260; step++) {
          const vel = flowVelocity(px, py, aoaRad);
          const speed = Math.sqrt(vel.vx * vel.vx + vel.vy * vel.vy);

          px += vel.vx * 0.01;
          py += vel.vy * 0.01;

          if (px > 2.0 || px < -0.8 || py > 2.0 || py < -2.0) break;

          const proj = projectOutOfAirfoil(px, py, aoaRad);
          px = proj.x;
          py = proj.y;

          const screenPos = toScreen(px, py, W, H, scale, offsetX, offsetY, 0);

          if (lastScreen) {
            ctx.beginPath();
            ctx.moveTo(lastScreen.x, lastScreen.y);
            ctx.lineTo(screenPos.x, screenPos.y);

            const speedNorm = Math.min(speed / (PARTICLE_SPEED * airspeed * 2), 1);
            const r = Math.floor(232 * speedNorm + 60 * (1 - speedNorm));
            const g = Math.floor(168 * speedNorm + 60 * (1 - speedNorm));
            const b = Math.floor(124 * speedNorm + 80 * (1 - speedNorm));

            ctx.strokeStyle = `rgba(${r},${g},${b},0.42)`;
            ctx.lineWidth = 1.8;
            ctx.stroke();
          }
          lastScreen = screenPos;
        }
      }
    }

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
    canvas.height = parent.clientHeight || 400;
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

  function setVisualizationMode(mode) {
    if (mode === 'particles' || mode === 'streamlines') {
      visualizationMode = mode;
    }
  }

  return { init, start, stop, setAoA, setAirspeed, setChord, setVisualizationMode, getAirfoilPoints, nacaCamberLine };
})();
