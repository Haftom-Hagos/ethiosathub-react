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
  const [message, setMessage] = useState(null);
  const [useCustomGeoJSON, setUseCustomGeoJSON] = useState(false);
  const [customGeoJSON, setCustomGeoJSON] = useState(null);
  const fileInputRef = useRef(null);

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
    landcover: { label: "Land cover", indices: [{ v: "dynamic", t: "Dynamic World (10m)" }], yearRange: [2015, new Date().getFullYear()], minDate: "2015-07-27" },
    sentinel2: { label: "Sentinel-2", indices: [{ v: "NDVI", t: "NDVI" }, { v: "NDWI", t: "NDWI" }, { v: "NBR", t: "NBR" }, { v: "NDBI", t: "NDBI" }, { v: "NDCI", t: "NDCI" }], yearRange: [2017, new Date().getFullYear()], minDate: "2017-06-23" },
    landsat: { label: "Landsat", indices: [{ v: "NDVI", t: "NDVI" }, { v: "NDWI", t: "NDWI" }, { v: "NBR", t: "NBR" }, { v: "NDBI", t: "NDBI" }], yearRange: [1984, new Date().getFullYear()], minDate: "1984-03-01" },
    modis: { label: "MODIS", indices: [{ v: "NDVI", t: "NDVI" }, { v: "NDWI", t: "NDWI" }, { v: "NBR", t: "NBR" }, { v: "NDBI", t: "NDBI" }], yearRange: [2000, new Date().getFullYear()], minDate: "2000-02-18" },
    climate: { label: "Climate", indices: [{ v: "SPI", t: "SPI" }, { v: "VHI", t: "VHI" }], yearRange: [1981, new Date().getFullYear()], minDate: "1981-01-01" },
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
    snow_and_ice: "#B39FE1",
  };

  const getPropName = (lvl) => (lvl === "adm1" ? "ADM1_EN" : lvl === "adm2" ? "ADM2_EN" : "ADM3_EN");
  const normalizeColor = (c) => (c?.startsWith("#") ? c : /^[0-9A-Fa-f]{6}$/.test(c) ? `#${c}` : c || "#ccc");

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1).padStart(2, "0"),
    label: `${String(i + 1).padStart(2, "0")} (${months[i]})`,
  }));

  // 🗺️ Initialize map once
  useEffect(() => {
    if (mapRef.current) return;
    const map = L.map("map", { center: [9.145, 40.4897], zoom: 6 });
    mapRef.current = map;

    const street = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
      maxZoom: 19,
      zIndex: 1,
    }).addTo(map);
    const sat = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
      attribution: "Esri & contributors",
      maxZoom: 19,
      zIndex: 1,
    });
    map._baseStreet = street;
    map._baseSat = sat;
    layerControlRef.current = L.control.layers({ "Street Map": street, "Satellite": sat }, {}, { collapsed: false }).addTo(map);
  }, []);

  // 📁 Load boundaries (only for Ethiopia mode)
  useEffect(() => {
    if (useCustomGeoJSON) return;
    Promise.all([
      fetch("/data/ethiopia_admin_level_1_gcs.geojson").then((r) => r.json()),
      fetch("/data/ethiopia_admin_level_2_gcs.geojson").then((r) => r.json()),
      fetch("/data/ethiopia_admin_level_3_gcs_simplified.geojson").then((r) => r.json()),
    ])
      .then(([adm1, adm2, adm3]) => setGeojsonData({ adm1, adm2, adm3 }))
      .catch((err) => {
        setMessage("Failed to load boundary data. Please try again.");
      });
  }, [useCustomGeoJSON]);

  // Handle custom GeoJSON upload
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const geojson = JSON.parse(e.target.result);
        let feature;
        if (geojson.type === "FeatureCollection") {
          if (geojson.features.length === 0) throw new Error("No features in GeoJSON");
          feature = geojson.features[0];
        } else if (geojson.type === "Feature") {
          feature = geojson;
        } else {
          throw new Error("Invalid GeoJSON format - must be Feature or FeatureCollection");
        }
        if (!feature.geometry || !["Polygon", "MultiPolygon"].includes(feature.geometry.type)) {
          throw new Error("Geometry must be Polygon or MultiPolygon");
        }
        setCustomGeoJSON(feature);
        setSelectedFeatureGeoJSON(feature);
        setUseCustomGeoJSON(true);
        setMessage("Custom GeoJSON loaded successfully!");
      } catch (error) {
        setMessage(`Invalid GeoJSON file: ${error.message}`);
      }
    };
    reader.readAsText(file);
  };

  // Toggle between Ethiopia and custom
  const toggleBoundaryMode = () => {
    if (useCustomGeoJSON) {
      setUseCustomGeoJSON(false);
      setCustomGeoJSON(null);
      setSelectedFeatureGeoJSON(null);
      setAdminLevel("");
      setFeatureName("");
      setFeatureList([]);
      fileInputRef.current.value = "";
    } else {
      setUseCustomGeoJSON(true);
    }
  };

  // 🎛️ Update indices and years per dataset
  useEffect(() => {
    if (!dataset) return;
    const cfg = DATASET_CONFIG[dataset];
    setIndexOptions(cfg.indices);
    const [minY, maxY] = cfg.yearRange;
    setYearOptions(Array.from({ length: maxY - minY + 1 }, (_, i) => maxY - i));
  }, [dataset]);

  // Validate dates
  const validateDates = () => {
    if (!dataset || !fromYear || !toYear) return true;
    const cfg = DATASET_CONFIG[dataset];
    const minDate = new Date(cfg.minDate);
    const fromDate = new Date(`${fromYear}-${fromMonth || "01"}-${fromDay || "01"}`);
    const toDate = new Date(`${toYear}-${toMonth || "12"}-${toDay || "31"}`);
    if (fromDate < minDate) {
      setMessage(`Start date must be after ${cfg.minDate} for ${cfg.label}`);
      return false;
    }
    if (toDate < fromDate) {
      setMessage("End date must be after start date");
      return false;
    }
    return true;
  };

  // 📆 Month/Day dropdowns
  const dayOptionsFor = (y, m) => (!y || !m) ? [] : Array.from({ length: new Date(Number(y), Number(m), 0).getDate() }, (_, i) => String(i + 1).padStart(2, "0"));

  // 🗺️ Admin level → show boundaries and features (Ethiopia mode only)
  useEffect(() => {
    if (useCustomGeoJSON || !mapRef.current || !geojsonData[adminLevel]) return;
    const map = mapRef.current;
    Object.values(boundaryLayersCache.current).forEach((l) => map.removeLayer(l));
    layerFeatureMap.current.clear();
    featureMap.current.clear();
    setFeatureList([]);
    setFeatureName("");

    const prop = getPropName(adminLevel);
    const names = geojsonData[adminLevel].features.map((f) => f.properties[prop]).sort((a, b) => a.localeCompare(b));
    setFeatureList(names);

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
            color: n === name ? "#ff0000" : "#3388ff",
            weight: n === name ? 3 : 1.2,
          }));
          map.fitBounds(lyr.getBounds());
        });
      },
    }).addTo(map);
    boundaryLayersCache.current[adminLevel] = layer;
    map.fitBounds(layer.getBounds());
  }, [adminLevel, geojsonData, useCustomGeoJSON]);

  // Load custom GeoJSON layer
  useEffect(() => {
    if (!useCustomGeoJSON || !customGeoJSON || !mapRef.current) return;
    const map = mapRef.current;
    if (boundaryLayersCache.current.custom) map.removeLayer(boundaryLayersCache.current.custom);
    const customLayer = L.geoJSON(customGeoJSON, {
      style: { color: "#ff0000", weight: 3, fillOpacity: 0.2 },
      onEachFeature: (feature, lyr) => {
        lyr.on("click", () => {
          map.fitBounds(lyr.getBounds());
        });
      },
    }).addTo(map);
    boundaryLayersCache.current.custom = customLayer;
    map.fitBounds(customLayer.getBounds());
  }, [customGeoJSON, useCustomGeoJSON]);

  // Highlight and fit on dropdown selection (Ethiopia mode only)
  useEffect(() => {
    if (useCustomGeoJSON || !featureName || !adminLevel || !layerFeatureMap.current.has(featureName)) return;
    const lyr = layerFeatureMap.current.get(featureName);
    const feature = featureMap.current.get(featureName);
    setSelectedFeatureGeoJSON(feature);
    layerFeatureMap.current.forEach((l, n) => l.setStyle({
      color: n === featureName ? "#ff0000" : "#3388ff",
      weight: n === featureName ? 3 : 1.2,
    }));
    const map = mapRef.current;
    if (map) {
      map.fitBounds(lyr.getBounds());
    }
  }, [featureName, adminLevel, useCustomGeoJSON]);

  // 🎨 Overlay + Legend builder
  const addOverlayAndLegend = (data, datasetKey) => {
    const map = mapRef.current;
    if (!map) return;

    if (overlayRef.current) map.removeLayer(overlayRef.current);
    if (legendRef.current) map.removeControl(legendRef.current);

    const tileUrl = data.tiles || data.mode_tiles;
    if (!tileUrl || !tileUrl.startsWith("http")) {
      const errorMsg = datasetKey === 'landsat'
        ? `No valid map tiles returned for ${datasetKey} ${data.legend?.label || index}. Try a wider date range or different region.`
        : `No valid map tiles returned for ${datasetKey} ${data.legend?.label || index}. Please try a different date range or index.`;
      setMessage(errorMsg);
      return;
    }

    console.log(`Loading tile URL: ${tileUrl}`); // Debug tile URL

    const addTileLayerWithRetry = (attempt = 1, maxAttempts = 2) => {
      const overlay = L.tileLayer(tileUrl, { opacity: 0.85, zIndex: 5 }).addTo(map);
      overlayRef.current = overlay;

      // Timeout to remove layer if it doesn't load
      const timeoutId = setTimeout(() => {
        if (overlayRef.current === overlay) {
          map.removeLayer(overlay);
          setMessage(`Failed to load map tiles for ${datasetKey} ${data.legend?.label || index} after timeout. Try a different date range or region.`);
        }
      }, 10000);

      overlay.on('error', (err) => {
        console.error(`Tile layer error on attempt ${attempt}:`, err);
        clearTimeout(timeoutId);
        map.removeLayer(overlay);
        if (attempt < maxAttempts) {
          console.log(`Retrying tile layer load, attempt ${attempt + 1}`);
          setTimeout(() => addTileLayerWithRetry(attempt + 1, maxAttempts), 1000);
        } else {
          setMessage(`Failed to load map tiles for ${datasetKey} ${data.legend?.label || index} after ${maxAttempts} attempts. Try a wider date range or different region.`);
        }
      });

      overlay.on('load', () => {
        clearTimeout(timeoutId);
        map.invalidateSize(); // Force map refresh
      });
    };

    addTileLayerWithRetry();

    if (data.bounds?.length) {
      try {
        const latlngs = data.bounds.map(([lng, lat]) => [lat, lng]);
        map.fitBounds(latlngs);
      } catch {
        setMessage("Failed to adjust map bounds.");
      }
    }

    const vis = data.vis_params || {};
    const palette = (vis.palette || []).map(normalizeColor);
    const min = data.legend?.meta?.min ?? vis.min ?? 0;
    const max = data.legend?.meta?.max ?? vis.max ?? 1;

    const indexDescriptions = {
		  'sentinel2_NDVI': 'Sentinel-2 NDVI',
		  'sentinel2_NDWI': 'Sentinel-2 NDWI',
		  'sentinel2_NBR': 'Sentinel-2 NBR',
		  'sentinel2_NDBI': 'Sentinel-2 NDBI',
		  'sentinel2_NDCI': 'Sentinel-2 NDCI',
		  'landsat_NDVI': 'Landsat NDVI',
		  'landsat_NDWI': 'Landsat NDWI',
		  'landsat_NBR': 'Landsat NBR',
		  'landsat_NDBI': 'Landsat NDBI',
		  'modis_NDVI': 'MODIS NDVI',
		  'modis_NDWI': 'MODIS NDWI',
		  'modis_NBR': 'MODIS NBR',
		  'modis_NDBI': 'MODIS NDBI',
		  'climate_SPI': 'Climate SPI',
		  'climate_VHI': 'Climate VHI',
		  'landcover_dynamic': 'Land Cover Dynamic',
		};

		const Legend = L.Control.extend({
		  onAdd() {
			const div = L.DomUtil.create("div", "info legend");
			div.style.background = "white";
			div.style.padding = "6px 8px";
			div.style.fontSize = "12px";
			div.style.boxShadow = "0 0 10px rgba(0,0,0,0.15)";

			if (datasetKey === "landcover" && data.unique_classes?.length) {
			  div.innerHTML = `<b>Land Cover Dynamic</b><br>`;
			  data.unique_classes.forEach((cls, i) => {
				const className = typeof cls === "string" ? cls : cls.class_name || `Class ${i}`;
				const color = LANDCOVER_PALETTE[className] || palette[i % palette.length] || "#ccc";
				const displayName = className.replace(/_/g, " ");
				div.innerHTML += `
				  <div style="display:flex;align-items:center;margin:2px 0">
					<i style="background:${color};width:18px;height:18px;border:1px solid #999;margin-right:6px;"></i>${displayName}
				  </div>`;
			  });
			} else {
			  const grad = `linear-gradient(to right, ${palette.join(",")})`;
			  const legendKey = `${datasetKey}_${data.legend?.label || index}`;
			  const description = indexDescriptions[legendKey] || `${DATASET_CONFIG[datasetKey]?.label || 'Data'} ${data.legend?.label || index}`;
			  div.innerHTML = `
				<div><b>${description}</b></div>
				<div style="width:160px;height:14px;background:${grad};border:1px solid #ccc;margin:4px 0;border-radius:4px;"></div>
				<div style="display:flex;justify-content:space-between;font-size:11px"><span>${min.toFixed(2)}</span><span>${max.toFixed(2)}</span></div>`;
			}
			return div;
		  },
		});

		legendRef.current = new Legend({ position: "bottomleft" });
		legendRef.current.addTo(map);

		if (layerControlRef.current) {
		  map.removeControl(layerControlRef.current);
		}
		const overlayName = `${DATASET_CONFIG[datasetKey]?.label || "Data"} Layer`;
		const overlaysObj = { [overlayName]: overlayRef.current };
		layerControlRef.current = L.control.layers(
		  { "Street Map": map._baseStreet, "Satellite": map._baseSat },
		  overlaysObj,
		  { collapsed: false }
		).addTo(map);

		map.invalidateSize(); // Ensure map is redrawn
		};

  // 📤 View
  const handleViewSelection = async () => {
    const geometry = useCustomGeoJSON ? customGeoJSON.geometry : selectedFeatureGeoJSON?.geometry;
    if (!geometry) return setMessage(useCustomGeoJSON ? "Upload a GeoJSON first" : "Select a feature first");
    if (!dataset || !index) return setMessage("Select dataset and index");
    if (!fromYear || !toYear) return setMessage("Select from and to years");
    if (!validateDates()) return;
    setLoading(true);
    setMessage(null);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      const res = await fetch(`${BACKEND_URL}/gee_layers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dataset,
          index,
          startDate: `${fromYear}-${fromMonth || "01"}-${fromDay || "01"}`,
          endDate: `${toYear}-${toMonth || "12"}-${toDay || "31"}`,
          geometry,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
      if (!data.tiles && !data.mode_tiles) {
        throw new Error(`No tiles available for ${dataset} ${index}`);
      }
      addOverlayAndLegend(data, dataset);
      setMessage("Layer loaded successfully.");
    } catch (e) {
      setMessage(`Failed to visualize selection: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ⬇️ Download
  const handleDownloadClick = async () => {
    const geometry = useCustomGeoJSON ? customGeoJSON.geometry : selectedFeatureGeoJSON?.geometry;
    if (!geometry) return setMessage(useCustomGeoJSON ? "Upload a GeoJSON first" : "Select a feature first");
    if (!dataset || !index) return setMessage("Select dataset and index");
    if (!fromYear || !toYear) return setMessage("Select from and to years");
    if (!validateDates()) return;
    setLoading(true);
    try {
      // Determine selected feature name
      let selectedFeature = useCustomGeoJSON ? (customGeoJSON.properties?.name || "Custom") : (featureName || "Custom");
      // Sanitize feature name for filename
      selectedFeature = selectedFeature.replace(/[\s\/\\]/g, '_').replace(/[^a-zA-Z0-9_]/g, '');

      // Format dates for filename (dd_mm_yy)
      const startDay = fromDay || "01";
      const startMonth = fromMonth || "01";
      const startYear = fromYear.slice(-2);
      const endDay = toDay || "31";
      const endMonth = toMonth || "12";
      const endYear = toYear.slice(-2);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      const res = await fetch(`${BACKEND_URL}/download`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dataset,
          index,
          startDate: `${fromYear}-${startMonth}-${startDay}`,
          endDate: `${toYear}-${endMonth}-${endDay}`,
          geometry,
          selectedFeature,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || `Download failed: ${res.status}`);
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${dataset}_${index}_${startDay}_${startMonth}_${startYear}_to_${endDay}_${endMonth}_${endYear}_${selectedFeature}.tif`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setMessage("Download successful!");
    } catch (e) {
      setMessage(`Download failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    const map = mapRef.current;
    if (!map) return;
    if (overlayRef.current) map.removeLayer(overlayRef.current);
    if (legendRef.current) map.removeControl(legendRef.current);
    Object.values(boundaryLayersCache.current).forEach((l) => map.removeLayer(l));
    setDataset("");
    setIndex("");
    setAdminLevel("");
    setFeatureList([]);
    setFeatureName("");
    setSelectedFeatureGeoJSON(null);
    setMessage(null);
    setUseCustomGeoJSON(false);
    setCustomGeoJSON(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
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
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Boundary Mode:</label>
          <label className="flex items-center">
            <input
              type="radio"
              name="boundaryMode"
              value="ethiopia"
              checked={!useCustomGeoJSON}
              onChange={() => setUseCustomGeoJSON(false)}
              className="mr-1"
            />
            <span className="text-sm">Ethiopia Levels</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="boundaryMode"
              value="custom"
              checked={useCustomGeoJSON}
              onChange={() => setUseCustomGeoJSON(true)}
              className="mr-1"
            />
            <span className="text-sm">Upload GeoJSON</span>
          </label>
        </div>

        {useCustomGeoJSON && (
		  <div className="flex items-center gap-2">
			<input
			  type="file"
			  ref={fileInputRef}
			  onChange={handleFileUpload}
			  accept=".geojson,.json"
			  className="border p-2 rounded text-sm bg-blue-50 hover:bg-blue-100 cursor-pointer focus:ring-2 focus:ring-blue-500 w-50"
			  title="Upload GeoJSON file"
			/>
			{customGeoJSON && (
			  <span className="text-sm text-gray-600">
				{customGeoJSON.properties?.name || customGeoJSON.fileName}
			  </span>
			)}
		  </div>
		)}




        {!useCustomGeoJSON && (
          <>
            <select value={adminLevel} onChange={(e) => setAdminLevel(e.target.value)} className="border p-2 rounded w-36">
              <option value="">Admin level</option>
              <option value="adm1">Level 1 (Regions)</option>
              <option value="adm2">Level 2 (Zones)</option>
              <option value="adm3">Level 3 (Districts)</option>
            </select>

            <select value={featureName} onChange={(e) => setFeatureName(e.target.value)} className="border p-2 rounded w-40">
              <option value="">Select feature</option>
              {featureList.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </>
        )}
		        <select value={dataset} onChange={(e) => setDataset(e.target.value)} className="border p-2 rounded w-32">
          <option value="">Dataset</option>
          {Object.entries(DATASET_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>

        <select value={index} onChange={(e) => setIndex(e.target.value)} className="border p-2 rounded w-30">
          <option value="">Variable</option>
          {indexOptions.map((o) => (
            <option key={o.v} value={o.v}>{o.t}</option>
          ))}
        </select>
      </div>

      {/* Dates */}
      <div className="flex gap-6 mb-3">
        {[
          { label: "From", y: fromYear, m: fromMonth, d: fromDay, setY: setFromYear, setM: setFromMonth, setD: setFromDay },
          { label: "To", y: toYear, m: toMonth, d: toDay, setY: setToYear, setM: setToMonth, setD: setToDay },
        ].map(({ label, y, m, d, setY, setM, setD }) => (
          <div key={label}>
            <div className="font-semibold mb-1">{label}</div>
            <div className="flex gap-2">
              <select value={y} onChange={(e) => setY(e.target.value)} className="border p-2 rounded w-20">
                <option value="">Year</option>
                {yearOptions.map((yr) => (
                  <option key={yr} value={yr}>{yr}</option>
                ))}
              </select>
              <select value={m} onChange={(e) => setM(e.target.value)} className="border p-2 rounded w-24">
                <option value="">Month</option>
                {monthOptions.map((mo) => (
                  <option key={mo.value} value={mo.value}>{mo.label}</option>
                ))}
              </select>
              <select value={d} onChange={(e) => setD(e.target.value)} className="border p-2 rounded w-18">
                <option value="">Day</option>
                {dayOptionsFor(y, m).map((dd) => (
                  <option key={dd} value={dd}>{dd}</option>
                ))}
              </select>
            </div>
          </div>
        ))}
      </div>

      {/* Buttons */}
      <div className="flex gap-3">
        <button onClick={handleViewSelection} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700" disabled={loading}>
          View Selection
        </button>
        <button onClick={handleDownloadClick} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700" disabled={loading}>
          Download Selection
        </button>
        <button onClick={handleReset} className="bg-gray-300 text-black px-4 py-2 rounded hover:bg-gray-400">
          Reset Map
        </button>
      </div>

      {message && (
        <div className={`border p-3 rounded mt-3 ${message.includes("success") || message.includes("loaded") ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
          <b className={`${message.includes("success") || message.includes("loaded") ? "text-green-800" : "text-red-800"}`}>{message}</b>
        </div>
      )}
    </div>
  );
}
