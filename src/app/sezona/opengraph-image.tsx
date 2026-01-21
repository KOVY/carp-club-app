import { ImageResponse } from "next/og"
import { getSezonaLeaderboard } from "@/actions/sezona.actions"
import { AKTUALNI_SEZONA } from "@/lib/sezona-config"
import type { LeaderboardEntry } from "@/lib/types"

export const runtime = "edge"
export const alt = "Kaprařská Liga - Průběžné pořadí"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default async function OGImage() {
  // Načíst data
  const result = await getSezonaLeaderboard()
  const data = result.success ? result.data : null

  // Top 5 z každé ligy
  const topA = data?.ligaA.leaderboard.slice(0, 5) || []
  const topB = data?.ligaB.leaderboard.slice(0, 5) || []

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)",
          padding: "40px",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "30px",
          }}
        >
          <div
            style={{
              fontSize: "48px",
              fontWeight: "bold",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              gap: "16px",
            }}
          >
            <span style={{ fontSize: "56px" }}>🏆</span>
            {AKTUALNI_SEZONA.nazev}
          </div>
        </div>

        {/* Subtitle */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: "40px",
          }}
        >
          <span
            style={{
              fontSize: "24px",
              color: "#94a3b8",
              textTransform: "uppercase",
              letterSpacing: "4px",
            }}
          >
            Průběžné pořadí
          </span>
        </div>

        {/* Two columns */}
        <div
          style={{
            display: "flex",
            flex: 1,
            gap: "40px",
          }}
        >
          {/* Liga A */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              background: "rgba(37, 99, 235, 0.1)",
              borderRadius: "16px",
              padding: "24px",
              border: "2px solid rgba(37, 99, 235, 0.3)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                marginBottom: "20px",
              }}
            >
              <span style={{ fontSize: "32px" }}>🏆</span>
              <span
                style={{
                  fontSize: "28px",
                  fontWeight: "bold",
                  color: "#3b82f6",
                }}
              >
                Liga A
              </span>
            </div>

            {topA.map((entry: LeaderboardEntry, i: number) => (
              <div
                key={entry.tym.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "12px 16px",
                  marginBottom: "8px",
                  background:
                    i === 0
                      ? "rgba(234, 179, 8, 0.2)"
                      : i === 1
                        ? "rgba(156, 163, 175, 0.2)"
                        : i === 2
                          ? "rgba(217, 119, 6, 0.2)"
                          : "rgba(255, 255, 255, 0.05)",
                  borderRadius: "8px",
                }}
              >
                <span
                  style={{
                    width: "36px",
                    fontSize: "20px",
                    fontWeight: "bold",
                    color:
                      i === 0
                        ? "#eab308"
                        : i === 1
                          ? "#9ca3af"
                          : i === 2
                            ? "#d97706"
                            : "#64748b",
                  }}
                >
                  {i + 1}.
                </span>
                <span
                  style={{
                    flex: 1,
                    fontSize: "18px",
                    color: "#ffffff",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {entry.tym.nazev}
                </span>
                <span
                  style={{
                    fontSize: "18px",
                    fontWeight: "bold",
                    color: "#22c55e",
                    fontFamily: "monospace",
                  }}
                >
                  {entry.skore.toFixed(2)} kg
                </span>
              </div>
            ))}
          </div>

          {/* Liga B */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              background: "rgba(22, 163, 74, 0.1)",
              borderRadius: "16px",
              padding: "24px",
              border: "2px solid rgba(22, 163, 74, 0.3)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                marginBottom: "20px",
              }}
            >
              <span style={{ fontSize: "32px" }}>🎯</span>
              <span
                style={{
                  fontSize: "28px",
                  fontWeight: "bold",
                  color: "#22c55e",
                }}
              >
                Liga B
              </span>
            </div>

            {topB.map((entry: LeaderboardEntry, i: number) => (
              <div
                key={entry.tym.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "12px 16px",
                  marginBottom: "8px",
                  background:
                    i === 0
                      ? "rgba(34, 197, 94, 0.2)"
                      : "rgba(255, 255, 255, 0.05)",
                  borderRadius: "8px",
                  border: i === 0 ? "1px solid rgba(34, 197, 94, 0.5)" : "none",
                }}
              >
                <span
                  style={{
                    width: "36px",
                    fontSize: "20px",
                    fontWeight: "bold",
                    color: i === 0 ? "#22c55e" : "#64748b",
                  }}
                >
                  {i + 1}.
                </span>
                <span
                  style={{
                    flex: 1,
                    fontSize: "18px",
                    color: "#ffffff",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {entry.tym.nazev}
                </span>
                <span
                  style={{
                    fontSize: "18px",
                    fontWeight: "bold",
                    color: "#22c55e",
                    fontFamily: "monospace",
                  }}
                >
                  {entry.skore.toFixed(2)} kg
                </span>
                {i === 0 && (
                  <span
                    style={{
                      marginLeft: "8px",
                      fontSize: "14px",
                      color: "#22c55e",
                    }}
                  >
                    ↑A
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "30px",
            paddingTop: "20px",
            borderTop: "1px solid rgba(255, 255, 255, 0.1)",
          }}
        >
          <span style={{ fontSize: "16px", color: "#64748b" }}>
            carpclub.app/sezona
          </span>
          <span style={{ fontSize: "16px", color: "#64748b" }}>
            Carp Club ČR
          </span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
