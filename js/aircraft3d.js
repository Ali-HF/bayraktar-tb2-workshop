/* ============================================================
   Bayraktar TB2 — Three.js 3D Aircraft Model (v3 - Low Poly Accurate)
   ============================================================
   Accurate schematic reconstruction based on official Bayraktar TB2 drawings:
   - Central Fuselage Pod (45mm W × 55mm H) with EO/IR camera turret underneath
   - 1000mm wingspan with 2.5° dihedral and clean bare wings (no pylons)
   - Twin Tail Booms extending back from wings
   - Inverted V-Tail / Joined Triangular Tail Fins (Closed Apex, 110° angle, 70mm height)
   - Pusher Propeller at the rear of the central pod between the twin booms
   - Low-poly aesthetic with flat shading and crisp wireframe accent edges
   ============================================================ */

const Aircraft3D = (() => {
  let scene, camera, renderer, controls;
  let container;
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
    ambient: 0x454545,
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

    // Prevent duplicate canvas
    if (container.querySelector('canvas')) return;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(COLORS.bg);

    const aspect = container.clientWidth / container.clientHeight;
    camera = new THREE.PerspectiveCamera(30, aspect, 0.1, 100);
    camera.position.set(6.5, 4.0, 7.5);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    container.appendChild(renderer.domElement);

    // Lighting setup for rim-lit low-poly look
    scene.add(new THREE.AmbientLight(COLORS.ambient, 0.7));

    const keyLight = new THREE.DirectionalLight(COLORS.keyLight, 0.85);
    keyLight.position.set(6, 12, 6);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const rimLight1 = new THREE.DirectionalLight(COLORS.rimLight, 1.0);
    rimLight1.position.set(-5, 3, -6);
    scene.add(rimLight1);

    const rimLight2 = new THREE.DirectionalLight(COLORS.rimLight, 0.5);
    rimLight2.position.set(6, -2, -4);
    scene.add(rimLight2);

    scene.add(new THREE.HemisphereLight(0x445566, 0x222222, 0.4));

    // Orbit Controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 2;
    controls.maxDistance = 20;
    controls.target.set(0, 0, 0);

    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    tooltip = document.createElement('div');
    tooltip.className = 'model-tooltip';
    tooltip.style.display = 'none';
    container.appendChild(tooltip);

    // ═══ Blender-style Grid Floor ═══
    addBlenderGrid(scene);

    buildAircraft();

    container.addEventListener('mousemove', onMouseMove);
    container.addEventListener('mouseleave', () => { tooltip.style.display = 'none'; });
    window.addEventListener('resize', onResize);

    ['mat_fuselage', 'mat_wing', 'mat_tail', 'mat_mount'].forEach(key => {
      AppState.subscribe(key, () => updateMaterials());
    });

    animate();
  }

  function makeMat(matId, metalness, extraProps) {
    const color = MATERIAL_COLORS[matId] || 0x555555;
    return new THREE.MeshStandardMaterial({
      color,
      roughness: 0.45,
      metalness: metalness || 0.15,
      flatShading: true, // LOW POLY FACETED LOOK!
      emissive: new THREE.Color(COLORS.rimLight),
      emissiveIntensity: 0.03,
      ...extraProps
    });
  }

  function addEdges(mesh, opacity, angleThreshold) {
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(mesh.geometry, angleThreshold || 20),
      new THREE.LineBasicMaterial({ color: 0x666666, transparent: true, opacity: opacity || 0.2 })
    );
    mesh.add(edges);
  }

  function buildAircraft() {
    const d = PlaneData.dimensions;

    // Dimension scaling (1mm = 0.01 units)
    const span = d.wingspan * S;               // 10.0
    const totalLen = d.fuselageLength * S;     // 5.42
    const fuseW = d.fuselageWidth * S;         // 0.45
    const fuseH = d.fuselageHeight * S;        // 0.55
    const rootC = d.wingRootChord * S;         // 0.60
    const tipC = d.wingTipChord * S;           // 0.40
    const vTailH = d.vTailHeight * S;          // 0.70
    const vTailC = d.vTailRootChord * S;       // 0.45
    const vTailAngle = d.vTailAngle;           // 110°
    const noseToWingLE = d.noseToWingLE * S;   // 2.20

    // Coordinate reference:
    // Nose tip at X = +2.40
    // Wing LE at X = 2.40 - 2.20 = +0.20
    // Fuselage pod ends at X = -0.80 (length ~ 3.20)
    // Twin booms extend back to X = -3.02 (Total overall length = 2.40 - (-3.02) = 5.42)
    const noseX = 2.40;
    const wingX = noseX - noseToWingLE; // +0.20
    const podTailX = -0.80;
    const rearX = noseX - totalLen;     // -3.02

    const fuseMat = makeMat(AppState.get('mat_fuselage'));
    const wingMat = makeMat(AppState.get('mat_wing'));
    const tailMat = makeMat(AppState.get('mat_tail'));
    const mountMat = makeMat(AppState.get('mat_mount'));

    // ═══════════════════════════════════════════════════
    // 1. CENTRAL FUSELAGE POD (Bare pod + camera turret + canopy)
    // ═══════════════════════════════════════════════════
    const fuselageGroup = new THREE.Group();
    fuselageGroup.userData = {
      partId: 'fuselage',
      name: 'Central Fuselage Pod',
      dims: `${d.fuselageLength}mm length, 45mm W × 55mm H pod`,
      matKey: 'mat_fuselage'
    };

    // Low-poly Central Fuselage Pod using cylinder with 10 facets
    const podLen = noseX - podTailX; // 3.20
    const podGeo = new THREE.CylinderGeometry(
      fuseW * 0.35, fuseW * 0.48, podLen, 10, 8
    );
    podGeo.rotateZ(Math.PI / 2);
    // Taper nose & tail vertices for realistic Bayraktar pod shape
    const pPos = podGeo.attributes.position;
    for (let i = 0; i < pPos.count; i++) {
      const x = pPos.getX(i);
      const frac = (x + podLen / 2) / podLen; // 0 (tail) to 1 (nose)
      let scaleY = 1.0;
      let scaleZ = 1.0;
      if (frac > 0.7) {
        // Nose rounded taper
        const nt = (frac - 0.7) / 0.3;
        scaleY = Math.cos(nt * Math.PI * 0.5) * 0.9 + 0.1;
        scaleZ = Math.cos(nt * Math.PI * 0.5) * 0.9 + 0.1;
      } else if (frac < 0.25) {
        // Rear motor section taper
        const rt = (0.25 - frac) / 0.25;
        scaleY = 1.0 - rt * 0.35;
        scaleZ = 1.0 - rt * 0.35;
      }
      pPos.setY(i, pPos.getY(i) * scaleY * (fuseH / fuseW)); // Apply 55mm height vs 45mm width
      pPos.setZ(i, pPos.getZ(i) * scaleZ);
    }
    podGeo.computeVertexNormals();

    const podMesh = new THREE.Mesh(podGeo, fuseMat);
    podMesh.position.set((noseX + podTailX) / 2, 0, 0);
    addEdges(podMesh, 0.25);
    fuselageGroup.add(podMesh);

    scene.add(fuselageGroup);
    partGroups.fuselage = fuselageGroup;

    // ═══════════════════════════════════════════════════
    // 2. WINGS (1000mm span, 2.5° Dihedral, Low-Poly Airfoil)
    // ═══════════════════════════════════════════════════
    const wingGroup = new THREE.Group();
    wingGroup.userData = {
      partId: 'wing',
      name: 'Wings (2.5° Dihedral)',
      dims: `Wingspan: ${d.wingspan}mm, Root: ${d.wingRootChord}mm, Tip: ${d.wingTipChord}mm`,
      matKey: 'mat_wing'
    };

    const halfSpan = span / 2; // 5.0 units
    const dihedralRad = (2.5 * Math.PI) / 180; // 2.5° dihedral

    // Create low-poly wing geometry for one side
    function createLowPolyWingGeo() {
      const shape = new THREE.Shape();
      const c = rootC;
      const t = d.wingThicknessRoot * S;
      // Airfoil profile: Leading Edge at (0,0), Trailing Edge at (-c,0)
      shape.moveTo(0, 0);
      shape.lineTo(-c * 0.2, t * 0.8);
      shape.lineTo(-c * 0.5, t);
      shape.lineTo(-c, 0);
      shape.lineTo(-c * 0.4, -t * 0.25);
      shape.closePath();

      const extrudeSettings = {
        steps: 6,
        depth: halfSpan - fuseW * 0.4,
        bevelEnabled: false
      };

      const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      const pos = geo.attributes.position;
      const depth = halfSpan - fuseW * 0.4;

      for (let i = 0; i < pos.count; i++) {
        const z = pos.getZ(i);
        const frac = z / depth; // 0 (root) to 1 (tip)
        const scale = 1 - frac * (1 - tipC / rootC);
        pos.setX(i, pos.getX(i) * scale);
        pos.setY(i, pos.getY(i) * scale);
      }
      geo.computeVertexNormals();
      return geo;
    }

    // Right Wing (with +2.5° dihedral)
    const rWingGeo = createLowPolyWingGeo();
    const rWing = new THREE.Mesh(rWingGeo, wingMat);
    rWing.position.set(wingX, 0, fuseW * 0.4);
    rWing.rotation.x = -dihedralRad; // Dihedral angle up
    addEdges(rWing, 0.25);
    wingGroup.add(rWing);

    // Left Wing (with +2.5° dihedral, mirrored)
    const lWingGeo = createLowPolyWingGeo();
    const lWing = new THREE.Mesh(lWingGeo, wingMat.clone());
    lWing.position.set(wingX, 0, -fuseW * 0.4);
    lWing.scale.z = -1;
    lWing.rotation.x = dihedralRad; // Dihedral angle up
    addEdges(lWing, 0.25);
    wingGroup.add(lWing);

    scene.add(wingGroup);
    partGroups.wing = wingGroup;

    // ═══════════════════════════════════════════════════
    // 3. TWIN TAIL BOOMS (Under wing trailing edge -> Tail)
    // ═══════════════════════════════════════════════════
    const boomGroup = new THREE.Group();
    boomGroup.userData = {
      partId: 'fuselage',
      name: 'Twin Tail Booms',
      dims: `Dual structural booms extending ${Math.round((wingX - rearX)*100)}mm`,
      matKey: 'mat_fuselage'
    };

    const boomSpacing = 1.0; // Distance of booms from center Z (±1.0 units)
    const boomStartX = wingX - rootC * 0.2;
    const boomLen = boomStartX - rearX; // ~3.0 units

    // Low poly cylindrical booms (6 sides)
    const boomGeo = new THREE.CylinderGeometry(0.055, 0.035, boomLen, 6, 4);
    boomGeo.rotateZ(Math.PI / 2);

    // Right Boom
    const rBoom = new THREE.Mesh(boomGeo, fuseMat);
    rBoom.position.set((boomStartX + rearX) / 2, -0.05, boomSpacing);
    addEdges(rBoom, 0.25);
    boomGroup.add(rBoom);

    // Left Boom
    const lBoom = new THREE.Mesh(boomGeo.clone(), fuseMat.clone());
    lBoom.position.set((boomStartX + rearX) / 2, -0.05, -boomSpacing);
    addEdges(lBoom, 0.25);
    boomGroup.add(lBoom);

    scene.add(boomGroup);
    partGroups.booms = boomGroup;

    // ═══════════════════════════════════════════════════
    // 4. INVERTED V-TAIL (Joined Triangular Tail Fins - 110° angle, 70mm height)
    // ═══════════════════════════════════════════════════
    const tailGroup = new THREE.Group();
    tailGroup.userData = {
      partId: 'tail',
      name: 'Joined Inverted V-Tail',
      dims: `110° included angle, ${d.vTailHeight}mm height, ${d.vTailRootChord}mm chord`,
      matKey: 'mat_tail'
    };

    // Joined V-Tail fins meeting seamlessly at top center (Closed Apex, zero gap)
    const halfAngle = (vTailAngle / 2) * (Math.PI / 180); // 55°
    // Exact fin length required so the tips meet at Z = 0:
    const finLen = boomSpacing / Math.sin(Math.PI / 2 - halfAngle);

    function createLowPolyFinGeo() {
      const shape = new THREE.Shape();
      const c = vTailC;
      const h = finLen;
      shape.moveTo(0, 0);
      shape.lineTo(c, 0);
      shape.lineTo(c * 0.4, h); // Meets at top apex tip
      shape.lineTo(c * 0.1, h);
      shape.closePath();

      const geo = new THREE.ExtrudeGeometry(shape, {
        depth: 0.018, bevelEnabled: false
      });
      return geo;
    }

    // Right V-Tail Fin (from right boom up to apex at Z = 0)
    const rFinGeo = createLowPolyFinGeo();
    const rFin = new THREE.Mesh(rFinGeo, tailMat);
    rFin.position.set(rearX, -0.05, boomSpacing);
    rFin.rotation.x = -(Math.PI / 2 - halfAngle);
    addEdges(rFin, 0.3);
    tailGroup.add(rFin);

    // Left V-Tail Fin (from left boom up to apex at Z = 0, meeting right fin with zero gap)
    const lFinGeo = createLowPolyFinGeo();
    const lFin = new THREE.Mesh(lFinGeo, tailMat.clone());
    lFin.position.set(rearX, -0.05, -boomSpacing);
    lFin.rotation.x = (Math.PI / 2 - halfAngle);
    lFin.scale.z = -1;
    addEdges(lFin, 0.3);
    tailGroup.add(lFin);

    scene.add(tailGroup);
    partGroups.tail = tailGroup;

    // ═══════════════════════════════════════════════════
    // 5. PUSHER MOTOR & PROPELLER (At rear of central pod)
    // ═══════════════════════════════════════════════════
    const motorGroup = new THREE.Group();
    motorGroup.userData = {
      partId: 'mount',
      name: 'Motor Mount & Pusher Propeller',
      dims: `Motor Ø: ${d.motorMountDia}mm, Pusher configuration`,
      matKey: 'mat_mount'
    };

    const mountDia = d.motorMountDia * S;

    // Motor Nacelle / Firewall Mount
    const mountGeo = new THREE.CylinderGeometry(mountDia * 0.45, mountDia * 0.5, 0.15, 8);
    mountGeo.rotateZ(Math.PI / 2);
    const mountMesh = new THREE.Mesh(mountGeo, mountMat);
    mountMesh.position.set(podTailX - 0.05, 0, 0);
    addEdges(mountMesh, 0.3);
    motorGroup.add(mountMesh);

    // Spinner Hub
    const spinnerGeo = new THREE.ConeGeometry(mountDia * 0.3, 0.12, 8);
    spinnerGeo.rotateZ(-Math.PI / 2);
    const spinnerMat = new THREE.MeshStandardMaterial({
      color: 0x222222, roughness: 0.3, metalness: 0.7, flatShading: true
    });
    const spinner = new THREE.Mesh(spinnerGeo, spinnerMat);
    spinner.position.set(podTailX - 0.18, 0, 0);
    motorGroup.add(spinner);

    // Low-poly 2-blade pusher propeller
    const propMat = new THREE.MeshStandardMaterial({
      color: 0x111111, roughness: 0.4, metalness: 0.4, flatShading: true
    });
    const bladeGeo = new THREE.BoxGeometry(0.015, 1.1, 0.04);
    const propBlade = new THREE.Mesh(bladeGeo, propMat);
    propBlade.position.set(podTailX - 0.16, 0, 0);
    motorGroup.add(propBlade);

    scene.add(motorGroup);
    partGroups.motor = motorGroup;

    // ═══════════════════════════════════════════════════
    // 6. LANDING GEAR (Tricycle Gear: Nose + 2 Main)
    // ═══════════════════════════════════════════════════
    const gearGroup = new THREE.Group();
    gearGroup.userData = {
      partId: 'fuselage',
      name: 'Landing Gear',
      dims: 'Tricycle setup (1 Nose wheel + 2 Main wheels)',
      matKey: 'mat_fuselage'
    };

    const gearMat = new THREE.MeshStandardMaterial({
      color: 0x444444, metalness: 0.6, roughness: 0.4, flatShading: true
    });
    const wheelMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a, roughness: 0.8, metalness: 0.1, flatShading: true
    });

    // Nose Gear Strut & Wheel
    const noseStrutGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.45, 6);
    const noseStrut = new THREE.Mesh(noseStrutGeo, gearMat);
    noseStrut.position.set(noseX - 0.6, -fuseH * 0.75, 0);
    gearGroup.add(noseStrut);

    const noseWheelGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.03, 8);
    noseWheelGeo.rotateX(Math.PI / 2);
    const noseWheel = new THREE.Mesh(noseWheelGeo, wheelMat);
    noseWheel.position.set(noseX - 0.6, -fuseH * 1.15, 0);
    gearGroup.add(noseWheel);

    // Main Gear Struts & Wheels (Angled out under fuselage)
    [-1, 1].forEach(side => {
      const mainStrutGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.5, 6);
      const mainStrut = new THREE.Mesh(mainStrutGeo, gearMat);
      mainStrut.position.set(wingX + 0.1, -fuseH * 0.75, side * 0.45);
      mainStrut.rotation.z = -side * 0.15;
      gearGroup.add(mainStrut);

      const mainWheelGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.04, 8);
      mainWheelGeo.rotateX(Math.PI / 2);
      const mainWheel = new THREE.Mesh(mainWheelGeo, wheelMat);
      mainWheel.position.set(wingX + 0.1, -fuseH * 1.2, side * 0.65);
      gearGroup.add(mainWheel);
    });

    scene.add(gearGroup);
    partGroups.gear = gearGroup;

    // ═══════════════════════════════════════════════════
    // 7. ENGINEERING DIMENSION ANNOTATION LINES
    // ═══════════════════════════════════════════════════
    const lineMatRed = new THREE.LineBasicMaterial({ color: 0xe74c3c, transparent: true, opacity: 0.6 });
    const lineMatGreen = new THREE.LineBasicMaterial({ color: 0x2ecc71, transparent: true, opacity: 0.6 });
    const lineMatYellow = new THREE.LineBasicMaterial({ color: 0xf1c40f, transparent: true, opacity: 0.6 });

    // Wingspan Callout (Red line across Z axis)
    const wPts = [
      new THREE.Vector3(wingX, 0.35, -halfSpan),
      new THREE.Vector3(wingX, 0.35, halfSpan)
    ];
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(wPts), lineMatRed));
    createTextSprite(`${d.wingspan}mm Span`, wingX, 0.55, 0, 0xe74c3c);

    // Fuselage Overall Length Callout (Green line along X axis)
    const fPts = [
      new THREE.Vector3(rearX, -fuseH * 1.5, 0),
      new THREE.Vector3(noseX, -fuseH * 1.5, 0)
    ];
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(fPts), lineMatGreen));
    createTextSprite(`${d.fuselageLength}mm Length`, (noseX + rearX) / 2, -fuseH * 2.1, 0, 0x2ecc71);

    // V-Tail Height Callout (Yellow)
    createTextSprite(`V-Tail ${vTailAngle}° (${d.vTailHeight}mm)`, rearX, vTailH * 1.1, 0, 0xf1c40f);

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
    const spread = 1.4;
    Object.entries(partGroups).forEach(([key, group]) => {
      const ap = partPositions.assembled[key];
      const ep = { x: ap.x, y: ap.y, z: ap.z };

      switch (key) {
        case 'fuselage':
          ep.x += spread * 0.6;
          break;
        case 'wing':
          ep.y += spread * 0.75;
          break;
        case 'booms':
          ep.y -= spread * 0.3;
          ep.z *= 1.4;
          break;
        case 'tail':
          ep.x -= spread * 1.2;
          ep.y += spread * 0.4;
          break;
        case 'motor':
          ep.x -= spread * 1.8;
          break;
        case 'gear':
          ep.y -= spread * 0.9;
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
    ctx.font = 'bold 30px Inter, sans-serif';
    ctx.fillStyle = '#' + color.toString(16).padStart(6, '0');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.position.set(x, y, z);
    sprite.scale.set(1.4, 0.18, 1);
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
      motor: 'mat_mount',
      booms: 'mat_fuselage'
    };

    Object.entries(map).forEach(([groupKey, stateKey]) => {
      const matId = AppState.get(stateKey);
      const color = MATERIAL_COLORS[matId] || 0x555555;
      const group = partGroups[groupKey];
      if (!group) return;

      group.traverse(child => {
        if (child.isMesh && child.material && child.material.emissive) {
          // Keep special components intact (gimbal glass, wheels, prop blades, etc.)
          if (child.material.metalness > 0.6 ||
              child.material.color.getHex() === 0x111111 ||
              child.material.color.getHex() === 0x1a1a1a ||
              child.material.color.getHex() === 0x222222 ||
              child.material.color.getHex() === 0x3498db) return;

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

    const allMeshes = [];
    Object.values(partGroups).forEach(group => {
      group.traverse(child => { if (child.isMesh) allMeshes.push(child); });
    });

    const intersects = raycaster.intersectObjects(allMeshes);

    if (hoveredPart) {
      hoveredPart.traverse(child => {
        if (child.isMesh && child.material.emissive) {
          child.material.emissiveIntensity = 0.03;
        }
      });
      hoveredPart = null;
    }

    if (intersects.length > 0) {
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
            child.material.emissiveIntensity = 0.18;
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

  function animate() {
    requestAnimationFrame(animate);
    controls.update();

    // Rotate propeller blades
    if (partGroups.motor) {
      partGroups.motor.children.forEach(child => {
        if (child.geometry && child.geometry.type === 'BoxGeometry' && child.position.x < -0.8) {
          child.rotation.x += 0.12;
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
        endPos = { x: 0.01, y: 11, z: 0 };
        break;
      case 'side':
        endPos = { x: 0, y: 0.2, z: 11 };
        break;
      case 'front':
        endPos = { x: 11, y: 0.2, z: 0 };
        break;
      default: // isometric
        endPos = { x: 6.5, y: 4.0, z: 7.5 };
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
