// Filled by the production build with hashes of public bytes only.
const EXPECTED=__STATIC_HASHES__;
const CACHE='academic-os-shell-v3-__SHELL_BUILD__';
async function verified(path){
 const response=await fetch(path,{cache:'reload',credentials:'same-origin',redirect:'error'});
 if(!response.ok||response.type!=='basic'||response.redirected)throw Error('SHELL_UNAVAILABLE');
 const bytes=await response.clone().arrayBuffer();
 const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
 if(digest!==EXPECTED[path])throw Error('SHELL_INTEGRITY');
 return response;
}
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const responses=await Promise.all(Object.keys(EXPECTED).map(async path=>[path,await verified(path)]));
 const cache=await caches.open(CACHE);for(const[path,response]of responses)await cache.put(path,response);
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 for(const key of await caches.keys())if(key.startsWith('academic-os-shell-')&&key!==CACHE)await caches.delete(key);
 await self.clients.claim();
})()));
self.addEventListener('message',event=>{if(event.data==='ACTIVATE_UPDATE')self.skipWaiting();});
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(url.origin!==self.location.origin||event.request.method!=='GET'||url.pathname.startsWith('/api/')||url.pathname.startsWith('/cdn-cgi/'))return;
 if(event.request.mode==='navigate'){
  // Network documents (including Access login) never enter Cache Storage.
  event.respondWith(fetch(event.request).catch(async()=>{const cache=await caches.open(CACHE);return await cache.match('/')||Response.error();}));return;
 }
 if(!Object.prototype.hasOwnProperty.call(EXPECTED,url.pathname)||url.search)return;
 event.respondWith((async()=>{const cache=await caches.open(CACHE);const saved=await cache.match(url.pathname);if(saved)return saved;const response=await verified(url.pathname);await cache.put(url.pathname,response.clone());return response;})());
});
