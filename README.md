# FuelTrack Frontend

Aplicación Vue 3/Vite preparada para Cloudflare Pages. Consume exclusivamente
la API de Railway mediante `VITE_API_BASE_URL`; no utiliza credenciales ni una
URL de MySQL.

## Desarrollo local

```powershell
npm ci
npm run dev
```

Sin `VITE_API_BASE_URL`, Vite usa `/api` y el proxy local apunta a
`http://localhost:5101`.

## Despliegue en Cloudflare Pages

Conecta este repositorio y configura:

- Framework preset: `Vue`
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: `/`
- Production branch: `main`

Variables:

```env
NODE_VERSION=22
VITE_API_BASE_URL=https://<backend>.up.railway.app/api
```

Para este despliegue:

```env
VITE_API_BASE_URL=https://back-production-02fc.up.railway.app/api
```

El código usa esa misma URL como fallback de producción, por lo que Cloudflare
queda conectado incluso si la variable no está definida. La variable mantiene
prioridad y permite cambiar el backend sin modificar el código.

El archivo `public/_redirects` habilita el fallback de SPA y
`public/_headers` agrega cabeceras básicas de seguridad.

Cuando Cloudflare asigne el dominio, copia su origen exacto, sin `/` final, en
`ALLOWED_ORIGINS` del servicio API en Railway. El origen actual es:

```env
ALLOWED_ORIGINS=https://front-38m.pages.dev
```
