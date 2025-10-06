import React, { useEffect } from 'react';

export default function About() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-green-50 text-gray-800">
      <div className="container mx-auto px-6 py-6">
        <h1 className="text-3xl font-bold text-green-700 mb-6 border-b border-gray-200 pb-2">About EthioSatHub</h1>
        <p className="text-lg leading-relaxed mb-6">
          <strong>EthioSatHub</strong> is a modern platform for accessing, analyzing, and visualizing 
          satellite-based environmental and agricultural data across Ethiopia.  
        </p>
        <p className="text-lg leading-relaxed mb-6">
          Our mission is to empower researchers, policymakers, and students with tools 
          that bring Earth Observation data closer to decision-making. The platform integrates 
          datasets such as canopy height, NDVI, land cover, and climate layers using 
          <span className="text-green-700 font-semibold"> Leaflet</span>, 
          <span className="text-green-700 font-semibold"> Sentinel</span>, and 
          <span className="text-green-700 font-semibold"> Landsat</span> sources.
        </p>
        <p className="text-lg leading-relaxed">
          This project is developed in collaboration with the 
          <span className="font-semibold text-green-700"> Tigray Bureau of Agriculture and Rural Development</span> 
          to support sustainable resource management and agricultural monitoring.
        </p>
      </div>
    </div>
  );
}
