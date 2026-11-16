/* Simulations and animations: "Show here" for PhET (CC BY, embedding allowed), slide buttons on topic pages,
   and the level, type and search filters on simulations.html. */
(function () {
  // Show here: a full-window frame with a Close button
  var dlg = null, frame = null, ttl = null;
  function open(url, title) {
    if (!dlg) {
      dlg = document.createElement('div'); dlg.className = 'sim-dialog'; dlg.setAttribute('role', 'dialog'); dlg.setAttribute('aria-modal', 'true');
      dlg.innerHTML = '<div class="sim-dialog-bar"><span class="sim-dialog-title"></span><a class="sim-dialog-new" target="_blank" rel="noopener">Open in new tab</a><button type="button" class="sim-dialog-close">Close</button></div><iframe allowfullscreen title="Simulation"></iframe>';
      document.body.appendChild(dlg);
      frame = dlg.querySelector('iframe'); ttl = dlg.querySelector('.sim-dialog-title');
      dlg.querySelector('.sim-dialog-close').addEventListener('click', close);
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !dlg.hidden) close(); });
    }
    ttl.textContent = title || ''; dlg.querySelector('.sim-dialog-new').href = url;
    frame.src = url; dlg.hidden = false; document.documentElement.classList.add('sim-open-page');
    dlg.querySelector('.sim-dialog-close').focus();
  }
  function close() { dlg.hidden = true; frame.src = 'about:blank'; document.documentElement.classList.remove('sim-open-page'); }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.sim-here');
    if (b) { open(b.dataset.embed, b.dataset.title); return; }
    var s = e.target.closest && e.target.closest('button.sim-slide');
    if (s) {
      var range = document.getElementById('viewer-range'), v = document.getElementById('viewer');
      if (range) { range.value = s.dataset.slide; range.dispatchEvent(new Event('input')); }
      if (v) v.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });

  // Type tabs in a topic page's box: All, Simulations, Interactives, Animations
  document.querySelectorAll('.sim-tabs').forEach(function (bar) {
    var box = bar.parentNode;
    bar.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-tab]'); if (!b) return;
      bar.querySelectorAll('button').forEach(function (o) { o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); });
      box.querySelectorAll('.sim-card').forEach(function (c) { c.hidden = b.dataset.tab !== 'all' && c.dataset.type !== b.dataset.tab; });
    });
  });

  // Hub filters
  var search = document.getElementById('sim-search');
  if (!search) return;
  var lvl = 'all', kind = 'all', empty = document.getElementById('sim-empty');
  function filter() {
    var q = search.value.trim().toLowerCase(), any = false;
    document.querySelectorAll('.sim-unit').forEach(function (u) {
      var okL = lvl === 'all' || u.dataset.level === lvl, shown = 0;
      u.querySelectorAll('.sim-topic').forEach(function (t) {
        var okQ = !q || q.split(/\s+/).every(function (w) { return t.dataset.q.indexOf(w) >= 0; }), cards = 0;
        t.querySelectorAll('.sim-card').forEach(function (c) { var ok = okL && okQ && (kind === 'all' || c.dataset.type === kind); c.hidden = !ok; if (ok) cards++; });
        t.hidden = !cards; if (cards) shown++;
      });
      u.hidden = !shown; if (shown) any = true;
    });
    document.querySelectorAll('.sim-own').forEach(function (o) {
      var ok = (kind === 'all' || o.dataset.type === kind) && (!q || q.split(/\s+/).every(function (w) { return o.dataset.q.indexOf(w) >= 0; }));
      o.hidden = !ok; if (ok) any = true;
    });
    if (empty) empty.hidden = any;
  }
  document.querySelectorAll('[data-lvl],[data-kind]').forEach(function (b) {
    b.addEventListener('click', function () {
      var attr = b.dataset.lvl !== undefined ? 'lvl' : 'kind';
      if (attr === 'lvl') lvl = b.dataset.lvl; else kind = b.dataset.kind;
      document.querySelectorAll('[data-' + attr + ']').forEach(function (o) { o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); });
      filter();
    });
  });
  search.addEventListener('input', filter);
})();
