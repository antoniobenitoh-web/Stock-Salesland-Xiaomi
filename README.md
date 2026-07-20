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

## 🔄 Cambio de arquitectura: ahora se despliega tu diseño original

A partir de aquí, **lo que se publica en GitHub Pages ya no es la app de
React** (`src/App.tsx`) — es tu dashboard original en HTML/CSS/JS puro
(el que me pasaste), ahora en la carpeta **`sitio-estatico/`**, con:

- El mismo diseño, filtros, menús, pestañas y tablas exactamente como
  los tenías.
- Login añadido (antes no tenía), conectado a tu backend real de Apps
  Script (`action=login`).
- Carga de stock real conectada a tu backend (`action=getStock`), con
  el mismo filtrado por rol (Manager/GPV/Promotor) de siempre.
- Sesión guardada en `sessionStorage` + botón "Cerrar sesión".
- Ocultación automática de los filtros que el rol no tiene permitido.
- PWA instalable: `manifest.json` + `sw.js` (service worker) + iconos,
  todo dentro de `sitio-estatico/`.

**Como es HTML/CSS/JS puro, no hay build.** El workflow de GitHub
Actions (`.github/workflows/deploy.yml`) ya no ejecuta `npm run build`
— simplemente publica el contenido de `sitio-estatico/` tal cual. Esto
hace el despliegue más simple y rápido que con React/Vite.

El proyecto de React (`src/`, `package.json`, etc.) se queda en el repo
sin usarse, por si en algún momento quieres retomarlo o comparar — no
se ha borrado nada, pero **ya no es lo que se publica**.

### Un solo cambio manual que tienes que hacer

Dentro de `sitio-estatico/index.html`, busca esta línea (cerca del
principio del `<script>` principal):

```js
const GAS_URL = "https://script.google.com/macros/s/AKfycbzaqOwhPQJ6tFeHHKxo4dRcUkV8etdkSB_0GPBnW6Px6cMYBdJVunq8ERRapApoIrMN-g/exec";
```

Está puesta con la URL que me diste antes. Si tu URL de despliegue de
Apps Script cambia en el futuro (por ejemplo, si algún día creas una
implementación nueva en vez de una "nueva versión" de la existente),
solo tienes que actualizar esa línea.

### Publicarlo

Es exactamente el mismo proceso de antes (`git add . && git commit &&
git push`, Pages con origen "GitHub Actions"), solo que ahora el build
es casi instantáneo porque no hay que compilar nada.

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
- **CORS — la causa real y la solución definitiva (JSONP):** las
  llamadas `fetch()` a Apps Script desde un dominio externo (GitHub
  Pages) fallan por CORS **tanto en GET como en POST** — no es un fallo
  de configuración, es una limitación conocida y documentada de Apps
  Script Web Apps: la respuesta real se sirve a través de una
  redirección interna (`script.google.com` → `script.googleusercontent.com`)
  que no incluye las cabeceras `Access-Control-Allow-Origin` que el
  navegador necesita para que `fetch()`/`XMLHttpRequest` puedan **leer**
  la respuesta. Por eso tanto `sitio-estatico/index.html` como
  `src/services/backend.ts` usan **JSONP** en vez de `fetch()`: cargan
  la respuesta como una etiqueta `<script src="...">` (con un parámetro
  `callback=nombreDeFuncion`), y las etiquetas `<script>` **no están
  sujetas a CORS** (es la misma razón por la que un `<script
  src="https://cdn...">` de otra web funciona sin problemas). El
  backend (`apps-script-backend/Codigo.gs`) reconoce el parámetro
  `callback` y envuelve la respuesta como `callback(JSON...)` con tipo
  MIME JavaScript en vez de JSON. Si en algún momento ves un error
  distinto a "Failed to fetch"/CORS relacionado con la conexión,
  probablemente ya no sea este problema.
- **Sobre "Ejecutar como" en la implementación de Apps Script:** debe
  estar en **"Yo"** (tu cuenta), no en "El usuario que accede a la
  aplicación". Esto NO significa que cada persona tenga que autorizar
  nada ni ver tus Sheets — significa que el script usa tus permisos de
  forma invisible para leer las hojas, y cualquiera puede usar la app
  con solo su usuario/contraseña del login. Si dejas "el usuario que
  accede", Apps Script exige una sesión de Google válida en cada
  petición y responde `401 Unauthorized` antes de llegar a tu código.
- El login y el stock de ejemplo (`src/data.ts`) se quedan como
  *fallback* solo mientras no has iniciado sesión (pantalla de login) o
  si pulsas "Restablecer a plantilla" — no se borran, por si quieres
  usarlos para hacer una demo sin tocar datos reales.
- **Service worker y versiones "pegadas":** el `sw.js` cachea el sitio
  para que sea instalable y rápido. El HTML/JS del propio sitio usa
  ahora estrategia "red primero" (siempre intenta la versión más
  reciente del servidor, y solo cae a la copia en caché si no hay
  conexión), así que las actualizaciones se ven de inmediato. Aun así,
  **cada vez que hagas un cambio importante en `sitio-estatico/`, sube
  en uno el número `CACHE_VERSION` al principio de `sitio-estatico/sw.js`**
  (`v2` → `v3`, etc.) — eso fuerza a los navegadores que ya tenían la
  app instalada a refrescar del todo. Si alguna vez un cambio no se ve
  reflejado en el navegador, la solución rápida es, en la Consola del
  navegador:
  ```js
  navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister()));
  caches.keys().then(keys => keys.forEach(k => caches.delete(k)));
  ```
  y recargar con Cmd+Shift+R (Mac) / Ctrl+Shift+R (Windows).

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
