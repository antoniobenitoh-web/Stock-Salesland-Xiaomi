export type AlmacenType = 'Tienda' | 'Tránsito' | 'Crossdock' | 'Exposición';

export interface Product {
  name: string;
  segment: 'Segmento Premium' | 'Segmento C' | 'Segmento B' | 'Otros Segmentos';
  price: number;
}

export interface StockRecord {
  storeCode: string;
  storeName: string;
  pr: number;
  region: string;
  zone: string;
  almacenType: AlmacenType;
  stocks: { [productName: string]: number };
  dos: { [productName: string]: number };
  totalStock: number;
  totalStockKM?: number;
}

export interface UserProfile {
  name: string;
  username: string;
  role: 'administradora' | 'am' | 'GPV' | 'promotor' | 'Manager';
  region: string | null; // null if Manager/Admin (access to all)
  center: string | null;
  password?: string;
}

export interface PromoterSchedule {
  usuario: string;
  turno: string;
  fecha: string; // YYYY-MM-DD
  diaNombre: string;
  semanaNum: string;
  semanaRango: string;
  horario: string;
  horasTotales: number;
  mes: string;
  centro: string;
}
