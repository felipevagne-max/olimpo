# GUIA DE CONFIGURAÇÃO PWA - OLIMPO

## ⚠️ ARQUIVOS OBRIGATÓRIOS (Adicionar manualmente na pasta public/)

### 1. manifest.json
Criar em: `public/manifest.json`

```json
{
  "name": "Olimpo",
  "short_name": "Olimpo",
  "description": "Sistema de produtividade e gamificação pessoal",
  "start_url": "/?source=pwa",
  "scope": "/",
  "display": "standalone",
  "background_color": "#000000",
  "theme_color": "#00FF66",
  "lang": "pt-BR",
  "orientation": "portrait",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-512-maskable.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ],
  "categories": ["productivity", "lifestyle"],
  "shortcuts": [
    {
      "name": "Dashboard",
      "url": "/?page=Dashboard",
      "description": "Ir para Dashboard"
    },
    {
      "name": "Tarefas",
      "url": "/?page=Tasks",
      "description": "Ver tarefas"
    },
    {
      "name": "Hábitos",
      "url": "/?page=Habits",
      "description": "Ver hábitos"
    }
  ]
}
```

### 2. service-worker.js
Criar em: `public/service-worker.js`

```javascript
const CACHE_NAME = 'olimpo-v1.0.0'; // Incrementar a cada deploy
const STATIC_CACHE = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_CACHE))
      .then(() => self.skipWaiting())
  );
});

// Activate - cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch - cache strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip authentication/API requests (Supabase, Base44)
  if (
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('base44.com') ||
    url.pathname.includes('/api/')
  ) {
    return event.respondWith(fetch(request));
  }

  // Cache-first for static assets (js, css, fonts, images)
  if (
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'font' ||
    request.destination === 'image'
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        return cached || fetch(request).then((response) => {
          if (response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, clone);
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // Network-first for HTML/documents
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, clone);
          });
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});

// Handle skip waiting message
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
```

### 3. Ícones PWA
Criar os seguintes ícones em: `public/icons/`

- `icon-180.png` (180x180) - iOS
- `icon-192.png` (192x192) - Android
- `icon-512.png` (512x512) - Splash
- `icon-512-maskable.png` (512x512) - Android adaptive

**Dica:** Use o logo Olimpo (matriz verde/preto) com padding adequado para maskable.

---

## 🚀 CONFIGURAÇÃO DO SERVIDOR

### Vercel / Netlify
Adicionar `vercel.json` ou `netlify.toml`:

**vercel.json:**
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }],
  "headers": [
    {
      "source": "/service-worker.js",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=0, must-revalidate" }
      ]
    },
    {
      "source": "/manifest.json",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=0, must-revalidate" }
      ]
    },
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" }
      ]
    }
  ]
}
```

**netlify.toml:**
```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/service-worker.js"
  [headers.values]
    Cache-Control = "public, max-age=0, must-revalidate"

[[headers]]
  for = "/manifest.json"
  [headers.values]
    Cache-Control = "public, max-age=0, must-revalidate"
```

---

## ✅ CHECKLIST PRÉ-PRODUÇÃO

### 1. Domínio e SSL
- [ ] Domínio configurado (ex.: app.seudominio.com)
- [ ] SSL/HTTPS ativo
- [ ] Redirect HTTP → HTTPS configurado

### 2. Supabase
- [ ] Adicionar domínio final em "Authentication → URL Configuration"
- [ ] Site URL: https://app.seudominio.com
- [ ] Redirect URLs: https://app.seudominio.com/**

### 3. PWA
- [ ] manifest.json criado e acessível
- [ ] service-worker.js criado e acessível
- [ ] Ícones criados e no lugar correto
- [ ] Testado no Chrome/Edge: "Install app" aparece
- [ ] Testado no iOS Safari: "Add to Home Screen" funciona
- [ ] App abre em modo standalone (sem barra do navegador)

### 4. Teste de Rotas
- [ ] Refresh em /dashboard funciona
- [ ] Refresh em /tarefas funciona
- [ ] Refresh em /habitos funciona
- [ ] Refresh em /metas funciona
- [ ] Nenhuma rota retorna 404

### 5. Performance
- [ ] Lighthouse PWA score > 90
- [ ] Assets com cache adequado
- [ ] Service Worker atualiza sem quebrar

---

## 📱 TESTE MANUAL

### Android Chrome
1. Abrir app no navegador
2. Menu (⋮) → "Install app" ou "Add to home screen"
3. Confirmar instalação
4. Abrir app instalado → deve abrir em standalone
5. Testar navegação e refresh

### iOS Safari
1. Abrir app no Safari
2. Compartilhar → "Add to Home Screen"
3. Confirmar
4. Abrir app instalado → deve abrir em standalone
5. Testar navegação e refresh

### Desktop Chrome/Edge
1. Ícone de instalação deve aparecer na barra de endereços
2. Clicar e instalar
3. App abre em janela standalone

---

## 🔄 ATUALIZAÇÕES

A cada deploy de produção:
1. Incrementar `CACHE_NAME` no service-worker.js (ex.: v1.0.0 → v1.0.1)
2. Deploy normalmente
3. Usuários verão prompt para recarregar automaticamente

---

## 🐛 TROUBLESHOOTING

**PWA não instala:**
- Verificar HTTPS ativo
- Verificar manifest.json acessível
- Verificar service-worker.js sem erros no console

**Tela branca no refresh:**
- Verificar SPA fallback configurado no servidor
- Verificar service-worker não está cacheando rotas erradas

**Login não funciona após instalar:**
- Verificar Supabase redirect URLs incluem o domínio PWA
- Limpar cache e reinstalar

**App não atualiza:**
- Incrementar CACHE_NAME
- Limpar cache do navegador
- Reinstalar PWA