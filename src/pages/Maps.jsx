import React, { useEffect } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export default function Maps() {
  useEffect(() => {
    window.scrollTo(0, 0);

    const map = L.map("map", {
      center: [9.145, 40.489673],
      zoom: 6,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    const populateDropdown = (selectId, values) => {
      const select = document.getElementById(selectId);
      if (select) {
        values.forEach((v) => {
          const opt = document.createElement("option");
          opt.value = v;
          opt.text = v;
          select.appendChild(opt);
        });
      }
    };

    const years = Array.from({ length: 15 }, (_, i) => 2010 + i);
    const months = Array.from({ length: 12 }, (_, i) => i + 1);
    const days = Array.from({ length: 31 }, (_, i) => i + 1);

    populateDropdown("fromYear", years);
    populateDropdown("toYear", years);
    populateDropdown("fromMonth", months);
    populateDropdown("toMonth", months);
    populateDropdown("fromDay", days);
    populateDropdown("toDay", days);

    return () => map.remove();
  }, []);

  return (
    <div className="max-w-none">
      {/* ====== Navbar ====== */}
      <nav className="navbars">
        <div className="nav-container"></div>
      </nav>

      {/* ====== Map Section ====== */}
      <div className="container mx-auto px-6 py-1">
        <div id="maps" className="tabcontent">
          {/* ====== Styled Title & Description ====== */}
          <h1 className="text-3xl font-bold text-green-700 mb-6 border-b border-gray-200 pb-2">
            Explore land cover and vegetation indices
          </h1>
          <p className="text-gray-600 text-base leading-relaxed mb-6 max-w-3xl">
            Select a dataset, time range, and administrative feature (or draw an area)
            to visualize and download. For larger areas or multiple satellite sources,
            please use the <span className="text-blue-600 font-medium">Vegetation Indices</span> app.
          </p>

          {/* ====== Map Container ====== */}
          <div
            className="map-container rounded-xl overflow-hidden shadow-md mb-6"
            style={{ height: "500px", width: "100%" }}
          >
            <div id="map" style={{ height: "100%", width: "100%" }}></div>
          </div>

          {/* ====== Filters Section ====== */}
          <div className="filters space-y-2">
            <div className="selects-row flex flex-wrap gap-4 mb-3">
              <select id="datasetSelect" className="border p-2 rounded">
                <option value="">Select dataset</option>
                <option value="landcover">Land cover</option>
                <option value="sentinel2">Sentinel-2</option>
                <option value="landsat">Landsat (4–8)</option>
                <option value="modis">MODIS</option>
                <option value="climate">Climate</option>
              </select>

              <select id="indexSelect" className="border p-2 rounded">
                <option value="">Select sub dataset</option>
              </select>

              <select id="adminLevel" defaultValue="adm3" className="border p-2 rounded">
                <option value="">Select admin level</option>
                <option value="adm1">Level 1 (Regions)</option>
                <option value="adm2">Level 2 (Zones)</option>
                <option value="adm3">Level 3 (Districts)</option>
              </select>

              <select id="featureSelect" className="border p-2 rounded">
                <option value="">Choose feature</option>
              </select>
            </div>
          </div>

          {/* ====== Time Range Section ====== */}
          <div className="time-range flex flex-wrap gap-6 mb-4">
            <div>
              <strong>From:</strong>{" "}
              <select id="fromYear" className="border p-2 rounded mx-1"></select>
              <select id="fromMonth" className="border p-2 rounded mx-1"></select>
              <select id="fromDay" className="border p-2 rounded mx-1"></select>
            </div>
            <div>
              <strong>To:</strong>{" "}
              <select id="toYear" className="border p-2 rounded mx-1"></select>
              <select id="toMonth" className="border p-2 rounded mx-1"></select>
              <select id="toDay" className="border p-2 rounded mx-1"></select>
            </div>
          </div>

          {/* ====== Buttons ====== */}
          <div className="button-container flex gap-4 mb-4">
            <button
              id="viewSelectionBtn"
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              View Selection
            </button>
            <button
              id="downloadSelectionBtn"
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              Download Selection
            </button>
          </div>

          <div id="legend"></div>
        </div>
      </div>
    </div>
  );
}
