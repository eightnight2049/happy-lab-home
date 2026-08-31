import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Motion Intelligence Lab",
  description: "A lab for robot learning, embodied intelligence, and trustworthy autonomy.",
  openGraph: {
    title: "Motion Intelligence Lab",
    description: "We build intelligent machines that learn to move safely in the real world.",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
