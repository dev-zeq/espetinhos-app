# Espetinho App

PWA simples para registrar vendas, despesas e consultar o caixa de um pequeno comércio de espetinhos. Interface pensada para um casal com pouca familiaridade com tecnologia: poucos toques, botões grandes e textos legíveis.

## 00 — Preparação (24/09/2026)

- Repositório: `dev-zeq/espetinhos-app`.
- Organização Supabase: **Espetinhos** (plano Free).
- Projeto Supabase: **Espetinho App**, ID `twwnxrdohjozeayyxiwu`, região São Paulo (`sa-east-1`).
- Painel: https://supabase.com/dashboard/project/twwnxrdohjozeayyxiwu
- URL pública da API: `https://twwnxrdohjozeayyxiwu.supabase.co`.
- Custo informado na criação: **0 por mês** no plano Free. Projetos gratuitos podem pausar por inatividade.
- Estado verificado: `ACTIVE_HEALTHY`; nenhuma tabela do aplicativo no esquema `public`.
- Administração da infraestrutura: pela conta conectada à organização Supabase. O login do casal será definido nas etapas de autenticação e entrega.
- Identidade visual inicial: fundo creme claro, destaque laranja quente e texto grafite escuro; contraste, botões grandes e leitura fácil.
- Cardápio inicial: categorias **Espetinhos** e **Bebidas**; produtos e preços editáveis pelo painel.
- Pagamentos: Pix, dinheiro e cartão.

Nenhuma chave secreta ou senha deve ser versionada. As tabelas, regras de acesso e autenticação do aplicativo ficam para o módulo 01. A instalação do PWA no celular fica para os módulos 07 e 09. Produtos e preços reais serão cadastrados depois.

## 02 — Tela Venda

Abra `index.html` em um servidor HTTPS e entre com o usuário do estabelecimento (Supabase Auth, e-mail e senha). A tela lista somente produtos ativos das categorias Espetinhos e Bebidas, lidos de `produtos`. O catálogo está vazio até o cadastro dos produtos reais. A seleção de pagamento usa os registros ativos de `formas_pagamento`.

Toque no produto para somar uma unidade; corrija no resumo com `+`, `−` ou remover. **Cancelar venda** limpa somente a venda atual. **Finalizar venda** chama `registrar_venda`, que valida o usuário, o pagamento e os produtos, calcula preços atuais no banco e insere venda e itens em uma única transação. Falha em qualquer etapa desfaz toda a gravação e conserva o carrinho na tela. Após sucesso, a tela fica pronta para outra venda.

A função está em `supabase/migrations/20260924130000_modulo_02_registrar_venda.sql`. Apenas `authenticated` pode executá-la; ela usa as políticas RLS do módulo 01. O módulo 02 não publica o PWA nem cria o usuário final; essas etapas permanecem nos módulos planejados. Para testar localmente, sirva a pasta com `python3 -m http.server 8000` e abra `http://localhost:8000`.

## 03 — Caixa

A navegação **Venda / Caixa** usa a mesma sessão. O Caixa mostra vendas, despesas e resultado do dia; agrupa os recebimentos em Pix, Dinheiro e Cartão e lista as vendas recentes. Toque numa venda para consultar os produtos e quantidades. Para corrigir uma venda, cancele com confirmação e registre uma nova pela tela Venda. A exclusão usa a política RLS de `vendas` e remove os itens em cascata na mesma operação; o Caixa é atualizado após sucesso.

“Hoje” segue `America/Sao_Paulo`, inclusive no filtro de instantes `vendida_em`. As despesas existentes são lidas pela coluna `data_despesa`, sem cadastro nesta etapa. A leitura pagina os registros para que o total não dependa do limite padrão de linhas da API. Ainda não há produtos, despesas ou usuário final cadastrados; essas etapas permanecem nos módulos previstos.

## 04 — Despesas

A aba **Despesas** mostra o total gasto no dia e os lançamentos mais recentes. **Registrar gasto** pede somente descrição e valor; a data é preenchida pelo aplicativo conforme `America/Sao_Paulo` e o horário é registrado automaticamente pelo banco. O valor aceita formato brasileiro, como `25,50`, e é exibido em reais.

Cada gasto pode ser editado ou excluído com confirmação. Após criar, editar ou excluir, Despesas e Caixa são atualizados para refletir imediatamente **Gastou hoje** e **Resultado do dia**. O módulo reutiliza a tabela `despesas`, a autenticação e as políticas RLS do módulo 01; nenhuma estrutura de banco adicional foi criada.

## 05 — Produtos

A aba **Produtos** administra o cardápio sem alterar código ou acessar o Supabase. **Novo produto** pede somente nome, categoria e preço; o valor aceita formato brasileiro, como `10,00` e `12,50`. Os itens aparecem separados entre Espetinhos e Bebidas, com preço e situação visíveis.

É possível editar nome, categoria e preço, ativar ou desativar e ajustar a prioridade com **Subir** e **Descer**. A ordem usa a coluna existente `ordem`. Produtos inativos continuam cadastrados e preservam os itens históricos das vendas, mas deixam de aparecer imediatamente na Tela Venda. O módulo reutiliza a tabela `produtos`, a autenticação e as políticas RLS existentes; não permite exclusão física e não cria nova estrutura de banco.

## 06 — Resumo

A aba **Resumo** oferece os períodos Hoje, Semana e Mês. Para cada período, mostra Vendeu, Gastou e Resultado, calculado simplesmente como vendas menos despesas registradas no aplicativo. Semana significa a semana atual desde segunda-feira; Mês significa o mês calendário atual. Todos os limites respeitam `America/Sao_Paulo`.

**Mais vendidos** soma as quantidades registradas em `itens_venda` e usa `produto_nome`, preservando o histórico mesmo se um produto for editado ou desativado. **Formas de pagamento** separa os valores recebidos em Pix, Dinheiro e Cartão. A tela reutiliza as tabelas e políticas RLS existentes, não cria totais duplicados nem nova estrutura no banco.

## 07 — PWA e celular

O aplicativo inclui manifest, ícones comuns e maskable em 192 e 512 px e Service Worker. Em hospedagem HTTPS, o Android pode instalar o **Espetinho App** na tela inicial e abri-lo em modo standalone. O Service Worker guarda somente os arquivos essenciais da interface; leituras e gravações no Supabase continuam exigindo conexão.

Os arquivos principais usam rede primeiro, com o cache apenas como alternativa quando a rede falha. Cada nova versão deve incrementar a constante `CACHE` em `sw.js`; durante a ativação, caches antigos são removidos. Em telas pequenas, a navegação fica fixa na parte inferior, sem rolagem horizontal, e formulários e valores foram ajustados para a altura e largura disponíveis.

## 08 — Testes reais

O aplicativo foi publicado temporariamente por HTTPS no GitHub Pages e testado em um Android real como PWA instalado. Foram validados login, abertura pelo ícone, modo standalone, reabertura, atualização, navegação pelas cinco abas e comportamento sem internet. O aplicativo não registra vendas offline: ao perder conexão, o botão de finalização fica bloqueado e informa **Sem internet — não salva**; ao reconectar, o usuário recebe confirmação e pode tentar novamente com o carrinho preservado.

O fluxo completo validou vendas em Pix, Dinheiro e Cartão, quantidades e remoção de itens, cancelamento antes e depois da finalização, Caixa, detalhes, despesas com valor brasileiro, edição e exclusão, cadastro e edição de produtos, categoria, ativação, ordem e Resumo em Hoje, Semana e Mês. As conferências matemáticas passaram: a soma dos itens corresponde a cada venda, os pagamentos correspondem ao faturamento e `Vendas − Despesas = Resultado`.

O histórico também foi preservado após alterar nome e preço no catálogo. O teste real encontrou uma tela vazia causada pelo nome global `URL`, que conflitava com o construtor nativo usado pelo Supabase. A correção foi integrada pelo PR #3, junto do estado offline explícito e da atualização do cache do PWA. O RLS permanece ativo nas cinco tabelas. A função `registrar_venda` rejeita sessão ausente, pagamento inválido, venda vazia, quantidade inválida e produto inativo.
