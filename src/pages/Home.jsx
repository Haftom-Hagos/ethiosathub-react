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
  
  const heroImages = [
  { src: "/images/Tigray_river.png", alt: "Hero slide 1" },
  { src: "/images/bg1.jpg", alt: "Hero slide 2" },
  { src: "/images/bg2.jpg", alt: "Hero slide 3" },
  { src: "/images/bg3.jpg", alt: "Hero slide 4" }, // Add your actual paths for images 4-6
  { src: "/images/bg.jpg", alt: "Hero slide 5" },
  { src: "/images/lands.jpg", alt: "Hero slide 6" },
  ];
  
  // Duplicate the array for seamless infinite loop
  const slides = [...heroImages, ...heroImages];

  return (
    <>
      <div className="space-y-12">
       {/* Landing / hero - Animated background with sliding images */}
	   <section className="landing-page relative overflow-hidden text-center w-screen left-1/2 right-1/2 -ml-[50vw] -mr-[50vw]">
		  {/* Full-width image slider as background */}
		  <div className="image-slider absolute inset-y-0 left-0"> {/* Pin to top/bottom of section, let CSS width extend full */}
			<div className="slider-wrapper">
			  {slides.map((image, index) => (
				<div key={index} className="slide h-full">
				  <img 
					src={image.src} 
					alt={image.alt}
					className="w-full h-full object-cover"
				  />
				</div>
			  ))}
			</div>
		  </div>
		  
		  {/* Overlay text content - transparent box, just padding/rounded for subtle container; text shadows for readability */}
		  <div className="absolute inset-0 flex flex-col justify-center items-center z-10 h-full"> {/* Match full height */}
			<div className="px-2 py-4 rounded-lg"> {/* Fully transparent */}
			  <h3 className="text-8xl font-bold mb-2 drop-shadow-2xl text-white">GEORICA</h3> {/* Strong shadow for visibility */}
			  <p className="text-white drop-shadow-xl text-3xl">
				Welcome to Georica <br />
				Remote Sensing &amp; Environmental Consultancy — Ethiopia
			  </p>
			</div>
		  </div>
		</section>


		{/* Services / main */}
		<section className="main-page">
		  <h1 className="text-xl font-semibold mb-4">
			We provide specialised consultancy services in remote sensing and GIS
			applications tailored to Ethiopia’s environmental challenges. Beyond
			our online tools, we support organisations, researchers, and
			policymakers with offline analysis services, including:
		  </h1>

		  <ul className="main-services">
			<li>
			  <img
				src="/images/southern_tigray_lc_3d.png"
				alt="Supervised classification"
				onClick={() => openImage("/images/southern_tigray_lc_3d.png", "Supervised classification")}
			  />
			  <div className="text-overlay">
				<h3 className="font-semibold">Supervised classification</h3>
				<p className="text-sm">using client-provided ground truth data</p>
			  </div>
			</li>

			<li>
			  <img
				src="/images/Humera.jpg"
				alt="MLB"
				onClick={() => openImage("/images/Humera.jpg", "MLB")}
			  />
			  <div className="text-overlay">
				<h3 className="font-semibold">MLB</h3>
				<p className="text-sm">Machine learning–based environmental mapping</p>
			  </div>
			</li>

			<li>
			  <img
				src="/images/aa_stad_lidar_3d.png"
				alt="Ready-to-use outputs"
				onClick={() => openImage("/images/aa_stad_lidar_3d.png", "Ready-to-use outputs")}
			  />
			  <div className="text-overlay">
				<h3 className="font-semibold">Ready-to-use outputs</h3>
				<p className="text-sm">such as high-resolution maps, statistics, and reports</p>
			  </div>
			</li>
		  </ul>
		</section>

        {/* Map / Downloadable maps */}
        <section className="bg-gray-200 p-8 rounded-lg shadow-md flex justify-center">
		  <div className="map flex flex-col md:flex-row items-center gap-6 max-w-4xl">
			<div className="flex-1 text-center md:text-center">
			  <h2 className="text-3xl font-semibold mb-2 text-green-800">Visualize and download products </h2>
			  <p className="text-2xl text-gray-600 mb-4">
				Explore our our interactive dashboard for visualizing and downloading satellite derivied outputs. 
				Access a variety of geospatial datasets relevant to Ethiopia. Our data resources include Sentinel-2, 
				Landsat and MODIS derived vegetation indices, different drought indices and land cover maps to support your projects and research.
			  </p>
			  <Link
				to="/maps"
				className="inline-block bg-green-600 text-white px-4 py-2 rounded-md shadow-sm hover:bg-green-700"
			  >
				Explore Dashboard
			  </Link>
			</div>
				

            {/*
			<div className="map-image flex-1 text-center">
              <img
                src="/images/eth.png"
                alt="Ethiopia map"
                width="200"
                height="200"
                className="mx-auto cursor-pointer hover:scale-105 transition-transform duration-200"
                onClick={() => openImage("/images/eth.png", "Ethiopia map")}
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
			*/}
          </div>
        </section>

        {/* Data Resources */}
		<section className="flex justify-center bg-gray-200 p-8 rounded-lg shadow-md">
		  <div className="data flex flex-col items-center max-w-4xl text-center md:text-center">
			
			{/* Heading */}
			<h2 className="text-3xl font-semibold mb-2 text-green-800">
			  Data Resources
			</h2>
			
			{/* Description */}
			<p className="text-2xl text-gray-600 mb-4">
			  Access Ethiopia’s complete administrative boundary datasets, from national to district level, 
			  available in multiple formats (SHP, GPKG, GeoJSON) and coordinate systems (GCS and PCS).
			</p>
			
			{/* Button / Link */}
			<Link
			  to="/data"
			  className="inline-block bg-green-600 text-white px-4 py-2 rounded-md shadow-sm hover:bg-green-700 transition-colors"
			>
			  Explore Data Resources
			</Link>
		  </div>
		</section>


        {/* Small footer block (page-specific) */}
        <section className="flex justify-center bg-gray-50 p-8 rounded-lg shadow-md">
		  <div className="footer-content max-w-4xl text-center md:text-left">
			
			<p className="text-xl text-gray-600">
			  Whether you are a government agency, NGO, researcher, or private
			  business, we are committed to transforming your data into accurate,
			  actionable, and decision-ready solutions.
			</p>
			
		  </div>
		</section>
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
