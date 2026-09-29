import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Hostel Mess',
  description: 'Daily mess attendance, guest entries and monthly hostel bills.'
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#091540'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Atkinson Hyperlegible: made to keep 0/O and 1/l/I apart — matters for roll numbers. */}
        <link
          href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible+Next:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
