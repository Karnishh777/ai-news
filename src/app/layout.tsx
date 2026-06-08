import type { Metadata, Viewport } from "next";
import { Inter, Sora } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const sora = Sora({ subsets: ["latin"], variable: "--font-display", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: {
    default: "NewsFlow AI — Your world, personalized",
    template: "%s · NewsFlow AI",
  },
  description:
    "AI-personalized, real-time news. Trending headlines, smart summaries, and a feed that learns what you care about.",
  keywords: ["news", "AI", "personalized", "breaking news", "summaries"],
  openGraph: {
    title: "NewsFlow AI",
    description: "AI-personalized, real-time news that learns what you care about.",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#070b18" },
  ],
  width: "device-width",
  initialScale: 1,
};

// Set the theme class before hydration to avoid a flash.
const themeScript = `(function(){try{var s=JSON.parse(localStorage.getItem('newsflow-ui')||'{}');var st=(s&&s.state)||{};var t=st.theme||'dark';if(t==='dark')document.documentElement.classList.add('dark');var p=st.palette;if(p&&p!=='default')document.documentElement.setAttribute('data-theme',p);}catch(e){document.documentElement.classList.add('dark');}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${sora.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
