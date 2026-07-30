/**
 * hero-gpu.js — "Ocean Pulse" hero visual
 *
 * three.js WebGPURenderer: WebGPU when the browser has it, automatic WebGL2
 * fallback otherwise. Particle motion runs in a GPU compute shader on WebGPU
 * (persistent velocities, pointer vortex, sonar pulse) and in an analytic
 * vertex-stage version on WebGL2, so both backends draw the same picture.
 *
 * The canvas is transparent and composites over the existing hero artwork.
 * Loaded lazily from script.js — never blocks first paint.
 */
import * as THREE from './vendor/three.webgpu.min.js';

const {
    Fn, uniform, instanceIndex, instancedArray, hash, time,
    vec2, vec3, vec4, float,
    mix, smoothstep, saturate, normalize, cross, length,
    sin, cos, abs, pow, fract, max, oneMinus, step,
    uv, screenUV, positionLocal, color,
    mx_fractal_noise_vec3, mx_fractal_noise_float
} = THREE.TSL;

const TAU = Math.PI * 2;

/* Field the particles live in (world units, half-extents). */
const FIELD = { x: 34, y: 19, z: 18 };

/* Palette — matches the CSS custom properties in style.css. */
const COL_DEEP = 0x0a3d68;
const COL_ACCENT = 0x33d5ff;
const COL_FOAM = 0xdff8ff;
const COL_INDIGO = 0x4f7cff;

function particleBudget() {
    const mem = navigator.deviceMemory || 4;
    const cores = navigator.hardwareConcurrency || 4;
    const narrow = Math.min(window.innerWidth, window.innerHeight) < 700;

    if (narrow) return mem <= 3 ? 26000 : 48000;
    if (cores <= 4 || mem <= 4) return 90000;
    return 160000;
}

/**
 * Where a particle wants to be at time t — shared by both backends.
 * ~42% of the particles ride a slow lissajous "song ribbon" (an echo of the
 * luminous staff on the 魚歌 cover); the rest drift as free plankton.
 */
function targetPosition(seedA, seedB, seedC, isRibbon, t) {
    // Ribbon: a long, lazily coiling stream through the middle of the frame.
    const phase = seedA.mul(TAU * 3).add(t.mul(0.22));
    const ribbon = vec3(
        sin(phase).mul(21.0).add(sin(phase.mul(0.37).add(1.1)).mul(7.0)),
        sin(phase.mul(0.61).add(1.7)).mul(6.4).add(sin(phase.mul(2.3)).mul(1.1)),
        cos(phase.mul(0.83)).mul(10.0).sub(2.0)
    );
    // Thickness of the stream, so it reads as a band of light and not a wire.
    const ribbonThick = ribbon.add(vec3(
        seedB.sub(0.5).mul(2.4),
        seedC.sub(0.5).mul(1.5),
        seedB.mul(seedC).sub(0.5).mul(2.2)
    ));

    // Plankton: static scatter, slowly rising, wrapped inside the field box.
    const rise = seedC.mul(0.35).add(0.12);
    const driftY = seedB.mul(FIELD.y * 2).add(t.mul(rise));
    const plankton = vec3(
        seedA.sub(0.5).mul(FIELD.x * 2),
        fract(driftY.div(FIELD.y * 2)).sub(0.5).mul(FIELD.y * 2),
        seedC.sub(0.5).mul(FIELD.z * 2)
    );

    return mix(plankton, ribbonThick, isRibbon);
}

/** Low-frequency current shared by the compute and analytic paths. */
function currentAt(position, t) {
    const p = position.mul(0.042).add(vec3(0.0, t.mul(0.05), t.mul(0.03)));
    return mx_fractal_noise_vec3(p, 3, 2.0, 0.5).mul(1.0);
}

export async function initHeroGPU(options = {}) {
    const host = options.host || document.getElementById('hero');
    if (!host) throw new Error('hero host not found');
    if (!navigator.gpu && !document.createElement('canvas').getContext('webgl2')) {
        throw new Error('no WebGPU and no WebGL2');
    }

    const params = new URLSearchParams(location.search);
    const forceWebGL = params.get('gl') === '1';

    const canvas = document.createElement('canvas');
    canvas.className = 'hero-gpu';
    canvas.setAttribute('aria-hidden', 'true');

    const renderer = new THREE.WebGPURenderer({
        canvas,
        alpha: true,
        antialias: false,
        forceWebGL,
        powerPreference: 'high-performance'
    });
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.NoToneMapping;
    await renderer.init();

    const isWebGPU = !!(renderer.backend && renderer.backend.isWebGPUBackend);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 240);
    camera.position.set(0, 0, 30);

    /* ---------------------------------------------------------------- uniforms */
    const uDt = uniform(1 / 60);
    const uIntensity = uniform(0);            // fade-in
    const uDive = uniform(0);                 // 0 at top of hero, 1 when scrolled past
    const uPointer = uniform(new THREE.Vector3(0, 0, 0));
    const uPointerAmt = uniform(0);
    const uPulse = uniform(1);                // 0 → 1 sweep, 1 = spent
    const uPulseAmt = uniform(0);

    /* --------------------------------------------------------------- particles */
    let count = particleBudget();
    const maxCount = count;

    const seedA = hash(instanceIndex.mul(3).add(11));
    const seedB = hash(instanceIndex.mul(3).add(29));
    const seedC = hash(instanceIndex.mul(3).add(53));
    const isRibbon = step(hash(instanceIndex.mul(7).add(3)), 0.42);

    let positionNode;
    let speedNode;              // 0..1, drives colour and size
    let updateCompute = null;

    if (isWebGPU) {
        const positionBuffer = instancedArray(maxCount, 'vec3');
        const velocityBuffer = instancedArray(maxCount, 'vec3');

        const computeInit = Fn(() => {
            const pos = positionBuffer.element(instanceIndex);
            const vel = velocityBuffer.element(instanceIndex);
            pos.assign(targetPosition(seedA, seedB, seedC, isRibbon, float(0)));
            vel.assign(vec3(0.0));
        })().compute(maxCount);

        updateCompute = Fn(() => {
            const pos = positionBuffer.element(instanceIndex);
            const vel = velocityBuffer.element(instanceIndex);

            // Steer ribbon riders toward the stream; let plankton wander.
            const target = targetPosition(seedA, seedB, seedC, isRibbon, time).toVar();
            const spring = isRibbon.mul(2.6).add(0.22);
            const steer = target.sub(pos).mul(spring);

            // Turbulence, stronger on the free particles.
            const swirl = currentAt(pos, time).mul(oneMinus(isRibbon.mul(0.65))).mul(2.4);

            // Pointer vortex: push away and orbit.
            const toPointer = pos.sub(uPointer).toVar();
            const dist = toPointer.length().max(0.001);
            const grip = smoothstep(15.0, 1.5, dist).mul(uPointerAmt);
            const orbit = normalize(cross(toPointer, vec3(0.0, 0.0, 1.0))).mul(grip.mul(9.0));
            const repel = toPointer.div(dist).mul(grip.mul(5.0));

            // Sonar pulse: an expanding shell of pressure from the centre.
            const radius = uPulse.mul(46.0);
            const shell = smoothstep(4.5, 0.0, abs(pos.length().sub(radius)))
                .mul(oneMinus(uPulse))
                .mul(uPulseAmt)
                .mul(26.0);
            const blast = normalize(pos.add(vec3(0.0001))).mul(shell);

            vel.addAssign(steer.add(swirl).add(orbit).add(repel).add(blast).mul(uDt));
            vel.mulAssign(pow(float(0.045), uDt));          // frame-rate independent drag
            pos.addAssign(vel.mul(uDt));

            // Wrap the free particles so the field never empties.
            const span = vec3(FIELD.x * 2, FIELD.y * 2, FIELD.z * 2);
            const wrapped = fract(pos.div(span).add(0.5)).sub(0.5).mul(span);
            pos.assign(mix(wrapped, pos, isRibbon));
        })().compute(maxCount);

        await renderer.computeAsync(computeInit);

        positionNode = positionBuffer.toAttribute();
        speedNode = saturate(velocityBuffer.toAttribute().length().mul(0.14));
    } else {
        // WebGL2: no compute stage, so evaluate the motion analytically.
        const base = targetPosition(seedA, seedB, seedC, isRibbon, time).toVar();
        const wobble = currentAt(base, time).mul(oneMinus(isRibbon.mul(0.6))).mul(2.2);

        // Cheap stand-ins for the pointer vortex and the sonar pulse.
        const toPointer = base.sub(uPointer).toVar();
        const dist = toPointer.length().max(0.001);
        const grip = smoothstep(15.0, 1.5, dist).mul(uPointerAmt);
        const shove = toPointer.div(dist).mul(grip.mul(4.5))
            .add(normalize(cross(toPointer, vec3(0.0, 0.0, 1.0))).mul(grip.mul(2.5)));

        const radius = uPulse.mul(46.0);
        const shell = smoothstep(5.0, 0.0, abs(base.length().sub(radius)))
            .mul(oneMinus(uPulse)).mul(uPulseAmt).mul(3.2);
        const blast = normalize(base.add(vec3(0.0001))).mul(shell);

        positionNode = base.add(wobble).add(shove).add(blast);
        speedNode = saturate(grip.add(shell.mul(0.3)).add(isRibbon.mul(0.35)).add(0.12));
    }

    const particleMaterial = new THREE.SpriteNodeMaterial({
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending
    });
    particleMaterial.positionNode = positionNode;

    const sizeSeed = seedB.mul(0.7).add(0.3);
    particleMaterial.scaleNode = sizeSeed
        .mul(mix(float(0.2), float(0.46), isRibbon))
        .mul(speedNode.mul(0.7).add(0.75));

    const tint = mix(color(COL_DEEP), color(COL_ACCENT), saturate(seedC.mul(1.3)));
    const hot = mix(tint, color(COL_FOAM), saturate(speedNode.mul(1.4)));
    particleMaterial.colorNode = mix(hot, color(COL_INDIGO), uDive.mul(0.55));

    const sprite = uv().sub(0.5).length().mul(2.0);
    const falloff = pow(oneMinus(saturate(sprite)), 3.0);
    // Slow twinkle so the field breathes instead of sitting still.
    const twinkle = sin(time.mul(seedA.mul(2.6).add(0.7)).add(seedC.mul(TAU)))
        .mul(0.35).add(0.75);
    // Dim inside an ellipse around the headline so the copy stays readable.
    const headlineDist = vec2(
        screenUV.x.sub(0.5).div(0.4),
        screenUV.y.sub(0.5).div(0.26)
    ).length();
    const textSafe = smoothstep(0.6, 1.25, headlineDist).mul(0.72).add(0.28);
    particleMaterial.opacityNode = falloff
        .mul(mix(float(0.3), float(0.8), isRibbon))
        .mul(speedNode.mul(0.5).add(0.6))
        .mul(twinkle)
        .mul(textSafe)
        .mul(uIntensity)
        .mul(oneMinus(uDive.mul(0.75)));

    const particles = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), particleMaterial);
    particles.count = count;
    particles.frustumCulled = false;
    scene.add(particles);

    /* ----------------------------------------------------------- water surface */
    const surfaceMaterial = new THREE.MeshBasicNodeMaterial({
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
    });
    {
        const p = positionLocal;
        const flow = vec3(p.x.mul(0.05), p.y.mul(0.05), time.mul(0.09));
        const n = mx_fractal_noise_float(flow, 3, 2.0, 0.55);
        const veins = pow(oneMinus(abs(n)), 7.0);
        const radial = smoothstep(150.0, 25.0, p.xy.length());

        surfaceMaterial.positionNode = positionLocal.add(
            vec3(0.0, 0.0, sin(p.x.mul(0.07).add(time.mul(0.7))).mul(0.9).add(n.mul(1.6)))
        );
        surfaceMaterial.colorNode = mix(color(COL_ACCENT), color(COL_FOAM), veins);
        surfaceMaterial.opacityNode = veins.mul(radial).mul(0.5)
            .mul(uIntensity)
            .mul(oneMinus(uDive.mul(0.9)));
    }
    const surface = new THREE.Mesh(new THREE.PlaneGeometry(320, 320, 96, 96), surfaceMaterial);
    surface.rotation.x = -Math.PI / 2;
    surface.position.y = 27;
    surface.frustumCulled = false;
    scene.add(surface);

    /* ------------------------------------------------------------ light shafts */
    function makeShafts(width, height, z, speed, strength) {
        const material = new THREE.MeshBasicNodeMaterial({
            transparent: true,
            depthWrite: false,
            depthTest: false,
            blending: THREE.AdditiveBlending
        });
        const p = positionLocal;
        // Skew the sample position with height so the shafts splay outwards.
        const sx = p.x.add(p.y.mul(0.22));
        const bands = mx_fractal_noise_float(vec3(sx.mul(0.075), time.mul(speed), 0.0), 2, 2.0, 0.5);
        const shaft = pow(saturate(bands.mul(0.5).add(0.52)), 4.0);
        const fromTop = smoothstep(height * -0.55, height * 0.5, p.y);
        material.colorNode = mix(color(COL_ACCENT), color(COL_FOAM), shaft.mul(0.8));
        material.opacityNode = shaft.mul(fromTop).mul(strength)
            .mul(uIntensity)
            .mul(oneMinus(uDive.mul(0.85)));

        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
        mesh.position.z = z;
        mesh.frustumCulled = false;
        return mesh;
    }
    scene.add(makeShafts(190, 120, -16, 0.05, 0.5));
    scene.add(makeShafts(150, 110, 6, 0.075, 0.22));

    /* -------------------------------------------------------------- interaction */
    const pointerTarget = new THREE.Vector3(0, 0, 0);
    const pointerSmooth = new THREE.Vector3(0, 0, 0);
    const parallax = { x: 0, y: 0, tx: 0, ty: 0 };
    let pointerAmtTarget = 0;
    let pulseStart = -10;
    let dive = 0;

    const ray = new THREE.Vector3();

    function pointerToWorld(clientX, clientY) {
        const rect = canvas.getBoundingClientRect();
        const nx = ((clientX - rect.left) / rect.width) * 2 - 1;
        const ny = -(((clientY - rect.top) / rect.height) * 2 - 1);
        parallax.tx = nx;
        parallax.ty = ny;
        ray.set(nx, ny, 0.5).unproject(camera).sub(camera.position).normalize();
        const t = (0 - camera.position.z) / ray.z;
        pointerTarget.copy(camera.position).add(ray.multiplyScalar(t));
    }

    function onPointerMove(event) {
        pointerToWorld(event.clientX, event.clientY);
        pointerAmtTarget = 1;
    }
    function onPointerLeave() {
        pointerAmtTarget = 0;
        parallax.tx = 0;
        parallax.ty = 0;
    }
    function firePulse() {
        pulseStart = performance.now() / 1000;
    }
    function onPointerDown(event) {
        pointerToWorld(event.clientX, event.clientY);
        pointerAmtTarget = 1;
        firePulse();
        if (event.pointerType === 'touch') {
            setTimeout(() => { pointerAmtTarget = 0; }, 1200);
        }
    }

    host.addEventListener('pointermove', onPointerMove, { passive: true });
    host.addEventListener('pointerdown', onPointerDown, { passive: true });
    host.addEventListener('pointerleave', onPointerLeave, { passive: true });

    /* -------------------------------------------------------------------- size */
    const maxPixelRatio = window.innerWidth < 820 ? 1.5 : 1.75;
    function resize() {
        const w = Math.max(1, host.clientWidth || window.innerWidth);
        const h = Math.max(1, host.clientHeight || window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxPixelRatio));
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        // Keep the ribbon in frame on portrait phones.
        camera.fov = w / h < 0.85 ? 66 : 52;
        camera.updateProjectionMatrix();
    }
    resize();
    window.addEventListener('resize', resize, { passive: true });

    host.appendChild(canvas);

    /* ------------------------------------------------------------ render loop */
    let running = false;
    let rafId = 0;
    let last = performance.now();
    let firstFrame = true;
    const frameTimes = [];
    let downshifts = 0;
    let stopped = false;

    function scrollProgress() {
        const rect = host.getBoundingClientRect();
        const travel = rect.height || window.innerHeight;
        return Math.min(1, Math.max(0, -rect.top / travel));
    }

    function frame(now) {
        rafId = requestAnimationFrame(frame);
        advance(now);
    }

    function advance(now) {
        const rawDt = (now - last) / 1000;
        last = now;
        const dt = Math.min(Math.max(rawDt, 0.001), 1 / 24);
        uDt.value = dt;

        uIntensity.value = Math.min(1, uIntensity.value + dt * 0.6);

        dive += (scrollProgress() - dive) * Math.min(1, dt * 6);
        uDive.value = dive;

        pointerSmooth.lerp(pointerTarget, Math.min(1, dt * 4));
        uPointer.value.copy(pointerSmooth);
        uPointerAmt.value += (pointerAmtTarget - uPointerAmt.value) * Math.min(1, dt * 3);

        const elapsed = now / 1000 - pulseStart;
        uPulse.value = Math.min(1, Math.max(0, elapsed / 2.4));
        uPulseAmt.value = elapsed < 2.4 ? 1 : 0;
        if (elapsed > 9) firePulse();                      // idle heartbeat

        parallax.x += (parallax.tx - parallax.x) * Math.min(1, dt * 2.5);
        parallax.y += (parallax.ty - parallax.y) * Math.min(1, dt * 2.5);
        camera.position.x = parallax.x * 2.4;
        camera.position.y = parallax.y * 1.4 - dive * 9;
        camera.position.z = 30 - dive * 4;
        camera.lookAt(0, -dive * 5, 0);

        if (updateCompute) renderer.compute(updateCompute);
        renderer.render(scene, camera);

        if (firstFrame) {
            firstFrame = false;
            canvas.classList.add('ready');
            document.body.classList.add('gpu-hero-live');
            if (typeof options.onReady === 'function') options.onReady(isWebGPU);
        }

        // Downshift the particle count on devices that cannot keep up.
        if (frameTimes.length < 90) {
            if (uIntensity.value > 0.5) frameTimes.push(rawDt);
        } else if (downshifts < 2) {
            frameTimes.sort((a, b) => a - b);
            const median = frameTimes[Math.floor(frameTimes.length / 2)];
            frameTimes.length = 0;
            if (median > 0.026) {
                downshifts += 1;
                count = Math.floor(count * 0.5);
                particles.count = count;
                if (count < 9000) stop(true);
            } else {
                downshifts = 2;
            }
        }
    }

    function start() {
        if (running || stopped) return;
        running = true;
        last = performance.now();
        rafId = requestAnimationFrame(frame);
    }
    function pause() {
        running = false;
        cancelAnimationFrame(rafId);
    }
    function stop(giveUp) {
        pause();
        stopped = true;
        host.removeEventListener('pointermove', onPointerMove);
        host.removeEventListener('pointerdown', onPointerDown);
        host.removeEventListener('pointerleave', onPointerLeave);
        window.removeEventListener('resize', resize);
        document.body.classList.remove('gpu-hero-live');
        canvas.remove();
        renderer.dispose();
        if (giveUp && typeof options.onGiveUp === 'function') options.onGiveUp();
    }

    // Only burn GPU while the hero is on screen.
    const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => (entry.isIntersecting ? start() : pause()));
    }, { threshold: 0 });
    io.observe(host);

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) pause();
        else if (!stopped) start();
    });

    // A lost GPU device would freeze the canvas — hand back to the video hero.
    const device = renderer.backend && renderer.backend.device;
    if (device && device.lost) {
        device.lost.then(() => {
            if (!stopped) stop(true);
        });
    }

    start();

    return {
        backend: isWebGPU ? 'webgpu' : 'webgl2',
        count: maxCount,
        pulse: firePulse,
        step: advance,        // manual advance, used when rAF is throttled
        start,
        pause,
        stop
    };
}
