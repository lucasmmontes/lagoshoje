import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { newsSyncRuns } from "@/db/schema";
import { syncLatestNews } from "@/lib/news";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  const configuredSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");

  if (authorization?.startsWith("Bearer ")) {
    const providedSecret = authorization.slice("Bearer ".length).trim();
    if (!configuredSecret || providedSecret !== configuredSecret) {
      return NextResponse.json({ error: "Credenciais de atualização inválidas." }, { status: 401 });
    }
  }

  const [previousRun] = await db
    .select({ requestedAt: newsSyncRuns.requestedAt })
    .from(newsSyncRuns)
    .orderBy(desc(newsSyncRuns.requestedAt))
    .limit(1);

  if (previousRun && Date.now() - previousRun.requestedAt.getTime() < 45_000) {
    return NextResponse.json(
      { error: "A atualização foi solicitada há instantes. Tente novamente dentro de um minuto." },
      { status: 429, headers: { "Retry-After": "45" } },
    );
  }

  const [run] = await db
    .insert(newsSyncRuns)
    .values({ status: "running" })
    .returning({ id: newsSyncRuns.id });

  try {
    const result = await syncLatestNews();
    const status = result.errors.length ? "partial" : "complete";

    await db
      .update(newsSyncRuns)
      .set({
        status,
        insertedCount: result.inserted,
        sourcesChecked: result.sourcesChecked,
        errorSummary: result.errors.length ? result.errors.join("; ").slice(0, 500) : null,
        finishedAt: new Date(),
      })
      .where(eq(newsSyncRuns.id, run.id));

    return NextResponse.json({ ...result, status, syncedAt: new Date().toISOString() });
  } catch {
    await db
      .update(newsSyncRuns)
      .set({
        status: "failed",
        errorSummary: "Não foi possível concluir a leitura dos feeds.",
        finishedAt: new Date(),
      })
      .where(eq(newsSyncRuns.id, run.id));

    return NextResponse.json(
      { error: "Não foi possível atualizar as notícias neste momento." },
      { status: 502 },
    );
  }
}
