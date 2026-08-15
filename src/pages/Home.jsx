import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

export default function Home() {
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const heroImages = [
    { src: "/images/img.png", alt: "Sentinel-2 NDVI — Vegetation Health", label: "Sentinel-2 NDVI" },
    { src: "/images/img1.png", alt: "Dynamic World Land Cover Map", label: "Land Cover" },
    { src: "/images/img2.png", alt: "Environmental Monitoring Output", label: "Environmental Monitoring" },
  ];

  const datasets = [
    { name: "Sentinel-2", res: "10m", desc: "High-resolution multispectral imagery" },
    { name: "Landsat", res: "30m", desc: "Long-term historical archive since 1984" },
    { name: "MODIS", res: "250m", desc: "Daily global surface reflectance" },
    { name: "Dynamic World", res: "10m", desc: "Near real-time land cover classification" },
    { name: "CHIRPS", res: "5.5km", desc: "Precipitation & drought indicators (SPI)" },
    { name: "MODIS LST", res: "500m", desc: "Land surface temperature & VHI" },
  ];

  const indices = [
    "NDVI", "EVI", "SAVI", "NDWI", "NBR", "NDBI",
    "NDMI", "NDSI", "BSI", "SPI", "VHI", "Land Cover"
  ];

  return (
    <div style={{ fontFamily: "'Georgia', serif", color: "#1a1a1a" }}>

      {/* ── HERO ── */}
      <section style={{
        position: "relative",
        minHeight: "92vh",
        display: "flex",
        alignItems: "center",
        overflow: "hidden",
        background: "#0a1628",
      }}>
        {/* Background image */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: `url(${heroImages[activeImage].src})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          transition: "background-image 0.8s ease",
          filter: "brightness(0.35)",
        }} />

        {/* Subtle grid overlay */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }} />

        {/* Content */}
        <div style={{
          position: "relative", zIndex: 10,
          maxWidth: 900, margin: "0 auto",
          padding: "0 2rem", textAlign: "center",
        }}>
          <div style={{
            display: "inline-block",
            background: "rgba(34,197,94,0.15)",
            border: "1px solid rgba(34,197,94,0.4)",
            borderRadius: 999,
            padding: "6px 18px",
            fontSize: 13,
            color: "#86efac",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginBottom: 28,
          }}>
            Earth Observation Platform
          </div>

          <h1 style={{
            fontSize: "clamp(3rem, 8vw, 6rem)",
            fontWeight: 700,
            color: "#ffffff",
            lineHeight: 1.1,
            marginBottom: 12,
            letterSpacing: "-0.02em",
          }}>
            Hwasat
          </h1>

          <p style={{
            fontSize: "clamp(1rem, 2.5vw, 1.4rem)",
            color: "#94a3b8",
            maxWidth: 640,
            margin: "0 auto 16px",
            lineHeight: 1.7,
            fontStyle: "italic",
          }}>
            Geosense
          </p>

          <p style={{
            fontSize: "clamp(1rem, 2vw, 1.25rem)",
            color: "#cbd5e1",
            maxWidth: 680,
            margin: "0 auto 40px",
            lineHeight: 1.8,
          }}>
            Visualize and download satellite-derived vegetation indices,
            drought indicators, and land cover maps — directly in your browser,
            no GIS expertise required.
          </p>

          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            <Link to="/maps" style={{
              background: "#16a34a",
              color: "#fff",
              padding: "14px 36px",
              borderRadius: 8,
              fontSize: "1.05rem",
              fontWeight: 600,
              textDecoration: "none",
              fontFamily: "sans-serif",
              transition: "background 0.2s",
            }}
              onMouseEnter={e => e.target.style.background = "#15803d"}
              onMouseLeave={e => e.target.style.background = "#16a34a"}
            >
              Launch Dashboard →
            </Link>
            <Link to="/data" style={{
              background: "transparent",
              color: "#e2e8f0",
              padding: "14px 36px",
              borderRadius: 8,
              fontSize: "1.05rem",
              fontWeight: 600,
              textDecoration: "none",
              border: "1px solid rgba(255,255,255,0.25)",
              fontFamily: "sans-serif",
            }}>
              Browse Data
            </Link>
          </div>

          {/* Image selector */}
          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 48 }}>
            {heroImages.map((img, i) => (
              <button key={i} onClick={() => setActiveImage(i)} style={{
                background: i === activeImage ? "rgba(34,197,94,0.8)" : "rgba(255,255,255,0.2)",
                border: "none",
                borderRadius: 999,
                padding: "6px 16px",
                fontSize: 12,
                color: "#fff",
                cursor: "pointer",
                fontFamily: "sans-serif",
                letterSpacing: "0.05em",
                transition: "background 0.2s",
              }}>
                {img.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <section style={{
        background: "#f8fafc",
        borderBottom: "1px solid #e2e8f0",
        padding: "28px 2rem",
      }}>
        <div style={{
          maxWidth: 900, margin: "0 auto",
          display: "flex", justifyContent: "space-around",
          flexWrap: "wrap", gap: 24, textAlign: "center",
          fontFamily: "sans-serif",
        }}>
          {[
            { value: "6", label: "Satellite Datasets" },
            { value: "25+", label: "Vegetation Indices" },
            { value: "1984", label: "Historical Archive Since" },
            { value: "10m", label: "Finest Resolution" },
          ].map((stat, i) => (
            <div key={i}>
              <div style={{ fontSize: "2rem", fontWeight: 700, color: "#16a34a" }}>{stat.value}</div>
              <div style={{ fontSize: "0.85rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em" }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── WHO IS IT FOR ── */}
      <section style={{ maxWidth: 900, margin: "80px auto", padding: "0 2rem", textAlign: "center" }}>
        <p style={{ fontSize: 13, color: "#16a34a", textTransform: "uppercase", letterSpacing: "0.12em", fontFamily: "sans-serif", marginBottom: 12 }}>Who is it for</p>
        <h2 style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)", fontWeight: 700, color: "#0f172a", marginBottom: 20, lineHeight: 1.2 }}>
          Built for researchers, academics,<br />and environmental professionals
        </h2>
        <p style={{ fontSize: "1.1rem", color: "#475569", lineHeight: 1.8, maxWidth: 700, margin: "0 auto 56px", fontFamily: "sans-serif" }}>
          Hwasat removes the technical barrier between satellite data archives
          and the people who need them most; enabling faster research,
          better decision-making, and deeper environmental insight.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 24 }}>
          {[
            { icon: "🎓", title: "Researchers & Academics", desc: "Download analysis-ready GeoTIFFs for peer-reviewed studies without complex preprocessing pipelines." },
            { icon: "🌍", title: "Environmental Agencies", desc: "Monitor vegetation health, drought stress, and land cover change across Ethiopia and beyond." },
            { icon: "🌾", title: "Agricultural Planners", desc: "Track crop conditions, soil moisture, and seasonal vegetation patterns at field scale." },
            { icon: "🏛️", title: "Policy & Development", desc: "Access standardized environmental indicators to support evidence-based decision making." },
          ].map((card, i) => (
            <div key={i} style={{
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: 12,
              padding: "28px 24px",
              textAlign: "left",
              fontFamily: "sans-serif",
            }}>
              <div style={{ fontSize: "2rem", marginBottom: 12 }}>{card.icon}</div>
              <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>{card.title}</h3>
              <p style={{ fontSize: "0.9rem", color: "#64748b", lineHeight: 1.7 }}>{card.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── DATASETS ── */}
      <section style={{ background: "#0f172a", padding: "80px 2rem" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <p style={{ fontSize: 13, color: "#86efac", textTransform: "uppercase", letterSpacing: "0.12em", fontFamily: "sans-serif", marginBottom: 12, textAlign: "center" }}>Data Sources</p>
          <h2 style={{ fontSize: "clamp(1.8rem, 4vw, 2.4rem)", fontWeight: 700, color: "#f8fafc", marginBottom: 48, textAlign: "center", lineHeight: 1.2 }}>
            Powered by world-class<br />satellite missions
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
            {datasets.map((d, i) => (
              <div key={i} style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 10,
                padding: "20px 24px",
                fontFamily: "sans-serif",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontWeight: 700, color: "#f1f5f9", fontSize: "1rem" }}>{d.name}</span>
                  <span style={{ background: "rgba(34,197,94,0.15)", color: "#86efac", fontSize: 11, padding: "2px 10px", borderRadius: 999, border: "1px solid rgba(34,197,94,0.3)" }}>{d.res}</span>
                </div>
                <p style={{ fontSize: "0.85rem", color: "#94a3b8", lineHeight: 1.6 }}>{d.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── INDICES ── */}
      <section style={{ maxWidth: 900, margin: "80px auto", padding: "0 2rem", textAlign: "center" }}>
        <p style={{ fontSize: 13, color: "#16a34a", textTransform: "uppercase", letterSpacing: "0.12em", fontFamily: "sans-serif", marginBottom: 12 }}>Available Products</p>
        <h2 style={{ fontSize: "clamp(1.8rem, 4vw, 2.4rem)", fontWeight: 700, color: "#0f172a", marginBottom: 40, lineHeight: 1.2 }}>
          25+ spectral indices and<br />environmental indicators
        </h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
          {indices.map((idx, i) => (
            <span key={i} style={{
              background: "#f1f5f9",
              border: "1px solid #e2e8f0",
              borderRadius: 999,
              padding: "8px 20px",
              fontSize: "0.9rem",
              color: "#334155",
              fontFamily: "sans-serif",
              fontWeight: 500,
            }}>{idx}</span>
          ))}
          <span style={{
            background: "#dcfce7",
            border: "1px solid #86efac",
            borderRadius: 999,
            padding: "8px 20px",
            fontSize: "0.9rem",
            color: "#15803d",
            fontFamily: "sans-serif",
            fontWeight: 500,
          }}>+ many more</span>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{
        background: "linear-gradient(135deg, #14532d 0%, #166534 50%, #15803d 100%)",
        padding: "80px 2rem",
        textAlign: "center",
      }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)", fontWeight: 700, color: "#fff", marginBottom: 20, lineHeight: 1.2 }}>
            Start exploring satellite data today
          </h2>
          <p style={{ fontSize: "1.1rem", color: "#bbf7d0", marginBottom: 40, lineHeight: 1.8, fontFamily: "sans-serif" }}>
            No account required. Select your area of interest, choose a dataset,
            and visualize or download analysis-ready geospatial data in minutes.
          </p>
          <Link to="/maps" style={{
            background: "#fff",
            color: "#15803d",
            padding: "16px 48px",
            borderRadius: 8,
            fontSize: "1.1rem",
            fontWeight: 700,
            textDecoration: "none",
            fontFamily: "sans-serif",
            display: "inline-block",
          }}>
            Launch Dashboard →
          </Link>
        </div>
      </section>
    </div>
  );
}
