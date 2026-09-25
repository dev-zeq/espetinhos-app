const CACHE = 'espetinho-app-v3';
const SUPABASE_JS = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.102.0/dist/umd/supabase.min.js';
const ESSENCIAIS = ['./','./index.html','./manifest.webmanifest','./assets/style.css','./assets/app.js','./assets/icons/icon-192.png','./assets/icons/icon-maskable-192.png','./assets/icons/icon-512.png','./assets/icons/icon-maskable-512.png',SUPABASE_JS];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ESSENCIAIS)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
  const request=event.request;if(request.method!=='GET')return;
  const url=new URL(request.url);
  const essencial=request.mode==='navigate'||ESSENCIAIS.some(path=>new URL(path,self.location).href===url.href);if(!essencial)return;
  event.respondWith(fetch(request).then(response=>{if(response.ok){const copia=response.clone();caches.open(CACHE).then(cache=>cache.put(request,copia));}return response;}).catch(async()=>(await caches.match(request))||(request.mode==='navigate'?caches.match('./index.html'):undefined)));
});
