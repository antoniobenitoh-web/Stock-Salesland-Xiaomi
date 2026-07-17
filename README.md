# Gestión de Stock Xiaomi — Salesland

App web (React + Vite) que se puede instalar como aplicación (PWA) en
móvil/escritorio, con una URL propia de GitHub Pages — **sin depender de
una URL de script.google.com**.

## 🐞 Fallos encontrados y corregidos en este ZIP

1. **El build no compilaba en absoluto.** `src/googleDrive.ts` importa
   `../firebase-applet-config.json`, un archivo que no estaba en el
   repositorio. Cualquier `npm run build` fallaba inmediatamente con
   `Could not resolve "../firebase-applet-config.json"`. He creado ese
   archivo con valores de ejemplo (ver sección "Función de Google Drive"
   más abajo).

2. **El workflow de despliegue estaba en la carpeta equivocada.**
   Estaba en `.github/deploy.yml`. GitHub **solo** ejecuta workflows que
   están dentro de `.github/workflows/`, así que ese archivo nunca se
   había ejecutado ni una sola vez. Lo he movido a
   `.github/workflows/deploy.yml`.

3. **Faltaba el `base` de Vite para GitHub Pages.** Sin `base:
   '/Stock-Salesland-Xiaomi/'`, todos los `.js`/`.css` se habrían pedido
   desde la raíz del dominio (`antoniobenitoh-web.github.io/`) en lugar
   de `antoniobenitoh-web.github.io/Stock-Salesland-Xiaomi/`, y la página
   habría cargado en blanco.

4. **No era instalable como app.** He añadido `vite-plugin-pwa`, un
   `manifest.webmanifest` autogenerado, un service worker, e iconos
   (`public/icon-192.png`, `icon-512.png`, `apple-touch-icon.png`,
   `favicon.png`) para que el navegador ofrezca "Instalar app" /
   "Añadir a pantalla de inicio".

He verificado que `npm run build` termina sin errores con estos cambios.

## ⚠️ Algo importante que debes saber antes de usarla en producción

El dashboard principal (`src/App.tsx`) **funciona hoy con datos de
ejemplo** (`src/data.ts`: productos, tiendas y usuarios inventados) y un
login que compara contra esos usuarios de ejemplo (todos con contraseña
`123`). No está conectado a tus Google Sheets reales.

Además, hay un segundo sistema de login sin usar por ningún lado
(`src/Login/Login.jsx` + `context/AuthContext.jsx`): ese sí intenta
llamar a una URL de Apps Script (`VITE_GAS_URL` en `.env`) por `POST`
con `{ action: 'login', ... }`, pero:
- Nadie lo importa (`main.tsx` renderiza `App.tsx` directamente, no pasa
  por `Login`), así que ahora mismo es código muerto.
- El backend de Apps Script que preparé la vez anterior (`Codigo.gs`) es
  un `HtmlService` que se llama con `google.script.run`, **no** un
  `doPost` que devuelva JSON — no es compatible con lo que este
  `AuthContext.jsx` espera. Son dos arquitecturas distintas que no se
  han conectado entre sí todavía.

**Esto significa que, tal cual está en este ZIP, la app es una demo
visual completa y ya instalable como PWA, pero no lee ni escribe tu
inventario real.** Si quieres que el dashboard use tus Google Sheets
reales de verdad (login real de usuarios/roles + stock real), dímelo y
conecto `App.tsx` a un backend de Apps Script tipo API (`doPost`/`doGet`
devolviendo JSON) en el próximo paso — es un cambio bien delimitado.

## 🚀 Cómo publicarlo (GitHub Pages, gratis, con URL propia)

1. Descomprime este ZIP y sustituye el contenido de tu repositorio
   `Stock-Salesland-Xiaomi` por estos archivos (o simplemente haz commit
   de estos cambios encima de tu repo actual).
2. Sube los cambios a la rama `main`:
   ```bash
   git add .
   git commit -m "Fix build, PWA y despliegue en GitHub Pages"
   git push origin main
   ```
3. En GitHub: **Settings → Pages → Build and deployment → Source** →
   selecciona **"GitHub Actions"** (no "Deploy from a branch").
4. Ve a la pestaña **Actions** de tu repo: en unos ~30-60 segundos verás
   el workflow "Deploy to GitHub Pages" en verde ✅.
5. Tu URL final será:
   ```
   https://antoniobenitoh-web.github.io/Stock-Salesland-Xiaomi/
   ```
   Esa es la URL que reemplaza a la de `script.google.com`.

### Instalar como "app" en el móvil/escritorio

- **Android (Chrome):** al abrir la URL aparecerá un aviso o el menú
  ⋮ → **"Instalar aplicación"**.
- **iPhone (Safari):** botón compartir → **"Añadir a pantalla de
  inicio"**.
- **Escritorio (Chrome/Edge):** icono de instalación en la barra de
  direcciones (a la derecha de la URL).

Una vez instalada, abre en su propia ventana, con icono propio, sin
barra de navegador — como cualquier app nativa.

## 🧪 Probarlo en local antes de subir

```bash
npm install
npm run dev       # http://localhost:3000
npm run build     # genera ./dist — comprueba que termina sin errores
npm run preview   # sirve ./dist tal como quedaría en producción
```

## 🔌 Función de "Importar desde Google Drive"

El botón que usa Firebase/Google Sign-In para listar tus Google Sheets
necesita un proyecto de Firebase real. He dejado
`firebase-applet-config.json` con valores de ejemplo **solo para que el
build no falle**; con esos valores de ejemplo el botón mostrará un error
al pulsarlo, pero el resto de la app (dashboard, filtros, importar Excel
local) funciona con normalidad.

Para activarlo de verdad:
1. Crea un proyecto en https://console.firebase.google.com
2. Activa **Authentication → Google** como proveedor.
3. Copia la config del SDK web (Configuración del proyecto → tus apps →
   config) y sustitúyela en `firebase-applet-config.json`.
4. En Google Cloud Console, habilita la **Google Drive API** y la
   **Google Sheets API** para ese mismo proyecto.

Si no vas a usar esta función, también puedo quitarla del dashboard para
aligerar la app — dímelo y la elimino en el próximo ajuste.

## 📦 Nota sobre el tamaño del bundle

El build avisa de que el JS pesa ~775 KB (226 KB comprimido). Funciona
igualmente, pero si quieres optimizarlo más adelante se puede dividir en
partes más pequeñas con `import()` dinámico — no es necesario para que
funcione, es solo una mejora de velocidad de carga futura.
