/* ============================================================
   Bayraktar TB2 — Flight Controls & Ruddervator X-Ray Sim (v5)
   ============================================================
   Fixed Issues:
   - Aileron flaps are wedge-shaped, matching wing airfoil trailing edge taper
   - Ruddervator flaps are wedge-shaped, matching V-tail fin trailing edge
   - Ailerons deflect INDEPENDENTLY in OPPOSITE directions for roll
   - Ruddervators deflect together for pitch, differentially for yaw
   - All flaps merge seamlessly with the airframe at 0° deflection
   ============================================================ */

const FlightSim3D = (() => {
  let scene, camera, renderer, controls;
  let container;

  // 3D Groups & Meshes
  let airframeGroup, electronicsGroup, wiringGroup;
  let rAileronPivot, lAileronPivot;
  let rAileronMesh, lAileronMesh;
  let rRuddervatorPivot, lRuddervatorPivot;
  let rRuddervatorMesh, lRuddervatorMesh;
  let propGroup;

  // Display Mode
  let displayMode = 'xray';

  // Master Flight Control Inputs (-1 to +1, Throttle 0 to 1)
  const input = {
    pitch: 0,
    roll: 0,
    yaw: 0,
    throttle: 0.4
  };

  // Surface Deflection Angles (-25° to +25°)
  const angles = {
    rAileron: 0,
    lAileron: 0,
    rRuddervator: 0,
    lRuddervator: 0
  };

  let manualOverride = false;
  const S = 0.01;

  function init(containerId) {
    container = document.getElementById(containerId);
    if (!container) return;
    if (container.querySelector('canvas')) return;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1e1e1e);

    const aspect = container.clientWidth / container.clientHeight;
    camera = new THREE.PerspectiveCamera(30, aspect, 0.1, 100);
    camera.position.set(5.5, 3.5, 6.5);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0x555555, 0.8));
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.9);
    keyLight.position.set(6, 10, 6);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0xe8a87c, 0.8);
    rimLight.position.set(-5, 2, -6);
    scene.add(rimLight);
    scene.add(new THREE.HemisphereLight(0x445566, 0x222222, 0.4));

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, 0, 0);

    // ═══ Blender-style Grid Floor ═══
    addBlenderGrid(scene);

    buildModel();
    setupKeyboardListeners();
    setDisplayMode(displayMode);

    window.addEventListener('resize', onResize);
    animate();
  }

  function buildModel() {
    const d = PlaneData.dimensions;

    const span = d.wingspan * S;
    const fuseW = d.fuselageWidth * S;
    const fuseH = d.fuselageHeight * S;
    const rootC = d.wingRootChord * S;
    const tipC = d.wingTipChord * S;
    const vTailC = d.vTailRootChord * S;
    const vTailAngle = d.vTailAngle;
    const noseToWingLE = d.noseToWingLE * S;
    const totalLen = d.fuselageLength * S;

    const noseX = 2.40;
    const wingX = noseX - noseToWingLE;
    const podTailX = -0.80;
    const rearX = noseX - totalLen;
    const halfSpan = span / 2;
    const dihedralRad = (2.5 * Math.PI) / 180;
    const wingThick = d.wingThicknessRoot * S;

    // Wing geometry constants
    const wingDepth = halfSpan - fuseW * 0.4; // Spanwise length of one wing panel
    const mainChordFrac = 0.75;               // Main wing body = 75% of chord
    const aileronChordFrac = 0.25;            // Aileron = remaining 25% of chord
    const aileronStartFrac = 0.4;             // Aileron starts at 40% span
    const aileronEndFrac = 1.0;               // Aileron ends at wingtip

    const mainChord = rootC * mainChordFrac;
    const aileronChord = rootC * aileronChordFrac;
    const aileronSpanStart = wingDepth * aileronStartFrac;
    const aileronSpanLen = wingDepth * (aileronEndFrac - aileronStartFrac);
    const teX = wingX - mainChord; // Trailing edge X of main wing body (hinge line)

    // V-tail constants
    const boomSpacing = 1.0;
    const halfAngle = (vTailAngle / 2) * (Math.PI / 180); // 55°
    const finTiltAngle = Math.PI / 2 - halfAngle;          // 35° from horizontal
    const finLen = boomSpacing / Math.sin(finTiltAngle);
    const apexY = -0.05 + finLen * Math.cos(finTiltAngle);

    const finMainChordFrac = 0.75;
    const ruddervatorChordFrac = 0.25;
    const finMainChord = vTailC * finMainChordFrac;
    const ruddervatorChord = vTailC * ruddervatorChordFrac;

    airframeGroup = new THREE.Group();
    electronicsGroup = new THREE.Group();
    wiringGroup = new THREE.Group();

    // ═══════════════════════════════════════════════════
    // AIRFRAME MATERIALS
    // ═══════════════════════════════════════════════════
    const airframeMat = new THREE.MeshStandardMaterial({
      color: 0x4a5568, roughness: 0.4, metalness: 0.2, flatShading: true,
      transparent: true, opacity: 0.35, depthWrite: false
    });

    const controlMat = new THREE.MeshStandardMaterial({
      color: 0xe74c3c, roughness: 0.3, metalness: 0.2, flatShading: true
    });

    // ═══════════════════════════════════════════════════
    // 1. CENTRAL FUSELAGE POD
    // ═══════════════════════════════════════════════════
    const podLen = noseX - podTailX;
    const podGeo = new THREE.CylinderGeometry(fuseW * 0.35, fuseW * 0.48, podLen, 10, 8);
    podGeo.rotateZ(Math.PI / 2);
    const pPos = podGeo.attributes.position;
    for (let i = 0; i < pPos.count; i++) {
      const x = pPos.getX(i);
      const frac = (x + podLen / 2) / podLen;
      let scaleY = 1.0, scaleZ = 1.0;
      if (frac > 0.7) {
        const nt = (frac - 0.7) / 0.3;
        scaleY = Math.cos(nt * Math.PI * 0.5) * 0.9 + 0.1;
        scaleZ = scaleY;
      } else if (frac < 0.25) {
        const rt = (0.25 - frac) / 0.25;
        scaleY = 1.0 - rt * 0.35;
        scaleZ = scaleY;
      }
      pPos.setY(i, pPos.getY(i) * scaleY * (fuseH / fuseW));
      pPos.setZ(i, pPos.getZ(i) * scaleZ);
    }
    podGeo.computeVertexNormals();
    const podMesh = new THREE.Mesh(podGeo, airframeMat);
    podMesh.position.set((noseX + podTailX) / 2, 0, 0);
    addEdges(podMesh);
    airframeGroup.add(podMesh);

    // ═══════════════════════════════════════════════════
    // 2. MAIN WING BODY (75% chord, LE forward, TE backward)
    // ═══════════════════════════════════════════════════
    function createMainWingGeo() {
      const shape = new THREE.Shape();
      const c = mainChord;
      const t = wingThick;
      // Airfoil cross-section: LE at (0,0), TE at (-c, 0)
      shape.moveTo(0, 0);
      shape.lineTo(-c * 0.25, t * 0.8);
      shape.lineTo(-c * 0.55, t);
      shape.lineTo(-c, t * 0.15);        // TE upper surface — thin wedge
      shape.lineTo(-c, -t * 0.05);       // TE lower surface
      shape.lineTo(-c * 0.5, -t * 0.25);
      shape.closePath();

      const geo = new THREE.ExtrudeGeometry(shape, { steps: 6, depth: wingDepth, bevelEnabled: false });
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const z = pos.getZ(i);
        const frac = z / wingDepth;
        const scale = 1 - frac * (1 - tipC / rootC);
        pos.setX(i, pos.getX(i) * scale);
        pos.setY(i, pos.getY(i) * scale);
      }
      geo.computeVertexNormals();
      return geo;
    }

    const rWing = new THREE.Mesh(createMainWingGeo(), airframeMat);
    rWing.position.set(wingX, 0, fuseW * 0.4);
    rWing.rotation.x = -dihedralRad;
    addEdges(rWing);
    airframeGroup.add(rWing);

    const lWing = new THREE.Mesh(createMainWingGeo(), airframeMat);
    lWing.position.set(wingX, 0, -fuseW * 0.4);
    lWing.scale.z = -1;
    lWing.rotation.x = dihedralRad;
    addEdges(lWing);
    airframeGroup.add(lWing);

    // ═══════════════════════════════════════════════════
    // 3. AILERON FLAPS (Wedge-shaped, matching trailing edge profile)
    //    Hinge line at X = teX, spanning outer 60% of wing
    // ═══════════════════════════════════════════════════

    // Create wedge-shaped aileron geometry that matches the wing TE cross-section
    function createAileronGeo(spanLen) {
      const shape = new THREE.Shape();
      const c = aileronChord;
      const tHinge = wingThick * 0.15; // Thickness at hinge line (matches wing TE)
      const tTip = wingThick * 0.02;   // Very thin trailing edge

      // Wedge cross-section: hinge at X=0, TE at X=-c
      shape.moveTo(0, tHinge / 2);     // Upper hinge
      shape.lineTo(-c, tTip / 2);      // Upper TE
      shape.lineTo(-c, -tTip / 2);     // Lower TE
      shape.lineTo(0, -tHinge / 2);    // Lower hinge
      shape.closePath();

      const geo = new THREE.ExtrudeGeometry(shape, { steps: 4, depth: spanLen, bevelEnabled: false });

      // Apply taper matching wing taper at aileron span positions
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const z = pos.getZ(i);
        const spanFrac = z / spanLen;
        const globalSpanFrac = aileronStartFrac + spanFrac * (aileronEndFrac - aileronStartFrac);
        const taperScale = 1 - globalSpanFrac * (1 - tipC / rootC);
        pos.setX(i, pos.getX(i) * taperScale);
        pos.setY(i, pos.getY(i) * taperScale);
      }
      geo.computeVertexNormals();
      return geo;
    }

    // Right Aileron — hinge at trailing edge, spanning +Z outward
    rAileronPivot = new THREE.Group();
    rAileronPivot.position.set(teX, wingThick * 0.05, fuseW * 0.4 + aileronSpanStart);
    rAileronPivot.rotation.x = -dihedralRad;

    rAileronMesh = new THREE.Mesh(createAileronGeo(aileronSpanLen), controlMat);
    rAileronMesh.userData = { name: 'Right Aileron (Roll)' };
    addEdges(rAileronMesh, 0.4);
    rAileronPivot.add(rAileronMesh);
    airframeGroup.add(rAileronPivot);

    // Left Aileron — hinge at trailing edge, spanning -Z outward
    lAileronPivot = new THREE.Group();
    lAileronPivot.position.set(teX, wingThick * 0.05, -(fuseW * 0.4 + aileronSpanStart));
    lAileronPivot.rotation.x = dihedralRad;

    const lAileronGeo = createAileronGeo(aileronSpanLen);
    // Mirror the geometry to extend in -Z
    const lPos = lAileronGeo.attributes.position;
    for (let i = 0; i < lPos.count; i++) {
      lPos.setZ(i, -lPos.getZ(i));
    }
    lAileronGeo.computeVertexNormals();

    lAileronMesh = new THREE.Mesh(lAileronGeo, controlMat.clone());
    lAileronMesh.userData = { name: 'Left Aileron (Roll)' };
    addEdges(lAileronMesh, 0.4);
    lAileronPivot.add(lAileronMesh);
    airframeGroup.add(lAileronPivot);

    // ═══════════════════════════════════════════════════
    // 4. TWIN TAIL BOOMS
    // ═══════════════════════════════════════════════════
    const boomStartX = wingX - rootC * 0.2;
    const boomLen = boomStartX - rearX;
    const boomGeo = new THREE.CylinderGeometry(0.055, 0.035, boomLen, 6, 4);
    boomGeo.rotateZ(Math.PI / 2);

    const rBoom = new THREE.Mesh(boomGeo, airframeMat);
    rBoom.position.set((boomStartX + rearX) / 2, -0.05, boomSpacing);
    addEdges(rBoom);
    airframeGroup.add(rBoom);

    const lBoom = new THREE.Mesh(boomGeo.clone(), airframeMat);
    lBoom.position.set((boomStartX + rearX) / 2, -0.05, -boomSpacing);
    addEdges(lBoom);
    airframeGroup.add(lBoom);

    // ═══════════════════════════════════════════════════
    // 5. FIXED V-TAIL FINS (75% chord) & RUDDERVATOR FLAPS (25% chord)
    // ═══════════════════════════════════════════════════
    function createFixedFinGeo() {
      const shape = new THREE.Shape();
      const c = finMainChord;
      const h = finLen;
      // Leading Edge starts at (0,0), Trailing Edge at (c,0)
      shape.moveTo(0, 0);
      shape.lineTo(c, 0);
      shape.lineTo(c * 0.4, h); // meets at apex tip
      shape.lineTo(c * 0.1, h);
      shape.closePath();
      return new THREE.ExtrudeGeometry(shape, { depth: 0.018, bevelEnabled: false });
    }

    const rFin = new THREE.Mesh(createFixedFinGeo(), airframeMat);
    rFin.position.set(rearX, -0.05, boomSpacing);
    rFin.rotation.x = -finTiltAngle;
    addEdges(rFin);
    airframeGroup.add(rFin);

    const lFin = new THREE.Mesh(createFixedFinGeo(), airframeMat);
    lFin.position.set(rearX, -0.05, -boomSpacing);
    lFin.rotation.x = finTiltAngle;
    lFin.scale.z = -1;
    addEdges(lFin);
    airframeGroup.add(lFin);

    // Ruddervator flap geometry — wedge matching fin trailing edge (length along Y, thin depth along Z)
    // Defined counter-clockwise to ensure correct geometry normals/orientation in Three.js
    function createRuddervatorGeo() {
      const shape = new THREE.Shape();
      const c = ruddervatorChord;
      const h = finLen * 0.95;

      shape.moveTo(0, h);
      shape.lineTo(-c * 0.8, h);
      shape.lineTo(-c, 0);
      shape.lineTo(0, 0);
      shape.closePath();

      return new THREE.ExtrudeGeometry(shape, { depth: 0.012, bevelEnabled: false });
    }

    // Right Ruddervator — pivot positioned at the trailing edge (rearX)
    rRuddervatorPivot = new THREE.Group();
    rRuddervatorPivot.position.set(rearX, -0.05, boomSpacing);
    rRuddervatorPivot.rotation.x = -finTiltAngle; // Tilted matching the right fin

    rRuddervatorMesh = new THREE.Mesh(createRuddervatorGeo(), controlMat.clone());
    rRuddervatorMesh.userData = { name: 'Right Ruddervator (Pitch/Yaw)' };
    addEdges(rRuddervatorMesh, 0.4);
    rRuddervatorPivot.add(rRuddervatorMesh);
    airframeGroup.add(rRuddervatorPivot);

    // Left Ruddervator — mirrored matching lFin exactly
    lRuddervatorPivot = new THREE.Group();
    lRuddervatorPivot.position.set(rearX, -0.05, -boomSpacing);
    lRuddervatorPivot.rotation.x = finTiltAngle; // Tilted matching the left fin
    lRuddervatorPivot.scale.z = -1; // Mirror Z axis exactly like lFin

    lRuddervatorMesh = new THREE.Mesh(createRuddervatorGeo(), controlMat.clone());
    lRuddervatorMesh.userData = { name: 'Left Ruddervator (Pitch/Yaw)' };
    addEdges(lRuddervatorMesh, 0.4);
    lRuddervatorPivot.add(lRuddervatorMesh);
    airframeGroup.add(lRuddervatorPivot);

    scene.add(airframeGroup);

    // ═══════════════════════════════════════════════════
    // 6. PUSHER PROPELLER
    // ═══════════════════════════════════════════════════
    propGroup = new THREE.Group();
    const propMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.3, flatShading: true });
    const spinner = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.12, 8), propMat);
    spinner.rotateZ(-Math.PI / 2);
    spinner.position.set(podTailX - 0.18, 0, 0);
    propGroup.add(spinner);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.015, 1.1, 0.04), propMat);
    blade.position.set(podTailX - 0.16, 0, 0);
    propGroup.add(blade);
    scene.add(propGroup);

    // ═══════════════════════════════════════════════════
    // 7. INTERNAL ELECTRONICS
    // ═══════════════════════════════════════════════════
    const mkElec = (geo, color, pos, name, info) => {
      const mat = new THREE.MeshStandardMaterial({ color, metalness: 0.5, roughness: 0.3, flatShading: true });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(pos[0], pos[1], pos[2]);
      mesh.userData = { name, info };
      addEdges(mesh, 0.5);
      electronicsGroup.add(mesh);
    };

    const motorGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.16, 12);
    motorGeo.rotateZ(Math.PI / 2);
    mkElec(motorGeo, 0x333333, [podTailX - 0.05, 0, 0], 'Brushless Motor', '180W Pusher');
    mkElec(new THREE.BoxGeometry(0.25, 0.08, 0.18), 0x3498db, [podTailX + 0.3, -0.05, 0], 'ESC (30A)', '3S LiPo Compatible');
    mkElec(new THREE.BoxGeometry(0.55, 0.18, 0.24), 0x2ecc71, [0.15, -0.05, 0], '3S LiPo Battery', '1300mAh 11.1V');
    mkElec(new THREE.BoxGeometry(0.22, 0.06, 0.22), 0x9b59b6, [0.8, 0.05, 0], 'Flight Controller', '6-ch Receiver');
    mkElec(new THREE.BoxGeometry(0.12, 0.1, 0.08), 0xf1c40f, [wingX - rootC * 0.4, 0, 1.8], 'R Aileron Servo', '9g 1.8kg·cm');
    mkElec(new THREE.BoxGeometry(0.12, 0.1, 0.08), 0xf1c40f, [wingX - rootC * 0.4, 0, -1.8], 'L Aileron Servo', '9g 1.8kg·cm');
    mkElec(new THREE.BoxGeometry(0.12, 0.1, 0.08), 0xf1c40f, [-0.6, -0.05, 0.9], 'R Ruddervator Servo', 'V-tail');
    mkElec(new THREE.BoxGeometry(0.12, 0.1, 0.08), 0xf1c40f, [-0.6, -0.05, -0.9], 'L Ruddervator Servo', 'V-tail');
    mkElec(new THREE.SphereGeometry(0.11, 8, 6), 0x1abc9c, [1.9, -0.3, 0], 'EO/IR Camera Turret', 'Optical Payload');

    scene.add(electronicsGroup);

    // Wiring
    const wireMat = new THREE.LineBasicMaterial({ color: 0x1abc9c, linewidth: 2 });
    const powerMat = new THREE.LineBasicMaterial({ color: 0xe74c3c, linewidth: 2 });

    const addWire = (pts, mat) => {
      wiringGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat));
    };
    addWire([new THREE.Vector3(0.15, -0.05, 0), new THREE.Vector3(-0.4, -0.05, 0)], powerMat);
    addWire([new THREE.Vector3(-0.4, -0.05, 0), new THREE.Vector3(-0.85, 0, 0)], powerMat);
    addWire([new THREE.Vector3(0.8, 0.05, 0), new THREE.Vector3(0.2, 0.05, 0), new THREE.Vector3(wingX - rootC * 0.4, 0, 1.8)], wireMat);
    addWire([new THREE.Vector3(0.8, 0.05, 0), new THREE.Vector3(0.2, 0.05, 0), new THREE.Vector3(wingX - rootC * 0.4, 0, -1.8)], wireMat);

    scene.add(wiringGroup);
  }

  function addEdges(mesh, opacity) {
    mesh.add(new THREE.LineSegments(
      new THREE.EdgesGeometry(mesh.geometry, 20),
      new THREE.LineBasicMaterial({ color: 0x888888, transparent: true, opacity: opacity || 0.3 })
    ));
  }

  /* ────────────────────────────────────────────────────────────
     KEYBOARD INPUT
     ──────────────────────────────────────────────────────────── */

  const keysPressed = {};

  function setupKeyboardListeners() {
    window.addEventListener('keydown', (e) => {
      if (!document.getElementById('page-flight-sim').classList.contains('page-active')) return;
      keysPressed[e.key.toLowerCase()] = true;
      manualOverride = false;
    });
    window.addEventListener('keyup', (e) => {
      keysPressed[e.key.toLowerCase()] = false;
    });
  }

  /* ────────────────────────────────────────────────────────────
     FLIGHT COMPUTER MIXING & SURFACE DEFLECTION
     ──────────────────────────────────────────────────────────── */

  function updateControlInputs() {
    const maxDeg = 25;

    if (!manualOverride) {
      const step = 0.08;
      const decay = 0.1;

      if (keysPressed['w'] || keysPressed['arrowup']) input.pitch = Math.min(1, input.pitch + step);
      else if (keysPressed['s'] || keysPressed['arrowdown']) input.pitch = Math.max(-1, input.pitch - step);
      else input.pitch *= (1 - decay);

      if (keysPressed['d'] || keysPressed['arrowright']) input.roll = Math.min(1, input.roll + step);
      else if (keysPressed['a'] || keysPressed['arrowleft']) input.roll = Math.max(-1, input.roll - step);
      else input.roll *= (1 - decay);

      if (keysPressed['e']) input.yaw = Math.min(1, input.yaw + step);
      else if (keysPressed['q']) input.yaw = Math.max(-1, input.yaw - step);
      else input.yaw *= (1 - decay);

      if (keysPressed['r'] || keysPressed['shift']) input.throttle = Math.min(1, input.throttle + 0.02);
      if (keysPressed['f'] || keysPressed['control']) input.throttle = Math.max(0, input.throttle - 0.02);

      // ──── SURFACE MIXING ────
      // Roll: Right Aileron UP (+), Left Aileron DOWN (-)
      angles.rAileron = input.roll * maxDeg;
      angles.lAileron = -input.roll * maxDeg;

      // Pitch + Yaw → Ruddervators (Reversed Pitch and Yaw sign conventions)
      angles.rRuddervator = (-input.pitch - input.yaw) * maxDeg;
      angles.lRuddervator = (-input.pitch + input.yaw) * maxDeg;

      // Clamp
      const clamp = (v) => Math.max(-maxDeg, Math.min(maxDeg, v));
      angles.rAileron = clamp(angles.rAileron);
      angles.lAileron = clamp(angles.lAileron);
      angles.rRuddervator = clamp(angles.rRuddervator);
      angles.lRuddervator = clamp(angles.lRuddervator);
    }

    // ──── APPLY DEFLECTIONS ────
    // Rotation axis = local Z (spanwise hinge line)
    // For our wedge geometry: -X is trailing edge.
    // Positive Z rotation = trailing edge moves DOWN (right-hand rule: +X → +Y, so -X → -Y)
    // We want: positive angle = trailing edge UP = NEGATIVE Z rotation.

    // Right aileron: positive angle = TE up = negative Z rotation
    if (rAileronMesh) {
      rAileronMesh.rotation.z = THREE.MathUtils.degToRad(-angles.rAileron);
    }
    // Left aileron: mirrored geometry, so SAME sign convention needed
    // -angles.lAileron ensures opposite visual deflection from right aileron
    if (lAileronMesh) {
      lAileronMesh.rotation.z = THREE.MathUtils.degToRad(-angles.lAileron);
    }

    // Right ruddervator: positive angle = TE up = positive Y rotation in local space
    if (rRuddervatorMesh) {
      rRuddervatorMesh.rotation.y = THREE.MathUtils.degToRad(angles.rRuddervator);
    }
    // Left ruddervator: mirrored geometry along Z-axis, so positive angle = TE up = negative Y rotation
    if (lRuddervatorMesh) {
      lRuddervatorMesh.rotation.y = THREE.MathUtils.degToRad(-angles.lRuddervator);
    }

    // Propeller
    if (propGroup) propGroup.rotation.x += input.throttle * 0.4;

    updateUI();
  }

  function updateUI() {
    const set = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
    set('sim-r-aileron', angles.rAileron.toFixed(1) + '°');
    set('sim-l-aileron', angles.lAileron.toFixed(1) + '°');
    set('sim-r-ruddervator', angles.rRuddervator.toFixed(1) + '°');
    set('sim-l-ruddervator', angles.lRuddervator.toFixed(1) + '°');
    set('sim-throttle-val', Math.round(input.throttle * 100) + '%');

    const setSlider = (id, val) => { const s = document.getElementById(id); if (s && document.activeElement !== s) s.value = val; };
    setSlider('slider-r-aileron', angles.rAileron);
    setSlider('slider-l-aileron', angles.lAileron);
    setSlider('slider-r-ruddervator', angles.rRuddervator);
    setSlider('slider-l-ruddervator', angles.lRuddervator);

    const horizon = document.getElementById('attitude-horizon');
    if (horizon) {
      horizon.style.transform = `translateY(${input.pitch * 20}px) rotate(${-input.roll * 30}deg)`;
    }
  }

  /* ────────────────────────────────────────────────────────────
     DISPLAY MODES
     ──────────────────────────────────────────────────────────── */

  let labelGroup = new THREE.Group();

  function setDisplayMode(mode) {
    displayMode = mode;

    // Clear existing labels
    while (labelGroup.children.length > 0) {
      labelGroup.remove(labelGroup.children[0]);
    }
    scene.remove(labelGroup);
    labelGroup = new THREE.Group();

    const isLabelMode = (mode === 'label');
    const visualMode = isLabelMode ? 'xray' : mode;

    airframeGroup.traverse(child => {
      if (child.isMesh) {
        if (visualMode === 'solid') {
          child.material.opacity = 1.0; child.material.transparent = false;
          child.material.depthWrite = true; child.material.wireframe = false;
        } else if (visualMode === 'xray') {
          child.material.opacity = 0.25; child.material.transparent = true;
          child.material.depthWrite = false; child.material.wireframe = false;
        } else {
          child.material.opacity = 0.08; child.material.transparent = true;
          child.material.depthWrite = false; child.material.wireframe = true;
        }
      }
    });

    electronicsGroup.traverse(child => {
      if (child.isMesh) {
        child.material.opacity = visualMode === 'solid' ? 0.7 : 1.0;

        // If label mode, create a floating 3D text label above the component
        if (isLabelMode && child.userData && child.userData.name) {
          const sprite = createLabelSprite(child.userData.name, child.position.x, child.position.y + 0.3, child.position.z);
          labelGroup.add(sprite);
        }
      }
    });

    if (isLabelMode) {
      // 1. Center of Gravity (CG) Arrow (yellow, pointing down at CG)
      // Position is computed from actual weight & balance (Calc.centerOfGravity_mm),
      // not a fixed guess — it shifts when electronics/materials selections change.
      const d = PlaneData.dimensions;
      const noseX = 2.40; // must match buildModel()'s noseX
      const cgStationMM = Calc.centerOfGravity_mm().station_mm;
      const cgX = noseX - (cgStationMM * S);
      const cgPct = Calc.centerOfGravityPercentMAC().percentMAC;
      const cgColor = { green: 0x2ecc71, yellow: 0xf1c40f, red: 0xe74c3c }[Calc.cgStatus(cgPct)];

      const cgOrigin = new THREE.Vector3(cgX, -0.05, 0);
      const cgDir = new THREE.Vector3(0, -1, 0);
      const cgArrow = new THREE.ArrowHelper(cgDir, cgOrigin, 0.45, cgColor, 0.12, 0.08);
      labelGroup.add(cgArrow);
      labelGroup.add(createLabelSprite(
        `Center of Gravity — ${cgPct.toFixed(1)}% MAC`, cgX, 0.48, 0
      ));

      // 2. Thrust Arrow (red, pointing backward from propeller)
      const thrustOrigin = new THREE.Vector3(-0.96, 0, 0);
      const thrustDir = new THREE.Vector3(-1, 0, 0);
      const thrustArrow = new THREE.ArrowHelper(thrustDir, thrustOrigin, 0.55, 0xe74c3c, 0.12, 0.08);
      labelGroup.add(thrustArrow);
      labelGroup.add(createLabelSprite('Thrust Force', -1.35, 0.25, 0));

      // 3. Lift Arrow (blue, pointing upward from wing center)
      const liftOrigin = new THREE.Vector3(0.20, 0.05, 0);
      const liftDir = new THREE.Vector3(0, 1, 0);
      const liftArrow = new THREE.ArrowHelper(liftDir, liftOrigin, 0.55, 0x3498db, 0.12, 0.08);
      labelGroup.add(liftArrow);
      labelGroup.add(createLabelSprite('Lift Force', 0.20, 0.70, 0));

      scene.add(labelGroup);
    }
  }

  function createLabelSprite(text, x, y, z) {
    const canvas = document.createElement('canvas');
    canvas.width = 380;
    canvas.height = 48;
    const ctx = canvas.getContext('2d');

    // Transparent dark background panel
    ctx.fillStyle = 'rgba(26, 26, 26, 0.85)';
    ctx.roundRect(0, 0, 380, 48, 8);
    ctx.fill();
    ctx.strokeStyle = '#e8a87c';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Text style
    ctx.font = 'bold 18px Inter, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 190, 24);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.position.set(x, y, z);
    sprite.scale.set(1.2, 0.16, 1);
    return sprite;
  }

  function setIndividualSurface(surface, degVal) {
    manualOverride = true;
    if (surface in angles) angles[surface] = parseFloat(degVal);
  }

  function setMasterInput(type, val) {
    manualOverride = false;
    if (type in input) input[type] = parseFloat(val);
  }

  function resetControls() {
    manualOverride = false;
    input.pitch = input.roll = input.yaw = 0;
    input.throttle = 0.4;
    angles.rAileron = angles.lAileron = angles.rRuddervator = angles.lRuddervator = 0;
  }

  function onResize() {
    if (!container) return;
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  }

  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    if (document.getElementById('page-flight-sim')?.classList.contains('page-active')) {
      updateControlInputs();
    }

    renderer.render(scene, camera);
  }

  return { init, setDisplayMode, setMasterInput, setIndividualSurface, resetControls, input, angles };
})();