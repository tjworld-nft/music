/* TJ Official — ocean.js
   One full-viewport WebGL2 pass that draws the whole page's water:
   · the hero key visual, re-lit with a depth map (2.5D parallax + refraction + caustics)
   · god rays and caustic light that fade as you scroll "deeper"
   · drifting marine snow, click/tap ripples
   · everything breathes with the 30fps band envelopes of the playing preview
   Written from scratch (no three.js). Falls back silently: the static <img> stays. */

const VERT = `#version 300 es
in vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }`;

const FRAG = `#version 300 es
precision highp float;
out vec4 o;
uniform vec2 uView;       // css px
uniform float uDpr, uTime, uScroll, uDoc, uHeroH, uImgAR, uKVa, uPar, uKVOff;
uniform vec2 uFocus, uMouse;
uniform vec4 uAud;        // bass, mid, high, onset
uniform vec4 uRip[6];     // x, y (viewport css px), birth time, strength
uniform sampler2D uKV, uDepth;

float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
vec2 h22(vec2 p){ p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3))); return fract(sin(p) * 43758.5453); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3. - 2. * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), u.x), mix(h21(i + vec2(0, 1)), h21(i + 1.), u.x), u.y);
}
float fbm(vec2 p){ float s = 0., a = .5; for (int i = 0; i < 4; i++){ s += a * vnoise(p); p = p * 2.03 + vec2(17.1, 9.3); a *= .5; } return s; }
float fbm2(vec2 p){ return .6 * vnoise(p) + .4 * vnoise(p * 2.1 + 3.7); }

// cellular edges → thin, bright caustic filaments
float cellEdge(vec2 p, float t){
  vec2 g = floor(p), f = fract(p);
  float d1 = 8., d2 = 8.;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++){
    vec2 b = vec2(x, y);
    vec2 r = h22(g + b);
    r = .5 + .42 * sin(t + 6.2831 * r);
    float d = length(b + r - f);
    if (d < d1){ d2 = d1; d1 = d; } else if (d < d2){ d2 = d; }
  }
  return d2 - d1;
}
float caustics(vec2 p, float t){
  vec2 w = vec2(fbm2(p * .55 + t * .05), fbm2(p * .55 - t * .04 + 7.3));
  p += (w - .5) * 1.4;
  float a = 1. - smoothstep(0., .2, cellEdge(p, t * .8));
  float b = 1. - smoothstep(0., .16, cellEdge(p * 1.63 + 3.1, t * 1.05 + 2.));
  return a * a * a + .55 * b * b * b;
}

void main(){
  vec2 fc = gl_FragCoord.xy / uDpr;
  vec2 px = vec2(fc.x, uView.y - fc.y);            // viewport css px, y down
  vec2 sv = px / uView;
  float docY = px.y + uScroll;
  float pageT = clamp(docY / max(uDoc, 1.), 0., 1.);
  float t = uTime;
  float bass = uAud.x, mid = uAud.y, hi = uAud.z, onset = uAud.w;

  // --- water surface normal (low-freq) + ripples ---
  vec2 q = px / 300. + vec2(0., uScroll / 1200.);
  vec2 n = vec2(fbm(q + vec2(t * .06, 0.)), fbm(q + vec2(5.2, -t * .05))) - .5;
  vec2 rip = vec2(0.);
  for (int i = 0; i < 6; i++){
    vec4 r = uRip[i];
    float age = t - r.z;
    if (r.w <= 0. || age < 0. || age > 3.5) continue;
    vec2 d = px - r.xy; float dist = length(d) + 1e-3;
    float front = age * 360.;
    float band = exp(-pow((dist - front) / 90., 2.));
    rip += (d / dist) * sin(dist * .06 - age * 9.) * band * exp(-age * 1.1) * r.w;
  }
  vec2 disp = n * (7. + bass * 9.) + rip * 16.;

  // --- base ocean, darkening with depth ---
  vec3 cTop = vec3(.030, .175, .265), cMid = vec3(.014, .078, .148), cBot = vec3(.006, .026, .058);
  vec3 col = mix(cTop, cMid, smoothstep(0., .3, pageT));
  col = mix(col, cBot, smoothstep(.28, 1., pageT));
  float surf = exp(-pageT * 3.2);
  col += vec3(.03, .12, .16) * (1. - sv.y) * surf;

  // --- light rays from the upper left ---
  vec2 rp = px + disp * 3.;
  float along = rp.x * .82 + rp.y * .57;
  float across = rp.x * .57 - rp.y * .82;
  float rays = fbm(vec2(across / 120., t * .07 + along / 2400.));
  rays = smoothstep(.48, .92, rays) * smoothstep(1.1, .0, sv.y) * smoothstep(-.2, .5, 1. - sv.x * .8);
  col += vec3(.62, .88, .92) * rays * surf * (.13 + mid * .16);

  // --- caustic field (shared) ---
  vec2 cp = vec2(px.x, docY * .9) / 170. + disp * .012;
  float ca = caustics(cp, t * .55);

  // --- hero key visual ---
  if (uKVa > .001){
    float heroTop = -uScroll * uPar - uKVOff * uHeroH;
    vec2 hp = vec2(px.x, px.y - heroTop);
    vec2 hs = vec2(uView.x, uHeroH * (1. + uKVOff));
    vec2 uv = hp / hs;
    if (uv.y < 1.02){
      float sar = hs.x / hs.y;
      vec2 sc = sar > uImgAR ? vec2(1., uImgAR / sar) : vec2(sar / uImgAR, 1.);
      vec2 kuv = (1. - sc) * uFocus + uv * sc;
      float dep = texture(uDepth, kuv).r;
      vec2 par = (uMouse * vec2(.010, .007) + vec2(0., uScroll / uHeroH * .02)) * (dep - .3);
      vec2 kuv2 = kuv + par + (disp / hs) * sc * (.25 + (1. - dep) * .55);
      kuv2 = clamp(kuv2, vec2(.001), vec2(.999));
      vec3 kv = texture(uKV, kuv2).rgb;
      // subtle chromatic split on the water, not on TJ
      float ch = (1. - smoothstep(.25, .6, dep)) * .0009 * (1. + bass * 1.5);
      kv.r = mix(kv.r, texture(uKV, kuv2 + vec2(ch, 0.)).r, .6);
      kv.b = mix(kv.b, texture(uKV, kuv2 - vec2(ch, 0.)).b, .6);
      float lum = dot(kv, vec3(.3, .55, .15));
      float lightOn = (.28 + dep * .55) * (1. - uv.y * .55) * (.45 + lum * .8);
      kv += vec3(.68, .95, 1.) * ca * lightOn * (.08 + bass * .13 + onset * .14);
      kv += vec3(.55, .85, .95) * rays * .35 * (1. - dep);
      float fade = (1. - smoothstep(.70, 1.0, uv.y)) * (1. - smoothstep(.3, .92, uScroll / uHeroH));
      col = mix(col, kv, fade * uKVa);
    }
  }

  // --- caustics on the open water (weak, fade with depth) ---
  float nearHero = 1. - smoothstep(.0, 1.2, docY / max(uHeroH, 1.) - 1.);
  col += vec3(.30, .78, .90) * ca * surf * (.03 + (bass * .07 + onset * .05) * (.35 + .65 * nearHero));

  // --- marine snow (3 parallax layers) ---
  for (int L = 0; L < 3; L++){
    float fl = float(L);
    float cell = 58. + fl * 46.;
    vec2 sp = vec2(px.x, px.y + uScroll * (.12 + fl * .18)) / cell;
    sp += vec2(t * .018 * (fl + 1.), -t * .045 * (1. + fl * .5));
    sp += disp * .004;
    vec2 g = floor(sp), f = fract(sp);
    vec2 r = h22(g + fl * 17.);
    float d = length(f - r);
    float sz = .016 + .028 * r.y + fl * .004;
    float tw = .55 + .45 * sin(t * (1.2 + r.x * 2.) + r.y * 40.);
    float on = step(.52, r.x);
    col += vec3(.72, .95, 1.) * smoothstep(sz, 0., d) * (.18 + .16 * fl) * tw * on * (.7 + hi * 1.3);
  }

  // --- audio breath: a faint glow that rises with the kick ---
  col += vec3(.05, .20, .26) * onset * .22 * (.4 + surf);

  // vignette + dither
  vec2 vv = sv - .5;
  col *= 1. - dot(vv, vv) * .5;
  col += (h21(gl_FragCoord.xy + fract(t)) - .5) / 255.;
  o = vec4(col, 1.);
}`;

function loadImage(src) {
  return new Promise((res, rej) => {
    const im = new Image();
    im.decoding = 'async';
    im.onload = () => res(im);
    im.onerror = () => rej(new Error(`image ${src}`));
    im.src = src;
  });
}

export async function initOcean({ canvas, hero, img, level, isPlaying }) {
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'high-performance', preserveDrawingBuffer: false, failIfMajorPerformanceCaveat: true });
  if (!gl) return null;
  const dbg = gl.getExtension('WEBGL_debug_renderer_info');
  const renderer = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '';
  if (/swiftshader|llvmpipe|softpipe|software|basic render/i.test(renderer)) {
    const lose = gl.getExtension('WEBGL_lose_context');
    if (lose) lose.loseContext();
    return null;
  }

  // Compile without blocking the main thread where the driver allows it.
  const par = gl.getExtension('KHR_parallel_shader_compile');
  const vs = gl.createShader(gl.VERTEX_SHADER); gl.shaderSource(vs, VERT); gl.compileShader(vs);
  const fs = gl.createShader(gl.FRAGMENT_SHADER); gl.shaderSource(fs, FRAG); gl.compileShader(fs);
  const prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs);
  gl.bindAttribLocation(prog, 0, 'p');
  gl.linkProgram(prog);
  if (par) {
    await new Promise((res) => {
      const poll = () => (gl.getProgramParameter(prog, par.COMPLETION_STATUS_KHR) ? res() : setTimeout(poll, 30));
      poll();
    });
  }
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw new Error(gl.getShaderInfoLog(fs) || gl.getShaderInfoLog(vs) || gl.getProgramInfoLog(prog) || 'link');
  }
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  const U = {};
  ['uView', 'uDpr', 'uTime', 'uScroll', 'uDoc', 'uHeroH', 'uImgAR', 'uKVa', 'uPar', 'uKVOff', 'uFocus', 'uMouse', 'uAud', 'uRip', 'uKV', 'uDepth']
    .forEach((k) => { U[k] = gl.getUniformLocation(prog, k); });
  gl.uniform1i(U.uKV, 0);
  gl.uniform1i(U.uDepth, 1);

  const makeTex = (unit, source) => {
    const tex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return tex;
  };

  // Art direction mirrors the <picture>: tall art under 4:5, wide art otherwise.
  const SETS = {
    wide: { depth: 'image/kv/kv-wide-depth.webp', focus: [0.72, 0.30], ar: 2400 / 1340, off: 0 },
    tall: { depth: 'image/kv/kv-tall-depth.webp', focus: [0.5, 0.5], ar: 1080 / 1935, off: 0.14 },
  };
  let set = null, kvTex = null, dTex = null, kvA = 0, loading = false;
  const wantSet = () => (innerWidth / innerHeight <= 0.8 ? 'tall' : 'wide');
  async function loadSet(name) {
    loading = true;
    try {
      const color = img.currentSrc && img.naturalWidth && (name === 'tall') === (img.naturalWidth < img.naturalHeight)
        ? img : await loadImage(name === 'tall' ? 'image/kv/kv-tall-1080.webp' : 'image/kv/kv-wide-2400.webp');
      if (color.decode) await color.decode().catch(() => {});
      const depth = await loadImage(SETS[name].depth);
      if (kvTex) gl.deleteTexture(kvTex);
      if (dTex) gl.deleteTexture(dTex);
      kvTex = makeTex(0, color);
      dTex = makeTex(1, depth);
      set = name;
      kvA = 0;
    } finally { loading = false; }
  }
  await loadSet(wantSet());

  // Sizing
  let dpr = 1, scale = 1, W = 0, H = 0, heroH = 0, doc = 0;
  const maxDpr = Math.min(window.devicePixelRatio || 1, 2);
  const isSmall = () => innerWidth < 760;
  let quality = isSmall() ? 0.55 : 0.7;
  function resize() {
    W = innerWidth; H = window.innerHeight;
    dpr = Math.max(0.5, maxDpr * quality);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    heroH = hero.offsetHeight;
    doc = document.documentElement.scrollHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
    if (!loading && set !== wantSet()) loadSet(wantSet());
  }
  resize();
  let rT = 0;
  addEventListener('resize', () => { clearTimeout(rT); rT = setTimeout(resize, 120); }, { passive: true });
  new ResizeObserver(() => { doc = document.documentElement.scrollHeight; heroH = hero.offsetHeight; }).observe(document.body);

  // Pointer → parallax + ripples
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  const rips = new Float32Array(24);
  let ri = 0, lastRip = { x: -999, y: -999, t: 0 };
  const t0 = performance.now();
  const now = () => (performance.now() - t0) / 1000;
  const addRipple = (x, y, s) => {
    rips.set([x, y, now(), s], (ri % 6) * 4);
    ri++;
  };
  addEventListener('pointermove', (e) => {
    mouse.tx = (e.clientX / innerWidth) * 2 - 1;
    mouse.ty = (e.clientY / innerHeight) * 2 - 1;
    if (e.pointerType !== 'mouse') return;
    const tt = now();
    if (tt - lastRip.t > 0.12 && Math.hypot(e.clientX - lastRip.x, e.clientY - lastRip.y) > 70) {
      addRipple(e.clientX, e.clientY, 0.22);
      lastRip = { x: e.clientX, y: e.clientY, t: tt };
    }
  }, { passive: true });
  addEventListener('pointerdown', (e) => { if (!e.target.closest('iframe')) addRipple(e.clientX, e.clientY, 0.7); }, { passive: true });
  addEventListener('tj:ripple', (e) => { const d = e.detail || {}; addRipple(d.x, d.y, d.s || 1); });
  if (window.DeviceOrientationEvent && matchMedia('(pointer: coarse)').matches) {
    addEventListener('deviceorientation', (e) => {
      if (e.gamma == null) return;
      mouse.tx = Math.max(-1, Math.min(1, e.gamma / 25));
      mouse.ty = Math.max(-1, Math.min(1, (e.beta - 45) / 25));
    }, { passive: true });
  }

  // Loop with adaptive quality + idle throttling
  const aud = { b: 0, m: 0, h: 0, o: 0 };
  let running = true, frame = 0, acc = 0, samples = 0, last = performance.now();
  function draw() {
    if (!running) return;
    requestAnimationFrame(draw);
    const tNow = performance.now();
    const dt = tNow - last;
    frame++;
    const heroVisible = scrollY < heroH;
    const playing = isPlaying();
    // off-hero and silent → 30fps is plenty for drifting snow
    if (!heroVisible && !playing && frame % 2) return;
    last = tNow;
    if (frame > 20 && dt < 200) {
      acc += dt; samples++;
      if (samples === 45) {
        const avg = acc / samples;
        const budget = (!heroVisible && !playing) ? 40 : 21;
        if (avg > budget && quality > 0.34) { quality = Math.max(0.34, quality * 0.8); resize(); }
        acc = 0; samples = 0;
      }
    }
    // ease inputs
    mouse.x += (mouse.tx - mouse.x) * 0.05;
    mouse.y += (mouse.ty - mouse.y) * 0.05;
    const k = playing ? 0.35 : 0.06;
    aud.b += ((playing ? level.b : 0) - aud.b) * k;
    aud.m += ((playing ? level.m : 0) - aud.m) * k;
    aud.h += ((playing ? level.h : 0) - aud.h) * k;
    aud.o += ((playing ? level.o : 0) - aud.o) * (playing ? 0.5 : 0.08);
    if (kvTex) kvA = Math.min(1, kvA + 0.03);

    gl.uniform2f(U.uView, W, H);
    gl.uniform1f(U.uDpr, dpr);
    gl.uniform1f(U.uTime, now());
    gl.uniform1f(U.uScroll, scrollY);
    gl.uniform1f(U.uDoc, doc);
    gl.uniform1f(U.uHeroH, heroH);
    gl.uniform1f(U.uImgAR, SETS[set].ar);
    gl.uniform1f(U.uKVa, kvA);
    gl.uniform1f(U.uPar, 0.72);
    gl.uniform1f(U.uKVOff, SETS[set].off);
    gl.uniform2f(U.uFocus, SETS[set].focus[0], SETS[set].focus[1]);
    gl.uniform2f(U.uMouse, mouse.x, mouse.y);
    gl.uniform4f(U.uAud, aud.b, aud.m, aud.h, aud.o);
    gl.uniform4fv(U.uRip, rips);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  document.addEventListener('visibilitychange', () => {
    const vis = document.visibilityState === 'visible';
    if (vis && !running) { running = true; last = performance.now(); requestAnimationFrame(draw); }
    if (!vis) running = false;
  });
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); running = false; document.documentElement.classList.remove('gl-on'); });
  requestAnimationFrame(draw);

  return {
    get quality() { return quality; },
    ripple: addRipple,
    stop() { running = false; },
  };
}
