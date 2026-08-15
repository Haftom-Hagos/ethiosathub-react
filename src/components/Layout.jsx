import React, { Suspense, lazy } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import LoadingScreen from './LoadingScreen';
import { motion } from 'framer-motion';

// Maps is lazy-loaded once and then kept permanently mounted so that
// Leaflet layers, drawn AOIs, and results-panel state survive navigation.
const Maps = lazy(() => import('../pages/Maps'));

// Module-level flag: once Maps has been shown, keep it in the DOM forever.
let mapsEverLoaded = false;

export default function Layout() {
  const { pathname } = useLocation();
  const isMaps = pathname === '/maps';
  const hideFooter = isMaps;
  const isHome = pathname === '/';

  // Mark Maps as needing to stay mounted from the first visit onward
  if (isMaps) mapsEverLoaded = true;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900">
      <Navbar />

      {/* ── Persistent Maps layer ───────────────────────────────────────── */}
      {/* Rendered once Maps has been visited; hidden (not unmounted) on    */}
      {/* other routes so all Leaflet state and drawn layers are preserved. */}
      {mapsEverLoaded && (
        <div style={{ display: isMaps ? 'block' : 'none', flex: '1 1 0%' }}>
          <Suspense fallback={<LoadingScreen />}>
            <Maps />
          </Suspense>
        </div>
      )}

      {/* ── Regular pages via Outlet ────────────────────────────────────── */}
      {!isMaps && (
        <motion.main
          className={`flex-1 ${isHome ? 'p-0 m-0 w-full' : 'container mx-auto px-4 pt-6 py-8'}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.35 }}
        >
          <Outlet />
        </motion.main>
      )}

      {!hideFooter && <Footer />}
    </div>
  );
}
