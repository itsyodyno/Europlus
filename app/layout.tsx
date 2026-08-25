import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://europlus-work-command.hemansh4.chatgpt.site"),
  title: "EUROPLUS Work Command",
  description: "Redberry and EUROPLUS inquiry, payment, production and order operations panel.",
  openGraph: {
    title: "EUROPLUS Work Command",
    description: "One view. Every handoff.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "EUROPLUS Work Command" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "EUROPLUS Work Command",
    description: "One view. Every handoff.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
