'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();

  const links = [
    { href: '/', text: 'Etusivu' },
    { href: '/menetelmat', text: 'Menetelmät' },
    { href: '/vanteiden-esikatselu', text: 'Vanteiden Esikatselu' },
    { href: '/tyonaytteet', text: 'Työnäytteet' },
    { href: '/yhteystiedot', text: 'Yhteystiedot' }
  ];

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Check if we're on the homepage or vanteiden-esikatselu to determine text color
  const isHomepage = pathname === '/';
  const isVanteidenEsikatselu = pathname === '/vanteiden-esikatselu';
  const shouldUseWhiteText = (isHomepage || isVanteidenEsikatselu) && !isScrolled;
  const textColorClass = shouldUseWhiteText ? 'text-white' : 'text-gray-700';
  const logoSrc = shouldUseWhiteText
    ? "/images/Maalausasema_131_weblogo_2_white-ts16679130453777.png"
    : "/images/cca0436b43e97276cc9f5da25d87ce24_391x60_0x0_394x60_crop3777.png";


  return (
    <nav className={`fixed w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-white shadow-md' : 'bg-primary-800'
      }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex justify-between items-center py-4">
          <div className="flex-shrink-0">
            <Link href="/" className="block">
              <Image
                src={logoSrc}
                alt="Maalausasema 131"
                width={196}
                height={30}
                priority
              />
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className={`inline-flex items-center justify-center p-2 rounded-md ${textColorClass} ${shouldUseWhiteText ? 'hover:text-gray-200' : 'hover:text-gray-500 hover:bg-gray-100'} focus:outline-none`}
              aria-expanded={isOpen}
            >
              <span className="sr-only">Avaa päävalikko</span>
              <svg
                className={`${isOpen ? 'hidden' : 'block'} h-6 w-6`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
              <svg
                className={`${isOpen ? 'block' : 'hidden'} h-6 w-6`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Desktop menu */}
          <div className="hidden md:flex md:items-center md:space-x-8">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-base font-medium transition-colors ${pathname === link.href
                    ? `text-primary font-semibold`
                    : `${textColorClass} hover:${shouldUseWhiteText ? 'text-white' : 'text-primary'}`
                  }`}
              >
                {link.text}
              </Link>
            ))}
          </div>
        </div>

        {/* Mobile menu */}
        <div
          className={`${isOpen ? 'block' : 'hidden'
            } md:hidden transition-all duration-300 ease-in-out`}
        >
          <div className="px-2 pt-2 pb-3 space-y-1 bg-white shadow-lg rounded-b-lg">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`block px-3 py-2 text-base font-medium rounded-md ${pathname === link.href
                    ? 'text-primary bg-gray-50'
                    : 'text-gray-700 hover:text-primary hover:bg-gray-50'
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