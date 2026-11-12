/* Think deeper pages: answer choices, Done marks (this browser only) and "Show on the board". */
(function () {
  var KEY = 'wtc-think-done', done = {};
  try { done = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { done = {}; }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(done)); } catch (e) {} }
  function showDone(card) { var m = card.querySelector('.cc-done'); if (m) m.hidden = false; }

  function markOptions(scope, key) {
    scope.querySelectorAll('.cc-opt').forEach(function (o) {
      if (o.getAttribute('data-opt') === key) o.classList.add('right');
      else if (o.getAttribute('aria-pressed') === 'true') o.classList.add('wrong');
    });
  }

  document.querySelectorAll('details.cc, details.bq').forEach(function (card) {
    if (done[card.id]) showDone(card);
    var key = card.getAttribute('data-key');
    var ans = card.querySelector('.cc-ans');
    card.querySelectorAll('.cc-opt').forEach(function (b) {
      b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', function () {
        card.querySelectorAll('.cc-opt').forEach(function (o) { o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); o.classList.remove('right', 'wrong'); });
        if (ans && ans.open) markOptions(card, key);
      });
    });
    if (ans) ans.addEventListener('toggle', function () {
      if (!ans.open) return;
      if (key) markOptions(card, key);
      done[card.id] = 1; save(); showDone(card);
    });
    var bb = card.querySelector('.cc-board');
    if (bb) bb.addEventListener('click', function () { board(card, bb); });
  });

  function openHash() {
    var id = decodeURIComponent(location.hash.slice(1));
    if (!id) return;
    var el = document.getElementById(id);
    if (el && el.tagName === 'DETAILS') { el.open = true; el.scrollIntoView({ block: 'start' }); }
  }
  window.addEventListener('hashchange', openHash);
  openHash();

  function btn(text, cls) { var b = document.createElement('button'); b.type = 'button'; b.className = 'think-btn ' + (cls || ''); b.textContent = text; return b; }

  function board(card, opener) {
    var isCc = card.classList.contains('cc');
    var ov = document.createElement('div');
    ov.className = 'think-board'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true');
    var bar = document.createElement('div'); bar.className = 'board-bar';
    var reveal = btn(isCc ? 'Show the answer' : 'What biologists think so far', 'board-reveal');
    var close = btn('Close (Esc)', 'board-close');
    bar.appendChild(reveal); bar.appendChild(close);
    var inner = document.createElement('div'); inner.className = 'board-in';
    var h = document.createElement('h2'); h.textContent = card.querySelector('.cc-title').textContent; inner.appendChild(h);
    ov.setAttribute('aria-label', h.textContent);
    var fig = card.querySelector('.cc-photo img');
    if (fig) { var f = fig.cloneNode(true); f.removeAttribute('loading'); f.classList.add('board-photo'); inner.appendChild(f); }
    ['.cc-q', '.bq-hook', '.cc-opts', '.bq-think'].forEach(function (s) {
      var el = card.querySelector(s); if (!el) return;
      var c = el.cloneNode(true);
      c.querySelectorAll('button').forEach(function (b) { b.disabled = true; b.classList.remove('right', 'wrong'); b.removeAttribute('aria-pressed'); });
      inner.appendChild(c);
    });
    var hidden = document.createElement('div'); hidden.className = 'board-answer'; hidden.hidden = true;
    if (isCc) {
      hidden.appendChild(card.querySelector('.cc-short').cloneNode(true));
      var dg = card.querySelector('.cc-diagram');
      if (dg) { var dc = dg.cloneNode(true); dc.querySelectorAll('[id]').forEach(function (el) { el.id = el.id + '-b'; }); dc.querySelectorAll('[marker-end]').forEach(function (el) { el.setAttribute('marker-end', el.getAttribute('marker-end').replace(')', '-b)')); }); hidden.appendChild(dc); }
    }
    else { card.querySelectorAll('.bq-sofar p').forEach(function (p) { hidden.appendChild(p.cloneNode(true)); }); }
    inner.appendChild(hidden);
    ov.appendChild(bar); ov.appendChild(inner);
    document.body.appendChild(ov); document.body.classList.add('board-open');

    var wasFull = false;
    function shut() {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('fullscreenchange', onFs);
      if (document.fullscreenElement) { try { document.exitFullscreen(); } catch (e) {} }
      ov.remove(); document.body.classList.remove('board-open');
      if (opener) opener.focus();
    }
    function onKey(e) { if (e.key === 'Escape') { e.preventDefault(); shut(); } }
    function onFs() { if (document.fullscreenElement) wasFull = true; else if (wasFull) shut(); }
    reveal.addEventListener('click', function () {
      hidden.hidden = false; reveal.hidden = true;
      if (isCc) inner.querySelectorAll('.cc-opt').forEach(function (o) { if (o.getAttribute('data-opt') === card.getAttribute('data-key')) o.classList.add('right'); });
      done[card.id] = 1; save(); showDone(card);
    });
    close.addEventListener('click', shut);
    document.addEventListener('keydown', onKey);
    document.addEventListener('fullscreenchange', onFs);
    if (ov.requestFullscreen) { try { var pr = ov.requestFullscreen(); if (pr && pr.catch) pr.catch(function () {}); } catch (e) {} }
    reveal.focus();
  }
})();
