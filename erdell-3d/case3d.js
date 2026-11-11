/* Erdell Collectibles – Lader für die 3D-Ansicht.
   Lädt three.js (ca. 700 KB) erst, wenn die Ansicht in die Nähe des Bildschirms scrollt. */
(function () {
  var els = Array.prototype.slice.call(document.querySelectorAll('[data-erdell-3d]'));
  if (!els.length) return;
  var base = new URL('.', document.currentScript ? document.currentScript.src : location.href).href;
  var MARGIN = 400;

  function start(el) {
    if (el.__ec3d) return;
    el.__ec3d = true;
    import(base + 'case3d-scene.js')
      .then(function (m) { return m.mount(el); })
      .catch(function (err) {
        console.error('3D-Ansicht konnte nicht geladen werden', err);
        el.classList.add('ec3d--error');
      });
  }
  function near(el) {
    var r = el.getBoundingClientRect();
    return r.top < window.innerHeight + MARGIN && r.bottom > -MARGIN;
  }
  // Absicherung für Browser, in denen der IntersectionObserver nicht feuert
  function check() { els.forEach(function (el) { if (near(el)) start(el); }); }
  window.addEventListener('scroll', check, { passive: true });
  window.addEventListener('load', check);

  els.forEach(function (el) {
    if (!('IntersectionObserver' in window)) return start(el);
    var io = new IntersectionObserver(function (entries) {
      if (entries.some(function (e) { return e.isIntersecting; })) { io.disconnect(); start(el); }
    }, { rootMargin: MARGIN + 'px 0px' });
    io.observe(el);
  });
})();
