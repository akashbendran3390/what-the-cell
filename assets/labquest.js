/* Daily Lab Quest: the MYP Science daily game on myp.html (teacher's request, 2026-11-20).
   One quest a day (Vietnam date, UTC+7) of 10 rounds for the chosen MYP year: quick-fire true/false, multiple choice,
   estimate with a slider, odd one out, and predict-it with an animated scene. Solo play: streaks, XP and ranks,
   badges and a discovery-card sticker book are kept in this browser (localStorage). Questions: assets/labquest-bank.js.
   window.lqDebug: { start(year), answer(i), next(), state(), day(n) } for testing. */
(function () {
  'use strict';
  var BANK = window.LQ_BANK || [], CARDS = window.LQ_CARDS || [];
  var root = document.getElementById('lab-quest'); if (!root || !BANK.length) return;
  var KEY = 'wtc-labquest-v1', reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var PLAN = ['tf', 'mcq', 'pred', 'est', 'odd', 'mcq', 'pred', 'est', 'odd', 'mcq'];
  var TYPES = {
    tf: { name: 'Quick-fire', icon: '⚡', col: '#E4572E' }, mcq: { name: 'Brain teaser', icon: '🧠', col: '#5F3DB8' },
    pred: { name: 'Predict it', icon: '🔮', col: '#B0356F' }, est: { name: 'Estimate it', icon: '🎯', col: '#D97706' },
    odd: { name: 'Odd one out', icon: '🧩', col: '#1F7A7A' }
  };
  var RANKS = [[0, 'Lab Rookie'], [1500, 'Bench Scientist'], [4000, 'Field Explorer'], [8000, 'Lab Leader'], [14000, 'Research Fellow'], [22000, 'Chief Scientist'], [32000, 'Science Legend']];
  var BADGES = [
    ['first', '🧪', 'First quest', 'Finish your first daily quest'],
    ['s3', '🔥', 'On fire', 'A 3-day streak'],
    ['s7', '🌟', 'Week of science', 'A 7-day streak'],
    ['s14', '🚀', 'Lift-off', 'A 14-day streak'],
    ['s30', '🏆', 'Science habit', 'A 30-day streak'],
    ['perfect', '💎', 'Flawless', 'All 10 rounds right in one quest'],
    ['combo5', '⚡', 'Chain reaction', 'Five right in a row'],
    ['est', '🎯', 'Sharp eye', 'Two estimates within 10% in one quest'],
    ['seer', '🔮', 'Fortune teller', 'Both predictions right in one quest'],
    ['cards10', '📚', 'Collector', 'Collect 10 discovery cards'],
    ['practice', '💪', 'Extra mile', 'Play 5 practice rounds']
  ];

  // ---------- storage ----------
  function load() { try { var s = JSON.parse(localStorage.getItem(KEY)); if (s && typeof s === 'object') return s; } catch (e) {} return {}; }
  var S = load(); S.hist = S.hist || {}; S.badges = S.badges || {}; S.cards = S.cards || []; S.xp = S.xp || 0; S.streak = S.streak || 0; S.best = S.best || 0;
  S.year = S.year || 3; S.practice = S.practice || 0;
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }

  // ---------- dates (Vietnam, UTC+7) ----------
  var dayOffset = 0;
  function vnDate(add) { return new Date(Date.now() + 7 * 3600e3 + ((add || 0) + dayOffset) * 864e5).toISOString().slice(0, 10); }
  function dayNum(d) { return Math.floor(Date.parse(d + 'T00:00:00Z') / 864e5); }
  function prettyDate(d) { var dt = new Date(d + 'T00:00:00Z'); return dt.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }); }

  // ---------- seeded choice ----------
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function shuffle(a, r) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function pool(type, year) { var p = []; BANK.forEach(function (q, i) { if (q.t === type && q.y[0] <= year && year <= q.y[1]) p.push(i); }); return p; }
  function dailyQuest(year, date) {
    var d = dayNum(date), need = {}, used = {}, out = [];
    PLAN.forEach(function (t) { need[t] = (need[t] || 0) + (t === 'tf' ? 3 : 1); });
    var perms = {};
    Object.keys(need).forEach(function (t) { perms[t] = shuffle(pool(t, year), rng(hash('lq|' + t + '|' + year))); });
    PLAN.forEach(function (t) {
      var p = perms[t], n = p.length; used[t] = used[t] || 0;
      var take = t === 'tf' ? 3 : 1, items = [];
      for (var k = 0; k < take; k++) { items.push(p[(d * need[t] + used[t]) % n]); used[t]++; }
      out.push({ t: t, items: items });
    });
    return out;
  }
  function practiceQuest(year) {
    var r = Math.random, plan = shuffle(['tf', 'mcq', 'pred', 'est', 'odd'], r);
    return plan.map(function (t) { var p = shuffle(pool(t, year), r); return { t: t, items: p.slice(0, t === 'tf' ? 3 : 1) }; });
  }

  // ---------- sound (off by default) ----------
  var actx = null;
  function beep(kind) {
    if (!S.sound) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      var notes = kind === 'good' ? [660, 880, 1175] : kind === 'bad' ? [300, 220] : kind === 'win' ? [523, 659, 784, 1047] : [520];
      notes.forEach(function (f, i) {
        var o = actx.createOscillator(), g = actx.createGain(), t0 = actx.currentTime + i * 0.09;
        o.type = kind === 'bad' ? 'sawtooth' : 'triangle'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.12, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18);
        o.connect(g); g.connect(actx.destination); o.start(t0); o.stop(t0 + 0.2);
      });
    } catch (e) {}
  }

  // ---------- helpers ----------
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function fmt(s) { return esc(s).replace(/\^(-?\d+)/g, '<sup>$1</sup>').replace(/_(\d)/g, '<sub>$1</sub>').replace(/\*\*(.+?)\*\*/g, '<b>$1</b>'); }
  function num(x) { var a = Math.abs(x); var s = a >= 100 ? Math.round(x).toLocaleString('en-GB') : a >= 10 ? (Math.round(x * 10) / 10).toLocaleString('en-GB') : (Math.round(x * 100) / 100).toLocaleString('en-GB'); return s; }
  function rank(xp) { var r = RANKS[0], nx = null; for (var i = 0; i < RANKS.length; i++) { if (xp >= RANKS[i][0]) { r = RANKS[i]; nx = RANKS[i + 1] || null; } } return { name: r[1], lo: r[0], hi: nx ? nx[0] : null, next: nx ? nx[1] : null, lvl: RANKS.indexOf(r) + 1 }; }

  function confetti(x, y, n) {
    if (reduce) return;
    var cols = ['#FBDD82', '#F7A8CF', '#8ADFDA', '#C9B8F5', '#F9BC8F', '#CBE98A', '#E4572E'];
    for (var i = 0; i < (n || 28); i++) {
      var p = el('i', 'lq-conf'); var a = Math.random() * Math.PI * 2, v = 60 + Math.random() * 140;
      p.style.left = x + 'px'; p.style.top = y + 'px'; p.style.background = cols[i % cols.length];
      p.style.setProperty('--dx', Math.cos(a) * v + 'px'); p.style.setProperty('--dy', (Math.sin(a) * v - 90) + 'px'); p.style.setProperty('--r', (Math.random() * 720 - 360) + 'deg');
      document.body.appendChild(p); setTimeout(function (q) { return function () { q.remove(); }; }(p), 1300);
    }
  }
  function burstFrom(node, n) { var r = node.getBoundingClientRect(); confetti(r.left + r.width / 2, r.top + r.height / 2, n); }

  // ---------- Fizz the flask (original mascot) ----------
  function fizz(mood) {
    var mouth = mood === 'oops' ? '<path d="M41 79 q9 -7 18 0" fill="none" stroke="#1E0E4A" stroke-width="3" stroke-linecap="round"/>'
      : mood === 'think' ? '<path d="M42 78 h16" stroke="#1E0E4A" stroke-width="3" stroke-linecap="round"/>'
        : '<path d="M40 74 q10 10 20 0" fill="#1E0E4A"/>';
    var eyes = mood === 'wow' ? '<circle cx="41" cy="64" r="5" fill="#1E0E4A"/><circle cx="59" cy="64" r="5" fill="#1E0E4A"/>'
      : '<circle cx="41" cy="64" r="3.6" fill="#1E0E4A"/><circle cx="59" cy="64" r="3.6" fill="#1E0E4A"/>';
    return '<svg class="lq-fizz" viewBox="0 0 100 110" aria-hidden="true"><circle class="b1" cx="30" cy="12" r="5" fill="#8ADFDA"/><circle class="b2" cx="62" cy="8" r="4" fill="#F7A8CF"/><circle class="b3" cx="48" cy="20" r="3" fill="#FBDD82"/>' +
      '<path d="M38 26 h24 v20 l22 40 a10 10 0 0 1 -9 15 h-50 a10 10 0 0 1 -9 -15 l22 -40z" fill="#fff" stroke="#1E0E4A" stroke-width="3.5" stroke-linejoin="round"/>' +
      '<path d="M23 76 h54 l6 11 a7 7 0 0 1 -6 10 h-54 a7 7 0 0 1 -6 -10z" fill="#5F3DB8" opacity=".9"/><path d="M36 26 h28" stroke="#1E0E4A" stroke-width="5" stroke-linecap="round"/>' +
      eyes + '<circle cx="34" cy="71" r="3" fill="#F7A8CF"/><circle cx="66" cy="71" r="3" fill="#F7A8CF"/>' + mouth + '</svg>';
  }

  // ---------- scenes for predict-it ----------
  function scene(sc) {
    var w = el('div', 'lq-scene lq-' + sc.type);
    if (sc.type === 'float') {
      var lq = sc.liquid || 'Water', dens = sc.ld || 1;
      var h = '<svg viewBox="0 0 360 170" role="img" aria-label="A tank of ' + esc(lq.toLowerCase()) + ' with objects about to be dropped in"><rect x="20" y="40" width="320" height="120" rx="10" fill="' + (sc.lc || '#BDE6F7') + '" stroke="#1E0E4A" stroke-width="3"/><path d="M20 52 h320" stroke="#fff" stroke-width="3" opacity=".7"/>' +
        '<text x="30" y="152" font-size="13" fill="#1E0E4A" font-weight="700">' + esc(lq) + '</text>';
      var n = sc.items.length, gap = 300 / n;
      sc.items.forEach(function (it, i) {
        var x = 30 + gap * i + gap / 2 - 22, fl = it.d < dens;
        var yEnd = fl ? 36 : 116;
        h += '<g class="lq-obj" style="--y:' + (yEnd - 2) + 'px;--dl:' + (i * 0.25) + 's"><rect x="' + x + '" y="0" width="44" height="30" rx="7" fill="' + it.c + '" stroke="#1E0E4A" stroke-width="2.5"/><text x="' + (x + 22) + '" y="20" font-size="15" text-anchor="middle">' + (it.e || '') + '</text></g>' +
          '<text x="' + (x + 22) + '" y="' + (fl ? 80 : 108) + '" class="lq-tag" font-size="12" text-anchor="middle" fill="#1E0E4A" font-weight="700">' + esc(it.n) + '</text>';
      });
      w.innerHTML = h + '</svg>';
    } else if (sc.type === 'drop') {
      var h2 = '<svg viewBox="0 0 360 200" role="img" aria-label="Two objects dropped from the same height"><rect x="0" y="182" width="360" height="18" fill="#CBE98A"/><path d="M40 30 h280" stroke="#1E0E4A" stroke-dasharray="6 6" stroke-width="2"/>';
      [sc.a, sc.b].forEach(function (o, i) {
        var cx = i ? 250 : 110, t = sc.times ? sc.times[i] : 1;
        h2 += '<g class="lq-fall" style="--t:' + (1.2 * t) + 's;--y:' + (182 - 30 - o.r) + 'px"><circle cx="' + cx + '" cy="' + 30 + '" r="' + o.r + '" fill="' + o.c + '" stroke="#1E0E4A" stroke-width="2.5"/><text x="' + cx + '" y="' + (35) + '" font-size="' + Math.max(12, o.r) + '" text-anchor="middle">' + (o.e || '') + '</text></g>' +
          '<text x="' + cx + '" y="18" font-size="13" text-anchor="middle" font-weight="700" fill="currentColor">' + esc(o.n) + '</text>';
      });
      if (sc.note) h2 += '<text x="180" y="196" font-size="12" text-anchor="middle" fill="#1E0E4A" font-weight="700">' + esc(sc.note) + '</text>';
      w.innerHTML = h2 + '</svg>';
    } else if (sc.type === 'race') {
      var h3 = '<div class="lq-race-t">' + esc(sc.label || '') + '</div>';
      var maxT = Math.max.apply(null, sc.lanes.map(function (l) { return l.t; }));
      sc.lanes.forEach(function (l) {
        h3 += '<div class="lq-lane"><span class="lq-ln">' + (l.e ? l.e + ' ' : '') + esc(l.n) + '</span><span class="lq-track"><span class="lq-fill" style="--c:' + l.c + ';--t:' + (2.4 * l.t / maxT) + 's"></span></span><span class="lq-fin" style="--fd:' + (2.4 * l.t / maxT) + 's">' + (['🥇', '🥈', '🥉'][sc.lanes.slice().sort(function (p, q2) { return p.t - q2.t; }).indexOf(l)] || '') + '</span></div>';
      });
      w.innerHTML = h3;
    } else if (sc.type === 'gauge') {
      var h4 = '<div class="lq-g-pic">' + (sc.e || '') + '</div><div class="lq-g-body"><div class="lq-g-lab">' + esc(sc.label) + '</div>' +
        '<div class="lq-g-row"><span class="lq-g-cap">' + esc(sc.before || 'Before') + '</span><b class="lq-g-num" data-from="' + sc.from + '" data-to="' + sc.to + '">' + num(sc.from) + '</b><span class="lq-g-unit">' + esc(sc.unit || '') + '</span></div>' +
        '<div class="lq-g-meter"><i style="width:' + Math.round(100 * sc.from / (Math.max(sc.from, sc.to) * 1.25)) + '%"></i></div><div class="lq-g-cap2">' + esc(sc.after || 'After') + ': <b class="lq-g-q">?</b> <span class="lq-g-arrow"></span></div></div>';
      w.innerHTML = h4;
    } else if (sc.type === 'bulbs') {
      var h5 = '<svg viewBox="0 0 360 170" role="img" aria-label="' + esc(sc.alt || 'A circuit with bulbs') + '">' + sc.svg + '</svg>';
      w.innerHTML = h5;
    }
    return w;
  }
  function playScene(w, sc) {
    w.classList.add('go');
    if (sc.type === 'gauge') {
      var b = w.querySelector('.lq-g-num'), q = w.querySelector('.lq-g-q'), f = +b.dataset.from, t = +b.dataset.to, t0 = performance.now(), dur = reduce ? 1 : 1400;
      (function step(now) { var k = Math.min(1, (now - t0) / dur); var v = f + (t - f) * (1 - Math.pow(1 - k, 3)); b.textContent = num(v); if (k < 1) requestAnimationFrame(step); else { b.textContent = num(t); q.textContent = num(t) + ' ' + (sc.unit || ''); var ar = w.querySelector('.lq-g-arrow'); ar.textContent = t > f ? '\u25B2 went up' : t < f ? '\u25BC went down' : '\u25CF no change'; ar.className = 'lq-g-arrow ' + (t > f ? 'up' : t < f ? 'down' : 'same'); } })(t0);
      var m = w.querySelector('.lq-g-meter i'); if (m) m.style.width = Math.round(100 * t / (Math.max(f, t) * 1.25)) + '%';
    }
    if (sc.type === 'bulbs') [].forEach.call(w.querySelectorAll('[data-lit]'), function (n) { n.classList.add('lit'); });
  }

  // ---------- page: the lobby ----------
  var today = vnDate(), quest = null, qi = 0, mode = 'daily', run = null;
  function weekStrip() {
    var dt = new Date(today + 'T00:00:00Z'), wd = (dt.getUTCDay() + 6) % 7, h = '';
    ['M', 'T', 'W', 'T', 'F', 'S', 'S'].forEach(function (L, i) {
      var d = new Date(dt.getTime() + (i - wd) * 864e5).toISOString().slice(0, 10), played = S.hist[d], isT = d === today;
      h += '<span class="lq-day' + (played ? ' on' : '') + (isT ? ' today' : '') + '" title="' + prettyDate(d) + (played ? ': ' + played.score + ' points' : '') + '"><i>' + (played ? '🔥' : '') + '</i>' + L + '</span>';
    });
    return h;
  }
  function liveStreak() { var y = vnDate(-1); return (S.last === today || S.last === y) ? S.streak : 0; }
  function countdown() { var now = Date.now() + 7 * 3600e3, next = (Math.floor(now / 864e5) + 1) * 864e5, s = Math.max(0, Math.floor((next - now) / 1000)); var hh = Math.floor(s / 3600), mm = Math.floor(s % 3600 / 60), ss = s % 60; return hh + 'h ' + (mm < 10 ? '0' : '') + mm + 'm ' + (ss < 10 ? '0' : '') + ss + 's'; }

  function lobby() {
    var st = liveStreak(), rk = rank(S.xp), done = S.hist[today];
    var pct = rk.hi ? Math.round((S.xp - rk.lo) / (rk.hi - rk.lo) * 100) : 100;
    var years = ''; for (var y = 1; y <= 5; y++) years += '<button type="button" class="lq-yr' + (y === S.year ? ' on' : '') + '" data-y="' + y + '" aria-pressed="' + (y === S.year) + '">MYP ' + y + '</button>';
    var head = '<div class="lq-top"><div class="lq-hero">' + fizz(done ? 'wow' : 'happy') + '<div><p class="lq-kicker">Daily Lab Quest</p><h2 class="lq-title">' + (done ? 'Quest complete!' : 'Ten rounds. Four minutes. One streak to keep alive.') + '</h2>' +
      '<p class="lq-sub">' + (done ? 'Come back tomorrow for a brand-new quest and another discovery card.' : 'A new science quest every day for your MYP year: quick-fire facts, predictions, estimates and odd ones out.') + '</p></div></div>' +
      '<div class="lq-stats"><div class="lq-flame' + (st ? ' hot' : '') + '"><span class="lq-fl">🔥</span><b>' + st + '</b><small>day streak</small></div>' +
      '<div class="lq-rank"><small>Lab rank ' + rk.lvl + '</small><b>' + rk.name + '</b><span class="lq-bar"><i style="width:' + pct + '%"></i></span><small>' + S.xp.toLocaleString('en-GB') + ' XP' + (rk.next ? ' &middot; ' + (rk.hi - S.xp).toLocaleString('en-GB') + ' to ' + rk.next : '') + '</small></div></div></div>' +
      '<div class="lq-week" aria-label="This week">' + weekStrip() + '</div>';
    var act;
    if (!done) act = '<div class="lq-years" role="group" aria-label="Your MYP year">' + years + '</div><div class="lq-acts"><button type="button" class="lq-play" id="lq-play">▶ Start today&rsquo;s quest</button><button type="button" class="lq-ghost" data-open="book">📚 Sticker book (' + S.cards.length + ')</button><button type="button" class="lq-ghost" data-open="badges">🏅 Badges (' + Object.keys(S.badges).length + '/' + BADGES.length + ')</button></div>';
    else act = '<div class="lq-done"><div class="lq-score-big"><b>' + done.score + '</b><span>points today &middot; MYP ' + done.year + ' &middot; ' + done.right + '/10 right</span></div><div class="lq-next">Next quest in <b id="lq-cd">' + countdown() + '</b></div></div>' +
      '<div class="lq-years" role="group" aria-label="Year for practice and tomorrow">' + years + '</div><div class="lq-acts"><button type="button" class="lq-play alt" id="lq-prac">💪 Practice round (5 questions)</button><button type="button" class="lq-ghost" data-open="book">📚 Sticker book (' + S.cards.length + ')</button><button type="button" class="lq-ghost" data-open="badges">🏅 Badges (' + Object.keys(S.badges).length + '/' + BADGES.length + ')</button><button type="button" class="lq-ghost" id="lq-share">📋 Copy my result</button></div>';
    root.innerHTML = '<div class="lq-card">' + head + act + '<button type="button" class="lq-sound" id="lq-sound" aria-pressed="' + !!S.sound + '" title="Sound effects">' + (S.sound ? '🔊' : '🔈') + '</button><p class="lq-note">Your streak, cards and badges are saved in this browser on this device.</p></div>';
    [].forEach.call(root.querySelectorAll('.lq-yr'), function (b) { b.onclick = function () { S.year = +b.dataset.y; save(); lobby(); }; });
    var p = document.getElementById('lq-play'); if (p) p.onclick = function () { start('daily'); };
    var pr = document.getElementById('lq-prac'); if (pr) pr.onclick = function () { start('practice'); };
    var sh = document.getElementById('lq-share'); if (sh) sh.onclick = function () { copyResult(sh); };
    document.getElementById('lq-sound').onclick = function () { S.sound = !S.sound; save(); if (S.sound) beep('tick'); lobby(); };
    [].forEach.call(root.querySelectorAll('[data-open]'), function (b) { b.onclick = function () { b.dataset.open === 'book' ? book() : badges(); }; });
    if (done) { clearInterval(lobby.t); lobby.t = setInterval(function () { var c = document.getElementById('lq-cd'); if (!c) return clearInterval(lobby.t); if (vnDate() !== today) { today = vnDate(); lobby(); } else c.textContent = countdown(); }, 1000); }
  }
  function copyResult(btn) {
    var d = S.hist[today]; if (!d) return;
    var txt = 'Daily Lab Quest · ' + prettyDate(today) + ' · MYP ' + d.year + '\n' + (d.marks || '') + '\n' + d.score + ' points · 🔥 ' + liveStreak() + '-day streak\nwhatthecell.org/myp.html';
    function ok() { btn.textContent = '✅ Copied!'; setTimeout(lobby, 1600); }
    if (navigator.clipboard) navigator.clipboard.writeText(txt).then(ok, function () { prompt('Copy your result:', txt); });
    else prompt('Copy your result:', txt);
  }

  // ---------- overlay ----------
  var ov = null;
  function overlay(inner, cls) {
    if (!ov) { ov = el('div', 'lq-ov'); ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', 'Daily Lab Quest'); document.body.appendChild(ov); }
    ov.className = 'lq-ov ' + (cls || ''); ov.innerHTML = '<div class="lq-panel">' + inner + '</div>'; document.body.classList.add('lq-noscroll');
    var x = ov.querySelector('.lq-x'); if (x) x.onclick = close;
    ov.onkeydown = keys; setTimeout(function () { var f = ov.querySelector('.lq-opt, .lq-go, .lq-x'); if (f) f.focus(); }, 30);
  }
  function close() { if (ov) { ov.remove(); ov = null; } document.body.classList.remove('lq-noscroll'); run = null; lobby(); }
  function keys(e) {
    if (e.key === 'Escape') { if (!run || confirm('Leave this quest? Your progress in it will be lost.')) close(); return; }
    var n = parseInt(e.key, 10); if (n >= 1 && n <= 4) { var b = ov && ov.querySelectorAll('.lq-opt:not([disabled])')[n - 1]; if (b) b.click(); }
    if (e.key === 'Enter') { var g = ov && ov.querySelector('.lq-next'); if (g && document.activeElement !== g) g.click(); }
  }

  function book() {
    var h = '<button type="button" class="lq-x" aria-label="Close">✕</button><h3 class="lq-h">📚 Discovery sticker book</h3><p class="lq-muted">Every daily quest unlocks a card. A flawless quest unlocks a bonus card. ' + S.cards.length + ' of ' + CARDS.length + ' collected.</p><div class="lq-book">';
    var order = S.cards.slice().reverse().concat(CARDS.map(function (c, i) { return i; }).filter(function (i) { return S.cards.indexOf(i) < 0; }));
    order.forEach(function (i) { var c = CARDS[i], got = S.cards.indexOf(i) >= 0; h += '<div class="lq-st' + (got ? ' got' : '') + '" style="--c:' + c.c + '"><span class="e">' + (got ? c.e : '?') + '</span><b>' + (got ? esc(c.n) : 'Not found yet') + '</b>' + (got ? '<small>' + fmt(c.f) + '</small>' : '') + '</div>'; });
    overlay(h + '</div>', 'lq-wide');
  }
  function badges() {
    var h = '<button type="button" class="lq-x" aria-label="Close">✕</button><h3 class="lq-h">🏅 Badges</h3><div class="lq-badges">';
    BADGES.forEach(function (b) { var got = S.badges[b[0]]; h += '<div class="lq-bd' + (got ? ' got' : '') + '"><span>' + b[1] + '</span><b>' + b[2] + '</b><small>' + b[3] + (got ? '<br>Earned ' + prettyDate(got) : '') + '</small></div>'; });
    overlay(h + '</div>', 'lq-wide');
  }

  // ---------- running a quest ----------
  function start(m) {
    mode = m; quest = m === 'daily' ? dailyQuest(S.year, today) : practiceQuest(S.year); qi = 0;
    run = { score: 0, right: 0, combo: 0, maxCombo: 0, est: 0, pred: 0, predN: 0, marks: [] };
    beep('tick'); round();
  }
  function header() {
    var dots = ''; for (var i = 0; i < quest.length; i++) dots += '<i class="' + (i < qi ? (run.marks[i] === 2 ? 'ok' : run.marks[i] === 1 ? 'half' : 'no') : i === qi ? 'now' : '') + '"></i>';
    return '<div class="lq-hdr"><button type="button" class="lq-x" aria-label="Leave the quest">✕</button><div class="lq-dots" aria-label="Round ' + (qi + 1) + ' of ' + quest.length + '">' + dots + '</div>' +
      '<div class="lq-pts"><span class="lq-combo' + (run.combo >= 2 ? ' on' : '') + '">⚡ x' + Math.max(1, run.combo) + '</span><b id="lq-sc">' + run.score + '</b></div></div>';
  }
  function round() {
    var r = quest[qi], T = TYPES[r.t], q = BANK[r.items[0]];
    var h = header() + '<div class="lq-round" style="--tc:' + T.col + '"><div class="lq-badge"><span>' + T.icon + '</span>' + T.name + ' &middot; ' + (qi + 1) + '/' + quest.length + '</div>';
    if (r.t === 'tf') h += '<p class="lq-q">True or false? Three in a row, as fast as you can.</p><div id="lq-tf"></div>';
    else if (r.t === 'est') h += '<p class="lq-q">' + fmt(q.q) + '</p>' + estUI(q);
    else if (r.t === 'odd') h += '<p class="lq-q">' + fmt(q.q || 'Which one is the odd one out?') + '</p><div class="lq-odds">' + q.o.map(function (o, i) { return '<button type="button" class="lq-opt lq-oddc" data-i="' + i + '"><span class="e">' + o.e + '</span><b>' + esc(o.n) + '</b></button>'; }).join('') + '</div>';
    else { h += '<p class="lq-q">' + fmt(q.q) + '</p>' + (r.t === 'pred' ? '<div id="lq-sc-wrap"></div>' : '') + '<div class="lq-opts">' + q.o.map(function (o, i) { return '<button type="button" class="lq-opt" data-i="' + i + '"><kbd>' + (i + 1) + '</kbd>' + fmt(o) + '</button>'; }).join('') + '</div>'; }
    h += '<div class="lq-fb" aria-live="polite"></div></div><div class="lq-mascot">' + fizz('think') + '</div>';
    overlay(h, 'lq-play-ov');
    ov.querySelector('.lq-x').onclick = function () { if (confirm('Leave this quest? Your progress in it will be lost.')) close(); };
    if (r.t === 'pred') { var sw = document.getElementById('lq-sc-wrap'); var scn = scene(q.scene); sw.appendChild(scn); r.node = scn; }
    if (r.t === 'tf') return tfRun(r);
    if (r.t === 'est') return estWire(q);
    [].forEach.call(ov.querySelectorAll('.lq-opt'), function (b) { b.onclick = function () { pick(+b.dataset.i, b); }; });
  }
  function setFizz(m) { var f = ov && ov.querySelector('.lq-mascot'); if (f) { f.innerHTML = fizz(m); f.classList.remove('jump', 'shake'); void f.offsetWidth; f.classList.add(m === 'oops' ? 'shake' : 'jump'); } }
  function award(frac, node) {
    var good = frac >= 0.7;
    run.combo = good ? run.combo + 1 : 0; run.maxCombo = Math.max(run.maxCombo, run.combo);
    var bonus = good && run.combo >= 2 ? Math.min(50, (run.combo - 1) * 10) : 0, pts = Math.round(100 * frac) + bonus;
    run.score += pts; if (good) run.right++;
    run.marks[qi] = frac >= 0.999 || (frac >= 0.7) ? 2 : frac > 0 ? 1 : 0;
    var sc = document.getElementById('lq-sc'); if (sc) { sc.textContent = run.score; sc.classList.remove('pop'); void sc.offsetWidth; sc.classList.add('pop'); }
    var cb = ov.querySelector('.lq-combo'); if (cb) { cb.textContent = '⚡ x' + Math.max(1, run.combo); cb.classList.toggle('on', run.combo >= 2); }
    if (good) { beep('good'); setFizz('wow'); if (node) burstFrom(node, run.combo >= 3 ? 40 : 22); } else { beep('bad'); setFizz('oops'); }
    var fl = el('div', 'lq-ptsfx', (pts ? '+' + pts : '+0') + (bonus ? ' <small>combo!</small>' : '')); if (node) { var rr = node.getBoundingClientRect(); fl.style.left = (rr.left + rr.width / 2) + 'px'; fl.style.top = rr.top + 'px'; document.body.appendChild(fl); setTimeout(function () { fl.remove(); }, 1100); }
    return pts;
  }
  function feedback(good, why, label) {
    var fb = ov.querySelector('.lq-fb'), last = qi === quest.length - 1;
    fb.innerHTML = '<div class="lq-why ' + (good ? 'good' : 'bad') + '"><b>' + (label || (good ? pickOne(['Brilliant!', 'Spot on!', 'Nailed it!', 'Great science!', 'Yes!']) : pickOne(['Not quite.', 'Close, but no.', 'Good try.']))) + '</b> ' + fmt(why || '') + '</div><button type="button" class="lq-go lq-next">' + (last ? 'See my results →' : 'Next round →') + '</button>';
    var n = fb.querySelector('.lq-next'); n.onclick = function () { qi++; if (qi < quest.length) round(); else finish(); }; n.focus();
  }
  function pickOne(a) { return a[Math.floor(Math.random() * a.length)]; }
  function pick(i, btn) {
    var r = quest[qi], q = BANK[r.items[0]], good = i === q.a;
    [].forEach.call(ov.querySelectorAll('.lq-opt'), function (b) { b.disabled = true; if (+b.dataset.i === q.a) b.classList.add('right'); });
    if (!good) btn.classList.add('wrong');
    if (r.t === 'pred') { run.predN++; if (good) run.pred++; playScene(r.node, q.scene); }
    award(good ? 1 : 0, btn); feedback(good, q.w);
  }

  // true/false quick-fire: three statements, 30 seconds of answering time (the clock pauses while an explanation shows)
  function tfRun(r) {
    var box = document.getElementById('lq-tf'), k = 0, got = 0, left = 300, waiting = false, timer;
    box.innerHTML = '<div class="lq-timer"><i></i></div><div class="lq-tfcard"></div>'; var bar = box.querySelector('.lq-timer i');
    var card = box.querySelector('.lq-tfcard');
    function show() {
      var q = BANK[r.items[k]];
      waiting = false; card.innerHTML = '<div class="lq-tfn">' + (k + 1) + ' of 3</div><p>' + fmt(q.q) + '</p><div class="lq-tfb"><button type="button" class="lq-opt lq-t" data-v="1">✔ True</button><button type="button" class="lq-opt lq-f" data-v="0">✖ False</button></div><div class="lq-tfw"></div>';
      [].forEach.call(card.querySelectorAll('.lq-opt'), function (b) {
        b.onclick = function () {
          waiting = true; var v = b.dataset.v === '1', ok = v === q.a; [].forEach.call(card.querySelectorAll('.lq-opt'), function (x) { x.disabled = true; });
          b.classList.add(ok ? 'right' : 'wrong'); if (ok) { got++; beep('good'); burstFrom(b, 12); } else beep('bad');
          card.querySelector('.lq-tfw').innerHTML = '<b>' + (q.a ? 'True.' : 'False.') + '</b> ' + fmt(q.w);
          setTimeout(function () { k++; if (k < 3) show(); else end(); }, ok ? 1500 : 2600);
        };
      });
    }
    function end() {
      clearInterval(timer); var frac = got / 3; card.innerHTML = '<p class="lq-big">' + got + ' / 3</p>';
      award(got === 3 ? 1 : frac, card); feedback(got >= 2, got === 3 ? 'All three right.' : got === 2 ? 'Two out of three.' : 'Read the explanations again later: they come back in other quests.', got === 3 ? 'Lightning fast!' : got === 2 ? 'Nice!' : 'Tricky ones!');
    }
    timer = setInterval(function () { if (waiting) return; left--; bar.style.transform = 'scaleX(' + (left / 300) + ')'; if (left <= 0) { clearInterval(timer); [].forEach.call(card.querySelectorAll('.lq-opt'), function (x) { x.disabled = true; }); end(); } }, 100);
    show();
  }

  // estimate with a slider (log or linear scale)
  function estUI(q) {
    return '<div class="lq-est"><div class="lq-ev"><b id="lq-ev">?</b> <span>' + esc(q.unit || '') + '</span></div><input type="range" id="lq-er" min="0" max="1000" value="500" aria-label="Your estimate"><div class="lq-eends"><span>' + num(q.min) + '</span><span>' + num(q.max) + '</span></div>' +
      '<div class="lq-ebar" hidden><span class="lq-emark you"></span><span class="lq-emark ans"></span></div><button type="button" class="lq-go lq-lock">Lock in my estimate</button></div>';
  }
  function estWire(q) {
    var r = document.getElementById('lq-er'), v = document.getElementById('lq-ev'), logS = q.log !== false && q.max / Math.max(q.min, 1e-9) > 50;
    function val(s) { var k = s / 1000, x = logS ? q.min * Math.pow(q.max / q.min, k) : q.min + (q.max - q.min) * k; if (x >= 100) { var p = Math.pow(10, Math.floor(Math.log10(x)) - 1); x = Math.round(x / p) * p; } return x; }
    function pos(x) { return logS ? Math.log(x / q.min) / Math.log(q.max / q.min) : (x - q.min) / (q.max - q.min); }
    function show() { var x = val(+r.value); v.textContent = num(x); }
    var ap = pos(q.a), s0; do { s0 = 0.12 + Math.random() * 0.76; } while (Math.abs(s0 - ap) < 0.2); r.value = Math.round(s0 * 1000);
    r.oninput = show; show();
    ov.querySelector('.lq-lock').onclick = function () {
      var g = val(+r.value), a = q.a, err = Math.abs(Math.log10(g / a)), tol = q.tol || 1;
      var frac = Math.max(0, 1 - err / tol); frac = frac > 0.92 ? 1 : frac; r.disabled = true; this.remove();
      var bar = ov.querySelector('.lq-ebar'); bar.hidden = false;
      bar.querySelector('.you').style.left = (pos(g) * 100) + '%'; bar.querySelector('.ans').style.left = (pos(a) * 100) + '%';
      if (Math.abs(g - a) / a <= 0.1) run.est++;
      award(frac, v); var pc = Math.round(Math.abs(g - a) / a * 100);
      feedback(frac >= 0.7, 'The answer is **' + num(a) + ' ' + (q.unit || '') + '**. You said ' + num(g) + (pc <= 1 ? ': bang on!' : ' (' + (g > a ? pc + '% too high' : Math.round((1 - g / a) * 100) + '% too low') + '). ') + ' ' + (q.w || ''), frac >= 0.95 ? 'Bullseye!' : frac >= 0.7 ? 'Close!' : frac > 0.3 ? 'In the right area.' : 'Way off, but now you know!');
    };
  }

  // ---------- results ----------
  function finish() {
    var stars = run.right >= 9 ? 3 : run.right >= 6 ? 2 : run.right >= 3 ? 1 : 0, newB = [], card = null, bonusCard = null, oldStreak = liveStreak(), oldRank = rank(S.xp).name;
    var marks = run.marks.map(function (m) { return m === 2 ? '🟩' : m === 1 ? '🟨' : '🟥'; }).join('');
    function giveBadge(id) { if (!S.badges[id]) { S.badges[id] = today; newB.push(id); } }
    S.xp += run.score;
    if (mode === 'daily') {
      if (S.last !== today) { S.streak = (S.last === vnDate(-1)) ? S.streak + 1 : 1; S.last = today; }
      S.best = Math.max(S.best, S.streak);
      S.hist[today] = { score: run.score, right: run.right, year: S.year, marks: marks };
      var free = CARDS.map(function (c, i) { return i; }).filter(function (i) { return S.cards.indexOf(i) < 0; });
      if (free.length) { card = free[hash('card|' + today) % free.length]; S.cards.push(card); free.splice(free.indexOf(card), 1); }
      if (run.right === 10 && free.length) { bonusCard = free[hash('bonus|' + today) % free.length]; S.cards.push(bonusCard); }
      giveBadge('first'); if (S.streak >= 3) giveBadge('s3'); if (S.streak >= 7) giveBadge('s7'); if (S.streak >= 14) giveBadge('s14'); if (S.streak >= 30) giveBadge('s30');
      if (run.right === 10) giveBadge('perfect'); if (run.est >= 2) giveBadge('est'); if (run.predN >= 2 && run.pred === run.predN) giveBadge('seer');
      if (S.cards.length >= 10) giveBadge('cards10');
    } else { S.practice++; if (S.practice >= 5) giveBadge('practice'); }
    if (run.maxCombo >= 5) giveBadge('combo5');
    save();
    var rk = rank(S.xp), up = rk.name !== oldRank;
    var h = '<button type="button" class="lq-x" aria-label="Close">✕</button><div class="lq-res">' + fizz(stars >= 2 ? 'wow' : 'happy') +
      '<p class="lq-kicker">' + (mode === 'daily' ? 'Daily quest complete' : 'Practice complete') + '</p><div class="lq-stars">' + [0, 1, 2].map(function (i) { return '<span class="' + (i < stars ? 'on' : '') + '" style="--d:' + (i * 0.25) + 's">★</span>'; }).join('') + '</div>' +
      '<div class="lq-final"><b id="lq-count">0</b><span>points &middot; ' + run.right + '/' + quest.length + ' right &middot; best combo x' + Math.max(1, run.maxCombo) + '</span></div><div class="lq-marks">' + marks + '</div>';
    if (mode === 'daily') h += '<div class="lq-streakup"><span class="lq-fl big">🔥</span><b>' + S.streak + '</b><span>day streak' + (S.streak > oldStreak ? ' <em>+1</em>' : '') + '</span></div>';
    if (up) h += '<div class="lq-rankup">⬆ New lab rank: <b>' + rk.name + '</b></div>';
    if (card != null) h += '<div class="lq-newcard"><p>New discovery card' + (bonusCard != null ? 's (flawless bonus!)' : '') + '</p><div class="lq-cards">' + [card, bonusCard].filter(function (x) { return x != null; }).map(function (ci) { var c = CARDS[ci]; return '<div class="lq-st got flip" style="--c:' + c.c + '"><span class="e">' + c.e + '</span><b>' + esc(c.n) + '</b><small>' + fmt(c.f) + '</small></div>'; }).join('') + '</div></div>';
    if (newB.length) h += '<div class="lq-newb">' + newB.map(function (id) { var b = BADGES.filter(function (x) { return x[0] === id; })[0]; return '<span class="lq-bd got pop"><span>' + b[1] + '</span><b>' + b[2] + '</b></span>'; }).join('') + '</div>';
    h += '<div class="lq-acts c">' + (mode === 'daily' ? '<button type="button" class="lq-go" id="lq-again">💪 Practice round</button>' : '<button type="button" class="lq-go" id="lq-again">🔁 Another practice round</button>') + '<button type="button" class="lq-ghost" id="lq-home">Done</button></div>' +
      (mode === 'daily' ? '<p class="lq-muted c">A new quest unlocks at midnight (Vietnam time). Come back tomorrow to keep your streak!</p>' : '') + '</div>';
    run = null; overlay(h, 'lq-res-ov');
    document.getElementById('lq-again').onclick = function () { start('practice'); };
    document.getElementById('lq-home').onclick = close;
    countUp(document.getElementById('lq-count'), mode === 'daily' ? S.hist[today].score : lastPractice);
    beep('win'); setTimeout(function () { confetti(innerWidth / 2, innerHeight / 3, stars >= 2 ? 90 : 40); }, 250);
  }
  var lastPractice = 0;
  function countUp(node, to) { var t0 = performance.now(), dur = reduce ? 1 : 1100; (function s(n) { var k = Math.min(1, (n - t0) / dur); node.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(s); })(t0); }
  // keep the practice score for the count-up
  var _award = award; award = function (f, n) { var p = _award(f, n); if (mode === 'practice') lastPractice = run.score; return p; };

  window.lqDebug = {
    start: function (y) { if (y) S.year = y; start('daily'); }, practice: function () { start('practice'); },
    show: function (id) { mode = 'practice'; quest = [{ t: BANK[id].t, items: [id] }]; qi = 0; run = { score: 0, right: 0, combo: 0, maxCombo: 0, est: 0, pred: 0, predN: 0, marks: [] }; round(); },
    answer: function (i) { var b = ov && ov.querySelectorAll('.lq-opt:not([disabled])')[i]; if (b) b.click(); var l = ov && ov.querySelector('.lq-lock'); if (l && i === -1) l.click(); },
    next: function () { var n = ov && ov.querySelector('.lq-next'); if (n) n.click(); }, state: function () { return JSON.parse(JSON.stringify(S)); },
    quest: function (y, d) { return dailyQuest(y || S.year, d || today).map(function (r) { return r.t + ':' + r.items.join(','); }); },
    day: function (n) { dayOffset = n; today = vnDate(); lobby(); }, reset: function () { S = { hist: {}, badges: {}, cards: [], xp: 0, streak: 0, best: 0, year: 3, practice: 0 }; save(); lobby(); },
    check: function () { var bad = []; BANK.forEach(function (q, i) { if (!TYPES[q.t]) bad.push(i + ' type'); if (!q.y || q.y.length !== 2) bad.push(i + ' y'); if ((q.t === 'mcq' || q.t === 'pred' || q.t === 'odd') && (q.a == null || !q.o || q.a >= q.o.length)) bad.push(i + ' answer'); if (q.t === 'est' && !(q.a >= q.min && q.a <= q.max)) bad.push(i + ' est range'); if (q.t === 'tf' && typeof q.a !== 'boolean') bad.push(i + ' tf'); }); for (var y = 1; y <= 5; y++) Object.keys(TYPES).forEach(function (t) { var n = pool(t, y).length; if (n < (t === 'tf' ? 6 : 4)) bad.push('MYP ' + y + ' ' + t + ' only ' + n); }); return bad; },
    counts: function () { var c = {}; for (var y = 1; y <= 5; y++) { c[y] = {}; Object.keys(TYPES).forEach(function (t) { c[y][t] = pool(t, y).length; }); } return c; }
  };
  lobby();
})();
