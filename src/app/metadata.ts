import type { Metadata } from 'next';

const siteConfig = {
  name: 'Maalausasema 131',
  description: 'Maalausasema131 Oy on erikoistunut metalliosien märkämaalaukseen.',
  url: 'https://131.fi',
};

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  metadataBase: new URL(siteConfig.url),
  keywords: [
    'maalaus',
    'teollisuusmaalaus',
    'metalliosat',
    'pintakäsittely',
    'märkämaalaus',
    'hiekkapuhallus',
    'Ulvila',
  ],
  authors: [
    {
      name: 'Maalausasema 131',
      url: siteConfig.url,
    },
  ],
  creator: 'Maalausasema 131',
  openGraph: {
    type: 'website',
    locale: 'fi_FI',
    url: siteConfig.url,
    title: siteConfig.name,
    description: siteConfig.description,
    siteName: siteConfig.name,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default metadata;