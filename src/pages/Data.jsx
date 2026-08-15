import React, { useEffect, useState } from "react";

const COUNTRIES = [
  { key: "burundi",   label: "Burundi",     pcs: "EPSG:32736", levels: ["0","1","2"] },
  { key: "djibouti",  label: "Djibouti",    pcs: "EPSG:32638", levels: ["0","1","2"] },
  { key: "eritrea",   label: "Eritrea",     pcs: "EPSG:32637", levels: ["0","1","2"] },
  { key: "ethiopia",  label: "Ethiopia",    pcs: "EPSG:32637", levels: ["0","1","2", "3"] },
  { key: "kenya",     label: "Kenya",       pcs: "EPSG:32737", levels: ["0","1","2"] },
  { key: "rwanda",    label: "Rwanda",      pcs: "EPSG:32736", levels: ["0","1","2", "3"] },
  { key: "somalia",   label: "Somalia",     pcs: "EPSG:32638", levels: ["0","1","2", "3"] },
  { key: "s_sudan",   label: "South Sudan", pcs: "EPSG:32636", levels: ["0","1","2"] },
  { key: "sudan",     label: "Sudan",       pcs: "EPSG:32636", levels: ["0","1","2"] },
  { key: "tanzania",  label: "Tanzania",    pcs: "EPSG:32737", levels: ["0","1","2", "3"] },
  { key: "uganda",    label: "Uganda",      pcs: "EPSG:32636", levels: ["0","1","2", "3"] },
];

function getPath(countryKey, level, crs, ext) {
  return "/data/" + countryKey + "/" + countryKey + "_level_" + level + "_" + crs + "." + ext;
}

export default function Data() {
  const [selectedKey, setSelectedKey] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const country = COUNTRIES.find(function(c) { return c.key === selectedKey; }) || null;

  const handleBack = function() {
  setSelectedKey(null);
};

  return (
    <div className="bg-white min-h-screen font-[Inter] text-gray-800">
      <nav className="fixed top-0 left-0 w-full bg-white/80 backdrop-blur-lg border-b border-gray-200 shadow-sm z-50"></nav>

      <div className="pt-6 max-w-6xl mx-auto px-4">
        <h2 className="text-3xl font-bold text-green-700 mb-6 border-b border-gray-200 pb-2">
          Administrative Boundary Datasets of East Africa
        </h2>

        <p className="mb-6">
          This section provides <b>administrative boundary datasets</b> for 11 East
          African countries in Shapefile, GeoJSON, and GeoPackage formats. The
          datasets are organized into different administrative levels:
        </p>

        <ul className="pl-0 mb-6 space-y-1">
          <li><b>Level 0</b> – National boundary</li>
          <li><b>Level 1</b> – First-level administrative boundaries</li>
          <li><b>Level 2</b> – Second-level administrative boundaries</li>
		  <li><b>Level 3</b> – Third-level administrative boundaries</li>
        </ul>

        <p className="mb-4">Each dataset is available in two coordinate reference systems:</p>
        <ul className="list-disc pl-6 mb-8 space-y-1">
          <li><b>Geographic Coordinate System (GCS)</b>: EPSG:4326 – WGS 84</li>
          <li><b>Projected Coordinate System (PCS)</b>: Country-specific UTM projection</li>
        </ul>

        <div className="space-y-8 mb-10">
          <div>
            <h3 className="text-2xl font-semibold text-green-700 mb-2">Shapefile Format (Zipped)</h3>
            <p className="text-gray-700">
              Shapefile is one of the most widely used vector formats in GIS. It consists of
              multiple files (.shp, .shx, .dbf, .prj, etc.), provided here as .zip archives
              for easy download. Widely supported by GIS software and commonly used.
            </p>
          </div>
          <div>
            <h3 className="text-2xl font-semibold text-green-700 mb-2">GeoPackage Format</h3>
            <p className="text-gray-700">
              GeoPackage (GPKG) is an open, efficient format that combines vector and raster
              data in a single file. Compatible with QGIS, ArcGIS, and GDAL — ideal for
              reliable and long-term data sharing.
            </p>
          </div>
          <div>
            <h3 className="text-2xl font-semibold text-green-700 mb-2">GeoJSON Format</h3>
            <p className="text-gray-700">
              GeoJSON is a lightweight JSON-based format, perfect for web mapping and APIs.
              It supports geometries, features, and collections — a great choice for
              interactive and browser-based applications.
            </p>
          </div>
        </div>

        <p className="italic mb-4">
          {country ? "Click the boxes below to download the data:" : "Select a country to access its downloadable boundary data:"}
        </p>

        {!country && (
		  <div id="country-grid" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-12">
            {COUNTRIES.map(function(c) {
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={function() { setSelectedKey(c.key); }}
                  className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 text-center text-green-700 font-semibold hover:shadow-md hover:bg-green-50 hover:border-green-400 transition"
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        )}

        {country && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
              <h3 className="text-2xl font-bold text-green-700">{country.label}</h3>
              <button
                type="button"
                onClick={handleBack}
                className="inline-flex items-center justify-center bg-gray-100 border border-gray-200 rounded-lg px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 transition"
              >
                ← Back to countries
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">

              {/* Shapefile */}
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 hover:shadow-md transition">
                <h4 className="text-lg font-semibold text-green-700 mb-3 text-center">Shapefile (Zipped)</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h5 className="font-medium mb-2 text-gray-800 text-center">GCS (EPSG:4326)</h5>
                    <div className="flex flex-col gap-2">
                      {country.levels.map(function(level) {
                        return (
                          <a key={"zip-gcs-" + level} href={getPath(country.key, level, "gcs", "zip")} target="_blank" rel="noreferrer"
                            className="block bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-center text-green-700 hover:bg-green-100 hover:border-green-400 transition">
                            Level {level}
                          </a>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <h5 className="font-medium mb-2 text-gray-800 text-center">{"PCS (" + country.pcs + ")"}</h5>
                    <div className="flex flex-col gap-2">
                      {country.levels.map(function(level) {
                        return (
                          <a key={"zip-pcs-" + level} href={getPath(country.key, level, "pcs", "zip")} target="_blank" rel="noreferrer"
                            className="block bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-center text-green-700 hover:bg-green-100 hover:border-green-400 transition">
                            Level {level}
                          </a>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>



              {/* GeoJSON */}
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 hover:shadow-md transition">
                <h4 className="text-lg font-semibold text-green-700 mb-3 text-center">GeoJSON</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h5 className="font-medium mb-2 text-gray-800 text-center">GCS (EPSG:4326)</h5>
                    <div className="flex flex-col gap-2">
                      {country.levels.map(function(level) {
                        return (
						  <a key={"geojson-gcs-" + level} href={getPath(country.key, level, "gcs", "geojson")} download
                            className="block bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-center text-green-700 hover:bg-green-100 hover:border-green-400 transition">
                            Level {level}
                          </a>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <h5 className="font-medium mb-2 text-gray-800 text-center">{"PCS (" + country.pcs + ")"}</h5>
                    <div className="flex flex-col gap-2">
                      {country.levels.map(function(level) {
                        return (
						  <a key={"geojson-pcs-" + level} href={getPath(country.key, level, "pcs", "geojson")} download
                            className="block bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-center text-green-700 hover:bg-green-100 hover:border-green-400 transition">
                            Level {level}
                          </a>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
			  
			                {/* GeoPackage */}
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 hover:shadow-md transition">
                <h4 className="text-lg font-semibold text-green-700 mb-3 text-center">GeoPackage</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h5 className="font-medium mb-2 text-gray-800 text-center">GCS (EPSG:4326)</h5>
                    <div className="flex flex-col gap-2">
                      {country.levels.map(function(level) {
                        return (
                          <a key={"gpkg-gcs-" + level} href={getPath(country.key, level, "gcs", "gpkg")} target="_blank" rel="noreferrer"
                            className="block bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-center text-green-700 hover:bg-green-100 hover:border-green-400 transition">
                            Level {level}
                          </a>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <h5 className="font-medium mb-2 text-gray-800 text-center">{"PCS (" + country.pcs + ")"}</h5>
                    <div className="flex flex-col gap-2">
                      {country.levels.map(function(level) {
                        return (
                          <a key={"gpkg-pcs-" + level} href={getPath(country.key, level, "pcs", "gpkg")} target="_blank" rel="noreferrer"
                            className="block bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-center text-green-700 hover:bg-green-100 hover:border-green-400 transition">
                            Level {level}
                          </a>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        <hr className="my-8 border-gray-300" />
        <div className="text-sm text-gray-700 mb-8">
          <p>
            <b>Data Source:</b>{" "}
            <a href="https://data.humdata.org/dataset" target="_blank" rel="noreferrer" className="text-green-600 hover:underline">
              Humanitarian Data Exchange (HDX)
            </a>{" "}
            Processed and published by{" "}
            <a href="https://hwasat.com" target="_blank" rel="noreferrer" className="text-green-600 hover:underline">
              Hwasat
            </a>.
          </p>
        </div>
      </div>
    </div>
  );
}