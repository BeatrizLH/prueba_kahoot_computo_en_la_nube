// Prefijo para los IDs de PeerJS (evita choques con otras apps en el servidor público).
var PEER_PREFIX = 'quizarena-v1-';
var LETTERS = ['A', 'B', 'C', 'D'];

function $(id) { return document.getElementById(id); }

function show(id) {
  document.querySelectorAll('[data-screen]').forEach(function (el) {
    el.classList.toggle('hidden', el.id !== id);
  });
}

function el(tag, className, text) {
  var e = document.createElement(tag);
  if (className) e.className = className;
  if (text !== undefined) e.textContent = text;
  return e;
}
