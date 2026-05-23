import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Allo Inventory',
  description: 'Multi-warehouse inventory reservation platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <nav style={{
          background: 'var(--bg-card)',
          borderBottom: '1px solid var(--border)',
          boxShadow: 'var(--shadow-sm)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}>
          <div style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '0 24px',
            height: '64px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <a href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                background: 'var(--accent)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2Z"/>
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                </svg>
              </div>
              <span className="font-display" style={{ fontSize: '20px', color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
                Allo
              </span>
            </a>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                fontSize: '12px',
                color: 'var(--text-muted)',
                background: 'var(--bg-subtle)',
                padding: '4px 10px',
                borderRadius: '20px',
                border: '1px solid var(--border)',
              }}>
                Inventory Platform
              </span>
            </div>
          </div>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
