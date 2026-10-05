import { and, desc, eq, ilike, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { newsArticles } from "@/db/schema";
import { CATEGORIES, REGION_CITIES, STATE_AREAS } from "@/lib/editorial";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim().slice(0, 90) ?? "";
  const category = searchParams.get("category")?.trim() ?? "";
  const area = searchParams.get("area")?.trim() ?? "";
  const city = searchParams.get("city")?.trim() ?? "";
  const conditions = [];

  if (category && category !== "Todas" && CATEGORIES.some((item) => item === category)) {
    conditions.push(eq(newsArticles.category, category));
  }
  if (area && area !== "Todas as regiões" && STATE_AREAS.some((item) => item === area)) {
    conditions.push(eq(newsArticles.area, area));
  }
  if (city && REGION_CITIES.some((item) => item === city)) {
    conditions.push(eq(newsArticles.city, city));
  }
  if (query) {
    const term = `%${query.replace(/[\\%_]/g, "\\$&")}%`;
    conditions.push(
      or(
        ilike(newsArticles.title, term),
        ilike(newsArticles.summary, term),
        ilike(newsArticles.sourceName, term),
      )!,
    );
  }

  const articles = await db
    .select()
    .from(newsArticles)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(newsArticles.publishedAt), desc(newsArticles.createdAt))
    .limit(180);

  return NextResponse.json({ articles }, { headers: { "Cache-Control": "no-store" } });
}
