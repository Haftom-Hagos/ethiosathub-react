import React, { useEffect, useState } from "react";

export default function Gallery() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const [lightboxImage, setLightboxImage] = useState(null);
  const [expandedIndex, setExpandedIndex] = useState(null);

  const toggleRead = (index) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  const openLightbox = (src) => {
    setLightboxImage(src);
  };

  const closeLightbox = () => {
    setLightboxImage(null);
  };

  const galleryItems = [
    {
      img: "src/images/aa_lidar_3d.png",
      title: "3D Canopy Height Map - Addis Ababa",
      desc:
        "3D visualization of canopy height model for Addis Ababa.",
      more: `A 3D height map was created for a section of Addis Ababa by subtracting the Digital Terrain Model (DTM) from the Digital Surface Model (DSM), both derived from LiDAR point clouds...`
    },
    {
      img: "src/images/Mekelle_tree_patches.jpg",
      title: "Tree patches and green areas of Mekelle city",
      desc: "Urban trees play a vital role in regulating city temperatures, improving air quality, and enhancing residents’ well-being.",
      more:
        "This map visualizes trees taller than one meter along with other green areas in Mekelle city, Tigray, Ethiopia..."
    },
    {
      img: "src/images/3d_land_cover_addis_2023.png",
      title: "2023 Land Cover Classification for Addis Ababa",
      desc: "3D land cover maps offer a more realistic visualization of the study area.",
      more:
        "For 2023, the 3D land cover map of Addis Ababa shows that trees are largely confined to mountainous areas..."
    },
    {
      img: "src/images/Addis_roads.png",
      title: "Road network map of Addis Ababa",
      desc: "This map presents the road network of Addis Ababa, Ethiopia, generated using data from OpenStreetMap.",
      more:
        "Primary and major roads are depicted with greater width, emphasizing main transport arteries..."
    },
    {
      img: "src/images/Tigray_river.png",
      title: "3D River network of Tigray Region",
      desc: "This 3D elevation map of Tigray showcases the region’s rugged topography.",
      more:
        "The map highlights the intricate network of rivers that traverse the mountainous terrain..."
    },
    {
      img: "src/images/S_tigray_CH.png",
      title: "Canopy height model of Southern Tigray",
      desc: "Canopy height is a fundamental parameter for understanding forest structure and biomass production.",
      more:
        "This map presents a detailed canopy height model of Southern Tigray, Ethiopia..."
    },
    {
      img: "src/images/southern_tigray_lc_3d.png",
      title: "3D land cover map of Southern Tigray",
      desc: "Traditional land cover maps overlook terrain influence on cover patterns.",
      more:
        "The 2023 3D land cover map of Southern Tigray illustrates how terrain shapes land distribution..."
    },
    {
      img: "src/images/Centeral_Tigray_Vegetation_map.jpg",
      title: "Central Tigray Vegetation Cover",
      desc: "This map illustrates vegetation coverage in the Central Zone of Tigray.",
      more:
        "Pixels were initially clustered into five classes and reclassified into vegetated and non-vegetated areas..."
    }
  ];

  return (
    <div className="bg-white min-h-screen font-[Inter] text-gray-800">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 w-full bg-white/80 backdrop-blur-lg border-b border-gray-200 shadow-sm z-50">
      </nav>

      {/* Gallery Content */}
      <div className="pt-6 max-w-6xl mx-auto px-4">
        <h2 className="text-3xl font-bold text-green-700 mb-6 border-b border-gray-200 pb-2">Gallery</h2>
        <p className="text-gray-600 mb-10">
          Explore our collection of thematic and 3D maps from different parts of
          Ethiopia. Click an image to enlarge and learn more.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {galleryItems.map((item, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl shadow-md hover:shadow-lg transition p-3 border border-gray-100"
            >
              <img
                src={item.img}
                alt={item.title}
                className="rounded-xl w-full h-48 object-cover cursor-pointer"
                onClick={() => openLightbox(item.img)}
              />
              <div className="mt-3">
                <h3 className="text-lg font-semibold text-green-700">
                  {item.title}
                </h3>
                <p className="text-gray-700 text-sm">
                  {item.desc}
                  {expandedIndex === index && (
                    <span className="block mt-2 text-gray-600 text-sm">
                      {item.more}
                    </span>
                  )}
                </p>
                <button
                  onClick={() => toggleRead(index)}
                  className="mt-2 text-green-600 hover:underline text-sm font-medium"
                >
                  {expandedIndex === index ? "Show less" : "Read more"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      {lightboxImage && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
          onClick={closeLightbox}
        >
          <img
            src={lightboxImage}
            alt="Expanded view"
            className="max-h-[90vh] max-w-[90vw] rounded-lg shadow-lg"
          />
        </div>
      )}
    </div>
  );
}
