import { desc } from "drizzle-orm";
import { db } from "@/db";
import { newsArticles, newsSyncRuns } from "@/db/schema";
import Newsroom from "./newsroom";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let initialArticles: Array<typeof newsArticles.$inferSelect> = [];
  let lastSyncAt: string | null = null;
  let databaseReady = true;

  try {
    const [articles, runs] = await Promise.all([
      db
        .select()
        .from(newsArticles)
        .orderBy(desc(newsArticles.publishedAt), desc(newsArticles.createdAt))
        .limit(180),
      db
        .select({ requestedAt: newsSyncRuns.requestedAt })
        .from(newsSyncRuns)
        .orderBy(desc(newsSyncRuns.requestedAt))
        .limit(1),
    ]);
    initialArticles = articles;
    lastSyncAt = runs[0]?.requestedAt.toISOString() ?? null;
  } catch {
    databaseReady = false;
  }

  const editionDate = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(new Date());

  return (
    <Newsroom
      initialArticles={initialArticles}
      lastSyncAt={lastSyncAt}
      databaseReady={databaseReady}
      aiEnabled={Boolean(process.env.OPENAI_API_KEY)}
      editionDate={editionDate}
    />
  );
}
