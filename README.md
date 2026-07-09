# FuelTrack Frontend

Aplicación Vue 3/Vite preparada para Cloudflare Pages. Consume la API mediante `VITE_API_BASE_URL`; para microservicios esa URL debe apuntar al Gateway.

## Desarrollo local

```powershell
npm ci
npm run dev
```

Sin `VITE_API_BASE_URL`, Vite usa `/api` y el proxy local apunta a:

```text
http://localhost:5000
```

## Despliegue en Cloudflare Pages

Configura:

- Framework preset: `Vue`
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: `/`
- Production branch: `main`

Variables:

```env
NODE_VERSION=22
VITE_API_BASE_URL=https://<gateway-url>.up.railway.app/api
```

El frontend no usa credenciales ni URLs de MySQL, RabbitMQ o Redis. Todo pasa por el Gateway.

## Backend esperado

El flujo de microservicios es:

```text
Cloudflare Frontend -> Railway Gateway -> Identity / Orders / Payments / Reporting
```

El origen actual de Cloudflare es:

```env
https://front-38m.pages.dev
```

Ese valor debe ir en `AllowedOrigins` del servicio Gateway en Railway.
