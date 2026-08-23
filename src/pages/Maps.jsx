import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";
import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";

// ── Firebase init (safe — won't crash if env vars missing) ──
let _fbAuth = null;
let _fbProvider = null;
try {
  const _fbCfg = {
    apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_ID,
    appId:             import.meta.env.VITE_FIREBASE_APP_ID,
  };
  const _fbApp  = getApps().length === 0 ? initializeApp(_fbCfg) : getApps()[0];
  _fbAuth       = getAuth(_fbApp);
  _fbProvider   = new GoogleAuthProvider();
} catch (e) {
  console.warn("Firebase init failed — auth disabled:", e);
}


const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "https://hwasat-backend-r5rykfbhxa-ew.a.run.app";

// Format a date from separate year/month/day parts into a readable string.
// Only appends month/day when they are actually selected.
const fmtDate = (y, m, d) => {
  if (!y) return "";
  let s = y;
  if (m) s += `-${m}`;
  if (m && d) s += `-${d}`;
  return s;
};

// ── Dataset processing-lag (days behind today that data is reliably available) ──
const DATASET_LAG_DAYS = {
  sentinel2: 5,   // GEE processes S2 within ~5 days
  landsat:   16,  // Landsat 8/9 revisit is 16 days; use conservative lag
  modis:     8,   // MOD13 8-day composites have ~1-week delay
  landcover: 5,   // Dynamic World mirrors S2 cadence
  climate:   21,  // CHIRPS preliminary available ~2-3 weeks after end of dekad
  hansen:    0,   // Static dataset — no lag; year range capped at 2023
};

// Returns the latest Date for which data is reliably available for a dataset.
const getDatasetMaxDate = (dsKey) => {
  const lag = DATASET_LAG_DAYS[dsKey] ?? 7;
  const d = new Date();
  d.setDate(d.getDate() - lag);
  return d;
};

// Flat bounding-box [minLng, minLat, maxLng, maxLat] from any GeoJSON geometry.
const getGeoBbox = (geometry) => {
  const pts = [];
  const collect = (c) => {
    if (!Array.isArray(c)) return;
    if (typeof c[0] === "number") pts.push(c);
    else c.forEach(collect);
  };
  collect(geometry.coordinates);
  const lngs = pts.map(p => p[0]);
  const lats  = pts.map(p => p[1]);
  return [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)];
};

const bboxOverlap = (a, b) =>
  !(a[2] < b[0] || b[2] < a[0] || a[3] < b[1] || b[3] < a[1]);

// ── Point-in-polygon helpers for district centroid filtering ──
const pointInPolygon = (pt, ring) => {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi)
      inside = !inside;
  }
  return inside;
};

const featureCentroid = (f) => {
  const bbox = getGeoBbox(f.geometry);
  return [(bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2];
};

const geomContainsCentroid = (geom, pt) => {
  if (geom.type === "Polygon") return pointInPolygon(pt, geom.coordinates[0]);
  if (geom.type === "MultiPolygon") return geom.coordinates.some(poly => pointInPolygon(pt, poly[0]));
  return true;
};

// ── Legend date formatter (e.g. "Jun-2024") ──
const fmtLegend = (y, m, d) => {
  if (!y) return "";
  if (!m) return String(y);
  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const mName = monthNames[parseInt(m, 10) - 1] || m;
  return `${mName}-${y}`;
};

// ── Icons ──────────────────────────────────────────────────────────────────
const Icon = ({ d, size = 16, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d={d} />
  </svg>
);
const icons = {
  layers:    "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  calendar:  "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z",
  download:  "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3",
  eye:       "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 100 6 3 3 0 000-6z",
  reset:     "M3 12a9 9 0 109 9M3 3v9h9",
  chevronL:  "M15 18l-6-6 6-6",
  chevronR:  "M9 18l6-6-6-6",
  sun:       "M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42M12 5a7 7 0 100 14A7 7 0 0012 5z",
  moon:      "M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z",
  upload:    "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12",
  map:       "M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4zM8 2v16M16 6v16",
  compare:   "M18 20V10M12 20V4M6 20v-6",
  close:     "M18 6L6 18M6 6l12 12",
};

// ── East Africa country registry ─────────────────────────────────────────────
const COUNTRY_BOUNDS = {
  burundi:  [[-4.47, 28.99], [-2.31, 30.85]],
  djibouti: [[10.93, 41.77], [12.71, 43.42]],
  eritrea:  [[12.36, 36.44], [18.00, 43.13]],
  ethiopia: [[ 3.40, 33.00], [14.89, 47.98]],
  kenya:    [[-4.68, 33.91], [ 4.62, 41.90]],
  rwanda:   [[-2.84, 28.86], [-1.05, 30.90]],
  somalia:  [[-1.68, 40.99], [11.97, 51.42]],
  s_sudan:  [[ 3.49, 23.44], [12.22, 35.30]],
  sudan:    [[ 8.68, 21.83], [22.22, 38.61]],
  tanzania: [[-11.75, 29.34], [-0.99, 40.44]],
  uganda:   [[-1.48, 29.57], [ 4.22, 35.00]],
};

const COUNTRIES = [
  { key: "burundi",   label: "Burundi",      maxLevel: 2 },
  { key: "djibouti",  label: "Djibouti",     maxLevel: 2 },
  { key: "eritrea",   label: "Eritrea",      maxLevel: 2 },
  { key: "ethiopia",  label: "Ethiopia",     maxLevel: 3 },
  { key: "kenya",     label: "Kenya",        maxLevel: 2 },
  { key: "rwanda",    label: "Rwanda",       maxLevel: 3 },
  { key: "somalia",   label: "Somalia",      maxLevel: 3 },
  { key: "s_sudan",   label: "South Sudan",  maxLevel: 2 },
  { key: "sudan",     label: "Sudan",        maxLevel: 2 },
  { key: "tanzania",  label: "Tanzania",     maxLevel: 3 },
  { key: "uganda",    label: "Uganda",       maxLevel: 3 },
];

export default function Maps() {
  const location = useLocation();
  const mapRef = useRef(null);
  const boundaryLayersCache = useRef({});
  const layerFeatureMap = useRef(new Map());
  const featureMap = useRef(new Map());
  const overlayRef = useRef(null);
  const legendRef = useRef(null);
  const layerControlRef = useRef(null);
  const p1LayerRef = useRef(null);
  const p2LayerRef = useRef(null);
  const changeLayerRef = useRef(null);
  
  const drawnLayerRef = useRef(null);
  const drawingStateRef = useRef({ active: false, type: null, points: [], tempLayer: null });
  const activeLayerContextRef = useRef(null); // tracks the currently-shown layer for pixel queries
  const pixelPopupRef = useRef(null);
  const [activeTool, setActiveTool] = useState(null); // 'rectangle'|'polygon'|'circle'|'point'
  const [drawnLayerExists, setDrawnLayerExists] = useState(false);

  // ── UI state ──
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [resultsOpen, setResultsOpen] = useState(false);
  const [resultsData, setResultsData] = useState(null);

  // ── Data state ──
  const [geojsonData, setGeojsonData] = useState({ adm1: null, adm2: null, adm3: null });
  const [dataset, setDataset] = useState("");
  const [index, setIndex] = useState("");
  const [country, setCountry] = useState("");
  const [adminLevel, setAdminLevel] = useState("");
  const [featureName, setFeatureName] = useState("");
  const [featureList, setFeatureList] = useState([]);
  const [selectedFeatureGeoJSON, setSelectedFeatureGeoJSON] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [aoiWarning, setAoiWarning] = useState(null); // {message, onProceed}
  const [aoiAreaKm2, setAoiAreaKm2] = useState(null); // shown in sidebar
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [emailPendingAction, setEmailPendingAction] = useState(null);
  const [user, setUser] = useState(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authPendingAction, setAuthPendingAction] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [premiumGateOpen, setPremiumGateOpen] = useState(false);
  const [premiumGateReason, setPremiumGateReason] = useState("");
  const [useCustomGeoJSON, setUseCustomGeoJSON] = useState(false);
  const [customGeoJSON, setCustomGeoJSON] = useState(null);
  const fileInputRef = useRef(null);

  // ── Date state ──
  const [fromYear, setFromYear] = useState("");
  const [fromMonth, setFromMonth] = useState("");
  const [fromDay, setFromDay] = useState("");
  const [toYear, setToYear] = useState("");
  const [toMonth, setToMonth] = useState("");
  const [toDay, setToDay] = useState("");

  // ── Change detection state ──
  const [changeMode, setChangeMode] = useState(false);
  const [fromYear2, setFromYear2] = useState("");
  const [fromMonth2, setFromMonth2] = useState("");
  const [fromDay2, setFromDay2] = useState("");
  const [toYear2, setToYear2] = useState("");
  const [toMonth2, setToMonth2] = useState("");
  const [toDay2, setToDay2] = useState("");

  const [indexOptions, setIndexOptions] = useState([]);
  const [yearOptions, setYearOptions] = useState([]);

  // ── Decision Dashboard state ──
  const [baselineData, setBaselineData]       = useState(null);
  const [baselineLoading, setBaselineLoading] = useState(false);
  const [districtData, setDistrictData]       = useState(null);
  const [districtLoading, setDistrictLoading] = useState(false);
  const baselineLayerRef = useRef(null);
  const dashboardBoundaryCacheRef = useRef({});

  // ── PDF Report state ──
  const [reportLoading, setReportLoading] = useState(false);

  // ── AI Insights state ──
  const [aiInsights, setAiInsights]       = useState(null);
  const [aiLoading, setAiLoading]         = useState(false);
  const [aiError, setAiError]             = useState(null);

  // ── Share link state ──
  const [shareLoading, setShareLoading]   = useState(false);
  const [shareUrl, setShareUrl]           = useState(null);
  const [shareCopied, setShareCopied]     = useState(false);

  // ── GFC2020 / EUDR Forest Baseline state ──
  const [gfc2020Visible, setGfc2020Visible]         = useState(false);
  const [gfc2020TileUrl, setGfc2020TileUrl]         = useState(null);
  const [gfc2020Stats, setGfc2020Stats]             = useState(null);
  const [gfc2020StatsLoading, setGfc2020StatsLoading] = useState(false);
  const [gfc2020Error, setGfc2020Error]             = useState(null);
  const gfc2020LayerRef = useRef(null);

  // ── Save AOI state ──
  const [saveAoiModalOpen, setSaveAoiModalOpen] = useState(false);
  const [saveAoiName, setSaveAoiName] = useState("");
  const [saveAoiLoading, setSaveAoiLoading] = useState(false);
  const [saveAoiError, setSaveAoiError] = useState(null);
  const [saveAoiSuccess, setSaveAoiSuccess] = useState(false);

  // ── Time series & stats state ──
  const [tsInterval, setTsInterval] = useState("monthly");
  const [tsLoading, setTsLoading] = useState(false);
  const [tsData, setTsData] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsData, setStatsData] = useState(null);
  const [activeTab, setActiveTab] = useState("info"); // "info" | "timeseries" | "changestats"
  const [changeMapData, setChangeMapData] = useState(null);
  const [changeMapLoading, setChangeMapLoading] = useState(false);
  // seasonal month range
  const [seasonStart, setSeasonStart] = useState("06");
  const [seasonEnd, setSeasonEnd] = useState("08");

  // ── Theme tokens ──
  const t = darkMode ? {
    bg: "#0f1117", sidebar: "#161b27", card: "#1e2535", border: "#2a3347",
    text: "#e2e8f0", muted: "#94a3b8", accent: "#22c55e", accentHover: "#16a34a",
    input: "#1e2535", inputBorder: "#2a3347", inputText: "#e2e8f0",
    btnPrimary: "#1d4ed8", btnSecondary: "#16a34a", btnDanger: "#374151",
    shadow: "0 4px 24px rgba(0,0,0,0.5)",
  } : {
    bg: "#f1f5f9", sidebar: "#ffffff", card: "#f8fafc", border: "#e2e8f0",
    text: "#0f172a", muted: "#64748b", accent: "#16a34a", accentHover: "#15803d",
    input: "#ffffff", inputBorder: "#cbd5e1", inputText: "#0f172a",
    btnPrimary: "#1d4ed8", btnSecondary: "#16a34a", btnDanger: "#6b7280",
    shadow: "0 4px 24px rgba(0,0,0,0.08)",
  };

  const DATASET_CONFIG = {
    landcover: { label: "Land Cover", icon: "🗺️", indices: [{ v: "dynamic", t: "Dynamic World (10m)" }], yearRange: [2015, new Date().getFullYear()], minDate: "2015-07-27" },
    sentinel2: { label: "Sentinel-2", icon: "🛰️", indices: [
      { v: "NDVI", t: "NDVI" }, { v: "NDWI", t: "NDWI" }, { v: "NBR", t: "NBR" },
      { v: "NDBI", t: "NDBI" }, { v: "NDCI", t: "NDCI" }, { v: "GNDVI", t: "GNDVI" },
      { v: "NDRE", t: "NDRE" }, { v: "MNDWI", t: "MNDWI" }, { v: "NDMI", t: "NDMI" },
      { v: "NDSI", t: "NDSI" }, { v: "EVI", t: "EVI" }, { v: "EVI2", t: "EVI2" },
      { v: "SAVI", t: "SAVI" }, { v: "MSAVI", t: "MSAVI" }, { v: "ARVI", t: "ARVI" },
      { v: "GOSAVI", t: "GOSAVI" }, { v: "OSAVI", t: "OSAVI" }, { v: "MCARI", t: "MCARI" },
      { v: "MSI", t: "MSI" }, { v: "BSI", t: "BSI" }, { v: "SIPI", t: "SIPI" }
    ], yearRange: [2017, new Date().getFullYear()], minDate: "2017-06-23" },
    landsat: { label: "Landsat", icon: "🌍", indices: [
      { v: "NDVI", t: "NDVI" }, { v: "GNDVI", t: "GNDVI" }, { v: "NDWI", t: "NDWI" },
      { v: "NBR", t: "NBR" }, { v: "NDBI", t: "NDBI" }, { v: "NDMI", t: "NDMI" },
      { v: "NDSI", t: "NDSI" }, { v: "NDGI", t: "NDGI" }, { v: "EVI", t: "EVI" },
      { v: "SAVI", t: "SAVI" }, { v: "ARVI", t: "ARVI" }, { v: "AVI", t: "AVI" },
      { v: "GCI", t: "GCI" }, { v: "MSI", t: "MSI" }, { v: "BSI", t: "BSI" }, { v: "SIPI", t: "SIPI" }
    ], yearRange: [1984, new Date().getFullYear()], minDate: "1984-03-01" },
    modis: { label: "MODIS", icon: "🌐", indices: [
      { v: "NDVI", t: "NDVI" }, { v: "EVI", t: "EVI" }, { v: "NDWI", t: "NDWI" },
      { v: "NBR", t: "NBR" }, { v: "NDMI", t: "NDMI" }, { v: "NDSI", t: "NDSI" },
      { v: "VHI",  t: "VHI (Vegetation Health Index)" },
    ], yearRange: [2000, new Date().getFullYear()], minDate: "2000-02-18" },
    climate: { label: "CHIRPS", icon: "🌦️", indices: [
      { v: "SPI",        t: "SPI (Standardized Precipitation Index)" },
      { v: "mean_rf",    t: "Mean RF (Mean Daily Rainfall, mm/day)" },
      { v: "total_rf",   t: "Total RF (Total Rainfall, mm)" },
      { v: "anomaly_rf", t: "Rainfall Anomaly (vs 1981–2010 mean)" },
      { v: "dry_days",   t: "Dry Days (days < 1 mm)" },
      { v: "max_rf",     t: "Max Daily RF (Peak Rainfall, mm)" },
    ], yearRange: [1981, new Date().getFullYear()], minDate: "1981-01-01" },
    hansen: { label: "Hansen Forest Change", icon: "🌳", indices: [
      { v: "lossyear",     t: "Loss Year (2001–2025)" },
      { v: "treecover2000", t: "Tree Cover 2000 (%)" },
      { v: "gain",         t: "Forest Gain (2000–2020)" },
      { v: "loss",         t: "Forest Loss (2000–2025)" },
    ], yearRange: [2001, 2025], minDate: "2001-01-01" },
  };

  // Dynamic World class labels (index matches GEE label band 0–8)
  const DW_CLASSES = ["Water","Trees","Grass","Flooded Vegetation","Crops","Shrub & Scrub","Built","Bare","Snow & Ice"];

  const LANDCOVER_PALETTE = {
    water: "#419BDF", trees: "#397D49", grass: "#88B053",
    flooded_vegetation: "#7A87C6", crops: "#E49635", shrub_and_scrub: "#DFC35A",
    built: "#C4281B", bare: "#A59B8F", snow_and_ice: "#B39FE1",
  };

  // ── AOI size limits per dataset (km²) ──
  // warn = soft warning shown immediately (Option B)
  // view = hard block for visualization
  // timeseries = hard block for time series
  // download = hard block for download
  const AOI_LIMITS = {
    sentinel2: { warn: 4500,   view: 6000,   timeseries: 1500,   download: 3000   },
    landsat:   { warn: 15000,  view: 20000,  timeseries: 6000,   download: 10000  },
    modis:     { warn: 300000,  view: 400000,  timeseries: 160000,  download: 240000  },
    landcover: { warn: 7500,    view: 10000,   timeseries: 3000,    download: 6000    },
    climate:   { warn: 3000000, view: 4000000, timeseries: 1500000, download: 2500000 },
  };

  // Approximate AOI area in km² from GeoJSON geometry
  const getAoiAreaKm2 = (geometry) => {
    try {
      let coords = [];
      if (geometry.type === "Polygon") coords = geometry.coordinates[0];
      else if (geometry.type === "MultiPolygon") coords = geometry.coordinates[0][0];
      else return 0;
      // Shoelace formula in degrees then convert
      let area = 0;
      for (let i = 0; i < coords.length - 1; i++) {
        area += coords[i][0] * coords[i+1][1];
        area -= coords[i+1][0] * coords[i][1];
      }
      area = Math.abs(area) / 2;
      // Convert deg² to km² using mean latitude
      const meanLat = coords.reduce((s, c) => s + c[1], 0) / coords.length;
      const km2 = area * 111.32 * 111.32 * Math.cos(meanLat * Math.PI / 180);
      return Math.round(km2);
    } catch { return 0; }
  };

  // mode: "view" | "timeseries" | "download"
  // returns: { type: "block"|"warn", message: string } | null
  const checkAoiSize = (geometry, ds, mode = "view") => {
    if (!geometry || !ds) return null;
    const limits = AOI_LIMITS[ds];
    if (!limits) return null;
    const area = getAoiAreaKm2(geometry);
    if (area === 0) return null;
    const dsLabel = DATASET_CONFIG[ds]?.label || ds;
    const hardLimit = limits[mode] || limits.view;
    if (area > hardLimit) {
      return {
        type: "block",
        area,
        message: `AOI too large (${area.toLocaleString()} km²). Maximum for ${dsLabel} ${mode} is ${hardLimit.toLocaleString()} km². Please select a smaller area or switch to a lower resolution dataset like ${ds === "sentinel2" ? "Landsat or MODIS" : ds === "landsat" ? "MODIS" : "a coarser dataset"}.`,
      };
    }
    if (area > limits.warn) {
      return {
        type: "warn",
        area,
        message: `Your area is ${area.toLocaleString()} km² which is large for ${dsLabel}. This may take several minutes. Continue anyway?`,
      };
    }
    return null;
  };

  // Detect the name property from the actual GeoJSON — handles all country formats
  const getPropName = (data, level) => {
    if (!data?.features?.length) return null;
    const props = data.features[0].properties;
    const n = level.replace("adm", ""); // "1" "2" "3"
    for (const c of [`adm${n}_name`, `ADM${n}_EN`, `adm${n}_en`, "opz1_en"]) {
      if (props[c] !== undefined) return c;
    }
    return Object.keys(props)[0]; // last-resort fallback
  };
  const normalizeColor = (c) => {
    if (!c || typeof c !== "string") return "#ccc";
    const t = c.trim();
    if (!t) return "#ccc";
    if (t.startsWith("#")) return t;                       // already valid CSS
    if (/^[0-9A-Fa-f]{6}$/.test(t)) return `#${t}`;      // 6-char hex → prepend #
    if (/^[0-9A-Fa-f]{3}$/.test(t)) return `#${t}`;      // 3-char hex → prepend #
    return t;                                              // CSS named colors, rgb() etc — pass through unchanged
  };
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1).padStart(2, "0"),
    label: `${String(i + 1).padStart(2, "0")} (${months[i]})`,
  }));
  const dayOptionsFor = (y, m) => (!y || !m) ? [] : Array.from({ length: new Date(Number(y), Number(m), 0).getDate() }, (_, i) => String(i + 1).padStart(2, "0"));

  // ── Map init ──
  useEffect(() => {
    if (mapRef.current) return;
    const map = L.map("map", { center: [9.145, 40.4897], zoom: 6 });
    mapRef.current = map;
    const street = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap", maxZoom: 19, zIndex: 1 }).addTo(map);
    const sat = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { attribution: "Esri & contributors", maxZoom: 19, zIndex: 1 });
    map._baseStreet = street;
    map._baseSat = sat;
    layerControlRef.current = L.control.layers({ "Street Map": street, "Satellite": sat }, {}, { collapsed: false }).addTo(map);
  }, []);

  // ── Pre-load AOI from Monitoring (sessionStorage) ──
  // Re-runs whenever the route becomes /maps — needed because Maps is always
  // mounted (display:none/block) and never remounts on navigation.
  useEffect(() => {
    if (location.pathname !== "/maps") return;
    try {
      const raw = sessionStorage.getItem("hwasat_load_aoi");
      if (!raw) return;
      sessionStorage.removeItem("hwasat_load_aoi");
      const payload = JSON.parse(raw);
      if (!payload?.geometry) return;

      // Wrap bare geometry in a GeoJSON Feature
      const feature = {
        type: "Feature",
        geometry: payload.geometry,
        properties: { name: payload.name || "Saved Area" },
      };
      setCustomGeoJSON(feature);
      setUseCustomGeoJSON(true);

      // If a layer was pre-selected, restore dataset + index
      if (payload.layers && payload.layers.length > 0) {
        const first = payload.layers[0];
        setDataset(first.dataset);
        setIndex(first.index);
      }
    } catch (_) {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Invalidate map size when sidebar or results panel toggles
  useEffect(() => {
    setTimeout(() => mapRef.current?.invalidateSize(), 320);
  }, [sidebarOpen, resultsOpen]);



  // ── Drawing Tools Engine ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const ds = drawingStateRef.current;

    const finishDrawing = (geojson) => {
      // Remove temp layer
      if (ds.tempLayer) { map.removeLayer(ds.tempLayer); ds.tempLayer = null; }
      // Remove previous drawn AOI
      if (drawnLayerRef.current) map.removeLayer(drawnLayerRef.current);
      // Add final layer
      const layer = L.geoJSON(geojson, {
        style: { color: "#ef4444", weight: 2.5, fillOpacity: 0, dashArray: "6,3" },
        pointToLayer: (f, latlng) => L.circleMarker(latlng, { radius: 8, color: "#ef4444", fillOpacity: 0.6 }),
      }).addTo(map);
      drawnLayerRef.current = layer;
      setDrawnLayerExists(true);
      // Set as active AOI (reuse customGeoJSON pathway)
      setCustomGeoJSON(geojson);
      setUseCustomGeoJSON(true);
      setActiveTool(null);
      ds.active = false;
      ds.type = null;
      ds.points = [];
      map.getContainer().style.cursor = "";
    };

    const cancelDrawing = () => {
      if (ds.tempLayer) { map.removeLayer(ds.tempLayer); ds.tempLayer = null; }
      ds.points = [];
      ds.active = false;
      ds.type = null;
      map.getContainer().style.cursor = "";
      setActiveTool(null);
    };

    // ── Click handler ──
    const onClick = (e) => {
      if (!ds.active) return;
      const { lat, lng } = e.latlng;

      if (ds.type === "polygon") {
        ds.points.push([lng, lat]);
        if (ds.tempLayer) map.removeLayer(ds.tempLayer);
        if (ds.points.length >= 2) {
          ds.tempLayer = L.polyline(ds.points.map(([ln, la]) => [la, ln]), { color: "#ef4444", dashArray: "5,5", weight: 2 }).addTo(map);
        }
        return;
      }
      if (ds.type === "rectangle" || ds.type === "circle") {
        if (ds.points.length === 0) {
          ds.points.push([lng, lat]);
        } else {
          const [lng0, lat0] = ds.points[0];
          if (ds.type === "rectangle") {
            finishDrawing({
              type: "Feature",
              geometry: { type: "Polygon", coordinates: [[[lng0,lat0],[lng,lat0],[lng,lat],[lng0,lat],[lng0,lat0]]] },
              properties: { name: "Drawn Rectangle" }
            });
          } else {
            // Circle → approximate as 64-point polygon
            const R = Math.sqrt(Math.pow(lng - lng0, 2) + Math.pow(lat - lat0, 2));
            const coords = Array.from({ length: 64 }, (_, i) => {
              const angle = (i / 64) * 2 * Math.PI;
              return [lng0 + R * Math.cos(angle), lat0 + R * Math.sin(angle)];
            });
            coords.push(coords[0]);
            finishDrawing({ type: "Feature", geometry: { type: "Polygon", coordinates: [coords] }, properties: { name: "Drawn Circle" } });
          }
          ds.points = [];
        }
        return;
      }
    };

    // ── Double-click to finish polygon ──
    const onDblClick = (e) => {
      if (!ds.active || ds.type !== "polygon") return;
      L.DomEvent.stop(e);
      if (ds.points.length < 3) return;
      const coords = [...ds.points, ds.points[0]];
      finishDrawing({ type: "Feature", geometry: { type: "Polygon", coordinates: [coords] }, properties: { name: "Drawn Polygon" } });
    };

    // ── Mousemove preview ──
    const onMouseMove = (e) => {
      if (!ds.active || ds.points.length === 0) return;
      const { lat, lng } = e.latlng;
      if (ds.tempLayer) map.removeLayer(ds.tempLayer);
      const [lng0, lat0] = ds.points[0];

      if (ds.type === "rectangle") {
        ds.tempLayer = L.rectangle([[lat0, lng0], [lat, lng]], { color: "#ef4444", weight: 2, dashArray: "5,5", fillOpacity: 0.1 }).addTo(map);
      } else if (ds.type === "circle") {
        const R = Math.sqrt(Math.pow(lng - lng0, 2) + Math.pow(lat - lat0, 2));
        const coords = Array.from({ length: 64 }, (_, i) => {
          const angle = (i / 64) * 2 * Math.PI;
          return [lat0 + R * Math.sin(angle), lng0 + R * Math.cos(angle)];
        });
        ds.tempLayer = L.polygon(coords, { color: "#ef4444", weight: 2, dashArray: "5,5", fillOpacity: 0.1 }).addTo(map);
      } else if (ds.type === "polygon" && ds.points.length >= 1) {
        const preview = [...ds.points.map(([ln, la]) => [la, ln]), [lat, lng]];
        ds.tempLayer = L.polyline(preview, { color: "#ef4444", dashArray: "5,5", weight: 2 }).addTo(map);
      }
    };

    // ── Escape to cancel ──
    const onKeyDown = (e) => { if (e.key === "Escape") cancelDrawing(); };

    map.on("click", onClick);
    map.on("dblclick", onDblClick);
    map.on("mousemove", onMouseMove);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      map.off("click", onClick);
      map.off("dblclick", onDblClick);
      map.off("mousemove", onMouseMove);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  // ── Pixel value cursor: click to query the value under the cursor ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const fetchPixelVal = async (dataset, index, start, end, lat, lng) => {
      try {
        const r = await fetch(
          `${BACKEND_URL}/pixel_value?lat=${lat}&lng=${lng}&dataset=${encodeURIComponent(dataset)}&index=${encodeURIComponent(index)}&start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`
        );
        if (!r.ok) return null;
        const d = await r.json();
        return d.value ?? null;
      } catch { return null; }
    };

    const fmtVal = (v, dataset, index) => {
      if (v === null || v === undefined) return "N/A";
      if (dataset === "landcover") return DW_CLASSES[Math.round(v)] ?? "Unknown";
      if (index === "lossyear")     return v === 0 ? "No loss" : `Loss in ${2000 + Math.round(v)}`;
      if (index === "gain")         return v === 1 ? "Gain" : "No gain";
      if (index === "loss")         return v === 1 ? "Loss" : "No loss";
      if (index === "treecover2000") return `${Math.round(v)}%`;
      if (index === "dry_days")     return `${Math.round(v)} days`;
      return parseFloat(v).toFixed(3);
    };

    const onPixelClick = async (e) => {
      if (drawingStateRef.current.active) return;
      const ctx = activeLayerContextRef.current;
      if (!ctx) return;

      const { lat, lng } = e.latlng;
      // Close any previous pixel popup
      if (pixelPopupRef.current) { try { map.closePopup(pixelPopupRef.current); } catch {} }
      const popup = L.popup({ maxWidth: 280, className: "pixel-popup" })
        .setLatLng(e.latlng)
        .setContent('<div style="font-size:12px;padding:2px 4px">⏳ Loading…</div>');
      popup.openOn(map);
      pixelPopupRef.current = popup;

      try {
        if (ctx.changeMode) {
          const [v1, v2] = await Promise.all([
            fetchPixelVal(ctx.dataset, ctx.index, ctx.p1Start, ctx.p1End, lat, lng),
            fetchPixelVal(ctx.dataset, ctx.index, ctx.p2Start, ctx.p2End, lat, lng),
          ]);
          const f1 = fmtVal(v1, ctx.dataset, ctx.index);
          const f2 = fmtVal(v2, ctx.dataset, ctx.index);
          const changeStr = ctx.isLandcover
            ? "N/A"
            : (v1 !== null && v2 !== null ? (v2 - v1 >= 0 ? "+" : "") + (v2 - v1).toFixed(3) : "N/A");
          popup.setContent(
            `<div style="font-size:12px;line-height:1.8;padding:2px 4px">` +
            `<b style="color:#3b82f6">Period 1:</b> ${f1}<br/>` +
            `<b style="color:#16a34a">Period 2:</b> ${f2}<br/>` +
            `<b>Change:</b> ${changeStr}` +
            `</div>`
          );
        } else {
          const v = await fetchPixelVal(ctx.dataset, ctx.index, ctx.start, ctx.end, lat, lng);
          const label = ctx.index === "dynamic" ? "Land Cover" : ctx.index.toUpperCase();
          popup.setContent(
            `<div style="font-size:12px;padding:2px 4px"><b>${label}:</b> ${fmtVal(v, ctx.dataset, ctx.index)}</div>`
          );
        }
      } catch {
        popup.setContent('<div style="font-size:12px;color:#dc2626;padding:2px 4px">Error reading pixel</div>');
      }
    };

    map.on("click", onPixelClick);
    return () => map.off("click", onPixelClick);
  }, []); // uses refs only — no deps needed

  // ── Activate a drawing tool ──
  const startDrawing = (type) => {
    const map = mapRef.current;
    if (!map) return;
    const ds = drawingStateRef.current;
    // Cancel any existing
    if (ds.tempLayer) { map.removeLayer(ds.tempLayer); ds.tempLayer = null; }
    ds.points = [];
    ds.active = true;
    ds.type = type;
    setActiveTool(type);
    const cursors = { rectangle: "crosshair", polygon: "crosshair", circle: "crosshair", point: "cell" };
    map.getContainer().style.cursor = cursors[type] || "crosshair";
  };

  // ── Country change — resets everything downstream ──
  const handleCountryChange = (newCountry) => {
    setCountry(newCountry);
    setAdminLevel("");
    setFeatureName("");
    setFeatureList([]);
    setGeojsonData({ adm1: null, adm2: null, adm3: null });
    Object.values(boundaryLayersCache.current).forEach(l => {
      try { mapRef.current?.removeLayer(l); } catch {}
    });
    boundaryLayersCache.current = {};
    layerFeatureMap.current.clear();
    featureMap.current.clear();
    if (newCountry && COUNTRY_BOUNDS[newCountry] && mapRef.current) {
      try { mapRef.current.fitBounds(COUNTRY_BOUNDS[newCountry]); } catch {}
    }
  };

  // ── Load boundaries — lazy, per selected country + level ──
  useEffect(() => {
    if (useCustomGeoJSON || !country || !adminLevel) return;
    if (geojsonData[adminLevel]) return; // already cached
    const n = adminLevel.replace("adm", "");
    fetch(`/data/${country}/${country}_level_${n}_gcs.geojson`)
      .then(r => r.json())
      .then(data => setGeojsonData(prev => ({ ...prev, [adminLevel]: data })))
      .catch(() => setMessage("Failed to load boundary data."));
  }, [country, adminLevel, useCustomGeoJSON]);

  // ── File upload ──
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const geojson = JSON.parse(ev.target.result);
        let feature = geojson.type === "FeatureCollection" ? geojson.features[0] : geojson;
        if (!feature?.geometry || !["Polygon","MultiPolygon"].includes(feature.geometry.type))
          throw new Error("Must be Polygon or MultiPolygon");
        setCustomGeoJSON(feature);
        setSelectedFeatureGeoJSON(feature);
        setUseCustomGeoJSON(true);
        setMessage("Custom GeoJSON loaded successfully!");
      } catch (err) { setMessage(`Invalid GeoJSON: ${err.message}`); }
    };
    reader.readAsText(file);
  };

  // ── Dataset → indices/years ──
  useEffect(() => {
    if (!dataset) return;
    const cfg = DATASET_CONFIG[dataset];
    setIndexOptions(cfg.indices);
    const [minY] = cfg.yearRange;
    // Cap the max selectable year to the dataset's actual data availability
    const maxAvailDate = getDatasetMaxDate(dataset);
    const capY = maxAvailDate.getFullYear();
    setYearOptions(Array.from({ length: capY - minY + 1 }, (_, i) => capY - i));
    setIndex("");
    // Hansen is static — no date range or change detection needed
    if (dataset === "hansen") {
      setChangeMode(false);
      setFromYear(""); setFromMonth(""); setFromDay("");
      setToYear(""); setToMonth(""); setToDay("");
    }
    // Reset special intervals if switching away from MODIS
    if (dataset !== "modis") {
      setTsInterval(prev => (prev === "daily" || prev === "16day") ? "monthly" : prev);
    }
    // Clear stale chart/AI data but keep the panel open so the user sees it's empty
    activeLayerContextRef.current = null;
    setResultsData(null);
    setTsData(null);
    setStatsData(null);
    setAiInsights(null);
    setAiError(null);
    setBaselineData(null);
    setDistrictData(null);
    setShareUrl(null);
    setActiveTab("info");
  }, [dataset]);

  // ── Admin level → boundaries ──
  useEffect(() => {
    if (useCustomGeoJSON || !mapRef.current || !geojsonData[adminLevel]) return;
    const map = mapRef.current;
    Object.values(boundaryLayersCache.current).forEach(l => map.removeLayer(l));
    layerFeatureMap.current.clear();
    featureMap.current.clear();
    setFeatureList([]);
    setFeatureName("");
    const prop = getPropName(geojsonData[adminLevel], adminLevel);
    setFeatureList(geojsonData[adminLevel].features.map(f => f.properties[prop]).filter(Boolean).sort((a, b) => a.localeCompare(b)));
    const layer = L.geoJSON(geojsonData[adminLevel], {
      style: { color: "#3b82f6", weight: 1.2, fillOpacity: 0 },
      onEachFeature: (feature, lyr) => {
        const name = feature.properties[prop];
        layerFeatureMap.current.set(name, lyr);
        featureMap.current.set(name, feature);
        lyr.on("click", () => {
          setFeatureName(name);
          setSelectedFeatureGeoJSON(feature);
          layerFeatureMap.current.forEach((l, n) => l.setStyle({ color: n === name ? "#ef4444" : "#3b82f6", weight: n === name ? 3 : 1.2 }));
          map.fitBounds(lyr.getBounds());
        });
      },
    }).addTo(map);
    boundaryLayersCache.current[adminLevel] = layer;
    map.fitBounds(layer.getBounds());
    // Level 0 has exactly one feature (the whole country) — auto-select it
    if (adminLevel === "adm0") {
      const firstFeature = geojsonData["adm0"]?.features[0];
      const name = firstFeature?.properties?.[prop];
      if (name) { setFeatureName(name); setSelectedFeatureGeoJSON(firstFeature.geometry); }
    }
  }, [adminLevel, geojsonData, useCustomGeoJSON]);

  // ── Custom GeoJSON layer ──
  useEffect(() => {
    if (!useCustomGeoJSON || !customGeoJSON || !mapRef.current) return;
    const map = mapRef.current;
    if (boundaryLayersCache.current.custom) map.removeLayer(boundaryLayersCache.current.custom);
    const layer = L.geoJSON(customGeoJSON, { style: { color: "#ef4444", weight: 2.5, fillOpacity: 0, dashArray: "6,3" } }).addTo(map);
    boundaryLayersCache.current.custom = layer;
    // Delay fitBounds so Leaflet can recalculate size after display:none → block
    setTimeout(() => {
      try { map.invalidateSize(); map.fitBounds(layer.getBounds()); } catch {}
    }, 150);
  }, [customGeoJSON, useCustomGeoJSON]);

  // ── Feature highlight ──
  useEffect(() => {
    if (useCustomGeoJSON || !featureName || !adminLevel || !layerFeatureMap.current.has(featureName)) return;
    const lyr = layerFeatureMap.current.get(featureName);
    setSelectedFeatureGeoJSON(featureMap.current.get(featureName));
    layerFeatureMap.current.forEach((l, n) => l.setStyle({ color: n === featureName ? "#ef4444" : "#3b82f6", weight: n === featureName ? 3 : 1.2 }));
    mapRef.current?.fitBounds(lyr.getBounds());
  }, [featureName, adminLevel, useCustomGeoJSON]);

  // ── Reset interval when index changes (MODIS daily/16day are index-specific) ──
  useEffect(() => {
    if (dataset === "modis") {
      const dailyIndices = ["NDWI","NBR","NDMI","NDSI"];
      const compositeIndices = ["NDVI","EVI"];
      if (tsInterval === "daily" && !dailyIndices.includes(index)) setTsInterval("monthly");
      if (tsInterval === "16day" && !compositeIndices.includes(index)) setTsInterval("monthly");
    }
  }, [index]);

  // ── Compute AOI area for display ──
  useEffect(() => {
    const geometry = useCustomGeoJSON ? customGeoJSON?.geometry : selectedFeatureGeoJSON?.geometry;
    if (!geometry) { setAoiAreaKm2(null); return; }
    const area = getAoiAreaKm2(geometry);
    setAoiAreaKm2(area > 0 ? area : null);
  }, [customGeoJSON, selectedFeatureGeoJSON, useCustomGeoJSON]);

  // ── GFC2020: fetch global tile URL from backend ──
  const fetchGfc2020Tiles = async () => {
    setGfc2020Error(null);
    try {
      const res = await fetch(`${BACKEND_URL}/gfc2020_tiles`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setGfc2020Error(err.detail || `Server error ${res.status}`);
        return;
      }
      const data = await res.json();
      setGfc2020TileUrl(data.tiles);
    } catch (e) {
      console.warn("GFC2020 tile fetch failed:", e);
    }
  };

  // ── GFC2020: add/remove tile layer when visibility or URL changes ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (gfc2020Visible) {
      if (!gfc2020TileUrl) { fetchGfc2020Tiles(); return; }
      if (gfc2020LayerRef.current) { try { map.removeLayer(gfc2020LayerRef.current); } catch {} }
      const layer = L.tileLayer(gfc2020TileUrl, { opacity: 1, zIndex: 4 });
      gfc2020LayerRef.current = layer;
      layer.addTo(map);
    } else {
      if (gfc2020LayerRef.current) {
        try { map.removeLayer(gfc2020LayerRef.current); } catch {}
        gfc2020LayerRef.current = null;
      }
    }
  }, [gfc2020Visible, gfc2020TileUrl]);

  // ── GFC2020: fetch stats whenever AOI or visibility changes ──
  useEffect(() => {
    if (!gfc2020Visible) { setGfc2020Stats(null); return; }
    const geometry = useCustomGeoJSON ? customGeoJSON?.geometry : selectedFeatureGeoJSON?.geometry;
    if (!geometry) { setGfc2020Stats(null); return; }
    setGfc2020StatsLoading(true);
    setGfc2020Stats(null);
    fetch(`${BACKEND_URL}/gfc2020_stats`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ geometry }),
    })
      .then(r => r.json())
      .then(data => { setGfc2020Stats(data); setGfc2020StatsLoading(false); })
      .catch(e => { console.warn("GFC2020 stats failed:", e); setGfc2020StatsLoading(false); });
  }, [gfc2020Visible, selectedFeatureGeoJSON, customGeoJSON, useCustomGeoJSON]);

  // ── Validate dates ──
  const validateDates = () => {
    if (!dataset || !fromYear || !toYear) return true;
    const cfg = DATASET_CONFIG[dataset];
    const minDate = new Date(cfg.minDate);
    const fromDate = new Date(`${fromYear}-${fromMonth || "01"}-${fromDay || "01"}`);
    const toDate = new Date(`${toYear}-${toMonth || "12"}-${toDay || "31"}`);
    if (fromDate < minDate) { setMessage(`Start date must be after ${cfg.minDate} for ${cfg.label}`); return false; }
    if (toDate < fromDate) { setMessage("End date must be after start date"); return false; }
    return true;
  };

  const validateChangeDates = () => {
    if (!dataset || !fromYear || !toYear || !fromYear2 || !toYear2) return true;
    const cfg = DATASET_CONFIG[dataset];
    const minDate = new Date(cfg.minDate);
    const from1 = new Date(`${fromYear}-${fromMonth || "01"}-${fromDay || "01"}`);
    const to1 = new Date(`${toYear}-${toMonth || "12"}-${toDay || "31"}`);
    const from2 = new Date(`${fromYear2}-${fromMonth2 || "01"}-${fromDay2 || "01"}`);
    const to2 = new Date(`${toYear2}-${toMonth2 || "12"}-${toDay2 || "31"}`);
    if (from1 < minDate || from2 < minDate) { setMessage(`Start date must be after ${cfg.minDate}`); return false; }
    if (to1 < from1) { setMessage("Period 1 end must be after start"); return false; }
    if (to2 < from2) { setMessage("Period 2 end must be after start"); return false; }
    return true;
  };

  // ── Overlay + Legend ──
  const addOverlayAndLegend = (data, datasetKey) => {
    const map = mapRef.current;
    if (!map) return;
    if (overlayRef.current) map.removeLayer(overlayRef.current);
    if (legendRef.current) map.removeControl(legendRef.current);
    const tileUrl = data.tiles || data.mode_tiles;
    if (!tileUrl?.startsWith("http")) { setMessage(`No tiles returned for ${datasetKey}. Try a different date range.`); return; }
    const overlay = L.tileLayer(tileUrl, { opacity: 1, zIndex: 5 }).addTo(map);
    overlayRef.current = overlay;
    overlay.on("tileerror", (err) => console.error("Tile error:", err));
    if (data.bounds?.length) {
      try { map.fitBounds(data.bounds.map(([lng, lat]) => [lat, lng])); } catch {}
    }
    const vis = data.vis_params || {};
    const palette = (vis.palette || []).map(normalizeColor);
    const min = data.legend?.meta?.min ?? vis.min ?? 0;
    const max = data.legend?.meta?.max ?? vis.max ?? 1;
    const Legend = L.Control.extend({
      onAdd() {
        const div = L.DomUtil.create("div");
        div.style.cssText = "background:white;padding:8px 10px;font-size:12px;box-shadow:0 2px 8px rgba(0,0,0,0.2);border-radius:6px;font-family:sans-serif;min-width:160px";
        if (datasetKey === "landcover" && data.unique_classes?.length) {
          div.innerHTML = `<b style="font-size:11px;text-transform:uppercase;letter-spacing:0.05em">Land Cover</b><br>`;
          data.unique_classes.forEach((cls, i) => {
            const name = typeof cls === "string" ? cls : cls.class_name || `Class ${i}`;
            const color = LANDCOVER_PALETTE[name] || palette[i % palette.length] || "#ccc";
            div.innerHTML += `<div style="display:flex;align-items:center;margin:3px 0"><i style="background:${color};width:14px;height:14px;border-radius:2px;margin-right:6px;flex-shrink:0"></i><span style="font-size:11px">${name.replace(/_/g," ")}</span></div>`;
          });
        } else {
          const label = data.legend?.label || index;
          div.innerHTML = `<b style="font-size:11px;text-transform:uppercase;letter-spacing:0.05em">${label}</b>
            <div style="width:140px;height:10px;background:linear-gradient(to right,${palette.join(",")});border-radius:3px;margin:6px 0"></div>
            <div style="display:flex;justify-content:space-between;font-size:10px;color:#666"><span>${min.toFixed(2)}</span><span>${max.toFixed(2)}</span></div>`;
        }
        return div;
      },
    });
    legendRef.current = new Legend({ position: "bottomleft" });
    legendRef.current.addTo(map);
    if (layerControlRef.current) map.removeControl(layerControlRef.current);
    layerControlRef.current = L.control.layers(
      { "Street Map": map._baseStreet, "Satellite": map._baseSat },
      { [`${DATASET_CONFIG[datasetKey]?.label || "Data"} Layer`]: overlay },
      { collapsed: false }
    ).addTo(map);
    map.invalidateSize();

    // ── Open results panel ──
    const period = changeMode
      ? `${fmtLegend(fromYear, fromMonth, fromDay)} – ${fmtLegend(toYear, toMonth, toDay)} vs ${fmtLegend(fromYear2, fromMonth2, fromDay2)} – ${fmtLegend(toYear2, toMonth2, toDay2)}`
      : `${fmtLegend(fromYear, fromMonth, fromDay)} – ${fmtLegend(toYear, toMonth, toDay)}`;
    // Clear stale dashboard data whenever a new layer is loaded
    setBaselineData(null);
    setDistrictData(null);
    setAiInsights(null);
    setAiError(null);
    setShareUrl(null);
    setResultsData({
      label: data.legend?.label || index,
      datasetLabel: DATASET_CONFIG[datasetKey]?.label || datasetKey,
      period,
      isChange: changeMode,
      visParams: { ...(data.vis_params || {}), palette: palette.length > 0 ? palette : ((data.vis_params?.palette || []).map(normalizeColor)) },
      uniqueClasses: data.unique_classes || null,
      isLandcover: datasetKey === "landcover",
      metadata: data.metadata || null,
      legendMin: min,
      legendMax: max,
    });
    setResultsOpen(true);
    // Track current layer so pixel-click handler knows what to query
    activeLayerContextRef.current = {
      dataset: datasetKey,
      index,
      start: `${fromYear}-${fromMonth || "01"}-${fromDay || "01"}`,
      end:   `${toYear}-${toMonth || "12"}-${toDay || "31"}`,
      changeMode: false,
      isLandcover: datasetKey === "landcover",
    };
  };

  // ── View Selection ──
  // ── Async metadata fetch — called after tiles load ──
  const fetchMetadataAsync = async (ds, start, end, geometry) => {
    if (!ds || ds === "landcover" || ds === "climate" || ds === "hansen") return;
    setMetadataLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/metadata`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dataset: ds, startDate: start, endDate: end, geometry,
        }),
      });
      if (!res.ok) return;
      const meta = await res.json();
      setResultsData(prev => prev ? { ...prev, metadata: meta } : prev);
    } catch (e) { console.warn("Metadata fetch failed:", e); }
    finally { setMetadataLoading(false); }
  };

  const handleViewSelection = async (skipAoiCheck = false) => {
    const geometry = useCustomGeoJSON ? customGeoJSON?.geometry : selectedFeatureGeoJSON?.geometry;
    if (!geometry) return setMessage(useCustomGeoJSON ? "Upload a GeoJSON first" : "Select a feature first");
    if (!dataset || !index) return setMessage("Select dataset and index");

    // ── Hansen Global Forest Change — static dataset, year-only picker ──
    if (dataset === "hansen") {
      if (index === "lossyear" && !fromYear) return setMessage("Select a year of loss");
      setLoading(true); setMessage(null);
      try {
        const params = new URLSearchParams({ band: index });
        if (index === "lossyear" && fromYear) params.set("year", fromYear);
        const res = await fetch(`${BACKEND_URL}/hansen_tiles?${params}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);

        const map = mapRef.current;
        if (overlayRef.current) { try { map.removeLayer(overlayRef.current); } catch {} }
        if (legendRef.current)  { try { map.removeControl(legendRef.current); } catch {} }
        if (layerControlRef.current) { try { map.removeControl(layerControlRef.current); } catch {} }

        const overlay = L.tileLayer(data.tiles, { opacity: 1, zIndex: 5 }).addTo(map);
        overlayRef.current = overlay;

        const leg = data.legend || {};
        const Legend = L.Control.extend({
          onAdd() {
            const div = L.DomUtil.create("div");
            div.style.cssText = "background:white;padding:8px 10px;font-size:12px;box-shadow:0 2px 8px rgba(0,0,0,0.2);border-radius:6px;font-family:sans-serif;min-width:160px";
            if (leg.type === "discrete") {
              div.innerHTML = `<b style="font-size:11px;text-transform:uppercase;letter-spacing:0.05em">${leg.label || "Hansen GFC"}</b><br>`;
              (leg.items || []).forEach(item => {
                div.innerHTML += `<div style="display:flex;align-items:center;margin:3px 0"><i style="background:${item.color};width:14px;height:14px;border-radius:2px;margin-right:6px;flex-shrink:0"></i><span style="font-size:11px">${item.label}</span></div>`;
              });
            } else {
              const colors = (leg.colors || ["#ffffb2", "#bd0026"]).map(normalizeColor);
              div.innerHTML = `<b style="font-size:11px;text-transform:uppercase;letter-spacing:0.05em">${leg.label || "Hansen GFC"}</b>
                <div style="width:140px;height:10px;background:linear-gradient(to right,${colors.join(",")});border-radius:3px;margin:6px 0"></div>
                <div style="display:flex;justify-content:space-between;font-size:10px;color:#666"><span>${leg.min || ""}</span><span>${leg.max || ""}</span></div>`;
            }
            return div;
          },
        });
        legendRef.current = new Legend({ position: "bottomleft" });
        legendRef.current.addTo(map);

        const layerLabel = index === "lossyear"
          ? `Hansen Loss${fromYear ? ` ${fromYear}` : " (all years)"}`
          : `Hansen ${DATASET_CONFIG.hansen.indices.find(o => o.v === index)?.t || index}`;
        layerControlRef.current = L.control.layers(
          { "Street Map": map._baseStreet, "Satellite": map._baseSat },
          { [layerLabel]: overlay },
          { collapsed: false }
        ).addTo(map);
        map.invalidateSize();

        const periodLabel = index === "lossyear"
          ? (fromYear ? String(fromYear) : "2001–2025")
          : (index === "treecover2000" ? "2000" : "2000–2025");
        setResultsData({
          label: leg.label || layerLabel,
          datasetLabel: "Hansen Forest Change",
          period: periodLabel,
          isChange: false, isLandcover: false,
          visParams: {}, uniqueClasses: null, metadata: null, legendMin: 0, legendMax: 1,
        });
        setResultsOpen(true);
        activeLayerContextRef.current = {
          dataset: "hansen", index,
          start: "2000-01-01", end: "2025-12-31",
          changeMode: false, isLandcover: false,
        };
        setMessage("Hansen layer loaded successfully.");
      } catch (e) {
        setMessage(`Failed to load Hansen layer: ${e.message}`);
      } finally { setLoading(false); }
      return;
    }

    if (!fromYear || !toYear) return setMessage("Select date range");
    // AOI size check — instant, before any network call
    if (!skipAoiCheck && dataset) {
      const aoiCheck = checkAoiSize(geometry, dataset, "view");
      if (aoiCheck?.type === "block") return setMessage(aoiCheck.message);
      if (aoiCheck?.type === "warn") {
        setAoiWarning({ message: aoiCheck.message, onProceed: () => { setAoiWarning(null); handleViewSelection(true); } });
        return;
      }
    }
    if (changeMode) {
      if (dataset === "landcover") return setMessage("Change detection not available for land cover");
      if (!fromYear2 || !toYear2) return setMessage("Select Period 2 years");
      if (!validateChangeDates()) return;
      setLoading(true); setMessage(null);
      const map = mapRef.current;
      // Clear old change layers
      [p1LayerRef, p2LayerRef, changeLayerRef].forEach(ref => {
        if (ref.current) { try { map.removeLayer(ref.current); } catch {} ref.current = null; }
      });
      try {
        const s1 = `${fromYear}-${fromMonth || "01"}-${fromDay || "01"}`;
        const e1 = `${toYear}-${toMonth || "12"}-${toDay || "31"}`;
        const s2 = `${fromYear2}-${fromMonth2 || "01"}-${fromDay2 || "01"}`;
        const e2 = `${toYear2}-${toMonth2 || "12"}-${toDay2 || "31"}`;
        // Fetch P1, P2, and change map in parallel
        const [r1, r2, rC] = await Promise.all([
          fetch(`${BACKEND_URL}/gee_layers`, { method:"POST", headers:{"Content-Type":"application/json"},
            body: JSON.stringify({ dataset, index, startDate: s1, endDate: e1, geometry }) }),
          fetch(`${BACKEND_URL}/gee_layers`, { method:"POST", headers:{"Content-Type":"application/json"},
            body: JSON.stringify({ dataset, index, startDate: s2, endDate: e2, geometry }) }),
          fetch(`${BACKEND_URL}/change_detection`, { method:"POST", headers:{"Content-Type":"application/json"},
            body: JSON.stringify({ dataset, index, startDate1: s1, endDate1: e1, startDate2: s2, endDate2: e2, geometry }) }),
        ]);
        const [d1, d2, dC] = await Promise.all([r1.json(), r2.json(), rC.json()]);
        if (!r1.ok) throw new Error(d1.detail || "Period 1 failed");
        if (!r2.ok) throw new Error(d2.detail || "Period 2 failed");
        if (!rC.ok) throw new Error(dC.detail || "Change map failed");

        const url1 = d1.tiles || d1.mode_tiles;
        const url2 = d2.tiles || d2.mode_tiles;
        const urlC = dC.tiles;

        // Remove existing overlay/legend/control
        if (overlayRef.current) { try { map.removeLayer(overlayRef.current); } catch {} }
        if (legendRef.current)  { try { map.removeControl(legendRef.current); } catch {} }
        if (layerControlRef.current) { try { map.removeControl(layerControlRef.current); } catch {} }

        p1LayerRef.current     = L.tileLayer(url1, { opacity: 1, zIndex: 5 });
        p2LayerRef.current     = L.tileLayer(url2, { opacity: 1, zIndex: 6 });
        changeLayerRef.current = L.tileLayer(urlC, { opacity: 1, zIndex: 7 });

        // Add all three by default
        [p1LayerRef.current, p2LayerRef.current, changeLayerRef.current].forEach(l => l.addTo(map));
        overlayRef.current = changeLayerRef.current;

        if (dC.bounds?.length) {
          try { map.fitBounds(dC.bounds.map(([lng, lat]) => [lat, lng])); } catch {}
        }

        const dsLabel = DATASET_CONFIG[dataset]?.label || dataset;
        layerControlRef.current = L.control.layers(
          { "Street Map": map._baseStreet, "Satellite": map._baseSat },
          {
            [`🟦 ${dsLabel} ${index} P1 (${fmtLegend(fromYear, fromMonth, fromDay)}–${fmtLegend(toYear, toMonth, toDay)})`]: p1LayerRef.current,
            [`🟩 ${dsLabel} ${index} P2 (${fmtLegend(fromYear2, fromMonth2, fromDay2)}–${fmtLegend(toYear2, toMonth2, toDay2)})`]: p2LayerRef.current,
            [`🔴 Change Map`]: changeLayerRef.current,
          },
          { collapsed: false }
        ).addTo(map);

        // Change map legend
        const vis = d1.vis_params || {};
        const palette = (vis.palette || []).map(normalizeColor);
        const Legend = L.Control.extend({
          onAdd() {
            const div = L.DomUtil.create("div");
            div.style.cssText = "background:white;padding:8px 10px;font-size:11px;box-shadow:0 2px 8px rgba(0,0,0,0.2);border-radius:6px;font-family:sans-serif;min-width:160px";
            const min = vis.min ?? -1; const max = vis.max ?? 1;
            div.innerHTML = `<b style="font-size:11px;text-transform:uppercase;letter-spacing:0.05em">${index} Change</b>
              <div style="margin:6px 0 2px;font-size:10px;color:#666">P1 / P2 scale</div>
              <div style="width:140px;height:10px;background:linear-gradient(to right,${palette.join(",")});border-radius:3px;margin:4px 0"></div>
              <div style="display:flex;justify-content:space-between;font-size:10px;color:#666"><span>${min}</span><span>${max}</span></div>`;
            return div;
          }
        });
        legendRef.current = new Legend({ position: "bottomleft" });
        legendRef.current.addTo(map);
        map.invalidateSize();

        setResultsData({
          label: `${index} Change`,
          datasetLabel: DATASET_CONFIG[dataset]?.label || dataset,
          period: `${fmtLegend(fromYear, fromMonth, fromDay)} – ${fmtLegend(toYear, toMonth, toDay)} vs ${fmtLegend(fromYear2, fromMonth2, fromDay2)} – ${fmtLegend(toYear2, toMonth2, toDay2)}`,
          isChange: true, isLandcover: false,
          visParams: { ...vis, palette: (vis.palette || []).map(normalizeColor) },
          legendMin: vis.min ?? -1,
          legendMax: vis.max ?? 1,
          uniqueClasses: null, metadata: null,
        });
        setResultsOpen(true);
        activeLayerContextRef.current = {
          dataset, index, changeMode: true, isLandcover: false,
          p1Start: s1, p1End: e1, p2Start: s2, p2End: e2,
        };
        setMessage(`Change detection loaded — 3 layers added. Use checkboxes top-right to toggle.`);
      } catch (e) {
        const msg = e.message || "";
        const isAbort = e.name === "AbortError" || msg.includes("aborted");
        if (isAbort) setMessage("Request timed out. Try a smaller area or shorter date range.");
        else setMessage(`Change detection failed: ${msg}`);
      }
      finally { setLoading(false); }
      return;
    }
    if (!validateDates()) return;
    setLoading(true); setMessage(null);
    try {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 300000);
      const res = await fetch(`${BACKEND_URL}/gee_layers`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataset, index, startDate: `${fromYear}-${fromMonth || "01"}-${fromDay || "01"}`, endDate: `${toYear}-${toMonth || "12"}-${toDay || "31"}`, geometry }),
        signal: controller.signal,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
      if (!data.tiles && !data.mode_tiles) throw new Error(`No tiles for ${dataset} ${index}`);
      addOverlayAndLegend(data, dataset);
      setMessage("Layer loaded successfully.");
      // Fetch metadata asynchronously — don't block tile display
      const geomForMeta = useCustomGeoJSON ? customGeoJSON?.geometry : selectedFeatureGeoJSON?.geometry;
      fetchMetadataAsync(dataset,
        `${fromYear}-${fromMonth || "01"}-${fromDay || "01"}`,
        `${toYear}-${toMonth || "12"}-${toDay || "31"}`,
        geomForMeta
      );
    } catch (e) {
      const msg = e.message || "";
      const isAbort = e.name === "AbortError" || msg.includes("aborted");
      if (isAbort)
        setMessage("Request timed out (5 min limit). If this keeps happening, try a shorter date range.");
      else if (msg.includes("No") && (msg.includes("images") || msg.includes("data")))
        setMessage(`No ${DATASET_CONFIG[dataset]?.label || dataset} data found for this area and date range. Try a longer period or different dates.`);
      else if (msg.includes("cloud"))
        setMessage("Insufficient cloud-free imagery for this period. Try a longer date range or different season.");
      else setMessage(`Failed to load layer: ${msg}`);
    }
    finally { setLoading(false); }
  };

  // ── Download ──
  const handleDownloadClick = (which = null) => {
    const geometry = useCustomGeoJSON ? customGeoJSON?.geometry : selectedFeatureGeoJSON?.geometry;
    const aoiCheck = checkAoiSize(geometry, dataset, "download");
    if (aoiCheck?.type === "block") return setMessage(aoiCheck.message);
    if (aoiCheck?.type === "warn") {
      setAoiWarning({ message: aoiCheck.message, onProceed: () => { setAoiWarning(null); requireAuth("download_geotiff", () => _doDownload(which), aoiAreaKm2); } });
      return;
    }
    requireAuth("download_geotiff", () => _doDownload(which), aoiAreaKm2);
  };

  // ── Filename helpers ──
  const _fmtD = (y, m, d) => `${(d||"01").padStart(2,"0")}${(m||"01").padStart(2,"0")}${String(y||"").slice(-2)}`;
  const _dsPrefix = (ds, idx) => {
    if (ds === "sentinel2") return "S2";
    if (ds === "landsat")   return "LS";
    if (ds === "landcover") return "DW";
    if (ds === "modis")     return "MD";
    if (ds === "climate")   return idx || "CLIM"; // SPI / VHI become the prefix
    if (ds === "hansen")    return "HGF"; // Hansen Global Forest Change
    return ds.toUpperCase();
  };
  const _buildFilename = (ds, idx, sy, sm, sd, ey, em, ed, sf, suffix = "") => {
    const prefix = _dsPrefix(ds, idx);
    const idxPart = (ds === "climate" || ds === "landcover") ? "" : `_${idx}`;
    return `${prefix}${idxPart}_${_fmtD(sy,sm,sd)}_${_fmtD(ey,em,ed)}_${sf}${suffix}.tif`;
  };

  const _doDownload = async (which = null) => {
    const geometry = useCustomGeoJSON ? customGeoJSON?.geometry : selectedFeatureGeoJSON?.geometry;
    if (!geometry) return setMessage(useCustomGeoJSON ? "Upload a GeoJSON first" : "Select a feature first");
    if (!dataset || !index) return setMessage("Select dataset and index");
    if (!fromYear || !toYear) return setMessage("Select date range");
    if (!validateDates()) return;
    setLoading(true);
    try {
      let sf = (useCustomGeoJSON ? customGeoJSON.properties?.name || "Custom" : featureName || "Custom").replace(/[\s\/\\]/g,"_").replace(/[^a-zA-Z0-9_]/g,"");
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 1200000);
      if (changeMode) {
        if (!fromYear2 || !toYear2) { setMessage("Select Period 2 years"); setLoading(false); return; }
        const layer = which || (dataset === "landcover" ? "p1" : "change");
        const isP1 = layer === "p1";
        const isP2 = layer === "p2";
        if (isP1 || isP2) {
          const sY = isP1 ? fromYear  : fromYear2;  const sM = isP1 ? fromMonth  : fromMonth2;  const sD = isP1 ? fromDay  : fromDay2;
          const eY = isP1 ? toYear    : toYear2;    const eM = isP1 ? toMonth    : toMonth2;    const eD = isP1 ? toDay    : toDay2;
          const res = await fetch(`${BACKEND_URL}/download`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ dataset, index, startDate: `${sY}-${sM||"01"}-${sD||"01"}`, endDate: `${eY}-${eM||"12"}-${eD||"31"}`, geometry, selectedFeature: sf }),
            signal: controller.signal,
          });
          if (!res.ok) { const d = await res.json(); throw new Error(d.detail || `HTTP ${res.status}`); }
          const blob = await res.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a"); a.href = url;
          a.download = _buildFilename(dataset, index, sY, sM, sD, eY, eM, eD, sf, isP1 ? "_P1" : "_P2");
          document.body.appendChild(a); a.click(); a.remove();
          window.URL.revokeObjectURL(url);
          setMessage("Download successful!");
          setLoading(false); return;
        }
        // Change map download
        const res = await fetch(`${BACKEND_URL}/download_change`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dataset, index,
            startDate1: `${fromYear}-${fromMonth||"01"}-${fromDay||"01"}`, endDate1: `${toYear}-${toMonth||"12"}-${toDay||"31"}`,
            startDate2: `${fromYear2}-${fromMonth2||"01"}-${fromDay2||"01"}`, endDate2: `${toYear2}-${toMonth2||"12"}-${toDay2||"31"}`,
            geometry, selectedFeature: sf }),
          signal: controller.signal,
        });
        if (!res.ok) { const d = await res.json(); throw new Error(d.detail || `HTTP ${res.status}`); }
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url;
        const prefix = _dsPrefix(dataset, index);
        const idxPart = (dataset === "climate" || dataset === "landcover") ? "" : `_${index}`;
        a.download = `${prefix}${idxPart}_${_fmtD(fromYear,fromMonth,fromDay)}_${_fmtD(toYear,toMonth,toDay)}_${_fmtD(fromYear2,fromMonth2,fromDay2)}_${_fmtD(toYear2,toMonth2,toDay2)}_${sf}_change.tif`;
        document.body.appendChild(a); a.click(); a.remove();
        window.URL.revokeObjectURL(url);
        setMessage("Download successful!");
        return;
      }
      const res = await fetch(`${BACKEND_URL}/download`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataset, index,
          startDate: `${fromYear}-${fromMonth || "01"}-${fromDay || "01"}`,
          endDate: `${toYear}-${toMonth || "12"}-${toDay || "31"}`,
          geometry, selectedFeature: sf }),
        signal: controller.signal,
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail || `HTTP ${res.status}`); }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url;
      a.download = _buildFilename(dataset, index, fromYear, fromMonth, fromDay, toYear, toMonth, toDay, sf);
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
      setMessage("Download successful!");
    } catch (e) {
      const msg = e.message || "";
      if (msg.includes("abort") || msg.includes("timeout"))
        setMessage("Download timed out. Your area may be too large. Try a smaller region.");
      else if (msg.includes("All tiles failed"))
        setMessage("Download failed — no data available for this area and date range.");
      else setMessage(`Download failed: ${msg}`);
    }
    finally { setLoading(false); }
  };

  // ── Reset ──
  const handleReset = () => {
    const map = mapRef.current;
    if (!map) return;
    if (overlayRef.current) { try { map.removeLayer(overlayRef.current); } catch {} overlayRef.current = null; }
    if (legendRef.current) { try { map.removeControl(legendRef.current); } catch {} legendRef.current = null; }
    if (layerControlRef.current) { try { map.removeControl(layerControlRef.current); } catch {} layerControlRef.current = null; }
    [p1LayerRef, p2LayerRef, changeLayerRef].forEach(ref => {
      if (ref.current) { try { map.removeLayer(ref.current); } catch {} ref.current = null; }
    });
    if (drawnLayerRef.current) { try { map.removeLayer(drawnLayerRef.current); } catch {} drawnLayerRef.current = null; }
    setDrawnLayerExists(false);
    setActiveTool(null);
    if (gfc2020LayerRef.current) { try { map.removeLayer(gfc2020LayerRef.current); } catch {} gfc2020LayerRef.current = null; }
    setGfc2020Visible(false); setGfc2020TileUrl(null); setGfc2020Stats(null); setGfc2020Error(null);
    if (baselineLayerRef.current) { try { map.removeLayer(baselineLayerRef.current); } catch {} baselineLayerRef.current = null; }
    Object.values(boundaryLayersCache.current).forEach(l => { try { map.removeLayer(l); } catch {} });
    setDataset(""); setIndex(""); setAdminLevel(""); setFeatureList([]);
    setFeatureName(""); setSelectedFeatureGeoJSON(null); setMessage(null);
    setUseCustomGeoJSON(false); setCustomGeoJSON(null);
    setChangeMode(false);
    setFromYear(""); setFromMonth(""); setFromDay("");
    setToYear(""); setToMonth(""); setToDay("");
    setFromYear2(""); setFromMonth2(""); setFromDay2("");
    setToYear2(""); setToMonth2(""); setToDay2("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    setResultsOpen(false);
    setResultsData(null);
    setBaselineData(null);
    setDistrictData(null);
    setAiInsights(null);
    setAiError(null);
    setShareUrl(null);
    map.setView([9.145, 40.4897], 6);
  };

  // ── Shared input style ──
  const inputStyle = {
    background: t.input, border: `1px solid ${t.inputBorder}`, color: t.inputText,
    padding: "7px 10px", borderRadius: 6, fontSize: 13, width: "100%",
    outline: "none", fontFamily: "sans-serif",
  };
  const labelStyle = { fontSize: 11, fontWeight: 600, color: t.muted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4, display: "block" };
  const sectionStyle = { marginBottom: 20 };
  const sectionTitleStyle = { fontSize: 11, fontWeight: 700, color: t.accent, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 };

  // ── Date row component ──
  const DateRow = ({ label, y, m, d, setY, setM, setD, color, maxDate }) => {
    // Derive per-selector caps from maxDate
    const maxY  = maxDate ? maxDate.getFullYear() : null;
    const maxMo = (maxY && y && parseInt(y, 10) === maxY)
      ? String(maxDate.getMonth() + 1).padStart(2, "0")
      : null;
    const maxDy = (maxMo && m === maxMo)
      ? String(maxDate.getDate()).padStart(2, "0")
      : null;

    const filtYears  = maxY  ? yearOptions.filter(yr => yr <= maxY)          : yearOptions;
    const filtMonths = maxMo ? monthOptions.filter(mo => mo.value <= maxMo)  : monthOptions;
    const filtDays   = maxDy ? dayOptionsFor(y, m).filter(dd => dd <= maxDy) : dayOptionsFor(y, m);

    return (
      <div style={{ marginBottom: 8 }}>
        <span style={{ ...labelStyle, color: color || t.muted }}>{label}</span>
        <div style={{ display: "flex", gap: 6 }}>
          <select value={y} onChange={e => setY(e.target.value)} style={{ ...inputStyle, flex: 4 }}>
            <option value="">Year</option>
            {filtYears.map(yr => <option key={yr} value={yr}>{yr}</option>)}
          </select>
          <select value={m} onChange={e => setM(e.target.value)} style={{ ...inputStyle, flex: 5 }}>
            <option value="">Month</option>
            {filtMonths.map(mo => <option key={mo.value} value={mo.value}>{mo.label}</option>)}
          </select>
          <select value={d} onChange={e => setD(e.target.value)} style={{ ...inputStyle, flex: 3 }}>
            <option value="">Day</option>
            {filtDays.map(dd => <option key={dd} value={dd}>{dd}</option>)}
          </select>
        </div>
      </div>
    );
  };


  // ── Time Series ──
  const handleTimeSeries = () => {
    const geometry = useCustomGeoJSON ? customGeoJSON?.geometry : selectedFeatureGeoJSON?.geometry;
    if (!geometry) return setMessage(useCustomGeoJSON ? "Upload a GeoJSON first" : "Select a feature first");
    if (!dataset || !index) return setMessage("Select dataset and index");
    if (!fromYear || !toYear) return setMessage("Select date range");
    if (dataset === "landcover") return setMessage("Time series not available for land cover");
    const aoiCheck = checkAoiSize(geometry, dataset, "timeseries");
    if (aoiCheck?.type === "block") return setMessage(aoiCheck.message);
    if (aoiCheck?.type === "warn") {
      setAoiWarning({ message: aoiCheck.message, onProceed: () => { setAoiWarning(null); requireAuth("time_series", () => _doTimeSeries()); } });
      return;
    }
    requireAuth("time_series", () => _doTimeSeries());
  };

  const _doTimeSeries = async () => {
    const geometry = useCustomGeoJSON ? customGeoJSON?.geometry : selectedFeatureGeoJSON?.geometry;
    setTsLoading(true);
    setTsData(null);
    setActiveTab("timeseries");
    setResultsOpen(true);
    try {
      const res = await fetch(`${BACKEND_URL}/time_series`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dataset, index, interval: tsInterval === 'seasonal' ? `seasonal_${seasonStart}_${seasonEnd}` : tsInterval,
          startDate: `${fromYear}-${fromMonth || "01"}-${fromDay || "01"}`,
          endDate:   `${toYear}-${toMonth || "12"}-${toDay || "31"}`,
          geometry,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
      setTsData(data);
      setMessage("Time series loaded successfully.");
    } catch (e) {
      const msg = e.message || "";
      const isAbort = e.name === "AbortError" || msg.includes("aborted");
      if (isAbort) setMessage("Time series timed out. Try a shorter date range or smaller area.");
      else if (msg.includes("No") && msg.includes("data")) setMessage("No data available for this area and date range. Try adjusting your selection.");
      else setMessage(`Time series failed: ${msg}`);
    }
    finally { setTsLoading(false); }
  };

  // ── Land Cover Change Stats ──
  const handleLandcoverStats = () => {
    const geometry = useCustomGeoJSON ? customGeoJSON?.geometry : selectedFeatureGeoJSON?.geometry;
    if (!geometry) return setMessage(useCustomGeoJSON ? "Upload a GeoJSON first" : "Select a feature first");
    if (!fromYear || !toYear || !fromYear2 || !toYear2) return setMessage("Select both period date ranges");
    const aoiCheck = checkAoiSize(geometry, "landcover", "view");
    if (aoiCheck?.type === "block") return setMessage(aoiCheck.message);
    if (aoiCheck?.type === "warn") {
      setAoiWarning({ message: aoiCheck.message, onProceed: () => { setAoiWarning(null); requireAuth("landcover_stats", () => _doLandcoverStats()); } });
      return;
    }
    requireAuth("landcover_stats", () => _doLandcoverStats());
  };

  const _doLandcoverStats = async () => {
    const geometry = useCustomGeoJSON ? customGeoJSON?.geometry : selectedFeatureGeoJSON?.geometry;
    setStatsLoading(true);
    setStatsData(null);
    setActiveTab("changestats");
    setResultsOpen(true);
    try {
      const res = await fetch(`${BACKEND_URL}/landcover_change_stats`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate1: `${fromYear}-${fromMonth || "01"}-${fromDay || "01"}`,
          endDate1:   `${toYear}-${toMonth || "12"}-${toDay || "31"}`,
          startDate2: `${fromYear2}-${fromMonth2 || "01"}-${fromDay2 || "01"}`,
          endDate2:   `${toYear2}-${toMonth2 || "12"}-${toDay2 || "31"}`,
          geometry,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
      setStatsData(data);
      setMessage("Land cover statistics loaded successfully.");
    } catch (e) {
      const msg = e.message || "";
      const isAbort = e.name === "AbortError" || msg.includes("aborted");
      if (isAbort) setMessage("Stats timed out. Try a shorter date range or smaller area.");
      else setMessage(`Stats failed: ${msg}`);
    }
    finally { setStatsLoading(false); }
  };


  // ── Land Cover Change Map — 3 layers: P1, P2, Change ──
  const handleLandcoverChangeMap = async () => {
    const geometry = useCustomGeoJSON ? customGeoJSON?.geometry : selectedFeatureGeoJSON?.geometry;
    if (!geometry) return setMessage(useCustomGeoJSON ? "Upload a GeoJSON first" : "Select a feature first");
    if (!fromYear || !toYear || !fromYear2 || !toYear2) return setMessage("Select both period date ranges");
    setChangeMapLoading(true);
    setChangeMapData(null);
    setMessage(null);
    const map = mapRef.current;
    // Remove old change map layers
    [p1LayerRef, p2LayerRef, changeLayerRef].forEach(ref => {
      if (ref.current) { try { map.removeLayer(ref.current); } catch {} ref.current = null; }
    });
    try {
      const body1 = {
        dataset: "landcover", index: "dynamic",
        startDate: `${fromYear}-${fromMonth || "01"}-${fromDay || "01"}`,
        endDate:   `${toYear}-${toMonth || "12"}-${toDay || "31"}`,
        geometry,
      };
      const body2 = { ...body1,
        startDate: `${fromYear2}-${fromMonth2 || "01"}-${fromDay2 || "01"}`,
        endDate:   `${toYear2}-${toMonth2 || "12"}-${toDay2 || "31"}`,
      };
      const bodyChange = {
        startDate1: body1.startDate, endDate1: body1.endDate,
        startDate2: body2.startDate, endDate2: body2.endDate,
        geometry,
      };

      // Fetch all three in parallel
      const [r1, r2, rChange] = await Promise.all([
        fetch(`${BACKEND_URL}/gee_layers`, { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(body1) }),
        fetch(`${BACKEND_URL}/gee_layers`, { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(body2) }),
        fetch(`${BACKEND_URL}/landcover_change_map`, { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(bodyChange) }),
      ]);
      const [d1, d2, dChange] = await Promise.all([r1.json(), r2.json(), rChange.json()]);
      if (!r1.ok) throw new Error(d1.detail || "P1 failed");
      if (!r2.ok) throw new Error(d2.detail || "P2 failed");
      if (!rChange.ok) throw new Error(dChange.detail || "Change map failed");

      const url1 = d1.mode_tiles || d1.tiles;
      const url2 = d2.mode_tiles || d2.tiles;
      const urlC = dChange.tiles;

      // Remove existing overlays
      if (overlayRef.current) { try { map.removeLayer(overlayRef.current); } catch {} }
      if (legendRef.current)  { try { map.removeControl(legendRef.current); } catch {} }
      if (layerControlRef.current) { try { map.removeControl(layerControlRef.current); } catch {} }

      const p1Label = `🟦 Land Cover P1 (${fmtLegend(fromYear, fromMonth, fromDay)}–${fmtLegend(toYear, toMonth, toDay)})`;
      const p2Label = `🟩 Land Cover P2 (${fmtLegend(fromYear2, fromMonth2, fromDay2)}–${fmtLegend(toYear2, toMonth2, toDay2)})`;
      const chLabel = `🔴 Stable vs Changed`;

      p1LayerRef.current    = L.tileLayer(url1, { opacity: 1, zIndex: 5 });
      p2LayerRef.current    = L.tileLayer(url2, { opacity: 1, zIndex: 6 });
      changeLayerRef.current = L.tileLayer(urlC, { opacity: 1, zIndex: 7 });

      // Add all three by default
      [p1LayerRef.current, p2LayerRef.current, changeLayerRef.current].forEach(l => l.addTo(map));
      overlayRef.current = changeLayerRef.current; // track last for bounds

      // Fit bounds
      if (dChange.bounds?.length) {
        try { map.fitBounds(dChange.bounds.map(([lng, lat]) => [lat, lng])); } catch {}
      }

      // Layer control with checkboxes
      layerControlRef.current = L.control.layers(
        { "Street Map": map._baseStreet, "Satellite": map._baseSat },
        {
          [p1Label]: p1LayerRef.current,
          [p2Label]: p2LayerRef.current,
          [chLabel]: changeLayerRef.current,
        },
        { collapsed: false }
      ).addTo(map);

      // Simple change map legend
      const Legend = L.Control.extend({
        onAdd() {
          const div = L.DomUtil.create("div");
          div.style.cssText = "background:white;padding:8px 10px;font-size:11px;box-shadow:0 2px 8px rgba(0,0,0,0.2);border-radius:6px;font-family:sans-serif;min-width:140px";
          div.innerHTML = `<b style="font-size:11px;text-transform:uppercase;letter-spacing:0.05em">Change Map</b><br>
            <div style="display:flex;align-items:center;margin:4px 0"><i style="background:#9ca3af;width:14px;height:14px;border-radius:2px;margin-right:6px;flex-shrink:0"></i>Stable</div>
            <div style="display:flex;align-items:center;margin:4px 0"><i style="background:#dc2626;width:14px;height:14px;border-radius:2px;margin-right:6px;flex-shrink:0"></i>Changed</div>`;
          return div;
        }
      });
      legendRef.current = new Legend({ position: "bottomleft" });
      legendRef.current.addTo(map);
      map.invalidateSize();

      setChangeMapData(dChange);
      setActiveTab("changemap");
      setResultsOpen(true);
      activeLayerContextRef.current = {
        dataset: "landcover", index: "dynamic", changeMode: true, isLandcover: true,
        p1Start: body1.startDate, p1End: body1.endDate,
        p2Start: body2.startDate, p2End: body2.endDate,
      };
      setMessage("Land cover change map loaded — 3 layers added to map.");

      // Update results panel
      setResultsData({
        label: "Land Cover Change",
        datasetLabel: "Dynamic World",
        period: `${fmtLegend(fromYear, fromMonth, fromDay)} – ${fmtLegend(toYear, toMonth, toDay)} vs ${fmtLegend(fromYear2, fromMonth2, fromDay2)} – ${fmtLegend(toYear2, toMonth2, toDay2)}`,
        isChange: true, isLandcover: true,
        visParams: { ...(dChange.vis_params || {}), palette: ((dChange.vis_params?.palette || []).map(normalizeColor)) },
        uniqueClasses: null, metadata: null,
      });
    } catch (e) { setMessage(`Change map failed: ${e.message}`); }
    finally { setChangeMapLoading(false); }
  };
// ── Auth + email tracking ──
  const saveEmail = async (email, action) => {
    try {
      await fetch(`${BACKEND_URL}/capture_email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, action }),
      });
    } catch (e) { console.warn("Email save failed:", e); }
  };

  // Firebase auth state listener
  useEffect(() => {
    if (!_fbAuth) return;
    const unsub = onAuthStateChanged(_fbAuth, (u) => {
      setUser(u || null);
      if (u) {
        const key = `hwasat_seen_${u.uid}`;
        if (!localStorage.getItem(key)) {
          localStorage.setItem(key, "1");
          saveEmail(u.email, "google_signin");
        }
      }
    });
    return unsub;
  }, []);

  // Query backend: has this email already used their free quota for this action?
  const checkUsage = async (email, action, area_km2 = null) => {
    try {
      const body = { email, action };
      if (area_km2 !== null) body.area_km2 = area_km2;
      const res = await fetch(`${BACKEND_URL}/check_usage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) return { allowed: true }; // fail open on HTTP error
      return await res.json();               // { allowed, reason? }
    } catch (e) {
      console.warn("Usage check failed:", e);
      return { allowed: true };              // fail open on network error
    }
  };

  // Require Google sign-in before running an action, then check free-plan quota.
  // area_km2 is only relevant for download_geotiff (50 km² cap).
  const OWNER_EMAIL = "haftomhagos21@gmail.com";
  const RESTRICTED_ACTIONS = ["download_geotiff", "time_series"];

  const requireAuth = async (actionLabel, actionFn, area_km2 = null) => {
    if (!user) {
      setAuthPendingAction(() => actionFn);
      setAuthModalOpen(true);
      return;
    }
    // Owner has unlimited access — bypass all quota checks
    if (user.email === OWNER_EMAIL) {
      saveEmail(user.email, actionLabel);
      actionFn();
      return;
    }
    // Downloads and time series are restricted to owner only for now
    if (RESTRICTED_ACTIONS.includes(actionLabel)) {
      setPremiumGateReason("Downloads and time series are not yet available on the free plan. Contact us to request access.");
      setPremiumGateOpen(true);
      return;
    }
    // Check quota against Airtable before logging or running
    const usage = await checkUsage(user.email, actionLabel, area_km2);
    if (!usage.allowed) {
      setPremiumGateReason(usage.reason || "This feature requires a paid plan.");
      setPremiumGateOpen(true);
      return;
    }
    // Quota OK — log action then run
    saveEmail(user.email, actionLabel);
    actionFn();
  };

  // Alias so CSV export buttons keep working (CSV exports are not quota-gated)
  const requireEmail = (actionLabel, actionFn) => {
    if (user) { saveEmail(user.email, actionLabel); actionFn(); }
    else { setAuthPendingAction(() => actionFn); setAuthModalOpen(true); }
  };

  const handleGoogleSignIn = async () => {
    if (!_fbAuth || !_fbProvider) { console.error("Firebase not available"); return; }
    setAuthLoading(true);
    try {
      const result = await signInWithPopup(_fbAuth, _fbProvider);
      const u = result.user;
      setUser(u);
      setAuthModalOpen(false);
      saveEmail(u.email, "google_signin");
      if (authPendingAction) { authPendingAction(); setAuthPendingAction(null); }
    } catch (e) {
      if (e.code !== "auth/popup-closed-by-user") console.error("Sign in failed:", e);
    } finally { setAuthLoading(false); }
  };

  const handleSignOut = async () => {
    if (_fbAuth) await signOut(_fbAuth);
    setUser(null);
  };

  // Fallback email submit (kept for emailModalOpen legacy path)
  const handleEmailSubmit = async () => {
    const email = emailInput.trim();
    if (!email || !email.includes("@")) return;
    localStorage.setItem("hwasat_user_email", email);
    setEmailModalOpen(false);
    await saveEmail(email, "email_capture");
    if (emailPendingAction) { emailPendingAction(); setEmailPendingAction(null); }
    setEmailInput("");
  };

  // ── Export CSV: Time Series ──
  const exportTimeSeriesCSV = () => {
    requireEmail("export_timeseries_csv", () => {
      if (!tsData) return;
      const rows = [["Date", tsData.index], ...tsData.data.map(d => [d.date, d.value ?? ""])];
      const csv = rows.map(r => r.join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${tsData.dataset}_${tsData.index}_timeseries.csv`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  // ── Decision Dashboard ──
  const handleLoadDashboard = async () => {
    const geometry = useCustomGeoJSON ? customGeoJSON?.geometry : selectedFeatureGeoJSON?.geometry;
    if (!geometry || !dataset || !index || !fromYear || !toYear) return;
    const startDate = `${fromYear}-${fromMonth || "01"}-${fromDay || "01"}`;
    const endDate   = `${toYear}-${toMonth || "12"}-${toDay || "28"}`;
    const body = { dataset, index, startDate, endDate, geometry };

    // ── Resolve which East Africa country this AOI belongs to ────────────────
    // For dropdown selections the country is already known.
    // For custom-drawn / uploaded AOIs, detect it from the centroid vs COUNTRY_BOUNDS.
    let eaCountry = null;
    if (!useCustomGeoJSON && country) {
      eaCountry = COUNTRIES.find(c => c.key === country) || null;
    } else {
      // Detect by centroid overlap with each country's bounding box
      try {
        const [minLng, minLat, maxLng, maxLat] = getGeoBbox(geometry);
        const cLng = (minLng + maxLng) / 2;
        const cLat = (minLat + maxLat) / 2;
        for (const c of COUNTRIES) {
          const bounds = COUNTRY_BOUNDS[c.key];
          if (!bounds) continue;
          const [[bMinLat, bMinLng], [bMaxLat, bMaxLng]] = bounds;
          if (cLng >= bMinLng && cLng <= bMaxLng && cLat >= bMinLat && cLat <= bMaxLat) {
            eaCountry = c;
            break;
          }
        }
      } catch { /* geometry unusable — eaCountry stays null */ }
    }

    // ── Fetch and attach the website's boundary GeoJSON ──────────────────────
    if (eaCountry) {
      const bestLevel  = eaCountry.maxLevel; // finest available level (2 or 3)
      const countryKey = eaCountry.key;

      let features = [];

      if (!useCustomGeoJSON && featureName && adminLevel) {
        const selectedLevel = parseInt(adminLevel.replace("adm", ""), 10);
        const reportLevel = selectedLevel + 1;

        if (reportLevel > bestLevel || selectedLevel >= bestLevel) {
          // Already at finest level — send the selected feature as single unit
          features = selectedFeatureGeoJSON
            ? [{ type: "Feature", geometry: selectedFeatureGeoJSON.geometry || selectedFeatureGeoJSON, properties: { name: featureName } }]
            : [];
          body.districtLevel = selectedLevel;
        } else {
          // Load one level finer than what the user selected
          const reportLevelKey = `adm${reportLevel}`;
          let reportData = geojsonData[reportLevelKey] || dashboardBoundaryCacheRef.current[reportLevelKey];
          if (!reportData) {
            try {
              const resp = await fetch(`/data/${countryKey}/${countryKey}_level_${reportLevel}_gcs.geojson`);
              if (resp.ok) {
                reportData = await resp.json();
                // Cache in ref only — avoids triggering admin-level useEffect (which zooms map)
                dashboardBoundaryCacheRef.current[reportLevelKey] = reportData;
              }
            } catch (e) { console.warn("Could not load report boundary data:", e); }
          }
          if (reportData?.features?.length) {
            const parentKeys = [`adm${selectedLevel}_name`, `ADM${selectedLevel}_EN`, `ADM${selectedLevel}_NAME`];
            const needle = featureName.toLowerCase().trim();
            let filtered = reportData.features.filter(feat => {
              const p = feat.properties || {};
              return parentKeys.some(k => typeof p[k] === "string" && p[k].toLowerCase().trim() === needle);
            });
            // Additional centroid-in-polygon check to exclude edge features from neighbouring zones
            if (geometry && filtered.length > 0) {
              const selectedGeom = geometry;
              const withCentroid = filtered.filter(feat => {
                try { return geomContainsCentroid(selectedGeom, featureCentroid(feat)); }
                catch { return true; }
              });
              // Fallback: if centroid check removes everything, use name-match only
              filtered = withCentroid.length > 0 ? withCentroid : filtered;
            }
            features = filtered;
          }
          body.districtLevel = reportLevel;
        }
      } else {
        // Custom-drawn AOI → single polygon mean (backend returns one value for the whole area)
        features = [{ type: "Feature", geometry, properties: { name: "Selected Area" } }];
        body.districtLevel = 1;
      }

      if (features.length > 0) {
        body.customDistricts = { type: "FeatureCollection", features };
      }
    }

    // Load baseline + districts in parallel
    setBaselineLoading(true);
    setDistrictLoading(true);
    setBaselineData(null);
    setDistrictData(null);

    Promise.all([
      fetch(`${BACKEND_URL}/baseline`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then(r => r.json()).catch(() => null),

      fetch(`${BACKEND_URL}/district_summary`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then(r => r.json()).catch(() => null),
    ]).then(([baseline, districts]) => {
      setBaselineData(baseline);
      setDistrictData(Array.isArray(districts) ? districts : null);
      setBaselineLoading(false);
      setDistrictLoading(false);
    });
  };

  // Add baseline tile layer to the map for visual comparison
  const handleAddBaselineLayer = async () => {
    const geometry = useCustomGeoJSON ? customGeoJSON?.geometry : selectedFeatureGeoJSON?.geometry;
    if (!geometry || !dataset || !index || !fromYear) return;

    const currentYear = parseInt(fromYear, 10);
    const baselineEndYear   = currentYear - 1;
    const baselineStartYear = baselineEndYear - 4;
    const startDate = `${baselineStartYear}-${fromMonth || "01"}-${fromDay || "01"}`;
    const endDate   = `${baselineEndYear}-${toMonth || "12"}-${toDay || "28"}`;

    try {
      const res = await fetch(`${BACKEND_URL}/gee_layers`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataset, index, startDate, endDate, geometry }),
      });
      if (!res.ok) throw new Error("Failed to fetch baseline layer");
      const data = await res.json();
      const map = mapRef.current;
      if (!map || !data.tiles) return;

      // Remove old baseline layer
      if (baselineLayerRef.current) map.removeLayer(baselineLayerRef.current);

      const layer = L.tileLayer(data.tiles, { opacity: 0.7, attribution: "Baseline (5-yr mean)" });
      layer.addTo(map);
      baselineLayerRef.current = layer;

      // Add to layer control if present
      if (layerControlRef.current) {
        layerControlRef.current.addOverlay(layer, `📅 Baseline ${startDate.slice(0,4)}–${endDate.slice(0,4)}`);
      }
      setMessage(`Baseline layer added (${baselineStartYear}–${baselineEndYear} ${index})`);
    } catch (e) {
      setMessage("Could not load baseline layer: " + e.message);
    }
  };

  // ── Download PDF Report ──
  const handleDownloadReport = async (template) => {
    if (!baselineData) return;
    setReportLoading(true);
    try {
      const startDate = `${fromYear}-${fromMonth || "01"}-${fromDay || "01"}`;
      const endDate   = `${toYear}-${toMonth || "12"}-${toDay || "28"}`;
      const res = await fetch(`${BACKEND_URL}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          area_name:  featureName || "Selected Area",
          dataset,
          index,
          start_date: startDate,
          end_date:   endDate,
          baseline:   baselineData,
          districts:  districtData || [],
          template,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `hwasat_${(featureName || "report").replace(/\s+/g, "_")}_${index}_${startDate}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      setMessage(`Report generation failed: ${e.message}`);
    } finally {
      setReportLoading(false);
    }
  };

  // ── AI Plain-Language Insights ──
  const handleAiInsights = async () => {
    if (!baselineData || !user) {
      setAiError("Sign in and load the dashboard first.");
      return;
    }
    setAiLoading(true);
    setAiError(null);
    setAiInsights(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${BACKEND_URL}/ai_insights`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({
          area_name: featureName || "Selected Area",
          index, dataset,
          baseline:  baselineData,
          districts: districtData || [],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
      setAiInsights(data);
    } catch (e) {
      setAiError(e.message);
    } finally {
      setAiLoading(false);
    }
  };

  // ── Shareable Dashboard Link ──
  const handleCreateShare = async () => {
    if (!baselineData || !user) return;
    setShareLoading(true);
    setShareUrl(null);
    setShareCopied(false);
    try {
      const token = await user.getIdToken();
      const startDate = `${fromYear}-${fromMonth || "01"}-${fromDay || "01"}`;
      const endDate   = `${toYear}-${toMonth || "12"}-${toDay || "28"}`;
      const res = await fetch(`${BACKEND_URL}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({
          area_name:  featureName || "Selected Area",
          dataset, index,
          start_date: startDate,
          end_date:   endDate,
          baseline:   baselineData,
          districts:  districtData || [],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
      setShareUrl(data.url);
    } catch (e) {
      setMessage(`Share failed: ${e.message}`);
    } finally {
      setShareLoading(false);
    }
  };

  const handleCopyShareUrl = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    });
  };



  // ── Save AOI ──
  const handleSaveAoi = () => {
    const geometry = useCustomGeoJSON ? customGeoJSON?.geometry : selectedFeatureGeoJSON?.geometry;
    if (!geometry) return setMessage("Select or draw an area first");
    // Pre-fill name from current feature name or fallback
    const defaultName = featureName || (useCustomGeoJSON ? "Custom Area" : "My Area");
    setSaveAoiName(defaultName);
    setSaveAoiError(null);
    setSaveAoiSuccess(false);
    if (!user) {
      setAuthPendingAction(() => () => setSaveAoiModalOpen(true));
      setAuthModalOpen(true);
    } else {
      setSaveAoiModalOpen(true);
    }
  };

  const _doSaveAoi = async () => {
    const geometry = useCustomGeoJSON ? customGeoJSON?.geometry : selectedFeatureGeoJSON?.geometry;
    if (!geometry || !saveAoiName.trim()) return;
    setSaveAoiLoading(true);
    setSaveAoiError(null);
    try {
      const { saveAoi: _saveAoi } = await import("../services/aoiApi");
      await _saveAoi(user, {
        name: saveAoiName.trim(),
        geometry,
      });
      setSaveAoiSuccess(true);
      setTimeout(() => setSaveAoiModalOpen(false), 1800);
    } catch (e) {
      setSaveAoiError(e.message || "Failed to save area");
    } finally {
      setSaveAoiLoading(false);
    }
  };

  // ── Export CSV: Land Cover Stats ──
  const exportStatsCSV = () => {
    requireEmail("export_stats_csv", () => {
      if (!statsData) return;
      const headers = ["Class","Period1_%","Period2_%","Change_%","Period1_km2","Period2_km2","Change_km2"];
      const rows = statsData.rows.map(r => [
        r.class, r.pct1, r.pct2, r.change_pct, r.area1_km2, r.area2_km2, r.change_km2
      ]);
      const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `landcover_stats_${statsData.period1}_vs_${statsData.period2}.csv`.replace(/\s/g,"_");
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  // ── Friendly error message helper ──
  const friendlyError = (msg) => {
    if (!msg) return null;
    if (msg.includes("abort") || msg.includes("timeout")) return "Request timed out. Try a smaller area or shorter date range.";
    if (msg.includes("No Sentinel-2")) return "No cloud-free Sentinel-2 images found. Try a longer date range or different season.";
    if (msg.includes("No Landsat")) return "No Landsat data found for this area and date range.";
    if (msg.includes("No CHIRPS")) return "No climate data found for this area. CHIRPS covers land areas only.";
    if (msg.includes("No MODIS")) return "No MODIS data found. Check that your date range is after February 2000.";
    if (msg.includes("No Dynamic World")) return "No land cover data found for this area and date range.";
    if (msg.includes("AOI too large")) return msg;
    return msg;
  };

  const SIDEBAR_W = 300;

  return (
    <div style={{ display: "flex", height: "calc(100vh - 56px)", background: t.bg, fontFamily: "'Georgia', serif", position: "relative", overflow: "hidden" }}>

      {/* ── Collapsible Sidebar ── */}
      <div style={{
        width: sidebarOpen ? SIDEBAR_W : 0,
        minWidth: sidebarOpen ? SIDEBAR_W : 0,
        background: t.sidebar,
        borderRight: `1px solid ${t.border}`,
        transition: "width 0.3s ease, min-width 0.3s ease",
        overflow: "hidden",
        display: "flex", flexDirection: "column",
        boxShadow: t.shadow,
        zIndex: 100,
      }}>
        <div style={{ width: SIDEBAR_W, height: "100%", overflowY: "auto", padding: "16px 16px 24px" }}>

          {/* Sidebar header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 18 }}>🛰️</span>
              <span style={{ fontWeight: 700, fontSize: 15, color: t.text }}>Controls</span>
            </div>
            <button onClick={() => setDarkMode(!darkMode)} style={{ background: "none", border: `1px solid ${t.border}`, borderRadius: 6, padding: "4px 8px", cursor: "pointer", color: t.muted, display: "flex", alignItems: "center", gap: 4, fontSize: 11 }}>
              {darkMode ? "☀️ Light" : "🌙 Dark"}
            </button>
          </div>

          {/* ── Area of Interest ── */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>
              <Icon d={icons.map} size={13} />
              Area of Interest
            </div>

            <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
              {/* Country select — styled as a tab button */}
              <select
                value={country}
                onChange={e => { setUseCustomGeoJSON(false); handleCountryChange(e.target.value); }}
                style={{
                  flex: 1, padding: "6px 4px", fontSize: 11, borderRadius: 6,
                  cursor: "pointer", fontFamily: "sans-serif", fontWeight: 600,
                  background: t.card,
                  color: t.muted,
                  border: `1px solid ${t.border}`,
                  appearance: "none", WebkitAppearance: "none",
                }}
              >
                <option value="">Select Country</option>
                {COUNTRIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>

              {/* Upload GeoJSON button */}
              <button
                onClick={() => { setUseCustomGeoJSON(true); setCustomGeoJSON(null); }}
                style={{
                  flex: 1, padding: "6px 4px", fontSize: 11, borderRadius: 6,
                  cursor: "pointer", fontFamily: "sans-serif", fontWeight: 600,
                  background: t.card,
                  color: t.muted,
                  border: `1px solid ${useCustomGeoJSON ? t.accent : t.border}`,
                }}
              >
                Upload GeoJSON
              </button>
            </div>

            {useCustomGeoJSON ? (
              <div>
                <label style={{ ...inputStyle, display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "8px 10px" }}>
                  <Icon d={icons.upload} size={14} />
                  <span style={{ fontSize: 12, color: t.muted }}>{customGeoJSON ? (customGeoJSON.properties?.name || "File loaded ✓") : "Click to upload GeoJSON"}</span>
                  <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".geojson,.json" style={{ display: "none" }} />
                </label>
              </div>
            ) : (
              <>
                {/* Admin Level + Feature — side by side */}
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    {/* <span style={labelStyle}>Admin Level</span>*/}
                    <select value={adminLevel} onChange={e => setAdminLevel(e.target.value)} style={inputStyle} disabled={!country}>
                      <option value="">Admin Level</option>
                      {country && (() => {
                        const cfg = COUNTRIES.find(c => c.key === country);
                        return [
                          <option key="adm0" value="adm0">Level 0 (Country)</option>,
                          cfg?.maxLevel >= 1 && <option key="adm1" value="adm1">Level 1</option>,
                          cfg?.maxLevel >= 2 && <option key="adm2" value="adm2">Level 2</option>,
                          cfg?.maxLevel >= 3 && <option key="adm3" value="adm3">Level 3</option>,
                        ];
                      })()}
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    {/*<span style={labelStyle}>Feature</span>*/}
                    <select value={featureName} onChange={e => setFeatureName(e.target.value)} style={inputStyle} disabled={!adminLevel || !featureList.length}>
                      <option value="">Select area</option>
                      {featureList.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ── AOI Area Display ── */}
          {aoiAreaKm2 && dataset && (
            <div style={{
              marginBottom: 12, padding: "8px 12px", borderRadius: 8,
              background: (() => {
                const limits = AOI_LIMITS[dataset];
                if (!limits) return t.card;
                if (aoiAreaKm2 > limits.view) return darkMode ? "rgba(239,68,68,0.15)" : "#fef2f2";
                if (aoiAreaKm2 > limits.warn) return darkMode ? "rgba(234,179,8,0.15)" : "#fefce8";
                return darkMode ? "rgba(34,197,94,0.1)" : "#f0fdf4";
              })(),
              border: `1px solid ${(() => {
                const limits = AOI_LIMITS[dataset];
                if (!limits) return t.border;
                if (aoiAreaKm2 > limits.view) return "#fca5a5";
                if (aoiAreaKm2 > limits.warn) return "#fde047";
                return "#86efac";
              })()}`,
              fontFamily: "sans-serif",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <span style={{ fontSize: 11, color: t.muted }}>Selected area</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: (() => {
                const limits = AOI_LIMITS[dataset];
                if (!limits) return t.text;
                if (aoiAreaKm2 > limits.view) return "#dc2626";
                if (aoiAreaKm2 > limits.warn) return "#ca8a04";
                return "#16a34a";
              })() }}>
                {aoiAreaKm2.toLocaleString()} km²
              </span>
            </div>
          )}

          {aoiAreaKm2 && !dataset && (
            <div style={{ marginBottom: 12, padding: "8px 12px", borderRadius: 8, background: t.card, border: `1px solid ${t.border}`, fontFamily: "sans-serif", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 11, color: t.muted }}>Selected area</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: t.text }}>{aoiAreaKm2.toLocaleString()} km²</span>
            </div>
          )}

          {/* ── Dataset & Index ── */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>
              <Icon d={icons.layers} size={13} />
              Dataset & Index
            </div>
            {/* Dataset + Index — side by side */}
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ flex: 1 }}>
                {/*<span style={labelStyle}>Dataset</span>*/}
                <select value={dataset} onChange={e => setDataset(e.target.value)} style={inputStyle}>
                  <option value="">Dataset</option>
                  {Object.entries(DATASET_CONFIG).map(([k, v]) => (
                    <option key={k} value={k}>{v.icon} {v.label}</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                {/*<span style={labelStyle}>Index</span>*/}
                <select value={index} onChange={e => setIndex(e.target.value)} style={inputStyle} disabled={!dataset}>
                  <option value="">Index</option>
                  {indexOptions.map(o => <option key={o.v} value={o.v}>{o.t}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* ── EUDR Forest Baseline 2020 ── */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>
              🌲 EUDR Forest Baseline
            </div>
            <button
              onClick={() => setGfc2020Visible(v => !v)}
              style={{
                width: "100%", padding: "8px 12px", borderRadius: 7, cursor: "pointer",
                fontFamily: "sans-serif", fontSize: 12, fontWeight: 600,
                background: gfc2020Visible ? "#15803d" : t.card,
                color: gfc2020Visible ? "#fff" : t.muted,
                border: `1px solid ${gfc2020Visible ? "#15803d" : t.border}`,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}>
              {gfc2020Visible ? "✓ Forest Cover 2020 ON" : "Show Forest Cover 2020 (JRC)"}
            </button>
            {gfc2020Visible && (
              <div style={{ marginTop: 6, fontSize: 11, color: t.muted, lineHeight: 1.5 }}>
                Dark green = forested in 2020 · JRC GFC2020 v3 · 10 m · EUDR reference layer
              </div>
            )}
            {gfc2020Visible && gfc2020StatsLoading && (
              <div style={{ marginTop: 8, fontSize: 12, color: t.muted, textAlign: "center", padding: "6px 0" }}>
                Computing forest stats…
              </div>
            )}
            {gfc2020Visible && gfc2020Error && (
              <div style={{ marginTop: 8, fontSize: 11, color: "#dc2626", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 7, padding: "7px 10px" }}>
                ⚠ {gfc2020Error}
              </div>
            )}
            {gfc2020Visible && gfc2020Stats && !gfc2020StatsLoading && (
              <div style={{ marginTop: 8, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "10px 12px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#15803d", marginBottom: 6 }}>
                  Forest Cover — 2020 Baseline
                </div>
                {[
                  ["Total Area",    `${gfc2020Stats.total_ha?.toLocaleString()} ha`],
                  ["Forest (2020)", `${gfc2020Stats.forest_ha?.toLocaleString()} ha · ${gfc2020Stats.forest_pct}%`],
                  ["Non-Forest",    `${gfc2020Stats.non_forest_ha?.toLocaleString()} ha · ${gfc2020Stats.non_forest_pct}%`],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, padding: "3px 0", borderBottom: "1px solid #d1fae5" }}>
                    <span style={{ color: "#374151" }}>{label}</span>
                    <span style={{ fontWeight: 600, color: "#15803d" }}>{value}</span>
                  </div>
                ))}
                <div style={{ marginTop: 6, fontSize: 10, color: "#6b7280", lineHeight: 1.4 }}>
                  Source: JRC/GFC2020/V3 · EUDR designated reference dataset
                </div>
              </div>
            )}
          </div>

          {/* ── Mode Toggle — hidden for Hansen (static dataset) ── */}
          {dataset !== "hansen" && (
            <div style={sectionStyle}>
              <div style={sectionTitleStyle}>
                <Icon d={icons.compare} size={13} />
                Analysis Mode
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {[["Single Date", false], ["Change Detection", true]].map(([label, mode]) => (
                  <button key={label} onClick={() => { setChangeMode(mode); setMessage(null); }}
                    style={{ flex: 1, padding: "7px 4px", fontSize: 11, borderRadius: 6, cursor: "pointer", fontFamily: "sans-serif", fontWeight: 600,
                      background: changeMode === mode ? (mode ? "#ea580c" : t.btnPrimary) : t.card,
                      color: changeMode === mode ? "#fff" : t.muted,
                      border: `1px solid ${changeMode === mode ? (mode ? "#ea580c" : t.btnPrimary) : t.border}`,
                    }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Dates ── */}
          {dataset === "hansen" ? (
            /* Hansen: year-only for lossyear; nothing needed for other bands */
            index === "lossyear" && (
              <div style={sectionStyle}>
                <div style={sectionTitleStyle}>
                  <Icon d={icons.calendar} size={13} />
                  Year of Loss
                </div>
                <select value={fromYear} onChange={e => setFromYear(e.target.value)} style={inputStyle}>
                  <option value="">All years (2001–2025)</option>
                  {Array.from({ length: 25 }, (_, i) => 2025 - i).map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <div style={{ marginTop: 6, fontSize: 11, color: t.muted, lineHeight: 1.5 }}>
                  Leave blank to show all loss years in a gradient. Select a year to highlight only that year's loss.
                </div>
              </div>
            )
          ) : (
            <>
              <div style={sectionStyle}>
                <div style={sectionTitleStyle}>
                  <Icon d={icons.calendar} size={13} />
                  {changeMode ? "Period 1" : "Date Range"}
                </div>
                <DateRow label="From" y={fromYear} m={fromMonth} d={fromDay} setY={setFromYear} setM={setFromMonth} setD={setFromDay} maxDate={dataset ? getDatasetMaxDate(dataset) : null} />
                <DateRow label="To" y={toYear} m={toMonth} d={toDay} setY={setToYear} setM={setToMonth} setD={setToDay} maxDate={dataset ? getDatasetMaxDate(dataset) : null} />
              </div>

              {/* ── Period 2 (change detection) ── */}
              {changeMode && (
                <div style={sectionStyle}>
                  <div style={{ ...sectionTitleStyle, color: "#ea580c" }}>
                    <Icon d={icons.calendar} size={13} />
                    Period 2
                  </div>
                  <DateRow label="From" y={fromYear2} m={fromMonth2} d={fromDay2} setY={setFromYear2} setM={setFromMonth2} setD={setFromDay2} color="#ea580c" maxDate={dataset ? getDatasetMaxDate(dataset) : null} />
                  <DateRow label="To" y={toYear2} m={toMonth2} d={toDay2} setY={setToYear2} setM={setToMonth2} setD={setToDay2} color="#ea580c" maxDate={dataset ? getDatasetMaxDate(dataset) : null} />
                </div>
              )}
            </>
          )}

          {/* ── Action Buttons ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>

            {/* Visualize — hidden for land cover + change detection; always shown for Hansen */}
            {(dataset === "hansen" || !(dataset === "landcover" && changeMode)) && (
              <button onClick={() => handleViewSelection()} disabled={loading}
                style={{ background: t.btnPrimary, color: "#fff", border: "none", borderRadius: 7, padding: "10px 8px", fontSize: 13, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: "sans-serif" }}>
                <Icon d={icons.eye} size={14} /> {dataset === "landcover" ? "View Map" : "Visualize"}
              </button>
            )}

            {/* Download row — hidden for Hansen; varies by mode otherwise */}
            {dataset !== "hansen" && (
              dataset === "landcover" && changeMode ? (
                /* Land cover change mode: Change Map | Stats row + P1 | P2 | Change download row */
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <div style={{ display: "flex", gap: 5 }}>
                    <button onClick={handleLandcoverChangeMap} disabled={changeMapLoading || loading}
                      style={{ flex: 1, background: "#b45309", color: "#fff", border: "none", borderRadius: 7, padding: "10px 4px", fontSize: 11, fontWeight: 600, cursor: (changeMapLoading || loading) ? "not-allowed" : "pointer", opacity: (changeMapLoading || loading) ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, fontFamily: "sans-serif" }}>
                      🗺️ {changeMapLoading ? "…" : "Change Map"}
                    </button>
                    <button onClick={handleLandcoverStats} disabled={statsLoading || loading}
                      style={{ flex: 1, background: "#0891b2", color: "#fff", border: "none", borderRadius: 7, padding: "10px 4px", fontSize: 11, fontWeight: 600, cursor: (statsLoading || loading) ? "not-allowed" : "pointer", opacity: (statsLoading || loading) ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, fontFamily: "sans-serif" }}>
                      📊 {statsLoading ? "…" : "Stats"}
                    </button>
                  </div>
                  <div style={{ display: "flex", gap: 5 }}>
                    {[["P1", "p1", "#1d4ed8"], ["P2", "p2", "#ea580c"], ["Change", "change", t.btnSecondary]].map(([label, which, bg]) => (
                      <button key={which} onClick={() => handleDownloadClick(which)} disabled={loading}
                        style={{ flex: 1, background: bg, color: "#fff", border: "none", borderRadius: 7, padding: "10px 4px", fontSize: 11, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, fontFamily: "sans-serif" }}>
                        <Icon d={icons.download} size={12} /> {label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : changeMode ? (
                /* Non-landcover change mode: P1 | P2 | Change download buttons */
                <div style={{ display: "flex", gap: 5 }}>
                  {[["P1", "p1", "#1d4ed8"], ["P2", "p2", "#ea580c"], ["Change", "change", t.btnSecondary]].map(([label, which, bg]) => (
                    <button key={which} onClick={() => handleDownloadClick(which)} disabled={loading}
                      style={{ flex: 1, background: bg, color: "#fff", border: "none", borderRadius: 7, padding: "10px 4px", fontSize: 11, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, fontFamily: "sans-serif" }}>
                      <Icon d={icons.download} size={12} /> {label}
                    </button>
                  ))}
                </div>
              ) : (
                /* Single mode: Download */
                <button onClick={() => handleDownloadClick()} disabled={loading}
                  style={{ background: t.btnSecondary, color: "#fff", border: "none", borderRadius: 7, padding: "10px 8px", fontSize: 13, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: "sans-serif" }}>
                  <Icon d={icons.download} size={14} /> Download
                </button>
              )
            )}
            <button onClick={handleReset}
              style={{ background: t.card, color: t.muted, border: `1px solid ${t.border}`, borderRadius: 7, padding: "9px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: "sans-serif" }}>
              <Icon d={icons.reset} size={14} /> Reset Map
            </button>

            {/* Save AOI — appears when an area is selected or drawn */}
            {(selectedFeatureGeoJSON || (useCustomGeoJSON && customGeoJSON) || drawnLayerExists) && (
              <button onClick={handleSaveAoi}
                style={{ background: "transparent", color: "#16a34a", border: "1.5px solid #16a34a", borderRadius: 7, padding: "9px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: "sans-serif", transition: "all 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.background = "#16a34a"; e.currentTarget.style.color = "#fff"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#16a34a"; }}
              >
                <Icon d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" size={14} /> Save Area
              </button>
            )}
          </div>

          {/* ── Message ── */}
          {message && (
            <div style={{
              marginTop: 14, padding: "10px 12px", borderRadius: 7, fontSize: 12, fontFamily: "sans-serif", lineHeight: 1.5,
              background: message.toLowerCase().includes("success") || message.toLowerCase().includes("loaded") ? (darkMode ? "rgba(34,197,94,0.1)" : "#f0fdf4") : (darkMode ? "rgba(239,68,68,0.1)" : "#fef2f2"),
              border: `1px solid ${message.toLowerCase().includes("success") || message.toLowerCase().includes("loaded") ? "#86efac" : "#fca5a5"}`,
              color: message.toLowerCase().includes("success") || message.toLowerCase().includes("loaded") ? "#15803d" : "#b91c1c",
            }}>
              {message}
            </div>
          )}
        </div>
      </div>

      {/* ── Sidebar toggle button ── */}
      <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{
        position: "absolute", left: sidebarOpen ? SIDEBAR_W : 0, top: "50%", transform: "translateY(-50%)",
        zIndex: 200, background: t.sidebar, border: `1px solid ${t.border}`,
        borderLeft: "none",
        borderRadius: "0 6px 6px 0",
        padding: "12px 5px", cursor: "pointer", color: t.muted,
        transition: "left 0.3s ease", boxShadow: "2px 0 8px rgba(0,0,0,0.1)",
      }}>
        <Icon d={sidebarOpen ? icons.chevronL : icons.chevronR} size={14} />
      </button>

      {/* ── Map ── */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        <div id="map" style={{ height: "100%", width: "100%" }} />

        {/* ── Drawing Toolbar ── */}
        <div style={{
          position: "absolute", top: 80, left: 10, zIndex: 1000,
          display: "flex", flexDirection: "column", gap: 4,
        }}>
          {[
            { type: "rectangle", title: "Draw Rectangle", svg: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="3" width="14" height="10" rx="1" stroke="currentColor" strokeWidth="1.8"/></svg> },
            { type: "polygon",   title: "Draw Polygon (double-click to finish)", svg: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><polygon points="8,1 15,6 12,14 4,14 1,6" stroke="currentColor" strokeWidth="1.8" fill="none"/></svg> },
            { type: "circle",    title: "Draw Circle", svg: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.8"/></svg> },
          ].map(({ type, title, svg }) => (
            <button key={type} title={title} onClick={() => activeTool === type ? setActiveTool(null) || (drawingStateRef.current.active = false) || (mapRef.current.getContainer().style.cursor = "") : startDrawing(type)} style={{
              width: 32, height: 32, borderRadius: 6, border: "2px solid",
              borderColor: activeTool === type ? "#ef4444" : "rgba(0,0,0,0.25)",
              background: activeTool === type ? "#fef2f2" : "white",
              color: activeTool === type ? "#ef4444" : "#444",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
            }}>
              {svg}
            </button>
          ))}
          {drawnLayerExists && (
            <button title="Clear drawn AOI" onClick={() => {
              if (drawnLayerRef.current) {
                try { mapRef.current.removeLayer(drawnLayerRef.current); } catch {}
                drawnLayerRef.current = null;
              }
              // Also remove from boundary cache
              if (boundaryLayersCache.current.custom) {
                try { mapRef.current.removeLayer(boundaryLayersCache.current.custom); } catch {}
                delete boundaryLayersCache.current.custom;
              }
              setDrawnLayerExists(false);
              setCustomGeoJSON(null);
              setUseCustomGeoJSON(false);
              setActiveTool(null);
            }} style={{
              width: 32, height: 32, borderRadius: 6, border: "2px solid rgba(0,0,0,0.25)",
              background: "white", color: "#888", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 1px 4px rgba(0,0,0,0.2)", marginTop: 4,
            }} title="Clear drawing">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            </button>
          )}
        </div>

        {/* Loading spinner */}
        {loading && (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", background: "rgba(0,0,0,0.35)", zIndex: 9999, gap: 16 }}>
            <div style={{ width: 48, height: 48, border: "4px solid rgba(255,255,255,0.3)", borderTop: "4px solid #22c55e", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            <span style={{ color: "#fff", fontSize: 13, fontFamily: "sans-serif", fontWeight: 500 }}>Processing satellite data...</span>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* ── Results panel toggle button ── */}
        <button onClick={() => setResultsOpen(!resultsOpen)} style={{
          position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)",
          zIndex: 200, background: t.sidebar, border: `1px solid ${t.border}`,
          borderRight: "none",
          borderRadius: "6px 0 0 6px",
          padding: "12px 5px", cursor: "pointer", color: t.muted,
          boxShadow: "-2px 0 8px rgba(0,0,0,0.1)",
        }}>
          <Icon d={resultsOpen ? icons.chevronR : icons.chevronL} size={14} />
        </button>
      </div>

      {/* ── Sliding Results Panel ── */}
      <div style={{
        width: resultsOpen ? 320 : 0,
        minWidth: resultsOpen ? 320 : 0,
        background: t.sidebar,
        borderLeft: `1px solid ${t.border}`,
        transition: "width 0.35s ease, min-width 0.35s ease",
        overflow: "hidden",
        display: "flex", flexDirection: "column",
        boxShadow: resultsOpen ? "-4px 0 20px rgba(0,0,0,0.12)" : "none",
        zIndex: 100,
      }}>
        <div style={{ width: 320, height: "100%", overflowY: "auto", display: "flex", flexDirection: "column" }}>

          {/* Panel header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px 0", flexShrink: 0 }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: t.text }}>Results</span>
            <button onClick={() => setResultsOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: t.muted, padding: 4, borderRadius: 4 }}>
              <Icon d={icons.close} size={16} />
            </button>
          </div>

          {/* ── Tabs ── */}
          <div style={{ display: "flex", borderBottom: `1px solid ${t.border}`, margin: "12px 16px 0", flexShrink: 0 }}>
            {[
              { key: "info",        label: "Layer Info" },
              { key: "timeseries",  label: "📈 Time Series", hide: dataset === "landcover" },
              { key: "changestats", label: "📊 Change Stats", hide: !(dataset === "landcover" && changeMode) },
              { key: "changemap",   label: "🗺️ Change Map",  hide: !(dataset === "landcover" && changeMode) },
            ].filter(tab => !tab.hide).map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
                padding: "7px 12px", fontSize: 11, fontWeight: 600, border: "none", cursor: "pointer",
                background: "none", fontFamily: "sans-serif",
                color: activeTab === tab.key ? t.accent : t.muted,
                borderBottom: activeTab === tab.key ? `2px solid ${t.accent}` : "2px solid transparent",
                marginBottom: -1,
              }}>{tab.label}</button>
            ))}
          </div>

          {/* ── Tab content ── */}
          <div style={{ padding: "16px 16px 24px", flex: 1, overflowY: "auto" }}>

            {/* ── INFO TAB ── */}
            {activeTab === "info" && resultsData && (
              <>
                <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 10, padding: "14px 16px", marginBottom: 16 }}>
                  <div style={{ fontSize: 11, color: t.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6, fontFamily: "sans-serif" }}>Active Layer</div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: t.accent, marginBottom: 4 }}>{resultsData.label}</div>
                  <div style={{ fontSize: 12, color: t.muted, fontFamily: "sans-serif" }}>{resultsData.datasetLabel}</div>
                  <div style={{ fontSize: 12, color: t.muted, fontFamily: "sans-serif", marginTop: 2 }}>📅 {resultsData.period}</div>
                  {resultsData.isChange && (
                    <div style={{ marginTop: 8, padding: "6px 8px", background: darkMode ? "rgba(234,88,12,0.1)" : "#fff7ed", borderRadius: 6, fontSize: 11, color: "#9a3412", fontFamily: "sans-serif" }}>
                      Change detection: Period 2 − Period 1
                    </div>
                  )}
                </div>

                {!resultsData.isLandcover && resultsData.visParams?.palette?.filter(c => c)?.length > 0 && (
                  <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 10, padding: "14px 16px", marginBottom: 16 }}>
                    <div style={{ fontSize: 11, color: t.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10, fontFamily: "sans-serif" }}>Colour Scale</div>
                    <div style={{ height: 14, borderRadius: 6, border: "1px solid rgba(0,0,0,0.12)", background: `linear-gradient(to right, ${resultsData.visParams.palette.filter(Boolean).join(",")})`, marginBottom: 6 }} />
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: t.muted, fontFamily: "sans-serif" }}>
                      <span>{(resultsData.legendMin ?? resultsData.visParams.min ?? 0).toFixed(2)}</span>
                      <span>{(resultsData.legendMax ?? resultsData.visParams.max ?? 1).toFixed(2)}</span>
                    </div>
                    {resultsData.isChange && (
                      <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 4, fontSize: 11, fontFamily: "sans-serif", color: t.muted }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 12, height: 12, borderRadius: 2, background: "#d73027", flexShrink: 0, display: "inline-block" }} />Decrease</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 12, height: 12, borderRadius: 2, background: "#ffffff", border: "1px solid #ccc", flexShrink: 0, display: "inline-block" }} />No change</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 12, height: 12, borderRadius: 2, background: "#1a9850", flexShrink: 0, display: "inline-block" }} />Increase</div>
                      </div>
                    )}
                  </div>
                )}

                {resultsData.isLandcover && resultsData.uniqueClasses?.length > 0 && (
                  <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 10, padding: "14px 16px", marginBottom: 16 }}>
                    <div style={{ fontSize: 11, color: t.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10, fontFamily: "sans-serif" }}>Land Cover Classes</div>
                    {resultsData.uniqueClasses.map((cls, i) => {
                      const name = typeof cls === "string" ? cls : cls.class_name || `Class ${i}`;
                      const color = LANDCOVER_PALETTE[name] || "#ccc";
                      return (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                          <span style={{ width: 14, height: 14, borderRadius: 3, background: color, flexShrink: 0, display: "inline-block", border: "1px solid rgba(0,0,0,0.1)" }} />
                          <span style={{ fontSize: 12, color: t.text, fontFamily: "sans-serif" }}>{name.replace(/_/g, " ")}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* ── Metadata card ── */}
<div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 10, padding: "14px 16px" }}>
                    <div style={{ fontSize: 11, color: t.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10, fontFamily: "sans-serif" }}>Dataset Info</div>
                    {[
                      { label: "Resolution", value: resultsData.metadata?.resolution || { sentinel2:"10m", landsat:"30m", modis:"250m", landcover:"10m", climate:"5.5km" }[resultsData.datasetLabel?.toLowerCase()] || "N/A" },
                      { label: "Images Used", value: metadataLoading ? "Loading..." : resultsData.metadata?.images_used != null ? resultsData.metadata.images_used : "N/A" },
                      { label: "Data Coverage", value: metadataLoading ? "Loading..." : resultsData.metadata?.coverage_pct != null ? `${resultsData.metadata.coverage_pct}%` : "N/A" },  
                      { label: "Date Range", value: resultsData.metadata ? `${resultsData.metadata.start} → ${resultsData.metadata.end}` : `${resultsData.period}` },
                    ].map(item => (
                      <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, fontFamily: "sans-serif" }}>
                        <span style={{ fontSize: 11, color: t.muted }}>{item.label}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: t.text }}>{item.value}</span>
                      </div>
                    ))}

                    {/* SPI-specific explanation */}
                    {resultsData.label === "SPI" && (
                      <div style={{
                        marginTop: 12, padding: "10px 12px",
                        background: darkMode ? "rgba(59,130,246,0.08)" : "#eff6ff",
                        border: "1px solid #bfdbfe", borderRadius: 8,
                        fontSize: 11, fontFamily: "sans-serif", lineHeight: 1.6, color: "#1e40af",
                      }}>
                        <div style={{ fontWeight: 700, marginBottom: 4 }}>ℹ️ About SPI</div>
                        <div><b>Method:</b> Z-score standardisation (approximation)</div>
                        <div><b>Baseline:</b> 1991–2020 (WMO standard)</div>
                        <div><b>Source:</b> CHIRPS PENTAD (~5.5km)</div>
                        <div style={{ marginTop: 6, color: "#3b82f6" }}>
                          Values: &lt;−1.5 severe drought · −1 to −1.5 moderate ·
                          0 normal · &gt;1 wet · &gt;1.5 very wet
                        </div>
                      </div>
                    )}
                  </div>
              </>
            )}



            {/* ── TIME SERIES TAB ── */}
            {activeTab === "timeseries" && (
              <div>
                {/* Controls — always visible at top of tab */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={handleTimeSeries} disabled={tsLoading || loading}
                      style={{ flex: 1, background: "#7c3aed", color: "#fff", border: "none", borderRadius: 7, padding: "10px 8px", fontSize: 12, fontWeight: 600, cursor: (tsLoading || loading) ? "not-allowed" : "pointer", opacity: (tsLoading || loading) ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: "sans-serif" }}>
                      📈 {tsLoading ? "Loading..." : "Run Time Series"}
                    </button>
                    <select value={tsInterval} onChange={e => setTsInterval(e.target.value)}
                      style={{ background: t.input, border: `1px solid ${t.inputBorder}`, color: t.inputText, borderRadius: 7, padding: "0 8px", fontSize: 12, fontFamily: "sans-serif", cursor: "pointer", width: 110, flexShrink: 0 }}>
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                      <option value="seasonal">Seasonal</option>
                      {dataset === "modis" && ["NDVI","EVI"].includes(index) && (
                        <option value="16day">16-Day (MODIS composite)</option>
                      )}
                      {dataset === "modis" && ["NDWI","NBR","NDMI","NDSI"].includes(index) && (
                        <option value="daily">Daily (max 1 year)</option>
                      )}
                    </select>
                  </div>
                  {tsInterval === "seasonal" && (
                    <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 6 }}>
                      <span style={{ fontSize: 11, color: t.muted, fontFamily: "sans-serif", whiteSpace: "nowrap" }}>Season:</span>
                      <select value={seasonStart} onChange={e => setSeasonStart(e.target.value)}
                        style={{ ...{background: t.input, border: `1px solid ${t.inputBorder}`, color: t.inputText, padding: "5px 6px", borderRadius: 6, fontSize: 11, fontFamily: "sans-serif"}, flex: 1 }}>
                        {monthOptions.map(mo => <option key={mo.value} value={mo.value}>{mo.label}</option>)}
                      </select>
                      <span style={{ fontSize: 11, color: t.muted, fontFamily: "sans-serif" }}>→</span>
                      <select value={seasonEnd} onChange={e => setSeasonEnd(e.target.value)}
                        style={{ ...{background: t.input, border: `1px solid ${t.inputBorder}`, color: t.inputText, padding: "5px 6px", borderRadius: 6, fontSize: 11, fontFamily: "sans-serif"}, flex: 1 }}>
                        {monthOptions.map(mo => <option key={mo.value} value={mo.value}>{mo.label}</option>)}
                      </select>
                    </div>
                  )}
                </div>

                {tsLoading && (
                  <div style={{ textAlign: "center", padding: "40px 0", color: t.muted, fontFamily: "sans-serif", fontSize: 13 }}>
                    <div style={{ width: 32, height: 32, border: "3px solid #e2e8f0", borderTop: `3px solid ${t.accent}`, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
                    Computing time series...
                  </div>
                )}
                {!tsLoading && !tsData && (
                  <div style={{ textAlign: "center", padding: "20px 16px", color: t.muted, fontFamily: "sans-serif", fontSize: 13, lineHeight: 1.6 }}>
                    <div style={{ fontSize: 28, marginBottom: 10 }}>📈</div>
                    Select a dataset, index and date range, then click <b>Run Time Series</b>.
                  </div>
                )}
                {!tsLoading && tsData && (
                  <>
                    <div style={{ fontSize: 12, fontWeight: 600, color: t.text, fontFamily: "sans-serif", marginBottom: 4 }}>
                      {tsData.dataset} · {tsData.index} · {tsData.interval}
                    </div>
                    <div style={{ fontSize: 11, color: t.muted, fontFamily: "sans-serif", marginBottom: 16 }}>
                      {tsData.data.length} data points
                    </div>
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={tsData.data} margin={{ top: 4, right: 8, left: -20, bottom: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
                        <XAxis dataKey="date" tick={{ fontSize: 9, fill: t.muted, fontFamily: "sans-serif" }} angle={-45} textAnchor="end" interval="preserveStartEnd" />
                        <YAxis tick={{ fontSize: 10, fill: t.muted, fontFamily: "sans-serif" }} />
                        <Tooltip
                          contentStyle={{ background: t.sidebar, border: `1px solid ${t.border}`, borderRadius: 6, fontSize: 11, fontFamily: "sans-serif" }}
                          labelStyle={{ color: t.text, fontWeight: 600 }}
                          itemStyle={{ color: t.accent }}
                        />
                        <Line type="monotone" dataKey="value" stroke={t.accent} strokeWidth={2} dot={{ r: 2, fill: t.accent }} activeDot={{ r: 4 }} name={tsData.index} />
                      </LineChart>
                    </ResponsiveContainer>

                    {/* Stats summary */}
                    {(() => {
                      const vals = tsData.data.map(d => d.value).filter(v => v != null);
                      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
                      const min = Math.min(...vals);
                      const max = Math.max(...vals);
                      return (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 16 }}>
                          {[{ label: "Min", value: min.toFixed(3) }, { label: "Mean", value: avg.toFixed(3) }, { label: "Max", value: max.toFixed(3) }].map(s => (
                            <div key={s.label} style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 8, padding: "10px 8px", textAlign: "center" }}>
                              <div style={{ fontSize: 11, color: t.muted, fontFamily: "sans-serif", marginBottom: 2 }}>{s.label}</div>
                              <div style={{ fontSize: 14, fontWeight: 700, color: t.accent, fontFamily: "sans-serif" }}>{s.value}</div>
                            </div>
                          ))}
                        </div>
                     );
                    })()}

                    {/* Export CSV */}
                    <button onClick={exportTimeSeriesCSV} style={{
                      marginTop: 12, width: "100%", background: t.card,
                      border: `1px solid ${t.border}`, borderRadius: 7,
                      padding: "8px 12px", fontSize: 12, fontWeight: 600,
                      color: t.muted, cursor: "pointer", fontFamily: "sans-serif",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    }}>
                      <Icon d={icons.download} size={13} /> Export CSV
                    </button>
                  </>
                )}
              </div>
            )}

            {/* ── CHANGE MAP TAB ── */}

            {/* ── CHANGE MAP TAB ── */}
            {activeTab === "changemap" && (
              <div>
                {changeMapLoading && (
                  <div style={{ textAlign: "center", padding: "40px 0", color: t.muted, fontFamily: "sans-serif", fontSize: 13 }}>
                    <div style={{ width: 32, height: 32, border: "3px solid #e2e8f0", borderTop: "3px solid #b45309", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
                    Computing change map...
                  </div>
                )}
                {!changeMapLoading && !changeMapData && (
                  <div style={{ textAlign: "center", padding: "32px 16px", color: t.muted, fontFamily: "sans-serif", fontSize: 13, lineHeight: 1.6 }}>
                    <div style={{ fontSize: 28, marginBottom: 10 }}>🗺️</div>
                    Click <b>Change Map</b> in the sidebar to generate a stable vs changed map.
                  </div>
                )}
                {!changeMapLoading && changeMapData && (
                  <>
                    {/* Legend */}
                    <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 10, padding: "14px 16px", marginBottom: 16 }}>
                      <div style={{ fontSize: 11, color: t.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10, fontFamily: "sans-serif" }}>Map Legend</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ width: 16, height: 16, borderRadius: 3, background: "#9ca3af", display: "inline-block", flexShrink: 0 }} />
                          <span style={{ fontSize: 12, color: t.text, fontFamily: "sans-serif" }}>Stable — no land cover change</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ width: 16, height: 16, borderRadius: 3, background: "#dc2626", display: "inline-block", flexShrink: 0 }} />
                          <span style={{ fontSize: 12, color: t.text, fontFamily: "sans-serif" }}>Changed — land cover class changed</span>
                        </div>
                      </div>
                    </div>

                    {/* Summary stats */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                      <div style={{ background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 10, padding: "14px 12px", textAlign: "center" }}>
                        <div style={{ fontSize: 11, color: "#64748b", fontFamily: "sans-serif", marginBottom: 4 }}>Stable</div>
                        <div style={{ fontSize: 22, fontWeight: 700, color: "#6b7280", fontFamily: "sans-serif" }}>{changeMapData.pct_stable}%</div>
                      </div>
                      <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "14px 12px", textAlign: "center" }}>
                        <div style={{ fontSize: 11, color: "#64748b", fontFamily: "sans-serif", marginBottom: 4 }}>Changed</div>
                        <div style={{ fontSize: 22, fontWeight: 700, color: "#dc2626", fontFamily: "sans-serif" }}>{changeMapData.pct_changed}%</div>
                      </div>
                    </div>

                    {/* Visual bar */}
                    <div style={{ borderRadius: 6, overflow: "hidden", height: 12, display: "flex", marginBottom: 8 }}>
                      <div style={{ width: `${changeMapData.pct_stable}%`, background: "#9ca3af", transition: "width 0.5s" }} />
                      <div style={{ width: `${changeMapData.pct_changed}%`, background: "#dc2626", transition: "width 0.5s" }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: t.muted, fontFamily: "sans-serif", marginBottom: 4 }}>
                      <span>Stable {changeMapData.pct_stable}%</span>
                      <span>Changed {changeMapData.pct_changed}%</span>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── CHANGE STATS TAB ── */}
            {activeTab === "changestats" && (
              <div>
                {statsLoading && (
                  <div style={{ textAlign: "center", padding: "40px 0", color: t.muted, fontFamily: "sans-serif", fontSize: 13 }}>
                    <div style={{ width: 32, height: 32, border: "3px solid #e2e8f0", borderTop: `3px solid #0891b2`, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
                    Computing land cover statistics...
                  </div>
                )}
                {!statsLoading && !statsData && (
                  <div style={{ textAlign: "center", padding: "32px 16px", color: t.muted, fontFamily: "sans-serif", fontSize: 13, lineHeight: 1.6 }}>
                    <div style={{ fontSize: 28, marginBottom: 10 }}>📊</div>
                    Select Land Cover dataset, enable Change Detection mode, then click <b>Land Cover Stats</b>.
                  </div>
                )}
                {!statsLoading && statsData && (
                  <>
                    <div style={{ fontSize: 11, color: t.muted, fontFamily: "sans-serif", marginBottom: 12, lineHeight: 1.5 }}>
                      <b style={{ color: t.text }}>Period 1:</b> {statsData.period1}<br/>
                      <b style={{ color: t.text }}>Period 2:</b> {statsData.period2}
                    </div>

                    {/* Bar chart */}
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={statsData.rows} margin={{ top: 4, right: 8, left: -20, bottom: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
                        <XAxis dataKey="class" tick={{ fontSize: 8, fill: t.muted, fontFamily: "sans-serif" }} angle={-40} textAnchor="end" interval={0} />
                        <YAxis tick={{ fontSize: 9, fill: t.muted, fontFamily: "sans-serif" }} unit="%" />
                        <Tooltip
                          contentStyle={{ background: t.sidebar, border: `1px solid ${t.border}`, borderRadius: 6, fontSize: 11, fontFamily: "sans-serif" }}
                          formatter={(val) => [`${val}%`]}
                        />
                        <Legend wrapperStyle={{ fontSize: 10, fontFamily: "sans-serif", paddingTop: 8 }} />
                        <Bar dataKey="pct1" name="Period 1" fill="#60a5fa" radius={[2, 2, 0, 0]} />
                        <Bar dataKey="pct2" name="Period 2" fill="#34d399" radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>

                    {/* Table */}
                    <div style={{ marginTop: 16, overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, fontFamily: "sans-serif" }}>
                        <thead>
                          <tr style={{ borderBottom: `2px solid ${t.border}` }}>
                            <th style={{ textAlign: "left", padding: "6px 4px", color: t.muted }}>Class</th>
                            <th style={{ textAlign: "right", padding: "6px 4px", color: t.muted }}>P1 %</th>
                            <th style={{ textAlign: "right", padding: "6px 4px", color: t.muted }}>P2 %</th>
                            <th style={{ textAlign: "right", padding: "6px 4px", color: t.muted }}>Δ%</th>
                          </tr>
                        </thead>
                        <tbody>
                          {statsData.rows.map((row, i) => (
                            <tr key={i} style={{ borderBottom: `1px solid ${t.border}` }}>
                              <td style={{ padding: "6px 4px", color: t.text, display: "flex", alignItems: "center", gap: 5 }}>
                                <span style={{ width: 10, height: 10, borderRadius: 2, background: row.color, display: "inline-block", flexShrink: 0 }} />
                                {row.class.replace(/_/g, " ")}
                              </td>
                              <td style={{ textAlign: "right", padding: "6px 4px", color: t.muted }}>{row.pct1}</td>
                              <td style={{ textAlign: "right", padding: "6px 4px", color: t.muted }}>{row.pct2}</td>
                              <td style={{ textAlign: "right", padding: "6px 4px", fontWeight: 600, color: row.change_pct > 0 ? "#16a34a" : row.change_pct < 0 ? "#dc2626" : t.muted }}>
                                {row.change_pct > 0 ? "+" : ""}{row.change_pct}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Area table */}
                    <div style={{ marginTop: 16, fontSize: 11, color: t.muted, fontFamily: "sans-serif" }}>
                      <div style={{ fontWeight: 600, color: t.text, marginBottom: 8 }}>Area (km²)</div>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, fontFamily: "sans-serif" }}>
                        <thead>
                          <tr style={{ borderBottom: `2px solid ${t.border}` }}>
                            <th style={{ textAlign: "left", padding: "4px", color: t.muted }}>Class</th>
                            <th style={{ textAlign: "right", padding: "4px", color: t.muted }}>P1 km²</th>
                            <th style={{ textAlign: "right", padding: "4px", color: t.muted }}>P2 km²</th>
                            <th style={{ textAlign: "right", padding: "4px", color: t.muted }}>Δ km²</th>
                          </tr>
                        </thead>
                        <tbody>
                          {statsData.rows.map((row, i) => (
                            <tr key={i} style={{ borderBottom: `1px solid ${t.border}` }}>
                              <td style={{ padding: "4px", color: t.text }}>{row.class.replace(/_/g, " ")}</td>
                              <td style={{ textAlign: "right", padding: "4px", color: t.muted }}>{row.area1_km2}</td>
                              <td style={{ textAlign: "right", padding: "4px", color: t.muted }}>{row.area2_km2}</td>
                              <td style={{ textAlign: "right", padding: "4px", fontWeight: 600, color: row.change_km2 > 0 ? "#16a34a" : row.change_km2 < 0 ? "#dc2626" : t.muted }}>
                                {row.change_km2 > 0 ? "+" : ""}{row.change_km2}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Export CSV */}
                    <button onClick={exportStatsCSV} style={{
                      marginTop: 12, width: "100%", background: t.card,
                      border: `1px solid ${t.border}`, borderRadius: 7,
                      padding: "8px 12px", fontSize: 12, fontWeight: 600,
                      color: t.muted, cursor: "pointer", fontFamily: "sans-serif",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    }}>
                      <Icon d={icons.download} size={13} /> Export CSV
                    </button>
                  </>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
        {/* ── AOI Warning Modal ── */}
        {aoiWarning && (
          <div style={{
            position: "fixed", inset: 0, zIndex: 9998,
            background: "rgba(0,0,0,0.45)", backdropFilter: "blur(3px)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }} onClick={(e) => { if (e.target === e.currentTarget) setAoiWarning(null); }}>
            <div style={{
              background: "white", borderRadius: 16, padding: "32px 28px",
              width: 400, boxShadow: "0 24px 60px rgba(0,0,0,0.2)",
              fontFamily: "sans-serif", position: "relative",
            }}>
              <button onClick={() => setAoiWarning(null)} style={{
                position: "absolute", top: 14, right: 16, background: "none",
                border: "none", fontSize: 20, cursor: "pointer", color: "#9ca3af",
              }}>×</button>
              {/* Icon */}
              <div style={{ textAlign: "center", marginBottom: 16 }}>
                <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#fefce8", margin: "0 auto 12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                    <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="#ca8a04" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div style={{ fontSize: 17, fontWeight: 700, color: "#111" }}>Large Area Warning</div>
              </div>
              <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.7, marginBottom: 24, textAlign: "center" }}>
                {aoiWarning.message}
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setAoiWarning(null)} style={{
                  flex: 1, padding: "11px", borderRadius: 9, border: "1.5px solid #e5e7eb",
                  background: "white", color: "#374151", fontSize: 13, fontWeight: 600, cursor: "pointer",
                }}>
                  Cancel
                </button>
                <button onClick={aoiWarning.onProceed} style={{
                  flex: 1, padding: "11px", borderRadius: 9, border: "none",
                  background: "#ca8a04", color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer",
                }}>
                  Proceed Anyway
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Google Sign-in Modal ── */}
        {authModalOpen && (
          <div style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }} onClick={(e) => { if (e.target === e.currentTarget) { setAuthModalOpen(false); setAuthPendingAction(null); } }}>
            <div style={{
              background: "white", borderRadius: 20, padding: "40px 36px",
              width: 400, boxShadow: "0 32px 80px rgba(0,0,0,0.25)",
              fontFamily: "sans-serif", position: "relative", textAlign: "center",
            }}>
              <button onClick={() => { setAuthModalOpen(false); setAuthPendingAction(null); }} style={{
                position: "absolute", top: 14, right: 16, background: "none",
                border: "none", fontSize: 22, cursor: "pointer", color: "#9ca3af",
              }}>×</button>

              <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#f0fdf4", margin: "0 auto 18px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>

              <div style={{ fontSize: 20, fontWeight: 700, color: "#111", marginBottom: 8 }}>Sign in to continue</div>
              <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 28, lineHeight: 1.6 }}>
                Time series, statistics, downloads and exports<br/>require a free account.
              </div>

              <button onClick={handleGoogleSignIn} disabled={authLoading} style={{
                width: "100%", padding: "13px 16px", borderRadius: 10,
                border: "1.5px solid #e5e7eb", background: authLoading ? "#f9fafb" : "white",
                cursor: authLoading ? "default" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
                fontSize: 15, fontWeight: 600, color: "#374151",
                boxShadow: "0 1px 4px rgba(0,0,0,0.08)", transition: "all 0.15s",
              }}>
                {authLoading ? <span>Signing in...</span> : (<>
                  <svg width="20" height="20" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                  </svg>
                  Continue with Google
                </>)}
              </button>

              <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 16 }}>
                It is free · No credit card required
              </div>
            </div>
          </div>
        )}

        {/* ── Save AOI Modal ── */}
        {saveAoiModalOpen && (
          <div style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }} onClick={e => { if (e.target === e.currentTarget && !saveAoiLoading) { setSaveAoiModalOpen(false); } }}>
            <div style={{
              background: "white", borderRadius: 20, padding: "36px",
              width: 420, boxShadow: "0 32px 80px rgba(0,0,0,0.25)",
              fontFamily: "sans-serif", position: "relative",
            }}>
              {!saveAoiSuccess ? (
                <>
                  <button onClick={() => setSaveAoiModalOpen(false)} style={{
                    position: "absolute", top: 14, right: 16, background: "none",
                    border: "none", fontSize: 22, cursor: "pointer", color: "#9ca3af",
                  }}>×</button>

                  <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                  </div>

                  <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "#111", marginBottom: 6 }}>Save Area</h2>
                  <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 22, lineHeight: 1.6 }}>
                    This area will be saved to <strong>Monitoring</strong> with its current status.
                    {dataset && index && <> Monitoring: <strong>{dataset.toUpperCase()} {index}</strong>.</>}
                  </p>

                  <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>
                    Area name
                  </label>
                  <input
                    value={saveAoiName}
                    onChange={e => setSaveAoiName(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && saveAoiName.trim()) _doSaveAoi(); }}
                    placeholder="e.g. Tigray Region, Field Block A"
                    autoFocus
                    style={{
                      width: "100%", padding: "10px 12px", borderRadius: 8, border: "1.5px solid #e5e7eb",
                      fontSize: 14, color: "#111", outline: "none", boxSizing: "border-box",
                      marginBottom: saveAoiError ? 8 : 20,
                    }}
                  />

                  {saveAoiError && (
                    <div style={{ fontSize: 12, color: "#dc2626", marginBottom: 16, background: "#fee2e2", padding: "8px 12px", borderRadius: 6 }}>
                      {saveAoiError}
                    </div>
                  )}

                  <button
                    onClick={_doSaveAoi}
                    disabled={saveAoiLoading || !saveAoiName.trim()}
                    style={{
                      width: "100%", padding: "12px", borderRadius: 10, border: "none",
                      background: (saveAoiLoading || !saveAoiName.trim()) ? "#e5e7eb" : "#16a34a",
                      color: (saveAoiLoading || !saveAoiName.trim()) ? "#9ca3af" : "#fff",
                      fontSize: 14, fontWeight: 600,
                      cursor: (saveAoiLoading || !saveAoiName.trim()) ? "not-allowed" : "pointer",
                    }}
                  >
                    {saveAoiLoading ? "Saving & computing status…" : "Save Area"}
                  </button>
                  <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 12, textAlign: "center" }}>
                    Status is computed from satellite data. This may take a few seconds.
                  </p>
                </>
              ) : (
                <div style={{ textAlign: "center", padding: "8px 0" }}>
                  <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>✅</div>
                  <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#111", marginBottom: 8 }}>Area saved!</h2>
                  <p style={{ fontSize: 13, color: "#6b7280" }}>
                    View it in <a href="/my-areas" style={{ color: "#16a34a", fontWeight: 600 }}>Monitoring</a>.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Premium gate popup ── */}
        {premiumGateOpen && (
          <div
            onClick={e => { if (e.target === e.currentTarget) setPremiumGateOpen(false); }}
            style={{
              position: "fixed", inset: 0, zIndex: 9000,
              background: "rgba(0,0,0,0.55)",
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: 24, fontFamily: "sans-serif",
            }}
          >
            <div style={{
              background: "#fff", borderRadius: 16, padding: "36px 32px",
              maxWidth: 400, width: "100%", textAlign: "center",
              boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
            }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>🔒</div>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "#0f172a", margin: "0 0 10px" }}>
                Premium Feature
              </h3>
              <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 24px", lineHeight: 1.6 }}>
                {premiumGateReason}
              </p>
              <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                <a
                  href="/about#contact"
                  onClick={() => setPremiumGateOpen(false)}
                  style={{
                    padding: "10px 20px", borderRadius: 8,
                    background: "#7c3aed", color: "#fff",
                    fontWeight: 600, fontSize: 13, textDecoration: "none",
                    display: "inline-block",
                  }}
                >
                  Contact us →
                </a>
                <button
                  onClick={() => setPremiumGateOpen(false)}
                  style={{
                    padding: "10px 20px", borderRadius: 8,
                    border: "1px solid #e2e8f0", background: "#f8fafc",
                    color: "#64748b", fontWeight: 600, fontSize: 13, cursor: "pointer",
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── User avatar — shown when signed in ── */}
        {user && (
          <div style={{
            position: "absolute", bottom: 24, right: 10, zIndex: 1000,
            display: "flex", alignItems: "center", gap: 8,
            background: "white", borderRadius: 24, padding: "5px 12px 5px 5px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)", fontFamily: "sans-serif",
          }}>
            {user.photoURL
              ? <img src={user.photoURL} alt="" style={{ width: 28, height: 28, borderRadius: "50%" }} />
              : <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#22c55e", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 12, fontWeight: 700 }}>{user.displayName?.[0] || "U"}</div>
            }
            <span style={{ fontSize: 12, fontWeight: 600, color: "#374151", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user.displayName?.split(" ")[0] || user.email}
            </span>
            <button onClick={handleSignOut} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "#9ca3af", padding: "2px 4px" }}>
              Sign out
            </button>
          </div>
        )}

    </div>
  );
}