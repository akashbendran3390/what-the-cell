/* Mystery specimen game on the DP Biology page (What the Cell, original game).
   Each day a real micrograph hides in a blurred microscope eyepiece. Five biology clues, the same for everyone:
   every correct answer brings the specimen into focus, and rarer correct answers sharpen it much more.
   Then students guess the specimen, and it is revealed and named. Optional leaderboard through a Cloudflare Worker. */
(function () {
  var root = document.getElementById('cellgrimage');
  if (!root) return;
  var API = root.getAttribute('data-api') || '';
  var GAME = (root.querySelector('.cg-title') || {}).textContent || 'Mystery specimen';
  var base = (document.querySelector('script[src*="cellgrimage.js"]').getAttribute('src') || '').replace(/cellgrimage\.js.*$/, '');

  var PTS = [0, 10, 25, 45, 70, 100];
  var TIER = ['', 'Common answer', 'Good answer', 'Strong answer', 'Rare answer', 'Super rare!'];
  var PER_DAY = 5, SECS = 25, TRIES = 3, GUESS_BONUS = 50;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function $(s, el) { return (el || root).querySelector(s); }
  var KEY = 'wtc-cellgrimage-v2';
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) {} }
  var store = load(); store.days = store.days || {};

  // ---------- days (Vietnam time, so the class shares one day) and today's picks; the worker uses the same code ----------
  function vnDay(ms) { return new Date((ms == null ? Date.now() : ms) + 7 * 36e5).toISOString().slice(0, 10); }
  var today = vnDay();
  function dayNum(day) { return Math.round((Date.parse(day + 'T00:00:00Z') - Date.parse('2026-01-01T00:00:00Z')) / 864e5); }
  function rng(seed) { return function () { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }; }
  function shuffled(n, seed) { var r = rng(seed), a = []; for (var i = 0; i < n; i++) a.push(i); for (i = n - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function dailyClues(C, day) {   // five clues from five different units
    var order = shuffled(C.length, 9173 + dayNum(day) * 7919), out = [], seen = {};
    for (var i = 0; i < order.length && out.length < PER_DAY; i++) { var u = C[order[i]].u; if (!seen[u]) { seen[u] = 1; out.push(order[i]); } }
    return out;
  }
  function dailySpecimen(S, day) {   // every specimen once before any repeats
    var d = dayNum(day), n = S.length, cyc = Math.floor(d / n), pos = ((d % n) + n) % n;
    return shuffled(n, 4241 + cyc * 613)[pos];
  }
  function guessOptions(S, si, seed) {   // the right answer plus three others, the same for everyone that day
    var o = shuffled(S.length, seed).filter(function (i) { return i !== si; }).slice(0, 3); o.push(si);
    return shuffled(4, seed + 7).map(function (k) { return o[k]; });
  }

  // ---------- answer matching (the worker uses the same rules) ----------
  function raw(s) { return String(s).toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, ''); }
  function norm(s) { s = raw(s); if (s.length > 3 && /s$/.test(s)) s = s.slice(0, -1); return s; }
  function forms(s) { var a = raw(s), b = norm(s); return a === b ? [a] : [a, b]; }
  function lev(a, b) {
    if (Math.abs(a.length - b.length) > 2) return 9;
    var p = [], i, j; for (j = 0; j <= b.length; j++) p[j] = j;
    for (i = 1; i <= a.length; i++) { var q = [i]; for (j = 1; j <= b.length; j++) q[j] = Math.min(p[j] + 1, q[j - 1] + 1, p[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); p = q; }
    return p[b.length];
  }
  function allow(k) { return k.length >= 10 ? 2 : k.length >= 5 ? 1 : 0; }
  function parsed(clue) {
    if (clue._p) return clue._p;
    clue._p = clue.a.map(function (s) { var f = s.split('|'); return { name: f[0], tier: +f[1], keys: [].concat.apply([], [f[0]].concat(f.slice(2)).map(forms)) }; });
    clue._strict = {};
    clue._p.forEach(function (a) { a.keys.forEach(function (k) { clue._p.forEach(function (b) { if (b !== a) b.keys.forEach(function (k2) { var al = allow(k.length > k2.length ? k : k2); if (al && lev(k, k2) <= al) clue._strict[k] = 1; }); }); }); });
    return clue._p;
  }
  function match(clue, text) {
    var tries = forms(text), best = null, bestD = 9, ps = parsed(clue);
    ps.forEach(function (a) { a.keys.forEach(function (k) { tries.forEach(function (t) {
      if (!t) return;
      var al = clue._strict[k] ? 0 : allow(k), d = t === k ? 0 : lev(t, k);
      if (d <= al && (d < bestD || (d === bestD && a.tier > best.tier))) { best = a; bestD = d; }
    }); }); });
    return best;
  }

  // ---------- the microscope ----------
  root.querySelector('.cg-app').innerHTML =
    '<div class="cg-scope-col"><div class="cg-scope"><canvas aria-label="The mystery specimen under the microscope" role="img"></canvas><div class="cg-ring" aria-hidden="true"></div></div>' +
    '<div class="cg-focus"><span>Focus</span><div class="cg-fbar"><i></i></div><b class="cg-fpct">0%</b></div></div>' +
    '<div class="cg-side"><div class="cg-panel" aria-live="polite"></div><div class="cg-board"></div></div>';
  var cv = $('canvas'), ctx = cv.getContext('2d'), scope = $('.cg-scope'), panel = $('.cg-panel'), boardEl = $('.cg-board');
  var small = document.createElement('canvas'), sctx = small.getContext('2d');
  var img = null, spec = null, clar = 0, clarShown = 0, anim = null, revealed = 0, W = 0;
  function sizeCanvas() {
    var w = scope.clientWidth || 300, h = scope.clientHeight || w, dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); cv.style.width = w + 'px'; cv.style.height = h + 'px'; W = dpr; draw();
  }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function draw() {
    var w = cv.width, h = cv.height;
    ctx.fillStyle = '#0d0821'; ctx.fillRect(0, 0, w, h);
    if (!img || !img.complete || !img.naturalWidth) return;
    var c = Math.max(0, Math.min(1, clarShown)), iw = img.naturalWidth, ih = img.naturalHeight, f = spec.f || [0.5, 0.5];
    // view window: tight on the focus point when blurry, the whole picture when clear
    var zoom = lerp(3.2, 1, Math.pow(c, 0.8)), fit = Math.max(w / iw, h / ih), fitAll = Math.min(w / iw, h / ih);
    var scale = revealed ? lerp(fit, fitAll, revealed) : fit * zoom;
    var vw = w / scale, vh = h / scale, cx = lerp(f[0] * iw, iw / 2, revealed ? 1 : c), cy = lerp(f[1] * ih, ih / 2, revealed ? 1 : c);
    var sx = Math.max(0, Math.min(iw - vw, cx - vw / 2)), sy = Math.max(0, Math.min(ih - vh, cy - vh / 2));
    if (vw > iw) sx = (iw - vw) / 2; if (vh > ih) sy = (ih - vh) / 2;
    // low resolution drawing, scaled up smoothly: the blur that clears as you answer
    var res = revealed ? 1 : Math.pow(c, 1.7);
    var lw = Math.max(6, Math.round(lerp(10, w, res))), lh = Math.max(6, Math.round(lw * h / w));
    small.width = lw; small.height = lh;
    sctx.imageSmoothingEnabled = true; sctx.imageSmoothingQuality = 'high';
    sctx.drawImage(img, sx, sy, vw, vh, 0, 0, lw, lh);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(small, 0, 0, lw, lh, 0, 0, w, h);
    var blur = revealed ? 0 : (1 - c) * 7, dim = revealed ? 1 : lerp(0.55, 1, c);
    cv.style.filter = (blur > 0.1 ? 'blur(' + blur.toFixed(1) + 'px) ' : '') + 'brightness(' + dim.toFixed(2) + ') saturate(' + (revealed ? 1 : lerp(0.4, 1, c)).toFixed(2) + ')';
    var pct = Math.round((revealed ? 1 : c) * 100);
    $('.cg-fbar i').style.width = pct + '%'; $('.cg-fpct').textContent = pct + '%';
  }
  function focusTo(target, then) {   // a short "focus hunting" wobble, then settle
    var from = clarShown, t0 = performance.now(), dur = reduce ? 1 : 1300;
    clar = target; if (anim) cancelAnimationFrame(anim);
    scope.classList.add('turning');
    (function step(t) {
      var k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      clarShown = from + (target - from) * e + (reduce ? 0 : Math.sin(k * Math.PI * 4) * 0.05 * (1 - k) * (target > from ? 1 : 0));
      draw();
      if (k < 1) anim = requestAnimationFrame(step); else { clarShown = target; draw(); scope.classList.remove('turning'); if (then) then(); }
    })(t0);
  }
  function revealAll() {
    var t0 = performance.now(), dur = reduce ? 1 : 1600; clarShown = 1;
    scope.classList.add('revealed');
    (function step(t) { var k = Math.min(1, (t - t0) / dur); revealed = 1 - Math.pow(1 - k, 3); draw(); if (k < 1) requestAnimationFrame(step); })(t0);
  }
  function setSpecimen(s, then) {
    spec = s; revealed = 0; scope.classList.remove('revealed');
    img = new Image(); img.onload = function () { draw(); if (then) then(); }; img.src = base + 'specimens/' + s.id + '.jpg';
  }
  window.addEventListener('resize', sizeCanvas);
  function clarityFor(pts) { return 1 - Math.exp(-pts / 150); }   // 65 points: about 35%, 150: 63%, 300: 86%

  // ---------- data ----------
  var DATA = null;
  function loadData() {
    if (DATA) return Promise.resolve(DATA);
    return fetch(base + 'cellgrimage-clues.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (j) { DATA = j; return j; });
  }

  // ---------- game state ----------
  var mode = 'daily', list = [], idx = 0, picks = [], timer = null, tries = 0, unit = '', guessSeed = 0, specIndex = 0;
  function rec() { return store.days[today]; }
  function total(ps) { return ps.reduce(function (a, b) { return a + PTS[b.tier || 0]; }, 0); }
  function streak() {
    var n = 0, d = Date.now();
    if (!(store.days[today] && store.days[today].done)) d -= 864e5;
    while (store.days[vnDay(d)] && store.days[vnDay(d)].done) { n++; d -= 864e5; }
    return n;
  }
  function stats() {
    var st = streak(), best = store.best || 0, out = '';
    if (st) out += '<span>Streak <b>' + st + ' day' + (st > 1 ? 's' : '') + '</b></span>';
    if (best) out += '<span>Best <b>' + best + '</b></span>';
    if (player()) out += '<span>Playing as <b>' + esc(player().name) + '</b></span>';
    return out ? '<div class="cg-stats">' + out + '</div>' : '';
  }
  var UNITS = ['Body Systems', 'Plant Systems', 'Genetics', 'Biomolecules', 'Cells', 'Biodiversity', 'Ecosystems', 'Skills'];

  function intro() {
    var r = rec();
    if (r && r.done) return finished(true);
    var resume = r && r.picks && r.picks.length;
    focusTo(resume ? clarityFor(total(r.picks)) : 0);
    panel.innerHTML =
      '<p class="cg-lede">A mystery specimen is hiding under the microscope. Answer five biology clues to bring it into focus, then guess what it is. <b>Common answers sharpen it a little. Rare answers that are still correct sharpen it a lot.</b></p>' +
      '<ul class="cg-rules"><li>25 seconds per clue. Spelling slips are forgiven.</li><li>Not recognised? Try again while the clock runs (3 tries).</li><li>Guess the specimen at the end for 50 bonus points. A new specimen every day at midnight.</li></ul>' + stats() +
      '<div class="cg-btns"><button type="button" class="cg-go" data-act="daily">' + (resume ? 'Carry on with today\'s specimen' : 'Look at today\'s specimen') + '</button></div>' +
      '<div class="cg-practice"><label for="cg-unit">Practise as much as you like:</label><select id="cg-unit"><option value="">All units</option>' + UNITS.map(function (u) { return '<option' + (u === unit ? ' selected' : '') + '>' + u + '</option>'; }).join('') + '</select><button type="button" class="cg-alt" data-act="practice">Practice specimen</button></div>';
  }

  function startDaily() {
    loadData().then(function () {
      mode = 'daily'; list = dailyClues(DATA.clues, today); specIndex = dailySpecimen(DATA.specimens, today); guessSeed = 5003 + dayNum(today) * 17;
      var r = rec() || { picks: [], typed: [] }; r.typed = r.typed || [];
      store.days[today] = r; picks = r.picks; idx = picks.length; save();
      setSpecimen(DATA.specimens[specIndex], function () { focusTo(clarityFor(total(picks))); });
      if (idx >= list.length) guess(); else ask();
    }, offline);
  }
  function startPractice() {
    unit = ($('#cg-unit') || {}).value || '';
    loadData().then(function () {
      mode = 'practice'; picks = []; idx = 0;
      var pool = []; DATA.clues.forEach(function (c, i) { if (!unit || c.u === unit) pool.push(i); });
      var seed = (Date.now() % 1e6) + 1, o = shuffled(pool.length, seed); list = o.slice(0, PER_DAY).map(function (k) { return pool[k]; });
      var todayIdx = dailySpecimen(DATA.specimens, today), others = []; DATA.specimens.forEach(function (s, i) { if (i !== todayIdx) others.push(i); });
      specIndex = others[seed % others.length]; guessSeed = seed + 11;
      clarShown = 0; setSpecimen(DATA.specimens[specIndex], function () { focusTo(0); }); ask();
    }, offline);
  }
  function offline() { panel.insertAdjacentHTML('beforeend', '<p class="cg-msg">The game could not load. Check your connection and try again.</p>'); }

  function head(clue) {
    return '<div class="cg-top"><span class="cg-step">' + (mode === 'daily' ? 'Clue ' + (idx + 1) + ' of ' + list.length : 'Practice clue ' + (idx + 1) + ' of ' + list.length) + '</span><span class="cg-tag">' + esc(clue.k === 'Skills' ? 'Skills' : clue.k + ' ' + clue.u) + '</span><span class="cg-score">' + total(picks) + ' points</span></div>';
  }
  function ask() {
    if (idx >= list.length) return guess();
    var clue = DATA.clues[list[idx]];
    tries = 0;
    if (mode === 'daily') { store.days[today].started = idx; save(); }
    panel.innerHTML = head(clue) +
      '<p class="cg-clue">' + esc(clue.c) + '</p>' +
      '<div class="cg-timer"><i style="width:100%"></i></div>' +
      '<form class="cg-form" autocomplete="off"><label class="cg-sr" for="cg-in">Your answer</label><input id="cg-in" type="text" maxlength="60" placeholder="Type your answer" spellcheck="false" autocapitalize="off"><button type="submit">Go</button></form>' +
      '<p class="cg-msg"></p>';
    var input = $('#cg-in'), bar = $('.cg-timer i'), msg = $('.cg-msg', panel), last = '';
    try { input.focus({ preventScroll: true }); } catch (e) { input.focus(); }
    var t0 = Date.now();
    clearInterval(timer);
    timer = setInterval(function () {
      var left = SECS - (Date.now() - t0) / 1000;
      bar.style.width = Math.max(0, left / SECS * 100) + '%'; bar.className = left < 6 ? 'low' : '';
      if (left <= 0) { clearInterval(timer); reveal(clue, null, input.value.trim() || last); }
    }, 100);
    $('.cg-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var v = input.value.trim(); if (!v) return;
      last = v;
      var m = match(clue, v);
      if (m) { clearInterval(timer); reveal(clue, m, v); return; }
      tries++;
      if (tries >= TRIES) { clearInterval(timer); reveal(clue, null, v); return; }
      msg.textContent = '"' + v + '" is not on our list. ' + (TRIES - tries) + ' more ' + (TRIES - tries === 1 ? 'try' : 'tries') + '.';
      input.value = ''; input.focus();
    });
  }

  function reveal(clue, m, typed) {
    picks.push({ tier: m ? m.tier : 0, ans: m ? m.name : '' });
    if (mode === 'daily') { var r = rec(); r.picks = picks; r.typed[idx] = m ? typed : ''; save(); }
    if (m) focusTo(clarityFor(total(picks)));
    // Only one or two of the rarest answers, so the rest stay a challenge for next time.
    var rare = parsed(clue).filter(function (a) { return a !== m && a.tier >= 4 && (!m || a.tier >= m.tier); });
    rare = shuffled(rare.length, (Date.now() % 9973) + 1).slice(0, 2).map(function (k) { return rare[k]; });
    var last = idx + 1 >= list.length;
    panel.innerHTML = head(clue) +
      '<p class="cg-clue small">' + esc(clue.c) + '</p>' +
      (m ? '<p class="cg-res t' + m.tier + '"><b>' + esc(m.name) + '</b> ' + TIER[m.tier] + '<span>+' + PTS[m.tier] + '</span></p>'
         : '<p class="cg-res t0">' + (typed ? '"' + esc(typed) + '" is not on our list.' : 'Time is up.') + '<span>+0</span></p>') +
      '<p class="cg-reach">' + (m ? (m.tier >= 4 ? 'The specimen snaps into focus!' : 'The specimen gets a little sharper.') : 'The specimen stays blurry this time.') + '</p>' +
      (rare.length ? '<p class="cg-sub">' + (rare.length > 1 ? 'Two rare answers' : 'A rare answer') + ' to remember for next time:</p><ul class="cg-rare">' + rare.map(function (a) { return '<li>' + esc(a.name) + ' <span>+' + PTS[a.tier] + '</span></li>'; }).join('') + '</ul>' : '') +
      '<div class="cg-btns"><button type="button" class="cg-go" data-act="next">' + (last ? 'Make your guess' : 'Next clue') + '</button>' + (mode === 'practice' ? '<button type="button" class="cg-alt" data-act="home">Stop practising</button>' : '') + '</div>';
    try { $('[data-act="next"]', panel).focus({ preventScroll: true }); } catch (e) {}
  }

  function guess() {
    var S = DATA.specimens, opts = guessOptions(S, specIndex, guessSeed);
    panel.innerHTML = '<div class="cg-top"><span class="cg-step">Your guess</span><span class="cg-score">' + total(picks) + ' points</span></div>' +
      '<p class="cg-clue">What do you think the specimen is?</p><p class="cg-sub">Look closely at the eyepiece. A right guess earns ' + GUESS_BONUS + ' bonus points.</p>' +
      '<div class="cg-guess">' + opts.map(function (i) { return '<button type="button" data-act="guess" data-i="' + i + '">' + esc(S[i].short) + '</button>'; }).join('') + '</div>';
  }
  function chose(i) {
    var right = i === specIndex;
    if (mode === 'daily') { var r = rec(); r.guess = DATA.specimens[i].id; r.right = right; save(); finished(false); }
    else showReveal(right, total(picks) + (right ? GUESS_BONUS : 0), DATA.specimens[i]);
  }
  function showReveal(right, sc, picked, isDaily) {
    revealAll();
    var s = spec;
    panel.innerHTML =
      '<p class="cg-step">' + (isDaily ? 'Today\'s specimen' : 'Practice specimen') + '</p>' +
      '<p class="cg-verdict ' + (right ? 'yes' : 'no') + '">' + (right ? 'You got it! +' + GUESS_BONUS : 'Not quite: you guessed ' + esc(picked ? picked.short : 'nothing')) + '</p>' +
      '<h3 class="cg-name">' + esc(s.name) + '</h3>' +
      '<p class="cg-desc">' + esc(s.desc) + '</p>' +
      '<p class="cg-credit">' + esc(s.k) + ' &middot; Image: ' + esc(s.credit) + '</p>' +
      '<p class="cg-big">' + sc + ' <small>points</small></p>' +
      (isDaily ? '<div class="cg-sq">' + squares(picks) + (right ? '<i class="t5 g" title="Guessed the specimen"></i>' : '<i class="t0 g" title="Guess missed"></i>') + '</div>' + stats() : '') +
      '<div class="cg-btns">' + (isDaily ? '<button type="button" class="cg-go" data-act="share">Copy my result</button>' : '<button type="button" class="cg-go" data-act="practice">Another practice specimen</button>') + '<button type="button" class="cg-alt" data-act="' + (isDaily ? 'practice' : 'home') + '">' + (isDaily ? 'Practice mode' : 'Back') + '</button></div>' +
      '<p class="cg-msg"></p>' + (isDaily ? '<p class="cg-next">New specimen in <b class="cg-cd"></b></p>' : '');
  }

  function squares(ps) { return ps.map(function (p) { return '<i class="t' + p.tier + '" title="' + (p.tier ? esc(p.ans) + ': ' + PTS[p.tier] + ' points' : 'No points') + '"></i>'; }).join(''); }
  function finished(onLoad) {
    loadData().then(function () {
      var r = rec(); picks = r.picks; specIndex = dailySpecimen(DATA.specimens, today);
      var sc = total(picks) + (r.right ? GUESS_BONUS : 0);
      if (!r.done) { r.done = true; r.score = sc; store.best = Math.max(store.best || 0, sc); save(); }
      var show = function () { showReveal(!!r.right, sc, DATA.specimens.filter(function (s) { return s.id === r.guess; })[0], true); cd(); submit(); };
      if (onLoad || !spec || spec.id !== DATA.specimens[specIndex].id) setSpecimen(DATA.specimens[specIndex], show); else show();
    });
    function cd() {
      clearInterval(finished.t);
      var tick = function () { var el = $('.cg-cd', panel); if (!el) return; if (vnDay() !== today) { location.reload(); return; } var ms = Date.parse(vnDay() + 'T00:00:00Z') + 864e5 - (Date.now() + 7 * 36e5); el.textContent = Math.floor(ms / 36e5) + ' h ' + Math.floor(ms % 36e5 / 6e4) + ' min'; };
      tick(); finished.t = setInterval(tick, 30000);
    }
  }
  function shareText() {
    var r = rec(), sq = { 0: '⬜', 1: '🟦', 2: '🟩', 3: '🟨', 4: '🟧', 5: '🟥' };
    var pct = Math.round(clarityFor(total(r.picks)) * 100);
    return GAME + ' ' + today.slice(8) + '/' + today.slice(5, 7) + ': ' + r.score + ' points, focus ' + pct + '%, ' + (r.right ? 'guessed the specimen 🔬' : 'missed the specimen') + '\n' + r.picks.map(function (p) { return sq[p.tier]; }).join('') + '\nwhatthecell.org/dp-biology.html#cellgrimage';
  }

  // ---------- leaderboard ----------
  function player() { return store.player || null; }
  function api(path, body) {
    return fetch(API.replace(/\/$/, '') + path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {})
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw j; return j; }); });
  }
  function submit() {
    var r = rec();
    if (!API || !player() || !r || !r.done || r.sent) return;
    api('/score', { name: player().name, code: player().code, day: today, answers: r.typed || [], guess: r.guess || '' }).then(function () { r.sent = true; save(); board(); },
      function (e) { if (e && e.error === 'already') { r.sent = true; save(); } board(); });
  }
  var tab = 'day';
  function board() {
    if (!API) { boardEl.innerHTML = '<h3>Leaderboard</h3><p class="cg-note">The class leaderboard is coming soon.</p>'; return; }
    var p = player();
    var who = p ? '<p class="cg-note">On the board as <b>' + esc(p.name) + '</b>. Your player code is <b>' + esc(p.code) + '</b>: keep it to play on another device. <button type="button" class="cg-link" data-act="switch">Not you?</button></p>'
      : '<form class="cg-join"><p class="cg-note">Add your name to join the leaderboard. No sign-up needed.</p><label class="cg-sr" for="cg-first">First name</label><input id="cg-first" maxlength="20" placeholder="First name" autocomplete="given-name"><label class="cg-sr" for="cg-ini">Initial of family name</label><input id="cg-ini" maxlength="1" placeholder="Initial" autocomplete="off"><button type="submit">Join</button><button type="button" class="cg-link" data-act="haveCode">I already have a player code</button><p class="cg-msg"></p></form>';
    boardEl.innerHTML = '<div class="cg-bhead"><h3>Leaderboard</h3><div class="cg-tabs" role="tablist"><button type="button" role="tab" data-tab="day" aria-selected="' + (tab === 'day') + '">Today</button><button type="button" role="tab" data-tab="week" aria-selected="' + (tab === 'week') + '">This week</button></div></div><ol class="cg-list"><li class="cg-note">Loading...</li></ol>' + who;
    api('/board?' + (tab === 'week' ? 'week=1' : 'day=' + today)).then(function (j) {
      var ol = $('.cg-list', boardEl), me = p && p.name;
      if (!j.rows || !j.rows.length) { ol.innerHTML = '<li class="cg-note">' + (tab === 'week' ? 'No scores yet this week.' : 'No one has finished today\'s specimen yet. Be the first!') + '</li>'; return; }
      ol.innerHTML = j.rows.map(function (row, i) { return '<li class="' + (row.name === me ? 'me' : '') + '"><span class="cg-rank">' + (i + 1) + '</span><span class="cg-name2">' + esc(row.name) + '</span><span class="cg-pts">' + row.score + '</span>' + (admin ? '<button type="button" class="cg-link" data-act="remove" data-name="' + esc(row.name) + '">remove</button>' : '') + '</li>'; }).join('');
    }, function () { $('.cg-list', boardEl).innerHTML = '<li class="cg-note">The leaderboard could not load right now.</li>'; });
  }
  boardEl.addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target, msg = $('.cg-msg', f);
    if (f.getAttribute('data-mode') === 'code') {
      var nm = $('#cg-name', f).value.trim(), code = $('#cg-code', f).value.trim().toUpperCase();
      api('/signin', { name: nm, code: code }).then(function (j) { store.player = { name: j.name, code: code }; save(); submit(); board(); }, function (er) { msg.textContent = (er && er.message) || 'That name and code do not match.'; });
      return;
    }
    var first = $('#cg-first', f).value.trim(), ini = $('#cg-ini', f).value.trim();
    if (!/^[A-Za-zÀ-ɏḀ-ỿ' -]{2,20}$/.test(first) || !/^[A-Za-zÀ-ɏḀ-ỿ]$/.test(ini)) { msg.textContent = 'Type your first name and the first letter of your family name.'; return; }
    api('/claim', { first: first, initial: ini }).then(function (j) { store.player = { name: j.name, code: j.code }; save(); submit(); board(); },
      function (er) { msg.textContent = (er && er.message) || 'Could not join right now. Try again later.'; });
  });
  boardEl.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('button'); if (!b) return;
    if (b.getAttribute('data-tab')) { tab = b.getAttribute('data-tab'); board(); }
    var act = b.getAttribute('data-act');
    if (act === 'haveCode') { var f = $('.cg-join', boardEl); f.setAttribute('data-mode', 'code'); f.innerHTML = '<p class="cg-note">Type your leaderboard name exactly as before (for example Minh T.) and your player code.</p><input id="cg-name" maxlength="24" placeholder="Name, e.g. Minh T."><input id="cg-code" maxlength="6" placeholder="Code"><button type="submit">Sign in</button><p class="cg-msg"></p>'; }
    if (act === 'switch' && confirm('Sign out of ' + player().name + ' on this device? You will need the player code to sign back in.')) { delete store.player; save(); board(); }
    if (act === 'remove' && confirm('Remove ' + b.getAttribute('data-name') + ' and all their scores?')) api('/admin', { key: adminKey, action: 'remove', name: b.getAttribute('data-name') }).then(board, function () { alert('Not removed: check the admin key.'); });
  });
  var admin = /cellgrimage-admin/.test(location.hash), adminKey = '';
  if (admin) { try { adminKey = sessionStorage.getItem('cg-admin') || ''; } catch (e) {} if (!adminKey) { adminKey = prompt('Admin key') || ''; try { sessionStorage.setItem('cg-admin', adminKey); } catch (e) {} } }

  panel.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-act]'); if (!b) return;
    var act = b.getAttribute('data-act');
    if (act === 'daily') startDaily();
    else if (act === 'practice') { if (!$('#cg-unit')) unit = unit; startPractice(); }
    else if (act === 'home') { clearInterval(timer); spec = null; img = null; clarShown = 0; revealed = 0; scope.classList.remove('revealed'); draw(); intro(); }
    else if (act === 'next') { idx++; ask(); }
    else if (act === 'guess') chose(+b.getAttribute('data-i'));
    else if (act === 'share') {
      var t = shareText(), msg = $('.cg-msg', panel);
      var ok = function () { msg.textContent = 'Copied. Paste it to challenge your friends.'; };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(ok, function () { msg.textContent = t; });
      else msg.textContent = t;
    }
  });

  // A clue opened but never answered (page closed mid-clue) counts as 0.
  var r0 = rec();
  if (r0 && !r0.done && r0.started != null && r0.picks && r0.picks.length === r0.started) { r0.picks.push({ tier: 0, ans: '' }); r0.typed = r0.typed || []; r0.typed[r0.started] = ''; delete r0.started; save(); }

  sizeCanvas();
  // Show today's specimen, fully blurred, behind the start screen so the eyepiece is never empty.
  loadData().then(function () { var r = rec(); if (!(r && r.done)) setSpecimen(DATA.specimens[dailySpecimen(DATA.specimens, today)], function () { clarShown = r && r.picks ? clarityFor(total(r.picks)) : 0; draw(); }); });
  intro(); board();
  window.cgDebug = {
    today: today, store: function () { return store; },
    reset: function () { delete store.days[today]; save(); location.reload(); },
    focus: function (c) { clarShown = c; draw(); }, reveal: revealAll,
    show: function (id) { return loadData().then(function () { setSpecimen(DATA.specimens.filter(function (s) { return s.id === id; })[0], draw); }); },
    match: function (ci, t) { return loadData().then(function () { var m = match(DATA.clues[ci], t); return m && m.name; }); },
    daily: function () { return loadData().then(function () { return { specimen: DATA.specimens[dailySpecimen(DATA.specimens, today)].id, clues: dailyClues(DATA.clues, today).map(function (i) { return DATA.clues[i].c; }) }; }); }
  };
})();
