import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Clawntown - Coastal Crustacean Town',
  description: 'A self-evolving public town powered by AI',
  icons: {
    icon: '/favicon.svg',
  },
  themeColor: '#4a90d9', // Sea/water color for iOS Safari browser chrome
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        {children}
      </body>
    </html>
  );
}
