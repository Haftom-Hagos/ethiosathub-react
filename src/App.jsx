import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import LoadingScreen from './components/LoadingScreen';

// Lazy-load pages
const Home = lazy(() => import('./pages/Home'));
const Maps = lazy(() => import('./pages/Maps'));
const Data = lazy(() => import('./pages/Data'));
const Gallery = lazy(() => import('./pages/Gallery'));
const About = lazy(() => import('./pages/About'));

export default function App() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route path='/' element={<Layout />}>
          <Route index element={<Home />} />
          <Route path='maps' element={<Maps />} />
          <Route path='data' element={<Data />} />
          <Route path='gallery' element={<Gallery />} />
          <Route path='about' element={<About />} />
        </Route>
      </Routes>
    </Suspense>
  );
}


