/* Daily Lab Quest streak board (What the Cell, 2026-11-21). Shown under the game on myp.html.
   Players join with a first name and the initial of their family name (no sign-up), get a player code for other
   devices, and every finished daily quest is sent to the Cellgrimage worker (/lq/... endpoints), which stamps it with
   today's Vietnam date. Tabs: Top streaks (current streak, then best streak) and This week (points since Monday).
   The worker URL is the data-api attribute of #lab-quest; empty means "coming soon". */
(function () {
  'use strict';
  var game = document.getElementById('lab-quest'); if (!game) return;
  var API = (game.getAttribute('data-api') || '').replace(/\/$/, '');
  var KEY = 'wtc-labquest-player', GKEY = 'wtc-labquest-v1', tab = 'streak';
  var box = document.createElement('section'); box.className = 'lq-board'; box.setAttribute('aria-label', 'Lab Quest streak board');
  game.parentNode.insertBefore(box, game.nextSibling);
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function get(k) { try { return JSON.parse(localStorage.getItem(k)) || null; } catch (e) { return null; } }
  function put(k, v) { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function me() { return get(KEY); }
  function api(path, body) {
    return fetch(API + path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {})
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) throw j; return j; }); });
  }
  function vnDate() { return new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10); }
  // send today's finished quest (also used when a player joins after playing today)
  function send(d) {
    var p = me(); if (!API || !p || !d) return Promise.resolve();
    if (p.sent === d.day) return Promise.resolve();
    return api('/lq/done', { name: p.name, code: p.code, year: d.year, score: d.score, right: d.right }).then(function (j) { p.sent = j.day; p.streak = j.streak; put(KEY, p); }, function () {});
  }
  function todayResult() { var g = get(GKEY), t = vnDate(); var h = g && g.hist && g.hist[t]; return h ? { day: t, score: h.score, right: h.right, year: h.year } : null; }
  window.addEventListener('lq-done', function (e) { send(e.detail).then(draw); });

  function draw() {
    if (!API) { box.innerHTML = '<div class="lq-bcard"><h3>🏆 Streak board</h3><p class="lq-bnote">The class streak board is coming soon.</p></div>'; return; }
    var p = me();
    var who = p ? '<p class="lq-bnote">You are on the board as <b>' + esc(p.name) + '</b> Your player code is <b>' + esc(p.code) + '</b>: keep it to play on another device. <button type="button" class="lq-blink" data-act="out">Not you?</button></p>'
      : '<form class="lq-join"><p class="lq-bnote"><b>Join the streak board:</b> your first name and the first letter of your family name. No sign-up.</p><input id="lq-first" maxlength="20" placeholder="First name" autocomplete="given-name" aria-label="First name"><input id="lq-ini" maxlength="1" placeholder="Initial" autocomplete="off" aria-label="Initial of family name"><button type="submit">Join</button><button type="button" class="lq-blink" data-act="code">I already have a player code</button><p class="lq-bmsg" role="status"></p></form>';
    box.innerHTML = '<div class="lq-bcard"><div class="lq-bhead"><h3>🏆 Streak board</h3><div class="lq-btabs" role="tablist"><button type="button" role="tab" data-tab="streak" aria-selected="' + (tab === 'streak') + '">🔥 Top streaks</button><button type="button" role="tab" data-tab="week" aria-selected="' + (tab === 'week') + '">⭐ This week</button></div></div><ol class="lq-blist"><li class="lq-bnote">Loading&hellip;</li></ol>' + who +
      '<p class="lq-bnote small">A streak grows by one for each day in a row that you finish the daily quest (Vietnam time). Miss a day and it starts again. Practice rounds do not count.</p></div>';
    api('/lq/board').then(function (j) {
      var ol = box.querySelector('.lq-blist'), mine = p && p.name, rows = tab === 'streak' ? j.streaks : j.week;
      if (!rows || !rows.length) { ol.innerHTML = '<li class="lq-bnote">' + (tab === 'streak' ? 'No streaks yet. Finish today&rsquo;s quest to start one!' : 'Nobody has played this week yet.') + '</li>'; return; }
      ol.innerHTML = rows.map(function (r, i) {
        var medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i + 1);
        var right = tab === 'streak' ? '<b>🔥 ' + r.streak + '</b><small>' + (r.played ? 'played today' : 'play today to keep it') + (r.best > r.streak ? ' &middot; best ' + r.best : '') + '</small>'
          : '<b>' + Number(r.score).toLocaleString('en-GB') + '</b><small>' + r.days + ' day' + (r.days === 1 ? '' : 's') + '</small>';
        return '<li' + (r.name === mine ? ' class="me"' : '') + '><span class="lq-bpos">' + medal + '</span><span class="lq-bname">' + esc(r.name) + '</span><span class="lq-bval">' + right + '</span></li>';
      }).join('');
    }, function (er) { box.querySelector('.lq-blist').innerHTML = '<li class="lq-bnote">' + (er && er.error === 'notfound' ? 'The class streak board is being switched on. Check back soon!' : 'The streak board could not load right now.') + '</li>'; });
  }
  box.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.getAttribute('data-tab')) { tab = b.getAttribute('data-tab'); draw(); return; }
    var act = b.getAttribute('data-act');
    if (act === 'code') { var f = box.querySelector('.lq-join'); f.setAttribute('data-mode', 'code'); f.innerHTML = '<p class="lq-bnote">Type your board name exactly as before (for example Minh T.) and your player code.</p><input id="lq-name" maxlength="24" placeholder="Name, e.g. Minh T." aria-label="Board name"><input id="lq-code" maxlength="6" placeholder="Code" aria-label="Player code"><button type="submit">Sign in</button><p class="lq-bmsg" role="status"></p>'; }
    if (act === 'out' && confirm('Sign out of ' + me().name + ' on this device? You will need your player code to sign back in.')) { put(KEY, null); draw(); }
  });
  box.addEventListener('submit', function (e) {
    e.preventDefault(); var f = e.target, msg = f.querySelector('.lq-bmsg');
    if (f.getAttribute('data-mode') === 'code') {
      var nm = f.querySelector('#lq-name').value.trim(), code = f.querySelector('#lq-code').value.trim().toUpperCase();
      api('/lq/signin', { name: nm, code: code }).then(function (j) { put(KEY, { name: j.name, code: code }); send(todayResult()).then(draw); }, function (er) { msg.textContent = (er && er.message) || 'That name and code do not match.'; });
      return;
    }
    var first = f.querySelector('#lq-first').value.trim(), ini = f.querySelector('#lq-ini').value.trim();
    api('/lq/claim', { first: first, initial: ini }).then(function (j) { put(KEY, { name: j.name, code: j.code }); send(todayResult()).then(draw); },
      function (er) { msg.textContent = (er && er.message) || 'Could not join right now. Try again later.'; });
  });
  send(todayResult()).then(draw);
})();
