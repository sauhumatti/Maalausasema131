import ImageGallery from '@/components/ImageGallery';

const galleryImages = [
  {
    src: '/images/cd75baa4d4e7c4fa6dae91afb4f80fe1_400x400-ts1667912985596b.jpg',
    alt: 'Maalaustyönäyte 1'
  },
  {
    src: '/images/ee803590b854c4131b09e41f7f04620c-ts1667912986596b.jpg',
    alt: 'Maalaustyönäyte 2'
  },
  {
    src: '/images/f8bacbe8513725331685eb351d92819b-ts1667912988596b.jpg',
    alt: 'Maalaustyönäyte 3'
  },
  {
    src: '/images/a4ba71bd7c0676acb8672b42cf4cc860_400x400-ts1667912988596b.png',
    alt: 'Maalaustyönäyte 4'
  }
];

export default function WorkSamples() {
  return (
    <div className="min-h-screen bg-white">
      <div className="container-custom">
        <h1 className="text-4xl font-bold mb-12 text-center text-gray-900">Työnäytteet</h1>

        <div className="prose max-w-4xl mx-auto mb-12 text-center">
          <p className="text-lg">Olemme toteuttaneet lukuisia erilaisia maalausprojekteja vuosien varrella. Alla näet esimerkkejä työstämme ja laadukkaasta lopputuloksesta.</p>
        </div>

        <div className="max-w-5xl mx-auto mb-16">
          <ImageGallery images={galleryImages} interval={5000} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 mb-16 max-w-6xl mx-auto">
          {galleryImages.map((image, index) => (
            <div key={index} className="gallery-item group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.src}
                alt={image.alt}
                className="w-full h-64 object-cover rounded-lg shadow-md transition-transform duration-300 group-hover:scale-105"
              />
            </div>
          ))}
        </div>

        <div className="bg-gray-100 p-8 rounded-lg mt-12 max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4">Kiinnostuitko?</h2>
          <p className="text-lg mb-6">Ota yhteyttä ja kerro meille projektistasi. Autamme sinua mielellämme löytämään parhaan ratkaisun juuri sinun tarpeisiisi.</p>
          <div className="space-y-2">
            <a href="tel:0440778896" className="block text-gray-700 hover:text-black font-medium text-lg">Puh: 0440 778896</a>
            <a href="mailto:maalausasema@131.fi" className="block text-gray-700 hover:text-black font-medium text-lg">maalausasema@131.fi</a>
          </div>
        </div>
      </div>
    </div>
  );
}