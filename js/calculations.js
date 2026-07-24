/* ============================================================
   Bayraktar TB2 — Engineering Calculations
   ============================================================
   All formulas are standard RC-aircraft engineering estimates.
   Structural weight uses surface-area × thickness × density
   approximation (clearly labeled as estimate).
   ============================================================ */

const Calc = (() => {

  const AIR_DENSITY = 1.225;  // kg/m³ at sea level
  const G_TO_OZ = 0.035274;
  const MM2_TO_FT2 = 1.07639e-5;
  const G_TO_LB = 0.00220462;
  const G_TO_KG = 0.001;
  const MM_TO_M = 0.001;
  const IN_TO_MM = 25.4;

  /* ── Helper: look up selected tier object ── */
  function _getTier(category, selectedId) {
    const cat = PlaneData.electronics[category];
    if (!cat) return null;
    return cat.tiers.find(t => t.id === selectedId) || cat.tiers[0];
  }

  function _getMaterial(matId) {
    return PlaneData.materialOptions.find(m => m.id === matId) || PlaneData.materialOptions[0];
  }

  /* ── Wing Area (trapezoid, mm²) ── */
  function wingArea_mm2() {
    const d = PlaneData.dimensions;
    return 0.5 * (d.wingRootChord + d.wingTipChord) * d.wingspan;
  }

  function wingArea_m2() { return wingArea_mm2() * 1e-6; }
  function wingArea_ft2() { return wingArea_mm2() * MM2_TO_FT2; }

  /* ── Structural Weight (estimate, grams) ── */
  function structuralWeight() {
    const parts = PlaneData.materials;
    let total = 0;
    const breakdown = {};

    ['fuselage', 'wing', 'tail', 'mount'].forEach(partKey => {
      const part = parts[partKey];
      const matId = AppState.get('mat_' + partKey);
      const mat = _getMaterial(matId);
      // volume = surfaceArea(cm²) × thickness(mm→cm) → cm³, then × density(g/cm³)
      const vol_cm3 = part.surfaceArea_cm2 * (part.thickness_mm / 10);
      const w = vol_cm3 * mat.density;
      breakdown[partKey] = { weight: w, material: mat.name };
      total += w;
    });

    return { total, breakdown };
  }

  /* ── Electronics Weight (grams) ── */
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

    const servoTotal = servo ? (servo.weight * (servo.qty || 3)) : 0;
    const motorW = motor ? motor.weight : 0;
    const escW = esc ? esc.weight : 0;
    const batteryW = battery ? battery.weight : 0;
    const propW = prop ? prop.weight : 0;
    const rxW = receiver ? receiver.weight : 0;
    const txW = transmitter ? transmitter.weight : 0;
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

  /* ── Total Weight ── */
  function totalWeight_g() {
    return structuralWeight().total + electronicsWeight().total + PlaneData.miscWeight;
  }

  /* ── Wing Loading (oz/ft²) ── */
  function wingLoading() {
    const w_oz = totalWeight_g() * G_TO_OZ;
    const s_ft2 = wingArea_ft2();
    return w_oz / s_ft2;
  }

  /* ── Power-to-Weight (W/lb) ── */
  function powerToWeight() {
    const motor = _getTier('motor', AppState.get('motor'));
    const w_lb = totalWeight_g() * G_TO_LB;
    return motor.watts / w_lb;
  }

  /* ── Thrust-to-Weight ── */
  function thrustToWeight() {
    const motor = _getTier('motor', AppState.get('motor'));
    return motor.thrust_g / totalWeight_g();
  }

  /* ── Stall Speed (m/s) ── */
  function stallSpeed(clMax) {
    clMax = clMax || 1.35;
    const w = totalWeight_g() * G_TO_KG * 9.81; // N
    const s = wingArea_m2();
    return Math.sqrt((2 * w) / (AIR_DENSITY * s * clMax));
  }

  /* ── Aspect Ratio ── */
  function aspectRatio() {
    const d = PlaneData.dimensions;
    return (d.wingspan * d.wingspan) / wingArea_mm2();
  }

  /* ── Flight Time (minutes) ── */
  function flightTime() {
    const battery = _getTier('battery', AppState.get('battery'));
    const motor = _getTier('motor', AppState.get('motor'));
    // Assume 70% throttle average
    const avgCurrent = motor.maxCurrent * 0.7;
    return (battery.capacity / (avgCurrent * 1000)) * 60 * 0.8;
  }

  /* ── Battery C-Rating Check ── */
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

  /* ── Top Speed Estimate (km/h) ── */
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

  /* ── Status Color Logic ── */
  function wingLoadingStatus(val) {
    const cat = AppState.get('flightCategory') || 'sport';
    const ranges = { trainer: [8, 15], sport: [12, 20], '3d': [20, 35] };
    const [lo, hi] = ranges[cat] || ranges.sport;
    if (val >= lo && val <= hi) return 'green';
    if (val >= lo * 0.8 && val <= hi * 1.2) return 'yellow';
    return 'red';
  }

  function powerToWeightStatus(val) {
    const cat = AppState.get('flightCategory') || 'sport';
    const ranges = { trainer: [50, 80], sport: [90, 120], '3d': [150, 200] };
    const [lo, hi] = ranges[cat] || ranges.sport;
    if (val >= lo && val <= hi) return 'green';
    if (val >= lo * 0.7 && val <= hi * 1.3) return 'yellow';
    return 'red';
  }

  function thrustToWeightStatus(val) {
    if (val >= 0.5 && val <= 1.2) return 'green';
    if (val >= 0.3 && val <= 1.5) return 'yellow';
    return 'red';
  }

  /* ============================================================
     ── Center of Gravity (CG) / Weight & Balance ──
     ============================================================
     Standard aeromodelling method:
       1. Compute the wing's Mean Aerodynamic Chord (MAC) and where
          its leading edge sits along the fuselage (accounts for sweep).
       2. Sum moments (weight × fuselage station) of every mass in the
          plane about the nose, divide by total weight → CG station.
       3. Express CG as %MAC (distance behind the MAC leading edge,
          as a fraction of MAC length) — the number builders actually
          balance against. Target band: 25–33% MAC.

     Component fuselage-station (mm from nose) placements below are
     REASONABLE ASSUMPTIONS, not measured positions — the design brief
     doesn't specify exact component siting, only overall dimensions.
     This mirrors the same "clearly labeled estimate" approach already
     used for structuralWeight(). If real component layout is known,
     update CG_ASSUMED_STATIONS_MM accordingly.
     ============================================================ */

  const CG_ASSUMED_STATIONS_MM = {
    motor: 15,   // firewall/nose-mounted
    mount: 15,   // motor mount sits with the motor
    esc: 110,   // just aft of motor, ahead of battery bay
    battery: 170,   // main battery bay, ahead of wing for balance
    receiver: 250,   // mid-fuselage, aft of battery
    bec: 250,
    voltmonitor: 170,
    wiring: 200    // distributed through fuselage; approximate midpoint
  };

  function _wingLEStation_mm() {
    return PlaneData.dimensions.noseToWingLE;
  }

  function _tailLEStation_mm() {
    const d = PlaneData.dimensions;
    // wing TE station = wing LE + root chord; tail LE = wing TE + given gap
    return d.noseToWingLE + d.wingRootChord + d.wingTEtoTailLE;
  }

  /* ── Mean Aerodynamic Chord length (mm), standard trapezoidal-wing formula ── */
  function macLength_mm() {
    const d = PlaneData.dimensions;
    const cr = d.wingRootChord, ct = d.wingTipChord;
    return (2 / 3) * (cr + ct - (cr * ct) / (cr + ct));
  }

  /* ── Spanwise station (mm from root) where the MAC occurs ── */
  function macSpanwiseY_mm() {
    const d = PlaneData.dimensions;
    const cr = d.wingRootChord, ct = d.wingTipChord;
    return (d.wingspan / 6) * (cr + 2 * ct) / (cr + ct);
  }

  /* ── Fuselage station (mm from nose) of the MAC's leading edge,
        shifted aft for sweep proportional to spanwise position ── */
  function macLEStation_mm() {
    const d = PlaneData.dimensions;
    const halfSpan = d.wingspan / 2;
    const yMAC = macSpanwiseY_mm();
    const sweepAtMAC = d.wingSweepLE * (yMAC / halfSpan);
    return d.noseToWingLE + sweepAtMAC;
  }

  /* ── Weight & Balance: sum moments of all point masses about the nose ── */
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

    // Servos: split across ailerons (at wing) and ruddervators (at V-tail)
    // — assume a typical 3-servo setup: 2 aileron + 1 ruddervator pair,
    // weighted 2/3 at the wing, 1/3 at the tail.
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

    // Misc/hardware allowance — assumed distributed near fuselage midpoint
    addPoint(PlaneData.miscWeight, d.fuselageLength * 0.5);

    const totalW = points.reduce((s, p) => s + p.w, 0);
    const moment = points.reduce((s, p) => s + p.w * p.x, 0);
    const cgStation = totalW ? moment / totalW : 0;

    return { station_mm: cgStation, totalWeight_g: totalW, points };
  }

  /* ── CG expressed as %MAC — the standard balance-point check ── */
  function centerOfGravityPercentMAC() {
    const mac = macLength_mm();
    const macLE = macLEStation_mm();
    const cg = centerOfGravity_mm().station_mm;
    const pct = mac ? ((cg - macLE) / mac) * 100 : 0;
    return { percentMAC: pct, macLEStation_mm: macLE, mac_mm: mac, cgStation_mm: cg };
  }

  /* ── Status: green = 25–33% MAC (standard sport-plane target band),
        yellow = borderline, red = out of range.
        Note: >33% (tail-heavy) is the dangerous direction — it risks
        pitch instability/stalls. <25% (nose-heavy) just flies duller. ── */
  function cgStatus(pct) {
    if (pct >= 25 && pct <= 33) return 'green';
    if (pct >= 20 && pct <= 38) return 'yellow';
    return 'red';
  }

  /* ── Total Cost ── */
  function totalCost() {
    const costs = {};
    ['motor', 'esc', 'battery', 'prop', 'receiver', 'transmitter', 'bec', 'wiring', 'voltmonitor'].forEach(cat => {
      const tier = _getTier(cat, AppState.get(cat));
      costs[cat] = tier ? tier.price : 0;
    });
    const servo = _getTier('servo', AppState.get('servo'));
    costs.servos = servo ? (servo.price * (servo.qty || 3)) : 0;

    // Material costs
    const partKeys = ['fuselage', 'wing', 'tail', 'mount'];
    partKeys.forEach((pk, i) => {
      const mat = _getMaterial(AppState.get('mat_' + pk));
      costs['mat_' + pk] = mat ? mat.costPerPart[i] : 0;
    });

    costs.misc = PlaneData.miscCost;
    costs.total = Object.values(costs).reduce((a, b) => a + b, 0);
    return costs;
  }

  /* ── Full Report ── */
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

  return {
    wingArea_mm2, wingArea_m2, wingArea_ft2,
    structuralWeight, electronicsWeight, totalWeight_g,
    wingLoading, powerToWeight, thrustToWeight,
    stallSpeed, aspectRatio, flightTime,
    cRatingCheck, topSpeed, totalCost,
    wingLoadingStatus, powerToWeightStatus, thrustToWeightStatus,
    macLength_mm, macLEStation_mm, centerOfGravity_mm,
    centerOfGravityPercentMAC, cgStatus,
    fullReport, _getTier, _getMaterial
  };
})();