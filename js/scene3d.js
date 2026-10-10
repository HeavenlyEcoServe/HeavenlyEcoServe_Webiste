/* Heavenly EcoServe: live 3D layer (three.js r128, loaded from a CDN).
   1) A fixed full-page scene of procedural food objects that travel with your scroll and lean toward the cursor.
   2) A draggable 3D tiffin you can spin and "open".
   Everything is optional: no WebGL, no CDN, reduced motion or the 3D switch = the normal site. */
(function () {
  var D = document, root = D.documentElement;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var small = innerWidth < 760, fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  var saveData = navigator.connection && navigator.connection.saveData;
  var lowCPU = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2;
  function pref() { try { return localStorage.getItem('he_3d'); } catch (e) { return null; } }
  function wantsScene() { return pref() !== 'off' && !reduce && !saveData && !lowCPU; }
  function css(name, fb) { var v = getComputedStyle(root).getPropertyValue(name).trim(); return v || fb; }
  function webgl() { try { var c = D.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl'))); } catch (e) { return false; } }

  function boot() {
    if (!window.THREE || !webgl()) return;
    var T = THREE, scene3d = null;

    /* ---------------- shared builders ---------------- */
    function steel() { return new T.MeshPhongMaterial({ color: 0xc9d1d6, specular: 0xffffff, shininess: 140 }); }
    function buildTiffin(tiers) {
      var g = new T.Group(), parts = [], mat = steel(), dark = new T.MeshPhongMaterial({ color: 0x8f989d, specular: 0xffffff, shininess: 60 });
      for (var i = 0; i < tiers; i++) {
        var t = new T.Group(), body = new T.Mesh(new T.CylinderGeometry(.95, .95, .62, 48, 1, false), mat), rim = new T.Mesh(new T.TorusGeometry(.95, .04, 12, 48), dark);
        rim.rotation.x = Math.PI / 2; rim.position.y = .31; t.add(body, rim); t.userData.y = i * .66; t.position.y = t.userData.y; g.add(t); parts.push(t);
      }
      var lid = new T.Group(), top = new T.Mesh(new T.CylinderGeometry(.9, .98, .26, 48), mat), knob = new T.Mesh(new T.SphereGeometry(.17, 20, 16), new T.MeshPhongMaterial({ color: 0xd9b45f, specular: 0xffffff, shininess: 120 }));
      knob.position.y = .22; lid.add(top, knob); lid.userData.y = tiers * .66 - .05; lid.position.y = lid.userData.y; g.add(lid); parts.push(lid);
      var food = new T.Mesh(new T.CylinderGeometry(.82, .82, .05, 40), new T.MeshPhongMaterial({ color: 0xd9661e, shininess: 20 })); food.position.y = (tiers - 1) * .66 + .32; g.add(food); g.userData.food = food;
      var clipH = tiers * .66 + .1, bar = function (x) { var b = new T.Mesh(new T.BoxGeometry(.06, clipH, .08), dark); b.position.set(x, clipH / 2 - .3, 0); return b; };
      g.add(bar(-1.0), bar(1.0));
      var handle = new T.Mesh(new T.TorusGeometry(.85, .035, 10, 40, Math.PI), dark); handle.position.y = tiers * .66 + .1; g.add(handle); g.userData.parts = parts; g.userData.handle = handle; g.position.y = -tiers * .33;
      return g;
    }
    function buildRoti() { var g = new T.Group(), m = new T.MeshPhongMaterial({ color: 0xe0b266, shininess: 8 }), spot = new T.MeshPhongMaterial({ color: 0x9a5f26, shininess: 4 });
      for (var i = 0; i < 4; i++) { var d = new T.Mesh(new T.CylinderGeometry(1.15, 1.15, .08, 48), m); d.position.y = i * .1; d.rotation.y = i * .7; g.add(d); if (i === 3) g.userData.top = d; for (var k = 0; k < 4; k++) { var s = new T.Mesh(new T.CircleGeometry(.07 + Math.random() * .05, 10), spot); s.rotation.x = -Math.PI / 2; s.position.set((Math.random() - .5) * 1.4, i * .1 + .045, (Math.random() - .5) * 1.4); g.add(s); } }
      return g; }
    function buildSamosa() { var m = new T.MeshPhongMaterial({ color: 0xe0a030, shininess: 30, flatShading: true }), g = new T.Group(), c = new T.Mesh(new T.ConeGeometry(1.15, 1.7, 3), m); c.rotation.y = Math.PI / 6; g.add(c);
      var edge = new T.Mesh(new T.ConeGeometry(1.17, 1.72, 3), new T.MeshBasicMaterial({ color: 0x8a5410, wireframe: true, transparent: true, opacity: .35 })); edge.rotation.y = Math.PI / 6; g.add(edge); return g; }
    function buildJalebi() { var pts = [], turns = 3.2; for (var i = 0; i <= 140; i++) { var t = i / 140, a = t * turns * Math.PI * 2, r = .12 + t * 1.15; pts.push(new T.Vector3(Math.cos(a) * r, Math.sin(t * 9) * .05, Math.sin(a) * r)); }
      var m = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 220, .1, 10, false), new T.MeshPhongMaterial({ color: 0xf08a0a, emissive: 0x4a2000, shininess: 90 })); var g = new T.Group(); g.add(m); return g; }
    function buildPods() { var g = new T.Group(), m = new T.MeshPhongMaterial({ color: 0x7fae5a, shininess: 25 });
      for (var i = 0; i < 7; i++) { var p = new T.Mesh(new T.SphereGeometry(.22, 14, 12), m); p.scale.set(1, 1.7, 1); var a = i / 7 * Math.PI * 2; p.position.set(Math.cos(a) * 1.0, Math.sin(i * 1.7) * .4, Math.sin(a) * 1.0); p.rotation.z = a; g.add(p); } return g; }

    /* ---------------- page-long scene ---------------- */
    function startScene() {
      if (scene3d || !wantsScene()) return;
      var canvas = D.createElement('canvas'); canvas.id = 'scene3d'; canvas.setAttribute('aria-hidden', 'true'); D.body.insertBefore(canvas, D.body.firstChild);
      var renderer = new T.WebGLRenderer({ canvas: canvas, alpha: true, antialias: !small, powerPreference: 'low-power' });
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, small ? 1.2 : 1.6)); renderer.setClearColor(0x000000, 0);
      var scene = new T.Scene(), camera = new T.PerspectiveCamera(42, 1, .1, 120); camera.position.set(0, 0, 13);
      var amb = new T.AmbientLight(0xffffff, .55), key = new T.DirectionalLight(0xffffff, .9), hot = new T.PointLight(0xff9d2e, 1.4, 30), cool = new T.PointLight(0x2fd0a6, 1.1, 30);
      key.position.set(3, 6, 8); hot.position.set(-6, 2, 6); cool.position.set(6, -2, 5); scene.add(amb, key, hot, cool);
      var SPAN = 30, side = small ? 2.5 : 4.6, sc = small ? .62 : 1;
      var defs = [[buildTiffin(3), .06, 1], [buildRoti(), .2, -1], [buildSamosa(), .36, 1], [buildJalebi(), .52, -1], [buildPods(), .67, 1], [buildTiffin(2), .8, -1], [buildSamosa(), .93, 1]], items = [];
      defs.forEach(function (d, i) { var o = d[0]; o.scale.setScalar(sc * (i === 4 ? 1.1 : 1)); o.userData.dir = d[2]; o.position.x = d[2] * side; o.position.y = -d[1] * SPAN; o.userData.base = o.position.clone(); o.userData.seed = i * 1.7; o.rotation.x = .35; scene.add(o); items.push(o); });
      // drifting spice dust
      var N = small ? 140 : 360, pos = new Float32Array(N * 3), seed = [];
      for (var i = 0; i < N; i++) { pos[i * 3] = (Math.random() - .5) * 26; pos[i * 3 + 1] = -Math.random() * (SPAN + 10) + 4; pos[i * 3 + 2] = (Math.random() - .5) * 14 - 2; seed.push(Math.random() * 6.28); }
      var geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3));
      var dustMat = new T.PointsMaterial({ size: small ? .09 : .075, color: 0xff9d2e, transparent: true, opacity: .75, depthWrite: false, blending: T.AdditiveBlending }); var dust = new T.Points(geo, dustMat); scene.add(dust);
      function themeColors() { var tone = css('--tone', 'dark'); var hotC = css('--saffron', '#ff9d2e'), coolC = css('--teal', '#2fd0a6'); hot.color.set(hotC); cool.color.set(coolC); dustMat.color.set(hotC);
        dustMat.blending = tone === 'light' ? T.NormalBlending : T.AdditiveBlending; dustMat.opacity = tone === 'light' ? .55 : .75; dustMat.needsUpdate = true; amb.intensity = tone === 'light' ? .42 : .55; key.intensity = tone === 'light' ? .75 : .9; canvas.style.opacity = tone === 'light' ? .8 : .95; }
      themeColors(); addEventListener('themechange', themeColors);
      var mx = 0, my = 0, tx = 0, ty = 0, curY = 0, vel = 0, lastY = scrollY, run = false, raf = 0, W = 0, H = 0, t0 = performance.now();
      function size() { W = innerWidth; H = innerHeight; renderer.setSize(W, H, false); camera.aspect = W / H; camera.updateProjectionMatrix(); var halfW = Math.tan(21 * Math.PI / 180) * 13 * camera.aspect; items.forEach(function (o) { o.userData.base.x = o.userData.dir * halfW * (small ? .6 : .76); }); }
      size(); addEventListener('resize', size);
      addEventListener('pointermove', function (e) { tx = e.clientX / W - .5; ty = e.clientY / H - .5; }, { passive: true });
      function frame(now) {
        raf = requestAnimationFrame(frame); var t = (now - t0) / 1000;
        var max = Math.max(1, D.documentElement.scrollHeight - innerHeight), prog = Math.min(1, Math.max(0, scrollY / max));
        vel += ((scrollY - lastY) - vel) * .12; lastY = scrollY;
        curY += (-prog * SPAN - curY) * .07; mx += (tx - mx) * .06; my += (ty - my) * .06;
        camera.position.set(mx * 1.6, curY - my * .9, 13); camera.lookAt(mx * .5, curY - my * .3, 0);
        hot.position.set(-6 + mx * 8, curY + 2 - my * 4, 6); cool.position.set(6 + mx * 8, curY - 2, 5);
        var spin = Math.min(.12, Math.abs(vel) * .004);
        items.forEach(function (o, i) {
          var s = o.userData.seed; o.rotation.y += .006 + spin * (i % 2 ? 1 : -1); o.position.y = o.userData.base.y + Math.sin(t * .8 + s) * .22; o.rotation.z = Math.sin(t * .5 + s) * .08;
          o.position.x = o.userData.base.x + mx * (i % 2 ? -.6 : .6);
          if (o.userData.top) { o.userData.top.position.y = .3 + Math.max(0, Math.sin(t * 1.4 + s)) * .35; o.userData.top.scale.y = 1 + Math.max(0, Math.sin(t * 1.4 + s)) * 1.6; }
          if (o.userData.parts) { var open = Math.max(0, Math.sin(t * .6 + s)) * .35; o.userData.parts.forEach(function (p, k) { p.position.y = p.userData.y + k * open; }); o.userData.food.position.y = (o.userData.parts.length - 2) * .66 + .32 + open * (o.userData.parts.length - 2); }
        });
        var a = geo.attributes.position.array; for (var i = 0; i < N; i++) { a[i * 3 + 1] += .004 + Math.sin(t * .6 + seed[i]) * .0015; a[i * 3] += Math.sin(t * .4 + seed[i]) * .0035; if (a[i * 3 + 1] > 5) a[i * 3 + 1] = -(SPAN + 6); } geo.attributes.position.needsUpdate = true;
        renderer.render(scene, camera);
      }
      function go() { if (run) return; run = true; raf = requestAnimationFrame(frame); } function halt() { run = false; cancelAnimationFrame(raf); }
      D.addEventListener('visibilitychange', function () { D.hidden ? halt() : go(); });
      scene3d = { start: go, stop: halt, el: canvas, renderer: renderer }; root.classList.add('has3d'); go();
    }
    function stopScene() { if (!scene3d) return; scene3d.stop(); scene3d.el.remove(); scene3d.renderer.dispose(); scene3d = null; root.classList.remove('has3d'); }
    addEventListener('he3d', function () { wantsScene() ? startScene() : stopScene(); });
    startScene();

    /* ---------------- draggable 3D tiffin viewer ---------------- */
    D.querySelectorAll('.v3').forEach(function (host) {
      if (reduce) return;
      var cv = D.createElement('canvas'); host.appendChild(cv); var r = new T.WebGLRenderer({ canvas: cv, alpha: true, antialias: true }); r.setPixelRatio(Math.min(devicePixelRatio || 1, 1.8));
      var sc = new T.Scene(), cam = new T.PerspectiveCamera(38, 1, .1, 50); cam.position.set(0, .4, 7.4);
      sc.add(new T.AmbientLight(0xffffff, .42)); var k = new T.DirectionalLight(0xffffff, .8); k.position.set(3, 5, 6); sc.add(k); var h = new T.PointLight(0xff9d2e, 1.2, 20); h.position.set(-4, 1, 4); sc.add(h); var c2 = new T.PointLight(0x2fd0a6, .9, 20); c2.position.set(4, -1, 4); sc.add(c2);
      var tf = buildTiffin(3), pivot = new T.Group(); pivot.add(tf); pivot.scale.setScalar(1.15); sc.add(pivot);
      var rotY = .6, vY = 0, rotX = .25, drag = false, lx = 0, ly = 0, hover = false, open = 0, vis = false, raf = 0;
      function size() { var b = host.getBoundingClientRect(); r.setSize(b.width, b.height, false); cam.aspect = b.width / b.height; cam.updateProjectionMatrix(); }
      size(); new ResizeObserver(size).observe(host);
      host.addEventListener('pointerdown', function (e) { drag = true; lx = e.clientX; ly = e.clientY; host.setPointerCapture(e.pointerId); });
      host.addEventListener('pointermove', function (e) { if (drag) { vY = (e.clientX - lx) * .01; rotY += vY; rotX = Math.max(-.2, Math.min(.9, rotX + (e.clientY - ly) * .005)); lx = e.clientX; ly = e.clientY; } });
      host.addEventListener('pointerup', function () { drag = false; }); host.addEventListener('pointerleave', function () { hover = false; }); host.addEventListener('pointerenter', function () { hover = true; });
      host.addEventListener('click', function () { open = open > .5 ? 0 : 1; }); var openT = 0;
      function frame(now) {
        raf = requestAnimationFrame(frame); if (!drag) { vY *= .95; rotY += vY + .004; }
        var want = (hover ? .5 : 0) + open * .55; openT += (want - openT) * .08; var parts = tf.userData.parts;
        parts.forEach(function (p, i) { p.position.y = p.userData.y + i * openT * .55 + (i === parts.length - 1 ? openT * .9 : 0); }); tf.userData.food.position.y = 2 * .66 + .32 + 2 * openT * .55;
        pivot.rotation.y = rotY; pivot.rotation.x = rotX; pivot.position.y = Math.sin(now / 900) * .06; r.render(sc, cam);
      }
      function go() { if (!raf) raf = requestAnimationFrame(frame); } function halt() { cancelAnimationFrame(raf); raf = 0; }
      new IntersectionObserver(function (e) { e[0].isIntersecting ? go() : halt(); }, { threshold: .05 }).observe(host); host.classList.add('live');
    });
  }

  function load() {
    if (window.THREE) return boot();
    var s = D.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'; s.async = true; s.onload = boot; s.onerror = function () { /* site works without 3D */ }; D.head.appendChild(s);
  }
  if (D.readyState === 'complete') load(); else addEventListener('load', load);
})();
