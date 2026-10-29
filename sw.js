/* Atticus Patrimoine — service worker
   Stratégie : la PAGE et les scripts sont toujours pris sur le RÉSEAU quand il est disponible
   (le cache ne sert qu'en secours hors-ligne), pour ne jamais afficher une version périmée.
   Les appels Google (Drive/OAuth/API) ne sont jamais interceptés. */
var CACHE="atticus-v3";
var APP_SHELL=["./","./index.html","./manifest.webmanifest","./icon-192.png","./icon-512.png"];

self.addEventListener("install",function(e){
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function(c){return c.addAll(APP_SHELL).catch(function(){});}));
});

self.addEventListener("activate",function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){return k!==CACHE;}).map(function(k){return caches.delete(k);}));
    }).then(function(){return self.clients.claim();})
  );
});

self.addEventListener("fetch",function(e){
  var req=e.request;
  if(req.method!=="GET")return;
  var url;
  try{url=new URL(req.url);}catch(_){return;}

  // Ne JAMAIS intercepter Google (Drive, OAuth, APIs, CDN gstatic/googleapis) : toujours frais, direct réseau
  var h=url.hostname;
  if(/(^|\.)googleapis\.com$/.test(h) || /(^|\.)google\.com$/.test(h) ||
     /(^|\.)gstatic\.com$/.test(h) || /(^|\.)googleusercontent\.com$/.test(h) ||
     /accounts\.google/.test(h)) {
    return; // laisse le navigateur gérer, sans cache SW
  }

  // Navigation (la page HTML) : RÉSEAU D'ABORD, cache uniquement si hors-ligne
  if(req.mode==="navigate"){
    e.respondWith(
      fetch(req).then(function(r){
        var cp=r.clone();caches.open(CACHE).then(function(c){c.put("./index.html",cp);});
        return r;
      }).catch(function(){
        return caches.match("./index.html").then(function(m){return m||caches.match("./");});
      })
    );
    return;
  }

  // Scripts/CSS de l'app (même origine) : réseau d'abord, cache en secours
  if(url.origin===self.location.origin){
    e.respondWith(
      fetch(req).then(function(r){
        if(r&&r.status===200){var cp=r.clone();caches.open(CACHE).then(function(c){c.put(req,cp);});}
        return r;
      }).catch(function(){return caches.match(req);})
    );
    return;
  }

  // Autres ressources tierces (ex. CDN Chart.js) : cache d'abord (elles ne changent pas), réseau en secours
  e.respondWith(
    caches.match(req).then(function(m){
      return m || fetch(req).then(function(r){
        if(r&&r.status===200){var cp=r.clone();caches.open(CACHE).then(function(c){c.put(req,cp);});}
        return r;
      }).catch(function(){return m;});
    })
  );
});
