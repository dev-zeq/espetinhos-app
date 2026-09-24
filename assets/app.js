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
