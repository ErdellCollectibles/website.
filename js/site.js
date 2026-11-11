/* Erdell Collectibles – Bewegung auf der Startseite.
   1. Abschnittsteile mit der Klasse .rise erscheinen, sobald sie ins Bild kommen.
   2. Die Schritte in "Vom Karton bis zum Deckel" steuern die angeheftete 3D-Ansicht.
   3. Die äußeren Kartonfotos steigen beim Scrollen leicht auf.
   Gerechnet wird beim Scrollen über getBoundingClientRect, damit es auch in
   Vorschauen ohne IntersectionObserver-Ereignisse zuverlässig läuft. */
(function () {
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root = document.documentElement;

  var rises = Array.prototype.slice.call(document.querySelectorAll('.rise'));
  var steps = Array.prototype.slice.call(document.querySelectorAll('.story-steps .step'));
  var viewer = document.querySelector('.ec3d--story');
  var sides = Array.prototype.slice.call(document.querySelectorAll('.triptych .side'));

  var current = -1;
  var pending = false;

  function showStep(i) {
    if (i === current) return;
    current = i;
    steps.forEach(function (s, k) { s.classList.toggle('is-active', k === i); });
    tellViewer();
  }

  // Die 3D-Ansicht wird erst geladen, wenn sie in die Nähe kommt; bis dahin merken.
  function tellViewer() {
    if (!viewer || current < 0) return;
    if (!viewer.ec3d) { setTimeout(tellViewer, 300); return; }
    var last = current === steps.length - 1;
    viewer.classList.toggle('is-final', last);
    viewer.ec3d.goTo(current);
    if (last) viewer.ec3d.activate();
  }

  function update() {
    pending = false;
    var h = window.innerHeight;

    for (var i = rises.length - 1; i >= 0; i--) {
      var r = rises[i].getBoundingClientRect();
      if (r.top < h * 0.92 && r.bottom > 0) {
        rises[i].classList.add('is-in');
        rises.splice(i, 1);
      }
    }

    // Auf dem Handy bedient man die 3D-Ansicht über ihre eigenen Buttons.
    if (steps.length && window.innerWidth > 760) {
      // Bezugslinie: Mitte des Fensters, auf dem Handy die Mitte der Fläche unter der 3D-Bühne
      var line = window.innerWidth <= 760 ? h * 0.75 : h * 0.5;
      var best = 0, bestDist = Infinity;
      steps.forEach(function (s, k) {
        var b = s.getBoundingClientRect();
        var d = Math.abs((b.top + b.bottom) / 2 - line);
        if (d < bestDist) { bestDist = d; best = k; }
      });
      showStep(best);
    }

    if (!reduced && sides.length) {
      var box = sides[0].parentNode.getBoundingClientRect();
      var p = Math.min(1, Math.max(0, (h - box.top) / (h + box.height)));
      var y = Math.round((0.5 - p) * 120);
      sides.forEach(function (el) { el.style.transform = 'translateY(' + y + 'px)'; });
    }
  }

  function request() {
    if (!pending) { pending = true; requestAnimationFrame(update); }
  }

  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request);
  window.addEventListener('load', request);
  update();

  // Falls Skripte zu spät kommen oder das Fenster nicht scrollt: nichts bleibt unsichtbar.
  setTimeout(function () {
    if (!root.classList.contains('js')) return;
    rises.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < window.innerHeight) el.classList.add('is-in');
    });
  }, 2500);
})();
