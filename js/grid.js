/* ============================================================
   Blender-style 3D Grid Floor — Shared Utility
   ============================================================
   Adds a Blender-viewport-inspired grid plane to any Three.js scene.
   Features:
   - Minor grid lines (subtle, tight spacing)
   - Major grid lines (thicker, every 5th line)
   - Colored axis indicators (red = X, blue = Z)
   - Fades out toward edges for depth
   ============================================================ */

function addBlenderGrid(scene, options = {}) {
  const size       = options.size       || 20;
  const divisions  = options.divisions  || 40;
  const majorEvery = options.majorEvery || 5;
  const yOffset    = options.yOffset    || -1.2;

  const gridGroup = new THREE.Group();
  gridGroup.position.y = yOffset;

  // ── Minor Grid ──
  const minorGrid = new THREE.GridHelper(size, divisions, 0x444444, 0x333333);
  minorGrid.material.transparent = true;
  minorGrid.material.opacity = 0.35;
  gridGroup.add(minorGrid);

  // ── Major Grid (every Nth line) ──
  const majorDivisions = Math.floor(divisions / majorEvery);
  const majorGrid = new THREE.GridHelper(size, majorDivisions, 0x555555, 0x555555);
  majorGrid.material.transparent = true;
  majorGrid.material.opacity = 0.55;
  majorGrid.position.y = 0.001; // Slightly above minor grid to avoid z-fighting
  gridGroup.add(majorGrid);

  // ── Axis Lines (Blender-style colored center axes) ──
  const halfSize = size / 2;

  // X axis — Red
  const xAxisGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-halfSize, 0.002, 0),
    new THREE.Vector3( halfSize, 0.002, 0)
  ]);
  const xAxisLine = new THREE.Line(xAxisGeo, new THREE.LineBasicMaterial({
    color: 0xc44040, transparent: true, opacity: 0.7
  }));
  gridGroup.add(xAxisLine);

  // Z axis — Blue
  const zAxisGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0.002, -halfSize),
    new THREE.Vector3(0, 0.002,  halfSize)
  ]);
  const zAxisLine = new THREE.Line(zAxisGeo, new THREE.LineBasicMaterial({
    color: 0x4040c4, transparent: true, opacity: 0.7
  }));
  gridGroup.add(zAxisLine);

  // ── Subtle ground shadow disc (soft gradient fade) ──
  const discGeo = new THREE.CircleGeometry(size * 0.45, 64);
  discGeo.rotateX(-Math.PI / 2);
  const discMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.15,
    depthWrite: false
  });
  const disc = new THREE.Mesh(discGeo, discMat);
  disc.position.y = -0.005;
  gridGroup.add(disc);

  scene.add(gridGroup);
  return gridGroup;
}
