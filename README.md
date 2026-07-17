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

## ✅ Ya conectado a Google Sheets real (login + stock reales)

`App.tsx` ya no usa el login ni el stock de ejemplo por defecto: al
enviar el formulario de login llama de verdad a tu hoja de `usuarios`, y
tras entrar descarga tu stock real de la hoja `informe` y sustituye los
datos de ejemplo en pantalla. Esto se hace a través de dos piezas
nuevas:

### 1. `apps-script-backend/Codigo.gs` — backend como API JSON

Ya no es un `HtmlService` (no sirve una página HTML propia). Ahora es
una API que responde a peticiones `POST`:

- `{ action: "login", username, password }` → valida contra tu hoja
  `usuarios` y devuelve `{ success, user, permisos }`.
- `{ action: "getStock", user }` → devuelve `{ success, fechaCierre,
  datos, permisos }` ya filtrado por el rol de ese usuario (Manager ve
  todo, GPV solo su región, Promotor solo su tienda — igual que antes).

**Tienes que volver a desplegar este backend** en tu proyecto de Apps
Script (es un cambio de código en el servidor, no solo en GitHub):

1. Abre tu proyecto en https://script.google.com
2. Sustituye el contenido de tu archivo `.gs` por
   `apps-script-backend/Codigo.gs`.
3. En "Configuración del proyecto → appsscript.json visible", sustituye
   su contenido por `apps-script-backend/appsscript.json`.
4. **Implementar → Gestionar implementaciones** → pulsa el lápiz ✏️ de tu
   implementación web existente → en "Versión" elige **Nueva versión** →
   **Implementar**.
   - Importante: usa **"Nueva versión" de la implementación existente**,
     no crees una implementación nueva desde cero — así conservas la
     misma URL `/exec` y no hace falta tocar `VITE_GAS_URL` en `.env`.
5. Comprueba que funciona abriendo la URL `/exec` directamente en el
   navegador: debería devolver un JSON tipo `{"ok":true,"servicio":"Stock
   Salesland | Xiaomi API",...}` en vez de un error o una página en
   blanco.

### 2. `src/services/backend.ts` — el frontend habla con esa API

Nuevo archivo con tres funciones:
- `loginReal(username, password)` — llama a `action: "login"`.
- `fetchStockReal(user)` — llama a `action: "getStock"`.
- `transformRawStock(datos)` — convierte las filas "planas" que vienen
  de tu hoja `informe` (una fila por modelo+tienda+almacén) en la
  estructura agrupada que ya usaba el dashboard (`StockRecord[]`, con un
  mapa de stock por modelo dentro de cada tienda+almacén).

`App.tsx` ahora usa estas funciones en `handleLogin` (login real) y en
una nueva función `loadRealDataFromBackend` (stock real), reutilizando
el mismo mecanismo de guardado en `localStorage` y el mismo badge verde
que ya existía para la importación manual de Excel — por eso, tras
iniciar sesión, verás algo como *"Datos de Stock actualizados desde
Google Sheets: Google Sheets · cierre dd/mm/yyyy"*.

### Limitaciones a tener en cuenta

- **`dos` (days of stock):** tu hoja `informe` no trae esa métrica, así
  que se rellena a `0` para todos los modelos. Si en el futuro añades esa
  columna a la hoja, solo hay que editar `transformRawStock` en
  `src/services/backend.ts` para leerla en vez de poner `0`.
- **`price` (precio):** tampoco viene en la hoja `informe`, se deja a
  `0`. Si tienes un precio de referencia en otra hoja, dímelo y lo
  incorporamos.
- **CORS:** el `fetch` a Apps Script se hace sin fijar `Content-Type`,
  a propósito — así el navegador lo manda como `text/plain` y evita el
  *preflight* `OPTIONS`, que Apps Script no sabe responder. No añadas
  cabeceras a esa llamada o se romperá la conexión.
- El login y el stock de ejemplo (`src/data.ts`) se quedan como
  *fallback* solo mientras no has iniciado sesión (pantalla de login) o
  si pulsas "Restablecer a plantilla" — no se borran, por si quieres
  usarlos para hacer una demo sin tocar datos reales.
- El segundo sistema de login que existía sin usar (`src/Login/Login.jsx`
  + `context/AuthContext.jsx`) sigue ahí sin usarse — es código muerto
  heredado, no le des importancia; toda la lógica real vive ahora en
  `App.tsx` + `src/services/backend.ts`.

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
