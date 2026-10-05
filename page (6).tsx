import type { Metadata } from "next";
import Link from "next/link";
import Brand from "@/components/Brand";
import { FEED_CHANNELS } from "@/lib/editorial";

export const metadata: Metadata = {
  title: "Transparência editorial e direitos",
  description:
    "Como o Lagos Hoje acompanha a Região dos Lagos e o estado do Rio de Janeiro com créditos às fontes e respeito aos direitos autorais.",
};

export default function TransparencyPage() {
  const editorialContact = process.env.EDITORIAL_CONTACT;

  return (
    <div className="policy-shell">
      <header className="policy-header">
        <div className="container policy-header__inner">
          <Brand />
          <Link className="policy-back" href="/">← Voltar ao portal</Link>
        </div>
      </header>

      <main className="policy-main">
        <p className="eyebrow"><span className="eyebrow__dash" /> O JEITO LAGOS HOJE DE INFORMAR</p>
        <h1>Transparência<br /><em>em cada notícia.</em></h1>
        <p className="policy-intro">
          O Lagos Hoje acompanha a Região dos Lagos e também acontecimentos de todo o estado do Rio de Janeiro. Nosso portal reúne referências e caminhos para a informação original. Não substituímos o trabalho dos veículos que apuraram e publicaram cada notícia.
        </p>

        <div className="policy-highlight">
          <strong>Crédito não é licença:</strong> indicar a fonte e inserir um link não autoriza, por si só, a reprodução de textos, fotos ou vídeos. As condições de uso de cada publicação devem ser verificadas antes da operação comercial do portal; quando necessário, é preciso obter autorização dos titulares.
        </div>

        <section className="policy-section">
          <h2>O que entra no portal</h2>
          <p>Consultamos feeds RSS públicos configurados e armazenamos somente o título, o link, a data, o nome da publicação e classificações editoriais. Não baixamos fotografias das reportagens, não copiamos seus textos integrais e não guardamos os corpos de artigos ou descrições longas dos feeds. A imagem de abertura do portal é ilustrativa e não representa uma notícia específica.</p>
          <p>Cada cartão mostra o veículo de origem e direciona o leitor para a matéria no site que a publicou. A responsabilidade pelo conteúdo original e por suas atualizações permanece com a fonte.</p>
        </section>

        <section className="policy-section">
          <h2>Inteligência artificial e sínteses</h2>
          <p>Se houver uma chave de IA configurada, enviamos ao modelo somente o título, a editoria, a região e o nome da fonte para produzir uma síntese curta e original em português brasileiro. O modelo não recebe nem lê a matéria completa. Ele é instruído a não criar fatos, números ou declarações ausentes do título.</p>
          <p>Sem IA disponível, exibimos uma ficha informativa baseada nesses metadados, e não um resumo da reportagem. A classificação automática e as sínteses podem conter erros; para conhecer os fatos e o contexto, consulte sempre o texto original.</p>
        </section>

        <section className="policy-section">
          <h2>Cidades, regiões e editorias</h2>
          <p>O foco local inclui cidades como Cabo Frio, Arraial do Cabo, Búzios, São Pedro da Aldeia, Araruama, Saquarema, Iguaba Grande e Rio das Ostras. A cobertura estadual organiza notícias da capital e Grande Rio, Baixada Fluminense, Região Serrana, Norte Fluminense, Sul Fluminense e Costa Verde.</p>
          <p>Uma notícia é classificada a partir do título, do endereço original e do canal RSS. Por isso, alguns itens podem aparecer em outra editoria ou região, especialmente notícias compartilhadas por mais de um canal. Links são deduplicados e referências identificadas como conteúdo publicitário são descartadas na ingestão.</p>
        </section>

        <section className="policy-section">
          <h2>Feeds atualmente acompanhados</h2>
          <ul className="policy-source-list">
            {FEED_CHANNELS.map((source) => (
              <li key={source.feedUrl}>
                <strong>{source.name} — {source.label}.</strong>{" "}
                <a href={source.siteUrl} target="_blank" rel="noopener noreferrer">Visitar publicação</a>{" · "}
                <a href={source.feedUrl} target="_blank" rel="noopener noreferrer">Ver feed RSS</a>.
              </li>
            ))}
          </ul>
          <p>A presença nesta lista não significa parceria ou licença concedida pelos veículos. Feeds e condições de uso podem mudar sem aviso.</p>
        </section>

        <section className="policy-section">
          <h2>Correções e pedidos de remoção</h2>
          <p>Se você representa uma fonte, encontrou uma classificação incorreta ou deseja pedir a retirada de uma referência, informe o link da matéria e o motivo do pedido. A equipe responsável deve analisar e corrigir ou remover o registro quando apropriado.</p>
          {editorialContact ? (
            <p>Contato editorial: <a href={`mailto:${editorialContact}`}>{editorialContact}</a>.</p>
          ) : (
            <p><strong>Contato editorial ainda não configurado.</strong> Antes de publicar o portal comercialmente, defina a variável de ambiente EDITORIAL_CONTACT.</p>
          )}
        </section>

        <section className="policy-section">
          <h2>Atualização das fontes</h2>
          <p>Quando a última consulta tem mais de 15 minutos, a página pode solicitar uma atualização em segundo plano. O botão “Atualizar notícias” faz a mesma consulta. Para manter o noticiário atualizado mesmo sem visitantes, é possível agendar chamadas POST a <code>/api/news/sync</code> com <code>Authorization: Bearer &lt;CRON_SECRET&gt;</code>. A chave deve permanecer no servidor.</p>
          <p>O funcionamento depende da disponibilidade dos feeds e dos serviços de IA, quando utilizados. Automatização não equivale a apuração jornalística humana: a operação precisa de acompanhamento editorial e respeito às condições das fontes.</p>
        </section>
      </main>

      <footer className="policy-footer">Lagos Hoje · Região dos Lagos e Rio de Janeiro · Informação com crédito e respeito à autoria</footer>
    </div>
  );
}
