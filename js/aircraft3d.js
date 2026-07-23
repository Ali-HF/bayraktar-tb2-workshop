/* ============================================================
   Bayraktar TB2 — Three.js 3D Aircraft Model (v2)
   ============================================================
   Rebuilt from reference drawings with accurate proportions:
   - Rounded bulbous nose (sensor dome)
   - Long slender fuselage tapering to thin tail boom
   - High-aspect-ratio straight wings at ~40% from nose
   - Inverted V-tail at rear
   - Pusher propeller behind V-tail
   - Tricycle landing gear
   - Underwing pylons
   ============================================================ */

const Aircraft3D = (() => {
  let scene, camera, renderer, controls;
  let container;
  let parts = {};
  let partGroups = {};
  let labels = [];
  let raycaster, mouse;
  let hoveredPart = null;
  let tooltip;
  let isExploded = false;
  let animating = false;
  let partPositions = { assembled: {}, exploded: {} };

  const COLORS = {
    bg: 0x2b2b2b,
    ambient: 0x404040,
    rimLight: 0xe8a87c,
    keyLight: 0xffffff,
    highlight: 0xe74c3c,
  };

  const MATERIAL_COLORS = {
    balsa:       0xd4b483,
    plywood:     0x8B6914,
    foam:        0xb8d4e3,
    fiberglass:  0xe8e8d0,
    carbonfiber: 0x3a3a3a
  };

  /* Scale: 1mm = 0.01 Three.js units */
  const S = 0.01;

  function init(containerId) {
    container = document.getElementById(containerId);
    if (!container) return;

    // Prevent re-init
    if (container.querySelector('canvas')) return;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(COLORS.bg);

    const aspect = container.clientWidth / container.clientHeight;
    camera = new THREE.PerspectiveCamera(32, aspect, 0.1, 100);
    camera.position.set(6, 3.5, 7);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    container.appendChild(renderer.domElement);

    // Lights — warm rim lighting
    scene.add(new THREE.AmbientLight(0x404040, 0.6));

    const keyLight = new THREE.DirectionalLight(0xffffff, 0.7);
    keyLight.position.set(5, 10, 5);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const rimLight1 = new THREE.DirectionalLight(COLORS.rimLight, 0.9);
    rimLight1.position.set(-4, 2, -5);
    scene.add(rimLight1);

    const rimLight2 = new THREE.DirectionalLight(COLORS.rimLight, 0.5);
    rimLight2.position.set(5, -1, -3);
    scene.add(rimLight2);

    scene.add(new THREE.HemisphereLight(0x445566, 0x222222, 0.35));

    // Orbit Controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 2;
    controls.maxDistance = 18;
    controls.target.set(0, 0, 0);

    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    tooltip = document.createElement('div');
    tooltip.className = 'model-tooltip';
    tooltip.style.display = 'none';
    container.appendChild(tooltip);

    buildAircraft();

    container.addEventListener('mousemove', onMouseMove);
    container.addEventListener('mouseleave', () => { tooltip.style.display = 'none'; });
    window.addEventListener('resize', onResize);

    ['mat_fuselage', 'mat_wing', 'mat_tail', 'mat_mount'].forEach(key => {
      AppState.subscribe(key, () => updateMaterials());
    });

    animate();
  }

  function makeMat(matId, metalness) {
    const color = MATERIAL_COLORS[matId] || 0x555555;
    return new THREE.MeshStandardMaterial({
      color, roughness: 0.55, metalness: metalness || 0.15,
      emissive: new THREE.Color(COLORS.rimLight),
      emissiveIntensity: 0.02
    });
  }

  function addEdges(mesh, opacity) {
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(mesh.geometry, 25),
      new THREE.LineBasicMaterial({ color: 0x555555, transparent: true, opacity: opacity || 0.12 })
    );
    mesh.add(edges);
  }

  function buildAircraft() {
    const d = PlaneData.dimensions;
    // Key dimensions in Three.js units
    const fuseL = d.fuselageLength * S;  // 5.42
    const fuseW = d.fuselageWidth * S;   // 0.45
    const fuseH = d.fuselageHeight * S;  // 0.55
    const span = d.wingspan * S;         // 10.0
    const rootC = d.wingRootChord * S;   // 0.60
    const tipC = d.wingTipChord * S;     // 0.40
    const vTailH = d.vTailHeight * S;    // 0.70
    const vTailC = d.vTailRootChord * S; // 0.45
    const tailAngle = d.vTailAngle;      // 110°
    const noseToWingLE = d.noseToWingLE * S; // 2.20

    const fuseMat = makeMat(AppState.get('mat_fuselage'));
    const wingMat = makeMat(AppState.get('mat_wing'));
    const tailMat = makeMat(AppState.get('mat_tail'));
    const mountMat = makeMat(AppState.get('mat_mount'));

    // ═══════════════════════════════════════════════════
    // FUSELAGE — multi-section: nose dome + main body + tail boom
    // ═══════════════════════════════════════════════════

    const fuselageGroup = new THREE.Group();
    fuselageGroup.userData = {
      partId: 'fuselage', name: 'Fuselage',
      dims: `${d.fuselageLength}mm × ${d.fuselageWidth}mm × ${d.fuselageHeight}mm`,
      matKey: 'mat_fuselage'
    };

    // Nose sensor dome (bulbous rounded front)
    const noseGeo = new THREE.SphereGeometry(fuseW * 0.55, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55);
    noseGeo.rotateX(-Math.PI * 0.05);
    const noseMesh = new THREE.Mesh(noseGeo, fuseMat);
    noseMesh.position.set(fuseL * 0.47, fuseH * 0.05, 0);
    noseMesh.scale.set(1.2, 1.0, 1.0);
    addEdges(noseMesh);
    fuselageGroup.add(noseMesh);

    // Main fuselage body — using a lathe geometry for smooth organic shape
    const fuseProfile = [];
    const fuseSegments = 24;
    for (let i = 0; i <= fuseSegments; i++) {
      const t = i / fuseSegments;
      const x = -fuseL * 0.45 + t * fuseL * 0.85;
      // Fuselage width profile: wider at front, tapers to tail boom
      let r;
      if (t < 0.15) {
        // Nose taper up
        r = fuseW * 0.5 * Math.sin(t / 0.15 * Math.PI * 0.5);
      } else if (t < 0.55) {
        // Main body — full width
        r = fuseW * 0.5;
      } else {
        // Tail boom taper
        const tb = (t - 0.55) / 0.45;
        r = fuseW * 0.5 * (1 - tb * 0.7);
      }
      fuseProfile.push(new THREE.Vector2(r, x));
    }

    const fuseBodyGeo = new THREE.LatheGeometry(fuseProfile, 16);
    fuseBodyGeo.rotateX(Math.PI / 2);
    const fuseBody = new THREE.Mesh(fuseBodyGeo, fuseMat);
    fuseBody.scale.set(1, 1.2, 1); // Slightly taller than wide (55mm H vs 45mm W)
    addEdges(fuseBody, 0.08);
    fuselageGroup.add(fuseBody);

    // Tail boom extension (thin cylinder connecting to V-tail)
    const boomLen = fuseL * 0.2;
    const boomGeo = new THREE.CylinderGeometry(fuseW * 0.12, fuseW * 0.1, boomLen, 10);
    boomGeo.rotateZ(Math.PI / 2);
    const boomMesh = new THREE.Mesh(boomGeo, fuseMat);
    boomMesh.position.set(-fuseL * 0.42 - boomLen * 0.35, 0, 0);
    addEdges(boomMesh);
    fuselageGroup.add(boomMesh);

    // Canopy/sensor window on top
    const canopyGeo = new THREE.SphereGeometry(fuseW * 0.22, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const canopyMat = new THREE.MeshStandardMaterial({
      color: 0x334455, roughness: 0.1, metalness: 0.6,
      emissive: new THREE.Color(0x1a2a3a), emissiveIntensity: 0.1
    });
    const canopy = new THREE.Mesh(canopyGeo, canopyMat);
    canopy.position.set(fuseL * 0.15, fuseH * 0.52, 0);
    canopy.scale.set(2.5, 0.6, 1.2);
    fuselageGroup.add(canopy);

    scene.add(fuselageGroup);
    partGroups.fuselage = fuselageGroup;

    // ═══════════════════════════════════════════════════
    // WINGS — high-aspect-ratio, straight, slight taper
    // ═══════════════════════════════════════════════════

    const wingGroup = new THREE.Group();
    wingGroup.userData = {
      partId: 'wing', name: 'Wings',
      dims: `Span: ${d.wingspan}mm, Root: ${d.wingRootChord}mm, Tip: ${d.wingTipChord}mm`,
      matKey: 'mat_wing'
    };

    // Wing cross-section: NACA 4412-ish airfoil shape
    function createWingGeo(halfSpan, rootChord, tipChord, thickness) {
      const shape = new THREE.Shape();
      // Airfoil-ish cross section at root
      const c = rootChord;
      const t = thickness;
      shape.moveTo(0, 0);
      shape.bezierCurveTo(c * 0.05, t * 0.6, c * 0.15, t, c * 0.3, t * 0.95);
      shape.bezierCurveTo(c * 0.5, t * 0.8, c * 0.8, t * 0.3, c, 0);
      shape.bezierCurveTo(c * 0.8, -t * 0.15, c * 0.4, -t * 0.2, c * 0.15, -t * 0.15);
      shape.bezierCurveTo(c * 0.05, -t * 0.1, 0, 0, 0, 0);

      const extrudeSettings = {
        steps: 20,
        depth: halfSpan,
        bevelEnabled: false,
      };

      const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);

      // Taper: scale vertices based on Z (span) position
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const z = pos.getZ(i);
        const spanFrac = z / halfSpan;
        const scale = 1 - spanFrac * (1 - tipChord / rootChord);
        pos.setX(i, pos.getX(i) * scale);
        pos.setY(i, pos.getY(i) * scale);
      }
      pos.needsUpdate = true;
      geo.computeVertexNormals();
      return geo;
    }

    const wingThick = d.wingThicknessRoot * S;
    const halfSpan = span * 0.5 - fuseW * 0.5; // subtract fuselage radius
    const sweep = d.wingSweepLE * S;

    // Right wing
    const rWingGeo = createWingGeo(halfSpan, rootC, tipC, wingThick);
    const rWing = new THREE.Mesh(rWingGeo, wingMat);
    const wingX = fuseL * 0.5 - noseToWingLE - rootC * 0.35;
    rWing.position.set(wingX, -wingThick * 0.3, fuseW * 0.5);
    rWing.rotation.y = -sweep / halfSpan; // slight sweep
    addEdges(rWing, 0.1);
    wingGroup.add(rWing);

    // Left wing (mirrored)
    const lWingGeo = createWingGeo(halfSpan, rootC, tipC, wingThick);
    const lWing = new THREE.Mesh(lWingGeo, wingMat.clone());
    lWing.position.set(wingX, -wingThick * 0.3, -fuseW * 0.5);
    lWing.scale.z = -1;
    lWing.rotation.y = sweep / halfSpan;
    addEdges(lWing, 0.1);
    wingGroup.add(lWing);

    // Underwing pylons (2 per side, as in reference)
    const pylonGeo = new THREE.BoxGeometry(rootC * 0.5, wingThick * 1.5, 0.015);
    const pylonMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.5, metalness: 0.3 });

    [0.25, 0.55].forEach(frac => {
      const pR = new THREE.Mesh(pylonGeo, pylonMat);
      pR.position.set(wingX + rootC * 0.2, -wingThick * 0.8, fuseW * 0.5 + halfSpan * frac);
      wingGroup.add(pR);

      const pL = new THREE.Mesh(pylonGeo.clone(), pylonMat.clone());
      pL.position.set(wingX + rootC * 0.2, -wingThick * 0.8, -(fuseW * 0.5 + halfSpan * frac));
      wingGroup.add(pL);
    });

    scene.add(wingGroup);
    partGroups.wing = wingGroup;

    // ═══════════════════════════════════════════════════
    // V-TAIL — inverted V-tail (downward angled)
    // ═══════════════════════════════════════════════════

    const tailGroup = new THREE.Group();
    tailGroup.userData = {
      partId: 'tail', name: 'V-Tail (Ruddervators)',
      dims: `Height: ${d.vTailHeight}mm, Chord: ${d.vTailRootChord}mm, Angle: ${tailAngle}°`,
      matKey: 'mat_tail'
    };

    // Each V-tail fin as a flat tapered surface
    function createTailFin() {
      const shape = new THREE.Shape();
      const c = vTailC;
      const h = vTailH;
      shape.moveTo(0, 0);
      shape.lineTo(c, 0);
      shape.lineTo(c * 0.6, h);
      shape.lineTo(c * 0.1, h);
      shape.closePath();

      const geo = new THREE.ExtrudeGeometry(shape, {
        depth: 0.015, bevelEnabled: true,
        bevelThickness: 0.003, bevelSize: 0.003, bevelSegments: 2
      });
      return geo;
    }

    const halfAngle = (tailAngle / 2) * Math.PI / 180; // 55°
    const tailX = -fuseL * 0.5 - boomLen * 0.4;

    // Right V-tail fin (angled upward-right)
    const rTailGeo = createTailFin();
    const rTail = new THREE.Mesh(rTailGeo, tailMat);
    rTail.position.set(tailX, fuseH * 0.05, 0.008);
    rTail.rotation.x = -(Math.PI / 2 - halfAngle);
    addEdges(rTail);
    tailGroup.add(rTail);

    // Left V-tail fin (angled upward-left)
    const lTailGeo = createTailFin();
    const lTail = new THREE.Mesh(lTailGeo, tailMat.clone());
    lTail.position.set(tailX, fuseH * 0.05, -0.008);
    lTail.rotation.x = (Math.PI / 2 - halfAngle);
    addEdges(lTail);
    tailGroup.add(lTail);

    scene.add(tailGroup);
    partGroups.tail = tailGroup;

    // ═══════════════════════════════════════════════════
    // MOTOR + PROPELLER — pusher config behind V-tail
    // ═══════════════════════════════════════════════════

    const motorGroup = new THREE.Group();
    motorGroup.userData = {
      partId: 'mount', name: 'Motor Mount & Propeller',
      dims: `Mount Ø: ${d.motorMountDia}mm (pusher config)`,
      matKey: 'mat_mount'
    };

    const mountDia = d.motorMountDia * S;
    const motorX = tailX - vTailC * 0.3;

    // Motor nacelle
    const nacelleGeo = new THREE.CylinderGeometry(mountDia * 0.4, mountDia * 0.5, fuseL * 0.05, 12);
    nacelleGeo.rotateZ(Math.PI / 2);
    const nacelle = new THREE.Mesh(nacelleGeo, mountMat);
    nacelle.position.set(motorX, 0, 0);
    addEdges(nacelle);
    motorGroup.add(nacelle);

    // Motor bell
    const bellGeo = new THREE.CylinderGeometry(mountDia * 0.3, mountDia * 0.35, fuseL * 0.025, 12);
    bellGeo.rotateZ(Math.PI / 2);
    const bellMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.25, metalness: 0.7 });
    const bell = new THREE.Mesh(bellGeo, bellMat);
    bell.position.set(motorX - fuseL * 0.04, 0, 0);
    motorGroup.add(bell);

    // Propeller hub
    const hubGeo = new THREE.SphereGeometry(mountDia * 0.1, 8, 8);
    const propHub = new THREE.Mesh(hubGeo, bellMat);
    propHub.position.set(motorX - fuseL * 0.058, 0, 0);
    motorGroup.add(propHub);

    // Propeller blades (3-blade)
    const propMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.35, metalness: 0.3 });
    for (let i = 0; i < 3; i++) {
      const bladeShape = new THREE.Shape();
      bladeShape.moveTo(0, 0);
      bladeShape.bezierCurveTo(0.005, mountDia * 0.4, 0.015, mountDia * 0.8, 0.005, mountDia * 1.1);
      bladeShape.bezierCurveTo(0, mountDia * 1.15, -0.005, mountDia * 1.1, -0.005, mountDia * 0.8);
      bladeShape.bezierCurveTo(-0.012, mountDia * 0.4, -0.003, 0.01, 0, 0);

      const bladeGeo = new THREE.ShapeGeometry(bladeShape);
      const blade = new THREE.Mesh(bladeGeo, propMat);
      blade.position.set(motorX - fuseL * 0.06, 0, 0);
      blade.rotation.x = (Math.PI * 2 / 3) * i;
      blade.rotation.y = Math.PI / 2;
      motorGroup.add(blade);
    }

    scene.add(motorGroup);
    partGroups.motor = motorGroup;

    // ═══════════════════════════════════════════════════
    // LANDING GEAR — tricycle configuration
    // ═══════════════════════════════════════════════════

    const gearGroup = new THREE.Group();
    gearGroup.userData = {
      partId: 'fuselage', name: 'Landing Gear',
      dims: 'Tricycle configuration (nose + 2 main)',
      matKey: 'mat_fuselage'
    };

    const gearMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.6, roughness: 0.35 });
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.7, metalness: 0.1 });

    // Nose gear strut
    const noseStrutGeo = new THREE.CylinderGeometry(0.004, 0.004, fuseH * 0.9, 6);
    const noseStrut = new THREE.Mesh(noseStrutGeo, gearMat);
    noseStrut.position.set(fuseL * 0.35, -fuseH * 0.65, 0);
    noseStrut.rotation.z = 0.05;
    gearGroup.add(noseStrut);

    // Nose wheel
    const wheelGeo = new THREE.TorusGeometry(0.025, 0.008, 8, 16);
    const noseWheel = new THREE.Mesh(wheelGeo, wheelMat);
    noseWheel.position.set(fuseL * 0.35, -fuseH * 1.1, 0);
    noseWheel.rotation.y = Math.PI / 2;
    gearGroup.add(noseWheel);

    // Main gear (left and right)
    [-1, 1].forEach(side => {
      const strutGeo = new THREE.CylinderGeometry(0.005, 0.005, fuseH * 1.0, 6);
      const strut = new THREE.Mesh(strutGeo, gearMat);
      strut.position.set(wingX + rootC * 0.3, -fuseH * 0.7, side * fuseW * 0.8);
      strut.rotation.z = side * 0.08;
      gearGroup.add(strut);

      const mainWheelGeo = new THREE.TorusGeometry(0.035, 0.012, 8, 16);
      const mainWheel = new THREE.Mesh(mainWheelGeo, wheelMat);
      mainWheel.position.set(wingX + rootC * 0.3, -fuseH * 1.2, side * fuseW * 0.8);
      mainWheel.rotation.y = Math.PI / 2;
      gearGroup.add(mainWheel);
    });

    scene.add(gearGroup);
    partGroups.gear = gearGroup;

    // ═══════════════════════════════════════════════════
    // DIMENSION CALLOUT LINES
    // ═══════════════════════════════════════════════════

    // Wingspan
    const wingLineMat = new THREE.LineBasicMaterial({ color: 0xe74c3c, transparent: true, opacity: 0.5 });
    const wPts = [
      new THREE.Vector3(wingX + rootC * 0.5, wingThick * 2, -span / 2),
      new THREE.Vector3(wingX + rootC * 0.5, wingThick * 2, span / 2)
    ];
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(wPts), wingLineMat));

    // End ticks
    [-span / 2, span / 2].forEach(z => {
      const tickPts = [
        new THREE.Vector3(wingX + rootC * 0.5, wingThick, z),
        new THREE.Vector3(wingX + rootC * 0.5, wingThick * 3, z)
      ];
      scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(tickPts), wingLineMat));
    });

    createTextSprite(`${d.wingspan}mm`, wingX + rootC * 0.5, wingThick * 4.5, 0, 0xe74c3c);

    // Fuselage length
    const fuseLineMat = new THREE.LineBasicMaterial({ color: 0x2ecc71, transparent: true, opacity: 0.5 });
    const fPts = [
      new THREE.Vector3(-fuseL * 0.55, -fuseH * 1.5, 0),
      new THREE.Vector3(fuseL * 0.5, -fuseH * 1.5, 0)
    ];
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(fPts), fuseLineMat));
    createTextSprite(`${d.fuselageLength}mm`, 0, -fuseH * 2.2, 0, 0x2ecc71);

    // V-tail span
    const tailLineMat = new THREE.LineBasicMaterial({ color: 0xf1c40f, transparent: true, opacity: 0.5 });
    createTextSprite(`V-Tail ${d.vTailAngle}°`, tailX + vTailC * 0.3, vTailH * 1.3, 0, 0xf1c40f);

    // ═══════════════════════════════════════════════════
    // STORE POSITIONS FOR EXPLODED VIEW
    // ═══════════════════════════════════════════════════

    Object.entries(partGroups).forEach(([key, group]) => {
      partPositions.assembled[key] = {
        x: group.position.x, y: group.position.y, z: group.position.z
      };
    });

    computeExplodedPositions();
  }

  function computeExplodedPositions() {
    const spread = 1.5;
    Object.entries(partGroups).forEach(([key, group]) => {
      const ap = partPositions.assembled[key];
      const ep = { x: ap.x, y: ap.y, z: ap.z };

      switch (key) {
        case 'fuselage':
          ep.x += spread * 0.5;
          ep.y += spread * 0.2;
          break;
        case 'wing':
          ep.y += spread * 0.8;
          break;
        case 'tail':
          ep.x -= spread * 1.2;
          ep.y += spread * 0.5;
          break;
        case 'motor':
          ep.x -= spread * 1.8;
          break;
        case 'gear':
          ep.y -= spread * 1.0;
          break;
      }

      partPositions.exploded[key] = ep;
    });
  }

  function createTextSprite(text, x, y, z, color) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.font = 'bold 32px Inter, sans-serif';
    ctx.fillStyle = '#' + color.toString(16).padStart(6, '0');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.position.set(x, y, z);
    sprite.scale.set(1.2, 0.15, 1);
    scene.add(sprite);
    labels.push(sprite);
  }

  function toggleExploded(explode) {
    if (animating) return;
    isExploded = explode !== undefined ? explode : !isExploded;
    animating = true;

    const target = isExploded ? partPositions.exploded : partPositions.assembled;
    const duration = 1200;
    const startTime = performance.now();
    const startPositions = {};

    Object.entries(partGroups).forEach(([key, group]) => {
      startPositions[key] = { x: group.position.x, y: group.position.y, z: group.position.z };
    });

    function step(now) {
      let t = Math.min((now - startTime) / duration, 1);
      t = 1 - Math.pow(1 - t, 3); // ease out cubic

      Object.entries(partGroups).forEach(([key, group]) => {
        const s = startPositions[key];
        const e = target[key];
        if (s && e) {
          group.position.x = s.x + (e.x - s.x) * t;
          group.position.y = s.y + (e.y - s.y) * t;
          group.position.z = s.z + (e.z - s.z) * t;
        }
      });

      if (t < 1) requestAnimationFrame(step);
      else animating = false;
    }
    requestAnimationFrame(step);
  }

  function updateMaterials() {
    const map = {
      fuselage: 'mat_fuselage',
      wing: 'mat_wing',
      tail: 'mat_tail',
      motor: 'mat_mount'
    };

    Object.entries(map).forEach(([groupKey, stateKey]) => {
      const matId = AppState.get(stateKey);
      const color = MATERIAL_COLORS[matId] || 0x555555;
      const group = partGroups[groupKey];
      if (!group) return;

      group.traverse(child => {
        if (child.isMesh && child.material && child.material.emissive) {
          // Don't change special materials (canopy, wheels, motor bell, etc.)
          if (child.material.metalness > 0.5 || child.material.color.getHex() === 0x222222 ||
              child.material.color.getHex() === 0x333333 || child.material.color.getHex() === 0x444444) return;
          child.material.color.set(color);
          child.material.needsUpdate = true;
        }
      });
    });
  }

  function onMouseMove(event) {
    const rect = container.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    // Collect all meshes from part groups
    const allMeshes = [];
    Object.values(partGroups).forEach(group => {
      group.traverse(child => { if (child.isMesh) allMeshes.push(child); });
    });

    const intersects = raycaster.intersectObjects(allMeshes);

    // Reset previous hover
    if (hoveredPart) {
      hoveredPart.traverse(child => {
        if (child.isMesh && child.material.emissive) {
          child.material.emissiveIntensity = 0.02;
        }
      });
      hoveredPart = null;
    }

    if (intersects.length > 0) {
      // Find which group this mesh belongs to
      let hit = intersects[0].object;
      let parentGroup = null;

      Object.entries(partGroups).forEach(([key, group]) => {
        group.traverse(child => {
          if (child === hit) parentGroup = group;
        });
      });

      if (parentGroup && parentGroup.userData.name) {
        hoveredPart = parentGroup;
        parentGroup.traverse(child => {
          if (child.isMesh && child.material.emissive) {
            child.material.emissiveIntensity = 0.12;
          }
        });

        tooltip.innerHTML = `<strong>${parentGroup.userData.name}</strong><br><span>${parentGroup.userData.dims}</span>`;
        tooltip.style.display = 'block';
        tooltip.style.left = (event.clientX - rect.left + 15) + 'px';
        tooltip.style.top = (event.clientY - rect.top - 10) + 'px';
      }
    } else {
      tooltip.style.display = 'none';
    }
  }

  function onResize() {
    if (!container) return;
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  let propAngle = 0;
  function animate() {
    requestAnimationFrame(animate);
    controls.update();

    // Spin propeller
    if (partGroups.motor) {
      propAngle += 0.06;
      partGroups.motor.children.forEach(child => {
        if (child.geometry && child.geometry.type === 'ShapeGeometry') {
          // These are propeller blades — they already have rotation offsets
          // We rotate the entire motor group slightly, but it's cleaner to not
        }
      });
    }

    renderer.render(scene, camera);
  }

  function setView(view) {
    const duration = 800;
    const startPos = { x: camera.position.x, y: camera.position.y, z: camera.position.z };
    let endPos;

    switch (view) {
      case 'top':
        endPos = { x: 0, y: 10, z: 0.01 };
        break;
      case 'side':
        endPos = { x: 0, y: 0.5, z: 10 };
        break;
      case 'front':
        endPos = { x: 10, y: 0.5, z: 0 };
        break;
      default: // isometric
        endPos = { x: 6, y: 3.5, z: 7 };
    }

    const startTime = performance.now();
    function camAnim(now) {
      let t = Math.min((now - startTime) / duration, 1);
      t = 1 - Math.pow(1 - t, 3);
      camera.position.x = startPos.x + (endPos.x - startPos.x) * t;
      camera.position.y = startPos.y + (endPos.y - startPos.y) * t;
      camera.position.z = startPos.z + (endPos.z - startPos.z) * t;
      camera.lookAt(0, 0, 0);
      if (t < 1) requestAnimationFrame(camAnim);
    }
    requestAnimationFrame(camAnim);
  }

  function dispose() {
    if (renderer) {
      renderer.dispose();
      if (container && renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    }
    window.removeEventListener('resize', onResize);
  }

  return { init, toggleExploded, updateMaterials, setView, dispose };
})();
