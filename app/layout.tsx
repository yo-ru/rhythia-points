import type { Metadata, Viewport } from "next";
import { Concert_One } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { MapPlayerProvider } from "@/components/MapPlayer";
import { getSiteSummary } from "@/lib/counts";

const displayFont = Concert_One({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
  display: "swap",
});

const siteTitle = "rhythia-points by yoru — rhythia farm maps";
const baseDescription =
  "Farm-value leaderboard for Rhythia beatmaps. Maps ranked by how much RP they give relative to other maps at the same difficulty.";

export const viewport: Viewport = {
  themeColor: "#e6a04c",
};

export async function generateMetadata(): Promise<Metadata> {
  const { maps, scores, players } = await getSiteSummary();
  const summary =
    maps > 0
      ? `${maps.toLocaleString()} farm maps across ${scores.toLocaleString()} scores from ${players.toLocaleString()} players. ${baseDescription}`
      : baseDescription;
  return {
    metadataBase: new URL("https://rp.its.moe"),
    title: siteTitle,
    description: summary,
    openGraph: {
      title: siteTitle,
      description: summary,
      url: "https://rp.its.moe",
      siteName: "rhythia-points",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: siteTitle,
      description: summary,
    },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={displayFont.variable}>
        <MapPlayerProvider>
          <Header />
          <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
          <footer className="max-w-7xl mx-auto px-4 py-10 text-xs text-text-muted">
            rhythia-points · data derived from the upstream Rhythia API. Not affiliated with Rhythia.
          </footer>
        </MapPlayerProvider>
      </body>
    </html>
  );
}
