// --- Constants ---
const WORLD_SIZE = 10000;
const MAX_SPEED = 150;

let scene, camera, renderer;
let plane;
let terrainParams = []; // Store biome data
// Physics & Controls
let throttle = 0; // 0.0 to 1.0
let engineOn = true;
let speed = 0;
let velocity = new THREE.Vector3();
let startRunwayPos = new THREE.Vector3(0, -3.0, 150);
let fullMapOpen = false;

// Inputs
const keys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
    KeyW: false, // Throttle Up
    KeyD: false, // Throttle Down
    KeyV: false, // Toggle Engine
    KeyE: false  // Toggle Map
};

// --- Init ---
function init() {
    // Scene Setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.Fog(0x87CEEB, 200, 7000); // Distance fog

    // Camera
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 10000);
    camera.position.set(0, 10, 30);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('game-container').appendChild(renderer.domElement);

    // Light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xFFD700, 1.2);
    dirLight.position.set(100, 300, 100);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 4096;
    dirLight.shadow.mapSize.height = 4096;
    dirLight.shadow.camera.left = -500;
    dirLight.shadow.camera.right = 500;
    dirLight.shadow.camera.top = 500;
    dirLight.shadow.camera.bottom = -500;
    scene.add(dirLight);

    // World & Objects
    createWorld();
    createPlane(); // (Preserved Function)

    // Setup Start
    resetPlayer();

    // Listeners
    window.addEventListener('resize', onWindowResize);
    window.addEventListener('keydown', (e) => {
        if (keys.hasOwnProperty(e.code)) keys[e.code] = true;
        if (e.code === 'KeyV' && !e.repeat) toggleEngine();
        if (e.code === 'KeyE' && !e.repeat) toggleMap();
    });
    window.addEventListener('keyup', (e) => {
        if (keys.hasOwnProperty(e.code)) keys[e.code] = false;
    });

    // UI
    document.getElementById('start-btn').addEventListener('click', startGame);
    if (document.getElementById('restart-btn')) document.getElementById('restart-btn').addEventListener('click', resetGame);

    // Start Loop
    requestAnimationFrame(animate);
}

function toggleEngine() {
    engineOn = !engineOn;
    console.log("Engine State: " + engineOn);
}

function resetPlayer() {
    // Place at Fields Airport
    plane.position.copy(startRunwayPos);
    plane.rotation.set(0, Math.PI, 0); // Face South (Runway direction)
    speed = 0;
    throttle = 0;
    engineOn = true;
}

function createPlane() {
    const group = new THREE.Group();

    // -- Materials --
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x8899aa, roughness: 0.3, metalness: 0.6 });
    const darkPaintMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.2, metalness: 0.5 });
    const windowMat = new THREE.MeshStandardMaterial({ color: 0x112233, roughness: 0.1, metalness: 0.9 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, metalness: 0.9, roughness: 0.1 });

    // == FUSELAGE ==
    const points = [];
    points.push(new THREE.Vector2(0.1, -4.0));
    points.push(new THREE.Vector2(0.4, -3.0));
    points.push(new THREE.Vector2(0.7, -1.0));
    points.push(new THREE.Vector2(0.9, 0.0));
    points.push(new THREE.Vector2(0.95, 1.0));
    points.push(new THREE.Vector2(0.90, 2.0));
    points.push(new THREE.Vector2(0.85, 3.0));
    points.push(new THREE.Vector2(0.6, 3.8));
    points.push(new THREE.Vector2(0.3, 4.0));
    points.push(new THREE.Vector2(0, 4.0));

    const fuselageGeom = new THREE.LatheGeometry(points, 32);
    const fuselage = new THREE.Mesh(fuselageGeom, bodyMat);
    fuselage.rotation.x = -Math.PI / 2;
    fuselage.castShadow = true;
    group.add(fuselage);

    // Cowl
    const cowlGeom = new THREE.CylinderGeometry(0.85, 0.9, 1.1, 32);
    const cowl = new THREE.Mesh(cowlGeom, darkPaintMat);
    cowl.rotation.x = -Math.PI / 2;
    cowl.position.set(0, 0, 2.5);
    group.add(cowl);

    // Windows
    const windshield = new THREE.Mesh(new THREE.SphereGeometry(0.8, 32, 16, 0, Math.PI * 2, 0, 1.1), windowMat);
    windshield.position.set(0, 0.5, 1.8);
    windshield.rotation.x = -0.4;
    windshield.scale.set(1.05, 0.7, 1.2);
    group.add(windshield);

    // Wings
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.lineTo(7.0, 0);
    wingShape.lineTo(7.0, 0.8);
    wingShape.lineTo(5.0, 1.4);
    wingShape.lineTo(0, 2.0);
    const wingGeom = new THREE.ExtrudeGeometry(wingShape, { depth: 0.15, bevelEnabled: true, bevelThickness: 0.05 });

    const wingL = new THREE.Mesh(wingGeom, bodyMat);
    wingL.rotation.set(-Math.PI / 2, 0, Math.PI);
    wingL.position.set(-0.8, -0.3, 1.0);
    wingL.castShadow = true;
    group.add(wingL);

    const wingR = new THREE.Mesh(wingGeom, bodyMat);
    wingR.rotation.set(-Math.PI / 2, 0, 0);
    wingR.position.set(0.8, -0.3, 1.0);
    wingR.castShadow = true;
    group.add(wingR);

    // Tail
    const vStabShape = new THREE.Shape();
    vStabShape.moveTo(0, 0);
    vStabShape.lineTo(2.0, 0);
    vStabShape.lineTo(1.0, 2.8);
    vStabShape.lineTo(0.0, 1.8);
    vStabShape.quadraticCurveTo(-1.5, 0.5, -3.0, 0);
    const vStab = new THREE.Mesh(new THREE.ExtrudeGeometry(vStabShape, { depth: 0.12 }), bodyMat);
    vStab.rotation.set(0, -Math.PI / 2, 0);
    vStab.position.set(0.06, 0.6, -3.0);
    group.add(vStab);

    const hStabShape = new THREE.Shape();
    hStabShape.moveTo(0, 0);
    hStabShape.lineTo(2.5, 0.2);
    hStabShape.lineTo(2.5, 0.9);
    hStabShape.lineTo(0, 1.2);
    const hStabGeom = new THREE.ExtrudeGeometry(hStabShape, { depth: 0.1 });
    const hStabL = new THREE.Mesh(hStabGeom, bodyMat);
    hStabL.rotation.set(-Math.PI / 2, 0, Math.PI);
    hStabL.position.set(-0.2, 0.5, -3.5);
    group.add(hStabL);
    const hStabR = new THREE.Mesh(hStabGeom, bodyMat);
    hStabR.rotation.set(-Math.PI / 2, 0, 0);
    hStabR.position.set(0.2, 0.5, -3.5);
    group.add(hStabR);

    // Prop
    const propGroup = new THREE.Group();
    const spinner = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.0, 32), darkPaintMat);
    spinner.rotation.x = Math.PI / 2;
    spinner.position.z = 0.2;
    propGroup.add(spinner);
    const bladeGeom = new THREE.BoxGeometry(0.12, 2.2, 0.05);
    const bladeMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    for (let i = 0; i < 3; i++) {
        const blade = new THREE.Mesh(bladeGeom, bladeMat);
        blade.position.y = 1.0;
        const pivot = new THREE.Group();
        pivot.add(blade);
        pivot.rotation.z = (i / 3) * Math.PI * 2;
        propGroup.add(pivot);
    }
    propGroup.position.set(0, 0, 4.0);
    group.add(propGroup);
    group.userData.prop = propGroup;

    // Gear
    const createGear = (xSign) => {
        const pant = new THREE.Mesh(new THREE.SphereGeometry(0.4, 32, 32).scale(0.8, 0.8, 2.5), bodyMat);
        pant.position.set(xSign * 2.0, -1.5, 0.5);
        group.add(pant);
        const strut = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.0, 0.4), bodyMat);
        strut.position.set(xSign * 1.4, -0.9, 0.5);
        strut.rotation.z = xSign * 0.5;
        group.add(strut);
    };
    createGear(-1);
    createGear(1);
    const nosePant = new THREE.Mesh(new THREE.SphereGeometry(0.4, 32, 32).scale(0.6, 0.6, 2.0), bodyMat);
    nosePant.position.set(0, -1.5, 3.0);
    group.add(nosePant);
    const noseStrut = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.8), chromeMat);
    noseStrut.position.set(0, -1.0, 3.0);
    group.add(noseStrut);

    // Orient
    // group.rotation.y = Math.PI; // REMOVED: User says it faces backwards. Let's keep it default (0).
    // Actually, if model faces -Z (Forward), and we want it to face +Z (South) at start?
    // Let's rely on resetPlayer rotation.
    // Ensure rotation order avoids roll artifacts
    group.rotation.order = 'YXZ';
    scene.add(group);
    plane = group;
}

// --- World Generation ---

function createWorld() {
    // 0. Ocean
    const oceanGeom = new THREE.PlaneGeometry(WORLD_SIZE * 2, WORLD_SIZE * 2);
    const oceanMat = new THREE.MeshStandardMaterial({ color: 0x1da2d8, roughness: 0.1, metalness: 0.1 });
    const ocean = new THREE.Mesh(oceanGeom, oceanMat);
    ocean.rotation.x = -Math.PI / 2;
    ocean.position.y = -10;
    scene.add(ocean);

    // 1. Fields Area (Center)
    createBiome(0, 0, 0x55aa55, "fields");

    // 2. Arctic Area (North) - Further away
    createBiome(0, -3500, 0xffffff, "arctic");

    // 3. Desert Area (East)
    createBiome(3500, 0, 0xeeddaa, "desert");

    // 4. Forest Area (West)
    createBiome(-3500, 0, 0x004400, "forest");
}

function getTerrainHeight(x, z, ox, oz, size, type) {
    // Distance from island center
    const dx = x - ox;
    const dz = z - oz;

    // Shape Mask
    let mask = 0;
    const radius = size / 2.2;

    // Normalized coordinates (-1 to 1 approx)
    const u = dx / radius;
    const v = dz / radius;
    const d = Math.sqrt(u * u + v * v);

    if (type === "arctic") {
        // Triangle/Star-ish
        const angle = Math.atan2(dz, dx);
        const rNorm = 1.0 + 0.3 * Math.sin(5 * angle);
        if (d < rNorm) {
            mask = Math.min(1.0, (rNorm - d) * 5.0);
        }
    } else if (type === "desert") {
        // Bar/Rectangle
        const w = 0.8;
        const h = 0.4;
        const dxBox = Math.max(0, Math.abs(u) - w);
        const dzBox = Math.max(0, Math.abs(v) - h);
        const distBox = Math.sqrt(dxBox * dxBox + dzBox * dzBox);
        if (distBox < 0.2) {
            mask = Math.min(1.0, (0.2 - distBox) * 5.0);
        }
    } else if (type === "forest") {
        // Crescent
        const d1 = d;
        const d2 = Math.sqrt(Math.pow(u - 0.5, 2) + Math.pow(v, 2));
        if (d1 < 1.0 && d2 > 0.4) {
            let m1 = (1.0 - d1) * 5.0;
            let m2 = (d2 - 0.4) * 5.0;
            mask = Math.min(1.0, Math.min(m1, m2));
        }
    } else {
        // Default Circle (Fields)
        if (d < 1.0) {
            mask = Math.min(1.0, (1.0 - d) * 5.0);
        }
    }

    mask = Math.max(0, Math.min(1, mask));

    // Underwater check
    if (mask <= 0.01) return -50;

    // Flat airport area
    if (type === "fields" && Math.sqrt(dx * dx + dz * dz) < 300) return -4.1;

    // Hills
    const noise = (Math.sin(x * 0.01) + Math.cos(z * 0.01)) * 10 + (Math.sin(x * 0.03) + Math.cos(z * 0.03)) * 5;

    // Coastline transition
    return -50 + (46 + Math.max(0, noise)) * mask;
}

function createBiome(ox, oz, colorHex, type) {
    const size = 2500;
    terrainParams.push({ ox, oz, size, type });

    const segs = 64;
    const geom = new THREE.PlaneGeometry(size, size, segs, segs);

    const posAttr = geom.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
        const localX = posAttr.getX(i);
        const localY = posAttr.getY(i);
        const worldX = ox + localX;
        const worldZ = oz - localY;

        const h = getTerrainHeight(worldX, worldZ, ox, oz, size, type);
        posAttr.setZ(i, h);
    }

    geom.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.9, flatShading: true });
    const ground = new THREE.Mesh(geom, mat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(ox, 0, oz);
    ground.receiveShadow = true;
    scene.add(ground);

    populateBiome(ox, oz, size, type);
    if (type === "fields") createGenericAirport(ox, oz);
}

function createGenericAirport(x, z) {
    const group = new THREE.Group();
    const rwGeom = new THREE.PlaneGeometry(30, 600);
    const rwMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const rw = new THREE.Mesh(rwGeom, rwMat);
    rw.rotation.x = -Math.PI / 2;
    rw.receiveShadow = true;
    group.add(rw);
    group.position.set(x, -4.0, z);
    scene.add(group);
}

function populateBiome(ox, oz, size, type) {
    const count = 100;
    for (let i = 0; i < count; i++) {
        const x = ox + (Math.random() - 0.5) * size;
        const z = oz + (Math.random() - 0.5) * size;

        if (type === "fields" && Math.abs(x - ox) < 40 && Math.abs(z - oz) < 350) continue;

        const mesh = createProp(type);
        if (mesh) {
            const h = getTerrainHeight(x, z, ox, oz, size, type);
            if (h > -10) {
                mesh.position.set(x, h, z);
                scene.add(mesh);
            }
        }
    }
}

function createProp(type) {
    const group = new THREE.Group();
    if (type === "fields" || type === "forest") {
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.8, 4), new THREE.MeshStandardMaterial({ color: 0x8B4513 }));
        trunk.position.y = 2;
        group.add(trunk);
        const leaves = new THREE.Mesh(new THREE.ConeGeometry(3, 8, 8), new THREE.MeshStandardMaterial({ color: type === "forest" ? 0x003300 : 0x228B22 }));
        leaves.position.y = 6;
        group.add(leaves);
    } else if (type === "arctic") {
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.8, 4), new THREE.MeshStandardMaterial({ color: 0xccccff }));
        trunk.position.y = 2;
        group.add(trunk);
        const leaves = new THREE.Mesh(new THREE.ConeGeometry(3, 8, 4), new THREE.MeshStandardMaterial({ color: 0xffffff }));
        leaves.position.y = 6;
        group.add(leaves);
    } else if (type === "desert") {
        const c = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 6), new THREE.MeshStandardMaterial({ color: 0x669900 }));
        c.position.y = 3;
        group.add(c);
    }
    return group;
}

function update(dt) {
    const delta = dt * 10;

    // Throttle
    if (keys.KeyW) throttle = Math.min(throttle + 0.01 * delta, 1.0);
    if (keys.KeyD) throttle = Math.max(throttle - 0.02 * delta, 0.0);

    if (!engineOn) {
        throttle = Math.max(throttle - 0.01 * delta, 0.0);
        document.getElementById('status').innerText = "Engine OFF";
    } else {
        document.getElementById('status').innerText = `Throttle: ${Math.floor(throttle * 100)}%`;
    }

    // Physics
    const accel = engineOn ? throttle * 40.0 : 0;
    const drag = speed * (40.0 / MAX_SPEED);

    speed += (accel - drag) * dt;
    if (speed < 0) speed = 0;

    const pitchSpeed = 1.5 * dt;
    const rollSpeed = 2.0 * dt;
    const yawSpeed = 1.0 * dt;

    // Lift / Stall Logic (Stall: 50, Takeoff: 60)
    let liftFactor = 0;
    if (speed > 60) liftFactor = 1.0;
    else if (speed > 50) liftFactor = (speed - 50) / 10.0;
    else liftFactor = 0;

    // Pitch
    if (keys.ArrowUp) plane.rotation.x -= pitchSpeed;
    if (keys.ArrowDown) plane.rotation.x += pitchSpeed;

    const isOnGround = plane.position.y < -3.0;

    if (isOnGround) {
        // Steering
        if (keys.ArrowLeft) plane.rotation.y += yawSpeed;
        if (keys.ArrowRight) plane.rotation.y -= yawSpeed;
        plane.rotation.z *= 0.9;
        plane.rotation.x *= 0.9;
    } else {
        // Banking
        if (keys.ArrowLeft) plane.rotation.z += rollSpeed;
        if (keys.ArrowRight) plane.rotation.z -= rollSpeed;
        plane.rotation.y += plane.rotation.z * dt * 0.8;
        if (!keys.ArrowLeft && !keys.ArrowRight) plane.rotation.z *= 0.98;
    }

    velocity.set(0, 0, -speed).applyEuler(plane.rotation);
    plane.position.add(velocity.multiplyScalar(dt));

    if (!isOnGround) {
        plane.position.y -= 9.8 * dt; // Gravity

        if (liftFactor > 0) {
            plane.position.y += 9.8 * dt * liftFactor;
            const pitch = -plane.rotation.x;
            if (pitch > 0) {
                plane.position.y += pitch * speed * dt * 0.5 * liftFactor;
            } else {
                plane.position.y += pitch * speed * dt * 0.5;
            }
        } else {
            plane.rotation.x += 1.0 * dt; // Stall pitch down
            if (speed < 50) document.getElementById('status').innerText = "STALL!";
        }
    }

    // Ground Collision
    let groundHeight = -10;
    for (let b of terrainParams) {
        const dist = Math.sqrt(Math.pow(plane.position.x - b.ox, 2) + Math.pow(plane.position.z - b.oz, 2));
        if (dist < b.size * 0.7) {
            const h = getTerrainHeight(plane.position.x, plane.position.z, b.ox, b.oz, b.size, b.type);
            if (h > groundHeight) groundHeight = h;
        }
    }

    if (plane.position.y < groundHeight + 0.5) {
        plane.position.y = groundHeight + 0.5;
    }

    // Camera Chase
    const relativeOffset = new THREE.Vector3(0, 10, 30);
    const idealPos = plane.position.clone().add(relativeOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), plane.rotation.y));
    camera.position.lerp(idealPos, 0.1);
    camera.lookAt(plane.position);

    // Prop
    if (plane.userData.prop && engineOn) {
        plane.userData.prop.rotation.z += speed * dt * 5 + (throttle * 1.0);
    }

    document.getElementById('speed-indicator').innerText = Math.floor(speed) + " kts";
}

function animate(time) {
    requestAnimationFrame(animate);
    const dt = 0.016;
    update(dt);
    updateMap();
    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function startGame() {
    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('hud').style.display = 'block';
    document.getElementById('minimap').style.display = 'block';
    fullMapOpen = false;
    document.getElementById('full-map-overlay').classList.add('hidden');
    resetPlayer();
    engineOn = true;
}

function resetGame() {
    resetPlayer();
}

function toggleMap() {
    fullMapOpen = !fullMapOpen;
    const el = document.getElementById('full-map-overlay');
    if (fullMapOpen) el.classList.remove('hidden');
    else el.classList.add('hidden');
}

function updateMap() {
    const mmCanvas = document.getElementById('minimap');
    if (mmCanvas.style.display !== 'none') {
        drawMap(mmCanvas.getContext('2d'), mmCanvas.width, mmCanvas.height, plane.position.x, plane.position.z, 5000);
    }
    if (fullMapOpen) {
        const fmCanvas = document.getElementById('full-map');
        if (fmCanvas.width !== fmCanvas.clientWidth) {
            fmCanvas.width = fmCanvas.clientWidth;
            fmCanvas.height = fmCanvas.clientHeight;
        }
        drawMap(fmCanvas.getContext('2d'), fmCanvas.width, fmCanvas.height, 0, 0, 15000);
    }
}

function drawMap(ctx, w, h, focusX, focusZ, range) {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#1da2d8";
    ctx.fillRect(0, 0, w, h);
    const scale = w / range;
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(scale, scale);
    ctx.translate(-focusX, -focusZ);

    terrainParams.forEach(b => {
        let color = "#55aa55";
        if (b.type === "arctic") color = "#ffffff";
        if (b.type === "desert") color = "#eeddaa";
        if (b.type === "forest") color = "#004400";
        ctx.fillStyle = color;
        ctx.beginPath();
        if (b.type === "arctic") {
            for (let i = 0; i < 5; i++) {
                const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
                const r = b.size / 2.2 * (i % 2 === 0 ? 1.0 : 0.5);
                const px = b.ox + Math.cos(angle) * r;
                const pz = b.oz + Math.sin(angle) * r;
                if (i === 0) ctx.moveTo(px, pz); else ctx.lineTo(px, pz);
            }
        } else if (b.type === "desert") {
            const w = b.size / 2.2 * 1.6;
            const h = b.size / 2.2 * 0.8;
            ctx.rect(b.ox - w / 2, b.oz - h / 2, w, h);
        } else if (b.type === "forest") {
            ctx.arc(b.ox, b.oz, b.size / 2.2, 0.5, Math.PI * 2 - 0.5);
        } else {
            ctx.arc(b.ox, b.oz, b.size / 2.2, 0, Math.PI * 2);
        }
        ctx.closePath();
        ctx.fill();
    });

    ctx.translate(plane.position.x, plane.position.z);
    ctx.rotate(plane.rotation.y);
    ctx.fillStyle = "red";
    ctx.strokeStyle = "white";
    ctx.lineWidth = 20;
    ctx.beginPath();
    ctx.moveTo(0, -150);
    ctx.lineTo(80, 100);
    ctx.lineTo(0, 70);
    ctx.lineTo(-80, 100);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
}

window.onload = init;
