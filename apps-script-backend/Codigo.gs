// ============================================================
// CODIGO.GS — Backend como API JSON/JSONP para el dashboard
// ============================================================
// Este backend YA NO sirve una interfaz HTML propia (doGet con
// HtmlService). Ahora es una API a la que el frontend (alojado en
// GitHub Pages) llama mediante JSONP:
//
//   GET ?action=login&payload={"username":...,"password":...}&callback=xxx
//     -> xxx({ success: true, user, permisos }) | xxx({ success:false, error })
//
//   GET ?action=getStock&payload={"user":{...}}&callback=xxx
//     -> xxx({ success: true, fechaCierre, datos, permisos }) | xxx({ success:false, error })
//
// IMPORTANTE: se usa JSONP (respuesta envuelta en una función callback,
// cargada como <script src="...">) y NO fetch(), porque Apps Script Web
// Apps no añade las cabeceras CORS necesarias para que fetch() pueda
// LEER la respuesta desde un dominio externo — es una limitación
// conocida de Apps Script, no un fallo de configuración. Las etiquetas
// <script> no están sujetas a CORS, así que JSONP sí funciona de forma
// fiable. Ver la función doGet más abajo para el detalle.

// ─────────────────────────────────────────
// CONFIGURACIÓN GLOBAL
// ─────────────────────────────────────────
const CONFIG = {
  // Antes eran dos Google Sheets distintos (uno para usuarios y otro
  // para stock). Se unificaron en uno solo para evitar problemas de
  // permisos/acceso entre archivos: ahora "usuarios" es simplemente
  // otra pestaña dentro del mismo Sheets que tiene "informe".
  USERS_SPREADSHEET_ID: "1f_r6aBfx0MUPmPIfNaj71Ygt4acMw4W6sQLdl_dw5hQ",
  USERS_SHEET_NAME: "usuarios",
  STOCK_SPREADSHEET_ID: "1f_r6aBfx0MUPmPIfNaj71Ygt4acMw4W6sQLdl_dw5hQ",
  STOCK_SHEET_NAME: "informe",
  CACHE_EXPIRATION_SEC: 600
};

// ─────────────────────────────────────────
// ENRUTADORES PRINCIPALES
// ─────────────────────────────────────────

// GET: aquí es donde llega ahora la llamada real del frontend, vía
// JSONP (ver nota importante más abajo). Si no viene ?action=..., se
// devuelve un JSON de estado para comprobar rápido en el navegador que
// el backend está vivo.
//
// NOTA IMPORTANTE — POR QUÉ SE USA JSONP Y NO fetch():
// Al llamar a este Web App con fetch() desde un dominio externo (GitHub
// Pages), Google redirige internamente la petición (script.google.com
// -> script.googleusercontent.com), y esa redirección no añade las
// cabeceras CORS que el navegador necesita para PODER LEER la
// respuesta con fetch — pasa tanto en GET como en POST, es una
// limitación conocida y documentada de Apps Script Web Apps, no un
// fallo de configuración. Por eso el frontend (sitio-estatico/index.html
// y src/services/backend.ts) usa JSONP: carga la respuesta con una
// etiqueta <script src="...&callback=xxx">, que NO está sujeta a CORS
// (así es como funcionan también los <script src="cdn..."> de
// chart.js/lucide). Si viene el parámetro "callback", se envuelve la
// respuesta como "callback(JSON...)" con tipo MIME JavaScript en vez de
// JSON.
function doGet(e) {
  const params = (e && e.parameter) || {};
  const callback = params.callback;

  let resultObj;
  if (!params.action) {
    resultObj = {
      ok: true,
      servicio: 'Stock Salesland | Xiaomi API',
      uso: 'GET ?action=login|getStock&payload=<JSON codificado>&callback=<nombre de función JSONP>'
    };
  } else {
    resultObj = routeAction(params.action, params.payload);
  }

  return buildOutput(resultObj, callback);
}

// POST: se deja disponible por si en el futuro llamas a esta API desde
// un entorno sin las limitaciones de CORS del navegador (otro backend,
// Postman, Apps Script a Apps Script...). El frontend web ya NO usa
// esta vía.
function doPost(e) {
  let body;
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error('Petición vacía.');
    }
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return buildOutput({ success: false, error: 'Petición inválida (JSON mal formado): ' + err.message });
  }

  let resultObj;
  switch (body.action) {
    case 'login':
      resultObj = computeLogin(body);
      break;
    case 'getStock':
      resultObj = computeGetStock(body);
      break;
    default:
      resultObj = { success: false, error: 'Acción no reconocida: ' + body.action };
  }
  return buildOutput(resultObj);
}

// Enrutado compartido para las llamadas por GET (login/getStock), a
// partir del parámetro "payload" (JSON codificado en la URL).
function routeAction(action, payloadStr) {
  let payload = {};
  try {
    if (payloadStr) payload = JSON.parse(payloadStr);
  } catch (err) {
    return { success: false, error: 'Parámetro "payload" inválido (JSON mal formado): ' + err.message };
  }

  try {
    switch (action) {
      case 'login':
        return computeLogin(payload);
      case 'getStock':
        return computeGetStock(payload);
      default:
        return { success: false, error: 'Acción no reconocida: ' + action };
    }
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// Construye la respuesta final: JSONP (envuelta en la función callback)
// si se pidió, o JSON normal si no.
function buildOutput(obj, callback) {
  const json = JSON.stringify(obj);
  const isValidCallbackName = callback && /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(callback);

  if (isValidCallbackName) {
    return ContentService.createTextOutput(callback + '(' + json + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

// ─────────────────────────────────────────
// ACCIONES DE LA API (devuelven objetos planos, no respuestas HTTP —
// eso lo hace buildOutput, para poder envolver en JSONP o no)
// ─────────────────────────────────────────
function computeLogin(payload) {
  try {
    const user = loginUser(payload.username, payload.password);
    return { success: true, user: user, permisos: getPermissionsByRol(user.rol) };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function computeGetStock(payload) {
  try {
    if (!payload.user || !payload.user.usuario) {
      return { success: false, error: 'Sesión no válida. Vuelve a iniciar sesión.' };
    }
    const resultado = getStockDataSecure(payload.user);
    return {
      success: true,
      fechaCierre: resultado.fechaCierre,
      datos: resultado.datos,
      permisos: getPermissionsByRol(payload.user.rol)
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ─────────────────────────────────────────
// CACHÉ SEGMENTADO (chunks de 90KB)
// ─────────────────────────────────────────
const CacheHelper = {
  put: function(key, value, ttl) {
    try {
      const cache = CacheService.getScriptCache();
      const str = JSON.stringify(value);
      const size = 90 * 1024;
      const n = Math.ceil(str.length / size);
      cache.put(key + '_meta', JSON.stringify({ n: n }), ttl);
      for (let i = 0; i < n; i++) {
        cache.put(key + '_c' + i, str.substring(i * size, (i + 1) * size), ttl);
      }
    } catch(e) { Logger.log('CacheHelper.put error: ' + e); }
  },
  get: function(key) {
    try {
      const cache = CacheService.getScriptCache();
      const metaStr = cache.get(key + '_meta');
      if (!metaStr) return null;
      const { n } = JSON.parse(metaStr);
      let str = '';
      for (let i = 0; i < n; i++) {
        const c = cache.get(key + '_c' + i);
        if (c === null) return null;
        str += c;
      }
      return JSON.parse(str);
    } catch(e) { Logger.log('CacheHelper.get error: ' + e); return null; }
  }
};

// ─────────────────────────────────────────
// AUTENTICACIÓN
// ─────────────────────────────────────────
function loginUser(username, password) {
  if (!username || !password) throw new Error('Usuario y contraseña requeridos.');

  const ss = SpreadsheetApp.openById(CONFIG.USERS_SPREADSHEET_ID);
  const sheet = ss.getSheets().find(s =>
    s.getName().toLowerCase() === CONFIG.USERS_SHEET_NAME.toLowerCase()
  );
  if (!sheet) throw new Error('Hoja de usuarios no encontrada.');

  const data = sheet.getDataRange().getValues();
  if (data.length < 2) throw new Error('No hay usuarios registrados.');

  // Columnas: C=2 usuario, D=3 contraseña, E=4 rol, F-J=5-9 centros, K=10 tienda, N=13 región
  const IDX = { user: 2, pass: 3, rol: 4, centStart: 5, centEnd: 9, tienda: 10, region: 13 };

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[IDX.user]) continue;
    const rowUser = row[IDX.user].toString().trim().toLowerCase();
    if (rowUser !== username.trim().toLowerCase()) continue;

    if (row[IDX.pass].toString().trim() !== password.trim()) {
      throw new Error('Contraseña incorrecta.');
    }

    const centros = [];
    for (let c = IDX.centStart; c <= IDX.centEnd; c++) {
      if (row[c]) centros.push(row[c].toString().trim());
    }

    // Registrar último acceso si hay columna O (índice 14)
    try {
      if (sheet.getLastColumn() >= 15) {
        sheet.getRange(i + 1, 15).setValue(
          Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm:ss')
        );
      }
    } catch(e) {}

    return {
      usuario: row[IDX.user].toString().trim(),
      nombre:  row[IDX.user].toString().split('@')[0],
      rol:     (row[IDX.rol] || 'Promotor').toString().trim(),
      region:  (row[IDX.region] || 'N/D').toString().trim(),
      centros: centros,
      tienda:  (row[IDX.tienda] || 'N/D').toString().trim()
    };
  }
  throw new Error('Usuario no encontrado.');
}

// ─────────────────────────────────────────
// PERMISOS POR ROL
// ─────────────────────────────────────────
const PERMISOS = {
  Manager: {
    allowedFilters: ['Familia','SubFamilia','Modelo','Region','Zona','PR','StoreName']
  },
  // "am" (Account Manager) y "administradora" tienen el mismo nivel de
  // acceso completo que Manager — son roles de gestión/corporativos.
  am: {
    allowedFilters: ['Familia','SubFamilia','Modelo','Region','Zona','PR','StoreName']
  },
  administradora: {
    allowedFilters: ['Familia','SubFamilia','Modelo','Region','Zona','PR','StoreName']
  },
  GPV: {
    allowedFilters: ['Familia','SubFamilia','Modelo','Zona','PR','StoreName']
  },
  Promotor: {
    allowedFilters: ['Familia','SubFamilia','Modelo']
  }
};

function getPermissionsByRol(rol) {
  // Comparación insensible a mayúsculas/minúsculas: en la hoja de
  // usuarios los roles pueden estar escritos como "am", "AM", "Am"...
  const key = Object.keys(PERMISOS).find(
    (k) => k.toLowerCase() === (rol || '').toString().trim().toLowerCase()
  );
  return key ? PERMISOS[key] : { allowedFilters: ['Familia','SubFamilia','Modelo'] };
}

// ─────────────────────────────────────────
// DATOS DE STOCK (con caché y seguridad)
// ─────────────────────────────────────────
function getStockDataSecure(user) {
  if (!user || !user.rol) throw new Error('Sesión no válida.');

  const raw = getRawStockData();
  let datos = raw.datos;
  const rolNormalizado = user.rol.toString().trim().toLowerCase();

  if (rolNormalizado === 'gpv') {
    const region = (user.region || '').toLowerCase();
    const centros = (user.centros || []).map(c => c.toLowerCase());
    datos = datos.filter(r =>
      r.Region.toLowerCase() === region &&
      (centros.includes('todos') || centros.includes(r.StoreName.toLowerCase()) || centros.includes(r.PR.toLowerCase()))
    );
  } else if (rolNormalizado === 'promotor') {
    const tienda = (user.tienda || '').toLowerCase();
    datos = datos.filter(r => r.StoreName.toLowerCase() === tienda);
  }
  // Cualquier otro rol (Manager, am, administradora...) ve todo el
  // stock sin restricción, igual que antes.

  return { fechaCierre: raw.fechaCierre, datos: datos };
}

function getRawStockData() {
  const cached = CacheHelper.get('STOCK_RAW');
  if (cached) return cached;

  const ss = SpreadsheetApp.openById(CONFIG.STOCK_SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.STOCK_SHEET_NAME);
  if (!sheet) throw new Error("Hoja 'informe' no encontrada.");

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { fechaCierre: 'N/D', datos: [] };

  // Fecha de cierre en columna L (índice 11) de la primera fila de datos
  let fechaCierre = 'N/D';
  const rawFecha = data[1][11];
  if (rawFecha instanceof Date) {
    fechaCierre = Utilities.formatDate(rawFecha, Session.getScriptTimeZone(), 'dd/MM/yyyy');
  } else if (rawFecha) {
    fechaCierre = rawFecha.toString().trim();
  }

  // Índices de columnas en la hoja informe
  const IDX = {
    modelo: 5,       // F
    cantidad: 15,    // P
    localizacion: 16,// Q
    region: 20,      // U
    segGfk: 22,      // W
    familia: 24,     // Y
    subFamilia: 25,  // Z
    storeName: 26,   // AA
    pr: 27,          // AB
    zona: 28         // AC
  };

  const datos = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[IDX.storeName] && !row[IDX.modelo]) continue;

    const loc = parseInt(row[IDX.localizacion], 10);
    const cant = parseInt(row[IDX.cantidad], 10);

    datos.push({
      StoreName:   (row[IDX.storeName] || 'N/D').toString().trim(),
      Region:      (row[IDX.region] || 'N/D').toString().trim(),
      Zona:        (row[IDX.zona] || 'N/D').toString().trim(),
      Familia:     (row[IDX.familia] || 'N/D').toString().trim(),
      SubFamilia:  (row[IDX.subFamilia] || 'N/D').toString().trim(),
      Modelo:      (row[IDX.modelo] || 'N/D').toString().trim(),
      PR:          (row[IDX.pr] || '0').toString().trim(),
      Localizacion: isNaN(loc) ? 0 : loc,
      Cantidad:    isNaN(cant) ? 0 : cant,
      SegmentoGFK: (row[IDX.segGfk] || 'N/A').toString().trim()
    });
  }

  const result = { fechaCierre: fechaCierre, datos: datos };
  CacheHelper.put('STOCK_RAW', result, CONFIG.CACHE_EXPIRATION_SEC);
  return result;
}
