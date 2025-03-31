'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const links = [
    { href: '/', text: 'Etusivu' },
    { href: '/menetelmat', text: 'Menetelmät' },
    { href: '/vanteiden-esikatselu', text: 'Vanteiden Esikatselu' },
    { href: '/tyonaytteet', text: 'Työnäytteet' },
    { href: '/yhteystiedot', text: 'Yhteystiedot' }
  ];

  // Close mobile menu on path change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Always use white logo with dark background
  const logoSrc = "/images/logo131.png";


  return (
    <nav className="fixed w-full z-50 bg-gray-900 shadow-md h-12 overflow-hidden">
      <div className="container-custom !py-0 h-full">
        <div className="flex justify-between items-center h-full py-2">
          <div className="flex-shrink-0">
            <Link href="/" className="block">
              <Image
                src={logoSrc}
                alt="Maalausasema 131"
                width={144}
                height={32}
                className="h-8 w-36"
                priority
              />
            </Link>
          </div>

          {/* Mobile menu button */}
         <div className="md:hidden">
           <button
             onClick={() => setIsOpen(!isOpen)}
             className="inline-flex items-center justify-center p-2 rounded-md text-white hover:text-gray-300 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
             aria-expanded={isOpen}
           >
             <span className="sr-only">Avaa päävalikko</span>
             {/* Hamburger Icon */}
             <svg
               className={`${isOpen ? 'hidden' : 'block'} h-6 w-6`}
               xmlns="http://www.w3.org/2000/svg"
               fill="none"
               viewBox="0 0 24 24"
               stroke="currentColor"
             >
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
             </svg>
             {/* Close Icon */}
             <svg
               className={`${isOpen ? 'block' : 'hidden'} h-6 w-6`}
               xmlns="http://www.w3.org/2000/svg"
               fill="none"
               viewBox="0 0 24 24"
               stroke="currentColor"
             >
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
             </svg>
           </button>
         </div>

          {/* Desktop menu */}
          <div className="hidden md:flex md:items-center md:space-x-8">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-base font-medium text-white hover:text-gray-300 transition-colors ${
                  pathname === link.href ? 'font-semibold underline' : ''
                }`}
              >
                {link.text}
              </Link>
            ))}
          </div>
        </div>

        {/* Mobile menu */}
        <div
          className={`${isOpen ? 'block' : 'hidden'} md:hidden`}
        >
          <div className="px-2 pt-2 pb-3 space-y-1 bg-gray-800 border-t border-gray-700">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`block px-3 py-2 rounded-md text-base font-medium text-white hover:bg-gray-700 ${
                  pathname === link.href ? 'font-semibold underline' : ''
                }`}
                onClick={() => setIsOpen(false)}
              >
                {link.text}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}