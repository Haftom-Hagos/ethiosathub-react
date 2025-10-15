import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const BACKEND_URL = "https://hafrepo-2.onrender.com";

export default function Maps() {
  const mapRef = useRef(null);
  const boundaryLayersCache = useRef({});
  const layerFeatureMap = useRef(new Map());
  const featureMap = useRef(new Map());
  const overlayRef = useRef(null);
  const legendRef = useRef(null);
  const layerControlRef = useRef(null);

  const [geojsonData, setGeojsonData] = useState({ adm1: null, adm2: null, adm3: null });
  const [dataset, setDataset] = useState("");
  const [index, setIndex] = useState("");
  const [adminLevel, setAdminLevel] = useState("");
  const [featureName, setFeatureName] = useState("");
  const [featureList, setFeatureList] = useState([]);
  const [selectedFeatureGeoJSON, setSelectedFeatureGeoJSON] = useState(null);
  const [loading, setLoading] = useState(false);
  const [viewData, setViewData] = useState(null);

  const [fromYear, setFromYear] = useState("");
  const [fromMonth, setFromMonth] = useState("");
  const [fromDay, setFromDay] = useState("");
  const [toYear, setToYear] = useState("");
  const [toMonth, setToMonth] = useState("");
  const [toDay, setToDay] = useState("");

  const [indexOptions, setIndexOptions] = useState([]);
  const [yearOptions, setYearOptions] = useState([]);

  // 🗂️ Dataset configuration
  const DATASET_CONFIG = {
    landcover: { label: "Land cover", indices: [{ v: "dynamic", t: "Dynamic World (10m)" }], yearRange: [2015, new Date().getFullYear() - 1] },
    sentinel2: { label: "Sentinel-2", indices: [{ v: "NDVI", t: "NDVI" }, { v: "NDWI", t: "NDWI" }, { v: "NBR", t: "NBR" }, { v: "NDBI", t: "NDBI" }, { v: "NDCI", t: "NDCI" }], yearRange: [2015, new Date().getFullYear() - 1] },
    landsat: { label: "Landsat", indices: [{ v: "NDVI", t: "NDVI" }, { v: "NDWI", t: "NDWI" }, { v: "NBR", t: "NBR" }, { v: "NDBI", t: "NDBI" }], yearRange: [1984, new Date().getFullYear() - 1] },
    modis: { label: "MODIS", indices: [{ v: "NDVI", t: "NDVI" }, { v: "NDWI", t: "NDWI" }, { v: "NBR", t: "NBR" }, { v: "NDBI", t: "NDBI" }], yearRange: [2000, new Date().getFullYear() - 1] },
    climate: { label: "Climate", indices: [{ v: "SPI", t: "SPI" }, { v: "VHI", t: "VHI" }], yearRange: [1981, new Date().getFullYear() - 1] }
  };

  const LANDCOVER_PALETTE = {
    water: "#419BDF",
    trees: "#397D49",
    grass: "#88B053",
    flooded_vegetation: "#7A87C6",
    crops: "#E49635",
    shrub_and_scrub: "#DFC35A",
    built: "#C4281B",
    bare: "#A59B8F",
    snow_and_ice: "#B39FE1"
  };

  const getPropName = (lvl) => lvl === "adm1" ? "ADM1_EN" : lvl === "adm2" ? "ADM2_EN" : "ADM3_EN";
  const normalizeColor = (c) => c?.startsWith("#") ? c : /^[0-9A-Fa-f]{6}$/.test(c) ? `#${c}` : c || "#ccc";

  // 🗺️ Initialize map once
  useEffect(() => {
    if (mapRef.current) return;
    const map = L.map("map", { center: [9.145, 40.4897], zoom: 6 });
    mapRef.current = map;

    const street = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap", maxZoom: 19, zIndex: 1
    }).addTo(map);
    const sat = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
      attribution: "Esri & contributors", maxZoom: 19, zIndex: 1
    });
    map._baseStreet = street; map._baseSat = sat;
    layerControlRef.current = L.control.layers({ "Street Map": street, "Satellite": sat }, {}, { collapsed: false }).addTo(map);
  }, []);

  // 📁 Load boundaries
  useEffect(() => {
    Promise.all([
      fetch("/data/ethiopia_admin_level_1_gcs.geojson").then(r => r.json()),
      fetch("/data/ethiopia_admin_level_2_gcs.geojson").then(r => r.json()),
      fetch("/data/ethiopia_admin_level_3_gcs_simplified.geojson").then(r => r.json())
    ]).then(([adm1, adm2, adm3]) => setGeojsonData({ adm1, adm2, adm3 }))
      .catch(err => console.error("GeoJSON load failed:", err));
  }, []);

  // 🎛️ Update indices and years per dataset
  useEffect(() => {
    if (!dataset) return;
    const cfg = DATASET_CONFIG[dataset];
    setIndexOptions(cfg.indices);
    const [minY, maxY] = cfg.yearRange;
    setYearOptions(Array.from({ length: maxY - minY + 1 }, (_, i) => maxY - i));
  }, [dataset]);

  // 📆 Month/Day dropdowns
  const monthOptions = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
  const dayOptionsFor = (y, m) => (!y || !m) ? [] : Array.from({ length: new Date(Number(y), Number(m), 0).getDate() }, (_, i) => String(i + 1).padStart(2, "0"));

  // 🗺️ Admin level → show boundaries and features
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !geojsonData[adminLevel]) return;
    Object.values(boundaryLayersCache.current).forEach((l) => map.removeLayer(l));
    layerFeatureMap.current.clear();
    featureMap.current.clear();
    setFeatureList([]); setFeatureName("");

    const prop = getPropName(adminLevel);
    const layer = L.geoJSON(geojsonData[adminLevel], {
      style: { color: "#3388ff", weight: 1.2, fillOpacity: 0 },
      onEachFeature: (feature, lyr) => {
        const name = feature.properties[prop];
        layerFeatureMap.current.set(name, lyr);
        featureMap.current.set(name, feature);
        lyr.on("click", () => {
          setFeatureName(name);
          setSelectedFeatureGeoJSON(feature);
          layerFeatureMap.current.forEach((l, n) => l.setStyle({
            color: n === name ? "#ff0000" : "#3388ff", weight: n === name ? 3 : 1.2
          }));
          map.fitBounds(lyr.getBounds());
        });
      }
    }).addTo(map);
    boundaryLayersCache.current[adminLevel] = layer;
    map.fitBounds(layer.getBounds());
    setFeatureList(geojsonData[adminLevel].features.map(f => f.properties[prop]));
  }, [adminLevel, geojsonData]);

  // Highlight and fit on dropdown selection
  useEffect(() => {
    if (!featureName || !adminLevel || !layerFeatureMap.current.has(featureName)) return;
    const lyr = layerFeatureMap.current.get(featureName);
    const feature = featureMap.current.get(featureName);
    setSelectedFeatureGeoJSON(feature);
    layerFeatureMap.current.forEach((l, n) => l.setStyle({
      color: n === featureName ? "#ff0000" : "#3388ff", weight: n === featureName ? 3 : 1.2
    }));
    const map = mapRef.current;
    if (map) {
      map.fitBounds(lyr.getBounds());
    }
  }, [featureName, adminLevel]);

  // 🎨 Overlay + Legend builder
  const addOverlayAndLegend = (data, datasetKey) => {
    const map = mapRef.current;
    if (!map) return;

    // Remove old overlay and legend
    if (overlayRef.current) map.removeLayer(overlayRef.current);
    if (legendRef.current) map.removeControl(legendRef.current);

    const tileUrl = data.tiles || data.mode_tiles;
    if (!tileUrl || !tileUrl.startsWith('http')) {
      console.warn("No valid tiles returned:", tileUrl);
      return;
    }

    const overlay = L.tileLayer(tileUrl, { opacity: 0.85, zIndex: 5 }).addTo(map);
    overlayRef.current = overlay;

    if (data.bounds?.length) {
      try {
        const latlngs = data.bounds.map(([lng, lat]) => [lat, lng]);
        map.fitBounds(latlngs);
      } catch {}
    }

    // Legend setup
    const vis = data.vis_params || {};
    const palette = (vis.palette || []).map(normalizeColor);
    const min = data.legend?.meta?.min ?? vis.min ?? 0;
    const max = data.legend?.meta?.max ?? vis.max ?? 1;

    const Legend = L.Control.extend({
      onAdd() {
        const div = L.DomUtil.create("div", "info legend");
        div.style.background = "white";
        div.style.padding = "6px 8px";
        div.style.fontSize = "12px";
        div.style.boxShadow = "0 0 10px rgba(0,0,0,0.15)";

        // 🟩 Land cover (discrete)
        if (datasetKey === "landcover" && data.unique_classes?.length) {
          div.innerHTML = `<b>Land Cover</b><br>`;
          data.unique_classes.forEach((cls, i) => {
            const className = typeof cls === "string" ? cls : (cls.name || cls.class_name || `Class ${i}`);
            const color = LANDCOVER_PALETTE[className] || palette[i % palette.length] || "#ccc";
            const displayName = className.replace(/_/g, ' ');
            div.innerHTML += `
              <div style="display:flex;align-items:center;margin:2px 0">
                <i style="background:${color};width:18px;height:18px;border:1px solid #999;margin-right:6px;"></i>${displayName}
              </div>`;
          });
        } else {
          // 🌈 Continuous (indices)
          const grad = `linear-gradient(to right, ${palette.join(",")})`;
          div.innerHTML = `
            <div><b>${data.legend?.label || "Index"}</b></div>
            <div style="width:160px;height:14px;background:${grad};border:1px solid #ccc;margin:4px 0;border-radius:4px;"></div>
            <div style="display:flex;justify-content:space-between;font-size:11px"><span>${min.toFixed(2)}</span><span>${max.toFixed(2)}</span></div>`;
        }
        return div;
      }
    });
    legendRef.current = new Legend({ position: "bottomleft" });
    legendRef.current.addTo(map);

    // Recreate layer control with new overlay
    if (layerControlRef.current) {
      map.removeControl(layerControlRef.current);
    }
    const overlayName = `${DATASET_CONFIG[datasetKey]?.label || 'Data'} Layer`;
    const overlaysObj = { [overlayName]: overlay };
    layerControlRef.current = L.control.layers(
      { "Street Map": map._baseStreet, "Satellite": map._baseSat },
      overlaysObj,
      { collapsed: false }
    ).addTo(map);
  };

  // 📤 View
  const handleViewSelection = async () => {
    if (!selectedFeatureGeoJSON) return alert("Select a feature first");
    if (!dataset || !index) return alert("Select dataset and index");
    if (!fromYear || !toYear) return alert("Select from and to years");
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/gee_layers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dataset,
          index,
          startDate: `${fromYear}-${fromMonth || "01"}-${fromDay || "01"}`,
          endDate: `${toYear}-${toMonth || "12"}-${toDay || "31"}`,
          geometry: selectedFeatureGeoJSON.geometry
        })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      console.log('Received data:', data);
      if (!data.tiles && !data.mode_tiles) {
        throw new Error(`No tiles available for ${dataset} ${index}`);
      }
      addOverlayAndLegend(data, dataset);
      setViewData(data);
    } catch (e) {
      console.error(e);
      alert("Failed to visualize selection. See console.");
    } finally { setLoading(false); }
  };

  // ⬇️ Download
  const handleDownloadSelection = async () => {
    if (!selectedFeatureGeoJSON) return alert("Select a feature first");
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/download`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dataset,
          index,
          startDate: `${fromYear}-${fromMonth || "01"}-${fromDay || "01"}`,
          endDate: `${toYear}-${toMonth || "12"}-${toDay || "31"}`,
          geometry: selectedFeatureGeoJSON.geometry
        })
      });
      if (!res.ok) {
        const errText = await res.text();
        console.error('Download error:', res.status, errText);
        if (dataset === 'landcover') {
          alert("Download for Land Cover is currently not supported. Please try other datasets.");
          return;
        }
        throw new Error(`Download failed: ${res.status}`);
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${dataset}_${index}_${fromYear}_${toYear}.tif`;
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      if (dataset !== 'landcover') {
        alert("Download failed. See console.");
      }
    } finally { setLoading(false); }
  };

  const handleReset = () => {
    const map = mapRef.current;
    if (!map) return;
    if (overlayRef.current) map.removeLayer(overlayRef.current);
    if (legendRef.current) map.removeControl(legendRef.current);
    Object.values(boundaryLayersCache.current).forEach((l) => map.removeLayer(l));
    setDataset(""); setIndex(""); setAdminLevel(""); setFeatureList([]); setFeatureName("");
    setSelectedFeatureGeoJSON(null);
    setViewData(null);
    map.setView([9.145, 40.4897], 6);
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold text-green-700 mb-3">Explore Land Cover & Vegetation Indices</h1>

      <div className="relative mb-4 rounded-xl overflow-hidden shadow" style={{ height: 520 }}>
        <div id="map" style={{ height: "100%", width: "100%" }} />
        {loading && (
          <div style={{ position: "absolute", inset: 0, display: "flex", justifyContent: "center", alignItems: "center", background: "rgba(255,255,255,0.3)", zIndex: 9999 }}>
            <div style={{ width: 60, height: 60, border: "6px solid #ccc", borderTop: "6px solid #2f855a", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}
      </div>

      {/* --- Controls --- */}
      <div className="flex flex-wrap gap-3 mb-3">
        <select value={dataset} onChange={(e) => setDataset(e.target.value)} className="border p-2 rounded">
          <option value="">Select dataset</option>
          {Object.entries(DATASET_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>

        <select value={index} onChange={(e) => setIndex(e.target.value)} className="border p-2 rounded">
          <option value="">Select sub dataset</option>
          {indexOptions.map((o) => <option key={o.v} value={o.v}>{o.t}</option>)}
        </select>

        <select value={adminLevel} onChange={(e) => setAdminLevel(e.target.value)} className="border p-2 rounded">
          <option value="">Select admin level</option>
          <option value="adm1">Level 1 (Regions)</option>
          <option value="adm2">Level 2 (Zones)</option>
          <option value="adm3">Level 3 (Districts)</option>
        </select>

        <select value={featureName} onChange={(e) => setFeatureName(e.target.value)} className="border p-2 rounded">
          <option value="">Choose feature</option>
          {featureList.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>

      {/* Dates */}
      <div className="flex gap-6 mb-3">
        {[
          { label: "From", y: fromYear, m: fromMonth, d: fromDay, setY: setFromYear, setM: setFromMonth, setD: setFromDay },
          { label: "To", y: toYear, m: toMonth, d: toDay, setY: setToYear, setM: setToMonth, setD: setToDay }
        ].map(({ label, y, m, d, setY, setM, setD }) => (
          <div key={label}>
            <div className="font-semibold mb-1">{label}</div>
            <div className="flex gap-2">
              <select value={y} onChange={(e) => setY(e.target.value)} className="border p-2 rounded w-20">
                <option value="">Year</option>
                {yearOptions.map((yr) => <option key={yr} value={yr}>{yr}</option>)}
              </select>
              <select value={m} onChange={(e) => setM(e.target.value)} className="border p-2 rounded w-22">
                <option value="">Month</option>
                {monthOptions.map((mo) => <option key={mo} value={mo}>{mo}</option>)}
              </select>
              <select value={d} onChange={(e) => setD(e.target.value)} className="border p-2 rounded w-18">
                <option value="">Day</option>
                {dayOptionsFor(y, m).map((dd) => <option key={dd} value={dd}>{dd}</option>)}
              </select>
            </div>
          </div>
        ))}
      </div>

      {/* Buttons */}
      <div className="flex gap-3">
        <button onClick={handleViewSelection} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700" disabled={loading}>View Selection</button>
        <button onClick={handleDownloadSelection} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700" disabled={loading}>Download Selection</button>
        <button onClick={handleReset} className="bg-gray-300 text-black px-4 py-2 rounded hover:bg-gray-400">Reset Map</button>
      </div>

      {viewData && (
        <div className="bg-green-50 border border-green-200 p-3 rounded mt-3">
          <b className="text-green-800">Layer loaded successfully.</b>
        </div>
      )}
    </div>
  );
}