/* Atticus Patrimoine — service worker (cache de l'app pour hors-ligne + installabilité PWA) */
var CACHE="atticus-v1";
self.addEventListener("install",function(e){self.skipWaiting();});
self.addEventListener("activate",function(e){e.waitUntil(self.clients.claim());});
self.addEventListener("fetch",function(e){
  var req=e.request;
  if(req.method!=="GET")return;
  if(req.mode==="navigate"){
    e.respondWith(
      fetch(req).then(function(r){var cp=r.clone();caches.open(CACHE).then(function(c){c.put(req,cp);});return r;})
                .catch(function(){return caches.match(req).then(function(m){return m||caches.match("./")||caches.match("./index.html");});})
    );
    return;
  }
  e.respondWith(
    caches.match(req).then(function(m){
      return m||fetch(req).then(function(r){
        if(r&&r.status===200){var cp=r.clone();caches.open(CACHE).then(function(c){c.put(req,cp);});}
        return r;
      }).catch(function(){return m;});
    })
  );
});
