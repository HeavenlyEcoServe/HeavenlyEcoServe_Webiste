/* Heavenly EcoServe: live 3D layer made of REAL food photographs (no drawn shapes).
   1) Real plates, bowls and tiffin towers (cut out of our own photos) float at different depths: they drift with your scroll,
      turn in 3D, lean toward the cursor and bob gently. Near ones are big and sharp, far ones small and soft.
   2) The tiffin viewer pops the real tiffin out of its photo in layers, and flips through real pictures (drag, tap, arrow keys).
   Optional: reduced motion, data-saver or the "Live photo scene" switch in the theme menu turn the floating layer off. */
(function () {
  'use strict';
  var D = document;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  var saveData = navigator.connection && navigator.connection.saveData;
  function pref() { try { return localStorage.getItem('he_3d'); } catch (e) { return null; } }
  function wants() { return pref() !== 'off' && !reduce && !saveData; }

  /* ---------- 1. floating real food in 3D ---------- */
  // file, base width (px)
  var POOL = [['samosa-plate', 300], ['tiffin-left', 190], ['pav-bhaji', 280], ['tiffin-right', 270], ['chilli-paneer', 250], ['thepla-plate', 270], ['chaat-plate', 290], ['aloo-paratha', 230], ['pani-puri', 270], ['roti-plate', 270], ['paratha-plate', 250]];
  var DEPTHS = [160, -380, 60, -160, 220, -300, 0, -80, 120, -240, 30];     // translateZ in px (positive = nearer the viewer)
  var layer = null, items = [], running = false, W = innerWidth, H = innerHeight, tx = 0, ty = 0, mx = 0, my = 0, sy = window.pageYOffset || 0, vel = 0, last = sy, t0 = performance.now();

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function build() {
    if (layer) return;
    layer = D.createElement('div'); layer.id = 'pscene'; layer.setAttribute('aria-hidden', 'true');
    var small = W < 760, n = small ? 4 : (W < 1100 ? 7 : 9), start = Math.floor(Math.random() * POOL.length);
    for (var i = 0; i < n; i++) {
      var p = POOL[(start + i * 4) % POOL.length], z = DEPTHS[(start + i) % DEPTHS.length], left = i % 2 === 0;
      var el = D.createElement('div'), img = D.createElement('img'), size = Math.round(p[1] * (small ? 0.5 : (W < 1100 ? 0.7 : 0.88)));
      el.className = 'fly'; img.src = 'media/fly/' + p[0] + '.webp'; img.alt = ''; img.decoding = 'async'; img.draggable = false;
      el.style.width = size + 'px';
      if (z < -250) img.style.filter = 'blur(1.6px) drop-shadow(0 22px 26px rgba(0,0,0,.4))'; else if (z < -100) img.style.filter = 'blur(.7px) drop-shadow(0 26px 30px rgba(0,0,0,.45))';
      el.appendChild(img); layer.appendChild(el);
      items.push({ el: el, size: size, z: z, cx: left ? rnd(small ? 0 : -3, small ? 6 : 3) : rnd(small ? 94 : 95, small ? 100 : 102), by: (i / n) * 100 + rnd(-4, 4),
        speed: (0.28 + (z + 400) / 900 * 0.9) * (left ? 1 : -1), tiltX: rnd(-12, 12), tiltY: rnd(-18, 18), spin: rnd(-3.2, 3.2), phase: rnd(0, 6.28), bob: rnd(8, 18), rz0: rnd(-14, 14), a: 1 });
    }
    D.body.insertBefore(layer, D.body.firstChild);
  }
  function frame(now) {
    var t = (now - t0) / 1000;
    sy = window.pageYOffset || 0; vel += ((sy - last) - vel) * 0.18; last = sy;
    mx += (tx - mx) * 0.05; my += (ty - my) * 0.05;
    var colL = Math.max(14, (W - 1180) / 2 + 10), colR = W - colL;
    var span = H + 480, kick = Math.max(-18, Math.min(18, vel * 0.35));
    layer.style.perspectiveOrigin = (50 + mx * 12).toFixed(1) + '% ' + (42 + my * 10).toFixed(1) + '%';
    for (var i = 0; i < items.length; i++) {
      var o = items[i], depth = (o.z + 420) / 640;
      var base = o.by / 100 * H - o.size * 0.5, y = (((base - sy * o.speed * 1.15) % span) + span) % span - 240;
      var x = o.cx / 100 * W - o.size / 2 + mx * 46 * depth + Math.sin(t * 0.5 + o.phase) * 10;
      var yy = y + my * 30 * depth + Math.sin(t * 0.8 + o.phase) * o.bob;
      var rx = o.tiltX - my * 20 * depth + Math.sin(t * 0.6 + o.phase) * 7 + kick;
      var ry = o.tiltY + mx * 30 * depth + Math.cos(t * 0.5 + o.phase) * 9;
      var rz = o.rz0 + t * o.spin + vel * 0.2;
      // ghost the object while it crosses the text column, so it never hides buttons or prices
      var ps = 900 / (900 - o.z), we = o.size * ps, xc = x + o.size / 2, lft = xc - we / 2, rgt = xc + we / 2;
      var ov = o.cx < 50 ? rgt - colL : colR - lft, tgt = ov <= 0 ? 1 : Math.max(0.16, 1 - ov / (we * 0.26));
      o.a += (tgt - o.a) * 0.12; o.el.style.opacity = o.a.toFixed(3);
      o.el.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + yy.toFixed(1) + 'px,' + o.z + 'px) rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg) rotateZ(' + rz.toFixed(2) + 'deg)';
    }
    if (running) requestAnimationFrame(frame);
  }
  function start() { if (!wants()) return; build(); layer.hidden = false; if (!running) { running = true; requestAnimationFrame(frame); } }
  function stop() { running = false; if (layer) layer.hidden = true; }
  addEventListener('resize', function () { W = innerWidth; H = innerHeight; });
  if (fine) addEventListener('pointermove', function (e) { tx = e.clientX / W - 0.5; ty = e.clientY / H - 0.5; }, { passive: true });
  addEventListener('he3d', function () { wants() ? start() : stop(); });
  D.addEventListener('visibilitychange', function () { if (D.hidden) running = false; else if (wants() && layer && !layer.hidden && !running) { running = true; requestAnimationFrame(frame); } });
  start();

  /* ---------- 2. tiffin viewer: layered pop-out + real pictures ---------- */
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
