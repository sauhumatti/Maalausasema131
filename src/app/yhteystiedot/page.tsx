export default function Contact() {
  return (
    <div className="min-h-screen bg-white">
      <div className="container-custom">
        <h1 className="text-4xl font-bold mb-12 text-center text-gray-900">Yhteystiedot</h1>

        <div className="grid md:grid-cols-2 gap-12 max-w-6xl mx-auto">
          {/* Column 1: Contact Info & Hours */}
          <div>
            {/* Contact Information */}
            <div className="mb-10">
              <h2 className="text-3xl font-semibold mb-4 text-gray-900">Maalausasema 131</h2>
              <address className="not-italic space-y-2 text-lg">
                <p>Rantavainionpiha 6</p>
                <p>Ulvila 28400</p>
                <p>Suomi</p>
              </address>

              <div className="mt-8 space-y-4">
                <div>
                  <strong className="block mb-1">Puhelin:</strong>
                  <a 
                    href="tel:0440778896" 
                    className="text-gray-700 hover:text-black font-medium text-lg"
                  >
                    0440 778896
                  </a>
                </div>
                
                <div>
                  <strong className="block mb-1">Sähköposti:</strong>
                  <a 
                    href="mailto:maalausasema@131.fi"
                    className="text-gray-700 hover:text-black font-medium text-lg"
                  >
                    maalausasema@131.fi
                  </a>
                </div>
              </div>
            </div>

            {/* Opening Hours */}
            <div className="mb-10">
              <h3 className="text-2xl font-semibold mb-4 text-gray-900">Aukioloajat</h3>
              <div className="space-y-2 text-lg">
                <div className="flex justify-between">
                  <span>Maanantai - Perjantai:</span>
                  <span className="font-medium">7:00 - 15:30</span>
                </div>
                <div className="flex justify-between">
                  <span>Lauantai - Sunnuntai:</span>
                  <span className="font-medium">Suljettu</span>
                </div>
              </div>
            </div>

            {/* Quote Request Box */}
            <div className="mt-8 p-6 bg-gray-100 rounded-lg">
              <h3 className="text-xl font-semibold mb-3">Tarjouspyyntö</h3>
              <p className="text-gray-700">
                Lähetä meille tarjouspyyntö sähköpostilla tai soita. 
                Kerro meille projektistasi, niin autamme sinua löytämään 
                parhaan ratkaisun tarpeisiisi.
              </p>
            </div>
          </div>

          {/* Column 2: Map & Directions */}
          <div>
            <div className="h-[400px] md:h-[500px] bg-gray-200 rounded-lg overflow-hidden shadow-md mb-8">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1912.5!2d22.1234!3d61.4321!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNjHCsDI1JzU1LjYiTiAyMsKwMDcnNDQuNCJF!5e0!3m2!1sfi!2sfi!4v1234567890!5m2!1sfi!2sfi"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Maalausasema 131 Sijainti"
              ></iframe>
            </div>

            <div>
              <h3 className="text-2xl font-semibold mb-3 text-gray-900">Ajo-ohjeet</h3>
              <p className="text-lg text-gray-700">
                Maalausasema 131 sijaitsee Ulvilassa, Rantavainionpihassa.
                Löydät meidät helposti seuraamalla opasteita Ulvilan keskustasta.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}