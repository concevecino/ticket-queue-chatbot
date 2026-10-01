# Ticket Queue Chatbot

Aplicación web para gestionar tickets en una cola FIFO con un asistente conversacional.

## Funcionalidades

- Registro de tickets con cliente, servicio y notas
- Cola FIFO de atención
- Atención del siguiente ticket desde el chatbot o el panel
- Reencolado del ticket activo
- Cierre de tickets atendidos
- Estado en tiempo real de la fila
- Interfaz en español para acciones rápidas

## Tecnologías

- Node.js
- Express
- HTML + CSS + JavaScript

## Instalación

```bash
npm install
npm start
```

Luego abre tu navegador en:

http://localhost:3000

## Comandos del chatbot

- “nuevo ticket para Ana por soporte técnico”
- “siguiente”
- “estado”
- “cerrar #12”
- “reencolar”
- “ayuda”
