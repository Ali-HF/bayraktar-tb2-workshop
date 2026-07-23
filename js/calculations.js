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
    const motor    = _getTier('motor',    AppState.get('motor'));
    const esc      = _getTier('esc',      AppState.get('esc'));
    const battery  = _getTier('battery',  AppState.get('battery'));
    const servo    = _getTier('servo',    AppState.get('servo'));
    const prop     = _getTier('prop',     AppState.get('prop'));
    const receiver = _getTier('receiver', AppState.get('receiver'));
    const fpv      = _getTier('fpv',      AppState.get('fpv'));

    const servoTotal = servo.weight * (servo.qty || 3);

    return {
      motor: motor.weight,
      esc: esc.weight,
      battery: battery.weight,
      servos: servoTotal,
      prop: prop.weight,
      receiver: receiver.weight,
      fpv: fpv ? fpv.weight : 0,
      total: motor.weight + esc.weight + battery.weight + servoTotal + prop.weight + receiver.weight + (fpv ? fpv.weight : 0)
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
    const motor   = _getTier('motor',   AppState.get('motor'));
    // Assume 70% throttle average
    const avgCurrent = motor.maxCurrent * 0.7;
    return (battery.capacity / (avgCurrent * 1000)) * 60 * 0.8;
  }

  /* ── Battery C-Rating Check ── */
  function cRatingCheck() {
    const battery = _getTier('battery', AppState.get('battery'));
    const motor   = _getTier('motor',   AppState.get('motor'));
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
    const motor   = _getTier('motor',   AppState.get('motor'));
    const battery = _getTier('battery', AppState.get('battery'));
    const prop    = _getTier('prop',    AppState.get('prop'));

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

  /* ── Total Cost ── */
  function totalCost() {
    const costs = {};
    ['motor', 'esc', 'battery', 'prop', 'receiver', 'fpv'].forEach(cat => {
      const tier = _getTier(cat, AppState.get(cat));
      costs[cat] = tier ? tier.price : 0;
    });
    const servo = _getTier('servo', AppState.get('servo'));
    costs.servos = servo.price * (servo.qty || 3);

    // Material costs
    const partKeys = ['fuselage', 'wing', 'tail', 'mount'];
    partKeys.forEach((pk, i) => {
      const mat = _getMaterial(AppState.get('mat_' + pk));
      costs['mat_' + pk] = mat.costPerPart[i];
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
    fullReport, _getTier, _getMaterial
  };
})();
