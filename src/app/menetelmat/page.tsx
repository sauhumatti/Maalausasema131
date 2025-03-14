import Image from 'next/image';

export default function Methods() {
  return (
    <div className="min-h-screen bg-white">
      <div className="container-custom">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-8 text-gray-900">Menetelmät</h1>
          
          <div className="prose max-w-none">
            <section className="mb-12">
              <h2>Hiekkapuhallus</h2>
              <p>
                Hiekkapuhallus on tehokas menetelmä vanhan maalin tai ruosteen poistamiseen 
                metallipinnoilta. Käytämme nykyaikaisia laitteita ja materiaaleja varmistaaksemme 
                parhaan mahdollisen lopputuloksen.
              </p>
              <div className="my-8">
                <Image
                  src="/images/cd75baa4d4e7c4fa6dae91afb4f80fe1_400x400-ts1667912985596b.jpg"
                  alt="Hiekkapuhallus prosessi"
                  width={800}
                  height={500}
                  className="rounded-lg shadow-lg"
                />
              </div>
            </section>

            <section className="mb-12">
              <h2>Märkämaalaus</h2>
              <p>
                Erikoisalamme on metalliosien märkämaalaus. Käytämme korkealaatuisia 
                maaleja ja nykyaikaisia menetelmiä taataksemme kestävän ja tasaisen 
                lopputuloksen. Maalaamme:
              </p>
              <ul>
                <li>Raskaan kuljetuskaluston osat</li>
                <li>Teollisuuskoneiden komponentit</li>
                <li>Maatalouskoneiden osat</li>
                <li>Muut metalliosat ja -rakenteet</li>
              </ul>
              <div className="my-8">
                <Image
                  src="/images/ee803590b854c4131b09e41f7f04620c-ts1667912986596b.jpg"
                  alt="Märkämaalaus prosessi"
                  width={800}
                  height={500}
                  className="rounded-lg shadow-lg"
                />
              </div>
            </section>

            <section className="mb-12">
              <h2>Laadunvarmistus</h2>
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
            </section>

            <div className="bg-gray-100 p-6 rounded-lg mt-8">
              <h3 className="text-xl font-semibold mb-4">Ota yhteyttä</h3>
              <p>
                Kerro meille projektistasi, niin autamme sinua valitsemaan parhaan 
                käsittelymenetelmän juuri sinun tarpeisiisi.
              </p>
              <div className="mt-4">
                <a 
                  href="tel:0440778896" 
                  className="text-primary-500 hover:text-primary-700"
                >
                  Puh: 0440 778896
                </a>
                <br />
                <a 
                  href="mailto:maalausasema@131.fi"
                  className="text-primary-500 hover:text-primary-700"
                >
                  maalausasema@131.fi
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}