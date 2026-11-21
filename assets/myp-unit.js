// MYP unit pages: "The unit" and "Revision" tabs (2026-11-21). The tab is kept in the address (#revision) so links can open it.
(function () {
  var tabs = document.querySelectorAll('.ptab'); if (!tabs.length) return;
  function show(id, scroll) {
    [].forEach.call(tabs, function (t) { var on = t.dataset.p === id; t.setAttribute('aria-selected', on); document.getElementById('pp-' + t.dataset.p).hidden = !on; });
    if (history.replaceState) history.replaceState(null, '', id === 'revision' ? '#revision' : location.pathname);
    if (scroll) document.querySelector('.ptabs').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  [].forEach.call(tabs, function (t) { t.addEventListener('click', function () { show(t.dataset.p, false); }); });
  [].forEach.call(document.querySelectorAll('a[href="#revision"]'), function (a) { a.addEventListener('click', function (e) { e.preventDefault(); show('revision', true); }); });
  var h = location.hash.replace('#', '');
  if (h === 'revision' || ['unit-notes', 'unit-review', 'revision-deck'].indexOf(h) >= 0) show('revision', false);
  else if (h && document.getElementById(h) && document.getElementById('pp-revision').contains(document.getElementById(h))) show('revision', false);
})();
