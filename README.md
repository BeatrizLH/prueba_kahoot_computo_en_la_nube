# QuizArena 🎮

Juego de preguntas en vivo estilo "quiz show" para clases o reuniones. Funciona 100 % en el navegador y se puede publicar gratis en **GitHub Pages** (no necesita servidor propio).

## ¿Cómo funciona?

- **Anfitrión** (`host.html`): crea el cuestionario, abre una sala con un **PIN** y proyecta la pantalla.
- **Jugadores** (`play.html`): entran desde su celular con el PIN (o escaneando el código QR) y responden.
- La comunicación es en tiempo real usando **WebRTC** con [PeerJS](https://peerjs.com/). El navegador del anfitrión hace de "servidor"; el servidor público gratuito de PeerJS solo se usa para que los dispositivos se encuentren.

### Funciones
- Editor de preguntas (2 a 4 opciones, tiempo por pregunta, reordenar, eliminar).
- Guardado automático en el navegador + importar/exportar en JSON.
- Sala con PIN y código QR, lista de jugadores (clic en un nombre para expulsarlo).
- Temporizador, conteo de respuestas, puntos por rapidez (500–1000 por acierto).
- Tabla de posiciones tras cada pregunta y podio final.
- Descarga de resultados en CSV.
- Reconexión automática si un jugador pierde la señal.

## Publicar en GitHub Pages

1. Crea un repositorio nuevo en GitHub (por ejemplo `quizarena`).
2. Sube estos archivos:
   ```bash
   git init
   git add .
   git commit -m "QuizArena"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/quizarena.git
   git push -u origin main
   ```
3. En GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch**, rama `main`, carpeta `/ (root)` → **Save**.
4. En 1–2 minutos tu juego estará en `https://TU_USUARIO.github.io/quizarena/`.

## Probar en local

Abre una terminal en la carpeta y ejecuta un servidor estático, por ejemplo:

```bash
python -m http.server 8000
```

Luego abre `http://localhost:8000/host.html` en una pestaña y `http://localhost:8000/play.html` en otra (o en tu celular usando la IP de tu PC).

## Formato JSON del cuestionario

```json
{
  "title": "Mi quiz",
  "questions": [
    { "text": "¿2 + 2?", "options": ["3", "4", "5", "6"], "correct": 1, "time": 20 }
  ]
}
```

`correct` es el índice (0 = A, 1 = B, 2 = C, 3 = D).

## Notas
- La pestaña del anfitrión debe quedar abierta durante todo el juego.
- Algunas redes muy restrictivas (escuelas/empresas) pueden bloquear WebRTC; en ese caso usa datos móviles o otra red.
