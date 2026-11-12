(function () {
  'use strict';

  var STORAGE_KEY = 'quizarena-quiz';

  var SAMPLE = {
    title: 'Cómputo en la nube',
    questions: [
      { text: '¿Qué significa "IaaS"?', options: ['Internet as a Service', 'Infrastructure as a Service', 'Integration as a Service', 'Information as a System'], correct: 1, time: 20 },
      { text: '¿Cuál de estos es un proveedor de nube pública?', options: ['Microsoft Azure', 'Linux', 'Apache', 'MySQL'], correct: 0, time: 20 },
      { text: 'Gmail es un ejemplo de...', options: ['IaaS', 'PaaS', 'SaaS', 'On-premise'], correct: 2, time: 15 },
      { text: '¿Qué servicio de AWS se usa para almacenar objetos?', options: ['EC2', 'Lambda', 'S3', 'RDS'], correct: 2, time: 20 },
      { text: 'La escalabilidad horizontal consiste en...', options: ['Agregar más servidores', 'Agregar más RAM a un servidor', 'Cambiar de proveedor', 'Reducir usuarios'], correct: 0, time: 20 }
    ]
  };

  // ------------------------------------------------------------------
  // EDITOR
  // ------------------------------------------------------------------
  var quiz = loadQuiz();

  function loadQuiz() {
    try {
      var saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved && Array.isArray(saved.questions)) return saved;
    } catch (e) { /* sin almacenamiento */ }
    return JSON.parse(JSON.stringify(SAMPLE));
  }

  function saveQuiz() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(quiz)); } catch (e) { /* ignorar */ }
  }

  function blankQuestion() {
    return { text: '', options: ['', '', '', ''], correct: 0, time: 20 };
  }

  function renderEditor() {
    $('quizTitle').value = quiz.title || '';
    var box = $('questions');
    box.innerHTML = '';

    quiz.questions.forEach(function (q, qi) {
      while (q.options.length < 4) q.options.push('');
      var card = el('div', 'q-card');

      var head = el('div', 'q-head');
      head.appendChild(el('span', 'q-num', String(qi + 1)));
      var text = el('input');
      text.placeholder = 'Escribe la pregunta';
      text.value = q.text;
      text.oninput = function () { q.text = text.value; saveQuiz(); };
      head.appendChild(text);

      var time = el('select');
      [5, 10, 15, 20, 30, 45, 60, 90].forEach(function (s) {
        var o = el('option', null, s + ' s');
        o.value = s;
        if (s === q.time) o.selected = true;
        time.appendChild(o);
      });
      time.onchange = function () { q.time = parseInt(time.value, 10); saveQuiz(); };
      head.appendChild(time);

      var up = el('button', 'btn small light', '↑');
      up.title = 'Subir';
      up.disabled = qi === 0;
      up.onclick = function () { move(qi, -1); };
      head.appendChild(up);

      var del = el('button', 'btn small danger', '✕');
      del.title = 'Eliminar';
      del.onclick = function () {
        if (quiz.questions.length > 1 && !confirm('¿Eliminar esta pregunta?')) return;
        quiz.questions.splice(qi, 1);
        if (!quiz.questions.length) quiz.questions.push(blankQuestion());
        saveQuiz(); renderEditor();
      };
      head.appendChild(del);
      card.appendChild(head);

      var opts = el('div', 'opts-edit');
      q.options.slice(0, 4).forEach(function (opt, oi) {
        var row = el('label', 'opt-edit o' + oi);
        var radio = el('input');
        radio.type = 'radio';
        radio.name = 'correct-' + qi;
        radio.checked = q.correct === oi;
        radio.title = 'Respuesta correcta';
        radio.onchange = function () { q.correct = oi; saveQuiz(); };
        row.appendChild(radio);
        row.appendChild(el('span', 'letter', LETTERS[oi]));
        var input = el('input');
        input.type = 'text';
        input.placeholder = 'Opción ' + LETTERS[oi] + (oi > 1 ? ' (opcional)' : '');
        input.value = opt;
        input.oninput = function () { q.options[oi] = input.value; saveQuiz(); };
        row.appendChild(input);
        opts.appendChild(row);
      });
      card.appendChild(opts);
      box.appendChild(card);
    });
  }

  function move(i, dir) {
    var j = i + dir;
    if (j < 0 || j >= quiz.questions.length) return;
    var tmp = quiz.questions[i];
    quiz.questions[i] = quiz.questions[j];
    quiz.questions[j] = tmp;
    saveQuiz(); renderEditor();
  }

  // Convierte el cuestionario del editor en preguntas listas para jugar.
  function compileQuiz() {
    var out = [];
    for (var i = 0; i < quiz.questions.length; i++) {
      var q = quiz.questions[i];
      var n = i + 1;
      if (!q.text.trim()) throw new Error('La pregunta ' + n + ' no tiene texto.');
      var options = [], correct = -1;
      q.options.forEach(function (o, oi) {
        if (o.trim()) {
          if (oi === q.correct) correct = options.length;
          options.push(o.trim());
        }
      });
      if (options.length < 2) throw new Error('La pregunta ' + n + ' necesita al menos 2 opciones.');
      if (correct < 0) throw new Error('La respuesta correcta de la pregunta ' + n + ' está vacía.');
      out.push({ text: q.text.trim(), options: options, correct: correct, time: q.time || 20 });
    }
    return out;
  }

  $('quizTitle').oninput = function () { quiz.title = $('quizTitle').value; saveQuiz(); };
  $('btnAdd').onclick = function () {
    quiz.questions.push(blankQuestion());
    saveQuiz(); renderEditor();
    window.scrollTo(0, document.body.scrollHeight);
  };
  $('btnReset').onclick = function () {
    if (!confirm('Esto reemplaza tu cuestionario actual por el de ejemplo. ¿Continuar?')) return;
    quiz = JSON.parse(JSON.stringify(SAMPLE));
    saveQuiz(); renderEditor();
  };
  $('btnExport').onclick = function () {
    var blob = new Blob([JSON.stringify(quiz, null, 2)], { type: 'application/json' });
    download(blob, (quiz.title || 'quiz').replace(/[^\w\-]+/g, '_') + '.json');
  };
  $('btnImport').onclick = function () { $('fileInput').click(); };
  $('fileInput').onchange = function (e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var data = JSON.parse(reader.result);
        if (!Array.isArray(data.questions)) throw new Error();
        data.questions = data.questions.map(function (q) {
          return {
            text: String(q.text || ''),
            options: (q.options || []).slice(0, 4).map(String),
            correct: Number(q.correct) || 0,
            time: Number(q.time) || 20
          };
        });
        quiz = { title: String(data.title || ''), questions: data.questions };
        saveQuiz(); renderEditor();
      } catch (err) {
        alert('El archivo no tiene un formato válido.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  function download(blob, name) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  // ------------------------------------------------------------------
  // JUEGO (el navegador del anfitrión actúa como servidor vía PeerJS)
  // ------------------------------------------------------------------
  var peer = null;
  var pin = null;
  var game = null;          // { questions, index, phase, startTime, answers }
  var players = {};         // peerId -> { name, score, conn, last, connected }
  var timerId = null;

  $('btnHost').onclick = function () {
    var questions;
    try { questions = compileQuiz(); }
    catch (err) { $('editorError').textContent = err.message; return; }
    $('editorError').textContent = '';
    game = { questions: questions, index: -1, phase: 'lobby', answers: {} };
    players = {};
    renderPlayers();
    show('s-lobby');
    openRoom();
  };

  function openRoom() {
    if (peer && !peer.destroyed && pin) { showPin(); return; }
    pin = String(Math.floor(100000 + Math.random() * 900000));
    $('pinText').textContent = '······';
    $('lobbyStatus').textContent = 'Conectando con el servidor…';
    peer = new Peer(PEER_PREFIX + pin);

    peer.on('open', function () { $('lobbyStatus').textContent = ''; showPin(); });
    peer.on('connection', onConnection);
    peer.on('disconnected', function () {
      // Se perdió la conexión con el servidor de señalización: reintentar.
      if (!peer.destroyed) peer.reconnect();
    });
    peer.on('error', function (err) {
      if (err.type === 'unavailable-id') {
        peer.destroy(); peer = null; openRoom();
      } else if (err.type === 'network' || err.type === 'server-error' || err.type === 'socket-error') {
        $('lobbyStatus').textContent = 'Problema de red con el servidor (' + err.type + '). Reintentando…';
      } else {
        console.warn('PeerJS:', err);
      }
    });
  }

  function joinLink() {
    return location.href.replace(/host\.html.*$/, '').replace(/[?#].*$/, '') + 'play.html?pin=' + pin;
  }

  function showPin() {
    $('pinText').textContent = pin;
    var base = location.href.replace(/host\.html.*$/, '').replace(/[?#].*$/, '');
    $('joinUrl').textContent = base.replace(/^https?:\/\//, '');
    var qr = $('qrcode');
    qr.innerHTML = '';
    if (window.QRCode) {
      new QRCode(qr, { text: joinLink(), width: 150, height: 150 });
    }
  }

  function onConnection(conn) {
    conn.on('data', function (msg) { handleMessage(conn, msg); });
    conn.on('close', function () {
      var p = players[conn.peer];
      if (!p || p.conn !== conn) return; // ya se reconectó con otra conexión
      p.connected = false;
      if (game && game.phase === 'lobby') { delete players[conn.peer]; }
      renderPlayers();
      if (game && game.phase === 'question' && connectedCount() > 0 &&
          Object.keys(game.answers).length >= connectedCount()) endQuestion();
    });
  }

  function send(p, msg) {
    if (p && p.conn && p.conn.open) {
      try { p.conn.send(msg); } catch (e) { /* ignorar */ }
    }
  }

  function broadcast(msgFn) {
    Object.keys(players).forEach(function (id) {
      var p = players[id];
      send(p, typeof msgFn === 'function' ? msgFn(p, id) : msgFn);
    });
  }

  function handleMessage(conn, msg) {
    if (!msg || typeof msg !== 'object' || !game) return;

    if (msg.type === 'join') {
      var name = String(msg.name || '').trim().slice(0, 20);
      if (!name) { conn.send({ type: 'error', message: 'Escribe un nombre.' }); return; }

      // ¿Reconexión de un jugador existente (mismo nombre, desconectado)?
      var existingId = null;
      Object.keys(players).forEach(function (id) {
        if (players[id].name.toLowerCase() === name.toLowerCase()) existingId = id;
      });
      if (existingId && players[existingId].connected && existingId !== conn.peer) {
        conn.send({ type: 'error', message: 'Ese nombre ya está en uso. Elige otro.' });
        return;
      }
      if (game.phase === 'end') {
        conn.send({ type: 'error', message: 'El juego ya terminó.' });
        return;
      }

      var p;
      if (existingId) {
        p = players[existingId];
        delete players[existingId];
      } else {
        p = { name: name, score: 0, last: 0, correctCount: 0 };
      }
      p.conn = conn;
      p.connected = true;
      players[conn.peer] = p;
      // Si se reconectó, trasladamos su respuesta actual al nuevo id.
      if (existingId && game.answers[existingId]) {
        game.answers[conn.peer] = game.answers[existingId];
        delete game.answers[existingId];
      }

      conn.send({ type: 'joined', name: p.name, score: p.score, title: quiz.title || 'QuizArena' });
      renderPlayers();

      // Si entra a mitad de una pregunta, se la mandamos.
      if (game.phase === 'question' && !game.answers[conn.peer]) {
        send(p, questionMessage());
      }
      return;
    }

    if (msg.type === 'answer') {
      var player = players[conn.peer];
      if (!player || game.phase !== 'question' || game.answers[conn.peer]) return;
      if (msg.index !== game.index) return;
      var q = game.questions[game.index];
      var choice = Number(msg.choice);
      if (!(choice >= 0 && choice < q.options.length)) return;

      var elapsed = (Date.now() - game.startTime) / 1000;
      game.answers[conn.peer] = { choice: choice, elapsed: elapsed };
      send(player, { type: 'answered' });
      $('qAnswered').textContent = Object.keys(game.answers).length;

      if (Object.keys(game.answers).length >= connectedCount()) endQuestion();
    }
  }

  function connectedCount() {
    return Object.keys(players).filter(function (id) { return players[id].connected; }).length;
  }

  function renderPlayers() {
    var list = $('playerList');
    list.innerHTML = '';
    var ids = Object.keys(players).filter(function (id) { return players[id].connected; });
    ids.forEach(function (id) {
      var chip = el('span', 'player-chip', players[id].name);
      chip.title = 'Clic para expulsar';
      chip.style.cursor = 'pointer';
      chip.onclick = function () {
        if (!confirm('¿Expulsar a ' + players[id].name + '?')) return;
        send(players[id], { type: 'kicked' });
        var c = players[id].conn;
        delete players[id];
        setTimeout(function () { try { c.close(); } catch (e) {} }, 300);
        renderPlayers();
      };
      list.appendChild(chip);
    });
    $('playerCount').textContent = ids.length + (ids.length === 1 ? ' jugador' : ' jugadores');
    $('btnStart').disabled = ids.length === 0;
  }

  $('btnBackEditor').onclick = function () {
    broadcast({ type: 'kicked', message: 'El anfitrión cerró la sala.' });
    if (peer) { peer.destroy(); peer = null; pin = null; }
    show('s-editor');
  };

  $('btnStart').onclick = function () { nextQuestion(); };
  $('btnNext').onclick = function () { nextQuestion(); };
  $('btnSkip').onclick = function () { if (game.phase === 'question') endQuestion(); };
  $('btnToBoard').onclick = function () { showBoard(); };

  function questionMessage() {
    var q = game.questions[game.index];
    var remaining = Math.max(0, q.time - (Date.now() - game.startTime) / 1000);
    return {
      type: 'question',
      index: game.index,
      total: game.questions.length,
      text: q.text,
      options: q.options,
      time: q.time,
      remaining: remaining
    };
  }

  function nextQuestion() {
    game.index++;
    if (game.index >= game.questions.length) { showPodium(); return; }

    var q = game.questions[game.index];
    game.phase = 'question';
    game.answers = {};
    game.startTime = Date.now();

    $('qCounter').textContent = (game.index + 1) + ' / ' + game.questions.length;
    $('quizName').textContent = quiz.title || '';
    $('qText').textContent = q.text;
    $('qAnswered').textContent = '0';
    $('revealActions').classList.add('hidden');
    $('btnSkip').classList.remove('hidden');

    var opts = $('qOptions');
    opts.innerHTML = '';
    q.options.forEach(function (o, i) {
      var d = el('div', 'opt-show o' + i);
      d.appendChild(el('span', 'letter', LETTERS[i]));
      d.appendChild(el('span', null, o));
      opts.appendChild(d);
    });

    show('s-question');
    broadcast(questionMessage());

    clearInterval(timerId);
    tick();
    timerId = setInterval(tick, 200);
  }

  function tick() {
    var q = game.questions[game.index];
    var elapsed = (Date.now() - game.startTime) / 1000;
    var left = Math.max(0, q.time - elapsed);
    $('qTimer').textContent = Math.ceil(left);
    $('qProgress').style.width = (left / q.time * 100) + '%';
    if (left <= 0) endQuestion();
  }

  function endQuestion() {
    if (game.phase !== 'question') return;
    game.phase = 'reveal';
    clearInterval(timerId);
    $('qTimer').textContent = '0';
    $('qProgress').style.width = '0%';

    var q = game.questions[game.index];
    var votes = q.options.map(function () { return 0; });

    // Puntuación: hasta 1000 puntos, más rápido = más puntos (mínimo 500 si aciertas).
    Object.keys(players).forEach(function (id) {
      var p = players[id];
      var a = game.answers[id];
      p.last = 0;
      p.lastCorrect = false;
      if (a) {
        votes[a.choice]++;
        if (a.choice === q.correct) {
          p.last = Math.round(1000 * (1 - Math.min(a.elapsed / q.time, 1) / 2));
          p.lastCorrect = true;
          p.correctCount = (p.correctCount || 0) + 1;
        }
      }
      p.score += p.last;
    });

    var nodes = $('qOptions').children;
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].classList.add(i === q.correct ? 'correct' : 'dim');
      nodes[i].appendChild(el('span', 'votes', votes[i] + ' 👤'));
    }
    $('revealActions').classList.remove('hidden');
    $('btnSkip').classList.add('hidden');
    $('btnToBoard').textContent = game.index + 1 >= game.questions.length ? 'Ver resultados finales ➜' : 'Ver posiciones ➜';

    var ranking = ranked();
    broadcast(function (p, id) {
      return {
        type: 'result',
        answered: !!game.answers[id],
        correct: p.lastCorrect,
        points: p.last,
        score: p.score,
        rank: ranking.indexOf(p) + 1,
        correctAnswer: q.options[q.correct]
      };
    });
  }

  function ranked() {
    return Object.keys(players).map(function (id) { return players[id]; })
      .sort(function (a, b) { return b.score - a.score; });
  }

  function showBoard() {
    if (game.index + 1 >= game.questions.length) { showPodium(); return; }
    game.phase = 'board';
    var list = $('boardList');
    list.innerHTML = '';
    ranked().slice(0, 5).forEach(function (p, i) {
      var row = el('div', 'board-row');
      row.style.animationDelay = (i * 0.08) + 's';
      row.appendChild(el('span', 'pos', String(i + 1)));
      row.appendChild(el('span', 'name', p.name));
      if (p.last) row.appendChild(el('span', 'delta', '+' + p.last));
      row.appendChild(el('span', null, String(p.score)));
      list.appendChild(row);
    });
    show('s-board');
  }

  function showPodium() {
    game.phase = 'end';
    clearInterval(timerId);
    var ranking = ranked();

    var podium = $('podium');
    podium.innerHTML = '';
    [1, 0, 2].forEach(function (i) {
      var p = ranking[i];
      if (!p) return;
      var place = el('div', 'place p' + (i + 1));
      place.appendChild(el('div', 'pname', p.name));
      var block = el('div', 'block', String(i + 1));
      block.appendChild(el('small', null, p.score + ' pts'));
      place.appendChild(block);
      podium.appendChild(place);
    });

    var list = $('finalList');
    list.innerHTML = '';
    ranking.slice(3, 10).forEach(function (p, i) {
      var row = el('div', 'board-row');
      row.appendChild(el('span', 'pos', String(i + 4)));
      row.appendChild(el('span', 'name', p.name));
      row.appendChild(el('span', null, String(p.score)));
      list.appendChild(row);
    });

    broadcast(function (p) {
      return { type: 'end', rank: ranking.indexOf(p) + 1, total: ranking.length, score: p.score };
    });
    show('s-podium');
  }

  $('btnDownload').onclick = function () {
    var rows = [['Posición', 'Nombre', 'Puntos', 'Aciertos', 'Preguntas']];
    ranked().forEach(function (p, i) {
      rows.push([i + 1, p.name, p.score, p.correctCount || 0, game.questions.length]);
    });
    var csv = rows.map(function (r) {
      return r.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(',');
    }).join('\r\n');
    download(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }), 'resultados.csv');
  };

  $('btnAgain').onclick = function () {
    // Misma sala y mismos jugadores; puntajes a cero.
    Object.keys(players).forEach(function (id) {
      if (!players[id].connected) { delete players[id]; return; }
      players[id].score = 0; players[id].last = 0; players[id].correctCount = 0;
    });
    try { game.questions = compileQuiz(); } catch (e) { /* usar las anteriores */ }
    game.index = -1;
    game.phase = 'lobby';
    broadcast(function (p) { return { type: 'joined', name: p.name, score: 0, title: quiz.title || 'QuizArena' }; });
    renderPlayers();
    showPin();
    show('s-lobby');
  };

  window.addEventListener('beforeunload', function (e) {
    if (game && game.phase !== 'lobby' && game.phase !== 'end' && connectedCount() > 0) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  renderEditor();
  show('s-editor');
})();
