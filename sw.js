	// cache urls

	const cacheName = 'cache-v1';

	const filesToCache = [
		'./manifest.json',
		'./index.html',
		'./restaurant.html',
		'/js/main.js',
		'./.htaccess',
		'./idb.js',
		'./js/dbhelper.js',
		'./js/restaurant_info.js',
		'/css/styles.css',
		'/dest/css/style.min.css',
		'/css/responsive.css',
		'/img/',
	];
	
	// cache assets
	self.addEventListener('install', event => {
	  event.waitUntil(
        caches.open(cacheName)
        .then(cache => {
            //console.info('Caching of files Initiation');
            return cache.addAll(filesToCache);
        })
      );
	});
	
	//delete unused cache
	self.addEventListener('activate', event => {
	  event.waitUntil(
		  caches.keys()
			.then(keyList => Promise.all(keyList.map(thisCacheName => {
            if (thisCacheName !== cacheName){
                //console.log("Service worker removing cached files from", thisCacheName);
                return caches.delete(thisCacheName);        
            }
        })))
		);
	  return self.clients.claim();
	});

	//fetch cache 
	self.addEventListener('fetch', event => {
	  event.respondWith(caches.match(event.request)
		.then(response => response || fetch(event.request)
      .then(response => caches.open(cacheName)
      .then(cache => {
        cache.put(event.request, response.clone());
        return response;
      })).catch(event => {
      //console.log('Service Worker error caching and fetching');
    }))
	 );
	});



	// listen to post request
	self.addEventListener('fetch', function(event) {
	  var request = event.request;
	  if (request.method === "POST") {
	    event.respondWith(
          // Try to POST form data to server
          fetch(event.request)
          .catch(function() {
          // If it doesn't work, post a message to reassure user
          self.clients.matchAll().then(function (clients){
            clients.forEach(function(client){
              client.postMessage({
                msg: "Post unsuccessful! Server will be updated when connection is re-established.",
                url: event.request.url
              });
            });
          });
	    })
	)}
})


