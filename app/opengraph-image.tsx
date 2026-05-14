import { ImageResponse } from "next/og";
import { getSiteSummary } from "@/lib/counts";

export const runtime = "nodejs";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "rhythia-points by yoru — rhythia farm maps";

export default async function OpengraphImage() {
  const { maps, scores, players } = await getSiteSummary();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#16161a",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
          color: "#e8e6df",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 200,
            height: 200,
            borderRadius: 36,
            background: "#1d1d22",
            color: "#e6a04c",
            fontSize: 110,
            fontWeight: 700,
            lineHeight: 1,
            border: "2px solid #33333d",
          }}
        >
          rp
        </div>

        <div
          style={{
            fontSize: 64,
            fontWeight: 600,
            marginTop: 48,
          }}
        >
          rhythia-points
        </div>

        <div
          style={{
            color: "#9a988e",
            fontSize: 30,
            marginTop: 10,
          }}
        >
          farm-value leaderboard for rhythia
        </div>

        {maps > 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
              marginTop: 52,
              fontSize: 32,
              color: "#9a988e",
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
              <span style={{ color: "#e6a04c", fontWeight: 700 }}>{maps.toLocaleString()}</span>
              <span>farm maps across</span>
              <span style={{ color: "#e6a04c", fontWeight: 700 }}>{scores.toLocaleString()}</span>
              <span>scores</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
              <span>from</span>
              <span style={{ color: "#e6a04c", fontWeight: 700 }}>{players.toLocaleString()}</span>
              <span>players</span>
            </div>
          </div>
        )}

        <div
          style={{
            position: "absolute",
            bottom: 32,
            right: 40,
            color: "#6b6a63",
            fontSize: 22,
          }}
        >
          rp.its.moe
        </div>
      </div>
    ),
    { ...size },
  );
}
