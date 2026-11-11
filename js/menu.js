/* Erdell Collectibles – Menü-Overlay.
   Solange das Menü offen ist, sind Kopf, Inhalt und Fußzeile mit "inert" gesperrt.
   So bleibt die Tab-Taste im Menü und Screenreader lesen nur das Menü.
   Ein Klick auf einen Eintrag schließt das Menü und springt zum Abschnitt. */
(function () {
  var nav = document.getElementById('nav');
  var openBtn = document.getElementById('menu-open');
  var closeBtn = document.getElementById('menu-close');
  if (!nav || !openBtn || !closeBtn) return;
  var behind = document.querySelectorAll('.site-header, .bar, main, .site-footer, .sub-footer');

  function set(open, keepFocus) {
    nav.classList.toggle('open', open);
    openBtn.setAttribute('aria-expanded', open);
    document.body.style.overflow = open ? 'hidden' : '';
    behind.forEach(function (el) { el.inert = open; });
    if (!keepFocus) (open ? closeBtn : openBtn).focus();
  }

  openBtn.addEventListener('click', function () { set(true); });
  closeBtn.addEventListener('click', function () { set(false); });
  nav.addEventListener('click', function (e) {
    if (e.target.closest('ul a')) set(false, true);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && nav.classList.contains('open')) set(false);
  });
})();
