// Service worker v9 – η σελίδα (HTML) πάντα από το δίκτυο όταν υπάρχει σύνδεση (ποτέ παλιά έκδοση),
// με αντίγραφο για χρήση χωρίς σύνδεση. Στατικά αρχεία από την cache.
var V='kat-v9';
var CORE=['./','./app.css?v=9','./app.js?v=9','./manifest.webmanifest?v=9','./icons/apple-touch-icon.png?v=9','./icons/favicon-64.png?v=9','./icons/icon-192.png?v=9','./vendor/leaflet/leaflet.js?v=1.9.4','./vendor/leaflet/leaflet.css?v=1.9.4'];
self.addEventListener('install',function(e){e.waitUntil(caches.open(V).then(function(c){return c.addAll(CORE)}).then(function(){return self.skipWaiting()}))});
self.addEventListener('activate',function(e){e.waitUntil(caches.keys().then(function(ks){return Promise.all(ks.filter(function(k){return k!==V}).map(function(k){return caches.delete(k)}))}).then(function(){return self.clients.claim()}))});
self.addEventListener('fetch',function(e){var r=e.request;if(r.method!=='GET')return;var u=new URL(r.url);if(u.origin!==location.origin)return;
 if(r.mode==='navigate'||u.pathname.endsWith('/')||u.pathname.endsWith('.html')){
  e.respondWith(fetch(r).then(function(res){var cp=res.clone();caches.open(V).then(function(c){c.put('./',cp)});return res}).catch(function(){return caches.match('./')}));return}
 e.respondWith(caches.match(r).then(function(m){return m||fetch(r).then(function(res){if(res.ok){var cp=res.clone();caches.open(V).then(function(c){c.put(r,cp)})}return res})}))});
