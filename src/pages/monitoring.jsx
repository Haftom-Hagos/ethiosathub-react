import React, { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from "firebase/auth";
import {
  listAois, deleteAoi,
  listApiKeys, createApiKey, deleteApiKey,
  getAoiStats,
} from "../services/aoiApi";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "https://hwasat-backend-r5rykfbhxa-ew.a.run.app";

// ── Geo helpers for sub-level district summary ────────────────────────────────
const _getGeoBbox = (geometry) => {
  const pts = [];
  const collect = (c) => { if (!Array.isArray(c)) return; if (typeof c[0] === "number") pts.push(c); else c.forEach(collect); };
  collect(geometry.coordinates);
  const lngs = pts.map(p => p[0]), lats = pts.map(p => p[1]);
  return [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)];
};
const _pip = (pt, ring) => { let inside = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const [xi, yi] = ring[i], [xj, yj] = ring[j]; if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) inside = !inside; } return inside; };
// Vertex-average centroid — more robust than bbox center for irregular polygons
const _centroid = (f) => {
  const pts = [];
  const collect = (c) => { if (!Array.isArray(c)) return; if (typeof c[0] === "number") pts.push(c); else c.forEach(collect); };
  collect(f.geometry.coordinates);
  if (pts.length === 0) { const b = _getGeoBbox(f.geometry); return [(b[0]+b[2])/2, (b[1]+b[3])/2]; }
  return [pts.reduce((s,p) => s+p[0], 0)/pts.length, pts.reduce((s,p) => s+p[1], 0)/pts.length];
};
const _contains = (geom, pt) => geom.type === "Polygon" ? _pip(pt, geom.coordinates[0]) : geom.type === "MultiPolygon" ? geom.coordinates.some(poly => _pip(pt, poly[0])) : true;

const _COUNTRY_BOUNDS = {
  burundi:  [[-4.47, 28.99], [-2.31, 30.85]],  djibouti: [[10.93, 41.77], [12.71, 43.42]],
  eritrea:  [[12.36, 36.44], [18.00, 43.13]],   ethiopia: [[ 3.40, 33.00], [14.89, 47.98]],
  kenya:    [[-4.68, 33.91], [ 4.62, 41.90]],   rwanda:   [[-2.84, 28.86], [-1.05, 30.90]],
  somalia:  [[-1.68, 40.99], [11.97, 51.42]],   s_sudan:  [[ 3.49, 23.44], [12.22, 35.30]],
  sudan:    [[ 8.68, 21.83], [22.22, 38.61]],   tanzania: [[-11.75, 29.34], [-0.99, 40.44]],
  uganda:   [[-1.48, 29.57], [ 4.22, 35.00]],
};
const _COUNTRIES = [
  { key: "burundi",  maxLevel: 2 }, { key: "djibouti", maxLevel: 2 }, { key: "eritrea",  maxLevel: 2 },
  { key: "ethiopia", maxLevel: 3 }, { key: "kenya",    maxLevel: 2 }, { key: "rwanda",   maxLevel: 3 },
  { key: "somalia",  maxLevel: 3 }, { key: "s_sudan",  maxLevel: 2 }, { key: "sudan",    maxLevel: 2 },
  { key: "tanzania", maxLevel: 3 }, { key: "uganda",   maxLevel: 3 },
];

// Property-name match first (Maps.jsx approach), centroid-in-polygon as fallback.
// IMPORTANT: bounding boxes of neighbouring countries overlap (e.g. Eritrea's bbox
// contains northern Tigray/Ethiopia), so we collect ALL candidate countries and try
// each one — whichever produces ≥ 2 matching features wins.
async function _loadSubLevelFeatures(aoiName, aoiGeom) {
  try {
    const [minLng, minLat, maxLng, maxLat] = _getGeoBbox(aoiGeom);
    const cLng = (minLng + maxLng) / 2, cLat = (minLat + maxLat) / 2;
    console.log("[MyAreas] AOI centroid:", cLng.toFixed(4), cLat.toFixed(4), "| name:", aoiName);

    // Collect ALL countries whose bounding box contains the centroid (can be >1 in border regions)
    const candidates = _COUNTRIES.filter(c => {
      const [[bMinLat, bMinLng], [bMaxLat, bMaxLng]] = _COUNTRY_BOUNDS[c.key];
      return cLng >= bMinLng && cLng <= bMaxLng && cLat >= bMinLat && cLat <= bMaxLat;
    });
    console.log("[MyAreas] Country candidates:", candidates.map(c => c.key));
    if (candidates.length === 0) return null;

    const needle = (aoiName || "").toLowerCase().trim();

    // Try each candidate country, finest level first
    for (const eaCountry of candidates) {
      for (let level = eaCountry.maxLevel; level >= 2; level--) {
        try {
          const url  = `/data/${eaCountry.key}/${eaCountry.key}_level_${level}_gcs.geojson`;
          const resp = await fetch(url);
          console.log("[MyAreas]", eaCountry.key, "lvl", level, "→ HTTP", resp.status);
          if (!resp.ok) continue;

          const gj            = await resp.json();
          const totalFeatures = (gj.features || []).length;
          if (totalFeatures > 0) {
            console.log("[MyAreas]", eaCountry.key, "lvl", level, "→", totalFeatures,
              "features | sample props:", JSON.stringify(gj.features[0].properties).substring(0, 250));
          }

          const parentLevel = level - 1;
          const parentKeys  = [
            `adm${parentLevel}_name`, `ADM${parentLevel}_EN`,
            `ADM${parentLevel}_NAME`, `adm${parentLevel}_en`,
          ];

          // PRIMARY: property-name matching
          let filtered = needle ? (gj.features || []).filter(feat => {
            const p = feat.properties || {};
            return parentKeys.some(k => typeof p[k] === "string" && p[k].toLowerCase().trim() === needle);
          }) : [];
          console.log("[MyAreas]", eaCountry.key, "lvl", level,
            "→ name-match hits:", filtered.length, "(needle:", needle + ")");

          // FALLBACK: centroid-in-polygon (for drawn / renamed AOIs)
          if (filtered.length < 2) {
            filtered = (gj.features || []).filter(feat => {
              try { return _contains(aoiGeom, _centroid(feat)); } catch { return false; }
            });
            console.log("[MyAreas]", eaCountry.key, "lvl", level, "→ centroid hits:", filtered.length);
          }

          if (filtered.length >= 2) {
            console.log("[MyAreas] ✓", eaCountry.key, "lvl", level, "→", filtered.length, "features → sending to backend");
            return { fc: { type: "FeatureCollection", features: filtered }, level };
          }
        } catch (e) {
          console.warn("[MyAreas] error:", eaCountry.key, "lvl", level, e);
        }
      }
    }
    console.log("[MyAreas] ✗ No sub-level features found across all candidates");
    return null;
  } catch (e) {
    console.error("[MyAreas] _loadSubLevelFeatures crashed:", e);
    return null;
  }
}

// ── Firebase init ─────────────────────────────────────────────────────────────
let _fbAuth = null;
let _fbProvider = null;
try {
  const cfg = {
    apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_ID,
    appId:             import.meta.env.VITE_FIREBASE_APP_ID,
  };
  const app   = getApps().length === 0 ? initializeApp(cfg) : getApps()[0];
  _fbAuth     = getAuth(app);
  _fbProvider = new GoogleAuthProvider();
} catch (e) {
  console.warn("Firebase init failed:", e);
}

// ── Icon helper ───────────────────────────────────────────────────────────────
const Icon = ({ d, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

// ── Monitoring category definitions ───────────────────────────────────────────
const STATS_CATEGORIES = [
  { id: "crop",        icon: "🌾", label: "Crop Monitoring",     desc: "Field-level crop health & yield outlook",           color: "#16a34a", datasetLabel: "Sentinel-2 · 10 m" },
  { id: "drought",     icon: "🏜️", label: "Drought Monitoring",  desc: "Water stress, drought severity & rainfall deficit", color: "#dc2626", datasetLabel: "MODIS + Climate"   },
  { id: "rangeland",   icon: "🐄", label: "Rangeland & Pasture", desc: "Grazing land quality vs. historical baseline",      color: "#ca8a04", datasetLabel: "MODIS · 250 m"     },
  { id: "forest",      icon: "🌳", label: "Forest & Woodland",   desc: "Tree cover health, fire damage & moisture stress",  color: "#15803d", datasetLabel: "Landsat · 30 m"    },
  { id: "water",       icon: "💧", label: "Water & Flooding",    desc: "Open water extent & flood mapping",                color: "#2563eb", datasetLabel: "Sentinel-2 · 10 m" },
  { id: "degradation", icon: "🟤", label: "Land Degradation",    desc: "Bare soil, desertification & land cover change",   color: "#92400e", datasetLabel: "Landsat · 30 m"    },
];

// ── Context-specific index labels ─────────────────────────────────────────────
const CATEGORY_INDEX_LABELS = {
  crop:        { NDVI: "Crop Density",      EVI: "Crop Vigor",       SAVI: "Soil-Adjusted Crop Cover", VCI:  "Crop Condition"        },
  drought:     { NDVI: "Vegetation Cover",  VHI: "Drought Severity", VCI:  "Vegetation Stress",        SPI:  "Rainfall Deficit"      },
  rangeland:   { NDVI: "Pasture Greenness", EVI: "Pasture Vigor",    VHI:  "Rangeland Health",         VCI:  "Pasture Condition"     },
  forest:      { NDVI: "Forest Cover",      EVI: "Canopy Health",    NBR:  "Burn Severity",            NDMI: "Moisture Stress"       },
  water:       { NDWI: "Open Water Extent", MNDWI: "Flood / Turbid Water"                                                            },
  degradation: { BSI:  "Bare Soil Exposure",NDVI: "Vegetation Loss", SAVI: "Sparse Vegetation",        NDBI: "Degraded Surface"      },
};

// ── Index classifiers ─────────────────────────────────────────────────────────
const C = (label, color) => ({ label, color });
function classifyNdvi(v) {
  if (v == null) return C("No Data", "#94a3b8");
  if (v > 0.6)  return C("Dense Vegetation",    "#16a34a");
  if (v > 0.4)  return C("Moderate Vegetation", "#65a30d");
  if (v > 0.2)  return C("Sparse Vegetation",   "#ca8a04");
  if (v > 0)    return C("Bare / Degraded",     "#ea580c");
  return              C("Non-vegetated",        "#94a3b8");
}
function classifyEvi(v) {
  if (v == null) return C("No Data", "#94a3b8");
  if (v > 0.5)  return C("High Productivity",    "#16a34a");
  if (v > 0.3)  return C("Moderate Productivity","#65a30d");
  if (v > 0.1)  return C("Low Productivity",     "#ca8a04");
  return              C("Very Low",              "#94a3b8");
}
function classifyVhi(v) {
  if (v == null) return C("No Data",         "#94a3b8");
  if (v > 60)   return C("No Drought",       "#16a34a");
  if (v > 40)   return C("Drought Watch",    "#65a30d");
  if (v > 20)   return C("Moderate Drought", "#ea580c");
  if (v > 10)   return C("Severe Drought",   "#dc2626");
  return              C("Extreme Drought",   "#7f1d1d");
}
function classifyVci(v) {
  if (v == null) return C("No Data",       "#94a3b8");
  if (v > 60)   return C("Good Condition", "#16a34a");
  if (v > 40)   return C("Fair Condition", "#65a30d");
  if (v > 20)   return C("Poor Condition", "#ea580c");
  return              C("Very Poor",       "#dc2626");
}
function classifySpi(v) {
  if (v == null) return C("No Data",         "#94a3b8");
  if (v > 1)    return C("Wet / Above Normal","#2563eb");
  if (v > -0.5) return C("Near Normal",      "#16a34a");
  if (v > -1)   return C("Mildly Dry",       "#65a30d");
  if (v > -1.5) return C("Moderate Drought", "#ca8a04");
  if (v > -2)   return C("Severe Drought",   "#dc2626");
  return              C("Extreme Drought",   "#7f1d1d");
}
function classifyNbr(v) {
  if (v == null) return C("No Data",          "#94a3b8");
  if (v > 0.2)  return C("Healthy / Unburned","#16a34a");
  if (v > 0)    return C("Low Burn Severity", "#ca8a04");
  if (v > -0.2) return C("Moderate Burn",     "#ea580c");
  return              C("High Burn Severity", "#dc2626");
}
function classifyNdmi(v) {
  if (v == null) return C("No Data",          "#94a3b8");
  if (v > 0.3)  return C("High Moisture",     "#2563eb");
  if (v > 0.1)  return C("Moderate Moisture", "#16a34a");
  if (v > 0)    return C("Low Moisture",      "#ca8a04");
  return              C("Moisture Stressed",  "#dc2626");
}
function classifyNdwi(v) {
  if (v == null) return C("No Data",         "#94a3b8");
  if (v > 0.3)  return C("Water Present",    "#2563eb");
  if (v > 0)    return C("Potential Water",  "#60a5fa");
  return              C("No Water Detected", "#94a3b8");
}
function classifyBsi(v) {
  if (v == null) return C("No Data",          "#94a3b8");
  if (v > 0.1)  return C("Bare Soil",         "#92400e");
  if (v > 0)    return C("Sparse Vegetation", "#ca8a04");
  return              C("Vegetated",          "#16a34a");
}
function classifyNdbi(v) {
  if (v == null) return C("No Data",           "#94a3b8");
  if (v > 0.1)  return C("Highly Degraded",    "#7f1d1d");
  if (v > 0)    return C("Degraded / Built-up","#dc2626");
  if (v > -0.1) return C("Transitional",       "#ca8a04");
  return              C("Vegetated",           "#16a34a");
}

// Map index name → { unit, classify } (labels are category-specific, see above)
const INDEX_CLASSIFIERS = {
  NDVI:  { unit: "",       classify: classifyNdvi  },
  EVI:   { unit: "",       classify: classifyEvi   },
  SAVI:  { unit: "",       classify: classifyNdvi  }, // same scale as NDVI
  VCI:   { unit: " / 100", classify: classifyVci   },
  VHI:   { unit: " / 100", classify: classifyVhi   },
  SPI:   { unit: "",       classify: classifySpi   },
  NBR:   { unit: "",       classify: classifyNbr   },
  NDMI:  { unit: "",       classify: classifyNdmi  },
  NDWI:  { unit: "",       classify: classifyNdwi  },
  MNDWI: { unit: "",       classify: classifyNdwi  },
  BSI:   { unit: "",       classify: classifyBsi   },
  NDBI:  { unit: "",       classify: classifyNdbi  },
};

// ── Stat row ──────────────────────────────────────────────────────────────────
function StatRow({ label, value, unit, classify, onAnalyse }) {
  const { label: statusLabel, color } = classify(value);
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "10px 0", borderBottom: "1px solid #f1f5f9", gap: 8,
    }}>
      <span style={{ fontSize: 13, color: "#64748b", fontWeight: 500, flexShrink: 0 }}>{label}</span>
      <div style={{ textAlign: "right", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
        {value !== null && value !== undefined ? (
          <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
            {value}{unit}
          </span>
        ) : (
          <span style={{ fontSize: 12, color: "#94a3b8" }}>—</span>
        )}
        <span style={{
          fontSize: 11, fontWeight: 600, color,
          background: `${color}18`, border: `1px solid ${color}44`,
          borderRadius: 999, padding: "2px 8px", whiteSpace: "nowrap",
        }}>
          {statusLabel}
        </span>
        {onAnalyse && (
          <button
            onClick={onAnalyse}
            title="Open deep-dive analysis for this index"
            style={{
              fontSize: 10, fontWeight: 700, color: "#7c3aed",
              background: "#f5f3ff", border: "1px solid #ede9fe",
              borderRadius: 999, padding: "2px 8px", cursor: "pointer",
              whiteSpace: "nowrap", transition: "background 0.12s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "#ede9fe"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "#f5f3ff"; }}
          >
            Analyse →
          </button>
        )}
      </div>
    </div>
  );
}

// ── Contact-developer popup ───────────────────────────────────────────────────
function ContactPopup({ onClose }) {
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 3000,
        background: "rgba(0,0,0,0.55)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: "#fff", borderRadius: 16, padding: "36px 32px",
        maxWidth: 400, width: "100%", textAlign: "center",
        boxShadow: "0 20px 60px rgba(0,0,0,0.2)", fontFamily: "sans-serif",
      }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🔒</div>
        <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "#0f172a", margin: "0 0 10px" }}>
          Premium Feature
        </h3>
        <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.7, margin: "0 0 24px" }}>
          This service is available on paid plans.<br />
          Contact the developer to get access.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <a
            href="/about#contact"
            onClick={onClose}
            style={{
              padding: "10px 22px", borderRadius: 8,
              background: "#16a34a", color: "#fff",
              fontWeight: 700, fontSize: 13, textDecoration: "none",
            }}
          >
            Contact Developer →
          </a>
          <button
            onClick={onClose}
            style={{
              padding: "10px 22px", borderRadius: 8,
              border: "1px solid #e2e8f0", background: "#f8fafc",
              color: "#64748b", fontWeight: 600, fontSize: 13, cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Stats Modal ───────────────────────────────────────────────────────────────
function StatsModal({ aoi, step, stats, error, selectedCategory, onPickCategory, onClose, onAnalyseIndex, isOwner }) {
  const cat = STATS_CATEGORIES.find(c => c.id === (stats?.category || selectedCategory));
  const [showContactPopup, setShowContactPopup] = useState(false);

  // ── Custom date range (default: first day of current month → today) ──
  const _now  = new Date();
  const _pad  = n => String(n).padStart(2, "0");
  const _todayStr = `${_now.getFullYear()}-${_pad(_now.getMonth() + 1)}-${_pad(_now.getDate())}`;
  const _firstOfMonth = `${_now.getFullYear()}-${_pad(_now.getMonth() + 1)}-01`;
  const [dateFrom, setDateFrom] = useState(_firstOfMonth);
  const [dateTo,   setDateTo]   = useState(_todayStr);

  const selectStyle = {
    padding: "5px 8px", borderRadius: 6, border: "1px solid #e2e8f0",
    background: "#f8fafc", color: "#0f172a", fontSize: 12, cursor: "pointer",
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 2000,
        background: "rgba(0,0,0,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "16px",
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: "#fff", borderRadius: 16, padding: "28px 28px 24px",
        width: "100%", maxWidth: 480,
        boxShadow: "0 20px 60px rgba(0,0,0,0.2)", fontFamily: "sans-serif",
        maxHeight: "90vh", overflowY: "auto",
      }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 11, color: "#16a34a", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 4 }}>
              Monitor
            </div>
            <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#0f172a" }}>
              {aoi.name}
            </h3>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 4, flexShrink: 0 }}>
            <Icon d="M18 6L6 18M6 6l12 12" size={18} />
          </button>
        </div>

        {/* ── Date range picker (shown on pick + result steps) ── */}
        {(step === "pick" || step === "result") && (
          <div style={{
            display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
            background: "#f8fafc", borderRadius: 8, padding: "10px 12px",
            border: "1px solid #e2e8f0", marginBottom: 16,
          }}>
            <Icon d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" size={13} />
            <span style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>Period:</span>
            <input
              type="date" value={dateFrom} max={dateTo}
              onChange={e => setDateFrom(e.target.value)}
              style={selectStyle}
            />
            <span style={{ fontSize: 12, color: "#94a3b8" }}>→</span>
            <input
              type="date" value={dateTo} min={dateFrom} max={_todayStr}
              onChange={e => setDateTo(e.target.value)}
              style={selectStyle}
            />
          </div>
        )}

        {/* ── Step 1: Category picker ── */}
        {step === "pick" && (
          <>
            <p style={{ fontSize: 13, color: "#64748b", marginBottom: 16, lineHeight: 1.6 }}>
              What are you monitoring? We'll select the right satellite data and indicators for you.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {STATS_CATEGORIES.map(({ id, icon, label, desc, color, datasetLabel }) => (
                <button
                  key={id}
                  onClick={() => isOwner ? onPickCategory(id, dateFrom, dateTo) : setShowContactPopup(true)}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "flex-start",
                    padding: "14px 14px", borderRadius: 12,
                    border: "1.5px solid #e2e8f0", background: "#f8fafc",
                    cursor: "pointer", textAlign: "left",
                    transition: "all 0.12s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.background = `${color}0d`; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.background = "#f8fafc"; }}
                >
                  <span style={{ fontSize: 22, marginBottom: 6 }}>{icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 3 }}>{label}</span>
                  <span style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.4, marginBottom: 6 }}>{desc}</span>
                  <span style={{
                    fontSize: 10, fontWeight: 600, color,
                    background: `${color}15`, border: `1px solid ${color}33`,
                    borderRadius: 999, padding: "2px 7px",
                  }}>
                    {datasetLabel}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* ── Step 2: Loading ── */}
        {step === "loading" && (
          <div style={{ textAlign: "center", padding: "32px 0", color: "#64748b" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>{cat?.icon || "⏳"}</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>
              Computing {cat?.label || "statistics"}…
            </div>
            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 6 }}>
              {cat?.datasetLabel} · This may take 10–30 seconds
            </div>
          </div>
        )}

        {/* ── Step 3: Error ── */}
        {step === "error" && (
          <>
            <div style={{ background: "#fee2e2", borderRadius: 8, padding: "14px 16px", fontSize: 13, color: "#dc2626", marginBottom: 16 }}>
              {error}
            </div>
            <button onClick={() => onPickCategory(null)} style={{ fontSize: 12, color: "#16a34a", background: "none", border: "none", cursor: "pointer", padding: 0, fontWeight: 600 }}>
              ← Try a different category
            </button>
          </>
        )}

        {/* ── Step 4: Results ── */}
        {step === "result" && stats && (() => {
          const categoryLabels = CATEGORY_INDEX_LABELS[stats.category] || {};
          const catDef = STATS_CATEGORIES.find(c => c.id === stats.category);
          return (
            <>
              {/* Category + date range badge */}
              <div style={{
                background: "#f8fafc", borderRadius: 8, padding: "8px 14px",
                fontSize: 12, color: "#64748b", marginBottom: 16,
                display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
              }}>
                {catDef && (
                  <span style={{
                    background: catDef.color, color: "#fff",
                    borderRadius: 999, padding: "2px 10px", fontSize: 11, fontWeight: 700,
                  }}>
                    {catDef.icon} {catDef.label}
                  </span>
                )}
                <Icon d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" size={13} />
                <span>
                  {stats.date_from} → {stats.date_to}
                  {stats.fallback && (
                    <span style={{ marginLeft: 8, color: "#ca8a04", fontWeight: 600 }}>
                      (extended window — limited recent data)
                    </span>
                  )}
                </span>
              </div>

              {/* Dynamic stat rows */}
              <div>
                {Object.entries(stats.indices).map(([idx, value]) => {
                  const meta = INDEX_CLASSIFIERS[idx];
                  if (!meta) return null;
                  const label = categoryLabels[idx] || idx;
                  return (
                    <StatRow
                      key={idx}
                      label={label}
                      value={value}
                      unit={meta.unit}
                      classify={meta.classify}
                      onAnalyse={onAnalyseIndex ? () => onAnalyseIndex(stats.dataset, idx) : undefined}
                    />
                  );
                })}
              </div>

              {/* Source note */}
              <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 16, lineHeight: 1.6 }}>
                {catDef?.datasetLabel} · VCI uses MODIS 2000–2023 baseline · VHI and SPI from climate datasets.
              </p>

              {/* Actions */}
              <button
                onClick={() => onPickCategory(null)}
                style={{ marginTop: 6, fontSize: 12, color: "#16a34a", background: "none", border: "none", cursor: "pointer", padding: 0, fontWeight: 600 }}
              >
                ← Try a different category
              </button>
            </>
          );
        })()}
      </div>
    </div>
    {showContactPopup && <ContactPopup onClose={() => setShowContactPopup(false)} />}
  );
}

// ── Analysis datasets ─────────────────────────────────────────────────────────
const ANALYSIS_DATASETS = [
  { v: "sentinel2", t: "Sentinel-2 (10 m)", indices: ["NDVI","EVI","NDWI","NBR","NDBI","MNDWI","BSI","SAVI","NDMI","GNDVI"] },
  { v: "landsat",   t: "Landsat (30 m)",    indices: ["NDVI","EVI","NDWI","NBR","NDBI","BSI","SAVI","NDMI","GNDVI"] },
  { v: "modis",     t: "MODIS (250 m)",     indices: ["NDVI","EVI","NDWI","NBR","NDMI"] },
  { v: "climate",   t: "Climate / CHIRPS",  indices: ["VHI","SPI"] },
];
const ANALYSIS_MONTHS = [
  {v:"01",t:"Jan"},{v:"02",t:"Feb"},{v:"03",t:"Mar"},{v:"04",t:"Apr"},
  {v:"05",t:"May"},{v:"06",t:"Jun"},{v:"07",t:"Jul"},{v:"08",t:"Aug"},
  {v:"09",t:"Sep"},{v:"10",t:"Oct"},{v:"11",t:"Nov"},{v:"12",t:"Dec"},
];

// ── Analysis Modal ─────────────────────────────────────────────────────────────
function AnalysisModal({ aoi, onClose, onViewOnMap, initialDataset, initialIndex }) {
  const curYear = new Date().getFullYear();
  const [dataset,       setDataset]       = useState(initialDataset || "sentinel2");
  const [index,         setIndex]         = useState(initialIndex   || "NDVI");
  const [fromYear,      setFromYear]      = useState(String(curYear));
  const [fromMonth,     setFromMonth]     = useState("06");
  const [toYear,        setToYear]        = useState(String(curYear));
  const [toMonth,       setToMonth]       = useState("08");
  const [loading,       setLoading]       = useState(false);
  const [result,        setResult]        = useState(null);
  const [districtData,  setDistrictData]  = useState(null);
  const [error,         setError]         = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [showContactPopup, setShowContactPopup] = useState(false);

  const dsConfig     = ANALYSIS_DATASETS.find(d => d.v === dataset);
  const indexOptions = dsConfig?.indices || [];

  const handleDatasetChange = v => {
    setDataset(v);
    const ds = ANALYSIS_DATASETS.find(d => d.v === v);
    if (ds && !ds.indices.includes(index)) setIndex(ds.indices[0]);
  };

  const handleRun = async () => {
    setLoading(true); setResult(null); setDistrictData(null); setError(null);
    const startDate = `${fromYear}-${fromMonth}-01`;
    const endDate   = `${toYear}-${toMonth}-28`;
    try {
      // Auto-detect finest sub-level (3 → 2) — matches by parent property name first (Maps.jsx approach)
      const subResult    = await _loadSubLevelFeatures(aoi.name, aoi.geometry);
      const districtBody = {
        dataset, index, startDate, endDate,
        geometry: aoi.geometry,
        districtLevel: subResult ? subResult.level : 2,
        ...(subResult ? { customDistricts: subResult.fc } : {}),
      };
      const [baselineRes, districtRes] = await Promise.all([
        fetch(`${BACKEND_URL}/baseline`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dataset, index, startDate, endDate, geometry: aoi.geometry }),
        }),
        fetch(`${BACKEND_URL}/district_summary`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(districtBody),
        }),
      ]);
      if (!baselineRes.ok) { const e = await baselineRes.json().catch(() => ({})); throw new Error(e.detail || `HTTP ${baselineRes.status}`); }
      const baselineJson = await baselineRes.json();
      setResult(baselineJson);
      if (!districtRes.ok) {
        const e = await districtRes.json().catch(() => ({}));
        console.error("[MyAreas] /district_summary failed:", districtRes.status, e);
        setDistrictData(null);
      } else {
        const dj = await districtRes.json().catch(() => null);
        console.log("[MyAreas] /district_summary returned", Array.isArray(dj) ? dj.length + " rows" : dj);
        setDistrictData(Array.isArray(dj) ? dj : null);
      }
    } catch (e) { setError(e.message || "Analysis failed"); }
    finally { setLoading(false); }
  };

  const handleDownloadReport = async () => {
    if (!result) return;
    setReportLoading(true);
    try {
      const startDate = `${fromYear}-${fromMonth}-01`;
      const endDate   = `${toYear}-${toMonth}-28`;
      const res = await fetch(`${BACKEND_URL}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          area_name:  aoi.name || "Selected Area",
          dataset, index,
          start_date: startDate,
          end_date:   endDate,
          baseline:   result,
          districts:  districtData || [],
          template:   "researcher",
        }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail || `HTTP ${res.status}`); }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `hwasat_${(aoi.name || "report").replace(/\s+/g, "_")}_${index}_${startDate}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) { alert(`Report failed: ${e.message}`); }
    finally { setReportLoading(false); }
  };

  const years = Array.from({ length: curYear - 2000 + 1 }, (_, i) => curYear - i);
  const iSt = { padding: "7px 10px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#f8fafc", fontSize: 13, fontFamily: "sans-serif", outline: "none", width: "100%" };

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "40px 16px" }}
    >
      <div style={{ background: "#fff", borderRadius: 18, width: "100%", maxWidth: 520, padding: "28px 28px 24px", boxShadow: "0 8px 40px rgba(0,0,0,0.18)", fontFamily: "sans-serif" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 11, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Analysis</div>
            <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>{aoi.name}</h2>
            {aoi.area_km2 && <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 3 }}>{aoi.area_km2.toLocaleString()} km²</div>}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#94a3b8", padding: "0 4px", lineHeight: 1 }}>×</button>
        </div>

        {/* Dataset + Index */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: "#64748b", marginBottom: 5 }}>Dataset</div>
            <select value={dataset} onChange={e => handleDatasetChange(e.target.value)} style={iSt}>
              {ANALYSIS_DATASETS.map(d => <option key={d.v} value={d.v}>{d.t}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#64748b", marginBottom: 5 }}>Index</div>
            <select value={index} onChange={e => setIndex(e.target.value)} style={iSt}>
              {indexOptions.map(ix => <option key={ix} value={ix}>{ix}</option>)}
            </select>
          </div>
        </div>

        {/* Date range */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
          {[["From", fromMonth, setFromMonth, fromYear, setFromYear], ["To", toMonth, setToMonth, toYear, setToYear]].map(([label, mo, setMo, yr, setYr]) => (
            <div key={label}>
              <div style={{ fontSize: 11, color: "#64748b", marginBottom: 5 }}>{label}</div>
              <div style={{ display: "flex", gap: 5 }}>
                <select value={mo} onChange={e => setMo(e.target.value)} style={{ ...iSt, flex: 1 }}>
                  {ANALYSIS_MONTHS.map(m => <option key={m.v} value={m.v}>{m.t}</option>)}
                </select>
                <select value={yr} onChange={e => setYr(e.target.value)} style={{ ...iSt, flex: 1.4 }}>
                  {years.map(y => <option key={y} value={String(y)}>{y}</option>)}
                </select>
              </div>
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          <button
            onClick={() => isOwner ? handleRun() : setShowContactPopup(true)}
            disabled={loading}
            style={{
              flex: 1, padding: "11px 14px", background: loading ? "#a78bfa" : "#7c3aed", color: "#fff",
              border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer", fontFamily: "sans-serif",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}
          >
            {loading ? "⏳ Computing…" : "📊 Load Analysis"}
          </button>
          <button onClick={onViewOnMap} style={{
            flex: 1, padding: "11px 14px", background: "#16a34a", color: "#fff",
            border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600,
            cursor: "pointer", fontFamily: "sans-serif",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}>
            🗺️ View on Map
          </button>
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#dc2626", marginBottom: 16 }}>
            {error}
          </div>
        )}

        {/* Results */}
        {result && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Current value */}
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "16px 18px" }}>
              <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>
                Current — {result.period_label}
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontSize: 30, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em" }}>
                  {result.current_value?.toFixed(3)}
                </div>
                {result.status && (
                  <div style={{
                    padding: "5px 11px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                    background: (result.status.color || "#94a3b8") + "20",
                    color: result.status.color || "#64748b",
                    border: `1px solid ${(result.status.color || "#94a3b8") + "40"}`,
                  }}>
                    {result.status.label}
                  </div>
                )}
              </div>
              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 6 }}>{result.index} · {result.dataset}</div>
            </div>

            {/* Baseline comparison */}
            {result.baseline_mean != null ? (
              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "16px 18px" }}>
                <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>
                  vs 5-Year Baseline
                  {result.years_used?.length > 0 && (
                    <span style={{ marginLeft: 6, color: "#94a3b8" }}>
                      ({result.years_used[0]}–{result.years_used[result.years_used.length - 1]}, {result.years_used.length} yr)
                    </span>
                  )}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
                  {[
                    { label: "Mean",  value: result.baseline_mean?.toFixed(3) },
                    { label: "Range", value: `${result.baseline_min?.toFixed(2)} – ${result.baseline_max?.toFixed(2)}` },
                    { label: "Std",   value: result.baseline_std?.toFixed(3) },
                  ].map(item => (
                    <div key={item.label} style={{ textAlign: "center", background: "#fff", borderRadius: 8, padding: "10px 8px", border: "1px solid #e2e8f0" }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{item.value}</div>
                      <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 3 }}>{item.label}</div>
                    </div>
                  ))}
                </div>
                {result.pct_change != null && (
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                    padding: "10px 16px", borderRadius: 8,
                    background: (result.anomaly?.color || "#64748b") + "12",
                    border: `1px solid ${(result.anomaly?.color || "#64748b") + "30"}`,
                  }}>
                    <span style={{ fontSize: 20, fontWeight: 800, color: result.pct_change >= 0 ? "#16a34a" : "#dc2626" }}>
                      {result.pct_change >= 0 ? "▲" : "▼"} {Math.abs(result.pct_change)}%
                    </span>
                    <span style={{ fontSize: 13, color: result.anomaly?.color || "#64748b", fontWeight: 600 }}>
                      {result.anomaly?.label || "vs baseline"}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#92400e" }}>
                ⚠️ Not enough historical data for a baseline comparison in this area and period.
              </div>
            )}

            {/* District summary table */}
            {districtData && districtData.length > 0 && (
              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "16px 18px" }}>
                <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>District Breakdown</div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, fontFamily: "sans-serif" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                      <th style={{ textAlign: "left", padding: "4px 6px", color: "#64748b", fontWeight: 600, fontSize: 11 }}>District</th>
                      <th style={{ textAlign: "right", padding: "4px 6px", color: "#64748b", fontWeight: 600, fontSize: 11 }}>Value</th>
                      <th style={{ textAlign: "right", padding: "4px 6px", color: "#64748b", fontWeight: 600, fontSize: 11 }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {districtData.map((d, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "6px 6px", color: "#0f172a", fontWeight: 500 }}>{d.name}{d.zone ? ` · ${d.zone}` : ""}</td>
                        <td style={{ padding: "6px 6px", textAlign: "right", color: "#334155", fontWeight: 600 }}>{typeof d.value === "number" ? d.value.toFixed(3) : d.value ?? "—"}</td>
                        <td style={{ padding: "6px 6px", textAlign: "right" }}>
                          <span style={{
                            padding: "2px 8px", borderRadius: 12, fontSize: 10, fontWeight: 600,
                            background: (d.status_color || "#94a3b8") + "22",
                            color: d.status_color || "#64748b",
                            border: `1px solid ${(d.status_color || "#94a3b8") + "44"}`,
                          }}>{d.status_label || "—"}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Download Report button */}
            <button
              onClick={handleDownloadReport}
              disabled={reportLoading}
              style={{
                width: "100%", padding: "11px 14px",
                background: reportLoading ? "#94a3b8" : "#0f172a",
                color: "#fff", border: "none", borderRadius: 8,
                fontSize: 13, fontWeight: 600, cursor: reportLoading ? "not-allowed" : "pointer",
                fontFamily: "sans-serif",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}
            >
              {reportLoading ? "⏳ Generating PDF…" : "📄 Download Report"}
            </button>

            <div style={{ fontSize: 11, color: "#94a3b8", textAlign: "center" }}>
              Click <strong>View on Map</strong> for time series and full dashboard
            </div>
          </div>
        )}
      </div>
    </div>
    {showContactPopup && <ContactPopup onClose={() => setShowContactPopup(false)} />}
  );
}

// ── AOI card ──────────────────────────────────────────────────────────────────
function AoiCard({ aoi, onDelete, onGetStats, onOpenInDashboard, onOpenAnalysis }) {
  const [deleting, setDeleting]           = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    try { await onDelete(aoi.id); } finally { setDeleting(false); setConfirmDelete(false); }
  };

  const createdDate = aoi.created_at
    ? new Date(aoi.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : "—";

  return (
    <div style={{
      background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14,
      padding: "22px 24px", display: "flex", flexDirection: "column", gap: 14,
      boxShadow: "0 2px 8px rgba(0,0,0,0.05)", fontFamily: "sans-serif",
      transition: "box-shadow 0.2s",
    }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.1)"}
      onMouseLeave={e => e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.05)"}
    >
      <div>
        <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>{aoi.name}</h3>
        <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
          {aoi.area_km2 ? `${aoi.area_km2.toLocaleString()} km²` : "Area unknown"} · Saved {createdDate}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => onGetStats(aoi)} style={{
          flex: 1, padding: "9px 10px", borderRadius: 7, border: "none",
          background: "#0f172a", color: "#fff", fontSize: 12, fontWeight: 600,
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        }}>
          <Icon d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" size={13} />
          Monitor
        </button>
        <button onClick={() => onOpenInDashboard(aoi)} style={{
          flex: 1, padding: "9px 10px", borderRadius: 7, border: "none",
          background: "#16a34a", color: "#fff", fontSize: 12, fontWeight: 600,
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        }}>
          <Icon d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" size={13} />
          Go to my AOI
        </button>
        <button
          onClick={handleDelete} disabled={deleting}
          title={confirmDelete ? "Click again to confirm deletion" : "Delete AOI"}
          style={{
            padding: "9px 10px", borderRadius: 7,
            border: `1px solid ${confirmDelete ? "#ef4444" : "#e2e8f0"}`,
            background: confirmDelete ? "#fee2e2" : "#f8fafc",
            color: confirmDelete ? "#dc2626" : "#94a3b8",
            fontSize: 12, fontWeight: 600, cursor: deleting ? "not-allowed" : "pointer",
            opacity: deleting ? 0.6 : 1, display: "flex", alignItems: "center", gap: 5, transition: "all 0.15s",
          }}
        >
          <Icon d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" size={13} />
          {deleting ? "…" : confirmDelete ? "Confirm" : ""}
        </button>
      </div>
      <button
        onClick={() => onOpenAnalysis(aoi)}
        style={{
          width: "100%", padding: "9px 10px", borderRadius: 7,
          border: "1px solid #ede9fe", background: "#f5f3ff", color: "#7c3aed",
          fontSize: 12, fontWeight: 600, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          transition: "background 0.15s",
        }}
        onMouseEnter={e => { e.currentTarget.style.background = "#ede9fe"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "#f5f3ff"; }}
      >
        📊 Analyse
      </button>
    </div>
  );
}

// ── Sign-in prompt ─────────────────────────────────────────────────────────────
function SignInPrompt({ onSignIn, loading }) {
  return (
    <div style={{
      maxWidth: 440, margin: "80px auto", textAlign: "center",
      background: "#fff", borderRadius: 20, padding: "48px 40px",
      border: "1px solid #e2e8f0", boxShadow: "0 4px 24px rgba(0,0,0,0.07)", fontFamily: "sans-serif",
    }}>
      <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#f0fdf4", margin: "0 auto 20px", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4zM8 2v16M16 6v16" />
        </svg>
      </div>
      <h2 style={{ fontSize: "1.4rem", fontWeight: 700, color: "#0f172a", marginBottom: 10 }}>Sign in to view your areas</h2>
      <p style={{ fontSize: "0.95rem", color: "#64748b", lineHeight: 1.7, marginBottom: 32 }}>
        Save and monitor Areas of Interest with on-demand satellite statistics. Free accounts can save up to 1 area.
      </p>
      <button
        onClick={onSignIn} disabled={loading}
        style={{
          width: "100%", padding: "13px 16px", borderRadius: 10, border: "1.5px solid #e5e7eb",
          background: loading ? "#f9fafb" : "#fff", cursor: loading ? "default" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
          fontSize: 15, fontWeight: 600, color: "#374151", boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
        }}
      >
        {loading ? "Signing in…" : (<>
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Continue with Google
        </>)}
      </button>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function MyAreas() {
  const navigate = useNavigate();
  const [user, setUser]               = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [signInLoading, setSignInLoading] = useState(false);
  const [aois, setAois]               = useState([]);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [error, setError]             = useState(null);

  // ── Analysis modal state ──
  const [analysisAoi,     setAnalysisAoi]     = useState(null);
  const [preloadDataset,  setPreloadDataset]  = useState(null);
  const [preloadIndex,    setPreloadIndex]    = useState(null);

  // ── Stats modal state ──
  const [statsAoi, setStatsAoi]           = useState(null);
  const [statsStep, setStatsStep]         = useState("pick"); // "pick"|"loading"|"result"|"error"
  const [statsData, setStatsData]         = useState(null);
  const [statsError, setStatsError]       = useState(null);
  const [statsCategory, setStatsCategory] = useState(null);

  // ── API Keys state ──
  const [apiKeys, setApiKeys]             = useState([]);
  const [newKeyName, setNewKeyName]       = useState("");
  const [newKeyResult, setNewKeyResult]   = useState(null);
  const [apiKeyError, setApiKeyError]     = useState(null);
  const [apiKeyCreating, setApiKeyCreating] = useState(false);

  useEffect(() => {
    if (!_fbAuth) { setAuthLoading(false); return; }
    const unsub = onAuthStateChanged(_fbAuth, u => { setUser(u || null); setAuthLoading(false); });
    return unsub;
  }, []);

  const fetchAois = useCallback(async u => {
    if (!u) return;
    setFetchLoading(true); setError(null);
    try { setAois(await listAois(u)); }
    catch (e) { setError(e.message || "Failed to load saved areas"); }
    finally { setFetchLoading(false); }
  }, []);

  const loadApiKeys = useCallback(async u => {
    if (!u) return;
    try { setApiKeys(await listApiKeys(u)); }
    catch (e) { if (!e.message?.includes("Enterprise")) setApiKeyError(e.message); }
  }, []);

  useEffect(() => { if (user) { fetchAois(user); loadApiKeys(user); } }, [user, fetchAois, loadApiKeys]);

  const handleSignIn = async () => {
    if (!_fbAuth || !_fbProvider) return;
    setSignInLoading(true);
    try { const r = await signInWithPopup(_fbAuth, _fbProvider); setUser(r.user); }
    catch (e) { if (e.code !== "auth/popup-closed-by-user") console.error(e); }
    finally { setSignInLoading(false); }
  };

  const handleDelete = async aoiId => {
    try { await deleteAoi(user, aoiId); setAois(prev => prev.filter(a => a.id !== aoiId)); }
    catch (e) { setError(e.message || "Delete failed"); }
  };

  // ── Stats flow ──
  const handleGetStats = aoi => {
    setStatsAoi(aoi); setStatsStep("pick");
    setStatsData(null); setStatsError(null); setStatsCategory(null);
  };

  const handlePickCategory = async (category, startDate, endDate) => {
    if (!category) {
      setStatsStep("pick"); setStatsData(null); setStatsCategory(null);
      return;
    }
    setStatsCategory(category);
    setStatsStep("loading");
    try {
      const data = await getAoiStats(user, statsAoi.id, category, startDate, endDate);
      setStatsData(data);
      setStatsStep("result");
    } catch (e) {
      setStatsError(e.message || "Failed to compute statistics");
      setStatsStep("error");
    }
  };

  const handleCloseStats = () => { setStatsAoi(null); setStatsData(null); setStatsError(null); setStatsCategory(null); };

  // ── "Analyse this →" cross-tab shortcut ──
  const handleAnalyseFromStats = (dataset, index) => {
    const aoi = statsAoi;
    handleCloseStats();
    setPreloadDataset(dataset);
    setPreloadIndex(index);
    setAnalysisAoi(aoi);
  };

  // ── Open Analysis modal ──
  const handleOpenAnalysis = aoi => {
    setPreloadDataset(null);
    setPreloadIndex(null);
    setAnalysisAoi(aoi);
  };

  // ── Open in Dashboard ──
  const handleOpenInDashboard = aoi => {
    try {
      sessionStorage.setItem("hwasat_load_aoi", JSON.stringify({ geometry: aoi.geometry, name: aoi.name, layers: [] }));
    } catch (_) {}
    navigate("/maps");
  };

  // ── API Key handlers ──
  const handleCreateApiKey = async () => {
    if (!newKeyName.trim()) return;
    setApiKeyCreating(true); setApiKeyError(null); setNewKeyResult(null);
    try { const k = await createApiKey(user, newKeyName.trim()); setNewKeyResult(k); setNewKeyName(""); setApiKeys(prev => [k, ...prev]); }
    catch (e) { setApiKeyError(e.message); }
    finally { setApiKeyCreating(false); }
  };

  const handleDeleteApiKey = async keyId => {
    try { await deleteApiKey(user, keyId); setApiKeys(prev => prev.filter(k => k.key_id !== keyId)); }
    catch (e) { setApiKeyError(e.message); }
  };

  if (authLoading) return <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh", fontFamily: "sans-serif", color: "#94a3b8" }}>Loading…</div>;
  if (!user) return <SignInPrompt onSignIn={handleSignIn} loading={signInLoading} />;

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "40px 24px", fontFamily: "sans-serif" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
        <div>
          <p style={{ fontSize: 12, color: "#16a34a", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Monitoring Dashboard</p>
          <h1 style={{ fontSize: "1.9rem", fontWeight: 700, color: "#0f172a", margin: 0, lineHeight: 1.2 }}>Monitoring</h1>
          <p style={{ fontSize: "0.95rem", color: "#64748b", marginTop: 8, lineHeight: 1.6 }}>
            {aois.length > 0
              ? `${aois.length} area${aois.length > 1 ? "s" : ""} saved. Click Monitor for on-demand satellite indicators`
              : "Save areas in the Dashboard to monitor them here"}
          </p>
        </div>
        <Link to="/maps" style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", background: "#16a34a", color: "#fff", borderRadius: 8, textDecoration: "none", fontSize: 14, fontWeight: 600 }}>
          + Add New Area
        </Link>
      </div>

      {/* Error banner */}
      {error && (
        <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 8, padding: "10px 16px", fontSize: 13, color: "#dc2626", marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          {error}
          <button onClick={() => setError(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626", fontSize: 16 }}>×</button>
        </div>
      )}

      {fetchLoading && <div style={{ textAlign: "center", padding: "60px 0", color: "#94a3b8" }}>Loading your saved areas…</div>}

      {/* Empty state */}
      {!fetchLoading && aois.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 24px", background: "#fff", borderRadius: 16, border: "2px dashed #e2e8f0" }}>
          <div style={{ fontSize: "3rem", marginBottom: 16 }}>🗺️</div>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>No areas saved yet</h2>
          <p style={{ fontSize: "0.95rem", color: "#64748b", maxWidth: 380, margin: "0 auto 28px", lineHeight: 1.7 }}>
            Go to the Dashboard, draw or select an area, then click <strong style={{ color: "#16a34a" }}>Save Area</strong> to monitor it here.
          </p>
          <Link to="/maps" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 24px", background: "#16a34a", color: "#fff", borderRadius: 8, textDecoration: "none", fontSize: 14, fontWeight: 600 }}>
            Open Dashboard →
          </Link>
        </div>
      )}

      {/* AOI grid */}
      {!fetchLoading && aois.length > 0 && (
        <>
          <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "10px 16px", fontSize: 12, color: "#92400e", marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
            <span>⚡</span>
            <span><strong>Free plan:</strong> 1 saved area included. <a href="mailto:hello@hwasat.com" style={{ color: "#b45309", fontWeight: 600 }}>Contact us</a> to upgrade for unlimited areas, PDF reports, and AI insights.</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
            {aois.map(aoi => (
              <AoiCard key={aoi.id} aoi={aoi} onDelete={handleDelete} onGetStats={handleGetStats} onOpenInDashboard={handleOpenInDashboard} onOpenAnalysis={handleOpenAnalysis} />
            ))}
          </div>
        </>
      )}

      {/* API Keys */}
      {apiKeys.length > 0 && (
        <div style={{ marginTop: 48, background: "#0f172a", borderRadius: 12, padding: "28px 32px", border: "1px solid #1e293b" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Enterprise</div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#f1f5f9", margin: 0 }}>API Access</h3>
              <p style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>Keys begin with <code style={{ color: "#4ade80", background: "#1e2535", padding: "1px 5px", borderRadius: 4 }}>hwsk_</code></p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={newKeyName} onChange={e => setNewKeyName(e.target.value)} placeholder="Key name" style={{ padding: "8px 12px", borderRadius: 7, border: "1px solid #2a3347", background: "#1e2535", color: "#e2e8f0", fontSize: 12, width: 160, outline: "none" }} />
              <button onClick={handleCreateApiKey} disabled={apiKeyCreating || !newKeyName.trim()} style={{ padding: "8px 16px", borderRadius: 7, border: "none", background: apiKeyCreating ? "#374151" : "#16a34a", color: "#fff", fontSize: 12, fontWeight: 600, cursor: apiKeyCreating || !newKeyName.trim() ? "not-allowed" : "pointer" }}>
                {apiKeyCreating ? "Creating…" : "+ Create Key"}
              </button>
            </div>
          </div>
          {apiKeyError && <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 7, padding: "8px 14px", fontSize: 12, color: "#dc2626", marginBottom: 14 }}>{apiKeyError}<button onClick={() => setApiKeyError(null)} style={{ marginLeft: 8, background: "none", border: "none", cursor: "pointer", color: "#dc2626" }}>×</button></div>}
          {newKeyResult?.key && (
            <div style={{ background: "#052e16", border: "1px solid #16a34a", borderRadius: 8, padding: "14px 16px", marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: "#4ade80", fontWeight: 600, marginBottom: 6 }}>✓ Key created — copy it now. It will not be shown again.</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <code style={{ flex: 1, fontSize: 12, color: "#86efac", wordBreak: "break-all", background: "#0a3622", padding: "8px 12px", borderRadius: 6 }}>{newKeyResult.key}</code>
                <button onClick={() => navigator.clipboard.writeText(newKeyResult.key)} style={{ padding: "8px 12px", background: "#16a34a", color: "#fff", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>Copy</button>
              </div>
              <button onClick={() => setNewKeyResult(null)} style={{ marginTop: 8, fontSize: 11, color: "#64748b", background: "none", border: "none", cursor: "pointer", padding: 0 }}>Dismiss</button>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {apiKeys.map(key => (
              <div key={key.key_id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#1e2535", borderRadius: 8, padding: "12px 16px", border: "1px solid #2a3347" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>{key.name}</div>
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                    <code style={{ color: "#4ade80" }}>{key.key_prefix}…</code> · Created {new Date(key.created_at).toLocaleDateString()}
                    {key.last_used && <> · Last used {new Date(key.last_used).toLocaleDateString()}</>} · {key.request_count || 0} requests
                  </div>
                </div>
                <button onClick={() => handleDeleteApiKey(key.key_id)} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #374151", background: "transparent", color: "#94a3b8", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Revoke</button>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 11, color: "#374151", marginTop: 14 }}>Add <code style={{ color: "#4ade80" }}>X-API-Key: hwsk_your_key</code> to API requests as an alternative to Firebase Bearer tokens.</p>
        </div>
      )}

      {/* Stats Modal */}
      {statsAoi && (
        <StatsModal
          aoi={statsAoi}
          step={statsStep}
          stats={statsData}
          error={statsError}
          selectedCategory={statsCategory}
          onPickCategory={handlePickCategory}
          onClose={handleCloseStats}
          onAnalyseIndex={handleAnalyseFromStats}
          isOwner={user?.email === OWNER_EMAIL}
        />
      )}

      {/* Analysis Modal */}
      {analysisAoi && (
        <AnalysisModal
          aoi={analysisAoi}
          onClose={() => { setAnalysisAoi(null); setPreloadDataset(null); setPreloadIndex(null); }}
          onViewOnMap={() => {
            handleOpenInDashboard(analysisAoi);
            setAnalysisAoi(null);
          }}
          initialDataset={preloadDataset}
          initialIndex={preloadIndex}
        />
      )}
    </div>
  );
}
