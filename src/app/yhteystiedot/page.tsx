export default function Contact() {
  return (
    <div className="min-h-screen bg-white">
      <div className="container-custom">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-8 text-gray-900">Yhteystiedot</h1>

          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <div className="prose max-w-none">
                <h2>Maalausasema 131</h2>
                <address className="not-italic">
                  <p className="text-lg">
                    Rantavainionpiha 6<br />
                    Ulvila 28400<br />
                    Suomi
                  </p>
                  
                  <div className="mt-6 space-y-2">
                    <p>
                      <strong>Puhelin:</strong><br />
                      <a 
                        href="tel:0440778896" 
                        className="text-primary-500 hover:text-primary-700"
                      >
                        0440 778896
                      </a>
                    </p>
                    
                    <p>
                      <strong>Sähköposti:</strong><br />
                      <a 
                        href="mailto:maalausasema@131.fi"
                        className="text-primary-500 hover:text-primary-700"
                      >
                        maalausasema@131.fi
                      </a>
                    </p>
                  </div>
                </address>

                <div className="mt-8">
                  <h3 className="text-xl font-semibold mb-4">Aukioloajat</h3>
                  <table className="w-full">
                    <tbody>
                      <tr>
                        <td className="py-1">Maanantai - Perjantai</td>
                        <td className="py-1">7:00 - 15:30</td>
                      </tr>
                      <tr>
                        <td className="py-1">Lauantai - Sunnuntai</td>
                        <td className="py-1">Suljettu</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-8 p-6 bg-gray-100 rounded-lg">
                <h3 className="text-xl font-semibold mb-4">Tarjouspyyntö</h3>
                <p>
                  Lähetä meille tarjouspyyntö sähköpostilla tai soita. 
                  Kerro meille projektistasi, niin autamme sinua löytämään 
                  parhaan ratkaisun tarpeisiisi.
                </p>
              </div>
            </div>

            <div>
              <div className="h-[400px] bg-gray-200 rounded-lg overflow-hidden">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1912.5!2d22.1234!3d61.4321!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNjHCsDI1JzU1LjYiTiAyMsKwMDcnNDQuNCJF!5e0!3m2!1sfi!2sfi!4v1234567890!5m2!1sfi!2sfi"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                ></iframe>
              </div>

              <div className="mt-8">
                <h3 className="text-xl font-semibold mb-4">Ajo-ohjeet</h3>
                <p>
                  Maalausasema 131 sijaitsee Ulvilassa, Rantavainionpihassa. 
                  Löydät meidät helposti seuraamalla opasteita Ulvilan keskustasta.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}