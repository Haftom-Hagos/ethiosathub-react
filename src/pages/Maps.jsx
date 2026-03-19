import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";


const BACKEND_URL = "https://hwasat-backend-r5rykfbhxa-ew.a.run.app";

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

export default function Maps() {
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
  const [activeTool, setActiveTool] = useState(null); // 'rectangle'|'polygon'|'circle'|'point'

  // ── UI state ──
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [resultsOpen, setResultsOpen] = useState(false);
  const [resultsData, setResultsData] = useState(null);

  // ── Data state ──
  const [geojsonData, setGeojsonData] = useState({ adm1: null, adm2: null, adm3: null });
  const [dataset, setDataset] = useState("");
  const [index, setIndex] = useState("");
  const [adminLevel, setAdminLevel] = useState("");
  const [featureName, setFeatureName] = useState("");
  const [featureList, setFeatureList] = useState([]);
  const [selectedFeatureGeoJSON, setSelectedFeatureGeoJSON] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [emailPendingAction, setEmailPendingAction] = useState(null);
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
      { v: "NBR", t: "NBR" }, { v: "NDMI", t: "NDMI" }, { v: "NDSI", t: "NDSI" }
    ], yearRange: [2000, new Date().getFullYear()], minDate: "2000-02-18" },
    climate: { label: "Climate", icon: "🌦️", indices: [{ v: "SPI", t: "SPI" }, { v: "VHI", t: "VHI" }], yearRange: [1981, new Date().getFullYear()], minDate: "1981-01-01" },
  };

  const LANDCOVER_PALETTE = {
    water: "#419BDF", trees: "#397D49", grass: "#88B053",
    flooded_vegetation: "#7A87C6", crops: "#E49635", shrub_and_scrub: "#DFC35A",
    built: "#C4281B", bare: "#A59B8F", snow_and_ice: "#B39FE1",
  };

  // ── AOI size limits per dataset (km²) ──
  const AOI_LIMITS = {
    sentinel2: { download: 5000,   timeseries: 2000  },
    landsat:   { download: 20000,  timeseries: 10000 },
    modis:     { download: 200000, timeseries: 100000},
    landcover: { download: 5000,   timeseries: 2000  },
    climate:   { download: 500000, timeseries: 300000},
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

  const checkAoiSize = (geometry, ds, isTimeSeries = false) => {
    if (!geometry || !ds) return null;
    const limits = AOI_LIMITS[ds];
    if (!limits) return null;
    const area = getAoiAreaKm2(geometry);
    if (area === 0) return null;
    const limit = isTimeSeries ? limits.timeseries : limits.download;
    if (area > limit) {
      const dsLabel = DATASET_CONFIG[ds]?.label || ds;
      return `AOI too large (${area.toLocaleString()} km²). Maximum for ${dsLabel} ${isTimeSeries ? "time series" : "visualization"} is ${limit.toLocaleString()} km². Please draw a smaller area or switch to a lower resolution dataset.`;
    }
    return null;
  };

  const getPropName = (lvl) => lvl === "adm1" ? "ADM1_EN" : lvl === "adm2" ? "ADM2_EN" : "ADM3_EN";
  const normalizeColor = (c) => c?.startsWith("#") ? c : /^[0-9A-Fa-f]{6}$/.test(c) ? `#${c}` : c || "#ccc";
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
        style: { color: "#ef4444", weight: 2.5, fillOpacity: 0.15 },
        pointToLayer: (f, latlng) => L.circleMarker(latlng, { radius: 8, color: "#ef4444", fillOpacity: 0.6 }),
      }).addTo(map);
      drawnLayerRef.current = layer;
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

  // ── Load boundaries ──
  useEffect(() => {
    if (useCustomGeoJSON) return;
    Promise.all([
      fetch("/data/ethiopia_admin_level_1_gcs.geojson").then(r => r.json()),
      fetch("/data/ethiopia_admin_level_2_gcs.geojson").then(r => r.json()),
      fetch("/data/ethiopia_admin_level_3_gcs_simplified.geojson").then(r => r.json()),
    ]).then(([adm1, adm2, adm3]) => setGeojsonData({ adm1, adm2, adm3 }))
      .catch(() => setMessage("Failed to load boundary data."));
  }, [useCustomGeoJSON]);

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
    const [minY, maxY] = cfg.yearRange;
    setYearOptions(Array.from({ length: maxY - minY + 1 }, (_, i) => maxY - i));
    setIndex("");
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
    const prop = getPropName(adminLevel);
    setFeatureList(geojsonData[adminLevel].features.map(f => f.properties[prop]).sort((a, b) => a.localeCompare(b)));
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
  }, [adminLevel, geojsonData, useCustomGeoJSON]);

  // ── Custom GeoJSON layer ──
  useEffect(() => {
    if (!useCustomGeoJSON || !customGeoJSON || !mapRef.current) return;
    const map = mapRef.current;
    if (boundaryLayersCache.current.custom) map.removeLayer(boundaryLayersCache.current.custom);
    const layer = L.geoJSON(customGeoJSON, { style: { color: "#ef4444", weight: 3, fillOpacity: 0.15 } }).addTo(map);
    boundaryLayersCache.current.custom = layer;
    map.fitBounds(layer.getBounds());
  }, [customGeoJSON, useCustomGeoJSON]);

  // ── Feature highlight ──
  useEffect(() => {
    if (useCustomGeoJSON || !featureName || !adminLevel || !layerFeatureMap.current.has(featureName)) return;
    const lyr = layerFeatureMap.current.get(featureName);
    setSelectedFeatureGeoJSON(featureMap.current.get(featureName));
    layerFeatureMap.current.forEach((l, n) => l.setStyle({ color: n === featureName ? "#ef4444" : "#3b82f6", weight: n === featureName ? 3 : 1.2 }));
    mapRef.current?.fitBounds(lyr.getBounds());
  }, [featureName, adminLevel, useCustomGeoJSON]);

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
    const overlay = L.tileLayer(tileUrl, { opacity: 0.85, zIndex: 5 }).addTo(map);
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
      ? `${fromYear}–${toYear} vs ${fromYear2}–${toYear2}`
      : `${fromYear}–${toYear}`;
    setResultsData({
      label: data.legend?.label || index,
      datasetLabel: DATASET_CONFIG[datasetKey]?.label || datasetKey,
      period,
      isChange: changeMode,
      visParams: data.vis_params || {},
      uniqueClasses: data.unique_classes || null,
      isLandcover: datasetKey === "landcover",
      metadata: data.metadata || null,
    });
    setResultsOpen(true);
  };

  // ── View Selection ──
  const handleViewSelection = async () => {
    const geometry = useCustomGeoJSON ? customGeoJSON?.geometry : selectedFeatureGeoJSON?.geometry;
    if (!geometry) return setMessage(useCustomGeoJSON ? "Upload a GeoJSON first" : "Select a feature first");
    if (!dataset || !index) return setMessage("Select dataset and index");
    if (!fromYear || !toYear) return setMessage("Select date range");
    if (changeMode) {
      if (dataset === "landcover") return setMessage("Change detection not available for land cover");
      if (!fromYear2 || !toYear2) return setMessage("Select Period 2 years");
      if (!validateChangeDates()) return;
      setLoading(true); setMessage(null);
      try {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), 300000);
        const res = await fetch(`${BACKEND_URL}/change_detection`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dataset, index,
            startDate1: `${fromYear}-${fromMonth || "01"}-${fromDay || "01"}`,
            endDate1: `${toYear}-${toMonth || "12"}-${toDay || "31"}`,
            startDate2: `${fromYear2}-${fromMonth2 || "01"}-${fromDay2 || "01"}`,
            endDate2: `${toYear2}-${toMonth2 || "12"}-${toDay2 || "31"}`,
            geometry,
          }), signal: controller.signal,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
        addOverlayAndLegend(data, dataset);
        setMessage("Change detection layer loaded successfully.");
      } catch (e) { setMessage(`Failed: ${e.message}`); }
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
  const handleDownloadClick = () => {
    const geometry = useCustomGeoJSON ? customGeoJSON?.geometry : selectedFeatureGeoJSON?.geometry;
    const aoiErr = checkAoiSize(geometry, dataset, false);
    if (aoiErr) return setMessage(aoiErr);
    requireAuth("download_geotiff", () => _doDownload());
  };

  const _doDownload = async () => {
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
        if (dataset === "landcover") { setMessage("Change detection download not available for land cover"); setLoading(false); return; }
        if (!fromYear2 || !toYear2) { setMessage("Select Period 2 years"); setLoading(false); return; }
        const res = await fetch(`${BACKEND_URL}/download_change`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dataset, index,
            startDate1: `${fromYear}-${fromMonth || "01"}-${fromDay || "01"}`,
            endDate1: `${toYear}-${toMonth || "12"}-${toDay || "31"}`,
            startDate2: `${fromYear2}-${fromMonth2 || "01"}-${fromDay2 || "01"}`,
            endDate2: `${toYear2}-${toMonth2 || "12"}-${toDay2 || "31"}`,
            geometry, selectedFeature: sf }),
          signal: controller.signal,
        });
        if (!res.ok) { const d = await res.json(); throw new Error(d.detail || `HTTP ${res.status}`); }
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url;
        a.download = `${dataset}_${index}_change_${fromYear}_${toYear}_vs_${fromYear2}_${toYear2}_${sf}.tif`;
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
      a.download = `${dataset}_${index}_${fromYear}-${toYear}_${sf}.tif`;
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
    if (overlayRef.current) map.removeLayer(overlayRef.current);
    if (legendRef.current) map.removeControl(legendRef.current);
    Object.values(boundaryLayersCache.current).forEach(l => map.removeLayer(l));
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
  const DateRow = ({ label, y, m, d, setY, setM, setD, color }) => (
    <div style={{ marginBottom: 8 }}>
      <span style={{ ...labelStyle, color: color || t.muted }}>{label}</span>
      <div style={{ display: "flex", gap: 6 }}>
        <select value={y} onChange={e => setY(e.target.value)} style={{ ...inputStyle, flex: 2 }}>
          <option value="">Year</option>
          {yearOptions.map(yr => <option key={yr} value={yr}>{yr}</option>)}
        </select>
        <select value={m} onChange={e => setM(e.target.value)} style={{ ...inputStyle, flex: 2 }}>
          <option value="">Month</option>
          {monthOptions.map(mo => <option key={mo.value} value={mo.value}>{mo.label}</option>)}
        </select>
        <select value={d} onChange={e => setD(e.target.value)} style={{ ...inputStyle, flex: 1 }}>
          <option value="">Day</option>
          {dayOptionsFor(y, m).map(dd => <option key={dd} value={dd}>{dd}</option>)}
        </select>
      </div>
    </div>
  );


  // ── Time Series ──
  const handleTimeSeries = () => {
    const geometry = useCustomGeoJSON ? customGeoJSON?.geometry : selectedFeatureGeoJSON?.geometry;
    if (!geometry) return setMessage(useCustomGeoJSON ? "Upload a GeoJSON first" : "Select a feature first");
    if (!dataset || !index) return setMessage("Select dataset and index");
    if (!fromYear || !toYear) return setMessage("Select date range");
    if (dataset === "landcover") return setMessage("Time series not available for land cover");
    const aoiErr = checkAoiSize(geometry, dataset, true);
    if (aoiErr) return setMessage(aoiErr);
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
    const aoiErr = checkAoiSize(geometry, "landcover", false);
    if (aoiErr) return setMessage(aoiErr);
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

      const p1Label = `🟦 Land Cover P1 (${fromYear}–${toYear})`;
      const p2Label = `🟩 Land Cover P2 (${fromYear2}–${toYear2})`;
      const chLabel = `🔴 Stable vs Changed`;

      p1LayerRef.current    = L.tileLayer(url1, { opacity: 0.85, zIndex: 5 });
      p2LayerRef.current    = L.tileLayer(url2, { opacity: 0.85, zIndex: 6 });
      changeLayerRef.current = L.tileLayer(urlC, { opacity: 0.85, zIndex: 7 });

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
      setMessage("Land cover change map loaded — 3 layers added to map.");

      // Update results panel
      setResultsData({
        label: "Land Cover Change",
        datasetLabel: "Dynamic World",
        period: `${fromYear}–${toYear} vs ${fromYear2}–${toYear2}`,
        isChange: true, isLandcover: true,
        visParams: dChange.vis_params || {},
        uniqueClasses: null, metadata: null,
      });
    } catch (e) { setMessage(`Change map failed: ${e.message}`); }
    finally { setChangeMapLoading(false); }
  };
// ── Email gate — wraps any action behind email capture ──
  
 const saveEmail = async (email, action) => {
    try {
      await fetch(`${BACKEND_URL}/capture_email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, action }),
      });
    } catch (e) {
      console.warn("Email save failed:", e);
    }
  };

  const requireAuth = (actionLabel, actionFn) => requireEmail(actionLabel, actionFn);

  const requireEmail = (actionLabel, actionFn) => {
    const stored = localStorage.getItem("hwasat_user_email");
    if (stored) {
      actionFn(); // already have email, proceed directly
    } else {
      setEmailPendingAction(() => actionFn);
      setEmailModalOpen(true);
    }
  };

  const handleEmailSubmit = async () => {
    const email = emailInput.trim();
    if (!email || !email.includes("@")) return;
    localStorage.setItem("hwasat_user_email", email);
    setEmailModalOpen(false);
    await saveEmail(email, "download_or_export");
    if (emailPendingAction) {
      emailPendingAction();
      setEmailPendingAction(null);
    }
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
              {["Ethiopia Levels", "Upload GeoJSON"].map((label, i) => (
                <button key={i} onClick={() => { i === 0 ? (setUseCustomGeoJSON(false), setCustomGeoJSON(null)) : setUseCustomGeoJSON(true); }}
                  style={{ flex: 1, padding: "6px 4px", fontSize: 11, borderRadius: 6, cursor: "pointer", fontFamily: "sans-serif", fontWeight: 600,
                    background: (i === 0 ? !useCustomGeoJSON : useCustomGeoJSON) ? t.accent : t.card,
                    color: (i === 0 ? !useCustomGeoJSON : useCustomGeoJSON) ? "#fff" : t.muted,
                    border: `1px solid ${(i === 0 ? !useCustomGeoJSON : useCustomGeoJSON) ? t.accent : t.border}`,
                  }}>
                  {label}
                </button>
              ))}
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
                <div style={{ marginBottom: 8 }}>
                  <span style={labelStyle}>Admin Level</span>
                  <select value={adminLevel} onChange={e => setAdminLevel(e.target.value)} style={inputStyle}>
                    <option value="">Select level</option>
                    <option value="adm1">Level 1 — Regions</option>
                    <option value="adm2">Level 2 — Zones</option>
                    <option value="adm3">Level 3 — Districts</option>
                  </select>
                </div>
                <div>
                  <span style={labelStyle}>Feature</span>
                  <select value={featureName} onChange={e => setFeatureName(e.target.value)} style={inputStyle}>
                    <option value="">Select feature</option>
                    {featureList.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
              </>
            )}
          </div>

          {/* ── Dataset & Index ── */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>
              <Icon d={icons.layers} size={13} />
              Dataset & Index
            </div>
            <div style={{ marginBottom: 8 }}>
              <span style={labelStyle}>Dataset</span>
              <select value={dataset} onChange={e => setDataset(e.target.value)} style={inputStyle}>
                <option value="">Select dataset</option>
                {Object.entries(DATASET_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>{v.icon} {v.label}</option>
                ))}
              </select>
            </div>
            <div>
              <span style={labelStyle}>Index / Variable</span>
              <select value={index} onChange={e => setIndex(e.target.value)} style={inputStyle} disabled={!dataset}>
                <option value="">Select variable</option>
                {indexOptions.map(o => <option key={o.v} value={o.v}>{o.t}</option>)}
              </select>
            </div>
          </div>

          {/* ── Mode Toggle ── */}
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

          {/* ── Dates ── */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>
              <Icon d={icons.calendar} size={13} />
              {changeMode ? "Period 1" : "Date Range"}
            </div>
            <DateRow label="From" y={fromYear} m={fromMonth} d={fromDay} setY={setFromYear} setM={setFromMonth} setD={setFromDay} />
            <DateRow label="To" y={toYear} m={toMonth} d={toDay} setY={setToYear} setM={setToMonth} setD={setToDay} />
          </div>

          {/* ── Period 2 (change detection) ── */}
          {changeMode && (
            <div style={{ ...sectionStyle, borderLeft: "3px solid #ea580c", paddingLeft: 12 }}>
              <div style={{ ...sectionTitleStyle, color: "#ea580c" }}>
                <Icon d={icons.compare} size={13} />
                Period 2
              </div>
              <div style={{ background: darkMode ? "rgba(234,88,12,0.08)" : "#fff7ed", border: "1px solid #fed7aa", borderRadius: 6, padding: "6px 10px", marginBottom: 10, fontSize: 11, color: "#9a3412", fontFamily: "sans-serif" }}>
                📊 Result = <b>Period 2 − Period 1</b><br />
                🟢 Green = increase · ⚪ White = no change · 🔴 Red = decrease
              </div>
              <DateRow label="From" y={fromYear2} m={fromMonth2} d={fromDay2} setY={setFromYear2} setM={setFromMonth2} setD={setFromDay2} color="#ea580c" />
              <DateRow label="To" y={toYear2} m={toMonth2} d={toDay2} setY={setToYear2} setM={setToMonth2} setD={setToDay2} color="#ea580c" />
            </div>
          )}

          {/* ── Action Buttons ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button onClick={handleViewSelection} disabled={loading}
              style={{ background: t.btnPrimary, color: "#fff", border: "none", borderRadius: 7, padding: "10px 16px", fontSize: 13, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: "sans-serif" }}>
              <Icon d={icons.eye} size={14} /> View Selection
            </button>

            {/* Time series — only for non-landcover in single date mode */}
            {dataset !== "landcover" && !changeMode && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={handleTimeSeries} disabled={tsLoading || loading}
                    style={{ flex: 1, background: "#7c3aed", color: "#fff", border: "none", borderRadius: 7, padding: "10px 8px", fontSize: 12, fontWeight: 600, cursor: (tsLoading || loading) ? "not-allowed" : "pointer", opacity: (tsLoading || loading) ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: "sans-serif" }}>
                    📈 {tsLoading ? "Loading..." : "Time Series"}
                  </button>
                  <select value={tsInterval} onChange={e => setTsInterval(e.target.value)}
                    style={{ background: t.input, border: `1px solid ${t.inputBorder}`, color: t.inputText, borderRadius: 7, padding: "0 8px", fontSize: 12, fontFamily: "sans-serif", cursor: "pointer" }}>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                    <option value="seasonal">Seasonal</option>
                  </select>
                </div>
                {/* Seasonal month range picker */}
                {tsInterval === "seasonal" && (
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
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
            )}

            {/* Land cover buttons — only in change detection mode with landcover */}
            {dataset === "landcover" && changeMode && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <button onClick={handleLandcoverStats} disabled={statsLoading || loading}
                  style={{ background: "#0891b2", color: "#fff", border: "none", borderRadius: 7, padding: "10px 16px", fontSize: 12, fontWeight: 600, cursor: (statsLoading || loading) ? "not-allowed" : "pointer", opacity: (statsLoading || loading) ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: "sans-serif" }}>
                  📊 {statsLoading ? "Computing..." : "Land Cover Stats"}
                </button>
                <button onClick={handleLandcoverChangeMap} disabled={changeMapLoading || loading}
                  style={{ background: "#b45309", color: "#fff", border: "none", borderRadius: 7, padding: "10px 16px", fontSize: 12, fontWeight: 600, cursor: (changeMapLoading || loading) ? "not-allowed" : "pointer", opacity: (changeMapLoading || loading) ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: "sans-serif" }}>
                  🗺️ {changeMapLoading ? "Computing..." : "Change Map"}
                </button>
              </div>
            )}

            <button onClick={handleDownloadClick} disabled={loading}
              style={{ background: t.btnSecondary, color: "#fff", border: "none", borderRadius: 7, padding: "10px 16px", fontSize: 13, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: "sans-serif" }}>
              <Icon d={icons.download} size={14} /> Download Selection
            </button>
            <button onClick={handleReset}
              style={{ background: t.card, color: t.muted, border: `1px solid ${t.border}`, borderRadius: 7, padding: "9px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: "sans-serif" }}>
              <Icon d={icons.reset} size={14} /> Reset Map
            </button>
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
          {drawnLayerRef.current && (
            <button title="Clear drawn AOI" onClick={() => {
              if (drawnLayerRef.current) { mapRef.current.removeLayer(drawnLayerRef.current); drawnLayerRef.current = null; }
              setCustomGeoJSON(null); setUseCustomGeoJSON(false); setActiveTool(null);
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
              { key: "info", label: "Layer Info" },
              { key: "timeseries", label: "📈 Time Series", hide: dataset === "landcover" },
              { key: "changestats", label: "📊 Change Stats", hide: !(dataset === "landcover" && changeMode) },
              { key: "changemap", label: "🗺️ Change Map", hide: !(dataset === "landcover" && changeMode) },
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

                {!resultsData.isLandcover && resultsData.visParams?.palette && (
                  <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 10, padding: "14px 16px", marginBottom: 16 }}>
                    <div style={{ fontSize: 11, color: t.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10, fontFamily: "sans-serif" }}>Colour Scale</div>
                    <div style={{ height: 12, borderRadius: 6, background: `linear-gradient(to right, ${resultsData.visParams.palette.map(c => c.startsWith("#") ? c : `#${c}`).join(",")})`, marginBottom: 6 }} />
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: t.muted, fontFamily: "sans-serif" }}>
                      <span>{(resultsData.visParams.min ?? 0).toFixed(2)}</span>
                      <span>{(resultsData.visParams.max ?? 1).toFixed(2)}</span>
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
                      { label: "Images Used", value: resultsData.metadata?.images_used != null ? resultsData.metadata.images_used : "N/A" },
                      { label: "Data Coverage", value: resultsData.metadata?.coverage_pct != null ? `${resultsData.metadata.coverage_pct}%` : "N/A" },  
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
                {tsLoading && (
                  <div style={{ textAlign: "center", padding: "40px 0", color: t.muted, fontFamily: "sans-serif", fontSize: 13 }}>
                    <div style={{ width: 32, height: 32, border: "3px solid #e2e8f0", borderTop: `3px solid ${t.accent}`, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
                    Computing time series...
                  </div>
                )}
                {!tsLoading && !tsData && (
                  <div style={{ textAlign: "center", padding: "32px 16px", color: t.muted, fontFamily: "sans-serif", fontSize: 13, lineHeight: 1.6 }}>
                    <div style={{ fontSize: 28, marginBottom: 10 }}>📈</div>
                    Select a dataset, index and date range, then click <b>Time Series</b> in the sidebar.
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
        {/* ── Email Capture Modal ── */}
        {emailModalOpen && (
          <div style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(0,0,0,0.5)", backdropFilter: "blur(3px)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }} onClick={(e) => { if (e.target === e.currentTarget) setEmailModalOpen(false); }}>
            <div style={{
              background: "white", borderRadius: 16, padding: "36px 32px",
              width: 380, boxShadow: "0 24px 60px rgba(0,0,0,0.25)",
              fontFamily: "sans-serif", position: "relative",
            }}>
              <button onClick={() => setEmailModalOpen(false)} style={{
                position: "absolute", top: 14, right: 16, background: "none",
                border: "none", fontSize: 20, cursor: "pointer", color: "#9ca3af",
              }}>×</button>
              <div style={{ textAlign: "center", marginBottom: 16 }}>
                <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#f0fdf4", margin: "0 auto 12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#111" }}>Almost there</div>
                <div style={{ fontSize: 13, color: "#6b7280", marginTop: 6, lineHeight: 1.5 }}>
                  Enter your email to continue.<br/>We will never spam you.
                </div>
              </div>
              <input
                type="email" placeholder="you@example.com"
                value={emailInput} onChange={e => setEmailInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleEmailSubmit()}
                autoFocus
                style={{ width: "100%", padding: "11px 14px", fontSize: 14, border: "1.5px solid #e5e7eb", borderRadius: 9, outline: "none", boxSizing: "border-box", marginBottom: 12, fontFamily: "sans-serif" }}
              />
              <button onClick={handleEmailSubmit} disabled={!emailInput.includes("@")} style={{
                width: "100%", padding: "12px", borderRadius: 9, border: "none",
                background: emailInput.includes("@") ? "#22c55e" : "#e5e7eb",
                color: emailInput.includes("@") ? "white" : "#9ca3af",
                fontSize: 14, fontWeight: 700, cursor: emailInput.includes("@") ? "pointer" : "default",
              }}>
                Continue →
              </button>
              <div style={{ textAlign: "center", fontSize: 11, color: "#9ca3af", marginTop: 10 }}>
                Free forever. No account needed.
              </div>
            </div>
          </div>
        )}

    </div>
  );
}
