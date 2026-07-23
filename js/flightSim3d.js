/* ============================================================
   Bayraktar TB2 — Flight Controls & Ruddervator X-Ray Sim (v4)
   ============================================================
   Bulletproof Flap Hinge Physics & Surface Geometry:
   - Ailerons placed strictly on outer trailing edge of wings
   - Ruddervators placed strictly on trailing edge of V-tail fins
   - Hinge line at origin (0,0,0) of each flap pivot group
   - Deflection rotates around local Z-axis (hinge line) so flaps pivot UP/DOWN
   - Flight Computer Surface Mixing (Roll, Pitch, Yaw, Throttle)
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

  // Display Mode: 'solid' | 'xray' | 'electronics'
  let displayMode = 'xray';

  // Master Flight Control Inputs (-1 to +1, Throttle 0 to 1)
  const input = {
    pitch: 0,    // Elevator: Both ruddervators up/down together
    roll: 0,     // Aileron: Right up / Left down (opposite)
    yaw: 0,      // Rudder: Ruddervators differential deflection
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
  const S = 0.01; // 1mm = 0.01 units

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
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    container.appendChild(renderer.domElement);

    // Lighting
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

    buildModel();
    setupKeyboardListeners();
    setDisplayMode(displayMode);

    window.addEventListener('resize', onResize);
    animate();
  }

  function buildModel() {
    const d = PlaneData.dimensions;

    const span = d.wingspan * S;             // 10.0
    const totalLen = d.fuselageLength * S;   // 5.42
    const fuseW = d.fuselageWidth * S;       // 0.45
    const fuseH = d.fuselageHeight * S;      // 0.55
    const rootC = d.wingRootChord * S;       // 0.60
    const tipC = d.wingTipChord * S;         // 0.40
    const vTailH = d.vTailHeight * S;        // 0.70
    const vTailC = d.vTailRootChord * S;     // 0.45
    const vTailAngle = d.vTailAngle;         // 110°
    const noseToWingLE = d.noseToWingLE * S; // 2.20

    const noseX = 2.40;
    const wingX = noseX - noseToWingLE; // +0.20 (Leading Edge position)
    const podTailX = -0.80;
    const rearX = noseX - totalLen;     // -3.02
    const halfSpan = span / 2;          // 5.0
    const dihedralRad = (2.5 * Math.PI) / 180;

    airframeGroup = new THREE.Group();
    electronicsGroup = new THREE.Group();
    wiringGroup = new THREE.Group();

    // ═══════════════════════════════════════════════════
    // 1. AIRFRAME (Pod, Main Wings, Booms, Fixed Fins)
    // ═══════════════════════════════════════════════════
    const airframeMat = new THREE.MeshStandardMaterial({
      color: 0x4a5568,
      roughness: 0.4,
      metalness: 0.2,
      flatShading: true,
      transparent: true,
      opacity: 0.35,
      depthWrite: false
    });

    // Central Fuselage Pod
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
        scaleZ = Math.cos(nt * Math.PI * 0.5) * 0.9 + 0.1;
      } else if (frac < 0.25) {
        const rt = (0.25 - frac) / 0.25;
        scaleY = 1.0 - rt * 0.35;
        scaleZ = 1.0 - rt * 0.35;
      }
      pPos.setY(i, pPos.getY(i) * scaleY * (fuseH / fuseW));
      pPos.setZ(i, pPos.getZ(i) * scaleZ);
    }
    podGeo.computeVertexNormals();

    const podMesh = new THREE.Mesh(podGeo, airframeMat);
    podMesh.position.set((noseX + podTailX) / 2, 0, 0);
    addWireframeEdges(podMesh);
    airframeGroup.add(podMesh);

    // Main Wing Body (75% chord, LE at X=0, TE at -c*0.75)
    function createWingMainGeo() {
      const shape = new THREE.Shape();
      const c = rootC * 0.75;
      const t = d.wingThicknessRoot * S;
      shape.moveTo(0, 0);
      shape.lineTo(-c * 0.2, t * 0.8);
      shape.lineTo(-c * 0.5, t);
      shape.lineTo(-c, 0);
      shape.lineTo(-c * 0.4, -t * 0.25);
      shape.closePath();

      const extrudeSettings = { steps: 6, depth: halfSpan - fuseW * 0.4, bevelEnabled: false };
      const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      const pos = geo.attributes.position;
      const depth = halfSpan - fuseW * 0.4;
      for (let i = 0; i < pos.count; i++) {
        const z = pos.getZ(i);
        const frac = z / depth;
        const scale = 1 - frac * (1 - tipC / rootC);
        pos.setX(i, pos.getX(i) * scale);
        pos.setY(i, pos.getY(i) * scale);
      }
      geo.computeVertexNormals();
      return geo;
    }

    const rWingMesh = new THREE.Mesh(createWingMainGeo(), airframeMat);
    rWingMesh.position.set(wingX, 0, fuseW * 0.4);
    rWingMesh.rotation.x = -dihedralRad;
    addWireframeEdges(rWingMesh);
    airframeGroup.add(rWingMesh);

    const lWingMesh = new THREE.Mesh(createWingMainGeo(), airframeMat);
    lWingMesh.position.set(wingX, 0, -fuseW * 0.4);
    lWingMesh.scale.z = -1;
    lWingMesh.rotation.x = dihedralRad;
    addWireframeEdges(lWingMesh);
    airframeGroup.add(lWingMesh);

    // Twin Tail Booms
    const boomSpacing = 1.0;
    const boomStartX = wingX - rootC * 0.2;
    const boomLen = boomStartX - rearX;
    const boomGeo = new THREE.CylinderGeometry(0.055, 0.035, boomLen, 6, 4);
    boomGeo.rotateZ(Math.PI / 2);

    const rBoom = new THREE.Mesh(boomGeo, airframeMat);
    rBoom.position.set((boomStartX + rearX) / 2, -0.05, boomSpacing);
    addWireframeEdges(rBoom);
    airframeGroup.add(rBoom);

    const lBoom = new THREE.Mesh(boomGeo.clone(), airframeMat);
    lBoom.position.set((boomStartX + rearX) / 2, -0.05, -boomSpacing);
    addWireframeEdges(lBoom);
    airframeGroup.add(lBoom);

    // Fixed V-Tail Fins (70% chord)
    const halfAngle = (vTailAngle / 2) * (Math.PI / 180); // 55°
    const finLen = boomSpacing / Math.sin(Math.PI / 2 - halfAngle);
    const apexY = -0.05 + finLen * Math.cos(Math.PI / 2 - halfAngle);

    function createFixedFinGeo() {
      const shape = new THREE.Shape();
      const c = vTailC * 0.75;
      const h = finLen;
      shape.moveTo(0, 0);
      shape.lineTo(-c, 0);
      shape.lineTo(-c * 0.6, h);
      shape.lineTo(-c * 0.1, h);
      shape.closePath();

      return new THREE.ExtrudeGeometry(shape, { depth: 0.018, bevelEnabled: false });
    }

    const rFinFixed = new THREE.Mesh(createFixedFinGeo(), airframeMat);
    rFinFixed.position.set(rearX, -0.05, boomSpacing);
    rFinFixed.rotation.x = -(Math.PI / 2 - halfAngle);
    addWireframeEdges(rFinFixed);
    airframeGroup.add(rFinFixed);

    const lFinFixed = new THREE.Mesh(createFixedFinGeo(), airframeMat);
    lFinFixed.position.set(rearX, -0.05, -boomSpacing);
    lFinFixed.rotation.x = (Math.PI / 2 - halfAngle);
    lFinFixed.scale.z = -1;
    addWireframeEdges(lFinFixed);
    airframeGroup.add(lFinFixed);

    scene.add(airframeGroup);

    // ═══════════════════════════════════════════════════
    // 2. ARTICULATED CONTROL SURFACES (Hinged Trailing Flaps)
    // ═══════════════════════════════════════════════════
    const controlMat = new THREE.MeshStandardMaterial({
      color: 0xe74c3c, // Red flap color
      roughness: 0.3,
      metalness: 0.2,
      flatShading: true
    });

    const aileronSpan = (halfSpan - fuseW * 0.4) * 0.6; // Outer 60% of wing
    const aileronChord = rootC * 0.25;
    const teX = wingX - rootC * 0.75; // Trailing Edge Hinge Line

    // --- RIGHT AILERON ---
    // Hinge at wing trailing edge, 40% out along right wing
    rAileronPivot = new THREE.Group();
    rAileronPivot.position.set(teX, 0, fuseW * 0.4 + (halfSpan - fuseW * 0.4) * 0.4);
    rAileronPivot.rotation.x = -dihedralRad;

    const rAileronGeo = new THREE.BoxGeometry(aileronChord, 0.02, aileronSpan);
    rAileronGeo.translate(-aileronChord * 0.5, 0, aileronSpan * 0.5); // Extends -X (back), +Z (out)
    rAileronMesh = new THREE.Mesh(rAileronGeo, controlMat);
    rAileronMesh.userData = { name: 'Right Aileron (Roll Control)' };
    addWireframeEdges(rAileronMesh, 0.4);
    rAileronPivot.add(rAileronMesh);
    scene.add(rAileronPivot);

    // --- LEFT AILERON ---
    // Hinge at wing trailing edge, 40% out along left wing
    lAileronPivot = new THREE.Group();
    lAileronPivot.position.set(teX, 0, -(fuseW * 0.4 + (halfSpan - fuseW * 0.4) * 0.4));
    lAileronPivot.rotation.x = dihedralRad;

    const lAileronGeo = new THREE.BoxGeometry(aileronChord, 0.02, aileronSpan);
    lAileronGeo.translate(-aileronChord * 0.5, 0, -aileronSpan * 0.5); // Extends -X (back), -Z (out)
    lAileronMesh = new THREE.Mesh(lAileronGeo, controlMat.clone());
    lAileronMesh.userData = { name: 'Left Aileron (Roll Control)' };
    addWireframeEdges(lAileronMesh, 0.4);
    lAileronPivot.add(lAileronMesh);
    scene.add(lAileronPivot);

    // --- RIGHT RUDDERVATOR (On angled V-tail fin trailing edge) ---
    rRuddervatorPivot = new THREE.Group();
    const rHingeBase = new THREE.Vector3(rearX - vTailC * 0.75, -0.05, boomSpacing);
    const rHingeApex = new THREE.Vector3(rearX - vTailC * 0.75, apexY, 0);
    const rFinDir = rHingeApex.clone().sub(rHingeBase).normalize();

    rRuddervatorPivot.position.copy(rHingeBase);
    rRuddervatorPivot.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), rFinDir);

    const ruddervatorChord = vTailC * 0.25;
    const ruddervatorGeo = new THREE.BoxGeometry(ruddervatorChord, 0.018, finLen);
    ruddervatorGeo.translate(-ruddervatorChord * 0.5, 0, finLen * 0.5);

    rRuddervatorMesh = new THREE.Mesh(ruddervatorGeo, controlMat.clone());
    rRuddervatorMesh.userData = { name: 'Right Ruddervator (Pitch/Yaw Control)' };
    addWireframeEdges(rRuddervatorMesh, 0.4);
    rRuddervatorPivot.add(rRuddervatorMesh);
    scene.add(rRuddervatorPivot);

    // --- LEFT RUDDERVATOR (On angled V-tail fin trailing edge) ---
    lRuddervatorPivot = new THREE.Group();
    const lHingeBase = new THREE.Vector3(rearX - vTailC * 0.75, -0.05, -boomSpacing);
    const lHingeApex = new THREE.Vector3(rearX - vTailC * 0.75, apexY, 0);
    const lFinDir = lHingeApex.clone().sub(lHingeBase).normalize();

    lRuddervatorPivot.position.copy(lHingeBase);
    lRuddervatorPivot.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), lFinDir);

    lRuddervatorMesh = new THREE.Mesh(ruddervatorGeo.clone(), controlMat.clone());
    lRuddervatorMesh.userData = { name: 'Left Ruddervator (Pitch/Yaw Control)' };
    addWireframeEdges(lRuddervatorMesh, 0.4);
    lRuddervatorPivot.add(lRuddervatorMesh);
    scene.add(lRuddervatorPivot);

    // Pusher Propeller
    propGroup = new THREE.Group();
    const propMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.3, flatShading: true });
    const spinnerMesh = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.12, 8), propMat);
    spinnerMesh.rotateZ(-Math.PI / 2);
    spinnerMesh.position.set(podTailX - 0.18, 0, 0);
    propGroup.add(spinnerMesh);

    const bladeMesh = new THREE.Mesh(new THREE.BoxGeometry(0.015, 1.1, 0.04), propMat);
    bladeMesh.position.set(podTailX - 0.16, 0, 0);
    propGroup.add(bladeMesh);
    scene.add(propGroup);

    // ═══════════════════════════════════════════════════
    // 3. INTERNAL ELECTRONICS COMPONENTS
    // ═══════════════════════════════════════════════════

    const motorGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.16, 12);
    motorGeo.rotateZ(Math.PI / 2);
    const motorMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8, roughness: 0.2, flatShading: true });
    const motor = new THREE.Mesh(motorGeo, motorMat);
    motor.position.set(podTailX - 0.05, 0, 0);
    motor.userData = { name: 'Brushless Motor (Emax 2213)', info: 'Pusher Motor, 180W' };
    addWireframeEdges(motor, 0.4);
    electronicsGroup.add(motor);

    const escGeo = new THREE.BoxGeometry(0.25, 0.08, 0.18);
    const escMat = new THREE.MeshStandardMaterial({ color: 0x3498db, metalness: 0.5, roughness: 0.3, flatShading: true });
    const esc = new THREE.Mesh(escGeo, escMat);
    esc.position.set(podTailX + 0.3, -0.05, 0);
    esc.userData = { name: 'ESC (20A Brushless)', info: '30A Max, 3S LiPo Compatible' };
    addWireframeEdges(esc, 0.5);
    electronicsGroup.add(esc);

    const batGeo = new THREE.BoxGeometry(0.55, 0.18, 0.24);
    const batMat = new THREE.MeshStandardMaterial({ color: 0x2ecc71, metalness: 0.3, roughness: 0.4, flatShading: true });
    const battery = new THREE.Mesh(batGeo, batMat);
    battery.position.set(0.15, -0.05, 0);
    battery.userData = { name: '3S LiPo Battery Pack', info: '1300mAh 11.1V 25C (108g)' };
    addWireframeEdges(battery, 0.5);
    electronicsGroup.add(battery);

    const fcGeo = new THREE.BoxGeometry(0.22, 0.06, 0.22);
    const fcMat = new THREE.MeshStandardMaterial({ color: 0x9b59b6, metalness: 0.6, roughness: 0.2, flatShading: true });
    const fc = new THREE.Mesh(fcGeo, fcMat);
    fc.position.set(0.8, 0.05, 0);
    fc.userData = { name: 'Flight Controller & Receiver', info: 'Auto-stabilization & 6-channel Receiver' };
    addWireframeEdges(fc, 0.5);
    electronicsGroup.add(fc);

    const servoGeo = new THREE.BoxGeometry(0.12, 0.1, 0.08);
    const servoMat = new THREE.MeshStandardMaterial({ color: 0xf1c40f, metalness: 0.4, roughness: 0.3, flatShading: true });

    const rServo = new THREE.Mesh(servoGeo, servoMat);
    rServo.position.set(wingX - rootC * 0.4, 0, 1.8);
    rServo.userData = { name: 'Right Aileron Servo (9g)', info: '1.8 kg·cm Torque' };
    addWireframeEdges(rServo, 0.5);
    electronicsGroup.add(rServo);

    const lServo = new THREE.Mesh(servoGeo.clone(), servoMat.clone());
    lServo.position.set(wingX - rootC * 0.4, 0, -1.8);
    lServo.userData = { name: 'Left Aileron Servo (9g)', info: '1.8 kg·cm Torque' };
    addWireframeEdges(lServo, 0.5);
    electronicsGroup.add(lServo);

    const rTailServo = new THREE.Mesh(servoGeo.clone(), servoMat.clone());
    rTailServo.position.set(-0.6, -0.05, 0.9);
    rTailServo.userData = { name: 'Right Ruddervator Servo (9g)', info: 'V-tail control' };
    addWireframeEdges(rTailServo, 0.5);
    electronicsGroup.add(rTailServo);

    const lTailServo = new THREE.Mesh(servoGeo.clone(), servoMat.clone());
    lTailServo.position.set(-0.6, -0.05, -0.9);
    lTailServo.userData = { name: 'Left Ruddervator Servo (9g)', info: 'V-tail control' };
    addWireframeEdges(lTailServo, 0.5);
    electronicsGroup.add(lTailServo);

    const gimbalMat = new THREE.MeshStandardMaterial({ color: 0x1abc9c, metalness: 0.7, roughness: 0.2, flatShading: true });
    const gimbal = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), gimbalMat);
    gimbal.position.set(1.9, -0.3, 0);
    gimbal.userData = { name: 'EO/IR Camera Turret', info: 'Optical & Thermal Payload' };
    addWireframeEdges(gimbal, 0.5);
    electronicsGroup.add(gimbal);

    scene.add(electronicsGroup);

    // Wiring
    const wireMat = new THREE.LineBasicMaterial({ color: 0x1abc9c, linewidth: 2 });
    const powerWireMat = new THREE.LineBasicMaterial({ color: 0xe74c3c, linewidth: 2 });

    const wire1 = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0.15, -0.05, 0),
      new THREE.Vector3(-0.4, -0.05, 0)
    ]);
    wiringGroup.add(new THREE.Line(wire1, powerWireMat));

    const wire2 = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.4, -0.05, 0),
      new THREE.Vector3(-0.85, 0, 0)
    ]);
    wiringGroup.add(new THREE.Line(wire2, powerWireMat));

    const wireRServo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0.8, 0.05, 0),
      new THREE.Vector3(0.2, 0.05, 0),
      new THREE.Vector3(wingX - rootC * 0.4, 0, 1.8)
    ]);
    wiringGroup.add(new THREE.Line(wireRServo, wireMat));

    const wireLServo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0.8, 0.05, 0),
      new THREE.Vector3(0.2, 0.05, 0),
      new THREE.Vector3(wingX - rootC * 0.4, 0, -1.8)
    ]);
    wiringGroup.add(new THREE.Line(wireLServo, wireMat));

    scene.add(wiringGroup);
  }

  function addWireframeEdges(mesh, opacity) {
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(mesh.geometry, 20),
      new THREE.LineBasicMaterial({ color: 0x888888, transparent: true, opacity: opacity || 0.3 })
    );
    mesh.add(edges);
  }

  /* ────────────────────────────────────────────────────────────
     CONTROL LOGIC & FLIGHT COMPUTER MIXING
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

  function updateControlInputs() {
    const maxDeg = 25;

    if (!manualOverride) {
      const step = 0.08;
      const decay = 0.1;

      // Pitch: W / ArrowUp (+) vs S / ArrowDown (-)
      if (keysPressed['w'] || keysPressed['arrowup']) input.pitch = Math.min(1, input.pitch + step);
      else if (keysPressed['s'] || keysPressed['arrowdown']) input.pitch = Math.max(-1, input.pitch - step);
      else input.pitch *= (1 - decay);

      // Roll: D / ArrowRight (Roll Right: Right Up, Left Down) vs A / ArrowLeft (Roll Left)
      if (keysPressed['d'] || keysPressed['arrowright']) input.roll = Math.min(1, input.roll + step);
      else if (keysPressed['a'] || keysPressed['arrowleft']) input.roll = Math.max(-1, input.roll - step);
      else input.roll *= (1 - decay);

      // Yaw: E (Yaw Right) vs Q (Yaw Left)
      if (keysPressed['e']) input.yaw = Math.min(1, input.yaw + step);
      else if (keysPressed['q']) input.yaw = Math.max(-1, input.yaw - step);
      else input.yaw *= (1 - decay);

      // Throttle: R/Shift vs F/Ctrl
      if (keysPressed['r'] || keysPressed['shift']) input.throttle = Math.min(1, input.throttle + 0.02);
      if (keysPressed['f'] || keysPressed['control']) input.throttle = Math.max(0, input.throttle - 0.02);

      // Flight Computer Surface Deflections:
      // Roll: Right Aileron UP (+), Left Aileron DOWN (-)
      angles.rAileron = input.roll * maxDeg;
      angles.lAileron = -input.roll * maxDeg;

      // Ruddervators (Pitch + Yaw Mixing per Wikipedia / Bayraktar TB2 FCS):
      // Pitch UP (+): Both Ruddervators deflect UP (+)
      // Yaw RIGHT (+): Right Ruddervator UP (+), Left Ruddervator DOWN (-)
      angles.rRuddervator = (input.pitch + input.yaw) * maxDeg;
      angles.lRuddervator = (input.pitch - input.yaw) * maxDeg;

      angles.rAileron = Math.max(-maxDeg, Math.min(maxDeg, angles.rAileron));
      angles.lAileron = Math.max(-maxDeg, Math.min(maxDeg, angles.lAileron));
      angles.rRuddervator = Math.max(-maxDeg, Math.min(maxDeg, angles.rRuddervator));
      angles.lRuddervator = Math.max(-maxDeg, Math.min(maxDeg, angles.lRuddervator));
    }

    // Apply Deflections along Local Z-Axis Hinge Line:
    if (rAileronMesh) rAileronMesh.rotation.z = THREE.MathUtils.degToRad(-angles.rAileron);
    if (lAileronMesh) lAileronMesh.rotation.z = THREE.MathUtils.degToRad(angles.lAileron);

    if (rRuddervatorMesh) rRuddervatorMesh.rotation.z = THREE.MathUtils.degToRad(-angles.rRuddervator);
    if (lRuddervatorMesh) lRuddervatorMesh.rotation.z = THREE.MathUtils.degToRad(angles.lRuddervator);

    // Propeller Rotation
    if (propGroup) propGroup.rotation.x += input.throttle * 0.4;

    updateUIIndicators();
  }

  function updateUIIndicators() {
    const elR = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };

    elR('sim-r-aileron', angles.rAileron.toFixed(1) + '°');
    elR('sim-l-aileron', angles.lAileron.toFixed(1) + '°');
    elR('sim-r-ruddervator', angles.rRuddervator.toFixed(1) + '°');
    elR('sim-l-ruddervator', angles.lRuddervator.toFixed(1) + '°');
    elR('sim-throttle-val', Math.round(input.throttle * 100) + '%');

    const setSliderVal = (id, val) => { const s = document.getElementById(id); if (s && document.activeElement !== s) s.value = val; };
    setSliderVal('slider-r-aileron', angles.rAileron);
    setSliderVal('slider-l-aileron', angles.lAileron);
    setSliderVal('slider-r-ruddervator', angles.rRuddervator);
    setSliderVal('slider-l-ruddervator', angles.lRuddervator);

    const pitchDeg = input.pitch * 20;
    const rollDeg = input.roll * 30;
    const horizon = document.getElementById('attitude-horizon');
    if (horizon) {
      horizon.style.transform = `translateY(${pitchDeg}px) rotate(${-rollDeg}deg)`;
    }
  }

  /* ────────────────────────────────────────────────────────────
     DISPLAY MODES & CONTROLS
     ──────────────────────────────────────────────────────────── */

  function setDisplayMode(mode) {
    displayMode = mode;

    airframeGroup.traverse(child => {
      if (child.isMesh) {
        if (mode === 'solid') {
          child.material.opacity = 1.0;
          child.material.transparent = false;
          child.material.depthWrite = true;
          child.material.wireframe = false;
        } else if (mode === 'xray') {
          child.material.opacity = 0.25;
          child.material.transparent = true;
          child.material.depthWrite = false;
          child.material.wireframe = false;
        } else if (mode === 'electronics') {
          child.material.opacity = 0.08;
          child.material.transparent = true;
          child.material.depthWrite = false;
          child.material.wireframe = true;
        }
      }
    });

    electronicsGroup.traverse(child => {
      if (child.isMesh) {
        child.material.opacity = mode === 'solid' ? 0.7 : 1.0;
      }
    });
  }

  function setIndividualSurface(surface, degVal) {
    manualOverride = true;
    const val = parseFloat(degVal);
    if (surface in angles) {
      angles[surface] = val;
    }
  }

  function setMasterInput(type, val) {
    manualOverride = false;
    if (type in input) {
      input[type] = parseFloat(val);
    }
  }

  function resetControls() {
    manualOverride = false;
    input.pitch = 0;
    input.roll = 0;
    input.yaw = 0;
    input.throttle = 0.4;
    angles.rAileron = 0;
    angles.lAileron = 0;
    angles.rRuddervator = 0;
    angles.lRuddervator = 0;
  }

  function onResize() {
    if (!container) return;
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
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
