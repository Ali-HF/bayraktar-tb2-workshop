# Prompt for Coding Agent: Interactive UAV/RC Plane Design Report

Copy everything below into your agent (Claude Code / Cowork / similar).

---

## Project Goal

Build a multi-page, interactive HTML/CSS/JS web app that serves as a design report for a fixed-wing RC plane. It must combine a **live vector 2D/3D-styled model** of the aircraft, an **electronics & materials configurator**, **real-time engineering calculations**, a **budget calculator**, and an **airfoil airflow simulation** — all wrapped in a clean, modern, dashboard-like UI with charts and pie charts. This is for a UAV workshop report, so it needs to look professional and polished, not like a toy demo.

## Tech Stack

- Plain HTML/CSS/JS (no build step) OR a single-file React app — your choice, but keep it self-contained and runnable directly in a browser.
- Use an SVG-based "3D-ish" isometric/orthographic vector model of the plane (top view, side view, and an isometric-projection view) rather than a full WebGL 3D engine, UNLESS you choose to use Three.js — either is acceptable, but SVG vector must be the fallback/default since it needs to look crisp and diagrammatic, like a real engineering drawing, not a rendered mesh.
- Use Chart.js (or similar) for line/bar charts and pie/donut charts.
- No backend — everything runs client-side, all state in memory/JS variables.

## Overall Layout

Multi-page app with a persistent top navbar (or sidebar) to switch between pages. Do NOT cram everything onto one screen — spread content across pages, each focused and readable. Suggested pages:

1. **Overview / Home** — plane name, summary specs, quick-glance hero visual of the aircraft (vector top-down or 3-view drawing), navigation cards to other pages.
2. **Aircraft Model** — the main interactive vector drawing page (see below): central panel with the plane visual, side panels for electronics + materials selectors, bottom panel for live calculated stats. This is the core "dashboard" page.
3. **Electronics Configurator** — deeper dive: full component list, specs, and selection with comparison view.
4. **Materials Selector** — deeper dive: per-part material choice (fuselage, wing, tail, etc.) with weight/cost/strength trade-offs.
5. **Performance & Calculations** — all formulas, computed values, target-range indicators (green/yellow/red), and supporting charts (gauges, bar comparisons vs. target ranges).
6. **Budget** — cost breakdown pie chart, itemized cost table, running total, cost-per-category comparison.
7. **Airfoil Airflow Simulation** — dedicated page simulating airflow over the NACA 4412 airfoil cross-section (see detailed spec below).

Use a consistent design system: dark or light theme (pick one, make it aviation/engineering-inspired — blueprint blue, carbon-fiber dark, or clean white technical-drawing style), consistent spacing, card-based panels, subtle shadows, smooth transitions when values update.

---

## Page 2 Detail: "Aircraft Model" Dashboard

### Central Panel — Vector Aircraft Model
Render an accurate-proportioned vector drawing of the aircraft using these exact dimensions:

| Parameter | Value |
|---|---|
| Wingspan | 1000 mm |
| Fuselage length | 542 mm |
| Overall height | 183 mm |
| Wing root chord | 60 mm |
| Wing tip chord | 40 mm |
| Wing thickness (NACA 4412) | 7.2 mm at root, 4.8 mm at tip |
| Wing sweep (leading edge) | 15 mm |
| Horizontal distance, nose to wing LE | 220 mm |
| Horizontal tail span | 200 mm |
| Horizontal tail chord | 30 mm |
| Vertical tail height (each fin) | 70 mm |
| Vertical tail root chord | 45 mm |
| V-tail included angle | 110° (55° each side) |
| Distance, wing TE to tail LE | 180 mm |
| Fuselage width (max) | 45 mm |
| Fuselage height (max) | 55 mm |
| Motor mount diameter | 28–35 mm |

Requirements:
- Draw the plane to scale (respect all proportions relative to each other) as SVG paths — top view, side view, and an isometric pseudo-3D view, switchable via tabs or a toggle.
- Model should be a V-tail pusher/tractor layout consistent with the given tail geometry (110° included angle V-tail, not conventional cross tail).
- Add subtle interactivity: hovering over a part (wing, fuselage, V-tail, motor mount) highlights it and shows a tooltip with its dimensions.
- Reflect configuration choices visually where feasible: e.g., swap the visual color/texture of a part when its material is changed (balsa = light tan, carbon fiber = dark weave pattern/dark grey, foam = white/blue, plywood = brown), and show a slightly bigger motor icon/mount if a heavier/higher-power motor is selected.
- Add small dimension callout lines (like engineering drawings) for wingspan, fuselage length, and tail span.

### Side Panels

**Electronics panel** (RC hobby components), each with a dropdown/selector offering at least 2-3 tiers (light/medium/heavy or budget/mid/high-performance) with realistic specs and prices:
- Motor (e.g., brushless outrunner options at different KV/power ratings, weight, max current, price)
- ESC (current rating matched to motor tiers, price)
- Battery / LiPo (capacity mAh, voltage/cell count, C-rating, weight, price)
- Servos (for ailerons, V-tail ruddervators — torque, speed, weight, price options)
- Propeller (diameter x pitch options appropriate to motor tier)
- Receiver (basic option, price)
- Optional: FPV camera/FC/telemetry as an "add-on" toggle for extra credit realism

**Materials panel**, per structural part (Fuselage, Wing, Horizontal tail, Vertical tail/V-tail, Motor mount/firewall), each with a selector across materials such as:
- Balsa wood (light, cheap, lower strength)
- Plywood (heavier, cheap, strong at mounts)
- EPP/EPO foam (very light, cheap, moderate durability)
- Fiberglass (light-medium, stronger, mid cost)
- Carbon fiber (lightest for strength, most expensive)

Each material choice should carry a density/weight-factor and a cost-per-part, so switching materials changes total weight and total cost live.

### Bottom Panel — Live Calculations
Recompute instantly whenever electronics or materials change. Show as a clean strip of stat cards + mini charts (not raw numbers only):

| Metric | Formula | Target Range | Display |
|---|---|---|---|
| Wing loading | Weight ÷ Wing area | 8–15 oz/ft² trainer, 12–20 sport, 20–35+ fast/warbird | Gauge/bar with colored zones |
| Power-to-weight | Watts ÷ lb | 50–80 trainer, 90–120 sport, 150–200+ 3D | Gauge/bar with colored zones |
| Thrust-to-weight | Thrust ÷ Weight | ~0.5–0.8 sport, ≥1 for 3D/hover | Gauge/bar |
| Stall speed | √(2W ÷ (ρ·S·C_Lmax)), C_Lmax ≈ 1.2–1.5 | sanity-check vs. field size | Numeric + note |
| Aspect ratio | Span² ÷ Wing area | 8–15+ glider (efficient), 4–6 aerobatic (agile) | Numeric + category label |
| Flight time | (Capacity mAh ÷ (Avg current A × 1000)) × 60 × 0.8 | keep 0.8 LiPo safety margin | Numeric, minutes |
| Battery C-rating check | Capacity(Ah) × C-rating ≥ motor max current | must clear with margin | Pass/fail badge + margin % |
| Top speed estimate | RPM × Pitch(in) × 60 / 63360 × 0.85 | rough only | Numeric, mph/kph |

Implementation notes:
- Wing area: compute from a trapezoidal wing using root chord, tip chord, and span (standard trapezoid area formula), converted to ft² where needed.
- Total weight = sum of estimated structural weight (from material × part volume/area assumptions you define reasonably) + electronics weight (motor+ESC+battery+servos+receiver+prop) + a reasonable miscellaneous/hardware allowance. Document your assumption for structural weight estimation clearly in a tooltip or footnote since exact volumes aren't given — make a clearly-labeled reasonable approximation (e.g., using surface area × material thickness × density for wings/tail, and a shell-approximation for fuselage), and state that it's an estimate.
- RPM for top speed = motor KV × battery voltage × (throttle assumption, e.g. 100% or a stated %), clearly labeled as an estimate.
- Every metric should show a colored status indicator (green = in range, yellow = borderline, red = out of range) against the target ranges above, with the specific sub-range (trainer/sport/3D/etc.) selectable or auto-detected based on other choices.
- Include at least: a radar/spider chart comparing all normalized metrics at once, plus individual gauge/bar visuals per metric.

---

## Budget Page
- Pie/donut chart breaking down total cost by category: Motor, ESC, Battery, Servos, Prop, Receiver, Fuselage material, Wing material, Tail material, Hardware/misc.
- Itemized cost table with live totals.
- Running total budget number prominently displayed, updates instantly as selections change.
- Optional: a simple budget slider/target so the user can see if they're over/under a target budget, with a bar showing % of budget used.

---

## Airfoil Airflow Simulation Page

Dedicated page simulating airflow over the **NACA 4412** airfoil (root: 7.2mm thick / tip: 4.8mm thick at the given chords — use root chord 60mm for the primary sim view, and let the user toggle to tip chord 40mm).

Requirements:
- Generate the actual NACA 4412 airfoil profile shape using the standard NACA 4-digit camber-line + thickness-distribution equations (camber 4%, position 40%, thickness 12% — note the "4412" naming: max camber 4%, camber position at 40% chord, thickness 12% of chord — scale the thickness distribution to roughly match the given 7.2mm/4.8mm absolute thickness at the respective chords for visual consistency with the rest of the model).
- Animate streamlines flowing over and under the airfoil, showing the classic flow acceleration over the top surface and stagnation point at the leading edge. This can be done as an animated SVG/canvas particle-stream or flowing-line effect — doesn't need to be full CFD, just a visually convincing, physically-plausible representation (denser/faster streamlines over the top, slight downwash behind the trailing edge).
- Include an angle-of-attack slider (e.g., -5° to +20°) that rotates the airfoil and visibly changes the streamline pattern, shows an approximate stall warning past a critical angle (~15-16° for this airfoil), and updates an approximate lift coefficient indicator (simple C_L vs AoA curve, roughly linear then dropping off after stall — this can be a simplified thin-airfoil-theory approximation, clearly labeled as an approximation, not a solver).
- Show a small live C_L vs angle-of-attack chart alongside the animation, with a marker showing the current AoA position on the curve.
- Airspeed slider/input that affects streamline animation speed (purely visual, tie loosely to the stall speed calculated on the Performance page if you want a nice cross-page connection).

---

## Interactivity & Polish Requirements
- Every selector (electronics tier, material per part) triggers instant recalculation across all relevant pages — use shared state (React context, or a simple global JS store/pub-sub) so nothing needs a page reload.
- Smooth transitions/animations on value changes (numbers counting up/down, bars/gauges animating to new values).
- Responsive layout that works on a laptop screen at minimum (doesn't need to be mobile-first, but shouldn't break).
- Add a "Reset to defaults" and a "Print/Export view" friendly layout for the report pages (clean printable CSS for when they need to submit/print this).
- Use real, plausible RC hobby part names/specs and prices (e.g., realistic brushless motor KV/wattage/price ranges, realistic LiPo mAh/C-rating/price ranges) rather than placeholder Lorem-ipsum-style data — this is going into an actual workshop report.
- Include brief inline explanations/tooltips for each formula and each target range so a reader unfamiliar with RC design terms can follow along (this is a *report*, so it should teach as it shows).

## Deliverable
A single cohesive multi-page app (can be a folder of linked HTML files, or a single-page app with client-side routing/tabs — your call on what renders cleanest) that I can open in a browser and click through as a finished design report for the workshop, with all pages above fully functional and interconnected.