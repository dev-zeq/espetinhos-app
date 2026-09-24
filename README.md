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
