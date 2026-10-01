# TICKET QUEUE CHATBOT - Documentación Completa

## 📋 Descripción General

Sistema profesional de gestión de tickets con colas FIFO independientes por servicio. Proporciona una interfaz web moderna con transiciones de estado visuales y un chatbot conversacional.

**Ciclo de vida del ticket:**
- **Creado**: El ticket entra en la cola del servicio seleccionado
- **Despachado**: El operador hace click en el botón "Despachar"
- **Cerrado**: El operador cierra el ticket cuando está resuelto

---

## 🎯 Características Principales

✅ **Colas FIFO por Servicio**
- 4 servicios predefinidos (Soporte técnico, Facturación, Consultas generales, Devoluciones)
- Cada servicio tiene su propia cola independiente
- Métricas en tiempo real por servicio

✅ **Interfaz de Tickets**
- Tarjetas visuales para cada ticket
- Estados con colores distintivos (Azul, Amarillo, Verde)
- Botones para transicionar estados
- Información del cliente, servicio y notas

✅ **Chatbot Conversacional**
- Soporte para comandos en español natural
- Consultas de estado
- Integración con la interfaz visual

✅ **Dashboard en Tiempo Real**
- Actualización automática cada 2 segundos
- Resumen general (En fila, Despachados, Cerrados)
- Panel de servicios con métricas

✅ **Diseño Moderno**
- Dark theme con Glassmorphism
- Responsive para desktop y tablet
- Gradientes y sombras profesionales

---

## 🛠️ Arquitectura Técnica

### Stack
- **Backend**: Node.js + Express.js
- **Frontend**: HTML5 + CSS3 + JavaScript puro (sin frameworks)
- **API**: REST con JSON
- **Almacenamiento**: En memoria (sin BD)

### Estructura del Proyecto

```
ticket-queue-chatbot/
├── server.js              # API REST + lógica de colas
├── package.json           # Dependencias
├── .gitignore            # Configuración git
├── README.md             # Documentación original
├── DEVELOPMENT.md        # Este archivo
└── public/
    ├── index.html        # Interfaz HTML
    ├── app.js            # Lógica del frontend
    └── style.css         # Estilos
```

---

## 📦 Instalación y Ejecución

### Requisitos
- Node.js v14+ 
- npm v6+

### Pasos

```bash
# 1. Clonar o descargar el repositorio
cd ticket-queue-chatbot

# 2. Instalar dependencias
npm install

# 3. Iniciar el servidor
npm start

# 4. Abrir en navegador
# http://localhost:3000
```

El servidor escucha en puerto **3000** por defecto.

---

## 📡 API REST Endpoints

### Estados del Ticket
- `initial` → Ticket acaba de crearse
- `processed` → Ticket ha sido despachado
- `closed` → Ticket ha sido cerrado

### Endpoints

#### GET `/api/state`
Obtiene el estado completo del sistema

**Respuesta:**
```json
{
  "queues": {
    "Soporte técnico": [...],
    "Facturación": [...],
    "Consultas generales": [...],
    "Devoluciones": [...]
  },
  "activeTickets": {
    "Soporte técnico": {...},
    ...
  },
  "metrics": {
    "totalQueued": 5,
    "totalActive": 2,
    "totalCompleted": 10,
    "byService": {
      "Soporte técnico": { "queued": 2, "active": 1 },
      ...
    }
  },
  "services": ["Soporte técnico", "Facturación", "Consultas generales", "Devoluciones"],
  "history": [...]
}
```

#### POST `/api/tickets`
Crea un nuevo ticket

**Body:**
```json
{
  "customerName": "Juan Pérez",
  "service": "Soporte técnico",
  "notes": "Error al conectarse"
}
```

**Respuesta:**
```json
{
  "ok": true,
  "message": "Ticket #1 creado para Juan Pérez en Soporte técnico.",
  "ticket": {
    "id": 1,
    "customerName": "Juan Pérez",
    "service": "Soporte técnico",
    "notes": "Error al conectarse",
    "status": "initial",
    "createdAt": "2026-10-01T17:30:00.000Z",
    "attendedAt": null,
    "closedAt": null
  },
  "state": {...}
}
```

#### POST `/api/tickets/:id/dispatch`
Cambia el estado de un ticket a "despachado" (initial → processed)

**Parámetros:**
- `id`: ID del ticket

**Respuesta:**
```json
{
  "ok": true,
  "message": "Ticket #1 despachado (Juan Pérez).",
  "ticket": {...estado actualizado...},
  "state": {...}
}
```

#### POST `/api/tickets/:id/close`
Cierra un ticket (processed → closed)

**Parámetros:**
- `id`: ID del ticket

**Respuesta:**
```json
{
  "ok": true,
  "message": "Ticket #1 cerrado con éxito.",
  "ticket": {...estado actualizado...},
  "state": {...}
}
```

#### POST `/api/chat`
Envía un mensaje al chatbot

**Body:**
```json
{
  "message": "estado"
}
```

**Respuesta:**
```json
{
  "ok": true,
  "message": "Estado general:\nSoporte técnico: 2 en fila\nFacturación: 1 en fila",
  "state": {...}
}
```

---

## 🎨 Frontend - Componentes

### HTML (`public/index.html`)

**Estructura Principal:**
1. **Sidebar**
   - Branding (Logo "Q" + Título)
   - Panel de estadísticas (3 métricas)
   - Formulario de creación de tickets
   - Panel de servicios

2. **Main**
   - Header con título
   - Contenedor de tarjetas de tickets
   - Chat log (últimos 5 mensajes)
   - Formulario de entrada del chatbot

### JavaScript (`public/app.js`)

**Funciones Clave:**

- `renderTickets(state)`: Dibuja las tarjetas de tickets desde el estado
- `renderStats(state)`: Actualiza métricas y lista de servicios
- `transitionTicket(ticketId, newStatus)`: Llama a los endpoints de transición
- `createTicket(event)`: Crea un ticket nuevo
- `fetchState()`: Obtiene el estado del servidor
- `getStateClass(status)`: Retorna la clase CSS para el color del estado
- `getStateLabel(status)`: Retorna la etiqueta legible del estado

**Actualización Automática:**
```javascript
setInterval(fetchState, 2000); // Cada 2 segundos
```

### CSS (`public/style.css`)

**Variables de Color:**
```css
--primary: #5eead4      /* Cyan para elementos activos */
--accent: #7dd3fc       /* Azul claro para gradientes */
--success: #86efac      /* Verde para estados completados */
--warning: #fcd34d      /* Amarillo para advertencias */
--text: #e2e8f0         /* Texto claro */
--muted: #94a3b8        /* Texto secundario */
--bg: #0b1020           /* Fondo oscuro */
```

**Clases de Estado:**
```css
.state-initial   → Azul (#60a5fa) - Creado
.state-processed → Amarillo (#fbbf24) - Despachado
.state-closed    → Verde (#22c55e) - Cerrado
```

---

## 🔧 Backend - Lógica de Colas (`server.js`)

### Estructura de Estado

```javascript
const state = {
  queues: {
    "Soporte técnico": [ticket1, ticket2, ...],
    "Facturación": [ticket3, ...],
    "Consultas generales": [...],
    "Devoluciones": [...]
  },
  activeTickets: {
    "Soporte técnico": null, // O ticket si hay uno siendo procesado
    "Facturación": null,
    ...
  },
  history: [...],              // Log de eventos
  nextTicketId: 1,             // Contador para IDs
  services: [...]              // Lista de servicios
};
```

### Funciones Principales

**`makeTicket(obj)`**
Crea un objeto ticket con estructura estándar

**`ensureQueueExists(service)`**
Inicializa la cola de un servicio si no existe

**`getSnapshot()`**
Retorna el estado completo con métricas calculadas

**`pushHistory(type, message, ticket)`**
Registra un evento en el historial

### Flujo de un Ticket

```
POST /api/tickets
    ↓
crear ticket { status: 'initial' }
    ↓
agregar a state.queues[service]
    ↓
---
    ↓
POST /api/tickets/:id/dispatch
    ↓
cambiar status a 'processed'
    ↓
actualizar state.activeTickets[service]
    ↓
---
    ↓
POST /api/tickets/:id/close
    ↓
cambiar status a 'closed'
    ↓
registrar en history
    ↓
remover de queues/activeTickets
```

---

## 💬 Chatbot - Comandos Soportados

### Reconocimiento de Intención

El chatbot analiza el mensaje con regex para detectar:

**Estado:** 
```
Palabras clave: "estado", "fila", "cola", "status", "mostrar"
Respuesta: Muestra todas las colas y sus métricas
```

**Ejemplos:**
```
usuario: "estado"
bot: "Estado general:\nSoporte técnico: 2 en fila\nFacturación: 0 en fila..."
```

### Patrón de Análisis

```javascript
const lower = message.toLowerCase();

if (/(estado|fila|cola)/.test(lower)) {
  return { action: 'status' };
}
if (/(ayuda|help|menu)/.test(lower)) {
  return { action: 'help' };
}
```

---

## 📊 Métricas y Estadísticas

El sistema calcula en tiempo real:

- **totalQueued**: Total de tickets en estado 'initial'
- **totalActive**: Total de tickets en estado 'processed'
- **totalCompleted**: Total de tickets en estado 'closed' (del historial)
- **byService**: Desglose por cada servicio

### Fórmula de Cálculo

```javascript
totalQueued = sum(queues[service].length para cada service)
totalActive = sum(activeTickets[service] ? 1 : 0 para cada service)
totalCompleted = history.filter(e => e.type === 'closed').length
```

---

## 🚀 Próximas Características (Roadmap)

### Fase 2: Persistencia
- [ ] Integración con MongoDB o PostgreSQL
- [ ] Guardado de tickets en BD
- [ ] Recuperación de datos al reiniciar

### Fase 3: Autenticación
- [ ] Login de operadores
- [ ] Roles (Admin, Operador, Supervisor)
- [ ] Historial por operador

### Fase 4: Avanzado
- [ ] Prioridad de tickets (Baja, Media, Alta, Urgente)
- [ ] Asignación de tickets a operadores
- [ ] Búsqueda y filtros avanzados
- [ ] SLA y tiempos de respuesta
- [ ] Exportación de reportes (CSV, PDF)
- [ ] WebSockets para actualización en tiempo real
- [ ] Notificaciones de clientes

### Fase 5: UX/UI
- [ ] Modo claro/oscuro
- [ ] Temas personalizables
- [ ] Gráficos de desempeño
- [ ] Panel administrativo
- [ ] Aplicación móvil

---

## 🔍 Debugging y Troubleshooting

### El resumen no se actualiza
- Verificar que `/api/state` retorna datos correctamente
- Revisar que `fetchState()` se ejecuta cada 2 segundos
- Abrir DevTools → Console para buscar errores

### Los botones no funcionan
- Verificar que la función `transitionTicket()` se llama
- Revisar la respuesta en Network tab
- Validar que el endpoint existe en server.js

### Tickets no aparecen
- Verificar que `renderTickets()` recibe el estado completo
- Buscar errores en JavaScript console
- Probar crear un ticket desde el formulario

### Comando en terminal para debug:
```bash
# En otra terminal, prueba la API
curl http://localhost:3000/api/state

# Crear un ticket de prueba
curl -X POST http://localhost:3000/api/tickets \
  -H "Content-Type: application/json" \
  -d '{"customerName":"Test","service":"Soporte técnico"}'
```

---

## 📝 Ejemplo de Flujo Completo

### 1. Crear Ticket
```
Usuario: Completa el formulario
  - Cliente: "María López"
  - Servicio: "Facturación"
  - Notas: "No puedo descargar factura"
  - Click en "Agregar ticket"

Sistema:
  - POST /api/tickets
  - Crea Ticket #1 con status='initial'
  - Agrega a state.queues['Facturación']
  - Frontend renderiza tarjeta azul "Creado"
```

### 2. Despachar Ticket
```
Usuario: Click en botón "Despachar" en la tarjeta #1

Sistema:
  - POST /api/tickets/1/dispatch
  - Cambia status a 'processed'
  - Move a state.activeTickets['Facturación']
  - Frontend actualiza tarjeta a amarilla "Despachado"
```

### 3. Cerrar Ticket
```
Usuario: Click en botón "Cerrar" en la tarjeta #1

Sistema:
  - POST /api/tickets/1/close
  - Cambia status a 'closed'
  - Registra en history
  - Frontend muestra "✅ Completado"
```

---

## 📄 Variables de Entorno

Actualmente no hay configuración de .env, pero se pueden agregar:

```bash
PORT=3000                    # Puerto del servidor
NODE_ENV=development         # development | production
LOG_LEVEL=info              # debug | info | warn | error
```

---

## 🤝 Contribuciones

Para agregar nuevas funcionalidades:

1. **Crear rama**: `git checkout -b feature/nueva-feature`
2. **Desarrollar**: Hacer cambios en server.js, app.js o style.css
3. **Testear**: Verificar en http://localhost:3000
4. **Commit**: `git commit -m "Add: descripción de cambio"`
5. **Push**: `git push origin feature/nueva-feature`
6. **PR**: Crear Pull Request en GitHub

---

## 📞 Soporte

Para reportar bugs o sugerir mejoras, crear un Issue en el repositorio:
- https://github.com/concevecino/ticket-queue-chatbot/issues

---

## 📄 Licencia

MIT - Libre para usar en proyectos comerciales y personales

---

**Última actualización:** 2026-10-01  
**Versión:** 1.0.0  
**Desarrollador:** @concevecino
