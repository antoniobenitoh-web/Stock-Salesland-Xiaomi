/// <reference types="vite/client" />
import { AlmacenType, Product, StockRecord, UserProfile } from '../types';

// URL del Web App de Apps Script (backend real). Se define en .env como
// VITE_GAS_URL. Si no está configurada, todas las funciones de aquí
// devuelven un error claro en vez de fallar de forma silenciosa.
const GAS_URL = import.meta.env.VITE_GAS_URL as string | undefined;

export interface BackendUser {
  usuario: string;
  nombre: string;
  rol: string;
  region: string;
  centros: string[];
  tienda: string;
}

interface RawStockRow {
  StoreName: string;
  Region: string;
  Zona: string;
  Familia: string;
  SubFamilia: string;
  Modelo: string;
  PR: string;
  Localizacion: number;
  Cantidad: number;
  SegmentoGFK: string;
}

interface LoginResponse {
  success: boolean;
  user?: BackendUser;
  permisos?: { allowedFilters: string[] };
  error?: string;
}

interface StockResponse {
  success: boolean;
  fechaCierre?: string;
  datos?: RawStockRow[];
  permisos?: { allowedFilters: string[] };
  error?: string;
}

// Llamada al backend por JSONP (NO por fetch). Apps Script Web Apps no
// añade las cabeceras CORS que fetch() necesita para LEER la respuesta
// desde un dominio externo (GitHub Pages) — es una limitación conocida
// de Apps Script, no un problema de configuración. Las etiquetas
// <script> no están sujetas a CORS, así que cargamos la respuesta como
// un <script> que ejecuta una función de callback definida por
// nosotros, y esa función resuelve la promesa con los datos.
let jsonpCounter = 0;
function callBackend<T>(action: string, payload: Record<string, unknown>): Promise<T> {
  if (!GAS_URL) {
    return Promise.resolve({ success: false, error: 'VITE_GAS_URL no está configurada (revisa el archivo .env).' } as unknown as T);
  }
  return new Promise((resolve) => {
    const callbackName = `slCallback_${Date.now()}_${jsonpCounter++}`;
    const script = document.createElement('script');
    let timeoutId: ReturnType<typeof setTimeout>;

    const cleanup = () => {
      delete (window as any)[callbackName];
      if (script.parentNode) script.parentNode.removeChild(script);
      clearTimeout(timeoutId);
    };

    (window as any)[callbackName] = (data: T) => {
      cleanup();
      resolve(data);
    };

    script.onerror = () => {
      cleanup();
      resolve({ success: false, error: 'No se pudo conectar con el backend (revisa VITE_GAS_URL o tu conexión).' } as unknown as T);
    };

    // "getStock" tiene que recorrer toda la hoja "informe" la primera
    // vez (hasta que entra la caché de 10 min), así que le damos más
    // margen que a "login" (que es casi instantáneo).
    const timeoutMs = action === 'getStock' ? 45000 : 20000;
    timeoutId = setTimeout(() => {
      cleanup();
      resolve({ success: false, error: 'Tiempo de espera agotado conectando con el backend.' } as unknown as T);
    }, timeoutMs);

    const url = `${GAS_URL}?action=${encodeURIComponent(action)}&payload=${encodeURIComponent(JSON.stringify(payload))}&callback=${callbackName}`;
    script.src = url;
    document.body.appendChild(script);
  });
}

export async function loginReal(username: string, password: string): Promise<LoginResponse> {
  return callBackend<LoginResponse>('login', { username, password });
}

export async function fetchStockReal(user: BackendUser): Promise<StockResponse> {
  return callBackend<StockResponse>('getStock', { user });
}

// Traduce el rol tal como viene de la hoja de "usuarios" (Manager/GPV/Promotor)
// al literal exacto que usa el resto del dashboard (mismas mayúsculas que
// ya usa App.tsx: 'Manager' | 'GPV' | 'promotor').
export function mapBackendUserToProfile(backendUser: BackendUser): UserProfile {
  const rol = (backendUser.rol || '').trim();
  let role: UserProfile['role'];
  if (rol.toLowerCase() === 'promotor') {
    role = 'promotor';
  } else if (rol.toUpperCase() === 'GPV') {
    role = 'GPV';
  } else {
    // Manager, o cualquier rol no reconocido: mismo criterio que ya
    // aplica el propio backend (getStockDataSecure), que solo filtra
    // explícitamente para GPV y Promotor y deja acceso total al resto.
    role = 'Manager';
  }

  return {
    username: backendUser.usuario,
    name: backendUser.nombre,
    role,
    region: backendUser.region && backendUser.region !== 'N/D' ? backendUser.region : null,
    center: backendUser.tienda && backendUser.tienda !== 'N/D' ? backendUser.tienda : null,
  };
}

const ALMACEN_MAP: Record<string, AlmacenType> = {
  '6': 'Tienda',
  '19': 'Tránsito',
  '2': 'Crossdock',
  '5': 'Exposición',
};

function mapSegmentoGfkToProductSegment(seg: string): Product['segment'] {
  const s = (seg || '').trim().toLowerCase();
  if (s === 'premium') return 'Segmento Premium';
  if (s === 'c') return 'Segmento C';
  if (s === 'b') return 'Segmento B';
  return 'Otros Segmentos';
}

/**
 * Agrupa las filas "planas" que vienen de la hoja "informe" (una fila por
 * modelo+tienda+almacén) en la forma que espera el dashboard: un
 * StockRecord por combinación tienda+tipo de almacén, con un mapa de
 * stock por modelo dentro.
 *
 * Nota: el campo "dos" (days of stock) no existe como tal en la hoja de
 * origen, así que se deja a 0 para todos los modelos. Si en el futuro
 * añades esa métrica a la hoja "informe", solo hay que rellenar aquí
 * record.dos[row.Modelo] con el valor real en vez de 0.
 */
export function transformRawStock(datos: RawStockRow[]): { stockRecords: StockRecord[]; products: Product[] } {
  const productSegmentMap = new Map<string, Product['segment']>();
  const groups = new Map<string, StockRecord>();

  datos.forEach((row) => {
    const almacenType = ALMACEN_MAP[String(row.Localizacion)] || 'Tienda';
    const key = `${row.StoreName}__${almacenType}`;

    if (!groups.has(key)) {
      groups.set(key, {
        storeCode: row.PR || row.StoreName,
        storeName: row.StoreName,
        pr: parseInt(row.PR, 10) || 0,
        region: row.Region,
        zone: row.Zona,
        almacenType,
        stocks: {},
        dos: {},
        totalStock: 0,
      });
    }

    const record = groups.get(key)!;
    record.stocks[row.Modelo] = (record.stocks[row.Modelo] || 0) + row.Cantidad;
    record.dos[row.Modelo] = 0;
    record.totalStock += row.Cantidad;

    if (!productSegmentMap.has(row.Modelo)) {
      productSegmentMap.set(row.Modelo, mapSegmentoGfkToProductSegment(row.SegmentoGFK));
    }
  });

  const products: Product[] = Array.from(productSegmentMap.entries()).map(([name, segment]) => ({
    name,
    segment,
    price: 0, // la hoja de origen no trae precio; no se usa para el cálculo de stock
  }));

  return { stockRecords: Array.from(groups.values()), products };
}
