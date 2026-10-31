import 'bootstrap/dist/css/bootstrap.min.css';
import './globals.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { I18nProvider } from '@/lib/i18n';
import AppNavbar from '@/components/AppNavbar';

export const metadata: Metadata = {
  title: 'TrackStat',
  description: 'Athletics statistics',
  icons: {
    icon: '/icon.svg',
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="uk">
      <body className="bg-light min-vh-100 d-flex flex-column">
        <I18nProvider>
          <AppNavbar />
          <main className="container py-4 flex-grow-1" style={{ minWidth: 0, maxWidth: '100%' }}>{children}</main>
          <footer className="py-2 mt-auto text-center text-muted small">
            <div className="container">
              <a href="mailto:yermolenko.ua@gmail.com" className="text-decoration-none text-secondary fw-semibold">
                Andrii Yermolenko
              </a>{' '}
              &copy; 2026
            </div>
          </footer>
        </I18nProvider>
      </body>
    </html>
  );
}
