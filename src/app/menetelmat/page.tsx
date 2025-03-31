import Image from 'next/image';

export default function Methods() {
  return (
    <div className="min-h-screen bg-white">
      <div className="container-custom">
        <h1 className="text-4xl font-bold mb-12 text-center text-gray-900">Menetelmät</h1>

        <div className="space-y-16"> {/* Add space between sections */}
          
          {/* Section 1: Hiekkapuhallus (Image Right) */}
          <section className="grid md:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div className="prose max-w-none md:order-1"> {/* Text first on mobile, left on desktop */}
              <h2 className="text-3xl font-semibold mb-4">Hiekkapuhallus</h2>
              <p>
                Hiekkapuhallus on tehokas menetelmä vanhan maalin tai ruosteen poistamiseen
                metallipinnoilta. Käytämme nykyaikaisia laitteita ja materiaaleja varmistaaksemme
                parhaan mahdollisen lopputuloksen.
              </p>
            </div>
            <div className="md:order-2"> {/* Image second on mobile, right on desktop */}
              <Image
                src="/images/cd75baa4d4e7c4fa6dae91afb4f80fe1_400x400-ts1667912985596b.jpg"
                alt="Hiekkapuhallus prosessi"
                width={800}
                height={500}
                className="rounded-lg shadow-lg w-full h-auto object-cover" // Ensure image responsiveness
              />
            </div>
          </section>

          {/* Section 2: Märkämaalaus (Image Left) */}
          <section className="grid md:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div className="md:order-1"> {/* Image first on mobile and desktop */}
              <Image
                src="/images/ee803590b854c4131b09e41f7f04620c-ts1667912986596b.jpg"
                alt="Märkämaalaus prosessi"
                width={800}
                height={500}
                className="rounded-lg shadow-lg w-full h-auto object-cover"
              />
            </div>
            <div className="prose max-w-none md:order-2"> {/* Text second on mobile and desktop */}
              <h2 className="text-3xl font-semibold mb-4">Märkämaalaus</h2>
              <p>
                Erikoisalamme on metalliosien märkämaalaus. Käytämme korkealaatuisia
                maaleja ja nykyaikaisia menetelmiä taataksemme kestävän ja tasaisen
                lopputuloksen. Maalaamme:
              </p>
              <ul className="list-disc list-inside space-y-1"> {/* Improved list styling */}
                <li>Raskaan kuljetuskaluston osat</li>
                <li>Teollisuuskoneiden komponentit</li>
                <li>Maatalouskoneiden osat</li>
                <li>Muut metalliosat ja -rakenteet</li>
              </ul>
            </div>
          </section>

          {/* Section 3: Laadunvarmistus (Text Only) */}
          <section className="max-w-3xl mx-auto text-center"> {/* Centered text block */}
            <h2 className="text-3xl font-semibold mb-6">Laadunvarmistus</h2>
            <div className="prose max-w-none">
              <p>
                Jokainen työvaihe suoritetaan tarkasti laatustandardiemme mukaisesti.
                Valvomme maalipinnan paksuutta ja laatua jatkuvasti varmistaaksemme
                parhaan mahdollisen lopputuloksen.
              </p>
              <p>
                Käytämme vain korkealaatuisia materiaaleja ja nykyaikaisia laitteita
                varmistaaksemme, että lopputulos vastaa asiakkaan vaatimuksia ja kestää
                käytössä pitkään.
              </p>
            </div>
          </section>

          {/* Contact Callout Box */}
          <div className="bg-gray-100 p-6 md:p-8 rounded-lg mt-12 max-w-3xl mx-auto">
            <h3 className="text-2xl font-semibold mb-4 text-center">Ota yhteyttä</h3>
            <p className="text-center mb-6">
              Kerro meille projektistasi, niin autamme sinua valitsemaan parhaan
              käsittelymenetelmän juuri sinun tarpeisiisi.
            </p>
            <div className="flex flex-col items-center space-y-2">
              <a
                href="tel:0440778896"
                className="text-gray-700 hover:text-black font-medium text-lg"
              >
                Puh: 0440 778896
              </a>
              <a
                href="mailto:maalausasema@131.fi"
                className="text-gray-700 hover:text-black font-medium text-lg"
              >
                maalausasema@131.fi
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}