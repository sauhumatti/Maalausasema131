import Image from 'next/image';
import Link from 'next/link';
import ImageGallery from '@/components/ImageGallery';

const galleryImages = [
  {
    src: '/images/cd75baa4d4e7c4fa6dae91afb4f80fe1_400x400-ts1667912985596b.jpg',
    alt: 'Maalausasema työnäyte 1'
  },
  {
    src: '/images/ee803590b854c4131b09e41f7f04620c-ts1667912986596b.jpg',
    alt: 'Maalausasema työnäyte 2'
  },
  {
    src: '/images/f8bacbe8513725331685eb351d92819b-ts1667912988596b.jpg',
    alt: 'Maalausasema työnäyte 3'
  }
];

export default function Home() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-b from-primary-800 to-primary-900 text-white py-24">
        <div className="container-custom">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <Image
                src="/images/Maalausasema_131_weblogo_2_white-ts16679130453777.png"
                alt="Maalausasema 131"
                width={394}
                height={60}
                priority
                className="mb-8"
              />
              <div className="prose prose-invert max-w-none">
                <p className="text-lg mb-4">
                  Maalausasema131 Oy on erikoistunut metalliosien märkämaalaukseen. 
                  Toimitamme asiakkaillemme laadukkaasti maalatut tuotteet sovitussa aikataulussa.
                </p>
                <p className="text-lg mb-4">
                  Hoidamme tuotteiden hiekkapuhalluksen ja maalauksen sovitulla menetelmillä.
                </p>
                <p className="text-lg mb-4">
                  Maalaamollamme on nykyaikaiset tilat ja laitteet. Maalaamme sekä pieniä, 
                  isoja tai suurempia kokonaisuuksia. Teollisuusmaalaamomme on erikoistunut 
                  pintakäsittelemään raskaan kuljetuskaluston sekä teollisuus- ja maatalouskoneiden 
                  osia ja komponentteja.
                </p>
              </div>
            </div>
            <div>
              <Image
                src="/images/etiusivukuva2-ts17076757563777.jpg"
                alt="Maalausasema työnäyte"
                width={600}
                height={400}
                className="rounded-lg shadow-xl"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* Vanteiden maalaus Hero Section */}
      <section className="py-24 bg-white">
        <div className="container-custom">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="order-2 md:order-1">
              <Image
                src="/images/131_asiakkaita-ts17076719179581.png"
                alt="Vanteiden maalaus"
                width={600}
                height={400}
                className="rounded-lg shadow-xl"
                priority
              />
            </div>
            <div className="order-1 md:order-2">
              <h2 className="text-3xl font-bold mb-6 text-primary-800">
                Vanteiden maalaus
              </h2>
              <div className="prose max-w-none">
                <p className="text-lg mb-4">
                  Tarjoamme ammattimaista vanteiden maalausta ja pintakäsittelyä.
                  Kokemuksemme ja nykyaikaiset laitteemme takaavat laadukkaan lopputuloksen.
                </p>
                <p className="text-lg mb-4">
                  Kaikki vanteemme käsitellään huolellisesti:
                </p>
                <ul className="list-disc ml-6 mb-6">
                  <li>Perusteellinen puhdistus ja esikäsittely</li>
                  <li>Ammattitaitoinen pintakäsittely</li>
                  <li>Kestävä ja tyylikäs lopputulos</li>
                  <li>Nopeat toimitusajat</li>
                </ul>
                <Link href="/menetelmat" className="btn btn-primary inline-block">
                  Lue lisää menetelmistämme
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Gallery Section */}
      <section className="py-16 bg-gray-50">
        <div className="container-custom">
          <h2 className="text-3xl font-bold text-center mb-8">Työnäytteitä</h2>
          <div className="max-w-5xl mx-auto">
            <ImageGallery images={galleryImages} />
          </div>
          <div className="text-center mt-8">
            <Link href="/tyonaytteet" className="btn btn-primary">
              Katso lisää työnäytteitä
            </Link>
          </div>
        </div>
      </section>

      {/* Customers Section */}
      <section className="py-20 bg-neutral-300">
        <div className="container-custom">
          <h2 className="text-3xl font-bold text-center mb-12">Asiakkaitamme</h2>
          <div className="max-w-6xl mx-auto">
            <Image
              src="/images/131_asiakkaita-ts1707671917596b.png"
              alt="Asiakkaiden logot"
              width={1200}
              height={300}
              className="w-full object-contain"
              quality={100}
            />
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16 bg-primary-900 text-white">
        <div className="container-custom text-center">
          <h2 className="text-3xl font-bold mb-8">Ota yhteyttä</h2>
          <div className="space-y-2">
            <p className="text-lg">
              <a href="tel:0440778896" className="hover:text-gray-200">
                Puh: 0440 778896
              </a>
            </p>
            <p className="text-lg">
              <a href="mailto:maalausasema@131.fi" className="hover:text-gray-200">
                maalausasema@131.fi
              </a>
            </p>
            <div className="mt-8">
              <p>Rantavainionpiha 6</p>
              <p>Ulvila 28400</p>
              <p>Suomi</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
