import React from "react";
import { Link } from "react-router-dom";
import { FaYoutube, FaXTwitter, FaLinkedin } from "react-icons/fa6";

export default function Footer() {
  return (
    <footer style={{
      background: "#0f172a",
      borderTop: "1px solid #1e293b",
      fontFamily: "sans-serif",
    }}>
      <div style={{
        maxWidth: 1200, margin: "0 auto",
        padding: "40px 24px 24px",
      }}>

        {/* ── Main row ── */}
        <div style={{
          display: "flex", flexWrap: "wrap",
          gap: 40, justifyContent: "space-between",
          marginBottom: 32,
        }}>

         {/* Brand */}
          <div style={{ minWidth: 200, maxWidth: 280 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <img src="images/logo.png" alt="Hwasat Geosense" style={{ height: 32, width: "auto" }} />
              <span style={{ fontWeight: 700, fontSize: 15, color: "#f1f5f9" }}>
                Hwasat <span style={{ fontWeight: 400, color: "#64748b" }}>Geosense</span>
              </span>
            </div>
            <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.7, margin: 0 }}>
              Satellite-derived environmental data made accessible for researchers,
              agencies, and decision-makers.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#16a34a", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14 }}>
              Platform
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { to: "/", label: "Home" },
                { to: "/maps", label: "Dashboard" },
                { to: "/data", label: "Data Portal" },
                { to: "/about", label: "About" },
              ].map(l => (
                <Link key={l.to} to={l.to} style={{ fontSize: 13, color: "#94a3b8", textDecoration: "none", transition: "color 0.15s" }}
                  onMouseEnter={e => e.target.style.color = "#e2e8f0"}
                  onMouseLeave={e => e.target.style.color = "#94a3b8"}>
                  {l.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Data sources */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#16a34a", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14 }}>
              Data Sources
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {["Sentinel-2", "Landsat", "MODIS", "Dynamic World", "CHIRPS"].map(s => (
                <span key={s} style={{ fontSize: 13, color: "#64748b" }}>{s}</span>
              ))}
            </div>
          </div>

          {/* Contact & Social */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#16a34a", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14 }}>
              Contact
            </div>
            <a href="mailto:admin@hwasat.com" style={{ fontSize: 13, color: "#94a3b8", textDecoration: "none", display: "block", marginBottom: 20, transition: "color 0.15s" }}
              onMouseEnter={e => e.target.style.color = "#4ade80"}
              onMouseLeave={e => e.target.style.color = "#94a3b8"}>
              admin@hwasat.com
            </a>

            <div style={{ fontSize: 11, fontWeight: 700, color: "#16a34a", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>
              Follow Us
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              {[
                { href: "https://www.youtube.com/@hwasat", icon: <FaYoutube size={18} />, hover: "#ef4444" },
                { href: "https://x.com/Hwa_Sat", icon: <FaXTwitter size={18} />, hover: "#38bdf8" },
                { href: "http://www.linkedin.com/in/haftomhagos", icon: <FaLinkedin size={18} />, hover: "#60a5fa" },
              ].map(({ href, icon, hover }, i) => (
                <a key={i} href={href} target="_blank" rel="noreferrer"
                  style={{ color: "#64748b", transition: "color 0.2s, transform 0.2s", display: "flex" }}
                  onMouseEnter={e => { e.currentTarget.style.color = hover; e.currentTarget.style.transform = "scale(1.2)"; }}
                  onMouseLeave={e => { e.currentTarget.style.color = "#64748b"; e.currentTarget.style.transform = "scale(1)"; }}>
                  {icon}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* ── Bottom bar ── */}
        <div style={{
          borderTop: "1px solid #1e293b",
          paddingTop: 20,
          display: "flex", flexWrap: "wrap",
          justifyContent: "space-between", alignItems: "center",
          gap: 12,
        }}>
          <span style={{ fontSize: 12, color: "#475569" }}>
            © 2025–{new Date().getFullYear()} Hwasat Geosense · Kassel, Germany · All rights reserved
          </span>
          <span style={{ fontSize: 12, color: "#334155" }}>
            Backed by Google for Startups · Powered by Google Earth Engine · ESA Copernicus · NASA
          </span>
        </div>

      </div>
    </footer>
  );
}
