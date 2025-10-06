import React from 'react'
import { NavLink } from 'react-router-dom'

const links = [
  { to: '/', label: 'Home' },
  { to: '/maps', label: 'Map Tools' },
  { to: '/data', label: 'Data Portal' },
  { to: '/gallery', label: 'Visual Gallery' },
  { to: '/about', label: 'About' }
]

export default function Navbar(){
  return (
    <header className="w-full bg-green-500 shadow sticky top-0 z-40">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-green-600 flex items-center justify-center text-white font-bold">ES</div>
          <div className="text-lg font-semibold">EthioSatHub</div>
        </div>
        <nav className="hidden md:flex gap-4 items-center">
          {links.map(l => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({isActive}) => 'px-3 py-2 rounded-md text-sm font-medium ' + (isActive ? 'bg-green-50 text-green-700' : 'text-gray-700 hover:bg-gray-100')}
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="md:hidden">
          {/* Mobile menu placeholder - keep minimal for now */}
          <NavLink to="/maps" className="px-3 py-2 rounded-md bg-green-600 text-white text-sm">Open Map</NavLink>
        </div>
      </div>
    </header>
  )
}