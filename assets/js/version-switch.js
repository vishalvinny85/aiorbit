/* ==========================================================================
   AI Orbit — design version switcher (shared by Versions 1–7)
   Adds a "Version" dropdown at the right edge of the header. Switching keeps
   the visitor on the equivalent page (same path, same #section).
   Version 1 lives at the site root, Version 2 under /mockb/, Version 3 under /v3/, Version 4 under /v4/, Version 5 under /v5/, Version 6 under /v6/, Version 7 under /v7/.
   Include AFTER the version's own header script.
   ========================================================================== */
(() => {
  const script = document.currentScript;
  const siteRoot = new URL("../../", script.src);              // …/aiorbit/
  const here = new URL(location.href);
  let rel = decodeURIComponent(here.pathname).slice(decodeURIComponent(siteRoot.pathname).length) || "index.html";
  if (rel.endsWith("/")) rel += "index.html";
  const PREFIX = { 1: "", 2: "mockb/", 3: "v3/", 4: "v4/", 5: "v5/", 6: "v6/", 7: "v7/" };
  const cur = rel.startsWith("v7/") ? 7 : rel.startsWith("v6/") ? 6 : rel.startsWith("v5/") ? 5 : rel.startsWith("v4/") ? 4 : rel.startsWith("v3/") ? 3 : rel.startsWith("mockb/") ? 2 : 1;
  const isV2 = cur === 2;
  const base = rel.slice(PREFIX[cur].length);
  const hash = here.hash;
  const href = (v) => new URL(PREFIX[v] + base, siteRoot).href + hash;
  const DOT = { 1: "var(--accent,#7b93ff)", 2: "#FF0032", 3: "linear-gradient(135deg,#A485FF,#6C82FF,#3FDCF2)", 4: "conic-gradient(#A485FF,#6C82FF,#3FDCF2,#A485FF)", 5: "#4FD8E8", 6: "#73FFB9", 7: "linear-gradient(135deg,#FF5B42,#EB7F31)" };
  const RING = { 1: "var(--accent,#7b93ff)", 2: "#FF3355", 3: "#6C82FF", 4: "#6C82FF", 5: "var(--accent,#8B97FF)", 6: "#73FFB9", 7: "#FF5B42" };

  const VERSIONS = [
    { v: 1, name: "Version 1", desc: "Orbit Mono — editorial, minimal, Geist" },
    { v: 2, name: "Version 2", desc: "Orbital Horizon — bold, Evoke colours, Manrope" },
    { v: 3, name: "Version 3", desc: "Neural Aurora — WebGL neural orbit, Sora" },
    { v: 4, name: "Version 4", desc: "Monolith — crystal shards, scroll stories, Sora" },
    { v: 5, name: "Version 5", desc: "Clarity — content first, AI agent console, Sora" },
    { v: 6, name: "Version 6", desc: "Signal — neural network hero, Neue Montreal + Jura" },
    { v: 7, name: "Version 7", desc: "Neural Ember — space eclipse hero, ember accents, Sora" },
  ];

  const css = document.createElement("style");
  css.textContent = `
  .vsw{position:relative;flex:none}
  .vsw>button{display:inline-flex;align-items:center;gap:8px;height:40px;padding:0 12px 0 14px;border-radius:999px;border:1px solid var(--line-strong,rgba(127,127,127,.35));background:var(--surface,transparent);color:var(--fg,inherit);font:600 14px/1 inherit;font-family:inherit;white-space:nowrap;cursor:pointer;transition:border-color .2s}
  .vsw>button:hover,.vsw.open>button{border-color:var(--fg,currentColor)}
  .vsw>button .dot{width:8px;height:8px;border-radius:50%;background:${DOT[cur]}}
  .vsw>button svg{transition:transform .25s}
  .vsw.open>button svg{transform:rotate(180deg)}
  .vsw ul{position:absolute;right:0;top:calc(100% + 10px);z-index:120;min-width:300px;margin:0;padding:8px;list-style:none;border-radius:16px;background:var(--surface,#fff);border:1px solid var(--line,rgba(127,127,127,.2));box-shadow:0 24px 60px -24px rgba(0,0,0,.55);opacity:0;visibility:hidden;transform:translateY(6px);transition:opacity .16s,transform .3s cubic-bezier(.2,.8,.2,1),visibility 0s linear .3s}
  .vsw.open ul{opacity:1;visibility:visible;transform:none;transition-delay:0s}
  .vsw a{display:grid;grid-template-columns:22px 1fr;gap:10px;align-items:start;padding:12px;border-radius:12px;color:var(--fg,inherit);text-decoration:none}
  .vsw a:hover,.vsw a:focus-visible{background:var(--surface-2,rgba(127,127,127,.12))}
  .vsw a b{display:block;font-weight:700;font-size:15px}
  .vsw a span{display:block;font-size:14px;line-height:1.4;color:var(--fg-muted,#777);margin-top:2px}
  .vsw a i{width:18px;height:18px;margin-top:2px;border-radius:50%;border:2px solid var(--line-strong,#999);display:grid;place-items:center}
  .vsw a[aria-current="true"] i{border-color:${RING[cur]}}
  .vsw a[aria-current="true"] i::after{content:"";width:8px;height:8px;border-radius:50%;background:${RING[cur]}}
  .vsw .short{display:none}
  @media (max-width:560px){.vsw>button .lbl{display:none}.vsw .short{display:inline}.vsw>button{padding:0 10px}.vsw ul{min-width:260px}}`;
  document.head.append(css);

  const wrap = document.createElement("div");
  wrap.className = "vsw";
  wrap.innerHTML = `<button type="button" aria-haspopup="true" aria-expanded="false" aria-controls="vsw-list" aria-label="Design version: Version ${cur}. Switch version">
      <span class="dot" aria-hidden="true"></span><span class="lbl">Version ${cur}</span><span aria-hidden="true" class="short">V${cur}</span>
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="m2.5 4.5 3.5 3.5 3.5-3.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button>
    <ul id="vsw-list" role="menu" aria-label="Design versions">
      ${VERSIONS.map((x) => `<li role="none"><a role="menuitem" href="${href(x.v)}" ${x.v === cur ? 'aria-current="true"' : ""}><i aria-hidden="true"></i><div><b>${x.name}${x.v === cur ? " · current" : ""}</b><span>${x.desc}</span></div></a></li>`).join("")}
    </ul>`;

  // Right edge of the header: V1 → .nav-actions, V2 → .tools
  const slot = document.querySelector(".nav-actions, .hdr .tools, .v3-actions, .v5-actions, .v6-actions");
  if (!slot) return;
  slot.append(wrap);

  const btn = wrap.querySelector("button"), items = [...wrap.querySelectorAll("a")];
  const setOpen = (o, focusFirst) => { wrap.classList.toggle("open", o); btn.setAttribute("aria-expanded", o); if (o && focusFirst) (items.find((a) => a.getAttribute("aria-current")) || items[0]).focus(); };
  btn.addEventListener("click", (e) => { e.stopPropagation(); setOpen(!wrap.classList.contains("open"), e.detail === 0); });
  btn.addEventListener("keydown", (e) => { if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true, true); } });
  wrap.addEventListener("keydown", (e) => {
    const i = items.indexOf(document.activeElement);
    if (e.key === "Escape") { setOpen(false); btn.focus(); }
    if (i > -1 && (e.key === "ArrowDown" || e.key === "ArrowUp")) { e.preventDefault(); items[(i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length].focus(); }
  });
  document.addEventListener("click", (e) => { if (!wrap.contains(e.target)) setOpen(false); });
  // Carry the theme choice across versions
  items.forEach((a) => a.addEventListener("click", () => {
    try { const t = document.documentElement.dataset.theme; localStorage.setItem("orbit-theme", t); localStorage.setItem("orbitb-theme", t); localStorage.setItem("orbitc-theme", t); } catch {}
  }));
})();
