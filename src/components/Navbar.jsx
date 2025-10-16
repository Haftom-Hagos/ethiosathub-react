import React from 'react'
import { NavLink } from 'react-router-dom'

const links = [
  { to: '/', label: 'Home' },
  { to: '/maps', label: 'Map Tools' },
  { to: '/data', label: 'Data Portal' },
  { to: '/gallery', label: 'Gallery' },
  { to: '/about', label: 'About' }
]

export default function Navbar(){
  return (
    <header className="w-full shadow-lg sticky top-0 z-50">  {/* Bumped z-index */}
      <div className="w-full bg-gray-800 max-w-none px-4 md:px-6 lg:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-10 rounded-md bg-gray-400 flex items-center justify-center text-white font-bold">G</div>
          <div className="text-xl font-semibold text-white">Georica <br /> Environmental intelligence</div>  {/* Added text-white for logo */}
        </div>
        <nav className="hidden md:flex gap-4 items-center">  {/* Temporarily: remove 'hidden md:' to test */}
          {links.map(l => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({isActive}) => 
                `px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                  isActive ? 'bg-white text-gray-700' : 'text-white hover:bg-gray-500 hover:text-white'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
		{/*
		<div className="md:hidden">
          <NavLink to="/maps" className="px-3 py-2 rounded-md bg-green-600 text-white text-sm hover:bg-green-700 transition-colors">Open Map</NavLink>
        </div>
		*/}
      </div>
    </header>
  )
}
