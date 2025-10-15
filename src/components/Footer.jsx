import React from "react";
import {
  FaYoutube,
  FaXTwitter,
  FaInstagram,
  FaLinkedin,
  FaGithub,
} from "react-icons/fa6";

export default function Footer() {
  return (
    <footer className="bg-gray-800 text-gray-300 py-10 px-6 md:px-12 border-t border-gray-700">
      <div className="max-w-full mx-auto flex flex-col md:flex-row items-center justify-between gap-8">

        {/* Left Section */}
        <div className="text-center md:text-left space-y-1">
          <div className="text-sm">
            © {new Date().getFullYear()}{" "}
            <span className="font-semibold text-white">Ethiopia GeoSpatial Hub</span>
          </div>
          <div className="text-xs text-gray-400">All rights reserved</div>
          <div className="text-xs text-gray-400 mt-1">
            Contact:{" "}
            <a
              href="mailto:admin@ethiosathub.com"
              className="text-gray-300 hover:text-green-400 transition-colors"
            >
              admin@ethiosathub.com
            </a>
          </div>
        </div>

        {/* Center Section */}
        <div className="text-center">
          <h3 className="text-white font-semibold text-lg mb-1">
            Remote Sensing & Environmental Consultancy - Ethiopia
          </h3>
          <p className="text-gray-400 text-sm">
            Empowering data-driven environmental decisions
          </p>
        </div>

        {/* Right Section */}
        <div className="text-center md:text-right space-y-3">
          <h4 className="font-semibold text-white text-base">Follow Us</h4>
          <div className="flex gap-4 justify-center md:justify-end">
            <a
              href="https://youtube.com"
              target="_blank"
              rel="noreferrer"
              className="hover:text-red-500 transform transition duration-300 hover:scale-125"
            >
              <FaYoutube className="w-6 h-6" />
            </a>

            <a
              href="https://twitter.com"
              target="_blank"
              rel="noreferrer"
              className="hover:text-sky-400 transform transition duration-300 hover:scale-125"
            >
              <FaXTwitter className="w-6 h-6" />
            </a>

            <a
              href="https://instagram.com"
              target="_blank"
              rel="noreferrer"
              className="hover:text-pink-500 transform transition duration-300 hover:scale-125"
            >
              <FaInstagram className="w-6 h-6" />
            </a>

            <a
              href="https://linkedin.com"
              target="_blank"
              rel="noreferrer"
              className="hover:text-blue-500 transform transition duration-300 hover:scale-125"
            >
              <FaLinkedin className="w-6 h-6" />
            </a>

            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="hover:text-gray-100 transform transition duration-300 hover:scale-125"
            >
              <FaGithub className="w-6 h-6" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
