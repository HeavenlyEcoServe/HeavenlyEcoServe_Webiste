/* Heavenly EcoServe: live 3D layer made of REAL food photographs (no drawn shapes).
   1) Hero: real plates and tiffin towers float in 3D between the hero photo and the headline, with a moving colour glow.
      They sit BEHIND the text and fade softly if they drift under it, so every word stays readable.
   2) Rest of the page: the same real food drifts down the page margins BEHIND the content (content is always on top).
   3) The tiffin viewer pops the real tiffin out of its photo in layers, and flips through real pictures (drag, tap, arrow keys).
   Optional: reduced motion, data-saver or the "Live photo scene" switch in the theme menu turn the floating layers off. */
(function () {
  'use strict';
  var D = document;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  var saveData = navigator.connection && navigator.connection.saveData;
  function pref() { try { return localStorage.getItem('he_3d'); } catch (e) { return null; } }
  function wants() { return pref() !== 'off' && !reduce && !saveData; }
  function rnd(a, b) { return a + Math.random() * (b - a); }

  var POOL = [['samosa-plate', 300], ['tiffin-left', 190], ['pav-bhaji', 280], ['tiffin-right', 270], ['chilli-paneer', 250], ['thepla-plate', 270], ['chaat-plate', 290], ['aloo-paratha', 230], ['pani-puri', 270], ['roti-plate', 270], ['paratha-plate', 250]];
  var ASP = { 'samosa-plate': 0.69, 'aloo-paratha': 0.71, 'chaat-plate': 0.55, 'chilli-paneer': 0.67, 'paratha-plate': 0.6, 'pani-puri': 0.575, 'pav-bhaji': 0.49, 'thepla-plate': 0.58, 'roti-plate': 0.61, 'tiffin-left': 1.51, 'tiffin-right': 0.61 };   // height / width of each cut-out
  var DEPTHS = [160, -380, 60, -160, 220, -300, 0, -80, 120, -240, 30];     // translateZ in px (positive = nearer the viewer)
  var W = innerWidth, H = innerHeight, tx = 0, ty = 0, mx = 0, my = 0, sy = window.pageYOffset || 0, vel = 0, last = sy, t0 = performance.now(), running = false;
  var page = null, heroes = [];

  function mkImg(name, z) {
    var img = D.createElement('img'); img.src = 'media/fly/' + name + '.webp'; img.alt = ''; img.decoding = 'async'; img.draggable = false;
    if (z < -250) img.style.filter = 'drop-shadow(0 16px 20px rgba(0,0,0,.35))';
    return img;
  }

  /* ---------- page layer (behind all content) ---------- */
  function buildPage() {
    if (page) return;
    var layer = D.createElement('div'); layer.id = 'pscene'; layer.setAttribute('aria-hidden', 'true'); page = { layer: layer, items: [] };
    var small = W < 760, slow = (navigator.hardwareConcurrency || 8) <= 4, n = small ? 4 : (W < 1100 ? 6 : (slow ? 6 : 9)), start = Math.floor(Math.random() * POOL.length);
    for (var i = 0; i < n; i++) {
      var p = POOL[(start + i * 4) % POOL.length], z = DEPTHS[(start + i) % DEPTHS.length], left = i % 2 === 0;
      var el = D.createElement('div'), size = Math.round(p[1] * (small ? 0.5 : (W < 1100 ? 0.7 : 0.88)));
      el.className = 'fly'; el.style.width = size + 'px'; el.appendChild(mkImg(p[0], z)); layer.appendChild(el);
      page.items.push({ el: el, size: size, asp: ASP[p[0]] || 0.7, z: z, cx: left ? rnd(small ? 0 : -3, small ? 6 : 3) : rnd(small ? 94 : 95, small ? 100 : 102), by: (i / n) * 100 + rnd(-4, 4),
        speed: (0.28 + (z + 400) / 900 * 0.9) * (left ? 1 : -1), tiltX: rnd(-12, 12), tiltY: rnd(-18, 18), spin: rnd(-3.2, 3.2), phase: rnd(0, 6.28), bob: rnd(8, 18), rz0: rnd(-14, 14), a: 1, dim: false });
    }
    D.body.insertBefore(layer, D.body.firstChild);
  }
  function framePage(t) {
    var colL = Math.max(14, (W - 1180) / 2 + 10), colR = W - colL, span = H + 480, kick = Math.max(-18, Math.min(18, vel * 0.35));
    page.layer.style.perspectiveOrigin = (50 + mx * 12).toFixed(1) + '% ' + (42 + my * 10).toFixed(1) + '%';
    page.items.forEach(function (o) {
      var depth = (o.z + 420) / 640, base = o.by / 100 * H - o.size * 0.5, y = (((base - sy * o.speed * 1.15) % span) + span) % span - 240;
      var x = o.cx / 100 * W - o.size / 2 + mx * 46 * depth + Math.sin(t * 0.5 + o.phase) * 10, yy = y + my * 30 * depth + Math.sin(t * 0.8 + o.phase) * o.bob;
      var rx = o.tiltX - my * 20 * depth + Math.sin(t * 0.6 + o.phase) * 7 + kick, ry = o.tiltY + mx * 30 * depth + Math.cos(t * 0.5 + o.phase) * 9, rz = o.rz0 + t * o.spin + vel * 0.2;
      var ps = 900 / (900 - o.z), we = o.size * ps, xc = x + o.size / 2, lft = xc - we / 2, rgt = xc + we / 2;
      var ov = o.cx < 50 ? rgt - colL : colR - lft, tgt = ov <= 0 ? 1 : Math.max(0.3, 1 - ov / (we * 0.4));
      o.a += (tgt - o.a) * 0.1; o.el.style.opacity = o.a.toFixed(3);
      var dimNow = ov > 6; if (dimNow !== o.dim) { o.dim = dimNow; o.el.classList.toggle('dim', dimNow); }
      o.el.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + yy.toFixed(1) + 'px,' + o.z + 'px) rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg) rotateZ(' + rz.toFixed(2) + 'deg)';
    });
  }

  /* ---------- hero layer (between the hero photo and the headline) ---------- */
  var HERO_BIG = [['samosa-plate', 360, 80, 60, 180], ['pav-bhaji', 300, 94, 22, -60], ['chaat-plate', 290, 64, 88, -220], ['tiffin-left', 200, 57, 14, -340], ['thepla-plate', 250, 6, 70, -300], ['chilli-paneer', 230, 2, 14, -380]];
  var HERO_SMALL = [['samosa-plate', 190, 84, 68, 120], ['tiffin-right', 170, 12, 90, -200], ['roti-plate', 150, 94, 22, -260]];
  function buildHero(hero) {
    var box = D.createElement('div'); box.className = 'hflies'; box.setAttribute('aria-hidden', 'true');
    var small = W < 760, short = hero.offsetHeight < 560, spec = small ? HERO_SMALL : (short ? HERO_BIG.slice(0, 3) : HERO_BIG), k = Math.min(1, W / 1440 + 0.3), items = [];
    spec.forEach(function (s) {
      var el = D.createElement('div'), size = Math.round(s[1] * k); el.className = 'fly'; el.style.width = size + 'px'; el.appendChild(mkImg(s[0], s[4])); box.appendChild(el);
      items.push({ el: el, size: size, asp: ASP[s[0]] || 0.7, cx: s[2], cy: s[3], z: s[4], tiltX: rnd(-10, 10), tiltY: rnd(-16, 16), spin: rnd(-2.4, 2.4), phase: rnd(0, 6.28), bob: rnd(8, 16), rz0: rnd(-12, 12), a: 1, dim: false });
    });
    hero.appendChild(box); var h = { hero: hero, box: box, items: items, tr: null }; measure(h); return h;
  }
  function measure(h) {    // the region taken by the headline, text, buttons and any form: objects fade when they drift under it
    var r = h.hero.getBoundingClientRect(), u = null;
    h.hero.querySelectorAll('.wrap h1,.wrap p,.wrap .btns,.wrap .kicker,.wrap form,.wrap .card,.wrap input').forEach(function (e) {
      var b = e.getBoundingClientRect(); if (!b.width || !b.height) return;
      u = u ? { l: Math.min(u.l, b.left), t: Math.min(u.t, b.top), r: Math.max(u.r, b.right), b: Math.max(u.b, b.bottom) } : { l: b.left, t: b.top, r: b.right, b: b.bottom };
    });
    h.tr = u ? { l: u.l - r.left - 40, t: u.t - r.top - 40, r: u.r - r.left + 40, b: u.b - r.top + 40 } : null;
  }
  function frameHero(h, t) {
    var r = h.hero.getBoundingClientRect(); if (r.bottom < -80 || r.top > H + 80) return;
    var w = r.width, hh = r.height;
    h.box.style.perspectiveOrigin = (50 + mx * 14).toFixed(1) + '% ' + (45 + my * 10).toFixed(1) + '%';
    h.items.forEach(function (o) {
      var depth = (o.z + 420) / 640, x = o.cx / 100 * w - o.size / 2 + mx * 54 * depth + Math.sin(t * 0.5 + o.phase) * 12;
      var y = o.cy / 100 * hh - o.size * o.asp / 2 + my * 34 * depth + Math.sin(t * 0.8 + o.phase) * o.bob - r.top * (0.06 + depth * 0.18);
      var rx = o.tiltX - my * 22 * depth + Math.sin(t * 0.6 + o.phase) * 8, ry = o.tiltY + mx * 34 * depth + Math.cos(t * 0.5 + o.phase) * 10, rz = o.rz0 + t * o.spin;
      var ps = 900 / (900 - o.z), we = o.size * ps, he = o.size * o.asp * ps, cx = x + o.size / 2, cy = y + o.size * o.asp / 2, tgt = 1, tr = h.tr;
      if (tr && cx + we / 2 > tr.l && cx - we / 2 < tr.r && cy + he / 2 > tr.t && cy - he / 2 < tr.b) tgt = 0.4;
      o.a += (tgt - o.a) * 0.1; o.el.style.opacity = o.a.toFixed(3);
      var dimNow = tgt < 1; if (dimNow !== o.dim) { o.dim = dimNow; o.el.classList.toggle('dim', dimNow); }
      o.el.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,' + o.z + 'px) rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg) rotateZ(' + rz.toFixed(2) + 'deg)';
    });
  }

  function frame(now) {
    var t = (now - t0) / 1000;
    sy = window.pageYOffset || 0; vel += ((sy - last) - vel) * 0.18; last = sy;
    mx += (tx - mx) * 0.05; my += (ty - my) * 0.05;
    if (page) framePage(t);
    for (var i = 0; i < heroes.length; i++) frameHero(heroes[i], t);
    if (running) requestAnimationFrame(frame);
  }
  function start() {
    if (!wants()) return;
    buildPage(); page.layer.hidden = false;
    if (!heroes.length) D.querySelectorAll('.hero').forEach(function (h) { heroes.push(buildHero(h)); });
    heroes.forEach(function (h) { h.box.hidden = false; });
    if (!running) { running = true; requestAnimationFrame(frame); }
  }
  function stop() { running = false; if (page) page.layer.hidden = true; heroes.forEach(function (h) { h.box.hidden = true; }); }
  function remeasure() { W = innerWidth; H = innerHeight; heroes.forEach(measure); }
  addEventListener('resize', remeasure); addEventListener('load', function () { setTimeout(remeasure, 400); });
  if (D.fonts && D.fonts.ready) D.fonts.ready.then(remeasure);
  if (fine) addEventListener('pointermove', function (e) { tx = e.clientX / W - 0.5; ty = e.clientY / H - 0.5; }, { passive: true });
  addEventListener('he3d', function () { wants() ? start() : stop(); });
  D.addEventListener('visibilitychange', function () { if (D.hidden) running = false; else if (wants() && page && !page.layer.hidden && !running) { running = true; requestAnimationFrame(frame); } });
  start();

  /* ---------- tiffin viewer: layered pop-out + real pictures ---------- */
  D.querySelectorAll('.tfv').forEach(function (host) {
    var slides = [].slice.call(host.querySelectorAll('.tfv-s')), dots = host.querySelector('.tfv-dots'), cap = host.querySelector('.tfv-cap'), cur = 0, timer = 0, vis = false, sx = 0, dx = 0, down = false, moved = false, hover = false, px = 0, py = 0, tpx = 0, tpy = 0;
    slides.forEach(function (s, i) { var b = D.createElement('button'); b.type = 'button'; b.setAttribute('aria-label', 'Show picture ' + (i + 1)); b.onclick = function (e) { e.stopPropagation(); go(i); }; dots.appendChild(b); });
    function go(n) {
      cur = (n + slides.length) % slides.length;
      slides.forEach(function (s, i) { var d = (i - cur + slides.length) % slides.length; s.className = s.className.replace(/\s*\b(on|next|prev)\b/g, '') + (d === 0 ? ' on' : d === 1 ? ' next' : ' prev'); });
      [].forEach.call(dots.children, function (b, i) { b.className = i === cur ? 'on' : ''; });
      if (cap) cap.textContent = slides[cur].dataset.cap || '';
    }
    function auto() { clearInterval(timer); if (!reduce) timer = setInterval(function () { if (vis && !down && !hover) go(cur + 1); }, 6500); }
    function sway(now) {   // idle motion so the layers drift even on a phone with no cursor
      var ph = now / 1000;
      if (!hover && !down) { tpx = Math.sin(ph * 0.7) * 0.32; tpy = Math.cos(ph * 0.53) * 0.22; }
      px += (tpx - px) * 0.08; py += (tpy - py) * 0.08;
      host.style.setProperty('--px', px.toFixed(3)); host.style.setProperty('--py', py.toFixed(3));
      requestAnimationFrame(sway);
    }
    if (!reduce) requestAnimationFrame(sway);
    host.addEventListener('pointerdown', function (e) { down = true; moved = false; sx = e.clientX; dx = 0; try { host.setPointerCapture(e.pointerId); } catch (x) {} });
    host.addEventListener('pointermove', function (e) {
      var r = host.getBoundingClientRect();
      if (down) { dx = e.clientX - sx; if (Math.abs(dx) > 6) moved = true; host.style.setProperty('--drag', Math.max(-80, Math.min(80, dx)) + 'px'); }
      if (e.pointerType !== 'touch') { hover = true; tpx = (e.clientX - r.left) / r.width - 0.5; tpy = (e.clientY - r.top) / r.height - 0.5; }
    });
    function up() { if (!down) return; down = false; host.style.setProperty('--drag', '0px'); if (moved && Math.abs(dx) > 40) go(cur + (dx < 0 ? 1 : -1)); else if (!moved) go(cur + 1); auto(); }
    host.addEventListener('pointerup', up); host.addEventListener('pointercancel', function () { down = false; host.style.setProperty('--drag', '0px'); });
    host.addEventListener('pointerleave', function () { hover = false; });
    host.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') go(cur + 1); else if (e.key === 'ArrowLeft') go(cur - 1); });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { var was = vis; vis = e[0].isIntersecting; if (vis && !was) auto(); }, { threshold: 0.4 }).observe(host); else vis = true;
    go(0); auto();
  });
})();
