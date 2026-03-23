import React, { useEffect, useRef, useState } from 'react';

function FadeIn({ children, delay = 0 }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.1 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(24px)",
      transition: `opacity 0.65s ease ${delay}ms, transform 0.65s ease ${delay}ms`,
    }}>
      {children}
    </div>
  );
}

const Divider = () => (
  <div style={{ width: 48, height: 3, background: "#22c55e", borderRadius: 2, margin: "16px 0 28px" }} />
);

const inputStyle = {
  background: "rgba(255,255,255,0.07)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 8, padding: "10px 14px", fontSize: 13,
  color: "#f1f5f9", fontFamily: "sans-serif", outline: "none", width: "100%",
  boxSizing: "border-box",
};

export default function About() {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  const [formData, setFormData] = useState({ name: "", email: "", message: "" });
  const [formStatus, setFormStatus] = useState(null); // null | "sending" | "sent" | "error"

  const handleSubmit = async () => {
    if (!formData.name || !formData.email || !formData.message) return;
    setFormStatus("sending");
    try {
      const res = await fetch("https://formspree.io/f/mlgpjjgl", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setFormStatus("sent");
        setFormData({ name: "", email: "", message: "" });
      } else {
        setFormStatus("error");
      }
    } catch {
      setFormStatus("error");
    }
  };

  return (
    <div style={{ fontFamily: "'Georgia', serif", background: "#ffffff", color: "#0f172a", minHeight: "100vh" }}>

      {/* ── Page header ── */}
      <div style={{ borderBottom: "1px solid #e2e8f0", padding: "64px 24px 56px", background: "#fff" }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <FadeIn>
            <span style={{
              fontSize: 11, fontWeight: 700, color: "#22c55e",
              textTransform: "uppercase", letterSpacing: "0.14em", fontFamily: "sans-serif",
            }}>
              Our Story
            </span>
            <h1 style={{
              fontSize: "clamp(30px, 5vw, 46px)", fontWeight: 700,
              color: "#0f172a", lineHeight: 1.2, margin: "12px 0 0",
            }}>
              Why we built{" "}
              <span style={{ color: "#22c55e" }}>Hwasat Geosense</span>
            </h1>
          </FadeIn>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "64px 24px 100px" }}>

        {/* ── Origin story ── */}
        <FadeIn delay={80}>
          <section style={{ marginBottom: 68 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: "#0f172a", margin: 0 }}>The problem we lived</h2>
            <Divider />
            <p style={{ fontSize: 17, lineHeight: 1.9, color: "#334155", margin: "0 0 20px", fontFamily: "sans-serif" }}>
              Many researchers working with satellite data, spent several hours writing Google Earth Engine scripts just to answer basic
              questions: What is the NDVI trend in this watershed? How has land cover changed
              over the past decade? Is this region experiencing drought stress?
            </p>
            <p style={{ fontSize: 17, lineHeight: 1.9, color: "#334155", margin: "0 0 20px", fontFamily: "sans-serif" }}>
              The data existed. The satellite archives were there free, global, and updated
              regularly. But accessing them required programming knowledge, or expensive GIS
              software. For researchers, agricultural planners, and government agencies
              across Ethiopia and the wider Africa, that barrier was simply too high.
            </p>
            <p style={{ fontSize: 17, lineHeight: 1.9, color: "#334155", margin: 0, fontFamily: "sans-serif" }}>
              Hwasat Geosense was founded in 2025 with a straightforward goal: removing the technical
              barrier. Build a platform where anyone, regardless of their technical
              background, can and get analysis-ready satellite intelligence in minutes.
            </p>
          </section>
        </FadeIn>

        {/* ── Pull quote ── */}
        <FadeIn delay={80}>
          <blockquote style={{
            borderLeft: "4px solid #22c55e", margin: "0 0 68px",
            padding: "22px 32px", background: "#f0fdf4", borderRadius: "0 12px 12px 0",
          }}>
            <p style={{ fontSize: 20, fontStyle: "italic", lineHeight: 1.75, color: "#166534", margin: 0, fontWeight: 500 }}>
              "Earth Observation data should not be locked behind expensive software licenses
              or technical barriers. The decision-makers who need it most are often the ones
              with the least access to it."
            </p>
            <cite style={{
              display: "block", marginTop: 14, fontSize: 13,
              color: "#16a34a", fontStyle: "normal", fontFamily: "sans-serif", fontWeight: 600,
            }}>
              — Haftom, Founder, Hwasat Geosense
            </cite>
          </blockquote>
        </FadeIn>

        {/* ── What we built ── */}
        <FadeIn delay={80}>
          <section style={{ marginBottom: 68 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: "#0f172a", margin: 0 }}>What we built</h2>
            <Divider />
            <p style={{ fontSize: 17, lineHeight: 1.9, color: "#334155", margin: "0 0 20px", fontFamily: "sans-serif" }}>
              Hwasat Geosense is a browser-based Earth Observation platform powered by
              Google Earth Engine. It integrates satellite data from Sentinel-2, Landsat,
              MODIS, CHIRPS, and Dynamic World; giving users access to over 25
              spectral indices and environmental layers including NDVI, EVI, NDWI, VHI,
              SPI, and Dynamic World land cover classification.
            </p>
            <p style={{ fontSize: 17, lineHeight: 1.9, color: "#334155", margin: "0 0 28px", fontFamily: "sans-serif" }}>
              Users in Ethiopia can select any administrative boundary, from regional down
              to district level, as their area of interest. Users anywhere in the world can
              upload a custom GeoJSON file or draw polygon manually and run the same analysis on any location. No
              software installation. No coding. No GIS license required.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {[
                "🗺️ Ethiopia admin boundaries built-in",
                "📤 Custom GeoJSON — works globally",
                "📈 Monthly, yearly & seasonal time series",
                "🔄 Land cover change detection",
                "⬇️ GeoTIFF export",
                "🌐 Powered by Google Earth Engine",
              ].map((item, i) => (
                <span key={i} style={{
                  background: "#f8fafc", border: "1px solid #e2e8f0",
                  borderRadius: 20, padding: "6px 14px",
                  fontSize: 13, fontFamily: "sans-serif", color: "#334155",
                }}>
                  {item}
                </span>
              ))}
            </div>
          </section>
        </FadeIn>

        {/* ── Who we serve ── */}
        <FadeIn delay={80}>
          <section style={{ marginBottom: 68 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: "#0f172a", margin: 0 }}>Who we serve</h2>
            <Divider />
            <p style={{ fontSize: 17, lineHeight: 1.9, color: "#334155", margin: "0 0 20px", fontFamily: "sans-serif" }}>
              While Hwasat works for any location globally, our primary focus is on
              researchers, agricultural planners, government agencies, and environmental
              organisations in Ethiopia and across the Africa where access to affordable, easy-to-use EO tools can directly support food security,
              natural resource management, and climate adaptation planning.
            </p>
            <p style={{ fontSize: 17, lineHeight: 1.9, color: "#334155", margin: 0, fontFamily: "sans-serif" }}>
              For organisations that require tailored analysis, system integration, or
              capacity building, Hwasat Geosense also offers professional services in
              satellite-based environmental monitoring, crop assessment, land cover mapping,
              and climate risk analysis; helping institutions extract maximum value from
              their Earth Observation investments.
            </p>
          </section>
        </FadeIn>

        {/* ── Team ── */}
        <FadeIn delay={80}>
          <section style={{ marginBottom: 68 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: "#0f172a", margin: 0 }}>The team</h2>
            <Divider />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>

              {/* Haftom */}
              <div style={{ border: "1px solid #e2e8f0", borderRadius: 14, padding: "28px 24px" }}>
                <img
                  src="/images/Haftom.jpg"
                  alt="Haftom H."
                  style={{ width: 48, height: 48, borderRadius: 12, objectFit: "cover", marginBottom: 16, display: "block" }}
                />
                <div style={{ fontWeight: 700, fontSize: 16, color: "#0f172a", marginBottom: 4 }}>Haftom H.</div>
                <div style={{
                  fontSize: 11, fontWeight: 700, color: "#22c55e",
                  textTransform: "uppercase", letterSpacing: "0.09em",
                  fontFamily: "sans-serif", marginBottom: 12,
                }}>Founder & Lead Developer</div>
                <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.7, margin: 0, fontFamily: "sans-serif" }}>
                  Geospatial analyst who designed and built Hwasat Geosense, combining Earth Observation expertise with modern web technologies 
                  to make satellite analysis accessible to all.
                </p>
              </div>

              {/* Dr. Haftu */}
              <div style={{ border: "1px solid #e2e8f0", borderRadius: 14, padding: "28px 24px" }}>
                <img
                  src="/images/Haftu.jpeg"
                  alt="Dr. Haftu Abrha"
                  style={{ width: 48, height: 48, borderRadius: 12, objectFit: "cover", marginBottom: 16, display: "block" }}
                />
                <div style={{ fontWeight: 700, fontSize: 16, color: "#0f172a", marginBottom: 4 }}>Dr. Haftu Abrha</div>
                <div style={{
                  fontSize: 11, fontWeight: 700, color: "#0891b2",
                  textTransform: "uppercase", letterSpacing: "0.09em",
                  fontFamily: "sans-serif", marginBottom: 12,
                }}>Associate Professor · Mekelle University</div>
                <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.7, margin: 0, fontFamily: "sans-serif" }}>
                  Lecturer at Mekelle University contributing academic expertise in climate
                  and environmental science to the platform's research direction.
                </p>
              </div>

            </div>
          </section>
        </FadeIn>

        {/* ── Partnership ── */}
        <FadeIn delay={80}>
          <section style={{ marginBottom: 68 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: "#0f172a", margin: 0 }}>Partnerships</h2>
            <Divider />
            <div style={{
              border: "1px solid #e2e8f0", borderRadius: 14,
              padding: "28px 32px", background: "#f8fafc",
              display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap",
            }}>
              <div style={{
                width: 52, height: 52, borderRadius: 12,
                background: "#fff", border: "1px solid #e2e8f0",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 26, flexShrink: 0,
              }}>🎓</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, color: "#0f172a", marginBottom: 6 }}>
                  Mekelle University
                </div>
                <p style={{ fontSize: 14, color: "#64748b", fontFamily: "sans-serif", lineHeight: 1.7, margin: 0 }}>
                  Ongoing academic collaboration supporting research integration and domain
                  expertise in remote sensing and environmental monitoring across the
                  Tigray region and beyond.
                </p>
		<div style={{ fontWeight: 700, fontSize: 16, color: "#0f172a", marginBottom: 6 }}>
                  Google for Startups
                </div>
		<p style={{ fontSize: 14, color: "#64748b", fontFamily: "sans-serif", lineHeight: 1.7, margin: 0 }}>
                  Hwasat Geosense is a recipient of the Google for Startups Cloud Program, 
		  recognizing our work in satellite-based environmental monitoring.
                </p>
              </div>
            </div>
          </section>
        </FadeIn>

        {/* ── CTA with contact form ── */}
        <FadeIn delay={80}>
          <div style={{
            background: "linear-gradient(135deg, #0f172a, #1e3a2f)",
            borderRadius: 16, padding: "44px",
            display: "flex", alignItems: "flex-start",
            justifyContent: "space-between", gap: 40, flexWrap: "wrap",
          }}>

            {/* Left */}
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{
                fontSize: 11, color: "#4ade80", fontFamily: "sans-serif",
                fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10,
              }}>
                📍 Kassel, Germany
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#f1f5f9", marginBottom: 8 }}>
                Building for Ethiopia and beyond
              </div>
              <div style={{ fontSize: 14, color: "#94a3b8", fontFamily: "sans-serif" }}>
                Get in touch to collaborate, partner, or learn more.
              </div>
            </div>

            {/* Right — contact form */}
            <div style={{ flex: 1, minWidth: 260 }}>
              {formStatus === "sent" ? (
                <div style={{
                  display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center",
                  padding: "32px 16px", textAlign: "center", gap: 12,
                }}>
                  <div style={{ fontSize: 36 }}>✅</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#4ade80", fontFamily: "sans-serif" }}>
                    Thank you for reaching out!
                  </div>
                  <div style={{ fontSize: 13, color: "#94a3b8", fontFamily: "sans-serif", lineHeight: 1.6 }}>
                    We will get back to you as soon as possible.
                  </div>
                  <button
                    onClick={() => setFormStatus(null)}
                    style={{
                      marginTop: 8, background: "none",
                      border: "1px solid rgba(255,255,255,0.15)",
                      borderRadius: 8, padding: "8px 18px", fontSize: 12,
                      color: "#94a3b8", fontFamily: "sans-serif", cursor: "pointer",
                    }}>
                    Send another message
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <input
                    type="text"
                    placeholder="Your name"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    style={inputStyle}
                  />
                  <input
                    type="email"
                    placeholder="Your email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    style={inputStyle}
                  />
                  <textarea
                    placeholder="Your message"
                    rows={4}
                    value={formData.message}
                    onChange={e => setFormData({ ...formData, message: e.target.value })}
                    style={{ ...inputStyle, resize: "vertical" }}
                  />
                  {formStatus === "error" && (
                    <div style={{ fontSize: 12, color: "#f87171", fontFamily: "sans-serif" }}>
                      Something went wrong. Please email admin@hwasat.com directly.
                    </div>
                  )}
                  <button
                    onClick={handleSubmit}
                    disabled={formStatus === "sending" || !formData.name || !formData.email || !formData.message}
                    style={{
                      background: formStatus === "sending" ? "#15803d" : "#22c55e",
                      color: "#fff", border: "none", borderRadius: 8,
                      padding: "11px 20px", fontSize: 13, fontFamily: "sans-serif",
                      fontWeight: 700,
                      cursor: (formStatus === "sending" || !formData.name || !formData.email || !formData.message)
                        ? "not-allowed" : "pointer",
                      opacity: (!formData.name || !formData.email || !formData.message) ? 0.5 : 1,
                      transition: "opacity 0.2s",
                    }}>
                    {formStatus === "sending" ? "Sending..." : "Send Message →"}
                  </button>
                </div>
              )}
            </div>

          </div>
        </FadeIn>

      </div>
    </div>
  );
}
