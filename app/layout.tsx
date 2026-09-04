import type { Metadata } from 'next';
import './globals.css';
import { NavRail } from '@/components/navigation/NavRail';
import { AmbientStatusStrip } from '@/components/navigation/AmbientStatusStrip';

export const metadata: Metadata = {
  title: 'Razorpay Autonomous AI Revenue Recovery Agent — Operations Console',
  description:
    'Event-driven, transaction-by-transaction command deck for autonomous payment decline recovery and statutory compliance routing.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="dark">
      <body className="bg-canvas text-text-primary min-h-screen antialiased selection:bg-brand-blue/30">
        <NavRail />
        <AmbientStatusStrip />
        <main className="ml-64 pt-10 min-h-screen p-6 max-w-7xl">
          {children}
        </main>
      </body>
    </html>
  );
}
