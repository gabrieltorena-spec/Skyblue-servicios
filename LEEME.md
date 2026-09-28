# Skyblue Servicios

La app de servicios de Skyblue Park. Trece casas, numeradas 00 a 12.
El huésped escanea el QR de su mesa, pide, y ve en qué anda su pedido.
El personal lo recibe en el celular y lo mueve con dos toques.

Es un Cloudflare Worker con una base D1. Sin framework: el HTML se arma en el
servidor. Todo el contenido está en castellano, incluido el código.

---

## Las dos puertas

| Quién | Dirección | Cómo entra |
|---|---|---|
| Huésped | `/casa/7` (el QR de la casa 7) | nombre y apellido de la reserva |
| Personal | `/personal` | su nombre y una clave de 4 dígitos |

El huésped no instala nada. El personal **sí tiene que agregar la app a la
pantalla de inicio**: en iPhone, sin eso, el celular no suena nunca.

---

## Las claves del personal

Las de arranque, para cambiar apenas esté en el aire:

| Usuario | Rol | Clave |
|---|---|---|
| gabriel | admin | 1519 |
| maria | mucama | 1111 |
| rafaela | mucama | 2222 |
| anthony | mucama | 3333 |
| german | mantenimiento | 4444 |

Para cambiar una: `node herramientas/claves.js maria:8421` y pegar el SQL que
imprime en la consola de D1. La clave en sí nunca se guarda en ningún lado.

---

## Cómo funciona por dentro

**Los tres relojes.** Cada servicio tiene su propio tiempo de toma y de
resolución, y están en la tabla `servicios`, no escritos en el código. Se
cambian con un `UPDATE`, sin tocar nada más.

**La escalación.** Un cron corre cada minuto. Si nadie tomó un pedido antes de
que venza su reloj, lo marca como *sin atender* y suena el celular de recepción.
Fuera del horario del sector el reloj se detiene: no tiene sentido escalar un
pedido de mucama a las tres de la mañana. Las urgencias —agua, electricidad—
escalan a cualquier hora.

**Los dos nombres.** Cada servicio tiene el nombre que ve el huésped y el que
usa el personal. "Limpieza integral" para el huésped es "Parcial" para la
mucama. Son dos columnas, no una traducción.

**El parcial.** De 3 noches en adelante la casa lleva limpieza todos los días.
Lo calcula la app con las noches que se cargan en el alta, sin que nadie decida
nada a mano.

**La notificación.** Va vacía a propósito: es un golpe en la puerta. El service
worker la recibe, le pregunta al servidor qué hay pendiente y recién ahí escribe
el texto. Así el aviso nunca queda viejo y no hay que cifrar el contenido.

**Las sesiones.** Del token de sesión se guarda solo el sha-256. Si alguien se
lleva la base, no se lleva ninguna sesión.

---

## Poner a andar una copia local

```bash
npm install
npx wrangler d1 migrations apply skyblue-servicios --local
npm run dev
```

Hace falta un archivo `.dev.vars` con la clave privada de las notificaciones:

```
VAPID_PRIVADA=...
```

Ese archivo no va al repositorio. En producción la misma clave va como
*secret* del Worker, con el mismo nombre.

---

## Publicar

1. Crear la base D1 `skyblue-servicios` en el panel de Cloudflare y poner su id
   en `wrangler.toml`.
2. Correr las migraciones contra producción:
   `npx wrangler d1 migrations apply skyblue-servicios --remote`
3. Cargar el secreto: `npx wrangler secret put VAPID_PRIVADA`
4. `npx wrangler deploy`
5. Apuntar `servicios.skybluepark.com.uy` al Worker.

---

## El mapa de archivos

```
src/
  index.js        entrada del worker y el cron
  rutas.js        todas las direcciones, en un solo lugar
  datos.js        la base: estadías, sesiones, pedidos
  huesped.js      las pantallas del huésped
  personal.js     las pantallas del personal
  push.js         las notificaciones (VAPID)
  marca.js        colores, tipografías y el armazón del HTML
migrations/       el esquema y los 15 servicios con sus tiempos
public/           wordmark, plumas, iconos y los service workers
herramientas/     generador de claves del personal
```
