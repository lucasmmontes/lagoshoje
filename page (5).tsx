"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Edit3,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  MapPin,
  RefreshCw,
  Search,
  Shield,
  Tag,
  Trash2,
  XCircle,
} from "lucide-react";
import Brand from "@/components/Brand";
import { CATEGORIES, STATE_AREAS } from "@/lib/editorial";

type Article = {
  id: string;
  title: string;
  summary: string;
  category: string;
  area: string;
  city: string | null;
  sourceName: string;
  originalUrl: string;
  publishedAt: Date | string;
  createdAt: Date | string;
};

type Session = { id: string; email: string; name: string };

const EMPTY_FORM = {
  id: "",
  title: "",
  summary: "",
  category: "Cidades",
  area: "Região dos Lagos",
  city: "",
};

function ptDate(value: string | Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

export default function AdminPanel() {
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [areaFilter, setAreaFilter] = useState("Todas as regiões");
  const [categoryFilter, setCategoryFilter] = useState("Todas");
  const [feedback, setFeedback] = useState<{ text: string; error?: boolean } | null>(null);
  const [editing, setEditing] = useState<typeof EMPTY_FORM | null>(null);

  async function fetchSession() {
    try {
      const response = await fetch("/api/admin/auth", { cache: "no-store" });
      if (!response.ok) return;
    } catch {}
  }

  async function loadArticles() {
    if (!session) return;
    setIsLoading(true);
    setFeedback(null);
    const params = new URLSearchParams({ q: query, area: areaFilter, category: categoryFilter });
    try {
      const response = await fetch(`/api/admin/articles?${params.toString()}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Não foi possível carregar as notícias.");
      const data = (await response.json()) as { articles: Article[]; admin: Session };
      setArticles(data.articles);
      setSession(data.admin);
    } catch (error) {
      setFeedback({ text: error instanceof Error ? error.message : "Erro ao carregar notícias.", error: true });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoggingIn(true);
    setLoginError("");
    setFeedback(null);
    try {
      const response = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", email, password }),
      });
      const data = (await response.json()) as { error?: string; user?: Session };
      if (!response.ok || !data.user) {
        setLoginError(data.error || "E-mail ou senha inválidos.");
        return;
      }
      setSession(data.user);
      setEmail("");
      setPassword("");
      setEditing(null);
    } catch {
      setLoginError("Não foi possível entrar. Verifique a conexão e tente novamente.");
    } finally {
      setLoggingIn(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/admin/auth", { method: "POST", body: JSON.stringify({ action: "logout" }) });
    setSession(null);
    setArticles([]);
    setEditing(null);
    setPassword("");
  }

  async function refreshFeedSources() {
    setFeedback(null);
    try {
      const response = await fetch("/api/news/sync", { method: "POST" });
      const data = (await response.json()) as { inserted?: number; error?: string };
      if (!response.ok && response.status !== 429) throw new Error(data.error || "Falha ao atualizar fontes.");
      setFeedback({ text: data.inserted ? `${data.inserted} nova(s) referência(s) importada(s).` : "Fontes consultadas. Sem novas referências." });
      await loadArticles();
    } catch (error) {
      setFeedback({ text: error instanceof Error ? error.message : "Erro na atualização.", error: true });
    }
  }

  async function saveEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    setFeedback(null);
    const payload = {
      id: editing.id,
      title: editing.title,
      summary: editing.summary,
      category: editing.category,
      area: editing.area,
      city: editing.city?.trim() || null,
    };
    try {
      const response = await fetch("/api/admin/articles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { error?: string; article?: Article };
      if (!response.ok) throw new Error(data.error || "Erro ao salvar alteração.");
      if (data.article) {
        setArticles((current) => current.map((item) => item.id === data.article!.id ? data.article! : item));
      }
      setEditing(null);
      setFeedback({ text: "Notícia atualizada com sucesso." });
    } catch (error) {
      setFeedback({ text: error instanceof Error ? error.message : "Falha ao salvar.", error: true });
    }
  }

  async function deleteArticle(id: string) {
    setFeedback(null);
    const confirmed = window.confirm("Deseja remover esta notícia do portal?");
    if (!confirmed) return;
    try {
      const response = await fetch(`/api/admin/articles?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Não foi possível excluir.");
      setArticles((current) => current.filter((article) => article.id !== id));
      setFeedback({ text: "Notícia removida do portal." });
    } catch (error) {
      setFeedback({ text: error instanceof Error ? error.message : "Erro na exclusão.", error: true });
    }
  }

  useEffect(() => { void fetchSession(); }, []);
  useEffect(() => {
    if (session) void loadArticles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, areaFilter, categoryFilter]);

  const citiesByArea = useMemo(() => {
    return editing?.area === "Região dos Lagos"
      ? ["Cabo Frio", "Arraial do Cabo", "Búzios", "São Pedro da Aldeia", "Araruama", "Saquarema", "Iguaba Grande", "Rio das Ostras", "Silva Jardim", "Casimiro de Abreu"]
      : [];
  }, [editing?.area]);

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <div className="admin-header__inner">
          <div className="admin-header__brand">
            <Brand compact />
            <div>
              <span className="admin-header__kicker">ACESSO RESTRITO</span>
              <strong>Painel administrativo</strong>
            </div>
          </div>
          {session && (
            <div className="admin-header__actions">
              <button onClick={refreshFeedSources} type="button" className="ghost-button">
                <RefreshCw size={15} /> Atualizar fontes
              </button>
              <div className="admin-header__session">
                <Shield size={16} /> <span>{session.name}</span>
              </div>
              <button onClick={handleLogout} type="button" className="ghost-button ghost-button--danger">
                <LogOut size={15} /> Sair
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="admin-main">
        {!session ? (
          <section className="login-panel">
            <div className="login-panel__card">
              <div className="login-panel__icon"><LayoutDashboard size={24} /></div>
              <p className="login-panel__eyebrow">LOGIN OCULTO</p>
              <h1>Entrada da redação</h1>
              <p className="login-panel__description">
                Este endereço não é exibido publicamente. Use as credenciais administrativas configuradas no servidor.
              </p>
              <form onSubmit={handleLogin} className="login-form">
                <label>
                  <span>E-mail</span>
                  <input
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </label>
                <label>
                  <span>Senha</span>
                  <input
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </label>
                {loginError ? <p className="form-error"><XCircle size={15} /> {loginError}</p> : null}
                <button type="submit" disabled={loggingIn}>
                  {loggingIn ? "Entrando..." : "Entrar no painel"} <ArrowRight size={16} />
                </button>
              </form>
              <Link href="/" className="login-panel__back">← Voltar para o portal público</Link>
            </div>
          </section>
        ) : (
          <section className="dashboard">
            <div className="dashboard__hero">
              <div>
                <span className="dashboard__eyebrow">ÁREA INTERNA</span>
                <h1>Gerencie as notícias importadas</h1>
                <p>Corrija títulos, ajuste editorias, refine a cidade ou região e remova publicações que não devem permanecer no portal.</p>
              </div>
              <div className="dashboard__stats">
                <div><strong>{articles.length}</strong><span>registros exibidos</span></div>
                <div><strong>{CATEGORIES.length - 1}</strong><span>editorias</span></div>
                <div><strong>{STATE_AREAS.length - 1}</strong><span>regiões</span></div>
              </div>
            </div>

            {feedback ? (
              <div className={`admin-banner${feedback.error ? " admin-banner--error" : ""}`}>
                {feedback.error ? <XCircle size={17} /> : <CheckCircle2 size={17} />}
                {feedback.text}
              </div>
            ) : null}

            <div className="dashboard__toolbar">
              <label className="toolbar-search">
                <Search size={16} />
                <input
                  type="search"
                  placeholder="Buscar por título, fonte ou cidade..."
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
              <label className="toolbar-select">
                <MapPin size={16} />
                <select value={areaFilter} onChange={(event) => setAreaFilter(event.target.value)}>
                  {STATE_AREAS.map((area) => <option key={area} value={area}>{area}</option>)}
                </select>
              </label>
              <label className="toolbar-select">
                <Tag size={16} />
                <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                  {CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
                </select>
              </label>
              <button onClick={loadArticles} type="button" className="toolbar-button">
                <RefreshCw size={15} className={isLoading ? "spin-icon" : ""} /> Atualizar
              </button>
            </div>

            <div className="articles-table-wrap">
              <table className="articles-table">
                <thead>
                  <tr>
                    <th>Notícia</th>
                    <th>Classificação</th>
                    <th>Fonte / data</th>
                    <th className="col-shrink">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {articles.map((article) => (
                    <tr key={article.id}>
                      <td className="col-title">
                        <a href={article.originalUrl} target="_blank" rel="noopener noreferrer" className="article-title-link">
                          {article.title}
                          <ExternalLink size={13} />
                        </a>
                        <p className="article-summary">{article.summary}</p>
                      </td>
                      <td>
                        <div className="table-chips"><span className="table-chip table-chip--category">{article.category}</span><span className="table-chip table-chip--area">{article.area}</span></div>
                        {article.city ? <p className="table-city"><MapPin size={13} /> {article.city}</p> : <p className="table-city table-city--muted">Sem cidade específica</p>}
                      </td>
                      <td>
                        <strong>{article.sourceName}</strong>
                        <span>{ptDate(article.publishedAt)}</span>
                      </td>
                      <td className="col-actions">
                        <button type="button" onClick={() => setEditing({ id: article.id, title: article.title, summary: article.summary, category: article.category, area: article.area, city: article.city ?? "" })}>
                          <Edit3 size={15} /> Editar
                        </button>
                        <button type="button" className="danger" onClick={() => deleteArticle(article.id)}>
                          <Trash2 size={15} /> Remover
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!articles.length && !isLoading ? (
                    <tr><td colSpan={4} className="empty-table">Nenhuma notícia encontrada com os filtros atuais.</td></tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>

      {editing ? (
        <div className="modal-backdrop" onClick={() => setEditing(null)} role="dialog" aria-modal="true">
          <form className="edit-modal" onSubmit={saveEdit} onClick={(event) => event.stopPropagation()}>
            <div className="edit-modal__header">
              <div>
                <span className="edit-modal__eyebrow">EDIÇÃO RÁPIDA</span>
                <h2>Ajustar notícia</h2>
              </div>
              <button type="button" onClick={() => setEditing(null)} className="modal-close" aria-label="Fechar edição">
                <XCircle size={20} />
              </button>
            </div>

            <label>
              <span>Título</span>
              <input required value={editing.title} maxLength={240} onChange={(event) => setEditing({ ...editing, title: event.target.value })} />
            </label>
            <label>
              <span>Síntese exibida no portal</span>
              <textarea required rows={4} value={editing.summary} maxLength={420} onChange={(event) => setEditing({ ...editing, summary: event.target.value })} />
            </label>
            <div className="edit-modal__grid">
              <label>
                <span>Editoria</span>
                <select value={editing.category} onChange={(event) => setEditing({ ...editing, category: event.target.value })}>
                  {CATEGORIES.filter((item) => item !== "Todas").map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
              <label>
                <span>Região</span>
                <select value={editing.area} onChange={(event) => setEditing({ ...editing, area: event.target.value, city: event.target.value === "Região dos Lagos" ? editing.city : "" })}>
                  {STATE_AREAS.filter((item) => item !== "Todas as regiões").map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
              <label className={citiesByArea.length ? "" : "field-disabled"}>
                <span>Cidade (apenas Região dos Lagos)</span>
                <select
                  value={editing.city || ""}
                  disabled={!citiesByArea.length}
                  onChange={(event) => setEditing({ ...editing, city: event.target.value })}
                >
                  <option value="">Sem cidade específica</option>
                  {citiesByArea.map((city) => <option key={city} value={city}>{city}</option>)}
                </select>
              </label>
            </div>
            <div className="edit-modal__footer">
              <button type="button" onClick={() => setEditing(null)} className="ghost-button">Cancelar</button>
              <button type="submit" className="primary-button">Salvar alterações <CheckCircle2 size={16} /></button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
