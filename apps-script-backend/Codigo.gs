// ============================================================
// CODIGO.GS — Backend como API JSON para el frontend React (Vite)
// ============================================================
// Este backend YA NO sirve una interfaz HTML propia (doGet con
// HtmlService). Ahora es una API que el frontend alojado en GitHub
// Pages llama por fetch() con POST, en formato JSON:
//
//   POST { action: "login", username, password }
//     -> { success: true, user, permisos } | { success:false, error }
//
//   POST { action: "getStock", user }
//     -> { success: true, fechaCierre, datos, permisos } | { success:false, error }
//
// IMPORTANTE sobre CORS: el frontend hace fetch(GAS_URL, { method:'POST',
// body: JSON.stringify(...) }) SIN fijar cabecera Content-Type. Eso hace
// que el navegador la mande como "text/plain", lo cual evita el preflight
// OPTIONS que Apps Script no sabe responder. No cambies eso en el
// frontend o se romperá la conexión.

// ─────────────────────────────────────────
// CONFIGURACIÓN GLOBAL
// ─────────────────────────────────────────
const CONFIG = {
  USERS_SPREADSHEET_ID: "1HgC4qVTZYbD17pQSiunxptck4C_VIv3_8DCgrYAfAGw",
  USERS_SHEET_NAME: "usuarios",
  STOCK_SPREADSHEET_ID: "1f_r6aBfx0MUPmPIfNaj71Ygt4acMw4W6sQLdl_dw5hQ",
  STOCK_SHEET_NAME: "informe",
  CACHE_EXPIRATION_SEC: 600
};

// ─────────────────────────────────────────
// ENRUTADORES PRINCIPALES
// ─────────────────────────────────────────

// GET: solo para comprobar rápidamente en el navegador que el backend
// está vivo (abrir la URL /exec directamente). No sirve HTML de verdad.
function doGet() {
  return jsonResponse({
    ok: true,
    servicio: 'Stock Salesland | Xiaomi API',
    uso: 'Este endpoint espera peticiones POST con { action, ... } en el cuerpo.'
  });
}

// POST: aquí llega todo lo que hace el frontend (login y datos de stock).
function doPost(e) {
  let body;
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error('Petición vacía.');
    }
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonResponse({ success: false, error: 'Petición inválida (JSON mal formado): ' + err.message });
  }

  try {
    switch (body.action) {
      case 'login':
        return handleLoginAction(body);
      case 'getStock':
        return handleGetStockAction(body);
      default:
        return jsonResponse({ success: false, error: 'Acción no reconocida: ' + body.action });
    }
  } catch (err) {
    return jsonResponse({ success: false, error: err.message });
  }
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ─────────────────────────────────────────
// ACCIONES DE LA API
// ─────────────────────────────────────────
function handleLoginAction(body) {
  try {
    const user = loginUser(body.username, body.password);
    return jsonResponse({ success: true, user: user, permisos: getPermissionsByRol(user.rol) });
  } catch (e) {
    return jsonResponse({ success: false, error: e.message });
  }
}

function handleGetStockAction(body) {
  try {
    if (!body.user || !body.user.usuario) {
      return jsonResponse({ success: false, error: 'Sesión no válida. Vuelve a iniciar sesión.' });
    }
    const resultado = getStockDataSecure(body.user);
    return jsonResponse({
      success: true,
      fechaCierre: resultado.fechaCierre,
      datos: resultado.datos,
      permisos: getPermissionsByRol(body.user.rol)
    });
  } catch (e) {
    return jsonResponse({ success: false, error: e.message });
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
  GPV: {
    allowedFilters: ['Familia','SubFamilia','Modelo','Zona','PR','StoreName']
  },
  Promotor: {
    allowedFilters: ['Familia','SubFamilia','Modelo']
  }
};

function getPermissionsByRol(rol) {
  return PERMISOS[rol] || { allowedFilters: ['Familia','SubFamilia','Modelo'] };
}

// ─────────────────────────────────────────
// DATOS DE STOCK (con caché y seguridad)
// ─────────────────────────────────────────
function getStockDataSecure(user) {
  if (!user || !user.rol) throw new Error('Sesión no válida.');

  const raw = getRawStockData();
  let datos = raw.datos;

  if (user.rol === 'GPV') {
    const region = (user.region || '').toLowerCase();
    const centros = (user.centros || []).map(c => c.toLowerCase());
    datos = datos.filter(r =>
      r.Region.toLowerCase() === region &&
      (centros.includes('todos') || centros.includes(r.StoreName.toLowerCase()) || centros.includes(r.PR.toLowerCase()))
    );
  } else if (user.rol === 'Promotor') {
    const tienda = (user.tienda || '').toLowerCase();
    datos = datos.filter(r => r.StoreName.toLowerCase() === tienda);
  }

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
