"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  Clock3,
  Compass,
  ExternalLink,
  Globe2,
  MapPin,
  Menu,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Waves,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Brand from "@/components/Brand";
import { CATEGORIES, FEED_CHANNELS, PUBLICATIONS, REGION_CITIES, STATE_AREAS } from "@/lib/editorial";

type Article = {
  id: string;
  title: string;
  summary: string;
  summaryGeneratedBy: string;
  category: string;
  area: string;
  city: string | null;
  sourceName: string;
  sourceUrl: string;
  originalUrl: string;
  publishedAt: Date | string;
  createdAt: Date | string;
};

type NewsroomProps = {
  initialArticles: Article[];
  lastSyncAt: string | null;
  databaseReady: boolean;
  aiEnabled: boolean;
  editionDate: string;
};

function formatStoryDate(value: Date | string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data indisponível";
  const day = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    timeZone: "America/Sao_Paulo",
  }).format(date);
  const time = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(date);
  return `${day.replaceAll(".", "")} · ${time}`;
}

function formatSyncDate(value: string | null) {
  if (!value) return "Aguardando primeira consulta";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Aguardando primeira consulta";
  return `Fontes consultadas em ${new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(date)}`;
}

function StoryCard({ article, index, compact = false }: { article: Article; index: number; compact?: boolean }) {
  return (
    <article className={`story-card${compact ? " story-card--compact" : ""}`}>
      <div className="story-card__top">
        <span className="story-card__category">{article.category}</span>
        <span className="story-card__index">{String(index + 1).padStart(2, "0")}</span>
      </div>
      <div className="story-card__content">
        <p className="story-card__location"><MapPin size={13} strokeWidth={2} /> {article.city || article.area}</p>
        <h3>
          <a href={article.originalUrl} target="_blank" rel="noopener noreferrer">
            {article.title}
            <span className="sr-only"> (abre a notícia original em nova aba)</span>
          </a>
        </h3>
        <p className="story-card__summary">{article.summary}</p>
      </div>
      <div className="story-card__bottom">
        <a href={article.sourceUrl} target="_blank" rel="noopener noreferrer" className="story-card__source">
          <span className="story-card__source-dot" /> {article.sourceName}
        </a>
        <span className="story-card__date">{formatStoryDate(article.publishedAt)}</span>
        <a
          href={article.originalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="story-card__outbound"
          aria-label={`Ler ${article.title} na fonte original`}
        >
          <ArrowUpRight size={17} strokeWidth={1.8} />
        </a>
      </div>
    </article>
  );
}

export default function Newsroom({
  initialArticles,
  lastSyncAt: initialLastSyncAt,
  databaseReady,
  aiEnabled: initialAiEnabled,
  editionDate,
}: NewsroomProps) {
  const [articles, setArticles] = useState(initialArticles);
  const [lastSyncAt, setLastSyncAt] = useState(initialLastSyncAt);
  const [hasAiEnabled, setHasAiEnabled] = useState(initialAiEnabled);
  const [isUpdating, setIsUpdating] = useState(false);
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeCity, setActiveCity] = useState("Toda a região");
  const [localVisible, setLocalVisible] = useState(6);
  const [activeCategory, setActiveCategory] = useState("Todas");
  const [activeArea, setActiveArea] = useState("Todas as regiões");
  const [query, setQuery] = useState("");
  const [stateVisible, setStateVisible] = useState(8);
  const syncLock = useRef(false);
  const autoSyncStarted = useRef(false);

  const localArticles = useMemo(
    () => articles.filter((article) => article.area === "Região dos Lagos"),
    [articles],
  );
  const cityArticles = useMemo(
    () => localArticles.filter((article) => activeCity === "Toda a região" || article.city === activeCity),
    [localArticles, activeCity],
  );
  const stateArticles = useMemo(() => {
    const term = query.toLocaleLowerCase("pt-BR").trim();
    return articles.filter((article) => {
      if (activeCategory !== "Todas" && article.category !== activeCategory) return false;
      if (activeArea !== "Todas as regiões" && article.area !== activeArea) return false;
      if (!term) return true;
      return `${article.title} ${article.summary} ${article.sourceName} ${article.city || ""} ${article.area}`
        .toLocaleLowerCase("pt-BR")
        .includes(term);
    });
  }, [articles, activeCategory, activeArea, query]);

  const updateNews = useCallback(async () => {
    if (syncLock.current) return;
    syncLock.current = true;
    setIsUpdating(true);
    setNotice(null);

    try {
      const response = await fetch("/api/news/sync", { method: "POST" });
      const result = (await response.json()) as {
        inserted?: number;
        sourcesChecked?: number;
        aiEnabled?: boolean;
        errors?: string[];
        error?: string;
        syncedAt?: string;
      };
      if (!response.ok && response.status !== 429) {
        throw new Error(result.error || "Não foi possível consultar as fontes agora.");
      }

      const newsResponse = await fetch("/api/news", { cache: "no-store" });
      if (newsResponse.ok) {
        const data = (await newsResponse.json()) as { articles: Article[] };
        setArticles(data.articles);
      }

      if (response.status === 429) {
        setNotice({ text: "Uma consulta já foi feita há instantes. As notícias exibidas são as mais recentes disponíveis.", error: false });
      } else {
        setLastSyncAt(result.syncedAt || new Date().toISOString());
        setHasAiEnabled(Boolean(result.aiEnabled));
        if (result.errors?.length) {
          setNotice({ text: `Consulta parcial: ${result.sourcesChecked ?? 0} feeds disponíveis. Algumas fontes não responderam.`, error: false });
        } else {
          setNotice({ text: `Fontes consultadas. ${result.inserted ?? 0} nova(s) referência(s) adicionada(s).`, error: false });
        }
      }
    } catch (error) {
      setNotice({ text: error instanceof Error ? error.message : "Falha na atualização. Tente novamente.", error: true });
    } finally {
      syncLock.current = false;
      setIsUpdating(false);
    }
  }, []);

  useEffect(() => {
    if (!databaseReady || autoSyncStarted.current) return;
    const last = initialLastSyncAt ? new Date(initialLastSyncAt).getTime() : 0;
    if (last && Date.now() - last < 15 * 60 * 1000) return;
    const timer = window.setTimeout(() => {
      if (!autoSyncStarted.current) {
        autoSyncStarted.current = true;
        void updateNews();
      }
    }, 950);
    return () => window.clearTimeout(timer);
  }, [databaseReady, initialLastSyncAt, updateNews]);

  function chooseCategory(category: string) {
    setActiveCategory(category);
    setStateVisible(8);
    setMobileMenuOpen(false);
    document.getElementById("estado")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function chooseArea(area: string) {
    setActiveArea(area);
    setStateVisible(8);
    document.getElementById("estado")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const latestStory = articles[0];

  return (
    <div className="site-shell" id="inicio">
      <div className="utility-bar">
        <div className="container utility-bar__inner">
          <span className="utility-bar__place"><MapPin size={12} /> REGIÃO DOS LAGOS <span className="utility-bar__separator">/</span> RIO DE JANEIRO</span>
          <span className="utility-bar__date">{editionDate} <span className="utility-bar__dot">•</span> EDIÇÃO DIGITAL</span>
        </div>
      </div>

      <header className="masthead">
        <div className="container masthead__inner">
          <Brand />
          <div className="masthead__right">
            <div className="masthead__signature"><span className="masthead__signature-line" /> DE OLHO NO QUE IMPORTA.<br />PERTO DE VOCÊ.</div>
            <button className="masthead__refresh" onClick={updateNews} disabled={isUpdating || !databaseReady} aria-label="Atualizar notícias">
              <RefreshCw size={16} className={isUpdating ? "spin-icon" : ""} />
              <span>{isUpdating ? "Consultando..." : "Atualizar notícias"}</span>
            </button>
          </div>
          <button
            className="mobile-menu-toggle"
            type="button"
            aria-label={mobileMenuOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((value) => !value)}
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>

      <nav className={`topic-nav${mobileMenuOpen ? " topic-nav--open" : ""}`} aria-label="Navegação principal">
        <div className="container topic-nav__inner">
          <a href="#inicio" className="topic-nav__link topic-nav__link--home" onClick={() => setMobileMenuOpen(false)}>Início</a>
          <a href="#regiao" className="topic-nav__link topic-nav__link--local" onClick={() => setMobileMenuOpen(false)}>Região dos Lagos</a>
          <a href="#estado" className="topic-nav__link" onClick={() => setMobileMenuOpen(false)}>Todo o RJ</a>
          <span className="topic-nav__divider" />
          {["Política", "Segurança", "Economia", "Cultura", "Esportes"].map((category) => (
            <button
              type="button"
              key={category}
              onClick={() => chooseCategory(category)}
              className={`topic-nav__link${activeCategory === category ? " topic-nav__link--selected" : ""}`}
            >
              {category}
            </button>
          ))}
          <Link href="/transparencia" className="topic-nav__link topic-nav__about" onClick={() => setMobileMenuOpen(false)}>Sobre nós</Link>
        </div>
      </nav>

      <div className="radar-strip">
        <div className="container radar-strip__inner">
          <span className="radar-strip__badge"><span className="radar-strip__pulse" /> NO RADAR</span>
          {latestStory ? (
            <a href={latestStory.originalUrl} target="_blank" rel="noopener noreferrer" className="radar-strip__headline">
              <span>{latestStory.title}</span><ArrowUpRight size={14} />
            </a>
          ) : (
            <span className="radar-strip__headline">Acompanhando as notícias da Região dos Lagos e de todo o estado do Rio.</span>
          )}
          <span className="radar-strip__status"><Clock3 size={13} /> {formatSyncDate(lastSyncAt)}</span>
        </div>
      </div>

      <main>
        <section className="container hero" aria-labelledby="hero-title">
          <div className="hero-cover">
            <Image
              src="/images/regiao-dos-lagos-rj.jpg"
              alt="Imagem ilustrativa do litoral de águas azuis da Região dos Lagos, Rio de Janeiro"
              fill
              priority
              sizes="(max-width: 850px) 100vw, 66vw"
              className="hero-cover__image"
            />
            <div className="hero-cover__shade" />
            <div className="hero-cover__top">
              <span><span className="hero-cover__top-square" /> NOSSA REGIÃO, NOSSA HISTÓRIA</span>
              <span>RIO DE JANEIRO · BRASIL</span>
            </div>
            <div className="hero-cover__content">
              <p className="hero-cover__eyebrow">NOTÍCIAS DA REGIÃO DOS LAGOS</p>
              <h1 id="hero-title">De onde a gente vive<br /><em>para todo o Rio.</em></h1>
              <p className="hero-cover__description">As histórias que nascem perto de você. E o que acontece em cada canto do nosso estado.</p>
              <a href="#regiao" className="hero-cover__cta">Acompanhar a região <ArrowRight size={17} /></a>
            </div>
            <span className="hero-cover__caption">IMAGEM ILUSTRATIVA · LITORAL FLUMINENSE</span>
          </div>

          <aside className="hero-digest" aria-labelledby="digest-title">
            <div className="hero-digest__header">
              <span className="eyebrow"><span className="eyebrow__dash" /> ACONTECE POR AQUI</span>
              <span className="hero-digest__number">01 / 03</span>
            </div>
            <h2 id="digest-title">Agora na <em>região.</em></h2>
            {localArticles.length > 0 ? (
              <div className="digest-list">
                {localArticles.slice(0, 3).map((article, index) => (
                  <article className="digest-item" key={article.id}>
                    <span className="digest-item__number">{String(index + 1).padStart(2, "0")}</span>
                    <div>
                      <span className="digest-item__meta">{article.city || "Região dos Lagos"} <span>·</span> {article.category}</span>
                      <h3><a href={article.originalUrl} target="_blank" rel="noopener noreferrer">{article.title}</a></h3>
                      <span className="digest-item__source">{article.sourceName} · {formatStoryDate(article.publishedAt)}</span>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="digest-empty">
                <Waves size={27} strokeWidth={1.4} />
                <p>{isUpdating ? "Consultando os feeds da região..." : "O radar local está pronto. As primeiras notícias aparecem após a consulta das fontes."}</p>
                <button onClick={updateNews} disabled={isUpdating || !databaseReady}>Consultar fontes <ArrowRight size={15} /></button>
              </div>
            )}
            <a className="hero-digest__footer" href="#regiao">Ver toda a cobertura local <ArrowUpRight size={17} /></a>
          </aside>
        </section>

        <div className="container coverage-strip" aria-label="Sobre a cobertura">
          <div className="coverage-strip__item"><span className="coverage-strip__icon"><MapPin size={19} /></span><span><strong>Raiz na região</strong><small>De Cabo Frio a Saquarema e além.</small></span></div>
          <div className="coverage-strip__item"><span className="coverage-strip__icon"><Globe2 size={19} /></span><span><strong>Olhar para o estado</strong><small>Da capital ao interior fluminense.</small></span></div>
          <div className="coverage-strip__item"><span className="coverage-strip__icon"><ShieldCheck size={19} /></span><span><strong>Fonte em primeiro lugar</strong><small>Crédito claro. Link direto. Sempre.</small></span></div>
        </div>

        {notice && (
          <div className={`container notice${notice.error ? " notice--error" : ""}`} role="status">
            {notice.error ? <X size={16} /> : <Check size={16} />}
            <span>{notice.text}</span>
            <button onClick={() => setNotice(null)} aria-label="Fechar aviso"><X size={15} /></button>
          </div>
        )}

        <section className="container local-section" id="regiao" aria-labelledby="local-title">
          <div className="section-heading">
            <div>
              <span className="section-kicker"><span>01</span> / NOSSO TERRITÓRIO</span>
              <h2 id="local-title">Região dos <em>Lagos.</em></h2>
              <p>Um olhar atento para as cidades e pessoas que fazem parte da nossa casa.</p>
            </div>
            <span className="section-heading__count">{localArticles.length} notícias da região <Waves size={18} /></span>
          </div>

          <div className="city-bar" aria-label="Filtrar notícias por cidade">
            <div className="city-bar__label"><Compass size={17} /> ESCOLHA SUA CIDADE</div>
            <div className="city-bar__scroll">
              {["Toda a região", ...REGION_CITIES].map((city) => (
                <button
                  key={city}
                  className={`city-chip${activeCity === city ? " city-chip--active" : ""}`}
                  onClick={() => { setActiveCity(city); setLocalVisible(6); }}
                  aria-pressed={activeCity === city}
                >
                  {city}
                </button>
              ))}
            </div>
          </div>

          {!databaseReady ? (
            <div className="empty-state"><Compass size={31} /><h3>Não foi possível acessar o arquivo.</h3><p>Tente novamente em alguns instantes. A conexão com o banco de notícias está temporariamente indisponível.</p></div>
          ) : cityArticles.length ? (
            <>
              <div className="local-grid">
                {cityArticles.slice(0, localVisible).map((article, index) => <StoryCard article={article} index={index} key={article.id} />)}
              </div>
              {cityArticles.length > localVisible && (
                <button className="load-more" onClick={() => setLocalVisible((count) => count + 6)}>Carregar mais da região <ArrowRight size={16} /></button>
              )}
            </>
          ) : (
            <div className="empty-state">
              <Waves size={33} strokeWidth={1.5} />
              <h3>{activeCity === "Toda a região" ? "Nossa cobertura está chegando." : `Ainda não há notícias de ${activeCity}.`}</h3>
              <p>{activeCity === "Toda a região" ? "Estamos consultando os feeds públicos da região. Os títulos aparecerão aqui com o devido crédito à fonte." : "Selecione outra cidade ou acompanhe as atualizações das fontes regionais."}</p>
              {activeCity !== "Toda a região" ? (
                <button onClick={() => setActiveCity("Toda a região")}>Ver toda a região <ArrowRight size={15} /></button>
              ) : (
                <button onClick={updateNews} disabled={isUpdating || !databaseReady}>{isUpdating ? "Consultando..." : "Consultar agora"} <RefreshCw size={15} /></button>
              )}
            </div>
          )}
        </section>

        <section className="state-section" id="estado" aria-labelledby="state-title">
          <div className="container">
            <div className="section-heading section-heading--state">
              <div>
                <span className="section-kicker"><span>02</span> / O ESTADO EM PAUTA</span>
                <h2 id="state-title">O Rio por <em>inteiro.</em></h2>
                <p>Capital, Baixada, Serra, Norte e Costa Verde. Encontre o que importa por assunto e região.</p>
              </div>
              <span className="section-heading__count">{articles.length} notícias no radar <Globe2 size={18} /></span>
            </div>

            <div className="state-filters">
              <div className="category-tabs" role="group" aria-label="Selecionar editoria">
                {CATEGORIES.map((category) => (
                  <button
                    key={category}
                    className={`category-tab${activeCategory === category ? " category-tab--active" : ""}`}
                    onClick={() => { setActiveCategory(category); setStateVisible(8); }}
                    aria-pressed={activeCategory === category}
                  >
                    {category}
                  </button>
                ))}
              </div>
              <div className="search-row">
                <label className="search-box">
                  <Search size={18} strokeWidth={1.7} />
                  <input
                    type="search"
                    value={query}
                    onChange={(event) => { setQuery(event.target.value); setStateVisible(8); }}
                    placeholder="Buscar por assunto, cidade ou fonte..."
                    aria-label="Buscar notícias do Rio de Janeiro"
                  />
                </label>
                <label className="area-select">
                  <MapPin size={17} strokeWidth={1.8} />
                  <span className="sr-only">Filtrar por região do estado</span>
                  <select value={activeArea} onChange={(event) => { setActiveArea(event.target.value); setStateVisible(8); }}>
                    {STATE_AREAS.map((area) => <option value={area} key={area}>{area}</option>)}
                  </select>
                  <ChevronDown size={16} className="area-select__chevron" />
                </label>
                <span className="search-row__count">{stateArticles.length} resultados</span>
              </div>
            </div>

            <div className="state-layout">
              <div className="state-layout__main">
                {!databaseReady ? (
                  <div className="empty-state"><Globe2 size={31} /><h3>O arquivo está temporariamente indisponível.</h3><p>Volte em instantes para acompanhar o noticiário fluminense.</p></div>
                ) : stateArticles.length ? (
                  <>
                    <div className="state-grid">
                      {stateArticles.slice(0, stateVisible).map((article, index) => (
                        <StoryCard article={article} index={index} compact key={article.id} />
                      ))}
                    </div>
                    {stateArticles.length > stateVisible && (
                      <button className="load-more" onClick={() => setStateVisible((count) => count + 8)}>Mostrar mais notícias <ArrowRight size={16} /></button>
                    )}
                  </>
                ) : (
                  <div className="empty-state">
                    <Search size={31} strokeWidth={1.5} />
                    <h3>{articles.length ? "Nenhuma notícia encontrada." : "O noticiário do estado está chegando."}</h3>
                    <p>{articles.length ? "Experimente outra editoria, região ou termo de busca." : "Os feeds do Rio de Janeiro serão consultados e as referências aparecerão aqui automaticamente."}</p>
                    {articles.length ? (
                      <button onClick={() => { setActiveCategory("Todas"); setActiveArea("Todas as regiões"); setQuery(""); }}>Limpar filtros <ArrowRight size={15} /></button>
                    ) : (
                      <button onClick={updateNews} disabled={isUpdating || !databaseReady}>{isUpdating ? "Consultando..." : "Consultar agora"} <RefreshCw size={15} /></button>
                    )}
                  </div>
                )}
              </div>

              <aside className="state-sidebar" aria-label="Regiões e fontes acompanhadas">
                <div className="sidebar-editorial">
                  <span className="sidebar-editorial__icon"><Sparkles size={19} /></span>
                  <span className="sidebar-editorial__eyebrow">NOSSA LINHA EDITORIAL</span>
                  <h3>A notícia é de quem <em>apurou.</em></h3>
                  <p>Reunimos referências de fontes públicas e veículos regionais. Sempre com crédito, contexto breve e caminho direto para a reportagem original.</p>
                  <Link href="/transparencia">Entenda como funciona <ArrowUpRight size={16} /></Link>
                  <span className="sidebar-editorial__wave" aria-hidden="true">≈</span>
                </div>

                <div className="sidebar-panel">
                  <div className="sidebar-panel__heading"><span>EXPLORE O ESTADO</span><Compass size={17} /></div>
                  {STATE_AREAS.slice(1).map((area) => (
                    <button key={area} onClick={() => chooseArea(area)} className="area-link">
                      <span>{area}</span><span>{articles.filter((article) => article.area === area).length.toString().padStart(2, "0")}</span>
                    </button>
                  ))}
                </div>

                <div className="sidebar-panel" id="fontes">
                  <div className="sidebar-panel__heading"><span>FONTES ACOMPANHADAS</span><ExternalLink size={16} /></div>
                  {PUBLICATIONS.map((publication) => (
                    <a key={publication.name} href={publication.url} target="_blank" rel="noopener noreferrer" className="source-link">
                      <span className="source-link__initial">{publication.name.slice(0, 1).toUpperCase()}</span>
                      <span><strong>{publication.name}</strong><small>{publication.description}</small></span>
                      <ArrowUpRight size={15} />
                    </a>
                  ))}
                  <p className="sidebar-panel__note">{FEED_CHANNELS.length} feeds consultados. A disponibilidade depende de cada publicação.</p>
                </div>
              </aside>
            </div>
          </div>
        </section>

        <section className="container closing-banner" aria-label="Compromisso editorial">
          <div className="closing-banner__mark"><Waves size={34} strokeWidth={1.3} /></div>
          <div><span>TRANSPARÊNCIA É PARTE DA NOTÍCIA</span><h2>Perto de você. Com respeito a quem informa.</h2><p>Sem cópias integrais: sínteses curtas, créditos visíveis e o link para ler a matéria na fonte.</p></div>
          <Link href="/transparencia">Conheça nosso compromisso <ArrowRight size={17} /></Link>
        </section>
      </main>

      <footer className="site-footer">
        <div className="container site-footer__top">
          <div className="site-footer__identity"><Brand light /><p>Da Região dos Lagos para todo o estado do Rio de Janeiro.<br />Um novo jeito de acompanhar o que acontece perto e longe de casa.</p></div>
          <div className="site-footer__column"><strong>EXPLORAR</strong><a href="#regiao">Região dos Lagos</a><a href="#estado">Todo o Rio</a><button onClick={() => chooseCategory("Cultura")}>Cultura</button><button onClick={() => chooseCategory("Segurança")}>Segurança</button></div>
          <div className="site-footer__column"><strong>O PORTAL</strong><Link href="/transparencia">Transparência editorial</Link><a href="#fontes">Fontes acompanhadas</a><button onClick={updateNews} disabled={isUpdating}>Atualizar notícias</button></div>
        </div>
        <div className="container site-footer__bottom"><span>© {new Date().getFullYear()} Lagos Hoje. Todos os direitos da marca reservados.</span><span>O conteúdo original pertence às respectivas fontes.</span><a href="#inicio">Voltar ao topo ↑</a></div>
      </footer>
    </div>
  );
}
