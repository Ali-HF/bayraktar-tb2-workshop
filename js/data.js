/* ============================================================
   Bayraktar TB2 — Component Data & Material Specs
   ============================================================ */

const PlaneData = {
  name: 'Bayraktar TB2',
  /* ── Aircraft Dimensions (mm) ── */
  dimensions: {
    wingspan:          1000,
    fuselageLength:    542,
    overallHeight:     183,
    wingRootChord:      60,
    wingTipChord:       40,
    wingThicknessRoot:   7.2,
    wingThicknessTip:    4.8,
    wingSweepLE:         15,
    noseToWingLE:       220,
    hTailSpan:          200,
    hTailChord:          30,
    vTailHeight:         70,
    vTailRootChord:      45,
    vTailAngle:         110,
    wingTEtoTailLE:     180,
    fuselageWidth:       45,
    fuselageHeight:      55,
    motorMountDia:       32   // midpoint 28-35
  },

  /* ── Electronics Tiers ── */
  electronics: {
    motor: {
      label: 'Motor',
      tiers: [
        { id: 'motor-budget',  name: 'Emax 2213-935KV',       kv: 935,  watts: 180, maxCurrent: 15, weight: 56, thrust_g: 680,  price: 12,  desc: 'Budget trainer motor' },
        { id: 'motor-mid',     name: 'Sunnysky 2216-1100KV',   kv: 1100, watts: 250, maxCurrent: 22, weight: 68, thrust_g: 920,  price: 22,  desc: 'Mid-range sport motor' },
        { id: 'motor-high',    name: 'T-Motor AT2317-1400KV',  kv: 1400, watts: 380, maxCurrent: 30, weight: 72, thrust_g: 1200, price: 38,  desc: 'High-performance motor' }
      ]
    },
    esc: {
      label: 'ESC',
      tiers: [
        { id: 'esc-budget', name: 'Hobbyking 20A',        currentRating: 20, weight: 18, price: 8,   desc: '20A brushless ESC' },
        { id: 'esc-mid',    name: 'Racerstar RS30A V2',   currentRating: 30, weight: 26, price: 14,  desc: '30A ESC w/ BEC' },
        { id: 'esc-high',   name: 'Hobbywing Skywalker 40A', currentRating: 40, weight: 38, price: 25, desc: '40A ESC, reliable' }
      ]
    },
    battery: {
      label: 'Battery (LiPo)',
      tiers: [
        { id: 'bat-budget', name: 'Turnigy 1300mAh 3S 25C', capacity: 1300, cells: 3, voltage: 11.1, cRating: 25, weight: 108, price: 12,  desc: 'Light 3S pack' },
        { id: 'bat-mid',    name: 'Tattu 2200mAh 3S 45C',   capacity: 2200, cells: 3, voltage: 11.1, cRating: 45, weight: 185, price: 24,  desc: 'Endurance 3S pack' },
        { id: 'bat-high',   name: 'Tattu 2200mAh 4S 45C',   capacity: 2200, cells: 4, voltage: 14.8, cRating: 45, weight: 242, price: 35,  desc: 'High-voltage 4S pack' }
      ]
    },
    servo: {
      label: 'Servos (×3)',
      tiers: [
        { id: 'servo-budget', name: 'TowerPro SG90 (9g)',     torque: 1.8, speed: 0.10, weight: 9,   price: 3,  qty: 3, desc: '9g micro servo' },
        { id: 'servo-mid',    name: 'Emax ES08MA II (12g)',    torque: 2.0, speed: 0.08, weight: 12,  price: 6,  qty: 3, desc: '12g digital servo' },
        { id: 'servo-high',   name: 'Savox SH-0257MG (17g)',  torque: 2.2, speed: 0.06, weight: 17,  price: 14, qty: 3, desc: '17g metal-gear servo' }
      ]
    },
    prop: {
      label: 'Propeller',
      tiers: [
        { id: 'prop-budget', name: 'GWS 8×4 SlowFly',       diameter: 8, pitch: 4, weight: 8,  price: 2,  desc: 'Efficient trainer prop' },
        { id: 'prop-mid',    name: 'APC 9×6 Electric',       diameter: 9, pitch: 6, weight: 12, price: 4,  desc: 'Sport all-rounder' },
        { id: 'prop-high',   name: 'APC 10×5 Thin Electric', diameter: 10, pitch: 5, weight: 14, price: 5, desc: 'High-thrust prop' }
      ]
    },
    receiver: {
      label: 'Receiver',
      tiers: [
        { id: 'rx-budget', name: 'FlySky FS-iA6B',    channels: 6,  weight: 7,  price: 14, desc: '6-ch PWM/iBus' },
        { id: 'rx-mid',    name: 'FrSky X8R',          channels: 8,  weight: 12, price: 28, desc: '8-ch SBUS + telemetry' }
      ]
    },
    fpv: {
      label: 'FPV Add-on',
      optional: true,
      tiers: [
        { id: 'fpv-none', name: 'None',                    weight: 0,  price: 0,  desc: 'No FPV' },
        { id: 'fpv-basic', name: 'Caddx Ant + VTX03S',     weight: 14, price: 35, desc: 'Basic FPV (25-200mW)' }
      ]
    }
  },

  /* ── Materials ── */
  materials: {
    fuselage: { label: 'Fuselage', surfaceArea_cm2: 600, thickness_mm: 2 },
    wing:     { label: 'Wing',     surfaceArea_cm2: 800, thickness_mm: 1.5 },
    tail:     { label: 'V-Tail',   surfaceArea_cm2: 200, thickness_mm: 1.2 },
    mount:    { label: 'Motor Mount', surfaceArea_cm2: 40, thickness_mm: 4 }
  },

  materialOptions: [
    { id: 'balsa',        name: 'Balsa Wood',        density: 0.16,  costPerPart: [8, 6, 3, 2],    strength: 2, color: '#d4b483', desc: 'Lightest wood, easy to cut' },
    { id: 'plywood',      name: 'Plywood (Birch)',   density: 0.55,  costPerPart: [5, 4, 2, 3],    strength: 4, color: '#8B6914', desc: 'Strong at mounts/firewall' },
    { id: 'foam',         name: 'EPP/EPO Foam',      density: 0.03,  costPerPart: [6, 5, 2, 1],    strength: 3, color: '#b8d4e3', desc: 'Very light, impact-resistant' },
    { id: 'fiberglass',   name: 'Fiberglass',        density: 1.80,  costPerPart: [15, 12, 5, 4],  strength: 7, color: '#e8e8d0', desc: 'Light-medium, very strong' },
    { id: 'carbonfiber',  name: 'Carbon Fiber',      density: 1.55,  costPerPart: [30, 25, 10, 8], strength: 9, color: '#3a3a3a', desc: 'Best strength-to-weight ratio' }
  ],

  /** Hardware & misc allowance */
  miscCost: 15,
  miscWeight: 30   // grams: glue, connectors, wiring, screws
};

/* ── Default Selections ── */
const DEFAULT_STATE = {
  // Electronics (tier indices: 0=budget, 1=mid, 2=high)
  motor:    'motor-budget',
  esc:      'esc-budget',
  battery:  'bat-budget',
  servo:    'servo-budget',
  prop:     'prop-budget',
  receiver: 'rx-budget',
  fpv:      'fpv-none',

  // Materials (per part)
  mat_fuselage: 'foam',
  mat_wing:     'balsa',
  mat_tail:     'balsa',
  mat_mount:    'plywood',

  // UI state
  flightCategory: 'sport',    // trainer | sport | 3d
  modelView: 'assembled',     // assembled | exploded | top | side
  airfoilChord: 'root'        // root | tip
};
