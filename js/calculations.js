/* ============================================================
   Bayraktar TB2 Workshop — Engineering Calculations
   ============================================================
   All formulas are standard RC-aircraft engineering estimates.

   Structural weight uses a surface-area × thickness × density
   approximation (clearly labeled as an estimate, since exact part
   volumes aren't specified in the design brief).

   Everything here is a PURE function of the current PlaneData
   (static dimensions/parts catalogue) and AppState (the user's
   current electronics/material selections) — call fullReport()
   any time the selections change to get a fresh set of numbers.
   ============================================================ */

const Calc = (() => {

  /* ────────────────────────────────────────────────────────────
     UNIT CONVERSION CONSTANTS
     ──────────────────────────────────────────────────────────── */

  const AIR_DENSITY = 1.225;       // kg/m³, sea-level air density (ISA standard)
  const G_TO_OZ = 0.035274;    // grams  → ounces
  const G_TO_LB = 0.00220462;  // grams  → pounds
  const G_TO_KG = 0.001;       // grams  → kilograms
  const MM2_TO_FT2 = 1.07639e-5;  // mm²    → ft²
  const MM_TO_M = 0.001;       // mm     → m
  const IN_TO_MM = 25.4;        // inches → mm

  /* ────────────────────────────────────────────────────────────
     LOOKUP HELPERS
     ──────────────────────────────────────────────────────────── */

  /**
   * Look up the currently-selected tier object for an electronics category
   * (e.g. 'motor', 'battery'). Falls back to the category's first tier if
   * nothing is selected yet, so calculations never crash on first load.
   * @param {string} category   - key into PlaneData.electronics (e.g. 'motor')
   * @param {string} selectedId - the tier id currently stored in AppState
   * @returns {object|null} the matching tier object, or null if the category doesn't exist
   */
  function _getTier(category, selectedId) {
    const cat = PlaneData.electronics[category];
    if (!cat) return null;
    return cat.tiers.find(t => t.id === selectedId) || cat.tiers[0];
  }

  /**
   * Look up a material definition (density, cost, strength, color) by id.
   * @param {string} matId - e.g. 'balsa', 'carbonfiber'
   * @returns {object} the matching material object, or the first material as a fallback
   */
  function _getMaterial(matId) {
    return PlaneData.materialOptions.find(m => m.id === matId) || PlaneData.materialOptions[0];
  }

  /* ────────────────────────────────────────────────────────────
     WING GEOMETRY
     ──────────────────────────────────────────────────────────── */

  /**
   * Wing area from a trapezoidal planform: average of root & tip chord,
   * times span.
   *   S = ((c_root + c_tip) / 2) × span
   * @returns {number} wing area in mm²
   */
  function wingArea_mm2() {
    const d = PlaneData.dimensions;
    return 0.5 * (d.wingRootChord + d.wingTipChord) * d.wingspan;
  }

  /** Wing area converted to m² (used in the stall-speed lift equation). */
  function wingArea_m2() { return wingArea_mm2() * 1e-6; }

  /** Wing area converted to ft² (used for the oz/ft² wing-loading convention). */
  function wingArea_ft2() { return wingArea_mm2() * MM2_TO_FT2; }

  /* ────────────────────────────────────────────────────────────
     WEIGHT ESTIMATION
     ──────────────────────────────────────────────────────────── */

  /**
   * Estimated structural weight (grams) for each airframe part.
   * Method: volume = surfaceArea(cm²) × thickness(cm) → cm³,
   *         weight  = volume × material density (g/cm³).
   * This is a clearly-labeled APPROXIMATION — exact part volumes
   * aren't given in the brief, so each part is treated as a flat
   * shell of its material at a representative thickness.
   * @returns {{ total: number, breakdown: Object<string,{weight:number, material:string}> }}
   */
  function structuralWeight() {
    const parts = PlaneData.materials;
    let total = 0;
    const breakdown = {};

    ['fuselage', 'wing', 'tail', 'mount'].forEach(partKey => {
      const part = parts[partKey];
      const matId = AppState.get('mat_' + partKey);
      const mat = _getMaterial(matId);

      // volume(cm³) = surfaceArea(cm²) × thickness(mm → cm)
      const vol_cm3 = part.surfaceArea_cm2 * (part.thickness_mm / 10);
      const weight = vol_cm3 * mat.density;

      breakdown[partKey] = { weight, material: mat.name };
      total += weight;
    });

    return { total, breakdown };
  }

  /**
   * Total electronics weight (grams), summed across every selected
   * component tier: motor, ESC, battery, servos (× quantity), prop,
   * receiver, transmitter, BEC, wiring, and voltage monitor.
   * @returns {object} per-component weights (grams) plus a `total` field
   */
  function electronicsWeight() {
    const motor = _getTier('motor', AppState.get('motor'));
    const esc = _getTier('esc', AppState.get('esc'));
    const battery = _getTier('battery', AppState.get('battery'));
    const servo = _getTier('servo', AppState.get('servo'));
    const prop = _getTier('prop', AppState.get('prop'));
    const receiver = _getTier('receiver', AppState.get('receiver'));
    const transmitter = _getTier('transmitter', AppState.get('transmitter'));
    const bec = _getTier('bec', AppState.get('bec'));
    const wiring = _getTier('wiring', AppState.get('wiring'));
    const voltmonitor = _getTier('voltmonitor', AppState.get('voltmonitor'));

    // Servos come as a per-unit weight × quantity (default 3: 2 aileron + 1 ruddervator pair)
    const servoTotal = servo ? (servo.weight * (servo.qty || 3)) : 0;

    const motorW = motor ? motor.weight : 0;
    const escW = esc ? esc.weight : 0;
    const batteryW = battery ? battery.weight : 0;
    const propW = prop ? prop.weight : 0;
    const rxW = receiver ? receiver.weight : 0;
    const txW = 0; // Transmitter (TX) is held by the pilot on the ground, so it contributes 0g to airborne weight
    const becW = bec ? bec.weight : 0;
    const wireW = wiring ? wiring.weight : 0;
    const vmonW = voltmonitor ? voltmonitor.weight : 0;

    return {
      motor: motorW,
      esc: escW,
      battery: batteryW,
      servos: servoTotal,
      prop: propW,
      receiver: rxW,
      transmitter: txW,
      bec: becW,
      wiring: wireW,
      voltmonitor: vmonW,
      total: motorW + escW + batteryW + servoTotal + propW + rxW + txW + becW + wireW + vmonW
    };
  }

  /**
   * Grand total weight (grams) = structural + electronics + a fixed
   * misc/hardware allowance (glue, screws, covering, etc.).
   * @returns {number} total weight in grams
   */
  function totalWeight_g() {
    return structuralWeight().total + electronicsWeight().total + PlaneData.miscWeight;
  }

  /* ────────────────────────────────────────────────────────────
     PERFORMANCE METRICS
     ──────────────────────────────────────────────────────────── */

  /**
   * Wing loading = weight ÷ wing area, in the hobby-standard oz/ft² unit.
   * Higher wing loading → the wing works harder per unit area → needs
   * more airspeed to generate the same lift (less "floaty", more agile
   * at speed but less forgiving at low speed).
   *   WL = W(oz) / S(ft²)
   * @returns {number} wing loading in oz/ft²
   */
  function wingLoading() {
    const w_oz = totalWeight_g() * G_TO_OZ;
    const s_ft2 = wingArea_ft2();
    return w_oz / s_ft2;
  }

  /**
   * Power-to-weight ratio (W/lb) — a proxy for climb rate and acceleration:
   * more watts per pound means more excess thrust beyond what's needed
   * just to stay level, which converts into climb/aerobatic performance.
   *   P/W = motor watts / weight(lb)
   * @returns {number} power-to-weight in watts per pound
   */
  function powerToWeight() {
    const motor = _getTier('motor', AppState.get('motor'));
    const w_lb = totalWeight_g() * G_TO_LB;
    return motor.watts / w_lb;
  }

  /**
   * Thrust-to-weight ratio. At ≥ 1, the motor alone can out-thrust
   * gravity — the plane could theoretically hover on the prop, which
   * is the benchmark for 3D/aerobatic capability.
   *   T/W = thrust(g) / weight(g)
   * @returns {number} dimensionless thrust-to-weight ratio
   */
  function thrustToWeight() {
    const motor = _getTier('motor', AppState.get('motor'));
    return motor.thrust_g / totalWeight_g();
  }

  /**
   * Stall speed — the minimum airspeed at which the wing can still
   * generate enough lift to support the aircraft's weight. Derived by
   * rearranging the lift equation (L = ½ρv²SC_L) and solving for v
   * with L = W and C_L at its maximum (just before the wing stalls):
   *   v_stall = √( 2W / (ρ · S · C_Lmax) )
   * @param {number} [clMax=1.35] - max lift coefficient before stall (NACA 4412 ≈ 1.2–1.5)
   * @returns {number} stall speed in m/s
   */
  function stallSpeed(clMax) {
    clMax = clMax || 1.35;
    const w = totalWeight_g() * G_TO_KG * 9.81; // weight force in Newtons
    const s = wingArea_m2();
    return Math.sqrt((2 * w) / (AIR_DENSITY * s * clMax));
  }

  /**
   * Aspect ratio = span² ÷ wing area. High aspect ratio (long, narrow
   * wings) → lower induced drag, more efficient, less agile (gliders).
   * Low aspect ratio (short, wide wings) → more agile, more induced
   * drag (aerobatic planes).
   *   AR = span² / S
   * @returns {number} dimensionless aspect ratio
   */
  function aspectRatio() {
    const d = PlaneData.dimensions;
    return (d.wingspan * d.wingspan) / wingArea_mm2();
  }

  /**
   * Estimated flight time in minutes, assuming a 70%-throttle average
   * current draw and reserving 20% of the pack (never fully discharging
   * a LiPo, which would damage the cells).
   *   t = (capacity(mAh) / (avgCurrent(A) × 1000)) × 60 × 0.8
   * @returns {number} flight time in minutes
   */
  function flightTime() {
    const battery = _getTier('battery', AppState.get('battery'));
    const motor = _getTier('motor', AppState.get('motor'));
    const avgCurrent = motor.maxCurrent * 0.7; // assume 70% average throttle
    return (battery.capacity / (avgCurrent * 1000)) * 60 * 0.8;
  }

  /**
   * Battery C-rating safety check: does the battery's maximum continuous
   * discharge current clear the motor's peak draw? If not, the battery
   * will sag under load (or overheat/be damaged).
   *   maxDischarge(A) = capacity(Ah) × C-rating
   * @returns {{ maxDischarge: number, motorMax: number, pass: boolean, margin: number }}
   *          margin is the % headroom (positive = safe, negative = undersized battery)
   */
  function cRatingCheck() {
    const battery = _getTier('battery', AppState.get('battery'));
    const motor = _getTier('motor', AppState.get('motor'));
    const maxDischargeCurrent = (battery.capacity / 1000) * battery.cRating;
    const margin = ((maxDischargeCurrent - motor.maxCurrent) / motor.maxCurrent) * 100;
    return {
      maxDischarge: maxDischargeCurrent,
      motorMax: motor.maxCurrent,
      pass: maxDischargeCurrent >= motor.maxCurrent,
      margin: margin
    };
  }

  /**
   * Rough top-speed estimate from propeller pitch theory: RPM × pitch
   * gives the theoretical distance the prop "screws" through per minute;
   * the 0.85 factor accounts for real-world propeller slip (the prop
   * never achieves its full theoretical pitch advance through air).
   *   RPM = motor KV × battery voltage   (100% throttle assumption)
   *   speed(mph) = RPM × pitch(in) × 60 / 63360 × 0.85
   * @returns {{ mph: number, kph: number, rpm: number }}
   */
  function topSpeed() {
    const motor = _getTier('motor', AppState.get('motor'));
    const battery = _getTier('battery', AppState.get('battery'));
    const prop = _getTier('prop', AppState.get('prop'));

    const rpm = motor.kv * battery.voltage;
    const pitchInches = prop.pitch;
    const speed_mph = (rpm * pitchInches * 60) / 63360 * 0.85;
    const speed_kph = speed_mph * 1.60934;

    return { mph: speed_mph, kph: speed_kph, rpm };
  }

  /* ────────────────────────────────────────────────────────────
     STATUS / TRAFFIC-LIGHT CHECKS
     ──────────────────────────────────────────────────────────── */

  /**
   * Traffic-light status for wing loading against the flight-category
   * target band (trainer / sport / 3D), read from AppState.
   * @param {number} val - wingLoading() result, in oz/ft²
   * @returns {'green'|'yellow'|'red'}
   */
  function wingLoadingStatus(val) {
    const cat = AppState.get('flightCategory') || 'sport';
    const ranges = { trainer: [8, 15], sport: [12, 20], '3d': [20, 35] };
    const [lo, hi] = ranges[cat] || ranges.sport;
    if (val >= lo && val <= hi) return 'green';
    if (val >= lo * 0.8 && val <= hi * 1.2) return 'yellow';
    return 'red';
  }

  /**
   * Traffic-light status for power-to-weight against the flight-category
   * target band.
   * @param {number} val - powerToWeight() result, in W/lb
   * @returns {'green'|'yellow'|'red'}
   */
  function powerToWeightStatus(val) {
    const cat = AppState.get('flightCategory') || 'sport';
    const ranges = { trainer: [50, 80], sport: [90, 120], '3d': [150, 200] };
    const [lo, hi] = ranges[cat] || ranges.sport;
    if (val >= lo && val <= hi) return 'green';
    if (val >= lo * 0.7 && val <= hi * 1.3) return 'yellow';
    return 'red';
  }

  /**
   * Traffic-light status for thrust-to-weight (fixed band, not
   * flight-category dependent — 0.5–1.2 covers sport through mild 3D).
   * @param {number} val - thrustToWeight() result
   * @returns {'green'|'yellow'|'red'}
   */
  function thrustToWeightStatus(val) {
    if (val >= 0.5 && val <= 1.2) return 'green';
    if (val >= 0.3 && val <= 1.5) return 'yellow';
    return 'red';
  }

  /* ============================================================
     CENTER OF GRAVITY (CG) / WEIGHT & BALANCE
     ============================================================
     Standard aeromodelling method:
       1. Compute the wing's Mean Aerodynamic Chord (MAC) and where
          its leading edge sits along the fuselage (accounts for sweep).
       2. Sum moments (weight × fuselage station) of every mass in the
          plane about the nose, divide by total weight → CG station.
       3. Express CG as %MAC (distance behind the MAC leading edge, as
          a fraction of MAC length) — the number builders actually
          balance against. Target band: 25–33% MAC.

     Component fuselage-station (mm from nose) placements below are
     REASONABLE ASSUMPTIONS, not measured positions — the design brief
     doesn't specify exact component siting, only overall dimensions.
     This mirrors the same "clearly labeled estimate" approach used for
     structuralWeight(). If real component layout is known, update
     CG_ASSUMED_STATIONS_MM accordingly.
     ============================================================ */

  /** Assumed fuselage station (mm from nose) for each electronics component. */
  const CG_ASSUMED_STATIONS_MM = {
    motor: 15,  // firewall/nose-mounted
    mount: 15,  // motor mount sits with the motor
    esc: 110,  // just aft of motor, ahead of battery bay
    battery: 170,  // main battery bay, ahead of wing for balance
    receiver: 250,  // mid-fuselage, aft of battery
    bec: 250,
    voltmonitor: 170,
    wiring: 200   // distributed through fuselage; approximate midpoint
  };

  /**
   * Fuselage station (mm from nose) of the wing's leading edge at the root.
   * @returns {number} mm from nose
   */
  function _wingLEStation_mm() {
    return PlaneData.dimensions.noseToWingLE;
  }

  /**
   * Fuselage station (mm from nose) of the V-tail's leading edge at the root.
   * Wing TE station = wing LE + root chord; tail LE = wing TE + the given gap.
   * @returns {number} mm from nose
   */
  function _tailLEStation_mm() {
    const d = PlaneData.dimensions;
    return d.noseToWingLE + d.wingRootChord + d.wingTEtoTailLE;
  }

  /**
   * Mean Aerodynamic Chord (MAC) length — the chord of an "average"
   * rectangular wing that behaves aerodynamically like the real
   * tapered wing. Standard formula for a straight-tapered wing:
   *   MAC = (2/3) × ( c_root + c_tip − (c_root × c_tip) / (c_root + c_tip) )
   * @returns {number} MAC length in mm
   */
  function macLength_mm() {
    const d = PlaneData.dimensions;
    const cr = d.wingRootChord, ct = d.wingTipChord;
    return (2 / 3) * (cr + ct - (cr * ct) / (cr + ct));
  }

  /**
   * Spanwise station (mm, measured from the wing root) at which the
   * MAC occurs on a straight-tapered wing:
   *   y_MAC = (span / 6) × (c_root + 2·c_tip) / (c_root + c_tip)
   * @returns {number} spanwise distance from root, in mm
   */
  function macSpanwiseY_mm() {
    const d = PlaneData.dimensions;
    const cr = d.wingRootChord, ct = d.wingTipChord;
    return (d.wingspan / 6) * (cr + 2 * ct) / (cr + ct);
  }

  /**
   * Fuselage station (mm from nose) of the MAC's leading edge. Starts
   * at the wing root's LE station, then shifts aft to account for wing
   * sweep — the LE moves aft proportionally with spanwise position.
   * @returns {number} mm from nose
   */
  function macLEStation_mm() {
    const d = PlaneData.dimensions;
    const halfSpan = d.wingspan / 2;
    const yMAC = macSpanwiseY_mm();
    const sweepAtMAC = d.wingSweepLE * (yMAC / halfSpan);
    return d.noseToWingLE + sweepAtMAC;
  }

  /**
   * Weight & balance calculation: places every mass in the aircraft
   * (electronics + structure + misc) at an assumed fuselage station,
   * then finds the balance point by summing moments (weight × station)
   * and dividing by total weight:
   *   CG = Σ(weight_i × station_i) / Σ(weight_i)
   * Recomputes live from the current electronics/material selections,
   * so swapping a heavier battery or motor genuinely shifts the result.
   * @returns {{ station_mm: number, totalWeight_g: number, points: Array<{w:number, x:number}> }}
   */
  function centerOfGravity_mm() {
    const d = PlaneData.dimensions;
    const wingLE = _wingLEStation_mm();
    const tailLE = _tailLEStation_mm();
    const rootChord = d.wingRootChord;

    const elec = electronicsWeight();
    const struct = structuralWeight();

    const points = [];
    const addPoint = (w, x) => { if (w) points.push({ w, x }); };

    // Electronics — point masses at assumed fuselage stations
    addPoint(elec.motor, CG_ASSUMED_STATIONS_MM.motor);
    addPoint(elec.esc, CG_ASSUMED_STATIONS_MM.esc);
    addPoint(elec.battery, CG_ASSUMED_STATIONS_MM.battery);
    addPoint(elec.receiver, CG_ASSUMED_STATIONS_MM.receiver);
    addPoint(elec.bec, CG_ASSUMED_STATIONS_MM.bec);
    addPoint(elec.wiring, CG_ASSUMED_STATIONS_MM.wiring);
    addPoint(elec.voltmonitor, CG_ASSUMED_STATIONS_MM.voltmonitor);
    addPoint(elec.prop, 0); // propeller disc, at the very nose

    // Servos: split across ailerons (at wing) and ruddervators (at V-tail).
    // Assumes a typical 3-servo setup (2 aileron + 1 ruddervator pair),
    // weighted 2/3 at the wing and 1/3 at the tail.
    if (elec.servos) {
      const aileronStation = wingLE + rootChord * 0.4;
      const tailServoStation = tailLE + d.vTailRootChord * 0.5;
      addPoint(elec.servos * (2 / 3), aileronStation);
      addPoint(elec.servos * (1 / 3), tailServoStation);
    }

    // Structural masses — approximate centroid of each part along the fuselage
    if (struct.breakdown.fuselage) addPoint(struct.breakdown.fuselage.weight, d.fuselageLength * 0.45);
    if (struct.breakdown.wing) addPoint(struct.breakdown.wing.weight, wingLE + rootChord * 0.4);
    if (struct.breakdown.tail) addPoint(struct.breakdown.tail.weight, tailLE + d.vTailRootChord * 0.4);
    if (struct.breakdown.mount) addPoint(struct.breakdown.mount.weight, CG_ASSUMED_STATIONS_MM.mount);

    // Misc/hardware allowance — assumed distributed near the fuselage midpoint
    addPoint(PlaneData.miscWeight, d.fuselageLength * 0.5);

    const totalW = points.reduce((sum, p) => sum + p.w, 0);
    const moment = points.reduce((sum, p) => sum + p.w * p.x, 0);
    const cgStation = totalW ? moment / totalW : 0;

    return { station_mm: cgStation, totalWeight_g: totalW, points };
  }

  /**
   * CG expressed as %MAC — the standard number used to check balance:
   *   %MAC = ( (CG_station − MAC_LE_station) / MAC_length ) × 100
   * @returns {{ percentMAC: number, macLEStation_mm: number, mac_mm: number, cgStation_mm: number }}
   */
  function centerOfGravityPercentMAC() {
    const mac = macLength_mm();
    const macLE = macLEStation_mm();
    const cg = centerOfGravity_mm().station_mm;
    const pct = mac ? ((cg - macLE) / mac) * 100 : 0;
    return { percentMAC: pct, macLEStation_mm: macLE, mac_mm: mac, cgStation_mm: cg };
  }

  /**
   * Traffic-light status for CG position.
   * green  = 25–33% MAC (standard sport-plane target band)
   * yellow = borderline (20–38% MAC)
   * red    = out of range.
   * Note: >33% (tail-heavy) is the DANGEROUS direction — it risks pitch
   * instability and stalls. <25% (nose-heavy) just flies duller/less agile.
   * @param {number} pct - percentMAC value from centerOfGravityPercentMAC()
   * @returns {'green'|'yellow'|'red'}
   */
  function cgStatus(pct) {
    if (pct >= 25 && pct <= 33) return 'green';
    if (pct >= 20 && pct <= 38) return 'yellow';
    return 'red';
  }

  /* ────────────────────────────────────────────────────────────
     COST
     ──────────────────────────────────────────────────────────── */

  function totalCost() {
    const costs = {};
    ['motor', 'esc', 'battery', 'prop', 'receiver', 'transmitter', 'bec', 'wiring', 'voltmonitor'].forEach(cat => {
      const tier = _getTier(cat, AppState.get(cat));
      costs[cat] = tier ? tier.price : 0;
    });

    const servo = _getTier('servo', AppState.get('servo'));
    costs.servos = servo ? (servo.price * (servo.qty || 3)) : 0;

    // Material costs — one entry per structural part
    const partKeys = ['fuselage', 'wing', 'tail', 'mount'];
    partKeys.forEach((pk, i) => {
      const mat = _getMaterial(AppState.get('mat_' + pk));
      costs['mat_' + pk] = mat ? mat.costPerPart[i] : 0;
    });

    // Sum of additional build/R&D items (casing, film, adhesives, paints, tools, etc.)
    const additionalSum = PlaneData.additionalBuildItems.reduce((sum, item) => sum + item.price, 0);
    costs.misc = additionalSum;
    costs.total = Object.values(costs).reduce((a, b) => a + b, 0);
    return costs;
  }

  /* ────────────────────────────────────────────────────────────
     FULL REPORT
     ──────────────────────────────────────────────────────────── */

  /**
   * Single entry point for the rest of the app: recomputes every
   * metric above from the current AppState selections and bundles
   * them into one object, ready to feed straight into stat cards,
   * gauges, and charts.
   * @returns {object} the complete engineering + cost + CG report
   */
  function fullReport() {
    const wl = wingLoading();
    const ptw = powerToWeight();
    const ttw = thrustToWeight();
    const ss = stallSpeed();
    const ar = aspectRatio();
    const ft = flightTime();
    const crc = cRatingCheck();
    const ts = topSpeed();
    const cg = centerOfGravityPercentMAC();

    return {
      wingArea_mm2: wingArea_mm2(),
      wingArea_m2: wingArea_m2(),
      wingArea_ft2: wingArea_ft2(),
      structuralWeight: structuralWeight(),
      electronicsWeight: electronicsWeight(),
      totalWeight_g: totalWeight_g(),
      wingLoading: { value: wl, unit: 'oz/ft²', status: wingLoadingStatus(wl) },
      powerToWeight: { value: ptw, unit: 'W/lb', status: powerToWeightStatus(ptw) },
      thrustToWeight: { value: ttw, unit: 'ratio', status: thrustToWeightStatus(ttw) },
      stallSpeed: { value: ss, unit: 'm/s', valueMph: ss * 2.237 },
      aspectRatio: { value: ar, label: ar > 8 ? 'High (efficient)' : ar > 5 ? 'Moderate' : 'Low (agile)' },
      flightTime: { value: ft, unit: 'min' },
      cRatingCheck: crc,
      topSpeed: ts,
      cg: { ...cg, status: cgStatus(cg.percentMAC) },
      costs: totalCost()
    };
  }

  /* ────────────────────────────────────────────────────────────
     PUBLIC API
     ──────────────────────────────────────────────────────────── */

  return {
    // geometry
    wingArea_mm2, wingArea_m2, wingArea_ft2,
    // weight
    structuralWeight, electronicsWeight, totalWeight_g,
    // performance
    wingLoading, powerToWeight, thrustToWeight,
    stallSpeed, aspectRatio, flightTime,
    cRatingCheck, topSpeed,
    // status checks
    wingLoadingStatus, powerToWeightStatus, thrustToWeightStatus,
    // center of gravity
    macLength_mm, macLEStation_mm, centerOfGravity_mm,
    centerOfGravityPercentMAC, cgStatus,
    // cost
    totalCost,
    // aggregate + internal helpers (exposed for debugging/testing)
    fullReport, _getTier, _getMaterial
  };
})();