import { and, desc, eq, ilike, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { newsArticles } from "@/db/schema";
import { getAdminSession } from "@/lib/admin-auth";
import { CATEGORIES, REGION_CITIES, STATE_AREAS } from "@/lib/editorial";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_TEXT = 320;

type Article = typeof newsArticles.$inferSelect;
type ArticlePatch = Partial<Pick<Article, "title" | "summary" | "category" | "area" | "city">>;

function cleanString(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.slice(0, max) || null;
}

function validatePatch(input: Record<string, unknown>): ArticlePatch | { error: string } {
  const title = cleanString(input.title, MAX_TEXT);
  const summary = cleanString(input.summary, 420);
  const category = cleanString(input.category, 36);
  const area = cleanString(input.area, 60);
  const cityRaw = cleanString(input.city, 60);
  const city = cityRaw?.toLocaleLowerCase("pt-BR") === "null" || !cityRaw ? null : cityRaw;

  const categories: readonly string[] = CATEGORIES;
  const areas: readonly string[] = STATE_AREAS;
  if (category && !categories.includes(category)) return { error: "Editoria inválida." };
  if (area && !areas.includes(area)) return { error: "Região inválida." };
  if (city && !REGION_CITIES.includes(city as (typeof REGION_CITIES)[number])) {
    return { error: "Cidade inválida." };
  }

  const patch: ArticlePatch = {};
  if (title) patch.title = title;
  if (summary) patch.summary = summary;
  if (category) patch.category = category;
  if (area) patch.area = area;
  if (Object.keys(patch).length > 0 || "city" in input) {
    patch.city = city;
  }
  if (Object.keys(patch).length === 0) return { error: "Nenhuma alteração foi enviada." };
  return patch;
}

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Sessão administrativa necessária." }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const query = searchParams.get("q")?.trim().slice(0, 100) ?? "";
  const area = searchParams.get("area")?.trim() ?? "";
  const category = searchParams.get("category")?.trim() ?? "";
  const conditions = [];

  if (area && area !== "Todas as regiões") conditions.push(eq(newsArticles.area, area));
  if (category && category !== "Todas") conditions.push(eq(newsArticles.category, category));
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

  let order;
  if (status === "recent") {
    order = desc(newsArticles.createdAt);
  } else {
    order = desc(newsArticles.publishedAt);
  }

  const articles = await db
    .select()
    .from(newsArticles)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(order)
    .limit(220);

  return NextResponse.json({ articles, admin: session });
}

export async function PATCH(request: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Sessão administrativa necessária." }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown> & { id?: string };
  if (!body.id || typeof body.id !== "string") {
    return NextResponse.json({ error: "Identificador da notícia não informado." }, { status: 400 });
  }

  const patch = validatePatch(body);
  if ("error" in patch) return NextResponse.json({ error: patch.error }, { status: 400 });

  const [updated] = await db
    .update(newsArticles)
    .set(patch)
    .where(eq(newsArticles.id, body.id))
    .returning();

  if (!updated) return NextResponse.json({ error: "Notícia não encontrada." }, { status: 404 });
  return NextResponse.json({ article: updated });
}

export async function DELETE(request: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Sessão administrativa necessária." }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Identificador não informado." }, { status: 400 });

  const [removed] = await db.delete(newsArticles).where(eq(newsArticles.id, id)).returning({
    id: newsArticles.id,
    title: newsArticles.title,
  });

  if (!removed) return NextResponse.json({ error: "Notícia não encontrada." }, { status: 404 });
  return NextResponse.json({ removed });
}
