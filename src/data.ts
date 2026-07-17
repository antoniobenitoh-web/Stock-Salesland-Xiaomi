import { Product, StockRecord, UserProfile, PromoterSchedule } from './types';

export const products: Product[] = [
  { name: 'Xiaomi 17 Ultra 16+512GB', segment: 'Segmento Premium', price: 1249 },
  { name: 'Xiaomi 17 12+512GB', segment: 'Segmento Premium', price: 799 },
  { name: 'Xiaomi 15 Ultra 16+512GB', segment: 'Segmento Premium', price: 1199 },
  { name: 'Xiaomi 15 12+512GB', segment: 'Segmento Premium', price: 799 },
  { name: 'Xiaomi 17T Pro 12+1TB', segment: 'Segmento Premium', price: 849 },
  { name: 'Xiaomi 17T Pro 12+512GB', segment: 'Segmento Premium', price: 749 },
  { name: 'Xiaomi 17T 12+256GB', segment: 'Segmento Premium', price: 599 },
  { name: 'Xiaomi 15T 12+256GB', segment: 'Segmento Premium', price: 499 },
  { name: 'Xiaomi 15T Pro 12+512GB', segment: 'Segmento Premium', price: 799 },
  { name: 'Xiaomi 15T Pro 12+1TB', segment: 'Segmento Premium', price: 899 },
  { name: 'Xiaomi 14T 12+256GB', segment: 'Segmento Premium', price: 359 },
  { name: 'Xiaomi 14T Pro 12+512GB', segment: 'Segmento Premium', price: 599 },
  { name: 'Xiaomi 14T Pro 12+1TB', segment: 'Segmento Premium', price: 699 },
  { name: 'Xiaomi 14 12+512GB', segment: 'Segmento Premium', price: 449 },
  { name: 'Xiaomi 14 Ultra 16+512GB', segment: 'Segmento Premium', price: 1249 },
  { name: 'Redmi Note 15 Pro+ 5G 12+512GB', segment: 'Segmento C', price: 429 },
  { name: 'Redmi Note 15 Pro+ 5G 8+256GB', segment: 'Segmento C', price: 349 },
  { name: 'Redmi Note 15 Pro 5G 12+512GB', segment: 'Segmento C', price: 349 },
  { name: 'Redmi Note 15 Pro 5G 8+256GB', segment: 'Segmento C', price: 299 },
  { name: 'Redmi Note 15 Pro 8+256GB', segment: 'Segmento C', price: 259 },
  { name: 'Redmi Note 15 5G 12+512GB', segment: 'Segmento C', price: 349 },
  { name: 'Redmi Note 15 5G 8+256GB', segment: 'Segmento C', price: 249 },
  { name: 'Redmi Note 15 8+256GB', segment: 'Segmento C', price: 199 },
  { name: 'Redmi Note 15 6+128GB', segment: 'Segmento C', price: 169 },
  { name: 'Redmi Note 14 Pro+ 5G 12+512GB', segment: 'Segmento C', price: 429 },
  { name: 'Redmi Note 14 Pro+ 5G 8+256GB', segment: 'Segmento C', price: 349 },
  { name: 'Redmi Note 14 Pro 5G 12+512GB', segment: 'Segmento C', price: 369 },
  { name: 'Redmi Note 14 Pro 5G 8+256GB', segment: 'Segmento C', price: 249 },
  { name: 'Redmi Note 14 Pro 8+256GB', segment: 'Segmento C', price: 199 },
  { name: 'Redmi Note 14 5G 8+256GB', segment: 'Segmento C', price: 229 },
  { name: 'Redmi Note 14 8+256GB', segment: 'Segmento C', price: 149 },
  { name: 'Redmi Note 14 6+128GB', segment: 'Segmento C', price: 139 },
  { name: 'Redmi Note 13 Pro 5G 8+256GB', segment: 'Segmento C', price: 329 },
  { name: 'Redmi Note 13 8+256GB Black', segment: 'Segmento C', price: 219 },
  { name: 'Redmi 15 8+256GB', segment: 'Segmento B', price: 169 },
  { name: 'Redmi 15C 4+256GB', segment: 'Segmento B', price: 149 },
  { name: 'Redmi 15C 4+128GB', segment: 'Segmento B', price: 129 },
  { name: 'Redmi 14C 8+256GB', segment: 'Segmento B', price: 119 },
  { name: 'Redmi 14C 6+128GB', segment: 'Segmento B', price: 99 },
  { name: 'Redmi 14C 4+128GB', segment: 'Segmento B', price: 99 },
  { name: 'Redmi A5 4+128GB', segment: 'Segmento B', price: 79 },
  { name: 'Redmi A5 3+64GB', segment: 'Segmento B', price: 139 },
  { name: 'Redmi 13 8+256GB', segment: 'Segmento B', price: 119 },
  { name: 'Redmi 13C 4/128GB Blue', segment: 'Segmento B', price: 99 },
  { name: 'Cargador 33W', segment: 'Otros Segmentos', price: 19 },
  { name: 'Cargador 67W', segment: 'Otros Segmentos', price: 29 },
  { name: 'Cargador 120W', segment: 'Otros Segmentos', price: 49 },
];

export const users: UserProfile[] = [
  { name: 'Administradora', username: 'administradora', role: 'administradora', region: null, center: null, password: 'admin123' },
  { name: 'Area Manager (AM)', username: 'am', role: 'am', region: null, center: null, password: 'am123' },
  { name: 'GPV Nordeste', username: 'gpv', role: 'GPV', region: 'Northeast', center: 'Media Barcelona 5 Fontanella', password: 'gpv' },
  { name: 'Promotor Barcelona', username: 'promotor', role: 'promotor', region: 'Northeast', center: 'Media Barcelona 5 Fontanella', password: 'promotor' },
  
  // Specific users
  { name: 'José Carlos Suárez Espinoza (GPV)', username: 'jcsuarez', role: 'GPV', region: 'Northeast', center: 'Media Barcelona 5 Fontanella', password: 'gpv' },
  { name: 'Enzo Grillo Raffo (GPV)', username: 'egrillo', role: 'GPV', region: 'Northeast', center: 'Media El Prat', password: 'gpv' },
  { name: 'Emmanuel Eduardo Albarracín (GPV)', username: 'ealbarracin', role: 'GPV', region: 'North', center: 'Media A Coruna', password: 'gpv' },
  { name: 'Wilmer Martínez Conde (GPV)', username: 'wmartinez', role: 'GPV', region: 'Canary Islands', center: 'Media Adeje', password: 'gpv' },
  { name: 'Javier Sanchez Martín (GPV)', username: 'jsanchez', role: 'GPV', region: 'East', center: 'Media Alfafar', password: 'gpv' },
  { name: 'Manuel Angel Cerezo (GPV)', username: 'mcerezo', role: 'GPV', region: 'South', center: 'Media Alcala de Guadaira', password: 'gpv' },
  { name: 'Carlos Miguel Abano (GPV)', username: 'cabano', role: 'GPV', region: 'Center', center: 'Media Alcala de Henares', password: 'gpv' },
  
  // Promotores
  { name: 'José Carlos Suárez Espinoza', username: 'jose_carlos', role: 'promotor', region: 'Northeast', center: 'Media Barcelona 5 Fontanella', password: 'promotor' },
  { name: 'Enzo Grillo Raffo', username: 'enzo_grillo', role: 'promotor', region: 'Northeast', center: 'Media El Prat', password: 'promotor' },
  { name: 'Alejandro Tovar Manzano', username: 'alejandro_tovar', role: 'promotor', region: 'Northeast', center: 'Media Barcelona 5 Fontanella', password: 'promotor' },
  { name: 'Abel Suárez Hernández', username: 'abel_suarez', role: 'promotor', region: 'Northeast', center: 'Media Barcelona 5 Fontanella', password: 'promotor' }
];

export const schedules: PromoterSchedule[] = [
  {
    usuario: 'José Carlos Suárez Espinoza',
    turno: 'Mañanas',
    fecha: '2026-07-06',
    diaNombre: 'Lunes 6',
    semanaNum: 'Semana 28',
    semanaRango: '06/07 - 12/07',
    horario: '9:30-17:30',
    horasTotales: 8,
    mes: 'Julio 2026',
    centro: 'Media Barcelona 5 Fontanella'
  },
  {
    usuario: 'José Carlos Suárez Espinoza',
    turno: 'Mañanas',
    fecha: '2026-07-07',
    diaNombre: 'Martes 7',
    semanaNum: 'Semana 28',
    semanaRango: '06/07 - 12/07',
    horario: '9:30-16:30',
    horasTotales: 7,
    mes: 'Julio 2026',
    centro: 'Media Barcelona 5 Fontanella'
  },
  {
    usuario: 'José Carlos Suárez Espinoza',
    turno: 'Mañanas',
    fecha: '2026-07-08',
    diaNombre: 'Miércoles 8',
    semanaNum: 'Semana 28',
    semanaRango: '06/07 - 12/07',
    horario: '9:30-17:30',
    horasTotales: 8,
    mes: 'Julio 2026',
    centro: 'Media Barcelona 5 Fontanella'
  },
  {
    usuario: 'José Carlos Suárez Espinoza',
    turno: 'Mañanas',
    fecha: '2026-07-09',
    diaNombre: 'Jueves 9',
    semanaNum: 'Semana 28',
    semanaRango: '06/07 - 12/07',
    horario: '11:00-14:00 y 15:00-21:00',
    horasTotales: 9,
    mes: 'Julio 2026',
    centro: 'Media Barcelona 5 Fontanella'
  },
  {
    usuario: 'José Carlos Suárez Espinoza',
    turno: 'Mañanas',
    fecha: '2026-07-10',
    diaNombre: 'Viernes 10',
    semanaNum: 'Semana 28',
    semanaRango: '06/07 - 12/07',
    horario: '9:30-17:30',
    horasTotales: 8,
    mes: 'Julio 2026',
    centro: 'Media Barcelona 5 Fontanella'
  },
  {
    usuario: 'José Carlos Suárez Espinoza',
    turno: 'Mañanas',
    fecha: '2026-07-11',
    diaNombre: 'Sábado 11',
    semanaNum: 'Semana 28',
    semanaRango: '06/07 - 12/07',
    horario: 'SABADO CALIDAD',
    horasTotales: 0,
    mes: 'Julio 2026',
    centro: 'Media Barcelona 5 Fontanella'
  },
  {
    usuario: 'José Carlos Suárez Espinoza',
    turno: 'Mañanas',
    fecha: '2026-07-12',
    diaNombre: 'Domingo 12',
    semanaNum: 'Semana 28',
    semanaRango: '06/07 - 12/07',
    horario: 'DAY OFF',
    horasTotales: 0,
    mes: 'Julio 2026',
    centro: 'Media Barcelona 5 Fontanella'
  },
  {
    usuario: 'Enzo Grillo Raffo',
    turno: 'Mañanas',
    fecha: '2026-07-06',
    diaNombre: 'Lunes 6',
    semanaNum: 'Semana 28',
    semanaRango: '06/07 - 12/07',
    horario: '9:30-14 y 15-19',
    horasTotales: 8.5,
    mes: 'Julio 2026',
    centro: 'Media El Prat'
  },
  {
    usuario: 'Enzo Grillo Raffo',
    turno: 'Mañanas',
    fecha: '2026-07-07',
    diaNombre: 'Martes 7',
    semanaNum: 'Semana 28',
    semanaRango: '06/07 - 12/07',
    horario: '9:30-14 y 15-19',
    horasTotales: 8.5,
    mes: 'Julio 2026',
    centro: 'Media El Prat'
  },
  {
    usuario: 'Enzo Grillo Raffo',
    turno: 'Mañanas',
    fecha: '2026-07-08',
    diaNombre: 'Miércoles 8',
    semanaNum: 'Semana 28',
    semanaRango: '06/07 - 12/07',
    horario: '10:30-14:00 y 15:00-20:30',
    horasTotales: 9,
    mes: 'Julio 2026',
    centro: 'Media El Prat'
  },
  {
    usuario: 'Wilmer Martínez Conde',
    turno: 'Mañanas',
    fecha: '2026-07-06',
    diaNombre: 'Lunes 6',
    semanaNum: 'Semana 28',
    semanaRango: '06/07 - 12/07',
    horario: '10:00-18:00',
    horasTotales: 8,
    mes: 'Julio 2026',
    centro: 'Media Adeje'
  },
  {
    usuario: 'Wilmer Martínez Conde',
    turno: 'Mañanas',
    fecha: '2026-07-07',
    diaNombre: 'Martes 7',
    semanaNum: 'Semana 28',
    semanaRango: '06/07 - 12/07',
    horario: 'DAY OFF',
    horasTotales: 0,
    mes: 'Julio 2026',
    centro: 'Media Adeje'
  },
  {
    usuario: 'Wilmer Martínez Conde',
    turno: 'Mañanas',
    fecha: '2026-07-08',
    diaNombre: 'Miércoles 8',
    semanaNum: 'Semana 28',
    semanaRango: '06/07 - 12/07',
    horario: '10:00-14:00 y 15:30-20:30',
    horasTotales: 9,
    mes: 'Julio 2026',
    centro: 'Media Adeje'
  }
];

// Helper to generate consistent stock data across all stores with four Almacenes each (Tienda, Tránsito, Crossdock, Exposición)
function generateStockData(): StockRecord[] {
  const records: StockRecord[] = [];
  
  const storesMeta = [
    // Northeast (Zone: Miguel Mata)
    { code: 'MIESD00174', name: 'Media Barcelona 5 Fontanella', region: 'Northeast', zone: 'Miguel Mata', pr: 2 },
    { code: 'MIESD00575', name: 'Media Barcelona 1', region: 'Northeast', zone: 'Miguel Mata', pr: 1 },
    { code: 'MIESP00034', name: 'Media Barcelona 2', region: 'Northeast', zone: 'Miguel Mata', pr: 2 },
    { code: 'MIESP03781', name: 'Media Sabadell', region: 'Northeast', zone: 'Miguel Mata', pr: 1 },
    { code: 'MIESP00037', name: 'Media Girona 2', region: 'Northeast', zone: 'Miguel Mata', pr: 1 },
    { code: 'MIESD00187', name: 'Media Lleida', region: 'Northeast', zone: 'Ricardo Dahdah', pr: 1 },
    { code: 'MIESO00034', name: 'Media Esplugues', region: 'Northeast', zone: 'Ricardo Dahdah', pr: 1 },
    { code: 'MIESO00033', name: 'Media Gava', region: 'Northeast', zone: 'Ricardo Dahdah', pr: 1 },
    { code: 'MIESD00175', name: 'Media El Prat', region: 'Northeast', zone: 'Ricardo Dahdah', pr: 2 },
    { code: 'MIESD00180', name: 'Media Sant Cugat (Barcelona)', region: 'Northeast', zone: 'Ricardo Dahdah', pr: 2 },
    { code: 'MIESO00043', name: 'Media Tarragona', region: 'Northeast', zone: 'Ricardo Dahdah', pr: 2 },
    
    // North (Zone: Francisco Paz)
    { code: 'MIESD00185', name: 'Media A Coruna', region: 'North', zone: 'Francisco Paz', pr: 1 },
    { code: 'MIESD00188', name: 'Media Lugo', region: 'North', zone: 'Francisco Paz', pr: 1 },
    { code: 'MIESD00184', name: 'Media Santiago de Compostela', region: 'North', zone: 'Francisco Paz', pr: 1 },
    { code: 'MIESD00197', name: 'Media Vigo', region: 'North', zone: 'Francisco Paz', pr: 1 },
    { code: 'MIESD02800', name: 'Media Gijón', region: 'North', zone: 'Francisco Paz', pr: 1 },
    { code: 'MIESS00030', name: 'Media Barakaldo-Bilbao', region: 'North', zone: 'Jesus de la Torre', pr: 2 },
    { code: 'MIESS00031', name: 'Media Bilbao (Zubiarte)', region: 'North', zone: 'Jesus de la Torre', pr: 1 },
    { code: 'MIESD00207', name: 'Media Bilbondo', region: 'North', zone: 'Jesus de la Torre', pr: 1 },
    { code: 'MIESD00196', name: 'Media Cordovilla-Pamplona', region: 'North', zone: 'Jesus de la Torre', pr: 2 },
    { code: 'MIESD02259', name: 'Media Burgos', region: 'North', zone: 'Jesus de la Torre', pr: 1 },
    
    // South
    { code: 'MIESS00028', name: 'Media Alcala de Guadaira', region: 'South', zone: 'Carlos Martinez', pr: 2 },
    { code: 'MIESO00047', name: 'Media Cordoba', region: 'South', zone: 'Carlos Martinez', pr: 1 },
    { code: 'MIESO00054', name: 'Media Granada', region: 'South', zone: 'Carlos Martinez', pr: 1 },
    { code: 'MIESO00041', name: 'Media Malaga', region: 'South', zone: 'Estela Corbella', pr: 2 },
    { code: 'MIESO00040', name: 'Media Malaga 2 (Plaza Mayor)', region: 'South', zone: 'Estela Corbella', pr: 2 },
    { code: 'MIESD00665', name: 'Media Almeria 2', region: 'South', zone: 'Estela Corbella', pr: 1 },
    { code: 'MIESO00045', name: 'Media Badajoz', region: 'South', zone: 'Fernando Torres', pr: 1 },
    { code: 'MIESO00049', name: 'Media Jerez', region: 'South', zone: 'Fernando Torres', pr: 2 },
    
    // East
    { code: 'MIESD00205', name: 'Media Albacete', region: 'East', zone: 'Guillermo Perez', pr: 1 },
    { code: 'MIESD00171', name: 'Media Alicante', region: 'East', zone: 'Guillermo Perez', pr: 2 },
    { code: 'MIESD00208', name: 'Media Cartagena', region: 'East', zone: 'Guillermo Perez', pr: 1 },
    { code: 'MIESD00210', name: 'Media Elche', region: 'East', zone: 'Guillermo Perez', pr: 1 },
    { code: 'MIESD00221', name: 'Media Murcia', region: 'East', zone: 'Guillermo Perez', pr: 1 },
    { code: 'MIESD00201', name: 'Media Alfafar', region: 'East', zone: 'Ezequiel Brito', pr: 2 },
    { code: 'MIESO00046', name: 'Media Castellon', region: 'East', zone: 'Ezequiel Brito', pr: 2 },
    { code: 'MIESD00211', name: 'Media Gandia', region: 'East', zone: 'Ezequiel Brito', pr: 1 },
    { code: 'MIESO00052', name: 'Media Palma de Mallorca', region: 'East', zone: 'Ezequiel Brito', pr: 2 },
    
    // Canary Islands
    { code: 'MIESO00053', name: 'Media Las Arenas', region: 'Canary Islands', zone: 'Carlos Deniz', pr: 2 },
    { code: 'MIESO00038', name: 'Media Las Palmas de Gran Canaria', region: 'Canary Islands', zone: 'Carlos Deniz', pr: 1 },
    { code: 'MIESO00039', name: 'Media Telde', region: 'Canary Islands', zone: 'Carlos Deniz', pr: 2 },
    { code: 'MIESO00056', name: 'Media Tenerife', region: 'Canary Islands', zone: 'Virginia Rodriguez', pr: 2 },
    { code: 'MIESD02258', name: 'Media Adeje', region: 'Canary Islands', zone: 'Virginia Rodriguez', pr: 1 },
    
    // Center
    { code: 'MIESD00194', name: 'Media Alcala de Henares', region: 'Center', zone: 'Carlos Bellasai', pr: 2 },
    { code: 'MIESD00195', name: 'Media Alcorcon', region: 'Center', zone: 'Carlos Bellasai', pr: 2 },
    { code: 'MIESD00222', name: 'Media Collado Villalba', region: 'Center', zone: 'Carlos Bellasai', pr: 1 },
    { code: 'MIESD00218', name: 'Media Madrid Vallecas', region: 'Center', zone: 'Jesús de Luis', pr: 1 },
    { code: 'MIESD00212', name: 'Media Getafe', region: 'Center', zone: 'Jesús de Luis', pr: 2 },
    { code: 'MIESD00217', name: 'Media Islazul Madrid', region: 'Center', zone: 'Jesús de Luis', pr: 2 },
  ];

  const types: { name: 'Tienda' | 'Tránsito' | 'Crossdock' | 'Exposición', scale: number }[] = [
    { name: 'Tienda', scale: 1 },
    { name: 'Tránsito', scale: 0.057 },
    { name: 'Crossdock', scale: 0.067 },
    { name: 'Exposición', scale: 0.027 },
  ];

  storesMeta.forEach((store) => {
    types.forEach((type) => {
      const stocks: { [prod: string]: number } = {};
      const dos: { [prod: string]: number } = {};
      let totalStock = 0;

      // Seed stocks based on product segments and scale factors
      products.forEach((prod) => {
        let baseMin = 0;
        let baseMax = 0;

        if (prod.segment === 'Segmento Premium') {
          if (prod.name.includes('Ultra')) {
            baseMin = 0;
            baseMax = store.code === 'MIESD00174' ? 14 : 4; // Barcelona has more premium stock
          } else {
            baseMin = 1;
            baseMax = store.code === 'MIESD00174' ? 25 : 8;
          }
        } else if (prod.segment === 'Segmento C') {
          baseMin = 2;
          baseMax = 15;
        } else if (prod.segment === 'Segmento B') {
          baseMin = 5;
          baseMax = 40;
        } else {
          // Otros
          baseMin = 0;
          baseMax = 10;
        }

        // Apply AlmacenType scale (Tienda is highest, Transito is lower, etc.)
        let stockVal = 0;
        if (type.name === 'Tienda') {
          stockVal = Math.floor(Math.random() * (baseMax - baseMin + 1)) + baseMin;
        } else {
          // Only some stores have transit / crossdock for specific items
          const chance = store.code === 'MIESD00174' || store.code === 'MIESD02258' ? 0.6 : 0.25;
          if (Math.random() < chance) {
            stockVal = Math.floor(Math.random() * (baseMax * type.scale + 2));
          }
        }

        if (stockVal > 0) {
          stocks[prod.name] = stockVal;
          dos[prod.name] = Math.floor(Math.random() * 80) + 10; // DoS range 10-90 days
          totalStock += stockVal;
        }
      });

      // Special overrides to match the exact mock screenshots for Barcelona (Northeast) and Adeje (Canary Islands)
      if (store.code === 'MIESD00174') { // Media Barcelona 5 Fontanella
        if (type.name === 'Tienda') {
          stocks['Xiaomi 14T 12+256GB'] = 1;
          stocks['Xiaomi 14T Pro 12+512GB'] = 11;
          stocks['Xiaomi 14T Pro 12+1TB'] = 2;
          stocks['Xiaomi 14 12+512GB'] = 3;
          stocks['Xiaomi 14 Ultra 16+512GB'] = 12;
          dos['Xiaomi 14T 12+256GB'] = 45;
          dos['Xiaomi 14T Pro 12+512GB'] = 56;
          dos['Xiaomi 14T Pro 12+1TB'] = 71;
          // recalculate total
          totalStock = Object.values(stocks).reduce((a, b) => a + b, 0);
        }
      } else if (store.code === 'MIESD02258') { // Media Adeje
        if (type.name === 'Tránsito') {
          stocks['REDMI 13C 8+256GB'] = 4; // MI TV STICK EU analog
          stocks['Redmi 13 8+256GB'] = 19; // TV BOX S analog
          totalStock = Object.values(stocks).reduce((a, b) => a + b, 0);
        }
      }

      records.push({
        storeCode: store.code,
        storeName: store.name,
        pr: store.pr,
        region: store.region,
        zone: store.zone,
        almacenType: type.name,
        stocks,
        dos,
        totalStock,
        totalStockKM: Math.floor(totalStock * 1.2)
      });
    });
  });

  return records;
}

export const stockRecords = generateStockData();
