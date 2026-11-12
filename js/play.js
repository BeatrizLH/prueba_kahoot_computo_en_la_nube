(function () {
  'use strict';

  var peer = null;
  var conn = null;
  var myName = '';
  var pin = '';
  var joined = false;
  var currentIndex = -1;
  var progressTimer = null;
  var reconnectTries = 0;

  var params = new URLSearchParams(location.search);
  if (params.get('pin')) $('pinInput').value = params.get('pin').replace(/\D/g, '');
  try { $('nameInput').value = localStorage.getItem('quizarena-name') || ''; } catch (e) {}
  if ($('pinInput').value) $('nameInput').focus(); else $('pinInput').focus();

  function view(id) {
    document.querySelectorAll('[data-view]').forEach(function (v) {
      v.classList.toggle('hidden', v.id !== id);
    });
  }

  function joinError(msg) {
    $('joinError').textContent = msg;
    $('joinBtn').disabled = false;
    $('joinBtn').textContent = '¡Entrar!';
  }

  $('joinForm').addEventListener('submit', function (e) {
    e.preventDefault();
    pin = $('pinInput').value.replace(/\D/g, '');
    myName = $('nameInput').value.trim();
    if (!pin || !myName) return;
    try { localStorage.setItem('quizarena-name', myName); } catch (err) {}
    $('joinError').textContent = '';
    $('joinBtn').disabled = true;
    $('joinBtn').textContent = 'Conectando…';
    connect();
  });

  function connect() {
    if (!peer || peer.destroyed) {
      peer = new Peer();
      peer.on('open', openConnection);
      peer.on('error', function (err) {
        if (err.type === 'peer-unavailable') {
          if (joined) scheduleReconnect();
          else joinError('No existe un juego con ese PIN.');
        } else if (!joined) {
          joinError('Error de conexión (' + err.type + '). Intenta de nuevo.');
        } else {
          scheduleReconnect();
        }
      });
      peer.on('disconnected', function () { if (!peer.destroyed) peer.reconnect(); });
    } else if (peer.open) {
      openConnection();
    }
  }

  function openConnection() {
    if (conn) { try { conn.close(); } catch (e) {} }
    conn = peer.connect(PEER_PREFIX + pin, { reliable: true });
    var opened = false;
    var timeout = setTimeout(function () {
      if (!opened) {
        if (joined) scheduleReconnect();
        else joinError('No se pudo conectar. Revisa el PIN.');
      }
    }, 10000);

    conn.on('open', function () {
      opened = true;
      clearTimeout(timeout);
      reconnectTries = 0;
      conn.send({ type: 'join', name: myName });
    });
    conn.on('data', onMessage);
    conn.on('close', function () {
      if (joined) scheduleReconnect();
    });
  }

  function scheduleReconnect() {
    if (!joined) return;
    reconnectTries++;
    if (reconnectTries > 10) {
      waitScreen('Conexión perdida', 'Recarga la página para volver a entrar.');
      return;
    }
    waitScreen('Reconectando…', 'Intento ' + reconnectTries);
    setTimeout(function () { connect(); }, 1500);
  }

  function waitScreen(title, sub) {
    clearInterval(progressTimer);
    $('waitTitle').textContent = title;
    $('waitSub').textContent = sub || '';
    view('v-wait');
  }

  function onMessage(msg) {
    if (!msg || typeof msg !== 'object') return;

    switch (msg.type) {
      case 'error':
        if (!joined) joinError(msg.message);
        break;

      case 'joined':
        joined = true;
        myName = msg.name;
        $('barName').textContent = msg.name;
        $('barScore').textContent = msg.score;
        $('barInfo').textContent = '';
        show('p-game');
        waitScreen('¡Ya estás dentro!', '¿Ves tu nombre en la pantalla?');
        break;

      case 'question':
        showQuestion(msg);
        break;

      case 'answered':
        waitScreen('¡Respuesta enviada!', '¿Habrás acertado? 🤔');
        break;

      case 'result':
        showResult(msg);
        break;

      case 'end':
        clearInterval(progressTimer);
        $('barScore').textContent = msg.score;
        var medal = msg.rank === 1 ? '🥇' : msg.rank === 2 ? '🥈' : msg.rank === 3 ? '🥉' : '🎉';
        $('v-result').className = 'result-screen';
        $('resIcon').textContent = medal;
        $('resTitle').textContent = 'Quedaste en el lugar ' + msg.rank;
        $('resSub').textContent = 'de ' + msg.total + ' jugadores';
        $('resPoints').textContent = msg.score + ' puntos';
        view('v-result');
        break;

      case 'kicked':
        joined = false;
        if (peer) peer.destroy();
        show('p-join');
        joinError(msg.message || 'Saliste del juego.');
        break;
    }
  }

  function showQuestion(msg) {
    currentIndex = msg.index;
    $('barInfo').textContent = (msg.index + 1) + ' / ' + msg.total;
    $('pQuestion').textContent = msg.text;

    var grid = $('answerGrid');
    grid.innerHTML = '';
    msg.options.forEach(function (o, i) {
      var b = el('button', 'answer-btn o' + i);
      b.appendChild(el('span', 'letter', LETTERS[i]));
      b.appendChild(el('span', null, o));
      b.onclick = function () {
        if (navigator.vibrate) navigator.vibrate(30);
        conn.send({ type: 'answer', index: currentIndex, choice: i });
        grid.querySelectorAll('button').forEach(function (x) { x.disabled = true; });
      };
      grid.appendChild(b);
    });
    view('v-answer');

    // Barra de tiempo local (aproximada; el anfitrión es quien decide).
    var end = Date.now() + msg.remaining * 1000;
    clearInterval(progressTimer);
    progressTimer = setInterval(function () {
      var left = Math.max(0, end - Date.now()) / 1000;
      $('pProgress').style.width = (left / msg.time * 100) + '%';
      if (left <= 0) clearInterval(progressTimer);
    }, 200);
  }

  function showResult(msg) {
    clearInterval(progressTimer);
    $('barScore').textContent = msg.score;
    var box = $('v-result');
    if (msg.correct) {
      box.className = 'result-screen good';
      $('resIcon').textContent = '✔';
      $('resTitle').textContent = '¡Correcto!';
    } else {
      box.className = 'result-screen bad';
      $('resIcon').textContent = msg.answered ? '✘' : '⌛';
      $('resTitle').textContent = msg.answered ? 'Incorrecto' : '¡Se acabó el tiempo!';
    }
    $('resSub').textContent = (msg.correct ? '' : 'La respuesta era: ' + msg.correctAnswer + ' · ') +
      'Vas en el lugar ' + msg.rank;
    $('resPoints').textContent = '+' + msg.points;
    view('v-result');
  }
})();
