import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TraceMesh — OSINT Intelligence Aggregator',
  description: 'Multi-domain OSINT aggregation and entity correlation platform',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-bg-base text-text-primary antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
