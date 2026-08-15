import React, { useState } from "react";
import { NavLink, Link } from "react-router-dom";

const links = [
  { to: "/", label: "Home" },
  { to: "/maps", label: "Dashboard" },
  { to: "/monitoring", label: "Monitoring" },
  { to: "/data", label: "Data Portal" },
  { to: "/about", label: "About" },

];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header style={{
      position: "sticky", top: 0, zIndex: 1000,
      background: "#ffffff",
      borderBottom: "1px solid #1e293b",
      boxShadow: "0 1px 12px rgba(0,0,0,0.4)",
      fontFamily: "sans-serif",
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 72px", height: 84,
      }}>

      {/* ── Logo ── */}
      <Link to="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
        <img src="images/logo.png" alt="Hwasat Geosense" style={{ height: 36, width: "auto" }} />
        <div>
          <span style={{ fontWeight: 700, fontSize: 22, color: "#0f172a", letterSpacing: "-0.01em" }}>
            Hwasat
          </span>
          <span style={{ fontWeight: 400, fontSize: 20, color: "#64748b", marginLeft: 6 }}>
            Geosense
          </span>
        </div>
      </Link>

        {/* ── Desktop Nav ── */}
        <nav style={{ display: "flex", alignItems: "center", gap: 12 }} className="desktop-nav">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} style={({ isActive }) => ({
              padding: "6px 14px",
              borderRadius: 6,
              fontSize: 15,
              fontWeight: 500,
              textDecoration: "none",
              transition: "all 0.15s",
              background: isActive ? "rgba(22,163,74,0.15)" : "transparent",
              color: isActive ? "#4ade80" : "#94a3b8",
              border: isActive ? "1px solid rgba(22,163,74,0.3)" : "1px solid transparent",
            })}>
              {l.label}
            </NavLink>
          ))}

          {/*<Link to="/maps" style={{
            marginLeft: 8,
            padding: "7px 16px",
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
            textDecoration: "none",
            background: "#16a34a",
            color: "#fff",
            transition: "background 0.15s",
          }}
            onMouseEnter={e => e.target.style.background = "#15803d"}
            onMouseLeave={e => e.target.style.background = "#16a34a"}
          >
            Launch →
          </Link>*/}
        </nav>

        {/* ── Hamburger (mobile) ── */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "#94a3b8", display: "none" }}
          className="mobile-menu-btn"
          aria-label="Toggle menu"
        >
          {menuOpen ? (
            <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12"/></svg>
          ) : (
            <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M4 8h16M4 16h16"/></svg>
          )}
        </button>
      </div>

      {/* ── Mobile Menu ── */}
      <div style={{
        overflow: "hidden",
        maxHeight: menuOpen ? 300 : 0,
        transition: "max-height 0.3s ease",
        background: "#0f172a",
        borderTop: menuOpen ? "1px solid #1e293b" : "none",
      }}>
        <nav style={{ display: "flex", flexDirection: "column", padding: "8px 16px 16px" }}>
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} onClick={() => setMenuOpen(false)}
              style={({ isActive }) => ({
                padding: "10px 12px", borderRadius: 6, fontSize: 16, fontWeight: 500,
                textDecoration: "none", marginTop: 4,
                background: isActive ? "rgba(22,163,74,0.12)" : "transparent",
                color: isActive ? "#4ade80" : "#94a3b8",
              })}>
              {l.label}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* ── Responsive styles ── */}
      <style>{`
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
        }
      `}</style>
    </header>
  );
}
