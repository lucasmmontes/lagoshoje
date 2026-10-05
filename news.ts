import Parser from "rss-parser";
import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { newsArticles } from "@/db/schema";
import { FEED_CHANNELS } from "@/lib/editorial";

export const NEWS_SOURCES = FEED_CHANNELS;
type FeedChannel = (typeof FEED_CHANNELS)[number];

const parser = new Parser();
const USER_AGENT = "LagosHojeFeedReader/2.0 (regional news reference reader)";

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
}

const cityAliases: Array<[string, string[]]> = [
  ["Cabo Frio", ["cabo frio", "tamoios"]],
  ["Arraial do Cabo", ["arraial do cabo"]],
  ["Búzios", ["buzios", "armacao dos buzios"]],
  ["São Pedro da Aldeia", ["sao pedro da aldeia"]],
  ["Araruama", ["araruama"]],
  ["Saquarema", ["saquarema"]],
  ["Iguaba Grande", ["iguaba grande"]],
  ["Rio das Ostras", ["rio das ostras"]],
  ["Silva Jardim", ["silva jardim"]],
  ["Casimiro de Abreu", ["casimiro de abreu"]],
];

function getCity(titleAndSlug: string): string | null {
  const value = normalize(titleAndSlug.replace(/[-_/]/g, " "));
  return cityAliases.find(([, aliases]) => aliases.some((alias) => value.includes(alias)))?.[0] ?? null;
}

const categoryMatchers: Array<[string, RegExp]> = [
  ["Saúde", /saude|hospital|maternidade|vacina|medic|clinica|upa\b|oncologia|dengue|atendimento medico/],
  ["Segurança", /policia|policial|pres[oa]|assalt|roub|furt|crime|homicidio|feminicidio|violencia|apreensao|drogas|trafico|delegacia|suspeit|bombeiro/],
  ["Meio Ambiente", /chuva|temporal|deslizamento|lobo.marinho|tartaruga|baleia|animal|meio ambiente|ambiental|preservacao|saneamento|lagoa|ressaca|alagamento|defesa civil|el nino/],
  ["Mobilidade", /transito|rodovia|estrada|ponte|onibus|transporte|engarrafamento|br-\d|rj-\d|barca|trem|mobilidade|acidente de (carro|moto|transito)/],
  ["Política", /eleic|votac|candidato|prefeit|vereador|deputad|governador|assembleia|camara municipal|tre-rj|urna|congresso|senador|politic/],
  ["Educação", /escola|educac|professor|aluno|estudante|universidade|enem|ensino|aula|creche|bolsa de estudo/],
  ["Economia", /economia|emprego|vaga[s]?\b|trabalho|comercio|empresa|investimento|imposto|orcamento|preco|mercado|industria|royalt/],
  ["Esportes", /esporte|futebol|campeonato|corrida|atleta|torneio|flamengo|vasco|botafogo|fluminense|surfe|volei|jogo|olimpi/],
  ["Cultura", /festival|show[s]?\b|musica|teatro|cinema|cultura|exposicao|artista|samba|livro|feira cultural|gospel fest/],
  ["Turismo", /turismo|turista|praia|hotel|hospedagem|feriado|visitante|temporada|gastronom|bandeira azul/],
];

function getCategory(title: string): string {
  const value = normalize(title);
  if (/festival|gospel fest|\bshows?\b|teatro|cinema|exposicao|samba|musica/.test(value)) {
    return "Cultura";
  }
  return categoryMatchers.find(([, matcher]) => matcher.test(value))?.[0] ?? "Cidades";
}

function safeOriginalUrl(value: string | undefined, source: FeedChannel): URL | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname !== new URL(source.siteUrl).hostname) return null;
    if (/especial-publicitario|conteudo-de-marca|publieditorial|patrocinado/i.test(url.pathname)) return null;
    if (source.kind === "g1" && !url.pathname.startsWith("/rj/")) return null;
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (/^utm_|^fbclid$|^gclid$/i.test(key)) url.searchParams.delete(key);
    }
    return url;
  } catch {
    return null;
  }
}

function getArea(title: string, url: URL, source: FeedChannel, city: string | null): string | null {
  if (city) return "Região dos Lagos";
  const value = normalize(title);
  const path = url.pathname;

  if (source.kind === "regional") {
    if (/petropolis|nova friburgo|teresopolis|regiao serrana/.test(value)) return "Região Serrana";
    if (/macae|campos dos goytacazes|norte fluminense/.test(value)) return "Norte Fluminense";
    if (/angra dos reis|volta redonda|barra mansa|costa verde/.test(value)) return "Sul Fluminense e Costa Verde";
    if (/baixada fluminense|nova iguacu|duque de caxias|belford roxo|sao joao de meriti|queimados|nilopolis/.test(value)) {
      return "Baixada Fluminense";
    }
    if (/\/cidades\/rio-de-janeiro\//.test(path) || /\bcidade do rio\b|\bcapital\b/.test(value)) {
      return "Capital e Grande Rio";
    }
    return "Região dos Lagos";
  }

  if (source.kind === "national") {
    if (!/rio de janeiro|\brj\b|fluminense|carioca|niteroi|petropolis|nova friburgo|macae|angra dos reis|volta redonda|campos dos goytacazes/.test(value)) {
      return null;
    }
    if (/petropolis|nova friburgo|teresopolis|regiao serrana/.test(value)) return "Região Serrana";
    if (/macae|campos dos goytacazes|norte fluminense/.test(value)) return "Norte Fluminense";
    if (/angra dos reis|volta redonda|barra mansa|costa verde/.test(value)) return "Sul Fluminense e Costa Verde";
    if (/baixada fluminense|nova iguacu|duque de caxias/.test(value)) return "Baixada Fluminense";
    return "Capital e Grande Rio";
  }

  if (/\bmacae\b|\bcampos dos goytacazes\b/.test(value)) return "Norte Fluminense";
  if (/\/rj\/regiao-dos-lagos\//.test(path)) return "Região dos Lagos";
  if (/\/rj\/regiao-serrana\//.test(path)) return "Região Serrana";
  if (/\/rj\/norte-fluminense\//.test(path)) return "Norte Fluminense";
  if (/\/rj\/sul-do-rio-costa-verde\//.test(path)) return "Sul Fluminense e Costa Verde";
  if (/\/rj\/rio-de-janeiro\//.test(path)) {
    if (/baixada fluminense|nova iguacu|duque de caxias|belford roxo|sao joao de meriti|queimados|nilopolis/.test(value)) {
      return "Baixada Fluminense";
    }
    return "Capital e Grande Rio";
  }
  return null;
}

function metadataSummary(category: string, sourceName: string, area: string): string {
  return `Publicação de ${sourceName} sobre ${normalize(category)} em ${area}. Confira os detalhes e possíveis atualizações diretamente na fonte original.`;
}

async function writeSummary(title: string, category: string, sourceName: string, area: string) {
  const fallback = { summary: metadataSummary(category, sourceName, area), generatedBy: "metadata" };
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return fallback;

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        instructions:
          "Você é assistente editorial do Lagos Hoje, portal da Região dos Lagos no estado do Rio de Janeiro. Escreva em português brasileiro uma síntese neutra, original e com até 35 palavras. Use SOMENTE o título, a região e a categoria informados. Não invente fatos, números, datas, citações ou desdobramentos. Não copie o título integralmente. Você NÃO recebeu nem leu o artigo: se o título não bastar, apenas informe o assunto e remeta à fonte original.",
        input: `Veículo: ${sourceName}\nRegião: ${area}\nEditoria: ${category}\nTítulo: ${title}`,
        max_output_tokens: 120,
      }),
      signal: AbortSignal.timeout(7_000),
    });
    if (!response.ok) return fallback;
    const data = (await response.json()) as {
      output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
    };
    const text = data.output
      ?.flatMap((entry) => entry.content ?? [])
      .find((entry) => entry.type === "output_text")?.text
      ?.trim();
    if (!text) return fallback;
    return { summary: text.slice(0, 420), generatedBy: "ai" };
  } catch {
    return fallback;
  }
}

type Candidate = {
  title: string;
  originalUrl: string;
  sourceName: string;
  sourceUrl: string;
  publishedAt: Date;
  area: string;
  city: string | null;
  category: string;
};

export type NewsSyncResult = {
  inserted: number;
  checked: number;
  sourcesChecked: number;
  errors: string[];
  aiEnabled: boolean;
};

export async function syncLatestNews(): Promise<NewsSyncResult> {
  const errors: string[] = [];
  const scans = await Promise.all(
    FEED_CHANNELS.map(async (source): Promise<Candidate[]> => {
      try {
        const response = await fetch(source.feedUrl, {
          cache: "no-store",
          headers: {
            "User-Agent": USER_AGENT,
            Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml",
          },
          signal: AbortSignal.timeout(12_000),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const xml = await response.text();
        if (xml.length > 4_000_000) throw new Error("Feed demasiado grande");
        const feed = await parser.parseString(xml);
        const items: Candidate[] = [];

        for (const item of feed.items.slice(0, source.scan)) {
          if (items.length >= source.limit) break;
          const title = item.title?.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim().slice(0, 260);
          const original = safeOriginalUrl(item.link, source);
          if (!title || !original || /conte[uú]do publicit[aá]rio/i.test(title)) continue;
          if (/^previs[aã]o do tempo hoje para/i.test(title)) continue;

          const rawDate = item.isoDate || item.pubDate;
          const publishedAt = rawDate ? new Date(rawDate) : null;
          if (!publishedAt || Number.isNaN(publishedAt.getTime())) continue;
          if (publishedAt.getTime() > Date.now() + 24 * 60 * 60 * 1000) continue;

          const city = getCity(`${title} ${original.pathname}`);
          const area = getArea(title, original, source, city);
          if (!area) continue;

          items.push({
            title,
            originalUrl: original.toString(),
            sourceName: source.name,
            sourceUrl: source.name === "g1" ? "https://g1.globo.com/rj/" : source.siteUrl,
            publishedAt,
            area,
            city,
            category: getCategory(title),
          });
        }
        return items;
      } catch {
        errors.push(`${source.name} · ${source.label}: feed indisponível`);
        return [];
      }
    }),
  );

  const candidates = Array.from(
    new Map(scans.flat().map((item) => [item.originalUrl, item])).values(),
  ).sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
  const sourcesChecked = FEED_CHANNELS.length - errors.length;

  if (!candidates.length) {
    return { inserted: 0, checked: 0, sourcesChecked, errors, aiEnabled: Boolean(process.env.OPENAI_API_KEY) };
  }

  const existing = await db
    .select({ originalUrl: newsArticles.originalUrl })
    .from(newsArticles)
    .where(inArray(newsArticles.originalUrl, candidates.map((item) => item.originalUrl)));
  const existingUrls = new Set(existing.map((item) => item.originalUrl));
  const pending = candidates.filter((item) => !existingUrls.has(item.originalUrl));

  const records: Array<Candidate & { summary: string; summaryGeneratedBy: string }> = [];
  for (let start = 0; start < pending.length; start += 8) {
    const batch = await Promise.all(
      pending.slice(start, start + 8).map(async (item) => {
        const result = await writeSummary(item.title, item.category, item.sourceName, item.area);
        return { ...item, summary: result.summary, summaryGeneratedBy: result.generatedBy };
      }),
    );
    records.push(...batch);
  }

  const inserted = records.length
    ? await db
        .insert(newsArticles)
        .values(records)
        .onConflictDoNothing({ target: newsArticles.originalUrl })
        .returning({ id: newsArticles.id })
    : [];

  return {
    inserted: inserted.length,
    checked: candidates.length,
    sourcesChecked,
    errors,
    aiEnabled: Boolean(process.env.OPENAI_API_KEY),
  };
}
