importScripts(
    "https://storage.googleapis.com/workbox-cdn/releases/5.1.2/workbox-sw.js"
  );
  
  const CACHE = "pwa-Forescan";
  const FILES_TO_CACHE = [
    "/Controller/casosController.js",
    "/models/Caso.js",
    "/index.html",
    "/Login.html",
    "/Laudos.html",
    "/Gerenciar_usuarios.html",
    "/Adicionar_evidencias.html",
    "/Adicionar_casos.html",
    "/bootstrap.css",
    "/font-awesome.min.css",
    "/login.css",
    "/style.css",
    "/style.css.map",
    "/style.scss",
    "/js/custom.js",
    "/js/components/CadastroCaso.js",
    "/js/db.js",
    "/js/evidencias.js",
    "/js/server.js",
    "/js/jquery-3.4.1.min.js",
    "/images/Logo.png",
    "/images/logo48.png",
    "/images/logo72.png",
    "/images/logo87.png",
    "/images/logo192.png",
    "/images/logo512.png",
    "/manifest.json",
    "/package-lock.json",
    "/package.json",
    "/fonts/fontawesome-webfont.ttf",
    "/fonts/fontawesome-webfont.woff",
    "/fonts/fontawesome-webfont.woff2",
  ];
  
  // Instalando e armazenando os arquivos no cache
  self.addEventListener("install", (event) => {
    event.waitUntil(
      caches.open(CACHE).then((cache) => cache.addAll(FILES_TO_CACHE))
    );
    self.skipWaiting(); // Força a ativação imediata do service worker
  });
  
  // Ativando e limpando caches antigos
  self.addEventListener("activate", (event) => {
    event.waitUntil(
      caches.keys().then((keyList) => {
        return Promise.all(
          keyList.map((key) => {
            if (key !== CACHE) {
              return caches.delete(key); // Deleta caches antigos
            }
          })
        );
      })
    );
    self.clients.claim(); // Faz o novo SW assumir imediatamente
  });
  
  // Habilitando o pré-carregamento de navegação no Workbox
  if (workbox.navigationPreload.isSupported()) {
    workbox.navigationPreload.enable();
  }
  
  // Interceptando as requisições para servir do cache quando offline
  self.addEventListener("fetch", (event) => {
    // Tentando buscar o recurso da rede
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Se a resposta for válida, a armazena no cache
          const clonedResponse = response.clone();
          caches
            .open(CACHE)
            .then((cache) => cache.put(event.request, clonedResponse));
          return response;
        })
        .catch(() => {
          // Caso a rede falhe, tenta servir o recurso do cache
          return caches.match(event.request).then((cachedResponse) => {
            // Se o recurso não estiver no cache, retorna a página inicial (index.html)
            return cachedResponse || caches.match("/index.html");
          });
        })
    );
  });
  