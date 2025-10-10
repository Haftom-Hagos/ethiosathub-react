// src/pages/Home.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

export default function Home() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const [selectedImage, setSelectedImage] = useState(null);

  const openImage = (src, alt) => {
    setSelectedImage({ src, alt });
  };

  const closeImage = () => {
    setSelectedImage(null);
  };

  return (
    <>
      <div className="space-y-12">
        {/* Landing / hero */}
        <section className="landing-page bg-white rounded-lg p-8 shadow-sm text-center">
          <h3 className="text-3xl font-bold mb-2">EGSH</h3>
          <p className="text-gray-700">
            Welcome to EthioSatHub! <br />
            Remote Sensing &amp; Environmental Consultancy — Ethiopia
          </p>
        </section>

        {/* Services / main */}
        <section className="main-page bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-4">
            We provide specialised consultancy services in remote sensing and GIS
            applications tailored to Ethiopia’s environmental challenges. Beyond
            our online tools, we support organisations, researchers, and
            policymakers with offline analysis services, including:
          </h2>

          <ul className="grid grid-cols-1 md:grid-cols-3 gap-6 list-none p-0">
            <li className="flex gap-4 items-start bg-gray-50 p-4 rounded-md">
              <img
                src="src/images/southern_tigray_lc_3d.png"
                alt="Supervised classification"
                width="100"
                height="100"
                className="w-24 h-24 object-cover rounded cursor-pointer hover:scale-105 transition-transform duration-200"
                onClick={() => openImage("src/images/southern_tigray_lc_3d.png", "Supervised classification")}
              />
              <div>
                <h3 className="font-semibold">Supervised classification</h3>
                <p className="text-sm text-gray-600">
                  using client-provided ground truth data
                </p>
              </div>
            </li>

            <li className="flex gap-4 items-start bg-gray-50 p-4 rounded-md">
              <img
                src="src/images/Humera.jpg"
                alt="MLB"
                width="100"
                height="100"
                className="w-24 h-24 object-cover rounded cursor-pointer hover:scale-105 transition-transform duration-200"
                onClick={() => openImage("src/images/Humera.jpg", "MLB")}
              />
              <div>
                <h3 className="font-semibold">MLB</h3>
                <p className="text-sm text-gray-600">
                  Machine learning–based environmental mapping
                </p>
              </div>
            </li>

            <li className="flex gap-4 items-start bg-gray-50 p-4 rounded-md">
              <img
                src="src/images/aa_stad_lidar_3d.png"
                alt="Ready-to-use outputs"
                width="100"
                height="100"
                className="w-24 h-24 object-cover rounded cursor-pointer hover:scale-105 transition-transform duration-200"
                onClick={() => openImage("src/images/aa_stad_lidar_3d.png", "Ready-to-use outputs")}
              />
              <div>
                <h3 className="font-semibold">Ready-to-use outputs</h3>
                <p className="text-sm text-gray-600">
                  such as high-resolution maps, statistics, and reports
                </p>
              </div>
            </li>
          </ul>
        </section>

        {/* Map / Downloadable maps */}
        <section className="bg-white p-6 rounded-lg shadow-sm">
          <div className="map flex flex-col md:flex-row items-center gap-6">
            <div className="flex-1">
              <h2 className="text-lg font-semibold mb-2">Downloadable Maps and Data</h2>
              <p className="text-gray-700 mb-4">
                Explore our collection of downloadable maps and datasets for
                Ethiopia. Access high-resolution satellite imagery, land cover
                maps, and environmental data to support your projects and research.
              </p>
              <Link
                to="/maps"
                className="inline-block bg-green-600 text-white px-4 py-2 rounded-md shadow-sm hover:bg-green-700"
              >
                Explore NDVI maps
              </Link>
            </div>

            <div className="map-image flex-1 text-center">
              <img
                src="src/images/eth.png"
                alt="Ethiopia map"
                width="200"
                height="200"
                className="mx-auto cursor-pointer hover:scale-105 transition-transform duration-200"
                onClick={() => openImage("src/images/eth.png", "Ethiopia map")}
              />
              <div className="mt-3">
                <Link
                  to="/maps"
                  className="inline-block px-4 py-2 border border-green-600 text-green-600 rounded-md hover:bg-green-50"
                >
                  Explore NDVI maps
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Data resources */}
        <section className="data bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold mb-2">Data Resources</h2>
          <p className="text-gray-700 mb-4">
            Access a variety of geospatial datasets relevant to Ethiopia. Our data
            resources include land use/land cover data, climate data, and other
            environmental datasets to aid in your analysis and decision-making.
          </p>
          <Link
            to="/data"
            className="inline-block bg-white border border-green-600 text-green-600 px-4 py-2 rounded-md hover:bg-green-50"
          >
            Explore Data resources
          </Link>
        </section>

        {/* Small footer block (page-specific) */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="footer-content grid md:grid-cols-2 gap-6">
            <div>
              <p className="text-gray-700">
                Whether you are a government agency, NGO, researcher, or private
                business, we are committed to transforming your data into accurate,
                actionable, and decision-ready solutions.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Contact us</h3>
              <div className="flex gap-3 flex-wrap">
                {/* If you add Font Awesome or Heroicons, replace these text links with icons */}
                <a href="https://facebook.com" target="_blank" rel="noreferrer" className="text-sm text-gray-600 hover:text-gray-900">Facebook</a>
                <a href="https://twitter.com" target="_blank" rel="noreferrer" className="text-sm text-gray-600 hover:text-gray-900">X / Twitter</a>
                <a href="https://instagram.com" target="_blank" rel="noreferrer" className="text-sm text-gray-600 hover:text-gray-900">Instagram</a>
                <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="text-sm text-gray-600 hover:text-gray-900">LinkedIn</a>
                <a href="https://github.com" target="_blank" rel="noreferrer" className="text-sm text-gray-600 hover:text-gray-900">GitHub</a>
              </div>
              <p className="mt-4 text-xs text-gray-500">© 2025 Ethiopia GeoSpatial Hub. All rights reserved.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Image Zoom Modal */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
          <div className="relative max-w-4xl max-h-full">
            <button
              onClick={closeImage}
              className="absolute -top-4 -right-4 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 z-10"
            >
              <span className="text-xl">&times;</span>
            </button>
            <img
              src={selectedImage.src}
              alt={selectedImage.alt}
              className="max-w-full max-h-[90vh] object-contain"
            />
          </div>
        </div>
      )}
    </>
  );
}