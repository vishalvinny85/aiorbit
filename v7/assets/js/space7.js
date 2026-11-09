/* ==========================================================================
   AI Orbit · Version 7 "Eclipse" — minimal space banner background (home hero + CTA).
   One full-screen WebGL fragment shader (no three.js):
   - three layers of sparse, slowly drifting stars (pointer parallax by depth);
   - a dark planet in eclipse with a thin violet→cyan rim and a soft corona;
   - two hairline orbits, each with one moon and a short fading trail; the far
     half of each orbit passes behind the planet.
   [data-space7="hero"]  planet to the right of the copy (low right on phones).
   [data-space7="calm"]  planet horizon rising from the bottom edge (CTA band).
   Text stays in front: everything dims to ~10% inside the section's [data-safe]
   box, and the CSS veil sits on top.
   ========================================================================== */
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const isLight = () => document.documentElement.dataset.theme === "light";

const VS = `attribute vec2 p; void main(){ gl_Position=vec4(p,0.0,1.0); }`;
const FS = `precision highp float;
uniform vec2 uRes; uniform float uPx; uniform float uT; uniform vec2 uC; uniform float uR; uniform vec2 uM;
uniform vec4 uSafe; uniform float uFloor; uniform float uLight; uniform float uOrbits; uniform vec3 uBg;
const vec3 C1=vec3(0.643,0.522,1.0); const vec3 C2=vec3(0.247,0.863,0.949); const vec3 INK=vec3(0.16,0.16,0.2);
float h21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
float stars(vec2 p, float cell, float dens, float seed){
  vec2 g=floor(p/cell), f=p-g*cell; float r=h21(g+seed); if(r>dens) return 0.0;
  vec2 o=vec2(h21(g+seed+7.1),h21(g+seed+3.7))*cell*0.8+cell*0.1; float d=length(f-o);
  float tw=0.6+0.4*sin(uT*(0.5+r*3.0)+r*60.0); float sz=0.55+h21(g+seed+1.3)*0.9;
  return exp(-d*d/(sz*sz))*tw*(0.35+h21(g+seed+9.2)*0.65); }
mat2 rot(float a){ float c=cos(a), s=sin(a); return mat2(c,-s,s,c); }
// signed distance (px) to an ellipse outline, plus the point's angle on it
vec2 ell(vec2 q, vec2 ab){ vec2 n=q/ab; float l=length(n); vec2 g=q/(ab*ab)/max(l,1e-4); return vec2((l-1.0)/max(length(g),1e-4), atan(n.y,n.x)); }
void main(){
  vec2 p=gl_FragCoord.xy/uPx; p.y=uRes.y-p.y;                       // CSS px, y down
  vec2 sp=gl_FragCoord.xy/uPx; vec2 dd=max(vec2(0.0),max(uSafe.xy-sp,sp-uSafe.zw));
  float k=uFloor+(1.0-uFloor)*smoothstep(0.0,160.0,length(dd));    // text-safe dimming
  vec3 col=vec3(0.0); float ink=0.0;

  // stars: three depths, slow drift, pointer parallax
  float s=0.0;
  s+=stars(p+uM*4.0 +vec2(uT*1.2,0.0), 64.0, 0.20, 1.0)*0.55;
  s+=stars(p+uM*10.0+vec2(uT*2.4,0.0), 110.0,0.22, 5.0)*0.8;
  s+=stars(p+uM*18.0+vec2(uT*4.0,0.0), 190.0,0.25, 9.0);

  // planet
  vec2 c=uC+uM*8.0; vec2 v=p-c; float d=length(v); float R=uR;
  float inside=smoothstep(R+0.8,R-0.8,d);
  vec2 L=normalize(vec2(-0.72,-0.69));                                 // light from upper-left
  float face=dot(v/max(d,1e-3),L);                                     // -1..1 around the rim
  float lit=smoothstep(-0.35,1.0,face);
  vec3 rimc=mix(C2,C1,smoothstep(-0.2,0.9,face));
  float rim=exp(-abs(d-R)*0.55)*lit*(0.35+0.65*pow(max(face,0.0),3.0));
  float corona=exp(-max(d-R,0.0)/(R*0.22))*(1.0-inside)*(0.10+0.35*pow(max(face*0.5+0.5,0.0),3.0));
  float halo=exp(-max(d-R,0.0)/(R*0.9))*(1.0-inside)*0.06;
  // night side: barely-there terminator inside the disc
  float term=inside*smoothstep(R*0.55,R,d)*pow(max(face,0.0),2.0)*0.10;
  col+=rimc*(rim*0.9+corona+term)+mix(C1,C2,0.5)*halo; ink+=rim*0.9+corona*0.6;
  s*=1.0-inside;

  // two hairline orbits with one moon each
  if(uOrbits>0.5){
    for(int i=0;i<2;i++){
      float fi=float(i); vec2 ab=R*vec2(1.9+fi*0.85, (1.9+fi*0.85)*(0.26+fi*0.04)); float tilt=-0.30+fi*0.1;
      vec2 q=rot(tilt)*v; vec2 e=ell(q,ab);
      bool far=q.y<0.0;                                                // upper half runs behind the planet
      float vis=far?(1.0-inside):1.0;
      float th=mod(uT*(0.11-fi*0.04)+fi*2.4, 6.2832)-3.1416;           // moon angle
      float da=mod(e.y-th+6.2832, 6.2832);                             // how far behind the moon
      float trail=exp(-(6.2832-da)*2.4)*step(3.1416,da);
      float line=exp(-e.x*e.x*1.2)*(0.16+trail*0.9)*vis;
      vec3 lc=mix(C1,C2,fi); col+=lc*line; ink+=line;
      vec2 mp=rot(-tilt)*vec2(cos(th)*ab.x, sin(th)*ab.y);
      float mvis=(sin(th)<0.0 && length(mp)<R) ? 0.0 : 1.0;
      float md=length(v-mp); float moon=(exp(-md*md/2.2)+exp(-md/7.0)*0.25)*mvis;
      col+=mix(lc,vec3(1.0),0.6)*moon; ink+=moon;
    }
  }

  // compose
  col+=vec3(0.92,0.94,1.0)*s; ink+=s*0.6;
  vec3 base=uBg*(1.0-inside*(uLight>0.5?0.04:0.35));                  // planet a touch darker than the page
  vec3 outc;
  if(uLight>0.5) outc=mix(base, mix(INK,(C1+C2)*0.35,0.5), clamp(ink*0.75,0.0,0.75)*k);
  else outc=base+col*k;
  float gr=(h21(gl_FragCoord.xy+fract(uT))-0.5)*0.012;                // fine grain against banding
  gl_FragColor=vec4(outc+gr,1.0);
}`;

function mount(host) {
  const hero = host.dataset.space7 === "hero", sect = host.parentElement, safeEl = sect.querySelector("[data-safe]");
  const cv = document.createElement("canvas"); host.appendChild(cv);
  const gl = cv.getContext("webgl", { antialias: false, alpha: false, powerPreference: "high-performance" }); if (!gl) return;
  const sh = (t, src) => { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr); gl.useProgram(pr);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const u = (n) => gl.getUniformLocation(pr, n);
  const U = { res: u("uRes"), px: u("uPx"), t: u("uT"), c: u("uC"), r: u("uR"), m: u("uM"), safe: u("uSafe"), floor: u("uFloor"), light: u("uLight"), orbits: u("uOrbits"), bg: u("uBg") };
  let W = 0, H = 0, px = 1, visible = true; const m = { x: 0, y: 0, tx: 0, ty: 0 }, t0 = performance.now();

  function layout() {
    const r = sect.getBoundingClientRect(); W = r.width; H = r.height; if (!W || !H) return false;
    px = Math.min(1.75, devicePixelRatio || 1); cv.width = Math.round(W * px); cv.height = Math.round(H * px); gl.viewport(0, 0, cv.width, cv.height);
    const narrow = W < 900; let cx, cy, R;
    if (hero) { if (narrow) { const st = sect.querySelector(".strip"), top = st ? st.getBoundingClientRect().top - r.top : H; R = Math.min(W * .34, 160); cx = W * .74; cy = top - R * .15; } else { R = Math.min(H * .25, W * .16); cx = W * .73; cy = H * .45; } }
    else { R = Math.max(W * .75, 600); cx = W / 2; cy = H + R * .78; }
    gl.uniform2f(U.res, W, H); gl.uniform1f(U.px, px); gl.uniform2f(U.c, cx, cy); gl.uniform1f(U.r, R);
    gl.uniform1f(U.orbits, hero ? 1 : 0); gl.uniform1f(U.floor, narrow ? .16 : .1); gl.uniform1f(U.light, isLight() ? 1 : 0);
    const bg = getComputedStyle(document.body).backgroundColor.match(/\d+(\.\d+)?/g) || [10, 10, 11]; gl.uniform3f(U.bg, bg[0] / 255, bg[1] / 255, bg[2] / 255);
    if (safeEl) { const c = safeEl.getBoundingClientRect(); gl.uniform4f(U.safe, c.left - r.left - 16, r.bottom - c.bottom - 16, c.right - r.left + 16, r.bottom - c.top + 16); }
    else gl.uniform4f(U.safe, 1e5, 1e5, 1e5, 1e5);
    return true;
  }
  function draw(t) { m.x += (m.tx - m.x) * .04; m.y += (m.ty - m.y) * .04; gl.uniform2f(U.m, m.x, m.y); gl.uniform1f(U.t, t); gl.drawArrays(gl.TRIANGLES, 0, 3); }
  function tick(now) { if (visible) draw((now - t0) / 1000 + 40); requestAnimationFrame(tick); }
  sect.addEventListener("pointermove", (e) => { const r = sect.getBoundingClientRect(); m.tx = (e.clientX - r.left) / W * 2 - 1; m.ty = (e.clientY - r.top) / H * 2 - 1; });
  sect.addEventListener("pointerleave", () => { m.tx = m.ty = 0; });
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(sect);
  const rebuild = () => { if (layout() && reduce) draw(40); };
  let rt; new ResizeObserver(() => { clearTimeout(rt); rt = setTimeout(rebuild, 120); }).observe(sect);
  new MutationObserver(() => setTimeout(rebuild, 60)).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  rebuild(); document.fonts && document.fonts.ready.then(rebuild);
  if (!reduce) requestAnimationFrame(tick);
}
document.querySelectorAll("[data-space7]").forEach((h) => { try { mount(h); } catch (e) { console.error(e); } });
