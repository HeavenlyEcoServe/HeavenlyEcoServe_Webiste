/* Heavenly EcoServe: immersive layer. Cursor-reactive "spice ink" canvas, scroll storytelling, tilt and magnetic UI.
   Original code. Degrades gracefully: reduced-motion, touch devices, hidden tabs and off-screen canvases are all handled. */
(function () {
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  var small = innerWidth < 760;
  var ws = [];
  var $ = function (s, r) { return (r || document).querySelector(s); }, $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };

  /* ---------- cheap smooth noise ---------- */
  function noise(x, y, t) { return Math.sin(x * 1.7 + t) * Math.cos(y * 1.3 - t * .8) + Math.sin((x + y) * .9 + t * .6) * .6; }

  /* ---------- ink canvas ---------- */
  function Ink(canvas, opts) {
    var ctx = canvas.getContext('2d'), host = canvas.parentElement, dpr = Math.min(devicePixelRatio || 1, small ? 1.25 : 1.6);
    var HOT = '255,157,46', COOL = '47,208,166', LIGHT = false;
    function colours() { var cs = getComputedStyle(document.documentElement); HOT = cs.getPropertyValue('--hot-rgb').trim() || HOT; COOL = cs.getPropertyValue('--cool-rgb').trim() || COOL; LIGHT = cs.getPropertyValue('--tone').trim() === 'light'; }
    colours(); addEventListener('themechange', colours);
    var W = 0, H = 0, P = [], N = (opts && opts.count) || (small ? 320 : 950), t = 0, run = false, raf = 0;
    var ptr = { x: -9999, y: -9999, vx: 0, vy: 0, on: false }, auto = { x: 0, y: 0 };
    function size() { var r = host.getBoundingClientRect(); W = r.width; H = r.height; canvas.width = W * dpr; canvas.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
    function spawn(p) { p.x = Math.random() * W; p.y = Math.random() * H; p.px = p.x; p.py = p.y; p.w = Math.random() > .42 ? 0 : 1; p.l = 60 + Math.random() * 200; p.a = 0; p.s = .6 + Math.random() * 1.2; return p; }
    function init() { size(); P = []; for (var i = 0; i < N; i++) P.push(spawn({})); }
    function move(e) { var r = host.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top; if (ptr.on) { ptr.vx = x - ptr.x; ptr.vy = y - ptr.y; } ptr.x = x; ptr.y = y; ptr.on = true; ptr.t = performance.now(); }
    host.addEventListener('pointermove', move, { passive: true });
    host.addEventListener('pointerleave', function () { ptr.on = false; });
    host.addEventListener('touchmove', function (e) { var tt = e.touches[0]; if (tt) move(tt); }, { passive: true });
    function step() {
      raf = requestAnimationFrame(step); t += .004;
      // idle wander so the scene is alive without a mouse
      var idle = !ptr.on || performance.now() - (ptr.t || 0) > 2200;
      if (idle) { var ax = W * (.5 + .32 * Math.sin(t * 2.1)), ay = H * (.55 + .26 * Math.cos(t * 1.6)); ptr.vx = ax - auto.x; ptr.vy = ay - auto.y; auto.x = ax; auto.y = ay; }
      var cx = idle ? auto.x : ptr.x, cy = idle ? auto.y : ptr.y, R = Math.min(W, H) * (small ? .34 : .26), R2 = R * R;
      ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = 'rgba(0,0,0,.055)'; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = LIGHT ? 'source-over' : 'lighter'; ctx.lineWidth = 1.35; ctx.lineCap = 'round';
      for (var i = 0; i < P.length; i++) {
        var p = P[i], ang = noise(p.x * .0021, p.y * .0021, t * 3) * 1.7;
        var vx = Math.cos(ang) * p.s, vy = Math.sin(ang) * p.s + .06;
        var dx = p.x - cx, dy = p.y - cy, d2 = dx * dx + dy * dy;
        if (d2 < R2) { var f = 1 - d2 / R2; vx += (-dy * .02 + ptr.vx * .06) * f * 3; vy += (dx * .02 + ptr.vy * .06) * f * 3; p.a = Math.min(1, p.a + f * .5); }
        p.px = p.x; p.py = p.y; p.x += vx; p.y += vy; p.l--; p.a *= .985;
        var al = Math.min(.9, .2 + p.a * .85);
        ctx.strokeStyle = 'rgba(' + (p.w ? COOL : HOT) + ',' + (LIGHT ? al * .75 : (p.w ? al * .8 : al)) + ')';
        ctx.beginPath(); ctx.moveTo(p.px, p.py); ctx.lineTo(p.x, p.y); ctx.stroke();
        if (p.l <= 0 || p.x < -20 || p.x > W + 20 || p.y < -20 || p.y > H + 20) spawn(p);
      }
    }
    function staticFrame() { ctx.globalCompositeOperation = 'lighter'; ctx.lineWidth = 1; for (var k = 0; k < 700; k++) { var x = Math.random() * W, y = Math.random() * H, a = noise(x * .002, y * .002, 1) * 1.7; ctx.strokeStyle = Math.random() > .4 ? 'rgba(255,170,60,.22)' : 'rgba(47,208,166,.16)'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * 26, y + Math.sin(a) * 26); ctx.stroke(); } }
    function start() { if (run || reduce) return; run = true; raf = requestAnimationFrame(step); }
    function stop() { run = false; cancelAnimationFrame(raf); }
    init(); if (reduce) staticFrame();
    new ResizeObserver(function () { size(); if (reduce) staticFrame(); }).observe(host);
    if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { e[0].isIntersecting ? start() : stop(); }, { threshold: .02 }).observe(host); else start();
    document.addEventListener('visibilitychange', function () { document.hidden ? stop() : start(); });
  }
  function Stars(c) {
    var host = c.parentElement, r = host.getBoundingClientRect(), dpr = 1; c.width = r.width; c.height = r.height; var x = c.getContext('2d');
    for (var i = 0; i < (small ? 70 : 160); i++) { var a = Math.random(); x.fillStyle = 'rgba(255,245,215,' + (.15 + a * .6) + ')'; x.beginPath(); x.arc(Math.random() * c.width, Math.random() * c.height * .75, .4 + a * 1.2, 0, 6.3); x.fill(); }
  }
  $$('.hero').forEach(function (h) {
    var s = document.createElement('canvas'); s.className = 'stars'; s.setAttribute('aria-hidden', 'true'); h.insertBefore(s, h.firstChild);
    var c = document.createElement('canvas'); c.className = 'ink'; c.setAttribute('aria-hidden', 'true'); h.insertBefore(c, s.nextSibling);
    Stars(s); Ink(c);
  });
  $$('.final').forEach(function (f) { var c = $('canvas.ink', f); if (c) Ink(c, { count: small ? 220 : 520 }); });

  /* ---------- split-letter headline ---------- */
  $$('.split-t').forEach(function (el) {
    var i = 0; (function walk(n) {
      [].slice.call(n.childNodes).forEach(function (c) {
        if (c.nodeType === 3) { var f = document.createDocumentFragment(); c.textContent.split(/(\s+)/).forEach(function (w) { if (/^\s+$/.test(w) || !w) { f.appendChild(document.createTextNode(w)); return; } var word = document.createElement('span'); word.style.display = 'inline-block'; word.style.whiteSpace = 'nowrap'; w.split('').forEach(function (ch) { var s = document.createElement('span'); s.className = 'ch'; s.style.setProperty('--i', i++); s.textContent = ch; word.appendChild(s); }); f.appendChild(word); }); n.replaceChild(f, c); }
        else if (c.nodeType === 1 && c.tagName !== 'BR') walk(c);
      });
    })(el); el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
  });

  /* ---------- header, progress, cursor glow ---------- */
  var header = $('header'), bar = document.createElement('div'); bar.id = 'progress'; document.body.appendChild(bar);
  function onScroll() { var y = scrollY, h = document.documentElement.scrollHeight - innerHeight; bar.style.transform = 'scaleX(' + (h > 0 ? y / h : 0) + ')'; header.classList.toggle('scrolled', y > 40); words(); }
  addEventListener('scroll', function () { requestAnimationFrame(onScroll); }, { passive: true }); onScroll();
  if (fine && !reduce) {
    var g = document.createElement('div'); g.id = 'glow'; document.body.appendChild(g); var gx = 0, gy = 0, tx = 0, ty = 0;
    addEventListener('pointermove', function (e) { if (e.pointerType === 'touch') return; tx = e.clientX; ty = e.clientY; g.classList.add('on'); }, { passive: true });
    (function loop() { gx += (tx - gx) * .12; gy += (ty - gy) * .12; g.style.transform = 'translate3d(' + gx + 'px,' + gy + 'px,0)'; requestAnimationFrame(loop); })();
    // 3D tilt on cards and tiles
    $$('.card,.tile,.plan').forEach(function (el) {
      el.addEventListener('pointermove', function (e) { if (e.pointerType === 'touch') return; var r = el.getBoundingClientRect(), px = (e.clientX - r.left) / r.width - .5, py = (e.clientY - r.top) / r.height - .5; el.style.transform = 'perspective(900px) rotateY(' + px * 7 + 'deg) rotateX(' + -py * 7 + 'deg) translateZ(0)'; });
      el.addEventListener('pointerleave', function () { el.style.transform = ''; });
    });
    // magnetic buttons
    $$('.btn-gold,.btn-line,.cartbtn').forEach(function (b) {
      b.addEventListener('pointermove', function (e) { if (e.pointerType === 'touch') return; var r = b.getBoundingClientRect(); b.style.transform = 'translate(' + (e.clientX - r.left - r.width / 2) * .18 + 'px,' + (e.clientY - r.top - r.height / 2) * .28 + 'px)'; });
      b.addEventListener('pointerleave', function () { b.style.transform = ''; });
    });
  }

  /* ---------- scroll-lit statement words ---------- */
  $$('.words').forEach(function (p) {
    var hl = (p.dataset.hl || '').toLowerCase().split(',').map(function (x) { return x.trim(); }).filter(Boolean);
    var txt = p.textContent.trim().split(/\s+/); p.setAttribute('aria-label', txt.join(' ')); p.textContent = '';
    txt.forEach(function (w, i) { var s = document.createElement('span'); s.className = 'w' + (hl.indexOf(w.toLowerCase().replace(/[^a-z]/g, '')) > -1 ? ' hl' : ''); s.setAttribute('aria-hidden', 'true'); s.textContent = w + ' '; p.appendChild(s); ws.push(s); });
  });
  function words() {
    if (!ws.length) return; var vh = innerHeight;
    ws.forEach(function (s) { var r = s.getBoundingClientRect(); s.classList.toggle('on', reduce || r.top < vh * .72); });
  }
  words();

  $$('.hero').forEach(function (h) { h.addEventListener('pointermove', function (e) { if (e.pointerType === 'touch') return; var r = h.getBoundingClientRect(); h.style.setProperty('--mx', ((e.clientX - r.left) / r.width - .5).toFixed(3)); h.style.setProperty('--my', ((e.clientY - r.top) / r.height - .5).toFixed(3)); }, { passive: true }); });

  /* ---------- theme switcher + 3D switch ---------- */
  var THEMES = [['night', 'Night Kitchen', 'Deep green, gold and saffron ink', 'linear-gradient(135deg,#0f1f18,#d9b45f)'], ['sunrise', 'Saffron Sunrise', 'Warm cream and marigold (light)', 'linear-gradient(135deg,#fff1dc,#f08c1a)'],
    ['spice', 'Spice Market', 'Maroon, rose and brass', 'linear-gradient(135deg,#2a0f16,#ff6b3d)'], ['garden', 'Cardamom Garden', 'Fresh ivory and emerald (light)', 'linear-gradient(135deg,#e7f0df,#2a8a5a)'], ['indigo', 'Indigo Evening', 'Midnight blue and gold', 'linear-gradient(135deg,#121a40,#6c8cff)']];
  var root = document.documentElement, lsGet = function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, lsSet = function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} };
  function applyTheme(id, save) {
    if (!THEMES.some(function (t) { return t[0] === id; })) id = 'night';
    root.classList.add('theming'); root.dataset.theme = id; if (save) lsSet('he_theme', id); setTimeout(function () { root.classList.remove('theming'); }, 700);
    var m = document.querySelector('meta[name=theme-color]'); if (m) m.content = getComputedStyle(root).getPropertyValue('--bg').trim();
    $$('.sw').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.t === id); }); dispatchEvent(new Event('themechange'));
  }
  var cartWrap = $('#cartbtn') && $('#cartbtn').parentElement;
  if (cartWrap) {
    cartWrap.classList.add('ctl');
    var tb = document.createElement('button'); tb.className = 'themebtn'; tb.type = 'button'; tb.setAttribute('aria-label', 'Change theme'); tb.setAttribute('aria-expanded', 'false'); tb.innerHTML = '&#9680;'; cartWrap.insertBefore(tb, cartWrap.firstChild);
    var pop = document.createElement('div'); pop.id = 'themepop'; pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-label', 'Choose a theme');
    pop.innerHTML = '<h4>Choose your mood</h4>' + THEMES.map(function (t) { return '<button class="sw" type="button" data-t="' + t[0] + '" aria-pressed="false"><i style="background:' + t[3] + '"></i><span><b>' + t[1] + '</b><small>' + t[2] + '</small></span></button>'; }).join('') +
      '<div class="tgl"><span>Live 3D scene</span><button type="button" id="t3d" aria-pressed="' + (lsGet('he_3d') !== 'off') + '" aria-label="Toggle 3D scene"></button></div>';
    document.body.appendChild(pop);
    tb.onclick = function (e) { e.stopPropagation(); var o = pop.classList.toggle('open'); tb.setAttribute('aria-expanded', o); };
    pop.onclick = function (e) { e.stopPropagation(); var b = e.target.closest('.sw'); if (b) applyTheme(b.dataset.t, true); var t3 = e.target.closest('#t3d'); if (t3) { var on = t3.getAttribute('aria-pressed') !== 'true'; t3.setAttribute('aria-pressed', on); lsSet('he_3d', on ? 'on' : 'off'); dispatchEvent(new Event('he3d')); } };
    document.addEventListener('click', function () { pop.classList.remove('open'); tb.setAttribute('aria-expanded', 'false'); }); addEventListener('keydown', function (e) { if (e.key === 'Escape') pop.classList.remove('open'); });
  }
  applyTheme(root.dataset.theme || 'night', false);

  /* ---------- parallax on hero content ---------- */
  var hc = $('.hero .hero-in, .hero .wrap');
  if (hc && !reduce) addEventListener('scroll', function () { var y = scrollY; if (y < innerHeight) hc.style.transform = 'translate3d(0,' + y * .18 + 'px,0)'; hc.style.opacity = Math.max(0, 1 - y / (innerHeight * .9)); }, { passive: true });
})();
