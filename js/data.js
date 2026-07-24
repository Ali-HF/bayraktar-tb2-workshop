/* ============================================================
   Bayraktar TB2 — Component Data & Material Specs
   ============================================================
   Prices in PKR (Pakistani Rupees) — sourced from components.md
   ============================================================ */

const PlaneData = {
  name: 'Bayraktar TB2',
  currency: 'PKR',  // Pakistani Rupees

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

  /* ── Electronics Tiers (Prices in PKR) ── */
  electronics: {
    motor: {
      label: 'Motor',
      tiers: [
        { id: 'motor-custom', name: 'Brushless DC Motor',             kv: 1090, watts: 250, maxCurrent: 22, weight: 175, thrust_g: 920,  price: 14828, desc: 'Budget sheet brushless motor' },
        { id: 'motor-budget', name: 'A2212 1400KV',                   kv: 1400, watts: 180, maxCurrent: 15, weight: 48,  thrust_g: 680,  price: 1575,  desc: 'Budget brushless motor' },
        { id: 'motor-mid',    name: 'Emax GT2826-04 1090KV',          kv: 1090, watts: 250, maxCurrent: 22, weight: 175, thrust_g: 920,  price: 7200,  desc: 'Mid-range sport motor' },
        { id: 'motor-high',   name: 'SunnySky X2814 900KV',           kv: 900,  watts: 380, maxCurrent: 30, weight: 108, thrust_g: 1200, price: 10500, desc: 'Premium imported motor' }
      ]
    },
    esc: {
      label: 'ESC',
      tiers: [
        { id: 'esc-custom', name: 'Electronic Speed Controller (ESC)', currentRating: 60, weight: 63, price: 12500, desc: '60A ESC from budget sheet' },
        { id: 'esc-budget', name: 'Generic SimonK 30A',                currentRating: 30, weight: 27, price: 1900,  desc: '30A brushless ESC' },
        { id: 'esc-mid',    name: 'Hobbywing Skywalker V2 60A',        currentRating: 60, weight: 63, price: 6700,  desc: '60A ESC w/ built-in BEC' },
        { id: 'esc-high',   name: 'Hobbywing Platinum 60A Pro',        currentRating: 60, weight: 38, price: 16500, desc: '60A Pro ESC, imported' }
      ]
    },
    battery: {
      label: 'Battery (LiPo)',
      tiers: [
        { id: 'bat-custom', name: 'LiPo Battery',                capacity: 2200, cells: 3, voltage: 11.1, cRating: 30, weight: 180, price: 4800,  desc: '3S LiPo battery from budget sheet' },
        { id: 'bat-budget', name: 'Generic 3S 2200mAh 25C',      capacity: 2200, cells: 3, voltage: 11.1, cRating: 25, weight: 188, price: 3500,  desc: '3S budget LiPo pack' },
        { id: 'bat-mid',    name: '3S 2200mAh 30C',               capacity: 2200, cells: 3, voltage: 11.1, cRating: 30, weight: 180, price: 5800,  desc: '3S mid-range LiPo' },
        { id: 'bat-high',   name: 'Tattu/CNHL 3S 2200mAh 45C',      capacity: 2200, cells: 3, voltage: 11.1, cRating: 45, weight: 200, price: 7000,  desc: '3S high-C rated LiPo' }
      ]
    },
    servo: {
      label: 'Servos (×3)',
      tiers: [
        { id: 'servo-custom', name: '9g micro servos (2 active + 2 spare)', torque: 2.0, speed: 0.08, weight: 9,  price: 900,   qty: 4, desc: 'Servos set from budget sheet' },
        { id: 'servo-budget', name: 'SG90 9g Plastic Gear',                 torque: 1.8, speed: 0.10, weight: 9,  price: 400,   qty: 3, desc: '9g micro servo' },
        { id: 'servo-mid',    name: 'MG90S 9g Metal Gear',                  torque: 2.0, speed: 0.08, weight: 9,  price: 625,   qty: 3, desc: '9g metal gear servo' },
        { id: 'servo-high',   name: 'Emax ES08MA II 12g Digital',           torque: 2.2, speed: 0.06, weight: 12, price: 1500,  qty: 3, desc: '12g digital metal gear' }
      ]
    },
    prop: {
      label: 'Propeller + Adapter',
      tiers: [
        { id: 'prop-custom', name: 'Prop Saver/ Prop Adapter', diameter: 9,  pitch: 6, weight: 12, price: 4800, desc: 'Prop saver/adapter from budget sheet' },
        { id: 'prop-budget', name: 'Generic Prop Adapter',     diameter: 8,  pitch: 4, weight: 8,  price: 225,  desc: 'Universal adapter' },
        { id: 'prop-mid',    name: 'Prop Saver 28-35mm',       diameter: 9,  pitch: 6, weight: 12, price: 375,  desc: 'Prop saver mount' },
        { id: 'prop-high',   name: 'APC 10×6E + Adapter',      diameter: 10, pitch: 6, weight: 20, price: 1500, desc: 'Precision APC prop' }
      ]
    },
    receiver: {
      label: 'Receiver',
      tiers: [
        { id: 'rx-custom', name: 'RC Reciever',               channels: 6,  weight: 15, price: 11500, desc: 'RC Receiver from budget sheet' },
        { id: 'rx-budget', name: 'FlySky FS-A8S (Mini)',      channels: 6,  weight: 1,  price: 2500,  desc: '6-ch mini iBus RX' },
        { id: 'rx-mid',    name: 'FlySky FS-iA6B',            channels: 6,  weight: 15, price: 2500,  desc: '6-ch PWM/iBus RX' },
        { id: 'rx-high',   name: 'FrSky R-XSR',               channels: 16, weight: 2,  price: 6250,  desc: '16-ch SBUS + telemetry' }
      ]
    },
    transmitter: {
      label: 'Transmitter (TX)',
      tiers: [
        { id: 'tx-custom', name: 'RC Transmitter',             channels: 10, weight: 392, price: 12500, desc: 'RC Transmitter from budget sheet' },
        { id: 'tx-budget', name: 'FlySky FS-i6 (6-ch)',        channels: 6,  weight: 392, price: 12000, desc: '6-ch, often bundled w/ RX' },
        { id: 'tx-mid',    name: 'FlySky FS-i6X (10-ch)',      channels: 10, weight: 392, price: 9000,  desc: '10-ch upgraded TX' },
        { id: 'tx-high',   name: 'Radiomaster TX16S',          channels: 16, weight: 736, price: 85000, desc: 'Premium multi-protocol TX' }
      ]
    },
    bec: {
      label: 'BEC (5V Regulator)',
      tiers: [
        { id: 'bec-custom', name: 'Battey Eliminator Circuit(BEC)', weight: 0,  price: 6000,  desc: 'BEC from budget sheet' },
        { id: 'bec-budget', name: 'Standalone UBEC 5V/3A',          weight: 30, price: 1100,  desc: 'External switch-mode BEC' },
        { id: 'bec-mid',    name: 'Built-in ESC BEC (5V/3A)',       weight: 0,  price: 0,     desc: 'Included in Skywalker ESC' },
        { id: 'bec-high',   name: 'Matek BEC 5V/12V Dual',          weight: 30, price: 9000,  desc: 'Dual-output precision BEC' }
      ]
    },
    wiring: {
      label: 'Wiring & Connectors',
      tiers: [
        { id: 'wire-custom', name: 'Power Distribution / Wiring', weight: 18, price: 1000,  desc: 'Wiring from budget sheet' },
        { id: 'wire-budget', name: '16-20 AWG + Deans',           weight: 15, price: 200,   desc: 'Generic wire + Deans connector' },
        { id: 'wire-mid',    name: '14-18 AWG + XT60',            weight: 18, price: 225,   desc: 'Silicon wire + XT60 connector' },
        { id: 'wire-high',   name: '12-14 AWG + XT90',            weight: 22, price: 500,   desc: 'Heavy duty wire + XT90' }
      ]
    },
    voltmonitor: {
      label: 'Voltage Monitor',
      tiers: [
        { id: 'vmon-custom', name: 'Voltage Monitor / Alarm',      weight: 7, price: 600,   desc: 'Voltage Alarm from budget sheet' },
        { id: 'vmon-budget', name: 'Generic LiPo Alarm',           weight: 5, price: 350,   desc: 'Basic low-voltage alarm' },
        { id: 'vmon-mid',    name: '3S LiPo Alarm w/ Buzzer',      weight: 7, price: 550,   desc: 'Buzzer alarm, 2S-3S' },
        { id: 'vmon-high',   name: 'Telemetry Voltage Sensor',     weight: 5, price: 2500,  desc: 'TX display (needs FrSky)' }
      ]
    }
  },

  /* ── Materials (costs in PKR) ── */
  materials: {
    fuselage: { label: 'Fuselage', surfaceArea_cm2: 600, thickness_mm: 2 },
    wing:     { label: 'Wing',     surfaceArea_cm2: 800, thickness_mm: 1.5 },
    tail:     { label: 'V-Tail',   surfaceArea_cm2: 200, thickness_mm: 1.2 },
    mount:    { label: 'Motor Mount', surfaceArea_cm2: 40, thickness_mm: 4 }
  },

  materialOptions: [
    { id: 'foam',         name: 'EPS Foamboard',     density: 0.03,  costPerPart: [7500, 6000, 3000, 1000],  strength: 3, color: '#b8d4e3', desc: 'Very light, impact-resistant, cheap sheets' },
    { id: 'balsa',        name: 'Balsa Wood',        density: 0.16,  costPerPart: [2200, 1700, 850, 550],    strength: 2, color: '#d4b483', desc: 'Lightest wood, easy to cut' },
    { id: 'plywood',      name: 'Plywood (Birch)',   density: 0.55,  costPerPart: [1400, 1100, 550, 850],    strength: 4, color: '#8B6914', desc: 'Strong at mounts/firewall' },
    { id: 'fiberglass',   name: 'Fiberglass',        density: 1.80,  costPerPart: [4200, 3400, 1400, 1100],  strength: 7, color: '#e8e8d0', desc: 'Light-medium, very strong' },
    { id: 'carbonfiber',  name: 'Carbon Fiber',      density: 1.55,  costPerPart: [8400, 7000, 2800, 2200],  strength: 9, color: '#3a3a3a', desc: 'Best strength-to-weight ratio' }
  ],

  /** Additional build items (sum = 12,482 PKR) */
  additionalBuildItems: [
    { name: 'Adhesives & hardware (hot glue/epoxy)', price: 1000 },
    { name: 'Paint / finishing (spray cans)', price: 1000 },
    { name: 'Covering film (self-adhesive)', price: 1500 },
    { name: 'Tools & consumables (blades/sandpaper)', price: 600 },
    { name: 'Logistics & transport', price: 4000 },
    { name: 'Competition entry fees', price: 4382 }
  ],

  miscWeight: 30   // grams: glue, connectors, wiring, screws
};

/* ── Default Selections ── */
const DEFAULT_STATE = {
  // Electronics (default to custom items from sheet)
  motor:      'motor-custom',
  esc:        'esc-custom',
  battery:    'bat-custom',
  servo:      'servo-custom',
  prop:       'prop-custom',
  receiver:   'rx-custom',
  transmitter:'tx-custom',
  bec:        'bec-custom',
  wiring:     'wire-custom',
  voltmonitor:'vmon-custom',

  // Materials (all default to EPS Foamboard)
  mat_fuselage: 'foam',
  mat_wing:     'foam',
  mat_tail:     'foam',
  mat_mount:    'foam',

  // UI state
  flightCategory: 'sport',    // trainer | sport | 3d
  modelView: 'assembled',     // assembled | exploded | top | side
  airfoilChord: 'root'        // root | tip
};
