import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import { motion } from 'framer-motion';

export default function Layout() {
  const { pathname } = useLocation();
  const isHome = pathname === '/'; // detect home

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900">
      <Navbar />
      <motion.main
        className={`flex-1 ${isHome ? 'p-0 m-0 w-full' : 'container mx-auto px-4 pt-6 py-8'}`}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.35 }}
      >
        <Outlet />
      </motion.main>
      <Footer />
    </div>
  );
}
