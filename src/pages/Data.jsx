import React, { useEffect } from "react";

export default function Data() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="bg-white min-h-screen font-[Inter] text-gray-800">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 w-full bg-white/80 backdrop-blur-lg border-b border-gray-200 shadow-sm z-50">
      </nav>

      {/* Page Content */}
      <div className="pt-6 max-w-6xl mx-auto px-4">
        <h2 className="text-3xl font-bold text-green-700 mb-6 border-b border-gray-200 pb-2">
          Administrative Boundary Datasets of Ethiopia
        </h2>

        <p className="mb-6">
          This section provides <b>administrative boundary datasets of Ethiopia</b> in
          Shapefile, GeoJSON, and GeoPackage formats. The datasets are organized into
          different administrative levels:
        </p>

        <ul className="list-disc pl-6 mb-6 space-y-1">
          <li>
            <b>Level 0</b> – National boundary of Ethiopia
          </li>
          <li>
            <b>Level 1</b> – Regional boundaries
          </li>
          <li>
            <b>Level 2</b> – Zonal boundaries
          </li>
          <li>
            <b>Level 3</b> – Woreda (district) boundaries
          </li>
        </ul>

        <p className="mb-4">Each dataset is available in two coordinate reference systems:</p>
        <ul className="list-disc pl-6 mb-8 space-y-1">
          <li>
            <b>Geographic Coordinate System (GCS)</b>: EPSG:4326 – WGS 84
          </li>
          <li>
            <b>Projected Coordinate System (PCS)</b>: EPSG:32637 – WGS 84 / UTM Zone 37N
          </li>
        </ul>

        {/* Descriptions */}
        <div className="space-y-8 mb-10">
          <div>
            <h3 className="text-2xl font-semibold text-green-700 mb-2">
              Shapefile Format (Zipped)
            </h3>
            <p className="text-gray-700">
              Shapefile is one of the most widely used vector formats in GIS. It consists
              of multiple files (.shp, .shx, .dbf, .prj, etc.), so here they are provided
              as .zip archives for easy download. Shapefiles are widely supported by GIS
              software and commonly used.
            </p>
          </div>

          <div>
            <h3 className="text-2xl font-semibold text-green-700 mb-2">
              GeoPackage Format
            </h3>
            <p className="text-gray-700">
              GeoPackage (GPKG) is an open, efficient format that combines vector and
              raster geographic data into a single file. It is compatible with modern GIS
              tools, including QGIS, ArcGIS, and GDAL. Its standardized design ensures
              reliable data sharing and compatibility with current and emerging GIS
              technologies, making it an excellent choice for long-term use.
            </p>
          </div>

          <div>
            <h3 className="text-2xl font-semibold text-green-700 mb-2">
              GeoJSON Format
            </h3>
            <p className="text-gray-700">
              GeoJSON is a lightweight, JSON-based format designed for representing
              geographic data. It is particularly well-suited for web mapping, APIs, and
              browser-based visualizations. GeoJSON supports various data types, including
              geometries, features, and collections, making it versatile for online and
              interactive applications.
            </p>
          </div>
        </div>

        <p className="italic mb-4">Click the links below to download the data:</p>

        {/* Download Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {/* Shapefile */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 hover:shadow-md transition">
            <h4 className="text-lg font-semibold text-green-700 mb-3">
              Shapefile (Zipped)
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h5 className="font-medium mb-2 text-gray-800">GCS (EPSG:4326)</h5>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  <li>
                    <a href="data/ethiopia_admin_level_0_gcs.zip" target="_blank" className="text-green-600 hover:underline">Admin Level 0</a>
                  </li>
                  <li>
                    <a href="data/ethiopia_admin_level_1_gcs.zip" target="_blank" className="text-green-600 hover:underline">Admin Level 1</a>
                  </li>
                  <li>
                    <a href="data/ethiopia_admin_level_2_gcs.zip" target="_blank" className="text-green-600 hover:underline">Admin Level 2</a>
                  </li>
                  <li>
                    <a href="data/ethiopia_admin_level_3_gcs.zip" target="_blank" className="text-green-600 hover:underline">Admin Level 3</a>
                  </li>
                </ul>
              </div>
              <div>
                <h5 className="font-medium mb-2 text-gray-800">PCS (EPSG:32637)</h5>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  <li><a href="data/ethiopia_admin_level_0_pcs.zip" target="_blank" className="text-green-600 hover:underline">Admin Level 0</a></li>
                  <li><a href="data/ethiopia_admin_level_1_pcs.zip" target="_blank" className="text-green-600 hover:underline">Admin Level 1</a></li>
                  <li><a href="data/ethiopia_admin_level_2_pcs.zip" target="_blank" className="text-green-600 hover:underline">Admin Level 2</a></li>
                  <li><a href="dataethiopia_admin_level_3_pcs.zip" target="_blank" className="text-green-600 hover:underline">Admin Level 3</a></li>
                </ul>
              </div>
            </div>
          </div>

          {/* GeoPackage */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 hover:shadow-md transition">
            <h4 className="text-lg font-semibold text-green-700 mb-3">GeoPackage</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h5 className="font-medium mb-2 text-gray-800">GCS (EPSG:4326)</h5>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  <li><a href="data/ethiopia_admin_level_0_gcs.gpkg" target="_blank" className="text-green-600 hover:underline">Admin Level 0</a></li>
                  <li><a href="data/ethiopia_admin_level_1_gcs.gpkg" target="_blank" className="text-green-600 hover:underline">Admin Level 1</a></li>
                  <li><a href="data/ethiopia_admin_level_2_gcs.gpkg" target="_blank" className="text-green-600 hover:underline">Admin Level 2</a></li>
                  <li><a href="data/ethiopia_admin_level_3_gcs.gpkg" target="_blank" className="text-green-600 hover:underline">Admin Level 3</a></li>
                </ul>
              </div>
              <div>
                <h5 className="font-medium mb-2 text-gray-800">PCS (EPSG:32637)</h5>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  <li><a href="data/ethiopia_admin_level_0_pcs.gpkg" target="_blank" className="text-green-600 hover:underline">Admin Level 0</a></li>
                  <li><a href="data/ethiopia_admin_level_1_pcs.gpkg" target="_blank" className="text-green-600 hover:underline">Admin Level 1</a></li>
                  <li><a href="data/ethiopia_admin_level_2_pcs.gpkg" target="_blank" className="text-green-600 hover:underline">Admin Level 2</a></li>
                  <li><a href="data/ethiopia_admin_level_3_pcs.gpkg" target="_blank" className="text-green-600 hover:underline">Admin Level 3</a></li>
                </ul>
              </div>
            </div>
          </div>

          {/* GeoJSON */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 hover:shadow-md transition">
            <h4 className="text-lg font-semibold text-green-700 mb-3">GeoJSON</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h5 className="font-medium mb-2 text-gray-800">GCS (EPSG:4326)</h5>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  <li><a href="data/ethiopia_admin_level_0_gcs.geojson" download target="_blank" className="text-green-600 hover:underline">Admin Level 0</a></li>
                  <li><a href="data/ethiopia_admin_level_1_gcs.geojson" download target="_blank" className="text-green-600 hover:underline">Admin Level 1</a></li>
                  <li><a href="data/ethiopia_admin_level_2_gcs.geojson" download target="_blank" className="text-green-600 hover:underline">Admin Level 2</a></li>
                  <li><a href="data/ethiopia_admin_level_3_gcs_simplified.geojson" download target="_blank" className="text-green-600 hover:underline">Admin Level 3</a></li>
                </ul>
              </div>
              <div>
                <h5 className="font-medium mb-2 text-gray-800">PCS (EPSG:32637)</h5>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  <li><a href="data/ethiopia_admin_level_0_pcs.geojson" target="_blank" className="text-green-600 hover:underline">Admin Level 0</a></li>
                  <li><a href="data/ethiopia_admin_level_1_pcs.geojson" target="_blank" className="text-green-600 hover:underline">Admin Level 1</a></li>
                  <li><a href="data/ethiopia_admin_level_2_pcs.geojson" target="_blank" className="text-green-600 hover:underline">Admin Level 2</a></li>
                  <li><a href="data/ethiopia_admin_level_3_pcs_simplified.geojson" target="_blank" className="text-green-600 hover:underline">Admin Level 3</a></li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Source */}
        <hr className="my-8 border-gray-300" />
        <div className="text-sm text-gray-700 mb-8">
          <p>
            <b>Data Source:</b>{" "}
            <a
              href="https://data.humdata.org/dataset/cod-ab-eth"
              target="_blank"
              className="text-green-600 hover:underline"
            >
              Humanitarian Data Exchange (HDX)
            </a>{" "}
            Processed and published by{" "}
            <a
              href="https://ethiosathub.com"
              target="_blank"
              className="text-green-600 hover:underline"
            >
              EGSH
            </a>.
          </p>
        </div>
      </div>
    </div>
  );
}
