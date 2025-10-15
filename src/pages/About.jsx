import React, { useEffect } from 'react';

export default function About() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-green-50 text-gray-800">
      <div className="container mx-auto px-6 py-6">
        <h1 className="text-3xl font-bold text-green-700 mb-6 border-b border-gray-200 pb-2">About EGSH</h1>
        <p className="text-lg leading-relaxed mb-6">
          <strong>EGSH</strong> is a modern platform for accessing, analyzing, and visualizing 
          satellite-based environmental and agricultural data across Ethiopia.  
        </p>
        <p className="text-lg leading-relaxed mb-6">
          Our mission is to empower researchers, policymakers, and students with tools 
          that bring Earth Observation data closer to decision-making. The platform integrates 
          datasets such as NDVI, EVI, NDWI, VHI, SPI, land cover, and climate layers using 
          <span className="text-green-700 font-semibold"> Sentinel-2</span>, 
          <span className="text-green-700 font-semibold"> Landsat</span>,
          <span className="text-green-700 font-semibold"> MODIS</span>, and
		  <span className="text-green-700 font-semibold"> CHIRPS</span> sources.
        </p>
		<p className="text-lg leading-relaxed">
		Our consultancy services are designed to turn satellite data into actionable insights for agriculture, 
		forestry, water resources, urban planning, and climate resilience projects. Whether you are a government 
		agency, non-governmental organization, researcher, or private business, we are committed to transforming 
		your data into accurate, actionable, and decision-ready solutions. Our datasets and tools are designed to 
		support effective planning, analysis, and visualization, helping you make informed decisions with confidence.
		 </p>
        {/*
		<p className="text-lg leading-relaxed">
          This project is developed in collaboration with the 
          <span className="font-semibold text-green-700"> Tigray Bureau of Agriculture and Rural Development</span> 
          to support sustainable resource management and agricultural monitoring.
        </p>
		*/}
      </div>
    </div>
  );
}
