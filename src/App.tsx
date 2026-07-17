import React, { useState, useMemo, FormEvent, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { products as initialProducts, users, stockRecords as initialStockRecords, schedules } from './data';
import { AlmacenType, StockRecord, UserProfile, Product } from './types';
import { initAuth, googleSignIn, logout, listDriveFiles, downloadDriveFile, DriveFile } from './googleDrive';
import { loginReal, fetchStockReal, mapBackendUserToProfile, transformRawStock, BackendUser } from './services/backend';
import { 
  Building2, 
  ChevronDown, 
  HelpCircle, 
  LogOut, 
  RotateCcw, 
  Search, 
  TrendingDown, 
  TrendingUp, 
  Truck, 
  Tv, 
  User, 
  Layers, 
  Briefcase, 
  SlidersHorizontal, 
  Lock, 
  CheckCircle, 
  X, 
  Calendar,
  Grid,
  MapPin,
  TrendingUp as TrendingUpIcon,
  Smartphone,
  UploadCloud,
  FileSpreadsheet,
  Trash2,
  AlertTriangle
} from 'lucide-react';

export default function App() {
  // Products and Stock State (with localStorage persistence)
  const [productsState, setProductsState] = useState<Product[]>(() => {
    const saved = localStorage.getItem('xiaomi_products');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return initialProducts;
  });

  const [stockRecordsState, setStockRecordsState] = useState<StockRecord[]>(() => {
    const saved = localStorage.getItem('xiaomi_stock_records');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return initialStockRecords;
  });

  const products = productsState;
  const stockRecords = stockRecordsState;

  // Import panel states
  const [importSectionOpen, setImportSectionOpen] = useState(false);
  const [importLog, setImportLog] = useState<{ rows: number; stores: number; products: number; fileName: string } | null>(() => {
    const saved = localStorage.getItem('xiaomi_import_log');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });
  const [importError, setImportError] = useState<string>('');

  // Google Drive Integration States
  const [activeImportTab, setActiveImportTab] = useState<'local' | 'drive'>('local');
  const [driveUser, setDriveUser] = useState<any>(null);
  const [driveToken, setDriveToken] = useState<string | null>(null);
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
  const [driveFilter, setDriveFilter] = useState<'all' | 'sheets'>('all');
  const [isListingDrive, setIsListingDrive] = useState(false);
  const [isDownloadingDrive, setIsDownloadingDrive] = useState(false);
  const [driveError, setDriveError] = useState<string>('');

  const filteredDriveFiles = useMemo(() => {
    if (driveFilter === 'sheets') {
      return driveFiles.filter(f => f.mimeType === 'application/vnd.google-apps.spreadsheet');
    }
    return driveFiles;
  }, [driveFiles, driveFilter]);

  // Google Drive Authentication listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setDriveUser(user);
        setDriveToken(token);
        fetchDriveFiles(token);
      },
      () => {
        setDriveUser(null);
        setDriveToken(null);
        setDriveFiles([]);
      }
    );
    return () => unsubscribe();
  }, []);

  const fetchDriveFiles = async (token: string) => {
    setIsListingDrive(true);
    setDriveError('');
    try {
      const files = await listDriveFiles(token);
      setDriveFiles(files);
    } catch (err: any) {
      setDriveError(`Error al cargar archivos de Google Drive: ${err.message || err}`);
    } finally {
      setIsListingDrive(false);
    }
  };

  const handleDriveSignIn = async () => {
    setDriveError('');
    try {
      const result = await googleSignIn();
      if (result) {
        setDriveUser(result.user);
        setDriveToken(result.accessToken);
        fetchDriveFiles(result.accessToken);
      }
    } catch (err: any) {
      setDriveError(`Error de inicio de sesión: ${err.message || err}`);
    }
  };

  const handleDriveSignOut = async () => {
    try {
      await logout();
      setDriveUser(null);
      setDriveToken(null);
      setDriveFiles([]);
    } catch (err: any) {
      setDriveError(`Error al cerrar sesión: ${err.message || err}`);
    }
  };

  const processDriveFile = async (file: DriveFile) => {
    if (!driveToken) return;
    setIsDownloadingDrive(true);
    setDriveError('');
    try {
      const arrayBuffer = await downloadDriveFile(driveToken, file.id, file.mimeType);
      const data = new Uint8Array(arrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const sheetData = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
      parseSpreadsheetData(sheetData, file.name);
    } catch (err: any) {
      setDriveError(`Error de descarga/lectura de Drive: ${err.message || err}`);
    } finally {
      setIsDownloadingDrive(false);
    }
  };

  // Authentication & Permissions State
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSyncingRealStock, setIsSyncingRealStock] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile>(users[0]); 
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Active View Tab
  const [activeTab, setActiveTab] = useState<'dashboard' | 'stockDetail' | 'gfkSegments' | 'profile'>('dashboard');

  // Day-to-Day viewing state (Date pick)
  const [selectedDate, setSelectedDate] = useState<string>('2026-07-06'); // Default within sample schedule

  // Search State
  const [searchQuery, setSearchQuery] = useState('');

  // GFK Segment filtering click state
  const [activeGFKFilter, setActiveGFKFilter] = useState<string>('Todos');

  // Sort state for tables
  const [storeSortOrder, setStoreSortOrder] = useState<'asc' | 'desc'>('asc');
  const [stockSortOrder, setStockSortOrder] = useState<'desc' | 'asc'>('desc');

  // Interactive Hover states for SVG tooltips
  const [hoveredStackBar, setHoveredStackBar] = useState<number | null>(null);
  const [hoveredRegionBar, setHoveredRegionBar] = useState<{ storeIndex: number; datasetIndex: number } | null>(null);
  const [hoveredDonutIdx, setHoveredDonutIdx] = useState<number | null>(null);

  // Filter States (Raw selections, which get lock-overridden by roles)
  const [selectedRegion, setSelectedRegion] = useState<string>('Todos');
  const [selectedZone, setSelectedZone] = useState<string>('Todos');
  const [selectedPR, setSelectedPR] = useState<string>('Todos');
  const [selectedStore, setSelectedStore] = useState<string>('Todos');
  const [selectedProduct, setSelectedProduct] = useState<string>('Todos');
  const [selectedSegment, setSelectedSegment] = useState<string>('Todos');

  // Active Filter Values (accounting for roles/permissions locks)
  const activeFilters = useMemo(() => {
    const isPromoter = currentUser.role === 'promotor';
    const isGPV = currentUser.role === 'GPV';

    let region = selectedRegion;
    let zone = selectedZone;
    let store = selectedStore;

    if (isPromoter) {
      // Find promoter's store details to lock Region and Zone automatically
      const storeRecord = stockRecords.find(r => r.storeName === currentUser.center);
      if (storeRecord) {
        region = storeRecord.region;
        zone = storeRecord.zone;
        store = storeRecord.storeName;
      } else {
        region = currentUser.region || 'Todos';
        store = currentUser.center || 'Todos';
      }
    } else if (isGPV) {
      region = currentUser.region || 'Todos';
    }

    return { region, zone, store };
  }, [currentUser, selectedRegion, selectedZone, selectedStore]);

  // Clean filters when role/user changes
  const handleUserChange = (user: UserProfile) => {
    setCurrentUser(user);
    setShowUserMenu(false);
    if ((user.role === 'GPV' || user.role === 'promotor') && user.region) {
      setSelectedRegion(user.region);
    } else {
      setSelectedRegion('Todos');
    }
    setSelectedZone('Todos');
    setSelectedPR('Todos');
    setSelectedStore('Todos');
    setSelectedProduct('Todos');
    setSelectedSegment('Todos');
    setSearchQuery('');
  };

  // Clear all filters
  const handleClearFilters = () => {
    if (currentUser.role !== 'GPV' && currentUser.role !== 'promotor') {
      setSelectedRegion('Todos');
      setSelectedZone('Todos');
      setSelectedStore('Todos');
    }
    setSelectedPR('Todos');
    setSelectedProduct('Todos');
    setSelectedSegment('Todos');
    setSearchQuery('');
  };

  // Unique lists for filters resolved dynamically based on current permission scope
  const regionsList = useMemo(() => {
    if (currentUser.role === 'GPV' || currentUser.role === 'promotor') {
      return [activeFilters.region];
    }
    const list = new Set(stockRecords.map(r => r.region));
    return ['Todos', ...Array.from(list)];
  }, [currentUser, activeFilters.region]);

  const zonesList = useMemo(() => {
    if (currentUser.role === 'promotor') {
      return [activeFilters.zone];
    }
    const records = stockRecords.filter(r => activeFilters.region === 'Todos' || r.region === activeFilters.region);
    const list = new Set(records.map(r => r.zone));
    return ['Todos', ...Array.from(list)];
  }, [currentUser, activeFilters.region, activeFilters.zone]);

  const prsList = useMemo(() => {
    return ['Todos', '1', '2', '3'];
  }, []);

  const storesList = useMemo(() => {
    if (currentUser.role === 'promotor') {
      return [activeFilters.store];
    }
    const records = stockRecords.filter(r => 
      (activeFilters.region === 'Todos' || r.region === activeFilters.region) &&
      (activeFilters.zone === 'Todos' || r.zone === activeFilters.zone)
    );
    const list = new Set(records.map(r => r.storeName));
    return ['Todos', ...Array.from(list)];
  }, [currentUser, activeFilters.region, activeFilters.zone, activeFilters.store]);

  const productsList = useMemo(() => {
    return ['Todos', ...products.map(p => p.name)];
  }, []);

  // Filtered Stock records
  const filteredRecords = useMemo(() => {
    return stockRecords.filter(record => {
      // Role region restriction
      if ((currentUser.role === 'GPV' || currentUser.role === 'promotor') && activeFilters.region !== 'Todos' && record.region !== activeFilters.region) {
        return false;
      }
      // Filter selections
      if (activeFilters.region !== 'Todos' && record.region !== activeFilters.region) return false;
      if (activeFilters.zone !== 'Todos' && record.zone !== activeFilters.zone) return false;
      if (selectedPR !== 'Todos' && record.pr.toString() !== selectedPR) return false;
      if (activeFilters.store !== 'Todos' && record.storeName !== activeFilters.store) return false;
      return true;
    });
  }, [currentUser, activeFilters, selectedPR]);

  // Stock values summarized
  const totals = useMemo(() => {
    let tienda = 0;
    let transito = 0;
    let crossdock = 0;
    let exposicion = 0;

    filteredRecords.forEach(record => {
      // filter product or segment inside record if selected
      const prodsToCount = products.filter(p => {
        if (selectedProduct !== 'Todos' && p.name !== selectedProduct) return false;
        if (selectedSegment !== 'Todos' && p.segment !== selectedSegment) return false;
        if (activeGFKFilter !== 'Todos' && p.segment !== activeGFKFilter) return false;
        if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
      });

      prodsToCount.forEach(p => {
        const qty = record.stocks[p.name] || 0;
        if (record.almacenType === 'Tienda') tienda += qty;
        else if (record.almacenType === 'Tránsito') transito += qty;
        else if (record.almacenType === 'Crossdock') crossdock += qty;
        else if (record.almacenType === 'Exposición') exposicion += qty;
      });
    });

    return { tienda, transito, crossdock, exposicion, total: tienda + transito + crossdock + exposicion };
  }, [filteredRecords, selectedProduct, selectedSegment, activeGFKFilter, searchQuery]);

  // Promoter Schedule filtering for day-to-day
  const filteredSchedule = useMemo(() => {
    return schedules.filter(s => {
      if (s.fecha !== selectedDate) return false;
      
      if (currentUser.role === 'promotor') {
        return s.usuario === currentUser.name;
      }
      if (currentUser.role === 'GPV') {
        const centerRecord = stockRecords.find(r => r.storeName === s.centro);
        if (centerRecord && centerRecord.region !== currentUser.region) return false;
      }
      return true;
    });
  }, [selectedDate, currentUser]);

  // Stacked chart calculation
  const stackedChartData = useMemo(() => {
    const categories = [
      { name: 'Telefonía', keywords: ['Ultra', 'Pro', 'Xiaomi 17', 'Xiaomi 15', 'Xiaomi 14', 'Xiaomi 13'] },
      { name: 'Smartphones C', keywords: ['Redmi Note 15', 'Redmi Note 14', 'Redmi Note 13', 'Redmi Note 12'] },
      { name: 'Redmi Básico', keywords: ['Redmi 15', 'Redmi 14', 'Redmi A5', 'Redmi 13', 'Redmi A3', '13C'] },
      { name: 'Cargadores y Acc.', keywords: ['Cargador'] }
    ];

    return categories.map(cat => {
      let tiendaVal = 0;
      let transitoVal = 0;
      let crossdockVal = 0;
      let exposicionVal = 0;

      filteredRecords.forEach(record => {
        products.forEach(p => {
          const matches = cat.keywords.some(k => p.name.includes(k));
          if (!matches) return;

          const qty = record.stocks[p.name] || 0;
          if (record.almacenType === 'Tienda') tiendaVal += qty;
          else if (record.almacenType === 'Tránsito') transitoVal += qty;
          else if (record.almacenType === 'Crossdock') crossdockVal += qty;
          else if (record.almacenType === 'Exposición') exposicionVal += qty;
        });
      });

      return {
        category: cat.name,
        Tienda: tiendaVal,
        Tránsito: transitoVal,
        Crossdock: crossdockVal,
        Exposición: exposicionVal,
        total: tiendaVal + transitoVal + crossdockVal + exposicionVal
      };
    });
  }, [filteredRecords]);

  // Donut chart calculation (Distribución por Familias)
  const familyDonutData = useMemo(() => {
    const families = [
      { name: 'Premium (Xiaomi Series)', segment: 'Segmento Premium', color: '#104a60' },
      { name: 'Media (Redmi Note Series)', segment: 'Segmento C', color: '#FF6700' },
      { name: 'Acceso (Redmi Series)', segment: 'Segmento B', color: '#0ca678' },
      { name: 'Otros (Accesorios)', segment: 'Otros Segmentos', color: '#8b5cf6' }
    ];

    let totalVal = 0;
    const values = families.map(f => {
      let sum = 0;
      filteredRecords.forEach(record => {
        products.forEach(p => {
          if (p.segment !== f.segment) return;
          sum += record.stocks[p.name] || 0;
        });
      });
      totalVal += sum;
      return { ...f, value: sum };
    });

    return { total: totalVal, segments: values };
  }, [filteredRecords]);

  // Regional comparisons grouped chart data
  const regionalChartData = useMemo(() => {
    let regionNames = ['Northeast', 'North', 'South', 'East', 'Canary Islands', 'Center'];
    if (currentUser.role === 'GPV' || currentUser.role === 'promotor') {
      regionNames = regionNames.filter(r => r === activeFilters.region);
    }
    
    return regionNames.map(reg => {
      let tienda = 0;
      let transito = 0;
      let crossdock = 0;
      let exposicion = 0;

      stockRecords.filter(r => r.region === reg).forEach(r => {
        // If promoter, only include their specific store
        if (currentUser.role === 'promotor' && r.storeName !== activeFilters.store) return;
        
        products.forEach(p => {
          const qty = r.stocks[p.name] || 0;
          if (r.almacenType === 'Tienda') tienda += qty;
          else if (r.almacenType === 'Tránsito') transito += qty;
          else if (r.almacenType === 'Crossdock') crossdock += qty;
          else if (r.almacenType === 'Exposición') exposicion += qty;
        });
      });

      return { region: reg, Tienda: tienda, Tránsito: transito, Crossdock: crossdock, Exposición: exposicion };
    });
  }, [currentUser, activeFilters]);

  // Descarga el stock real desde Google Sheets (vía Apps Script) y lo
  // transforma al formato que usa el resto del dashboard. Reutiliza el
  // mismo mecanismo de persistencia (localStorage + badge "importLog")
  // que ya usaba la importación manual de Excel.
  const loadRealDataFromBackend = async (backendUser: BackendUser) => {
    setIsSyncingRealStock(true);
    setImportError('');
    try {
      const resp = await fetchStockReal(backendUser);
      if (!resp.success || !resp.datos) {
        setImportError(resp.error || 'No se pudieron cargar los datos de stock reales.');
        return;
      }
      const { stockRecords: realRecords, products: realProducts } = transformRawStock(resp.datos);

      setStockRecordsState(realRecords);
      setProductsState(realProducts);
      localStorage.setItem('xiaomi_stock_records', JSON.stringify(realRecords));
      localStorage.setItem('xiaomi_products', JSON.stringify(realProducts));

      const finalLog = {
        rows: resp.datos.length,
        stores: new Set(realRecords.map((r) => r.storeName)).size,
        products: realProducts.length,
        fileName: `Google Sheets · cierre ${resp.fechaCierre || 'N/D'}`,
      };
      setImportLog(finalLog);
      localStorage.setItem('xiaomi_import_log', JSON.stringify(finalLog));
    } catch (err: any) {
      setImportError(`Error sincronizando stock real: ${err.message || err}`);
    } finally {
      setIsSyncingRealStock(false);
    }
  };

  // Handle Login submission — valida contra la hoja real de usuarios de
  // Google Sheets a través del backend de Apps Script (acción "login").
  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);
    try {
      const resp = await loginReal(loginUsername.trim(), loginPassword);
      if (!resp.success || !resp.user) {
        setLoginError(resp.error || 'No se pudo iniciar sesión.');
        return;
      }
      const profile = mapBackendUserToProfile(resp.user);
      setIsLoggedIn(true);
      handleUserChange(profile);
      // Carga el stock real en segundo plano; si falla, el usuario ya
      // está dentro y verá el aviso de error en el panel de importación
      // en vez de quedarse bloqueado en el login.
      loadRealDataFromBackend(resp.user);
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Parser helper for "informe" spreadsheets
  const parseSpreadsheetData = (sheetData: any[][], fileName: string) => {
    try {
      if (sheetData.length < 2) {
        setImportError('El archivo no contiene suficientes filas.');
        return;
      }

      // Check header row for dynamic indices in case columns are shifted
      const headerRow = sheetData[0].map(h => String(h || '').trim().toLowerCase());
      
      let colModelIdx = 5; // F
      let colQtyIdx = 15; // P
      let colWhIdx = 16; // Q
      let colRegionIdx = 20; // U
      let colFamIdx = 24; // Y
      let colSubIdx = 25; // Z
      let colStoreIdx = 26; // AA

      // Look for columns by header names first, if found, use them!
      headerRow.forEach((val, idx) => {
        if (val === 'model' || val === 'modelo') colModelIdx = idx;
        else if (val === 'cantidad' || val === 'cantidades' || val === 'cantidad total' || val === 'uds') colQtyIdx = idx;
        else if (val === 'almacen' || val === 'almacén' || val === 'tipo de almacén' || val === 'almacentype') colWhIdx = idx;
        else if (val === 'region' || val === 'región') colRegionIdx = idx;
        else if (val === 'familia' || val === 'familia de producto' || val === 'familia_producto') colFamIdx = idx;
        else if (val === 'subfamilia') colSubIdx = idx;
        else if (val === 'store name' || val === 'store_name' || val === 'tienda' || val === 'nombre tienda' || val === 'centro') colStoreIdx = idx;
      });

      const recordsMap: { [key: string]: StockRecord } = {};
      const newProductsMap: { [name: string]: Product } = {};
      let parsedRowCount = 0;

      for (let i = 1; i < sheetData.length; i++) {
        const row = sheetData[i];
        if (!row || row.length === 0) continue;

        // Skip rows that don't have store name or model
        const storeNameVal = String(row[colStoreIdx] || '').trim();
        const modelVal = String(row[colModelIdx] || '').trim();
        if (!storeNameVal || !modelVal || storeNameVal.toLowerCase() === 'undefined' || modelVal.toLowerCase() === 'undefined') continue;

        const regionVal = String(row[colRegionIdx] || '').trim();
        const familiaVal = String(row[colFamIdx] || '').trim();
        const subfamiliaVal = String(row[colSubIdx] || '').trim();
        const whRaw = row[colWhIdx];
        const qtyRaw = row[colQtyIdx];

        const qty = parseInt(String(qtyRaw || 0).replace(/[^0-9-]/g, ''), 10) || 0;
        if (qty === 0) continue; // skip zero stock values

        // Parse Almacén code:
        // Solamente cogeremos:
        // - 6: "detalle tienda" -> 'Tienda'
        // - 19: "tránsito" -> 'Tránsito'
        // - 2: "crossdock" -> 'Crossdock'
        // - 5: "exposición" -> 'Exposición'
        const whCode = String(whRaw || '').trim().toLowerCase();
        let whType: AlmacenType | null = null;
        if (whCode === '6' || whCode.includes('detalle tienda') || whCode.includes('tienda') || whCode === 'tienda') {
          whType = 'Tienda';
        } else if (whCode === '19' || whCode.includes('tránsito') || whCode.includes('transito') || whCode === 'tránsito') {
          whType = 'Tránsito';
        } else if (whCode === '2' || whCode.includes('crossdock')) {
          whType = 'Crossdock';
        } else if (whCode === '5' || whCode.includes('exposición') || whCode.includes('exposicion') || whCode === 'exposición') {
          whType = 'Exposición';
        }

        if (!whType) continue; // Skip if it's not one of the requested 4 warehouses

        parsedRowCount++;

        // Determine GFK Segment based on model name, subfamilia, etc.
        let segment: 'Segmento Premium' | 'Segmento C' | 'Segmento B' | 'Otros Segmentos' = 'Otros Segmentos';
        const subf = subfamiliaVal.toLowerCase();
        const mName = modelVal.toLowerCase();

        if (
          subf.includes('xiaomi') || 
          mName.includes('ultra') || 
          mName.includes('t pro') || 
          mName.includes('14 pro') || 
          mName.includes('15 pro') || 
          mName.includes('17 pro') || 
          mName.includes('xiaomi 17') || 
          mName.includes('xiaomi 15') || 
          mName.includes('xiaomi 14')
        ) {
          segment = 'Segmento Premium';
        } else if (subf.includes('note') || mName.includes('note')) {
          segment = 'Segmento C';
        } else if (subf.includes('redmi') || mName.includes('redmi')) {
          segment = 'Segmento B';
        }

        // Add to newProducts list if not exists
        if (!newProductsMap[modelVal]) {
          const defaultProd = initialProducts.find(p => p.name === modelVal);
          newProductsMap[modelVal] = {
            name: modelVal,
            segment,
            price: defaultProd ? defaultProd.price : (segment === 'Segmento Premium' ? 699 : segment === 'Segmento C' ? 299 : segment === 'Segmento B' ? 149 : 99)
          };
        }

        // Group key is (StoreName, WarehouseType)
        const key = `${storeNameVal}_${whType}`;
        if (!recordsMap[key]) {
          const matchDefault = initialStockRecords.find(r => r.storeName === storeNameVal);
          recordsMap[key] = {
            storeCode: matchDefault ? matchDefault.storeCode : `MIES${Math.floor(10000 + Math.random() * 90000)}`,
            storeName: storeNameVal,
            pr: matchDefault ? matchDefault.pr : (Math.floor(Math.random() * 3) + 1),
            region: regionVal || (matchDefault ? matchDefault.region : 'General'),
            zone: matchDefault ? matchDefault.zone : 'General',
            almacenType: whType,
            stocks: {},
            dos: {},
            totalStock: 0
          };
        }

        const rec = recordsMap[key];
        rec.stocks[modelVal] = (rec.stocks[modelVal] || 0) + qty;
        rec.totalStock += qty;

        // Make realistic days of stock for dashboard visualization
        rec.dos[modelVal] = Math.round(qty / (Math.floor(Math.random() * 3) + 1.5)) || 1;
      }

      const parsedRecords = Object.values(recordsMap);
      const parsedProductsList = Object.values(newProductsMap);

      if (parsedRecords.length === 0) {
        setImportError('No se encontraron registros de stock válidos con los códigos de almacén indicados (6: Tienda, 19: Tránsito, 2: Crossdock, 5: Exposición).');
        return;
      }

      // Save to state and localStorage!
      setStockRecordsState(parsedRecords);
      setProductsState(parsedProductsList);
      
      localStorage.setItem('xiaomi_stock_records', JSON.stringify(parsedRecords));
      localStorage.setItem('xiaomi_products', JSON.stringify(parsedProductsList));

      const finalLog = {
        rows: parsedRowCount,
        stores: new Set(parsedRecords.map(r => r.storeName)).size,
        products: parsedProductsList.length,
        fileName
      };

      setImportLog(finalLog);
      localStorage.setItem('xiaomi_import_log', JSON.stringify(finalLog));
      setImportError('');
      setImportSectionOpen(false); // keep view clean after successful import
    } catch (err: any) {
      setImportError(`Error al procesar el archivo: ${err.message || err}`);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const sheetData = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
        parseSpreadsheetData(sheetData, file.name);
      } catch (err: any) {
        setImportError(`Error de lectura: ${err.message || err}`);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleResetToDefault = () => {
    localStorage.removeItem('xiaomi_stock_records');
    localStorage.removeItem('xiaomi_products');
    localStorage.removeItem('xiaomi_import_log');
    setStockRecordsState(initialStockRecords);
    setProductsState(initialProducts);
    setImportLog(null);
    setImportError('');
  };

  if (!isLoggedIn) {
    return (
      <div className="bg-[#104a60] text-slate-100 font-sans min-h-screen flex items-center justify-center p-4 selection:bg-indigo-500/20 selection:text-indigo-200">
        <div className="w-full max-w-md bg-[#0d3b4d]/95 border border-[#145a70] rounded-2xl shadow-2xl overflow-hidden flex flex-col p-6 md:p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 mb-2">
              <div className="flex items-center gap-1 font-sans tracking-tight">
                <span className="text-white font-extrabold text-2xl tracking-tighter">SALES</span>
                <span className="text-slate-300 font-extrabold text-2xl tracking-tighter">LAND</span>
              </div>
            </div>
            <h2 className="text-base font-black tracking-widest text-indigo-300 uppercase font-sans">
              Portal de Inventario <span className="text-[#FF6700] font-black">XIAOMI</span>
            </h2>
            <p className="text-xs text-slate-300 font-medium max-w-xs mx-auto">
              Visualización y control de inventario de promotores en tiempo real.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {loginError && (
              <div className="bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs font-semibold p-3 rounded-lg text-center flex items-center justify-center gap-2">
                <span className="w-1.5 h-1.5 bg-rose-500 rounded-full shrink-0"></span>
                {loginError}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold tracking-wider text-slate-300 px-0.5">
                Usuario
              </label>
              <input
                type="text"
                required
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                placeholder="Escribe tu usuario..."
                className="w-full bg-[#104a60]/50 border border-[#145a70] focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/30 rounded-lg py-2.5 px-3.5 text-xs text-slate-100 placeholder:text-slate-400 transition-all font-medium focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold tracking-wider text-slate-300 px-0.5">
                Contraseña
              </label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#104a60]/50 border border-[#145a70] focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/30 rounded-lg py-2.5 px-3.5 text-xs text-slate-100 placeholder:text-slate-400 transition-all font-medium focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-xs shadow-md shadow-indigo-600/10 hover:shadow-indigo-500/20 hover:scale-[1.01] transition-all cursor-pointer"
            >
              {isLoggingIn ? 'Comprobando credenciales...' : 'Iniciar Sesión'}
            </button>
          </form>

          <div className="pt-3 border-t border-[#145a70]/50 text-center">
            <p className="text-[10px] text-slate-400 font-medium">
              Acceso con tu usuario y contraseña reales de Salesland | Xiaomi.
              ¿Problemas para entrar? Contacta a tu AM o Coordinadora.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 text-slate-900 font-sans min-h-screen flex flex-col antialiased selection:bg-indigo-500/20 selection:text-indigo-900">
      
      {/* Header Bar */}
      <header className="bg-white border-b border-slate-200 h-16 px-4 md:px-8 flex justify-between items-center sticky top-0 z-50 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3">
            {/* Salesland Text Logo */}
            <div className="flex items-center bg-[#104a60] px-3.5 py-1.5 rounded-lg shadow-xs select-none">
              <span className="text-white font-black text-sm tracking-tighter">SALES</span>
              <span className="text-slate-300 font-extrabold text-sm tracking-tighter">LAND</span>
            </div>

            {/* Orange Xiaomi Logo (Requested only in the header) */}
            <div className="flex items-center select-none" title="Xiaomi Corporate">
              <svg viewBox="0 0 512 512" className="w-8 h-8 rounded-lg shadow-xs">
                <rect width="512" height="512" rx="130" fill="#FF6700"/>
                <path d="M125 190h65v34c14-23 37-39 68-39h60c32 0 60 26 60 59v118h-45v-96c0-15-12-28-28-28h-35c-15 0-28 13-28 28v96h-45v-96c0-15-12-28-28-28h-35c-15 0-28 13-28 28v96H80V249c0-33 27-59 45-59zm272 56h35v118h-45V246z" fill="#FFF"/>
                <rect x="397" y="190" width="35" height="28" rx="4" fill="#FFF"/>
              </svg>
            </div>
          </div>
          <div className="w-px h-6 bg-slate-200 hidden sm:block mx-1"></div>
          <div>
            <h1 className="text-sm md:text-base font-black text-slate-800 leading-tight flex items-center gap-1.5 uppercase tracking-wide">
              {activeTab === 'dashboard' && 'Dashboard de Inventario'}
              {activeTab === 'stockDetail' && 'Detalle Almacenes'}
              {activeTab === 'gfkSegments' && 'Segmentación GFK'}
              {activeTab === 'profile' && 'Perfil de Promotor'}
            </h1>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest hidden sm:block">
              Módulo Xiaomi · Salesland Control
            </p>
          </div>
        </div>

        {/* Action Controls & User Picker */}
        <div className="flex items-center gap-3 md:gap-5">
          {/* Day Selector */}
          <div className="flex items-center bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-full gap-2">
            <Calendar className="text-indigo-600 w-3.5 h-3.5" />
            <span className="text-xs font-semibold text-slate-600">Día: </span>
            <select 
              value={selectedDate} 
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-xs font-bold text-indigo-600 border-none focus:ring-0 cursor-pointer p-0 pr-6"
            >
              <option value="2026-07-06">06 Jul 2026</option>
              <option value="2026-07-07">07 Jul 2026</option>
              <option value="2026-07-08">08 Jul 2026</option>
              <option value="2026-07-09">09 Jul 2026</option>
              <option value="2026-07-10">10 Jul 2026</option>
              <option value="2026-07-11">11 Jul 2026</option>
              <option value="2026-07-12">12 Jul 2026</option>
            </select>
          </div>

          {/* User selector with Role Indicator */}
          <div className="relative">
            <button 
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-3 py-1.5 rounded-lg text-left transition-all duration-150 cursor-pointer"
            >
              <div className="w-7 h-7 rounded-full bg-slate-700 border border-indigo-400 text-white flex items-center justify-center font-bold text-xs shadow-xs uppercase">
                {currentUser.name.charAt(0)}
              </div>
              <div className="hidden md:block">
                <p className="text-xs font-semibold text-slate-800 leading-tight truncate max-w-[150px]">{currentUser.name}</p>
                <p className="text-[9px] text-slate-500 font-medium uppercase">{currentUser.role} {currentUser.region ? `· ${currentUser.region}` : '· Acceso Total'}</p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-3 z-50 overflow-hidden">
                <div className="px-4 pb-3 border-b border-slate-100 text-center sm:text-left">
                  <p className="text-xs font-bold text-slate-800">{currentUser.name}</p>
                  <p className="text-[10px] text-slate-500 uppercase font-semibold mt-0.5">{currentUser.role}</p>
                  {currentUser.region && (
                    <p className="text-[10px] text-indigo-600 font-medium mt-1">Región: {currentUser.region}</p>
                  )}
                  {currentUser.center && (
                    <p className="text-[10px] text-slate-500 truncate mt-0.5" title={currentUser.center}>Tienda: {currentUser.center}</p>
                  )}
                </div>
                <div className="px-2 pt-2">
                  <button
                    onClick={() => {
                      setIsLoggedIn(false);
                      setLoginUsername('');
                      setLoginPassword('');
                      setShowUserMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    Cerrar Sesión
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Active Side Filters Sidebar - Visible on Desktop */}
        <aside className="hidden lg:flex flex-col bg-[#104a60] w-64 shrink-0 text-slate-100 shadow-lg overflow-y-auto custom-scrollbar border-r border-[#145a70]/50">
          
          <div className="p-5 flex items-center space-x-3 bg-[#0d3b4d] border-b border-[#145a70]/40">
            <div className="w-8 h-8 bg-white/10 rounded flex items-center justify-center border border-white/20">
              <SlidersHorizontal className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-0.5 tracking-tighter">
                <span className="text-white font-extrabold text-base leading-none">SALES</span>
                <span className="text-slate-300 font-extrabold text-base leading-none">LAND</span>
              </div>
              <span className="text-indigo-200 font-extrabold text-[9px] uppercase tracking-wider block mt-1">Control de Stock</span>
            </div>
          </div>

          <div className="p-4 space-y-4 flex-1">
            <div className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest mb-2 px-2">Filtros Operativos</div>

            {/* Region Filter - LOCKED for GPV / promotor role */}
            <div className="flex flex-col gap-1">
              <label className="text-slate-200 text-[10px] uppercase font-bold tracking-wider px-1 flex items-center justify-between">
                Región
                {(currentUser.role === 'GPV' || currentUser.role === 'promotor') && <Lock className="w-3 h-3 text-indigo-300" />}
              </label>
              <div className="relative">
                <select 
                  value={activeFilters.region}
                  disabled={currentUser.role === 'GPV' || currentUser.role === 'promotor'}
                  onChange={(e) => setSelectedRegion(e.target.value)}
                  className={`w-full bg-[#145a70] text-white text-xs border border-[#1d7693] rounded-md py-2.5 pl-3 pr-8 appearance-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400 transition-all font-medium ${currentUser.role === 'GPV' || currentUser.role === 'promotor' ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  {regionsList.map(r => <option key={r} value={r} className="bg-[#104a60] text-white">{r}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-3 w-4 h-4 text-slate-200 pointer-events-none" />
              </div>
            </div>

            {/* Zone Filter - LOCKED for promotor role */}
            <div className="flex flex-col gap-1">
              <label className="text-slate-200 text-[10px] uppercase font-bold tracking-wider px-1 flex items-center justify-between">
                Zona
                {currentUser.role === 'promotor' && <Lock className="w-3 h-3 text-indigo-300" />}
              </label>
              <div className="relative">
                <select 
                  value={activeFilters.zone}
                  disabled={currentUser.role === 'promotor'}
                  onChange={(e) => setSelectedZone(e.target.value)}
                  className={`w-full bg-[#145a70] text-white text-xs border border-[#1d7693] rounded-md py-2.5 pl-3 pr-8 appearance-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400 transition-all font-medium ${currentUser.role === 'promotor' ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  {zonesList.map(z => <option key={z} value={z} className="bg-[#104a60] text-white">{z}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-3 w-4 h-4 text-slate-200 pointer-events-none" />
              </div>
            </div>

            {/* Punto de Venta (PR) Filter */}
            <div className="flex flex-col gap-1">
              <label className="text-slate-200 text-[10px] uppercase font-bold tracking-wider px-1">PR (Punto de Venta)</label>
              <div className="relative">
                <select 
                  value={selectedPR}
                  onChange={(e) => setSelectedPR(e.target.value)}
                  className="w-full bg-[#145a70] text-white text-xs border border-[#1d7693] rounded-md py-2.5 pl-3 pr-8 appearance-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400 transition-all font-medium cursor-pointer"
                >
                  {prsList.map(pr => <option key={pr} value={pr} className="bg-[#104a60] text-white">{pr === 'Todos' ? 'Todos' : `PR ${pr}`}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-3 w-4 h-4 text-slate-200 pointer-events-none" />
              </div>
            </div>

            {/* Store Name Filter - LOCKED for promotor role */}
            <div className="flex flex-col gap-1">
              <label className="text-slate-200 text-[10px] uppercase font-bold tracking-wider px-1 flex items-center justify-between">
                Nombre Tienda
                {currentUser.role === 'promotor' && <Lock className="w-3 h-3 text-indigo-300" />}
              </label>
              <div className="relative">
                <select 
                  value={activeFilters.store}
                  disabled={currentUser.role === 'promotor'}
                  onChange={(e) => setSelectedStore(e.target.value)}
                  className={`w-full bg-[#145a70] text-white text-xs border border-[#1d7693] rounded-md py-2.5 pl-3 pr-8 appearance-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400 transition-all font-medium ${currentUser.role === 'promotor' ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  {storesList.map(s => <option key={s} value={s} className="bg-[#104a60] text-white">{s}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-3 w-4 h-4 text-slate-200 pointer-events-none" />
              </div>
            </div>

            {/* GFK Segment / Familia Selectors */}
            <div className="flex flex-col gap-1">
              <label className="text-slate-200 text-[10px] uppercase font-bold tracking-wider px-1">Segmento GFK</label>
              <div className="relative">
                <select 
                  value={selectedSegment}
                  onChange={(e) => setSelectedSegment(e.target.value)}
                  className="w-full bg-[#145a70] text-white text-xs border border-[#1d7693] rounded-md py-2.5 pl-3 pr-8 appearance-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400 transition-all font-medium cursor-pointer"
                >
                  <option value="Todos" className="bg-[#104a60] text-white">Todos</option>
                  <option value="Segmento Premium" className="bg-[#104a60] text-white">Segmento Premium</option>
                  <option value="Segmento C" className="bg-[#104a60] text-white">Segmento C</option>
                  <option value="Segmento B" className="bg-[#104a60] text-white">Segmento B</option>
                  <option value="Otros Segmentos" className="bg-[#104a60] text-white">Otros Segmentos</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-3 w-4 h-4 text-slate-200 pointer-events-none" />
              </div>
            </div>

            {/* Product Selector */}
            <div className="flex flex-col gap-1">
              <label className="text-slate-200 text-[10px] uppercase font-bold tracking-wider px-1">Modelo / Producto</label>
              <div className="relative">
                <select 
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                  className="w-full bg-[#145a70] text-white text-xs border border-[#1d7693] rounded-md py-2.5 pl-3 pr-8 appearance-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400 transition-all font-medium cursor-pointer"
                >
                  {productsList.map(p => <option key={p} value={p} className="bg-[#104a60] text-white">{p}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-3 w-4 h-4 text-slate-200 pointer-events-none" />
              </div>
            </div>

            <button 
              onClick={handleClearFilters}
              className="w-full mt-6 flex items-center justify-center gap-2 py-2.5 px-4 rounded bg-[#FF6700] hover:bg-[#e05e00] text-white transition-all duration-150 font-bold text-xs shadow-sm active:scale-97 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Limpiar Filtros
            </button>
          </div>

          {/* Navigation Bar at the Bottom of Sidebar */}
          <nav className="p-3 border-t border-[#145a70]/40 space-y-1 bg-[#0d3b4d]/50">
            <div className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest mb-2 px-2">Menú Principal</div>
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer ${activeTab === 'dashboard' ? 'bg-[#145a70] text-white shadow-xs border border-white/10' : 'text-slate-200 hover:bg-[#145a70]/60'}`}
            >
              <Layers className="w-4 h-4 text-indigo-300" />
              Dashboard Global
            </button>
            <button 
              onClick={() => setActiveTab('stockDetail')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer ${activeTab === 'stockDetail' ? 'bg-[#145a70] text-white shadow-xs border border-white/10' : 'text-slate-200 hover:bg-[#145a70]/60'}`}
            >
              <Building2 className="w-4 h-4 text-indigo-300" />
              Detalle Almacenes
            </button>
            <button 
              onClick={() => setActiveTab('gfkSegments')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer ${activeTab === 'gfkSegments' ? 'bg-[#145a70] text-white shadow-xs border border-white/10' : 'text-slate-200 hover:bg-[#145a70]/60'}`}
            >
              <TrendingUpIcon className="w-4 h-4 text-indigo-300" />
              Segmentos GFK
            </button>
            <button 
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer ${activeTab === 'profile' ? 'bg-[#145a70] text-white shadow-xs border border-white/10' : 'text-slate-200 hover:bg-[#145a70]/60'}`}
            >
              <User className="w-4 h-4" />
              Perfil y Planilla
            </button>
          </nav>
        </aside>

        {/* Main Panel View Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar space-y-6 pb-24 lg:pb-12">
          
          {/* Sincronizando stock real desde Apps Script */}
          {isSyncingRealStock && (
            <div className="bg-indigo-50 border border-indigo-200 px-4 py-2.5 rounded-xl flex items-center gap-2 text-xs text-indigo-800 font-semibold shadow-xs">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse shrink-0"></span>
              <span>Sincronizando stock real desde Google Sheets...</span>
            </div>
          )}

          {/* Error al sincronizar con el backend real */}
          {importError && !isSyncingRealStock && (
            <div className="bg-rose-50 border border-rose-200 px-4 py-2.5 rounded-xl flex items-center gap-2 text-xs text-rose-800 font-semibold shadow-xs">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{importError}</span>
            </div>
          )}

          {/* Status badge when using custom Google Sheets data */}
          {importLog && (
            <div className="bg-emerald-50 border border-emerald-200 px-4 py-2.5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-emerald-800 font-semibold shadow-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                <span>Datos de Stock actualizados desde Google Sheets: <strong className="font-extrabold">{importLog.fileName}</strong> ({importLog.rows.toLocaleString()} registros de {importLog.stores} tiendas)</span>
              </div>
              <button 
                onClick={handleResetToDefault}
                className="text-emerald-700 hover:text-rose-600 font-extrabold uppercase text-[10px] tracking-wider transition-colors bg-white px-2.5 py-1 rounded border border-emerald-200 hover:border-rose-200 cursor-pointer self-start sm:self-center shrink-0"
              >
                Restablecer a plantilla
              </button>
            </div>
          )}

          {/* Active filter pills warning */}
          {(currentUser.role === 'GPV' || currentUser.role === 'promotor') && (
            <div className="bg-emerald-50 border border-emerald-200 px-4 py-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-emerald-800 font-semibold shadow-sm">
              <span className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                {currentUser.role === 'GPV' ? (
                  <span>Acceso restringido: Iniciado como GPV regional. Los datos mostrados están limitados a tu región (<strong>{currentUser.region}</strong>).</span>
                ) : (
                  <span>Acceso restringido: Iniciado como Promotor. Los datos mostrados están limitados a tu tienda asignada (<strong>{currentUser.center}</strong>).</span>
                )}
              </span>
            </div>
          )}

          {/* Quick Metrics Summary Cards (Visible across tabs) */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <div className="bg-white border border-slate-200 p-4 md:p-6 rounded-xl shadow-sm relative overflow-hidden flex flex-col justify-between h-32 hover:shadow-md transition-all border-l-4 border-l-emerald-500">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Stock Tienda</p>
                <p className="text-xl md:text-3xl font-extrabold text-slate-900 mt-1">{totals.tienda.toLocaleString()}</p>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center text-emerald-600 font-bold"><TrendingUp className="w-3.5 h-3.5 mr-0.5" /> +12%</span>
                <span className="font-semibold text-[10px] text-slate-400">vs mes anterior</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-4 md:p-6 rounded-xl shadow-sm relative overflow-hidden flex flex-col justify-between h-32 hover:shadow-md transition-all border-l-4 border-l-amber-500">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">En Tránsito</p>
                <p className="text-xl md:text-3xl font-extrabold text-amber-600 mt-1">{totals.transito.toLocaleString()}</p>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center text-rose-500 font-bold"><TrendingDown className="w-3.5 h-3.5 mr-0.5" /> -4%</span>
                <span className="font-semibold text-[10px] text-slate-400">vs mes anterior</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-4 md:p-6 rounded-xl shadow-sm relative overflow-hidden flex flex-col justify-between h-32 hover:shadow-md transition-all border-l-4 border-l-indigo-500">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Crossdock</p>
                <p className="text-xl md:text-3xl font-extrabold text-slate-900 mt-1">{totals.crossdock.toLocaleString()}</p>
              </div>
              <div className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
                <Truck className="w-3.5 h-3.5 text-indigo-500" /> Loc. ID 2
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-4 md:p-6 rounded-xl shadow-sm relative overflow-hidden flex flex-col justify-between h-32 hover:shadow-md transition-all border-l-4 border-l-violet-500">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Exposición</p>
                <p className="text-xl md:text-3xl font-extrabold text-violet-600 mt-1">{totals.exposicion.toLocaleString()}</p>
              </div>
              <div className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
                <Tv className="w-3.5 h-3.5 text-violet-500" /> Loc. ID 5
              </div>
            </div>
          </section>

          {/* ==================== 1. DASHBOARD VIEW ==================== */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              
              {/* Stacked Chart & Donut Chart */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Custom SVG Stacked Bar Chart */}
                <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col justify-between">
                  <div className="mb-4">
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                      Stock por Categoría y Almacén (Uds)
                    </h3>
                    <p className="text-xs text-slate-400">Distribución de volumen físico en base a la familia corporativa</p>
                  </div>

                  <div className="relative h-64 w-full flex items-end justify-around pb-6 border-b border-slate-100 mt-2">
                    {/* SVG Chart Background Lines */}
                    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-6">
                      <div className="w-full border-t border-slate-50"></div>
                      <div className="w-full border-t border-slate-50"></div>
                      <div className="w-full border-t border-slate-50"></div>
                      <div className="w-full border-t border-slate-50"></div>
                    </div>

                    {/* Chart Bars */}
                    {stackedChartData.map((data, idx) => {
                      const maxTotal = Math.max(...stackedChartData.map(d => d.total)) || 1;
                      const scale = 180 / maxTotal;

                      const tH = data.Tienda * scale;
                      const trH = data.Tránsito * scale;
                      const cH = data.Crossdock * scale;
                      const eH = data.Exposición * scale;

                      return (
                        <div 
                          key={data.category} 
                          className="flex flex-col items-center w-1/5 group relative z-10 cursor-pointer"
                          onMouseEnter={() => setHoveredStackBar(idx)}
                          onMouseLeave={() => setHoveredStackBar(null)}
                        >
                          <div className="w-10 rounded-t-sm overflow-hidden flex flex-col-reverse shadow-xs transition-transform duration-150 group-hover:scale-105">
                            {/* Tienda (Green) */}
                            <div style={{ height: `${tH}px` }} className="bg-emerald-500 w-full"></div>
                            {/* Tránsito (Orange/Amber) */}
                            <div style={{ height: `${trH}px` }} className="bg-amber-500 w-full"></div>
                            {/* Crossdock (Blue) */}
                            <div style={{ height: `${cH}px` }} className="bg-indigo-500 w-full"></div>
                                                    <div style={{ height: `${eH}px` }} className="bg-violet-500 w-full"></div>
                          </div>

                          <span className="text-[10px] font-black text-slate-500 mt-2 text-center leading-tight truncate max-w-full">
                            {data.category}
                          </span>

                          {/* Hover Tooltip */}
                          {hoveredStackBar === idx && (
                            <div className="absolute bottom-full mb-2 bg-slate-900 text-white p-3 rounded-lg shadow-xl text-[10px] w-48 space-y-1 z-30">
                              <p className="font-extrabold border-b border-slate-800 pb-1 text-xs text-indigo-400">{data.category}</p>
                              <p className="flex justify-between"><span>Tienda:</span> <span className="font-bold text-emerald-400">{data.Tienda.toLocaleString()}</span></p>
                              <p className="flex justify-between"><span>Tránsito:</span> <span className="font-bold text-amber-400">{data.Tránsito.toLocaleString()}</span></p>
                              <p className="flex justify-between"><span>Crossdock:</span> <span className="font-bold text-indigo-400">{data.Crossdock.toLocaleString()}</span></p>
                              <p className="flex justify-between"><span>Exposición:</span> <span className="font-bold text-violet-400">{data.Exposición.toLocaleString()}</span></p>
                              <p className="flex justify-between border-t border-slate-800 pt-1 font-bold text-white text-xs"><span>Total:</span> <span>{data.total.toLocaleString()}</span></p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Custom Legend */}
                  <div className="flex justify-center gap-4 mt-4 flex-wrap">
                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                      <span className="w-2.5 h-2.5 rounded bg-emerald-500"></span> Tienda
                    </span>
                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                      <span className="w-2.5 h-2.5 rounded bg-amber-500"></span> Tránsito
                    </span>
                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                      <span className="w-2.5 h-2.5 rounded bg-indigo-500"></span> Crossdock
                    </span>
                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                      <span className="w-2.5 h-2.5 rounded bg-violet-500"></span> Exposición
                    </span>
                  </div>
                </div>

                {/* Donut Chart (Segmentos GFK) */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">Distribución por Familias</h3>
                    <p className="text-xs text-slate-400">Distribución de stock consolidado</p>
                  </div>

                  <div className="h-44 flex items-center justify-center relative my-4">
                    {/* SVG Donut Circle */}
                    <svg className="w-36 h-36" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="40" fill="transparent" stroke="#ebeef3" strokeWidth="12" />
                      {(() => {
                        let accumulatedPercent = 0;
                        return familyDonutData.segments.map((seg, idx) => {
                          const percent = familyDonutData.total > 0 ? (seg.value / familyDonutData.total) * 100 : 0;
                          const strokeDasharray = `${percent} ${100 - percent}`;
                          const strokeDashoffset = -accumulatedPercent;
                          accumulatedPercent += percent;

                          return (
                            <circle
                              key={seg.name}
                              cx="50"
                              cy="50"
                              r="40"
                              fill="transparent"
                              stroke={seg.color}
                              strokeWidth="12"
                              strokeDasharray={strokeDasharray}
                              strokeDashoffset={strokeDashoffset}
                              transform="rotate(-90 50 50)"
                              className="transition-all duration-300 cursor-pointer hover:stroke-indigo-600"
                              style={{ strokeDasharray, strokeDashoffset }}
                              onMouseEnter={() => setHoveredDonutIdx(idx)}
                              onMouseLeave={() => setHoveredDonutIdx(null)}
                            />
                          );
                        });
                      })()}
                    </svg>

                    {/* Central metric text */}
                    <div className="absolute text-center">
                      <p className="text-2xl font-black text-slate-800">
                        {familyDonutData.total > 1000 ? `${(familyDonutData.total / 1000).toFixed(1)}k` : familyDonutData.total}
                      </p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Total Uds</p>
                    </div>
                  </div>

                  {/* Donut Legend */}
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-semibold text-slate-700">
                    {familyDonutData.segments.map((s, idx) => (
                      <div 
                        key={s.name} 
                        className={`flex items-center gap-1.5 p-1.5 rounded transition-all ${hoveredDonutIdx === idx ? 'bg-slate-50 border border-slate-100 scale-102 shadow-xs' : 'border border-transparent'}`}
                      >
                        <span style={{ backgroundColor: s.color }} className="w-2.5 h-2.5 rounded-full shrink-0"></span>
                        <div className="truncate">
                          <p className="text-slate-400 truncate text-[9px] font-bold">{s.name}</p>
                          <p className="font-extrabold text-slate-800">{s.value.toLocaleString()} uds</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sparklines mini charts widgets row */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {[
                  { name: 'Smartphones', value: '42.1k', color: '#4f46e5', wave: [1, 2, 4, 3, 5, 4, 7] },
                  { name: 'Audio', value: '12.5k', color: '#818cf8', wave: [5, 4, 3, 6, 2, 5, 8] },
                  { name: 'Scooters', value: '3.2k', color: '#10b981', wave: [2, 3, 2, 5, 4, 6, 9] },
                  { name: 'Laptops', value: '1.8k', color: '#8b5cf6', wave: [4, 5, 3, 2, 4, 6, 5] },
                  { name: 'Lifestyle', value: '28.4k', color: '#f59e0b', wave: [3, 2, 4, 3, 5, 4, 6] },
                  { name: 'Accessories', value: '27.8k', color: '#475569', wave: [6, 4, 3, 5, 4, 3, 5] }
                ].map((kpi) => (
                  <div key={kpi.name} className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex flex-col justify-between h-28 hover:shadow-md transition-shadow">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{kpi.name}</span>
                    <div className="flex items-end justify-between">
                      <span className="text-lg font-extrabold text-slate-800">{kpi.value}</span>
                      {/* Mini spark bar line */}
                      <div className="flex gap-0.5 items-end h-8">
                        {kpi.wave.map((h, i) => (
                          <div 
                            key={i} 
                            style={{ 
                              height: `${h * 10}%`, 
                              backgroundColor: kpi.color,
                              opacity: i === kpi.wave.length - 1 ? 1 : 0.4
                            }} 
                            className="w-1.5 rounded-t-xs"
                          ></div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Regional group comparison chart (Grouped Bar Chart) */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg text-indigo-600">public</span>
                    Consolidado de Stock por Región de Distribución
                  </h3>
                  <p className="text-xs text-slate-400">Análisis comparativo por tipo de almacén y zona geográfica nacional</p>
                </div>

                <div className="relative h-72 w-full flex items-end justify-around pb-6 border-b border-slate-100 mt-6">
                  {/* Grid Lines */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-6">
                    <div className="w-full border-t border-slate-50"></div>
                    <div className="w-full border-t border-slate-50"></div>
                    <div className="w-full border-t border-slate-50"></div>
                    <div className="w-full border-t border-slate-50"></div>
                  </div>

                  {regionalChartData.map((data, storeIdx) => {
                    const maxVal = Math.max(...regionalChartData.map(d => Math.max(d.Tienda, d.Tránsito, d.Crossdock, d.Exposición))) || 1;
                    const scale = 200 / maxVal;

                    const datasets = [
                      { label: 'Tienda', value: data.Tienda, color: '#10b981' },
                      { label: 'Tránsito', value: data.Tránsito, color: '#f59e0b' },
                      { label: 'Crossdock', value: data.Crossdock, color: '#6366f1' },
                      { label: 'Exposición', value: data.Exposición, color: '#8b5cf6' }
                    ];

                    return (
                      <div key={data.region} className="flex flex-col items-center w-[15%] relative z-10">
                        
                        {/* Group of 4 bars */}
                        <div className="flex items-end gap-1">
                          {datasets.map((ds, datasetIdx) => {
                            const barH = ds.value * scale;
                            const isHovered = hoveredRegionBar?.storeIndex === storeIdx && hoveredRegionBar?.datasetIndex === datasetIdx;

                            return (
                              <div
                                key={ds.label}
                                style={{ height: `${Math.max(barH, 4)}px`, backgroundColor: ds.color }}
                                className="w-2.5 rounded-t-xs transition-all duration-150 cursor-pointer hover:brightness-95 hover:scale-x-110"
                                onMouseEnter={() => setHoveredRegionBar({ storeIndex: storeIdx, datasetIndex: datasetIdx })}
                                onMouseLeave={() => setHoveredRegionBar(null)}
                              >
                                {isHovered && (
                                  <div className="absolute bottom-full mb-2 -translate-x-1/2 left-1/2 bg-slate-900 text-white p-2.5 rounded shadow-xl text-[10px] w-36 z-50 pointer-events-none">
                                    <p className="font-extrabold text-indigo-400 text-center border-b border-slate-800 pb-0.5 mb-1">{data.region}</p>
                                    <p className="flex justify-between"><span>{ds.label}:</span> <span className="font-black" style={{ color: ds.color }}>{ds.value.toLocaleString()} uds</span></p>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        <span className="text-[10px] font-bold text-slate-500 mt-3 text-center truncate max-w-full leading-tight">
                          {data.region}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Group Legend */}
                <div className="flex justify-center gap-4 mt-4 flex-wrap">
                  <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Tienda
                  </span>
                  <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Tránsito
                  </span>
                  <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span> Crossdock
                  </span>
                  <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                    <span className="w-2.5 h-2.5 rounded-full bg-violet-500"></span> Exposición
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ==================== 2. STOCK DETAIL VIEW ==================== */}
          {activeTab === 'stockDetail' && (
            <div className="space-y-6">
              
              {/* Detailed tables for each warehouse */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {[
                  { name: 'Tienda', type: 'Tienda' as AlmacenType, color: 'border-t-emerald-500', headerBg: 'bg-emerald-600' },
                  { name: 'Tránsito', type: 'Tránsito' as AlmacenType, color: 'border-t-amber-500', headerBg: 'bg-amber-500' },
                  { name: 'CrossDock', type: 'Crossdock' as AlmacenType, color: 'border-t-indigo-500', headerBg: 'bg-indigo-600' },
                  { name: 'Exposición', type: 'Exposición' as AlmacenType, color: 'border-t-violet-500', headerBg: 'bg-violet-600' }
                ].map((wh) => {
                  
                  // Filter records for this warehouse type
                  const whRecords = filteredRecords.filter(r => r.almacenType === wh.type);
                  
                  // Flatten products with quantity inside these records
                  const tableRows: { storeName: string; pr: number; region: string; productName: string; qty: number }[] = [];
                  whRecords.forEach(rec => {
                    Object.keys(rec.stocks).forEach(prodName => {
                      const qty = rec.stocks[prodName];
                      if (qty <= 0) return;

                      // apply product filter if set
                      if (selectedProduct !== 'Todos' && prodName !== selectedProduct) return;
                      // apply segment filter if set
                      const prodMeta = products.find(p => p.name === prodName);
                      if (selectedSegment !== 'Todos' && prodMeta?.segment !== selectedSegment) return;
                      if (searchQuery && !prodName.toLowerCase().includes(searchQuery.toLowerCase())) return;

                      tableRows.push({
                        storeName: rec.storeName,
                        pr: rec.pr,
                        region: rec.region,
                        productName: prodName,
                        qty
                      });
                    });
                  });

                  // Calculate aggregated sums
                  const totalUds = tableRows.reduce((a, b) => a + b.qty, 0);

                  return (
                    <div key={wh.name} className={`bg-white border border-slate-200 border-t-4 ${wh.color} rounded-xl shadow-sm overflow-hidden flex flex-col h-[400px]`}>
                      <div className={`${wh.headerBg} px-5 py-4 flex items-center justify-between text-white`}>
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-lg">warehouse</span>
                          <h3 className="font-extrabold text-sm uppercase tracking-wider">Detalle {wh.name} ({whRecords.length} PdV)</h3>
                        </div>
                        <span className="bg-black/10 px-3 py-1 rounded-full text-[10px] font-black tracking-wider uppercase">
                          {totalUds.toLocaleString()} unidades
                        </span>
                      </div>

                      <div className="overflow-auto flex-1 custom-scrollbar">
                        {tableRows.length > 0 ? (
                          <table className="w-full text-left table-fixed">
                            <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider z-10">
                              <tr>
                                <th className="px-5 py-3 w-2/5">Punto de Venta (PdV)</th>
                                <th className="px-5 py-3 w-2/5">Clasificación / Modelo</th>
                                <th className="px-5 py-3 w-1/5 text-right">Stock</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                              {tableRows.map((row, idx) => (
                                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                  <td className="px-5 py-3 truncate text-slate-900 font-bold" title={row.storeName}>
                                    {row.storeName}
                                  </td>
                                  <td className="px-5 py-3 truncate text-slate-500" title={row.productName}>
                                    {row.productName}
                                  </td>
                                  <td className="px-5 py-3 text-right font-bold text-indigo-600">
                                    {row.qty.toLocaleString()}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8">
                            <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">inventory_2</span>
                            <p className="text-xs font-bold uppercase tracking-wider">Sin registros activos</p>
                            <p className="text-[10px] text-slate-400 mt-1">Prueba a limpiar o cambiar los filtros de búsqueda.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ==================== 3. GFK SEGMENTS VIEW ==================== */}
          {activeTab === 'gfkSegments' && (
            <div className="space-y-6">
              
              {/* Filter controls & Search */}
              <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">Clasificaciones y Segmentos GFK</h3>
                    <p className="text-xs text-slate-400">Análisis detallado de stock agrupado por nivel de gama de producto</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleClearFilters()}
                      className="bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Limpiar
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
                  {['Todos', 'Segmento Premium', 'Segmento C', 'Segmento B', 'Otros Segmentos'].map((seg) => {
                    const colors: Record<string, string> = {
                      'Todos': 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200',
                      'Segmento Premium': 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200',
                      'Segmento C': 'bg-slate-50 text-slate-600 hover:bg-slate-200 border border-slate-200',
                      'Segmento B': 'bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200',
                      'Otros Segmentos': 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
                    };

                    const activeColors: Record<string, string> = {
                      'Todos': 'bg-indigo-600 text-white shadow-sm',
                      'Segmento Premium': 'bg-amber-600 text-white shadow-sm',
                      'Segmento C': 'bg-slate-600 text-white shadow-sm',
                      'Segmento B': 'bg-orange-600 text-white shadow-sm',
                      'Otros Segmentos': 'bg-purple-600 text-white shadow-sm'
                    };

                    return (
                      <button
                        key={seg}
                        onClick={() => {
                          setActiveGFKFilter(seg);
                          setSelectedSegment(seg === 'Todos' ? 'Todos' : seg);
                        }}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${activeGFKFilter === seg ? activeColors[seg] : colors[seg]}`}
                      >
                        {seg === 'Todos' ? 'Todos los Segmentos' : seg}
                      </button>
                    );
                  })}
                </div>

                {/* GFK Search bar */}
                <div className="relative">
                  <span className="absolute left-3 top-3 text-slate-400">
                    <Search className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    placeholder="Buscar por modelo o producto (ej: Ultra, Redmi, Cargador...)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 text-xs font-semibold border border-slate-200 rounded-lg py-2.5 pl-9 pr-4 placeholder:text-slate-400 text-slate-800 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Detailed tables segmented by GFK level */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {[
                  { name: 'Segmento Premium', color: 'border-t-amber-500', headerBg: 'bg-amber-500', icon: 'workspace_premium' },
                  { name: 'Segmento C', color: 'border-t-slate-500', headerBg: 'bg-slate-600', icon: 'category' },
                  { name: 'Segmento B', color: 'border-t-orange-500', headerBg: 'bg-orange-500', icon: 'token' },
                  { name: 'Otros Segmentos', color: 'border-t-purple-500', headerBg: 'bg-purple-500', icon: 'more_horiz' }
                ].filter(seg => activeGFKFilter === 'Todos' || seg.name === activeGFKFilter).map((seg) => {
                  
                  // Flatten products belonging to this segment
                  const rows: { storeName: string; region: string; productName: string; qty: number; pr: number }[] = [];
                  filteredRecords.forEach(rec => {
                    Object.keys(rec.stocks).forEach(prodName => {
                      const qty = rec.stocks[prodName];
                      if (qty <= 0) return;

                      // match GFK segment
                      const pMeta = products.find(p => p.name === prodName);
                      if (pMeta?.segment !== seg.name) return;

                      // match search query
                      if (searchQuery && !prodName.toLowerCase().includes(searchQuery.toLowerCase())) return;
                      // match selected product
                      if (selectedProduct !== 'Todos' && prodName !== selectedProduct) return;

                      rows.push({
                        storeName: rec.storeName,
                        region: rec.region,
                        productName: prodName,
                        qty,
                        pr: rec.pr
                      });
                    });
                  });

                  const totalUds = rows.reduce((sum, r) => sum + r.qty, 0);

                  return (
                    <div key={seg.name} className={`bg-white border border-slate-200 border-t-4 ${seg.color} rounded-xl shadow-sm overflow-hidden flex flex-col h-[400px]`}>
                      <div className={`${seg.headerBg} px-5 py-4 flex items-center justify-between text-white`}>
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-lg">{seg.icon}</span>
                          <h3 className="font-extrabold text-sm uppercase tracking-wider">{seg.name}</h3>
                        </div>
                        <span className="bg-black/10 px-3 py-1 rounded-full text-[10px] font-black tracking-wider uppercase">
                          {totalUds.toLocaleString()} uds
                        </span>
                      </div>

                      <div className="overflow-auto flex-1 custom-scrollbar">
                        {rows.length > 0 ? (
                          <table className="w-full text-left table-fixed">
                            <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider z-10">
                              <tr>
                                <th className="px-5 py-3 w-1/3">Nombre Tienda</th>
                                <th className="px-5 py-3 w-1/3">Modelo / Producto</th>
                                <th className="px-5 py-3 w-1/6">Región</th>
                                <th className="px-5 py-3 w-1/6 text-right">Stock</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                              {rows.map((row, rIdx) => (
                                <tr key={rIdx} className="hover:bg-slate-50 transition-colors">
                                  <td className="px-5 py-3 truncate text-slate-900 font-bold" title={row.storeName}>{row.storeName}</td>
                                  <td className="px-5 py-3 truncate text-slate-500" title={row.productName}>{row.productName}</td>
                                  <td className="px-5 py-3"><span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] uppercase font-bold">{row.region}</span></td>
                                  <td className="px-5 py-3 text-right font-bold text-indigo-600">{row.qty}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8 text-center">
                            <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">dashboard_customize</span>
                            <p className="text-xs font-bold uppercase tracking-wider">Sin productos activos</p>
                            <p className="text-[10px] text-slate-400 mt-1">No hay stock registrado para esta gama con los filtros actuales.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ==================== 4. PROFILE / SCHEDULE VIEW ==================== */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              
              {/* Profile card summary */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row items-center gap-6">
                <div className="w-20 h-20 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-3xl shadow-md uppercase">
                  {currentUser.name.charAt(0)}
                </div>
                <div className="text-center md:text-left space-y-1 flex-1">
                  <h3 className="text-lg font-bold text-slate-900">{currentUser.name}</h3>
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-1">
                    <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                      Usuario: {currentUser.username}
                    </span>
                    <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                      Rol: {currentUser.role}
                    </span>
                    <span className="bg-emerald-50 border border-emerald-100 text-emerald-700 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                      Región Asignada: {currentUser.region || 'Acceso Global (Manager)'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-2 font-medium">
                    {currentUser.role === 'Manager' 
                      ? 'Como Manager tienes permisos de administrador para visualizar y auditar todas las regiones, almacenes y promotores a nivel nacional.' 
                      : `Como GPV estás asignado para gestionar el stock y las planillas de la región de ${currentUser.region}. El filtro de región está bloqueado para garantizar el cumplimiento de zona.`
                    }
                  </p>
                </div>
              </div>

              {/* Conexión a Google Sheets (Origen de Inventario) */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden text-left">
                <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <svg className="w-4 h-4 text-emerald-600 shrink-0" viewBox="0 0 24 24">
                        <g fill="none">
                          <path d="M19.43 12.98l-6.23-10.8c-.37-.64-1.05-1.04-1.8-1.04H6.23c-.75 0-1.43.4-1.8 1.04l-3.1 5.37L10.3 22l9.13-9.02z" fill="#4285F4"/>
                          <path d="M10.3 22l6.23-10.8c.37-.64.37-1.44 0-2.08L11.53 1H6.23L1.33 9.48z" fill="#34A853"/>
                          <path d="M19.43 12.98L13.2 22h-6.2l6.23-10.8c.37-.64 1.05-1.04 1.8-1.04h6.2z" fill="#FBBC05"/>
                        </g>
                      </svg>
                      Conexión a Google Sheets / Drive
                    </h3>
                    <p className="text-xs text-slate-400">Sincroniza y actualiza el stock de la aplicación en tiempo real desde la nube.</p>
                  </div>
                  {importLog ? (
                    <span className="bg-emerald-50 border border-emerald-100 text-emerald-700 text-[11px] font-extrabold px-3 py-1 rounded-full flex items-center gap-1.5 self-start sm:self-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Sincronizado
                    </span>
                  ) : (
                    <span className="bg-slate-100 text-slate-500 text-[11px] font-extrabold px-3 py-1 rounded-full self-start sm:self-center">
                      Datos por Defecto
                    </span>
                  )}
                </div>

                <div className="p-5">
                  {!driveUser ? (
                    <div className="flex flex-col items-center justify-center py-6 text-center max-w-xl mx-auto">
                      <p className="text-xs text-slate-500 font-semibold mb-4 leading-relaxed">
                        Inicia sesión con tu cuenta de Google para seleccionar y vincular directamente cualquier hoja de cálculo o Excel con formato de stock.
                      </p>
                      <button 
                        onClick={handleDriveSignIn}
                        className="flex items-center gap-3 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs border border-slate-300 rounded-lg px-4 py-2.5 transition-all shadow-xs active:scale-97 cursor-pointer"
                      >
                        <svg className="w-4 h-4 shrink-0" viewBox="0 0 48 48">
                          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                        </svg>
                        <span>Conectar Cuenta de Google</span>
                      </button>
                      {driveError && (
                        <p className="text-rose-600 font-bold text-[10px] mt-3 bg-rose-50 border border-rose-100 rounded px-2.5 py-1">{driveError}</p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* User panel */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50 border border-slate-200 rounded-lg p-3.5 gap-3">
                        <div className="flex items-center gap-2.5">
                          {driveUser.photoURL ? (
                            <img src={driveUser.photoURL} alt={driveUser.displayName || 'Google User'} className="w-8 h-8 rounded-full border border-slate-200" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-[#104a60] text-white flex items-center justify-center font-bold text-xs uppercase">
                              {driveUser.displayName?.[0] || 'G'}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 leading-tight truncate">{driveUser.displayName}</p>
                            <p className="text-[10px] text-slate-500 leading-none truncate">{driveUser.email}</p>
                          </div>
                        </div>
                        <button 
                          onClick={handleDriveSignOut}
                          className="text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-200 hover:border-rose-600 px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer shrink-0 self-start sm:self-center"
                        >
                          Desconectar Google Drive
                        </button>
                      </div>

                      {driveError && (
                        <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-[11px] text-rose-800 font-semibold">
                          <p className="font-extrabold uppercase text-[9px] tracking-wider text-rose-700">Error</p>
                          <p className="mt-0.5">{driveError}</p>
                        </div>
                      )}

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Google Sheets selector */}
                        <div className="space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Hojas de cálculo en Drive</span>
                            <div className="flex items-center gap-2">
                              <div className="flex bg-slate-100 p-0.5 rounded border border-slate-200">
                                <button
                                  onClick={() => setDriveFilter('all')}
                                  className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all duration-150 ${driveFilter === 'all' ? 'bg-[#104a60] text-white shadow-xs' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                  Todos
                                </button>
                                <button
                                  onClick={() => setDriveFilter('sheets')}
                                  className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all duration-150 ${driveFilter === 'sheets' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                  Sheets
                                </button>
                              </div>
                              <button 
                                onClick={() => fetchDriveFiles(driveToken!)}
                                className="text-[#104a60] hover:text-[#FF6700] text-xs font-bold p-1 rounded hover:bg-slate-100 cursor-pointer transition-colors"
                                title="Actualizar lista"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {isListingDrive ? (
                            <div className="flex flex-col items-center justify-center py-10 text-slate-400 bg-slate-50/50 border border-slate-100 rounded-xl">
                              <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#104a60] border-t-transparent mb-2"></div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Buscando archivos...</span>
                            </div>
                          ) : isDownloadingDrive ? (
                            <div className="flex flex-col items-center justify-center py-10 text-slate-400 bg-slate-50/50 border border-slate-100 rounded-xl">
                              <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#FF6700] border-t-transparent mb-2"></div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[#FF6700]">Procesando datos de inventario...</span>
                            </div>
                          ) : filteredDriveFiles.length === 0 ? (
                            <div className="text-center py-10 border border-slate-200 rounded-lg bg-slate-50/20">
                              <p className="text-xs text-slate-400 font-bold">No se encontraron archivos de stock en tu Drive.</p>
                            </div>
                          ) : (
                            <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-lg bg-white divide-y divide-slate-100 custom-scrollbar">
                              {filteredDriveFiles.map((file) => {
                                const isSheet = file.mimeType === 'application/vnd.google-apps.spreadsheet';
                                return (
                                  <div key={file.id} className="p-3 hover:bg-slate-50/80 transition-colors flex items-center justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-1.5">
                                        <p className="text-xs font-bold text-slate-800 truncate" title={file.name}>{file.name}</p>
                                        {isSheet ? (
                                          <span className="bg-emerald-50 text-emerald-700 text-[8px] font-extrabold uppercase px-1 rounded-sm border border-emerald-200 shrink-0">SHEET</span>
                                        ) : (
                                          <span className="bg-blue-50 text-blue-700 text-[8px] font-extrabold uppercase px-1 rounded-sm border border-blue-200 shrink-0">EXCEL</span>
                                        )}
                                      </div>
                                      <p className="text-[9px] text-slate-400 mt-0.5 font-medium">
                                        Modificado: {new Date(file.modifiedTime).toLocaleDateString()}
                                      </p>
                                    </div>
                                    <button
                                      onClick={() => processDriveFile(file)}
                                      className="bg-[#104a60] text-white hover:bg-[#FF6700] text-[10px] font-black uppercase tracking-wider py-1.5 px-3 rounded-md transition-all duration-150 shrink-0 cursor-pointer"
                                    >
                                      Importar
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Mapping Details block */}
                        <div className="bg-slate-900 text-slate-300 p-4 rounded-xl border border-slate-800 flex flex-col justify-between text-left">
                          <div>
                            <h4 className="text-xs font-black text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-sm text-indigo-400">tune</span>
                              Formato Corporativo Soportado
                            </h4>
                            <p className="text-[10px] text-slate-400 leading-normal mb-3">
                              El sistema lee automáticamente archivos Excel o Google Sheets que contengan los siguientes campos de información en sus columnas:
                            </p>
                            <div className="space-y-1 text-[10px] font-semibold text-slate-300">
                              <p className="flex justify-between border-b border-slate-800 pb-1"><span>📍 <strong className="text-white">Región:</strong> Zona nacional (Northeast, Center, etc.)</span> <span className="text-slate-500 font-mono">Col U</span></p>
                              <p className="flex justify-between border-b border-slate-800 pb-1"><span>🏢 <strong className="text-white">Store name:</strong> Nombre del punto de venta</span> <span className="text-slate-500 font-mono">Col AA</span></p>
                              <p className="flex justify-between border-b border-slate-800 pb-1"><span>📱 <strong className="text-white">Model:</strong> Modelo de terminal Xiaomi</span> <span className="text-slate-500 font-mono">Col F</span></p>
                              <p className="flex justify-between border-b border-slate-800 pb-1"><span>📦 <strong className="text-white">Almacén:</strong> Códigos 6, 19, 2 o 5</span> <span className="text-slate-500 font-mono">Col Q</span></p>
                              <p className="flex justify-between pb-1"><span>🔢 <strong className="text-white">Cantidades:</strong> Unidades físicas de stock</span> <span className="text-slate-500 font-mono">Col P</span></p>
                            </div>
                          </div>

                          {importLog && (
                            <div className="mt-4 pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2.5">
                              <p className="text-[10px] font-bold text-emerald-400 flex items-center gap-1.5 leading-none">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                <span>Archivo: {importLog.fileName}</span>
                              </p>
                              <button 
                                onClick={handleResetToDefault}
                                className="bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white text-[9px] font-black uppercase tracking-wider py-1 px-2.5 rounded transition-all border border-rose-500/20 cursor-pointer"
                              >
                                Restablecer Plantilla
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Planilla de Promotor Schedule Log - Day to Day viewing */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">Planilla de Promotores y Horarios (Día a Día)</h3>
                    <p className="text-xs text-slate-400">Control de asistencia, turnos y centro de trabajo asignado</p>
                  </div>
                  <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold px-3 py-1 rounded-full uppercase">
                    Fecha activa: {selectedDate}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  {filteredSchedule.length > 0 ? (
                    <table className="w-full text-left table-fixed">
                      <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        <tr>
                          <th className="px-5 py-3 w-1/4">Promotor</th>
                          <th className="px-5 py-3 w-1/4">Centro de Trabajo</th>
                          <th className="px-5 py-3 w-1/6">Turno</th>
                          <th className="px-5 py-3 w-1/4">Horario</th>
                          <th className="px-5 py-3 w-1/12 text-right">Horas</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                        {filteredSchedule.map((s, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 transition-colors">
                            <td className="px-5 py-3 flex items-center gap-2">
                              <span className="w-6 h-6 rounded bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[10px]">
                                {s.usuario.charAt(0)}
                              </span>
                              <span className="truncate text-slate-900 font-bold">{s.usuario}</span>
                            </td>
                            <td className="px-5 py-3 truncate text-slate-800 font-medium">{s.centro}</td>
                            <td className="px-5 py-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${s.turno === 'Mañanas' ? 'bg-amber-50 text-amber-700 border border-amber-100' : s.turno === 'Tardes' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-purple-50 text-purple-700 border border-purple-100'}`}>
                                {s.turno}
                              </span>
                            </td>
                            <td className="px-5 py-3 font-medium text-slate-500">{s.horario}</td>
                            <td className="px-5 py-3 text-right font-bold text-slate-900">{s.horasTotales}h</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-8 text-center text-slate-400">
                      <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">calendar_today</span>
                      <p className="text-xs font-bold uppercase tracking-wider">Sin turnos asignados</p>
                      <p className="text-[10px] text-slate-400 mt-1">No hay promotores asignados para esta fecha en tu región activa.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* Navigation Bar for Mobile Screens */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#104a60] border-t border-[#145a70]/50 flex justify-around items-center px-2 z-50 shadow-lg">
        <button 
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${activeTab === 'dashboard' ? 'text-[#FF6700]' : 'text-slate-300 hover:text-white'}`}
        >
          <Layers className="w-5 h-5" />
          <span className="text-[9px] font-bold uppercase mt-1">Dashboard</span>
        </button>
        <button 
          onClick={() => setActiveTab('stockDetail')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${activeTab === 'stockDetail' ? 'text-[#FF6700]' : 'text-slate-300 hover:text-white'}`}
        >
          <Building2 className="w-5 h-5" />
          <span className="text-[9px] font-bold uppercase mt-1">Stock</span>
        </button>
        <button 
          onClick={() => setActiveTab('gfkSegments')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${activeTab === 'gfkSegments' ? 'text-[#FF6700]' : 'text-slate-300 hover:text-white'}`}
        >
          <TrendingUpIcon className="w-5 h-5" />
          <span className="text-[9px] font-bold uppercase mt-1">GFK</span>
        </button>
        <button 
          onClick={() => setActiveTab('profile')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${activeTab === 'profile' ? 'text-[#FF6700]' : 'text-slate-300 hover:text-white'}`}
        >
          <User className="w-5 h-5" />
          <span className="text-[9px] font-bold uppercase mt-1">Perfil</span>
        </button>
      </nav>
    </div>
  );
}
