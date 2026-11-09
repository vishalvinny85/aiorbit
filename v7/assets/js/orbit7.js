/* ==========================================================================
   AI Orbit · Version 7 mockup "Orbit" — WebGL space/orbit banner background.
   [data-orbit7="hero"]  starfield, a banded gas giant with a violet→cyan rim,
                         a Keplerian particle ring, four tilted orbits (one per
                         service) whose satellites leave fading trails, and the
                         occasional shooting star. Hover a service in the hero
                         strip to light its orbit; hold to warp (orbits speed up,
                         stars streak), release to drop back into orbit.
   [data-orbit7="calm"]  starfield + a planet horizon glow rising from the
                         bottom edge (CTA band).
   Text stays in front: the scene is drawn to the right of the copy, every layer
   dims to ~12% inside the section's [data-safe] box, and the CSS veil sits on top.
   ========================================================================== */
import * as THREE from "../../../assets/vendor/three.module.min.js";

THREE.ColorManagement.enabled = false;
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const isLight = () => document.documentElement.dataset.theme === "light";
const lerp = (a, b, k) => a + (b - a) * k;
const TAU = Math.PI * 2;

/* ---------- shared GLSL ---------- */
const UNI = `uniform float uTime; uniform float uReal; uniform float uWarp; uniform float uLight; uniform float uPx; uniform float uD;
  uniform vec4 uSafe; uniform float uFloor; uniform vec3 uC1; uniform vec3 uC2; uniform vec3 uEmber; uniform vec3 uInk; uniform vec3 uBg;`;
const COMMON = `${UNI}
  float safeK(){ vec2 p=gl_FragCoord.xy/uPx; vec2 d=max(vec2(0.0),max(uSafe.xy-p,p-uSafe.zw)); return uFloor+(1.0-uFloor)*smoothstep(0.0,150.0,length(d)); }
  vec4 addv(vec3 x){ float a=clamp(max(max(x.r,x.g),x.b),0.0,1.0); return vec4(x/max(a,0.0001),a); }
  vec4 outc(vec3 c, float a){ return uLight>0.5 ? vec4(c,a) : addv(c*a); }`;

/* stars: twinkling points, deep behind everything */
const VS_STAR = `attribute float aR; ${UNI} varying float vA; varying vec3 vCol;
  void main(){ vec4 mv=modelViewMatrix*vec4(position,1.0);
    float tw=0.55+0.45*sin(uReal*(0.6+aR*2.2)+aR*40.0);
    vA=(0.25+aR*0.75)*tw; vCol=mix(vec3(1.0), mix(uC1,uC2,fract(aR*7.0)), step(0.78,aR)*0.8);
    gl_PointSize=(0.9+aR*aR*2.6)*uPx*(uD/-mv.z)*1.8; gl_Position=projectionMatrix*mv; }`;
const FS_STAR = `${COMMON} varying float vA; varying vec3 vCol;
  void main(){ float d=length(gl_PointCoord-0.5); float a=(smoothstep(0.5,0.0,d)*0.55+smoothstep(0.18,0.0,d))*vA*safeK();
    if(uLight>0.5) gl_FragColor=vec4(uInk,a*0.55); else gl_FragColor=addv(vCol*a); }`;

/* warp streaks: the head vertex of each segment is pulled toward the camera */
const VS_WARP = `attribute float aU; attribute float aR; ${UNI} varying float vU; varying float vR;
  void main(){ vec3 p=position; p.z+=aU*uWarp*(500.0+aR*900.0); vU=aU; vR=aR; gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0); }`;
const FS_WARP = `${COMMON} varying float vU; varying float vR;
  void main(){ float a=uWarp*vU*(0.35+vR*0.5)*safeK(); vec3 c=mix(uC1,uC2,vR);
    if(uLight>0.5) gl_FragColor=vec4(uInk,a*0.6); else gl_FragColor=addv(c*a); }`;

/* planet: banded gas giant, ember key light, violet→cyan fresnel rim */
const VS_PLANET = `varying vec3 vN; varying vec3 vV; varying vec3 vO;
  void main(){ vO=position; vN=normalize(normalMatrix*normal); vec4 mv=modelViewMatrix*vec4(position,1.0); vV=mv.xyz; gl_Position=projectionMatrix*mv; }`;
const FS_PLANET = `${COMMON} uniform float uR; uniform vec3 uL; varying vec3 vN; varying vec3 vV; varying vec3 vO;
  void main(){ vec3 n=normalize(vN); vec3 v=normalize(-vV);
    float lam=max(dot(n,normalize(uL)),0.0); float fres=pow(1.0-max(dot(n,v),0.0),2.4);
    float lat=vO.y/uR; float lon=atan(vO.z,vO.x)+uTime*0.03;
    float band=sin(lat*16.0+sin(lat*4.0+lon*2.0)*1.2+sin(lon*3.0+lat*9.0)*0.35)*0.5+0.5;
    float storm=smoothstep(0.16,0.0,length(vec2(lon*0.35-0.6,lat+0.32)))*0.5;
    float k=safeK(); vec3 col;
    if(uLight>0.5){
      vec3 surf=mix(vec3(0.83,0.82,0.88),vec3(0.74,0.71,0.82),band+storm*0.6);
      col=mix(uBg,surf,0.35+lam*0.45)+mix(uC1,uC2,fres)*fres*0.18;
    } else {
      vec3 surf=mix(vec3(0.045,0.04,0.075),vec3(0.10,0.075,0.16),band)+uEmber*storm*0.18;
      col=surf*(0.18+lam*1.05)+uEmber*pow(lam,4.0)*0.22+mix(uC1,uC2,fres*0.9)*fres*(0.55+lam*0.4);
    }
    gl_FragColor=vec4(mix(uBg,col,k),1.0); }`;

/* atmosphere halo: camera-facing quad behind the planet */
const VS_HALO = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`;
const FS_HALO = `${COMMON} uniform float uEdge; varying vec2 vUv;
  void main(){ vec2 q=vUv-0.5; float d=length(q)*2.0; float g=exp(-max(d-uEdge,0.0)*7.0)*smoothstep(uEdge-0.04,uEdge+0.01,d)*smoothstep(1.0,0.8,d);
    vec3 c=mix(uC1,uC2,clamp(0.5-q.x+q.y,0.0,1.0)); float a=g*0.55*safeK(); gl_FragColor=outc(uLight>0.5?c*0.7:c,uLight>0.5?a*0.35:a); }`;

/* Keplerian particle ring: inner particles orbit faster (ω ∝ r^-1.5) */
const VS_RING = `attribute float aR; attribute float aA; attribute float aS; ${UNI} uniform float uR; varying float vA; varying vec3 vCol;
  void main(){ float r=aR*uR; float ang=aA+uTime*0.22*pow(1.55/aR,1.5);
    vec3 p=vec3(cos(ang)*r, position.y, sin(ang)*r); vec4 mv=modelViewMatrix*vec4(p,1.0);
    float gap=smoothstep(0.0,0.03,abs(aR-1.98)); vA=(0.25+aS*0.75)*gap*(0.55+0.45*sin(aR*70.0)*sin(aR*23.0));
    vCol=mix(uC1,uC2,smoothstep(1.6,2.45,aR)); vCol=mix(vCol,uEmber,step(0.94,aS)*0.8);
    gl_PointSize=(0.8+aS*1.6)*uPx*(uD/-mv.z)*1.5; gl_Position=projectionMatrix*mv; }`;
const FS_RING = `${COMMON} varying float vA; varying vec3 vCol;
  void main(){ float d=length(gl_PointCoord-0.5); float a=smoothstep(0.5,0.05,d)*vA*0.6*safeK();
    if(uLight>0.5) gl_FragColor=vec4(mix(uInk,vCol,0.5),a*0.7); else gl_FragColor=addv(vCol*a); }`;

/* orbit paths: faint ellipse + a fading trail behind the satellite */
const VS_PATH = `attribute float aU; varying float vU; void main(){ vU=aU; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`;
const FS_PATH = `${COMMON} uniform float uPhase; uniform float uHi; uniform vec3 uCol; varying float vU;
  void main(){ float d=fract(uPhase-vU); float trail=exp(-d*9.0)*(0.9+uHi*0.4); float base=0.09+uHi*0.22;
    float a=(base+trail)*safeK(); vec3 c=mix(uCol,vec3(1.0),trail*0.25);
    if(uLight>0.5) gl_FragColor=vec4(mix(uInk,uCol,0.6+trail*0.4),a*0.8); else gl_FragColor=addv(c*a); }`;

/* satellites: glowing body with a thin ring */
const VS_SAT = `${UNI} uniform float uHi; void main(){ vec4 mv=modelViewMatrix*vec4(position,1.0); gl_PointSize=(14.0+uHi*12.0)*uPx*(uD/-mv.z); gl_Position=projectionMatrix*mv; }`;
const FS_SAT = `${COMMON} uniform float uHi; uniform vec3 uCol;
  void main(){ float d=length(gl_PointCoord-0.5); float core=smoothstep(0.17,0.08,d); float halo=smoothstep(0.5,0.0,d)*(0.35+uHi*0.4);
    float ring=smoothstep(0.5,0.45,d)*smoothstep(0.38,0.44,d)*uHi*0.8; float a=(core+halo+ring)*safeK();
    if(uLight>0.5) gl_FragColor=vec4(uCol*0.75,a); else gl_FragColor=addv(uCol*a+vec3(1.0)*core*0.6*safeK()); }`;

/* shooting stars */
const VS_COMET = `attribute float aU; varying float vU; void main(){ vU=aU; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`;
const FS_COMET = `${COMMON} uniform float uLife; varying float vU;
  void main(){ float a=pow(vU,2.0)*uLife*0.9*safeK(); vec3 c=mix(uC2,vec3(1.0),vU);
    if(uLight>0.5) gl_FragColor=vec4(uInk,a*0.6); else gl_FragColor=addv(c*a); }`;

const ORBITS = [ // a (× planet radius), b/a, tilt x, tilt z, speed, colour
  { a: 2.75, e: .92, rx: .42, rz: -.30, sp: .060, col: "#A485FF" },
  { a: 3.55, e: .9,  rx: .58, rz: -.14, sp: .042, col: "#8C9BFF" },
  { a: 4.45, e: .94, rx: .30, rz: -.40, sp: .031, col: "#5FC4F5" },
  { a: 5.45, e: .88, rx: .66, rz: -.22, sp: .023, col: "#3FDCF2" },
];

function mount(host) {
  const mode = host.dataset.orbit7 || "calm", hero = mode === "hero";
  const sect = host.parentElement, safeEl = sect.querySelector("[data-safe]");
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" }); } catch { return; }
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1)); host.appendChild(renderer.domElement);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(35, 1, 1, 12000);
  const group = new THREE.Group(), sky = new THREE.Group(); scene.add(sky, group);
  const U = { uTime: { value: 0 }, uReal: { value: 0 }, uWarp: { value: 0 }, uLight: { value: 0 }, uPx: { value: renderer.getPixelRatio() }, uD: { value: 1000 },
    uSafe: { value: new THREE.Vector4(1e5, 1e5, 1e5, 1e5) }, uFloor: { value: .12 },
    uC1: { value: new THREE.Color("#A485FF") }, uC2: { value: new THREE.Color("#3FDCF2") }, uEmber: { value: new THREE.Color("#FF5B42") },
    uInk: { value: new THREE.Color("#2A2A33") }, uBg: { value: new THREE.Color("#0A0A0B") } };
  const links = hero ? [...sect.querySelectorAll(".strip a")] : [];
  const ui = hero ? { vel: sect.querySelector("[data-or-vel]"), meter: sect.querySelector(".meter i"), bodies: sect.querySelector("[data-or-bodies]") } : {};
  let mats = [], orbits = [], comets = [], W = 0, H = 0, R = 100, charge = 0, holding = false, visible = true, sim = 0, last = performance.now(), hi = -1;
  const mouse = { tx: 0, ty: 0, px: 0, py: 0 }, t0 = performance.now();

  function clear(g) { while (g.children.length) { const o = g.children.pop(); o.traverse((c) => c.geometry && c.geometry.dispose()); } }
  function build() {
    const r = sect.getBoundingClientRect(); W = r.width; H = r.height; if (!W || !H) return;
    const D = (H / 2) / Math.tan(THREE.MathUtils.degToRad(17.5));
    renderer.setSize(W, H, false); camera.aspect = W / H; camera.position.set(0, 0, D); camera.far = D * 6; camera.updateProjectionMatrix();
    U.uD.value = D; const light = isLight(); U.uLight.value = light ? 1 : 0;
    U.uBg.value.set(getComputedStyle(document.body).backgroundColor || (light ? "#F2F2F4" : "#0A0A0B"));
    if (safeEl) { const c = safeEl.getBoundingClientRect(); U.uSafe.value.set(c.left - r.left - 16, r.bottom - c.bottom - 16, c.right - r.left + 16, r.bottom - c.top + 16); }
    U.uFloor.value = W < 700 ? .2 : .12;
    clear(group); clear(sky); mats.forEach((m) => m.dispose()); mats = []; orbits = []; comets = [];
    const blend = light ? THREE.NormalBlending : THREE.AdditiveBlending;
    const mk = (vs, fs, extra = {}, o = {}) => { const m = new THREE.ShaderMaterial({ vertexShader: vs, fragmentShader: fs, uniforms: { ...U, ...extra }, transparent: true, depthWrite: false, depthTest: true, blending: blend, ...o }); mats.push(m); return m; };
    const geo = (attrs) => { const g = new THREE.BufferGeometry(); for (const [n, a, s] of attrs) g.setAttribute(n, new THREE.Float32BufferAttribute(a, s)); return g; };
    const narrow = W < 900;

    /* stars */
    const sn = narrow ? 520 : hero ? 1300 : 800, sp = [], sr = [], wp = [], wu = [], wr = [];
    for (let i = 0; i < sn; i++) { const z = -D * (0.6 + Math.random() * 2.6), s = (D - z) / D;
      const x = (Math.random() - .5) * W * s * 1.15, y = (Math.random() - .5) * H * s * 1.15, k = Math.random();
      sp.push(x, y, z); sr.push(k); if (i % 3 === 0) { wp.push(x, y, z, x, y, z); wu.push(0, 1); wr.push(k, k); } }
    const stars = new THREE.Points(geo([["position", sp, 3], ["aR", sr, 1]]), mk(VS_STAR, FS_STAR)); stars.renderOrder = 1; sky.add(stars);
    if (hero) { const w = new THREE.LineSegments(geo([["position", wp, 3], ["aU", wu, 1], ["aR", wr, 1]]), mk(VS_WARP, FS_WARP)); w.renderOrder = 2; sky.add(w); }

    /* planet system placement: right of the copy on desktop, low and right on phones; horizon for calm */
    let cx, cy;
    if (hero) { R = narrow ? Math.min(W * .3, 150) : Math.min(H * .17, W * .105); cx = narrow ? W * .3 : W * .25; cy = narrow ? -H * .2 : -H * .02; }
    else { R = Math.max(W * .62, 520); cx = 0; cy = -H / 2 - R * .86; }
    const sys = new THREE.Group(); sys.position.set(cx, cy, 0); sys.rotation.z = hero ? -.08 : 0; group.add(sys);

    const planet = new THREE.Mesh(new THREE.SphereGeometry(R, 96, 64),
      new THREE.ShaderMaterial({ vertexShader: VS_PLANET, fragmentShader: FS_PLANET, uniforms: { ...U, uR: { value: R }, uL: { value: new THREE.Vector3(-.75, .55, .45) } } }));
    mats.push(planet.material); planet.renderOrder = 0; sys.add(planet);
    const hs = R * 1.7, halo = new THREE.Mesh(new THREE.PlaneGeometry(hs * 2, hs * 2), mk(VS_HALO, FS_HALO, { uEdge: { value: R / hs } })); halo.renderOrder = 3; sys.add(halo);

    let bodies = sn;
    if (hero) {
      /* particle ring, tilted almost edge-on */
      const rn = narrow ? 2200 : 5200, rp = [], rr = [], ra = [], rs = [];
      for (let i = 0; i < rn; i++) { const u = Math.random(); rr.push(1.55 + Math.pow(u, .8) * .9); ra.push(Math.random() * TAU); rs.push(Math.random()); rp.push(0, (Math.random() - .5) * R * .025, 0); }
      const ring = new THREE.Points(geo([["position", rp, 3], ["aR", rr, 1], ["aA", ra, 1], ["aS", rs, 1]]), mk(VS_RING, FS_RING, { uR: { value: R } }));
      ring.rotation.set(.3, 0, -.3); ring.renderOrder = 4; sys.add(ring); bodies += rn;

      /* four orbits, one per service */
      ORBITS.forEach((o, i) => {
        const a = R * o.a, b = a * o.e, n = 360, pp = [], pu = [];
        for (let j = 0; j <= n; j++) { const t = j / n * TAU; pp.push(Math.cos(t) * a, 0, Math.sin(t) * b); pu.push(j / n); }
        const g = new THREE.Group(); g.rotation.set(o.rx, 0, o.rz);
        const ex = { uPhase: { value: Math.random() }, uHi: { value: 0 }, uCol: { value: new THREE.Color(o.col) } };
        const path = new THREE.Line(geo([["position", pp, 3], ["aU", pu, 1]]), mk(VS_PATH, FS_PATH, ex)); path.renderOrder = 5;
        const sat = new THREE.Points(geo([["position", [0, 0, 0], 3]]), mk(VS_SAT, FS_SAT, ex)); sat.renderOrder = 6;
        g.add(path, sat); sys.add(g); orbits.push({ ...o, a, b, ex, sat }); bodies += 1;
      });
    }
    /* shooting stars */
    for (let i = 0; i < (hero ? 2 : 1); i++) {
      const ex = { uLife: { value: 0 } }, c = new THREE.LineSegments(geo([["position", [0, 0, 0, 0, 0, 0], 3], ["aU", [0, 1], 1]]), mk(VS_COMET, FS_COMET, ex));
      c.renderOrder = 2; sky.add(c); comets.push({ c, ex, t: 1, dur: 1, wait: .5 + i * 3.5, from: [0, 0, 0], dir: [0, 0] });
    }
    if (ui.bodies) ui.bodies.textContent = bodies.toLocaleString("en-US");
    if (reduce) { U.uTime.value = 9; U.uReal.value = 3; place(9); renderer.render(scene, camera); }
  }
  function place(t) { orbits.forEach((o) => { const ph = (o.ph0 ?? (o.ph0 = Math.random())) + t * o.sp; o.ex.uPhase.value = ph % 1; const a = ph * TAU; o.sat.position.set(Math.cos(a) * o.a, 0, Math.sin(a) * o.b); }); }
  function comet(cm, now, dt) {
    cm.t += dt; const pos = cm.c.geometry.attributes.position;
    if (cm.t > cm.dur) { // schedule the next one
      if (cm.t < cm.dur + cm.wait) { cm.ex.uLife.value = 0; return; }
      const z = -U.uD.value * 1.2, s = 2.2, x0 = (Math.random() * .7 + .05) * W * s * .5, y0 = (Math.random() * .4 + .35) * H * s * .5, len = (300 + Math.random() * 300) * s;
      cm.from = [x0, y0, z]; cm.dir = [-.82 * len, -.45 * len]; cm.t = 0; cm.dur = .9 + Math.random() * .6; cm.wait = 4 + Math.random() * 7;
    }
    const k = cm.t / cm.dur, e = 1 - Math.pow(1 - k, 2), tail = Math.max(0, e - .28);
    const [x0, y0, z] = cm.from, [dx, dy] = cm.dir;
    pos.setXYZ(0, x0 + dx * tail, y0 + dy * tail, z); pos.setXYZ(1, x0 + dx * e, y0 + dy * e, z); pos.needsUpdate = true;
    cm.ex.uLife.value = Math.sin(Math.PI * k);
  }
  function tick(now) {
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    charge = holding ? Math.min(1, charge + dt / 1.2) : Math.max(0, charge - dt / .6);
    const warp = charge * charge; U.uWarp.value = warp; sim += dt * (1 + warp * 7);
    if (ui.vel) ui.vel.textContent = "×" + (1 + warp * 7).toFixed(1); if (ui.meter) ui.meter.style.transform = `scaleX(${charge})`;
    orbits.forEach((o, i) => { o.ex.uHi.value = lerp(o.ex.uHi.value, hi === i ? 1 : 0, .1); });
    mouse.px = lerp(mouse.px, mouse.tx, .04); mouse.py = lerp(mouse.py, mouse.ty, .04);
    const r = sect.getBoundingClientRect(), sc = hero ? Math.min(1, Math.max(0, -r.top / Math.max(1, H))) : 0, t = (now - t0) / 1000;
    group.rotation.y = mouse.px * (hero ? .1 : .05) + Math.sin(t * .1) * .02; group.rotation.x = -mouse.py * .06 + sc * .25;
    group.position.y = sc * H * .25; group.position.z = -sc * 300;
    sky.rotation.y = mouse.px * .03; sky.rotation.x = -mouse.py * .02; sky.rotation.z = t * .004;
    if (visible) { U.uTime.value = sim; U.uReal.value = t; place(sim); comets.forEach((c) => comet(c, now, dt)); renderer.render(scene, camera); }
    requestAnimationFrame(tick);
  }
  sect.addEventListener("pointermove", (e) => { const r = sect.getBoundingClientRect(); mouse.tx = (e.clientX - r.left) / W * 2 - 1; mouse.ty = 1 - (e.clientY - r.top) / H * 2; });
  sect.addEventListener("pointerleave", () => { mouse.tx = mouse.ty = 0; });
  if (hero) {
    sect.addEventListener("pointerdown", (e) => { if (e.target.closest("a, button, input, select, textarea, label")) return; holding = true; });
    const up = () => { holding = false; }; addEventListener("pointerup", up); addEventListener("pointercancel", up);
    links.forEach((a, i) => { a.addEventListener("pointerenter", () => { hi = i; }); a.addEventListener("pointerleave", () => { hi = -1; }); a.addEventListener("focus", () => { hi = i; }); a.addEventListener("blur", () => { hi = -1; }); });
  }
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(sect);
  let rt; new ResizeObserver(() => { clearTimeout(rt); rt = setTimeout(build, 140); }).observe(sect);
  new MutationObserver(() => setTimeout(build, 60)).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  build(); document.fonts && document.fonts.ready.then(build);
  if (!reduce) requestAnimationFrame(tick);
}
document.querySelectorAll("[data-orbit7]").forEach(mount);
