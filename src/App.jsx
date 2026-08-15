import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import LoadingScreen from './components/LoadingScreen';

// Lazy-load pages (Maps is handled persistently inside Layout to preserve layers)
const Home = lazy(() => import('./pages/Home'));
const Monitoring = lazy(() => import('./pages/Monitoring'));
const Data = lazy(() => import('./pages/Data'));
const Gallery = lazy(() => import('./pages/Gallery'));
const About = lazy(() => import('./pages/About'));

export default function App() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route path='/' element={<Layout />}>
          <Route index element={<Home />} />
          {/* Maps is always mounted inside Layout — route just needs to match */}
          <Route path='maps' element={null} />
          <Route path='monitoring' element={<Monitoring />} />
          <Route path='data' element={<Data />} />
          <Route path='gallery' element={<Gallery />} />
          <Route path='about' element={<About />} />
        </Route>
      </Routes>
    </Suspense>
  );
}


