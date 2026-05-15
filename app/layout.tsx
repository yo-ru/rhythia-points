import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { MapPlayerProvider } from "@/components/MapPlayer";
import { getSiteSummary } from "@/lib/counts";

const siteTitle = "rhythia-points by yoru — rhythia farm maps";
const baseDescription =
  "Farm-value leaderboard for Rhythia beatmaps. Maps ranked by how much RP they give relative to other maps at the same difficulty.";

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
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
      <body className="dark">
        <MapPlayerProvider>
          <Header />
          <main className="mx-auto max-w-[1320px] px-6 pt-6 pb-24">{children}</main>
          <footer className="w-full flex flex-col text-neutral-500 items-center justify-center pb-10">
            <a
              className="text-xs underline cursor-pointer text-blue-500"
              href="https://rhythia.com/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Rhythia
            </a>
            <a
              className="text-xs underline cursor-pointer text-blue-500"
              href="/faq"
            >
              FAQ
            </a>
            <a
              className="text-xs underline cursor-pointer text-blue-500"
              href="https://github.com/yo-ru/rhythia-points"
              target="_blank"
              rel="noopener noreferrer"
            >
              Source
            </a>
            <div className="w-48 my-3 bg-neutral-700 h-[1px]"></div>
            <div className="text-xs">rhythia-points by yoru · not affiliated with Rhythia</div>
          </footer>
        </MapPlayerProvider>
      </body>
    </html>
  );
}
