# Lagos Hoje

Portal editorial da **Região dos Lagos, no estado do Rio de Janeiro**, com cobertura complementar de todo o RJ organizada por cidade, região e editoria. Identidade visual inspirada no manual enviado: azul-marinho `#081D33`, ciano `#00AEEF`, cinza `#F5F7F9` e vermelho `#E5232E`, com Cinzel, Playfair Display e Montserrat.

## Cobertura

- **Região dos Lagos:** filtro por Cabo Frio, Arraial do Cabo, Búzios, São Pedro da Aldeia, Araruama, Saquarema, Iguaba Grande, Rio das Ostras, Silva Jardim e Casimiro de Abreu.
- **Todo o Rio:** notícias da capital e Grande Rio, Baixada Fluminense, Região Serrana, Norte Fluminense, Sul Fluminense e Costa Verde.
- **Editorias:** Cidades, Política, Segurança, Economia, Saúde, Educação, Cultura, Turismo, Meio Ambiente, Esportes e Mobilidade.
- Pesquisa, filtros por área e cidade, leitura de RSS e atualização manual ou em segundo plano.

## Feeds configurados

- [RC24h — Região dos Lagos](https://rc24h.com.br/brasil/estado/regiao-dos-lagos/feed/)
- [RLagos Notícias — Região dos Lagos](https://rlagosnoticias.com.br/feed/)
- [g1 — Região dos Lagos](https://g1.globo.com/rss/g1/rj/regiao-dos-lagos/)
- [g1 — Rio de Janeiro](https://g1.globo.com/rss/g1/rj/rio-de-janeiro/)
- [g1 — Região Serrana](https://g1.globo.com/rss/g1/rj/regiao-serrana/)
- [g1 — Norte Fluminense](https://g1.globo.com/rss/g1/rj/norte-fluminense/)
- [g1 — Sul do Rio e Costa Verde](https://g1.globo.com/rss/g1/rj/sul-do-rio-costa-verde/)
- [Agência Brasil — últimas notícias](https://agenciabrasil.ebc.com.br/rss/ultimasnoticias/feed.xml), com seleção apenas de títulos explicitamente relacionados ao RJ.

A ingestão descarta publieditoriais identificáveis, valida o domínio das URLs, deduplica links e não importa corpos integrais, imagens ou descrições extensas dos artigos.

## IA, crédito e direitos

Cada cartão informa o veículo e abre a publicação original. Se `OPENAI_API_KEY` estiver configurada, a IA recebe **somente título, região e editoria** e cria uma síntese breve em português brasileiro; não recebe o texto da reportagem. Sem a chave, uma ficha editorial baseada em metadados é apresentada e identificada como tal.

Crédito e hiperlink **não substituem uma licença**. Verifique os termos de cada fonte e obtenha permissão quando necessário antes de explorar o portal comercialmente. A imagem da abertura é uma ilustração original e não representa um acontecimento noticioso. Consulte `/transparencia` no site.

## Variáveis de ambiente

- `DATABASE_URL`: conexão PostgreSQL do Drizzle.
- `OPENAI_API_KEY`: opcional, chave privada para sínteses pela Responses API da OpenAI.
- `OPENAI_MODEL`: opcional; padrão `gpt-4o-mini`.
- `CRON_SECRET`: segredo para chamadas de um agendador externo.
- `EDITORIAL_CONTACT`: e-mail público para correções e pedidos de remoção.
- `ADMIN_SESSION_SECRET`: segredo obrigatório para assinar a sessão do painel administrativo.
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME`: usados apenas para criar o primeiro administrador com `npm run create-admin`.

Não coloque segredos em variáveis `NEXT_PUBLIC_*`.

## Painel administrativo oculto

O portal **não exibe link público de login**. O acesso à redação é feito pelo endereço `/painel-lagos-admin`.

1. Defina `ADMIN_SESSION_SECRET` com um segredo forte em produção.
2. Execute `ADMIN_EMAIL='seu@email' ADMIN_PASSWORD='senha_forte_min_10' ADMIN_NAME='Seu nome' npm run create-admin` para criar ou atualizar o primeiro administrador.
3. Entre em `/painel-lagos-admin` com e-mail e senha.
4. No painel é possível:
   - consultar notícias importadas;
   - filtrar por região, editoria e busca;
   - editar título, síntese, editoria, região e cidade;
   - remover notícias que não devem permanecer;
   - disparar uma nova consulta aos feeds.

A sessão é mantida em cookie HttpOnly assinado com JWT. O painel não cria ou publica notícias originais diretamente: ele gerencia os registros agregados.

## Preparação

1. Instale dependências e aplique o esquema com `npx drizzle-kit push`.
2. Configure as variáveis de ambiente necessárias.
3. A primeira visita consulta os feeds em segundo plano se não houver atualização recente; o botão de atualização também consulta a rota `POST /api/news/sync`.
4. Para atualizar mesmo sem visitantes, agende um POST a `/api/news/sync` com `Authorization: Bearer <CRON_SECRET>`, por exemplo a cada 15 minutos.
5. A API `GET /api/news` aceita `category`, `area`, `city` e `q` como filtros opcionais.

Se este projeto estiver sendo atualizado da versão experimental de Lagos, Portugal, remova os registros antigos das fontes portuguesas depois de aplicar o esquema. Mantenha acompanhamento editorial e um canal de correção ativo em produção.
