const URL = 'https://twwnxrdohjozeayyxiwu.supabase.co';
const KEY = 'sb_publishable_bfs8ShD7RgQ61Cv2ikt2Bw_GfN1E2zk';
const db = supabase.createClient(URL, KEY, {db:{retry:false}});
const $ = id => document.getElementById(id);
const money = value => new Intl.NumberFormat('pt-BR', {style:'currency', currency:'BRL'}).format(value);
let produtos = [], pagamentos = [], carrinho = new Map(), pagamento = null, salvando = false, avisoTimer;
function avisar(texto) { const el=$('mensagem'); el.textContent=texto; el.hidden=false; clearTimeout(avisoTimer); avisoTimer=setTimeout(()=>el.hidden=true,3500); }
function renderProdutos() {
  for(const [categoria, id] of [['espetinho','espetinhos'],['bebida','bebidas']]) {
    const el=$(id); el.replaceChildren();
    for(const p of produtos.filter(p=>p.categoria===categoria)) {
      const b=document.createElement('button'); b.className='produto'; b.type='button';
      const nome=document.createElement('span'), preco=document.createElement('strong');
      nome.textContent=p.nome; preco.textContent=money(p.preco); b.append(nome,preco);
      b.addEventListener('click',()=>{if(salvando)return; carrinho.set(p.id,(carrinho.get(p.id)||0)+1);renderCarrinho();});el.append(b);
    }
  }
  $('catalogo-vazio').hidden=produtos.length!==0;
}
function renderCarrinho() {
  const el=$('itens');el.replaceChildren();let total=0;
  for(const [id,quantidade] of carrinho) {
    const p=produtos.find(p=>p.id===id);if(!p)continue;
    total+=Number(p.preco)*quantidade;
    const row=document.createElement('div');row.className='item';
    const info=document.createElement('div'),name=document.createElement('div'),price=document.createElement('div');
    name.className='item-name';name.textContent=p.nome;price.className='item-price';price.textContent=money(p.preco)+' cada';info.append(name,price);
    const controls=document.createElement('div');controls.className='controls';
    for(const [label,action,aria] of [['−',()=>setQty(id,quantidade-1),'Diminuir '+p.nome],[''+quantidade,null,'Quantidade'],['+',()=>setQty(id,quantidade+1),'Aumentar '+p.nome],['×',()=>setQty(id,0),'Remover '+p.nome]]) {
      if(!action){const n=document.createElement('span');n.textContent=label;controls.append(n);continue;}
      const b=document.createElement('button');b.type='button';b.textContent=label;b.setAttribute('aria-label',aria);if(label==='×')b.className='remove';b.disabled=salvando;b.addEventListener('click',action);controls.append(b);
    }
    row.append(info,controls);el.append(row);
  }
  $('carrinho-vazio').hidden=carrinho.size>0;$('total').textContent=money(total);
  $('cancelar').disabled=salvando||carrinho.size===0;
  $('finalizar').disabled=salvando||!pagamento||total<=0;
  $('finalizar').textContent=salvando?'Salvando…':'Finalizar venda';
}
function setQty(id,n){if(salvando)return;if(n<=0)carrinho.delete(id);else carrinho.set(id,n);renderCarrinho();}
function renderPagamentos(){const el=$('pagamentos');el.replaceChildren();for(const p of pagamentos){const b=document.createElement('button');b.type='button';b.textContent=p.nome;b.setAttribute('aria-pressed',String(pagamento===p.id));b.addEventListener('click',()=>{if(salvando)return;pagamento=p.id;renderPagamentos();renderCarrinho();});el.append(b);}}
async function carregar(){
  const [pr,pa]=await Promise.all([db.from('produtos').select('id,nome,categoria,preco,ordem').eq('ativo',true).order('ordem').order('nome'),db.from('formas_pagamento').select('id,nome,codigo').eq('ativo',true).order('id')]);
  if(pr.error||pa.error){avisar('Não foi possível carregar os produtos. Tente atualizar.');return false;}
  produtos=pr.data;pagamentos=pa.data;
  for(const id of carrinho.keys())if(!produtos.some(p=>p.id===id))carrinho.delete(id);
  if(!pagamentos.some(p=>p.id===pagamento))pagamento=null;
  renderProdutos();renderPagamentos();renderCarrinho();return true;
}
function exibirLogado(logado){$('login').hidden=logado;$('venda').hidden=!logado;$('sair').hidden=!logado;if(logado)carregar();else {carrinho.clear();pagamento=null;produtos=[];pagamentos=[];}}
$('login-form').addEventListener('submit',async event=>{event.preventDefault();const b=event.target.querySelector('button');b.disabled=true;const {error}=await db.auth.signInWithPassword({email:$('email').value.trim(),password:$('senha').value});b.disabled=false;if(error)avisar('E-mail ou senha incorretos.');else {$('senha').value='';exibirLogado(true);}});
$('sair').addEventListener('click',async()=>{await db.auth.signOut();exibirLogado(false);});
$('recarregar').addEventListener('click',carregar);
$('cancelar').addEventListener('click',()=>{if(salvando)return;carrinho.clear();pagamento=null;renderCarrinho();renderPagamentos();avisar('Venda cancelada.');});
$('finalizar').addEventListener('click',async()=>{
  if(salvando||!pagamento||!carrinho.size)return;
  salvando=true;renderCarrinho();
  try {
    const {error}=await db.rpc('registrar_venda',{p_forma_pagamento_id:pagamento,p_itens:[...carrinho].map(([produto_id,quantidade])=>({produto_id,quantidade}))});
    if(error)throw error;
    carrinho.clear();pagamento=null;renderPagamentos();avisar('Venda registrada! Pode começar a próxima.');
    carregar();
  } catch(error){console.error(error);avisar('Não foi possível salvar. Confira a conexão e tente novamente.');}
  finally{salvando=false;renderCarrinho();}
});
db.auth.getSession().then(({data})=>exibirLogado(!!data.session)).catch(()=>avisar('Sem conexão. Tente novamente.'));

// O dia comercial segue o fuso do estabelecimento, independentemente do fuso do aparelho.
const ZONA = 'America/Sao_Paulo';
const dataLocal = new Intl.DateTimeFormat('en-CA', {timeZone:ZONA,year:'numeric',month:'2-digit',day:'2-digit'});
const horaLocal = new Intl.DateTimeFormat('pt-BR', {timeZone:ZONA,hour:'2-digit',minute:'2-digit'});
const offsetLocal = new Intl.DateTimeFormat('en-US', {timeZone:ZONA,timeZoneName:'shortOffset'});
function partesData(instante){const p=Object.fromEntries(dataLocal.formatToParts(instante).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));return `${p.year}-${p.month}-${p.day}`;}
function inicioDia(ymd){
  const [y,m,d]=ymd.split('-').map(Number), base=Date.UTC(y,m-1,d);
  let t=base;
  for(let i=0;i<3;i++){
    const z=offsetLocal.formatToParts(new Date(t)).find(x=>x.type==='timeZoneName').value;
    const match=/GMT([+-])(\d{1,2})(?::(\d{2}))?/.exec(z);
    const offset=match?(match[1]==='-'?-1:1)*(Number(match[2])*60+Number(match[3]||0)):0;
    t=base-offset*60000;
  }
  return new Date(t).toISOString();
}
let vendaAberta=null, carregandoCaixa=false, cancelandoRegistrada=false;
async function todasLinhas(fazerConsulta){
  const linhas=[];
  for(let inicio=0;;inicio+=500){
    const {data,error}=await fazerConsulta().range(inicio,inicio+499);
    if(error)throw error;
    linhas.push(...data);
    if(data.length<500)return linhas;
  }
}
function mostrarAba(aba){
  $('venda').hidden=aba!=='venda';$('caixa').hidden=aba!=='caixa';$('despesas').hidden=aba!=='despesas';$('produtos-painel').hidden=aba!=='produtos';
  $('aba-venda').setAttribute('aria-current',aba==='venda'?'page':'false');
  $('aba-caixa').setAttribute('aria-current',aba==='caixa'?'page':'false');
  $('aba-despesas').setAttribute('aria-current',aba==='despesas'?'page':'false');
  $('aba-produtos').setAttribute('aria-current',aba==='produtos'?'page':'false');
  document.querySelector('h1').textContent={venda:'Nova venda',caixa:'Caixa',despesas:'Despesas',produtos:'Produtos'}[aba];
  if(aba==='caixa')carregarCaixa();
  if(aba==='despesas')carregarDespesas();
  if(aba==='produtos')carregarProdutosPainel();
}
$('aba-venda').addEventListener('click',()=>mostrarAba('venda'));
$('aba-caixa').addEventListener('click',()=>mostrarAba('caixa'));
$('aba-despesas').addEventListener('click',()=>mostrarAba('despesas'));
$('aba-produtos').addEventListener('click',()=>mostrarAba('produtos'));
$('atualizar-caixa').addEventListener('click',carregarCaixa);
async function carregarCaixa(){
  if(carregandoCaixa)return;
  carregandoCaixa=true;$('atualizar-caixa').disabled=true;
  $('caixa-estado').hidden=false;$('caixa-estado').textContent='Carregando caixa…';
  try{
    const hoje=partesData(new Date());
    const amanha=partesData(new Date(Date.parse(inicioDia(hoje))+36*3600000));
    const [vendas,despesas,fr]=await Promise.all([
      todasLinhas(()=>db.from('vendas').select('id,total,vendida_em,forma_pagamento_id').gte('vendida_em',inicioDia(hoje)).lt('vendida_em',inicioDia(amanha)).order('vendida_em',{ascending:false}).order('id',{ascending:false})),
      todasLinhas(()=>db.from('despesas').select('valor').eq('data_despesa',hoje).order('id')),
      db.from('formas_pagamento').select('id,codigo,nome')
    ]);
    if(fr.error)throw fr.error;
    const formas=new Map(fr.data.map(f=>[f.id,f]));
    const vendido=vendas.reduce((s,v)=>s+Number(v.total),0);
    const gasto=despesas.reduce((s,d)=>s+Number(d.valor),0);
    const por={pix:0,dinheiro:0,cartao:0};
    for(const v of vendas){const codigo=formas.get(v.forma_pagamento_id)?.codigo;if(Object.hasOwn(por,codigo))por[codigo]+=Number(v.total);}
    $('data-caixa').textContent='Hoje, '+new Intl.DateTimeFormat('pt-BR',{timeZone:ZONA,dateStyle:'long'}).format(new Date());
    for(const [id,valor] of Object.entries({vendeu:vendido,gastou:gasto,resultado:vendido-gasto,...por}))$(id).textContent=money(valor);
    const lista=$('lista-vendas');lista.replaceChildren();
    for(const v of vendas){
      const b=document.createElement('button');b.type='button';b.className='venda-linha';
      const horario=document.createElement('span'), valor=document.createElement('strong'), forma=document.createElement('span');
      horario.textContent=horaLocal.format(new Date(v.vendida_em));valor.textContent=money(v.total);forma.textContent=formas.get(v.forma_pagamento_id)?.nome||'Pagamento';
      b.append(horario,valor,forma);b.addEventListener('click',()=>abrirVenda(v,forma.textContent));lista.append(b);
    }
    $('caixa-estado').hidden=vendas.length>0;
    if(!vendas.length)$('caixa-estado').textContent='Nenhuma venda registrada hoje.';
  }catch(error){console.error(error);$('caixa-estado').textContent='Não foi possível carregar o Caixa. Toque em Atualizar.';avisar('Não foi possível atualizar o Caixa.');}
  finally{carregandoCaixa=false;$('atualizar-caixa').disabled=false;}
}
async function abrirVenda(v,forma){
  vendaAberta=null;$('detalhe-info').textContent='Carregando produtos…';$('detalhe-itens').replaceChildren();$('cancelar-registrada').disabled=true;
  $('detalhe-venda').showModal();
  const {data,error}=await db.from('itens_venda').select('produto_nome,quantidade,preco_unitario,subtotal').eq('venda_id',v.id).order('criado_em');
  if(!$('detalhe-venda').open)return;
  if(error){console.error(error);$('detalhe-info').textContent='Não foi possível carregar os produtos.';return;}
  vendaAberta=v;$('cancelar-registrada').disabled=false;
  $('detalhe-info').textContent=horaLocal.format(new Date(v.vendida_em))+' · '+forma;
  $('detalhe-total').textContent=money(v.total);
  for(const item of data){const linha=document.createElement('div');linha.className='detalhe-item';const nome=document.createElement('span'),preco=document.createElement('strong');nome.textContent=`${item.quantidade} × ${item.produto_nome}`;preco.textContent=money(item.subtotal);linha.append(nome,preco);$('detalhe-itens').append(linha);}
}
$('fechar-detalhe').addEventListener('click',()=>$('detalhe-venda').close());
$('detalhe-venda').addEventListener('close',()=>vendaAberta=null);
$('cancelar-registrada').addEventListener('click',async()=>{
  if(!vendaAberta||cancelandoRegistrada)return;
  if(!window.confirm(`Cancelar a venda de ${money(vendaAberta.total)}? Ela sairá do Caixa. Para corrigir, registre outra venda.`))return;
  cancelandoRegistrada=true;$('cancelar-registrada').disabled=true;
  try{
    const {data,error}=await db.from('vendas').delete().eq('id',vendaAberta.id).select('id');
    if(error)throw error;
    if(data?.length!==1)throw new Error('Venda não encontrada ou sem permissão');
    $('detalhe-venda').close();avisar('Venda cancelada.');await carregarCaixa();
  }catch(error){console.error(error);avisar('Não foi possível cancelar. Confira a conexão e tente novamente.');}
  finally{cancelandoRegistrada=false;$('cancelar-registrada').disabled=false;}
});
// Mantém a sessão de login e a navegação no mesmo documento.
const exibirLogadoOriginal=exibirLogado;
exibirLogado=function(logado){exibirLogadoOriginal(logado);$('navegacao').hidden=!logado;if(!logado){$('caixa').hidden=true;$('despesas').hidden=true;$('produtos-painel').hidden=true;$('detalhe-venda').close();$('form-gasto').close();$('form-produto').close();}else mostrarAba('venda');};

let despesasHoje=[], despesaEditando=null, carregandoDespesas=false, salvandoGasto=false;
function parseValor(texto){
  const limpo=texto.trim().replace(/R\$\s?/gi,'').replace(/\s/g,'');
  if(!limpo)return NaN;
  const normalizado=limpo.includes(',')?limpo.replace(/\./g,'').replace(',','.'):limpo;
  const valor=Number(normalizado);
  return Number.isFinite(valor)?Math.round(valor*100)/100:NaN;
}
function fecharFormGasto(){if(!salvandoGasto)$('form-gasto').close();}
function abrirFormGasto(despesa=null){
  despesaEditando=despesa;$('titulo-gasto').textContent=despesa?'Editar gasto':'Registrar gasto';
  $('descricao-gasto').value=despesa?.descricao||'';
  $('valor-gasto').value=despesa?Number(despesa.valor).toFixed(2).replace('.',','):'';
  $('erro-gasto').hidden=true;$('form-gasto').showModal();$('descricao-gasto').focus();
}
function renderDespesas(){
  const total=despesasHoje.reduce((s,d)=>s+Number(d.valor),0);$('total-despesas').textContent=money(total);
  const lista=$('lista-despesas');lista.replaceChildren();
  for(const d of despesasHoje){
    const item=document.createElement('article');item.className='gasto-linha';
    const info=document.createElement('div'), descricao=document.createElement('strong'), horario=document.createElement('span');
    descricao.textContent=d.descricao;horario.textContent=horaLocal.format(new Date(d.criado_em));info.append(descricao,horario);
    const valor=document.createElement('strong');valor.className='gasto-valor';valor.textContent=money(d.valor);
    const acoes=document.createElement('div');acoes.className='gasto-acoes';
    const editar=document.createElement('button');editar.type='button';editar.className='plain';editar.textContent='Editar';editar.addEventListener('click',()=>abrirFormGasto(d));
    const excluir=document.createElement('button');excluir.type='button';excluir.className='plain excluir';excluir.textContent='Excluir';excluir.addEventListener('click',()=>excluirDespesa(d));
    acoes.append(editar,excluir);item.append(info,valor,acoes);lista.append(item);
  }
  $('despesas-estado').hidden=despesasHoje.length>0;
  if(!despesasHoje.length)$('despesas-estado').textContent='Nenhum gasto registrado hoje.';
}
async function carregarDespesas(){
  if(carregandoDespesas)return;carregandoDespesas=true;$('atualizar-despesas').disabled=true;
  $('despesas-estado').hidden=false;$('despesas-estado').textContent='Carregando gastos…';
  try{
    const hoje=partesData(new Date());
    despesasHoje=await todasLinhas(()=>db.from('despesas').select('id,descricao,valor,data_despesa,criado_em').eq('data_despesa',hoje).order('criado_em',{ascending:false}).order('id',{ascending:false}));
    $('data-despesas').textContent='Hoje, '+new Intl.DateTimeFormat('pt-BR',{timeZone:ZONA,dateStyle:'long'}).format(new Date());renderDespesas();
  }catch(error){console.error(error);$('despesas-estado').textContent='Não foi possível carregar os gastos. Toque em Atualizar.';avisar('Não foi possível atualizar as despesas.');}
  finally{carregandoDespesas=false;$('atualizar-despesas').disabled=false;}
}
async function excluirDespesa(d){
  if(!window.confirm(`Excluir o gasto “${d.descricao}” de ${money(d.valor)}?`))return;
  try{
    const {data,error}=await db.from('despesas').delete().eq('id',d.id).select('id');if(error)throw error;if(data?.length!==1)throw new Error('Despesa não encontrada ou sem permissão');
    avisar('Gasto excluído.');await Promise.all([carregarDespesas(),carregarCaixa()]);
  }catch(error){console.error(error);avisar('Não foi possível excluir. Confira a conexão e tente novamente.');}
}
$('registrar-gasto').addEventListener('click',()=>abrirFormGasto());
$('atualizar-despesas').addEventListener('click',carregarDespesas);
$('fechar-gasto').addEventListener('click',fecharFormGasto);
$('cancelar-edicao-gasto').addEventListener('click',fecharFormGasto);
$('form-gasto').addEventListener('close',()=>{despesaEditando=null;$('gasto-form').reset();$('erro-gasto').hidden=true;});
$('gasto-form').addEventListener('submit',async event=>{
  event.preventDefault();if(salvandoGasto)return;
  const descricao=$('descricao-gasto').value.trim(), valor=parseValor($('valor-gasto').value), erro=$('erro-gasto');
  if(!descricao){erro.textContent='Informe a descrição do gasto.';erro.hidden=false;return;}
  if(!Number.isFinite(valor)||valor<=0){erro.textContent='Informe um valor maior que zero. Exemplo: 25,50.';erro.hidden=false;return;}
  salvandoGasto=true;$('salvar-gasto').disabled=true;$('salvar-gasto').textContent='Salvando…';erro.hidden=true;
  try{
    const consulta=despesaEditando
      ?db.from('despesas').update({descricao,valor}).eq('id',despesaEditando.id).select('id')
      :db.from('despesas').insert({descricao,valor,data_despesa:partesData(new Date())}).select('id');
    const {data,error}=await consulta;if(error)throw error;if(data?.length!==1)throw new Error('Despesa não foi salva');
    const editou=!!despesaEditando;$('form-gasto').close();avisar(editou?'Gasto atualizado.':'Gasto registrado! Pode lançar outro.');
    await Promise.all([carregarDespesas(),carregarCaixa()]);
  }catch(error){console.error(error);erro.textContent='Não foi possível salvar. Confira a conexão e tente novamente.';erro.hidden=false;}
  finally{salvandoGasto=false;$('salvar-gasto').disabled=false;$('salvar-gasto').textContent='Salvar gasto';}
});

let produtosPainel=[], produtoEditando=null, carregandoProdutos=false, salvandoProduto=false, alterandoProduto=false;
function produtosDaCategoria(categoria){return produtosPainel.filter(p=>p.categoria===categoria);}
function fecharFormProduto(){if(!salvandoProduto)$('form-produto').close();}
function abrirFormProduto(produto=null){
  produtoEditando=produto;$('titulo-produto').textContent=produto?'Editar produto':'Novo produto';
  $('nome-produto').value=produto?.nome||'';$('categoria-produto').value=produto?.categoria||'espetinho';
  $('preco-produto').value=produto?Number(produto.preco).toFixed(2).replace('.',','):'';
  $('erro-produto').hidden=true;$('form-produto').showModal();$('nome-produto').focus();
}
function botaoProduto(texto,acao,classe='plain'){
  const b=document.createElement('button');b.type='button';b.className=classe;b.textContent=texto;b.disabled=alterandoProduto;b.addEventListener('click',acao);return b;
}
function renderProdutosPainel(){
  for(const categoria of ['espetinho','bebida']){
    const lista=$('lista-produtos-'+categoria);lista.replaceChildren();const itens=produtosDaCategoria(categoria);
    itens.forEach((p,indice)=>{
      const item=document.createElement('article');item.className='produto-linha';
      const info=document.createElement('div');info.className='produto-info';
      const nome=document.createElement('strong'),preco=document.createElement('span');nome.textContent=p.nome;preco.textContent=money(p.preco);info.append(nome,preco);
      const situacao=document.createElement('span');situacao.className='situacao'+(p.ativo?'':' inativo');situacao.textContent=p.ativo?'Ativo':'Inativo';
      const acoes=document.createElement('div');acoes.className='produto-acoes';
      acoes.append(
        botaoProduto('Subir',()=>moverProduto(p,-1),'plain'),
        botaoProduto('Descer',()=>moverProduto(p,1),'plain'),
        botaoProduto('Editar',()=>abrirFormProduto(p)),
        botaoProduto(p.ativo?'Desativar':'Ativar',()=>alternarProduto(p),'plain alternar')
      );
      acoes.children[0].disabled=alterandoProduto||indice===0;acoes.children[1].disabled=alterandoProduto||indice===itens.length-1;
      item.append(info,situacao,acoes);lista.append(item);
    });
  }
  $('produtos-estado').hidden=produtosPainel.length>0;
  if(!produtosPainel.length)$('produtos-estado').textContent='Nenhum produto cadastrado. Toque em Novo produto para começar.';
}
async function carregarProdutosPainel(){
  if(carregandoProdutos)return;carregandoProdutos=true;$('atualizar-produtos').disabled=true;
  $('produtos-estado').hidden=false;$('produtos-estado').textContent='Carregando produtos…';
  try{
    produtosPainel=await todasLinhas(()=>db.from('produtos').select('id,nome,categoria,preco,ativo,ordem,criado_em').order('categoria').order('ordem').order('nome'));
    renderProdutosPainel();
  }catch(error){console.error(error);$('produtos-estado').textContent='Não foi possível carregar os produtos. Toque em Atualizar.';avisar('Não foi possível atualizar os produtos.');}
  finally{carregandoProdutos=false;$('atualizar-produtos').disabled=false;}
}
async function atualizarProduto(id,alteracoes){
  const {data,error}=await db.from('produtos').update(alteracoes).eq('id',id).select('id');
  if(error)throw error;if(data?.length!==1)throw new Error('Produto não encontrado ou sem permissão');
}
async function alternarProduto(produto){
  if(alterandoProduto)return;alterandoProduto=true;renderProdutosPainel();
  try{await atualizarProduto(produto.id,{ativo:!produto.ativo});avisar(produto.ativo?'Produto desativado.':'Produto ativado.');await Promise.all([carregarProdutosPainel(),carregar()]);}
  catch(error){console.error(error);avisar('Não foi possível alterar o produto.');}
  finally{alterandoProduto=false;renderProdutosPainel();}
}
async function moverProduto(produto,direcao){
  if(alterandoProduto)return;const itens=produtosDaCategoria(produto.categoria), atual=itens.findIndex(p=>p.id===produto.id), outro=itens[atual+direcao];if(!outro)return;
  alterandoProduto=true;renderProdutosPainel();
  try{
    const novaOrdem=[...itens];[novaOrdem[atual],novaOrdem[atual+direcao]]=[novaOrdem[atual+direcao],novaOrdem[atual]];
    await Promise.all(novaOrdem.map((item,indice)=>atualizarProduto(item.id,{ordem:(indice+1)*10})));
    avisar('Ordem atualizada.');await Promise.all([carregarProdutosPainel(),carregar()]);
  }catch(error){console.error(error);avisar('Não foi possível mudar a ordem.');await carregarProdutosPainel();}
  finally{alterandoProduto=false;renderProdutosPainel();}
}
$('novo-produto').addEventListener('click',()=>abrirFormProduto());
$('atualizar-produtos').addEventListener('click',carregarProdutosPainel);
$('fechar-produto').addEventListener('click',fecharFormProduto);
$('cancelar-edicao-produto').addEventListener('click',fecharFormProduto);
$('form-produto').addEventListener('close',()=>{produtoEditando=null;$('produto-form').reset();$('erro-produto').hidden=true;});
$('produto-form').addEventListener('submit',async event=>{
  event.preventDefault();if(salvandoProduto)return;
  const nome=$('nome-produto').value.trim(),categoria=$('categoria-produto').value,preco=parseValor($('preco-produto').value),erro=$('erro-produto');
  if(!nome){erro.textContent='Informe o nome do produto.';erro.hidden=false;return;}
  if(!['espetinho','bebida'].includes(categoria)){erro.textContent='Escolha Espetinhos ou Bebidas.';erro.hidden=false;return;}
  if(!Number.isFinite(preco)||preco<=0){erro.textContent='Informe um preço maior que zero. Exemplo: 12,50.';erro.hidden=false;return;}
  salvandoProduto=true;$('salvar-produto').disabled=true;$('salvar-produto').textContent='Salvando…';erro.hidden=true;
  try{
    if(produtoEditando){
      const alteracoes={nome,categoria,preco};
      if(categoria!==produtoEditando.categoria)alteracoes.ordem=Math.max(0,...produtosDaCategoria(categoria).map(p=>Number(p.ordem)))+10;
      await atualizarProduto(produtoEditando.id,alteracoes);
    }else{
      const ordem=Math.max(0,...produtosDaCategoria(categoria).map(p=>Number(p.ordem)))+10;
      const {data,error}=await db.from('produtos').insert({nome,categoria,preco,ordem}).select('id');if(error)throw error;if(data?.length!==1)throw new Error('Produto não foi salvo');
    }
    const editou=!!produtoEditando;$('form-produto').close();avisar(editou?'Produto atualizado.':'Produto cadastrado!');
    await Promise.all([carregarProdutosPainel(),carregar()]);
  }catch(error){console.error(error);erro.textContent='Não foi possível salvar. Confira a conexão e tente novamente.';erro.hidden=false;}
  finally{salvandoProduto=false;$('salvar-produto').disabled=false;$('salvar-produto').textContent='Salvar produto';}
});
