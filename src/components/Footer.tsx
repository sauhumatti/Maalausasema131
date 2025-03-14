export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="container-custom">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h2 className="text-2xl font-bold mb-4">Yhteystiedot</h2>
            <address className="not-italic">
              <p>Rantavainionpiha 6</p>
              <p>Ulvila 28400</p>
              <p>Suomi</p>
              <div className="mt-4">
                <p>
                  <a 
                    href="tel:0440778896" 
                    className="hover:text-gray-200 transition-colors"
                  >
                    Puh: 0440 778896
                  </a>
                </p>
                <p>
                  <a 
                    href="mailto:maalausasema@131.fi"
                    className="hover:text-gray-200 transition-colors"
                  >
                    maalausasema@131.fi
                  </a>
                </p>
              </div>
            </address>
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-4">Aukioloajat</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Maanantai - Perjantai</span>
                <span>7:00 - 15:30</span>
              </div>
              <div className="flex justify-between">
                <span>Lauantai - Sunnuntai</span>
                <span>Suljettu</span>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-gray-800 text-center text-sm text-gray-400">
          <p>&copy; {new Date().getFullYear()} Maalausasema 131. Kaikki oikeudet pidätetään.</p>
        </div>
      </div>
    </footer>
  );
}