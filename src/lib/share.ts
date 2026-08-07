import type { Marcolada, Player } from "./types";
import { displayName, matchScore, marcoladaTotals, playerStats, rankTeams, topBy } from "./stats";

const W = 1080;
const H = 1920;

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export async function buildSummaryImage(marcolada: Marcolada, players: Player[]): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, "#1d4ed8");
  grad.addColorStop(0.55, "#1e3a8a");
  grad.addColorStop(1, "#0b1c3f");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "rgba(255,255,255,0.07)";
  ctx.beginPath();
  ctx.arc(W - 60, 180, 320, 0, Math.PI * 2);
  ctx.fill();

  const stats = playerStats([marcolada], players);
  const artilheiro = topBy(stats, "goals");
  const garcom = topBy(stats, "assists");
  const participacoes = topBy(stats, "participations");
  const bestTeam = rankTeams(marcolada)[0];
  const totals = marcoladaTotals(marcolada);

  ctx.textBaseline = "top";
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 34px Sora, sans-serif";
  ctx.fillText("MARCOLADA STATS", 80, 110);
  ctx.fillStyle = "rgba(255,255,255,0.72)";
  ctx.font = "600 28px 'Plus Jakarta Sans', sans-serif";
  ctx.fillText(marcolada.date.split("-").reverse().join("/"), 80, 158);

  ctx.fillStyle = "#ffffff";
  ctx.font = "800 62px Sora, sans-serif";
  wrap(ctx, marcolada.name, 80, 230, W - 160, 70);

  let y = 400;
  const card = (label: string, value: string, sub: string) => {
    ctx.fillStyle = "rgba(255,255,255,0.10)";
    roundRect(ctx, 80, y, W - 160, 168, 36);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.font = "700 24px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText(label.toUpperCase(), 124, y + 34);
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 48px Sora, sans-serif";
    ctx.fillText(value, 124, y + 74);
    ctx.fillStyle = "#93c5fd";
    ctx.font = "700 28px 'Plus Jakarta Sans', sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(sub, W - 124, y + 84);
    ctx.textAlign = "left";
    y += 192;
  };

  card("Artilheiro", artilheiro ? displayName(artilheiro.player) : "—", artilheiro ? `${artilheiro.goals} gols` : "");
  card("Garçom", garcom ? displayName(garcom.player) : "—", garcom ? `${garcom.assists} assist.` : "");
  card(
    "Participações em gols",
    participacoes ? displayName(participacoes.player) : "—",
    participacoes ? `${participacoes.participations}` : "",
  );
  card("Melhor time", bestTeam ? bestTeam.team.name : "—", bestTeam ? `${bestTeam.wins} vitórias` : "");

  ctx.fillStyle = "rgba(255,255,255,0.65)";
  ctx.font = "700 24px 'Plus Jakarta Sans', sans-serif";
  ctx.fillText("RESULTADOS", 80, y + 12);
  y += 58;

  const finished = marcolada.matches.filter((m) => m.status === "finished").slice(0, 8);
  for (const m of finished) {
    const { a, b } = matchScore(m);
    const ta = marcolada.teams.find((t) => t.id === m.teamAId)?.name ?? "Time A";
    const tb = marcolada.teams.find((t) => t.id === m.teamBId)?.name ?? "Time B";
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.font = "600 30px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText(`${ta}`, 80, y);
    ctx.textAlign = "right";
    ctx.fillText(`${tb}`, W - 80, y);
    ctx.textAlign = "center";
    ctx.font = "800 32px Sora, sans-serif";
    ctx.fillText(`${a} x ${b}`, W / 2, y - 2);
    ctx.textAlign = "left";
    y += 52;
  }

  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.font = "600 26px 'Plus Jakarta Sans', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(
    `${totals.matches} partidas · ${totals.goals} gols · média ${totals.avg} por jogo`,
    W / 2,
    H - 130,
  );
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.font = "700 24px 'Plus Jakarta Sans', sans-serif";
  ctx.fillText("marcolada stats", W / 2, H - 84);

  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), "image/png"));
}

function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lh: number) {
  const words = text.split(" ");
  let line = "";
  let yy = y;
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, yy);
      line = w;
      yy += lh;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, yy);
}

export async function shareSummary(marcolada: Marcolada, players: Player[]) {
  const blob = await buildSummaryImage(marcolada, players);
  if (!blob) return;
  const file = new File([blob], `${marcolada.name.replace(/\s+/g, "-").toLowerCase()}.png`, {
    type: "image/png",
  });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: marcolada.name });
      return;
    } catch {
      /* usuário cancelou */
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  a.click();
  URL.revokeObjectURL(url);
}
