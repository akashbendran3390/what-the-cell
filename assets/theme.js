// Light and dark themes. Loaded in the head of every page, so the saved theme applies before anything is drawn.
(function () {
  var KEY = 'wtc-theme', root = document.documentElement;
  function saved() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function remember(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }
  var theme = saved() === 'dark' ? 'dark' : 'light';
  root.setAttribute('data-theme', theme);

  var MOON = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M20.5 14.6A8.5 8.5 0 0 1 9.4 3.5a.6.6 0 0 0-.8-.7A9.7 9.7 0 1 0 21.2 15.4a.6.6 0 0 0-.7-.8Z"/></svg>';
  var SUN = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><circle cx="12" cy="12" r="4.5" fill="currentColor"/><path stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M12 2.5v2.4M12 19.1v2.4M2.5 12h2.4M19.1 12h2.4M5.3 5.3 7 7M17 17l1.7 1.7M5.3 18.7 7 17M17 7l1.7-1.7"/></svg>';

  function paint(btn) {
    var dark = theme === 'dark';
    btn.innerHTML = (dark ? SUN : MOON) + '<span>' + (dark ? 'Light theme' : 'Dark theme') + '</span>';
    btn.setAttribute('aria-label', dark ? 'Switch to the light theme' : 'Switch to the dark theme');
  }

  function mount() {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'theme-toggle';
    paint(btn);
    btn.addEventListener('click', function () {
      theme = theme === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', theme);
      remember(theme);
      paint(btn);
    });
    var nav = document.querySelector('.site-nav');
    if (nav) { nav.appendChild(btn); return; }
    // The front page has no menu, so the button gets its own row at the top of the band.
    var band = document.querySelector('.band-in');
    if (band) {
      var row = document.createElement('div');
      row.className = 'theme-row';
      row.appendChild(btn);
      band.insertBefore(row, band.firstChild);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
