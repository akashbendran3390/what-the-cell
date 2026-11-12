/* Teachers tab: derive a key from username + password, check it, decrypt the teacher hub and files. */
(function () {
  var main = document.getElementById('t-main');
  if (!main || !window.crypto || !crypto.subtle) {
    var m = document.getElementById('t-msg'); if (m) m.textContent = 'This browser cannot open the teacher area. Please use a current version of Chrome, Edge, Safari or Firefox.';
    return;
  }
  // Several logins (2026-11-12): each one unlocks its own wrapped copy of the master key
  var logins = JSON.parse(main.dataset.logins || '[]');
  var iter = parseInt(main.dataset.iter, 10);
  var cacheKey = 'wtc-teacher-' + main.dataset.build;
  var keys = null;
  var enc = new TextEncoder();
  var msg = document.getElementById('t-msg');

  function ss(k, v) { try { if (v === undefined) return sessionStorage.getItem(k); if (v === null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch (e) { return null; } }
  function b64(u8) { var s = ''; u8.forEach(function (b) { s += String.fromCharCode(b); }); return btoa(s); }
  function unb64(s) { return Uint8Array.from(atob(s), function (c) { return c.charCodeAt(0); }); }

  function importKeys(raw) {
    return Promise.all([
      crypto.subtle.importKey('raw', raw.slice(0, 32), { name: 'AES-CBC' }, false, ['decrypt']),
      crypto.subtle.importKey('raw', raw.slice(32, 64), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'])
    ]).then(function (k) { return { aes: k[0], mac: k[1], raw: raw }; });
  }
  function deriveWith(user, pass, salt) {
    return crypto.subtle.importKey('raw', enc.encode(user.trim().toLowerCase() + '\n' + pass), 'PBKDF2', false, ['deriveBits'])
      .then(function (base) { return crypto.subtle.deriveBits({ name: 'PBKDF2', salt: salt, iterations: iter, hash: 'SHA-256' }, base, 512); })
      .then(function (bits) { return importKeys(new Uint8Array(bits)); });
  }
  // Try each login entry in turn; the right one unwraps the master key (its HMAC checks out)
  function derive(user, pass) {
    var i = 0;
    function next() {
      if (i >= logins.length) return Promise.reject(new Error('wrong'));
      var l = logins[i++];
      return deriveWith(user, pass, unb64(l.s))
        .then(function (k) { return open(k, unb64(l.w).buffer); })
        .then(function (master) { return importKeys(new Uint8Array(master)); })
        .catch(next);
    }
    return next();
  }
  function open(k, buf) {
    var u = new Uint8Array(buf);
    if (u.length < 64) return Promise.reject(new Error('bad'));
    var body = u.slice(0, u.length - 32), tag = u.slice(u.length - 32);
    return crypto.subtle.verify('HMAC', k.mac, tag, body).then(function (ok) {
      if (!ok) throw new Error('wrong');
      return crypto.subtle.decrypt({ name: 'AES-CBC', iv: body.slice(0, 16) }, k.aes, body.slice(16));
    });
  }
  function fetchBin(name) {
    return fetch('teacher/' + name + '.bin', { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error('missing'); return r.arrayBuffer(); });
  }

  function show(k, html) {
    keys = k;
    document.getElementById('t-login').hidden = true;
    var box = document.getElementById('t-content');
    box.innerHTML = html; box.hidden = false;
    var tabs = box.querySelectorAll('[data-ttab]');
    var pick = function (id) {
      tabs.forEach(function (t) { if (t.dataset.ttab === id) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current'); });
      box.querySelectorAll('[data-tpanel]').forEach(function (p) { p.hidden = p.id !== id; });
    };
    tabs.forEach(function (t) { t.addEventListener('click', function (e) { e.preventDefault(); pick(t.dataset.ttab); }); });
    box.querySelectorAll('[data-file]').forEach(function (b) {
      b.addEventListener('click', function () {
        var label = b.textContent; b.textContent = 'Preparing...'; b.disabled = true;
        fetchBin(b.dataset.file).then(function (buf) { return open(keys, buf); }).then(function (plain) {
          var url = URL.createObjectURL(new Blob([plain], { type: b.dataset.type || 'application/octet-stream' }));
          var a = document.createElement('a'); a.href = url; a.download = b.dataset.name; document.body.appendChild(a); a.click(); a.remove();
          setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
          b.textContent = label; b.disabled = false;
        }).catch(function () { b.textContent = 'Could not open, try again'; b.disabled = false; });
      });
    });
    document.getElementById('t-logout').addEventListener('click', function () { ss(cacheKey, null); location.reload(); });
  }

  function tryKeys(k) {
    return fetchBin('index').then(function (buf) { return open(k, buf); }).then(function (plain) {
      show(k, new TextDecoder().decode(plain));
      return true;
    });
  }

  var cached = ss(cacheKey);
  if (cached) {
    importKeys(unb64(cached)).then(tryKeys).catch(function () { ss(cacheKey, null); });
  }

  document.getElementById('t-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var user = document.getElementById('t-user').value, pass = document.getElementById('t-pass').value;
    msg.textContent = 'Checking...';
    derive(user, pass).then(function (k) {
      return tryKeys(k).then(function () { ss(cacheKey, b64(k.raw)); msg.textContent = ''; });
    }).catch(function () { msg.textContent = 'That username and password did not work.'; document.getElementById('t-pass').value = ''; });
  });
})();
