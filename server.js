const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const state = {
  queues: {},
  history: [],
  activeTickets: {},
  nextTicketId: 1,
  services: ['Soporte técnico', 'Facturación', 'Consultas generales', 'Devoluciones'],
};

function makeTicket({ customerName, service, notes }) {
  const customer = (customerName || 'Cliente').trim();
  const issue = (service || 'Consultas generales').trim();
  const details = (notes || '').trim();

  return {
    id: state.nextTicketId++,
    customerName: customer,
    service: issue,
    notes: details,
    status: 'initial',
    createdAt: new Date().toISOString(),
    attendedAt: null,
  };
}

function ensureQueueExists(service) {
  if (!state.queues[service]) {
    state.queues[service] = [];
  }
  if (!state.activeTickets[service]) {
    state.activeTickets[service] = null;
  }
}

function summarizeTicket(ticket) {
  return `#${ticket.id} · ${ticket.customerName} · ${ticket.service}`;
}

function pushHistory(type, message, ticket = null) {
  state.history.push({
    id: Date.now() + Math.random(),
    type,
    message,
    ticket,
    createdAt: new Date().toISOString(),
  });
}

function getSnapshot() {
  const snapshot = {
    queues: {},
    activeTickets: {},
    history: state.history.slice(-10),
    metrics: {
      totalQueued: 0,
      totalActive: 0,
      totalCompleted: state.history.filter((item) => item.type === 'closed').length,
      byService: {},
    },
    services: state.services,
  };

  for (const service of state.services) {
    ensureQueueExists(service);
    snapshot.queues[service] = state.queues[service];
    snapshot.activeTickets[service] = state.activeTickets[service];

    snapshot.metrics.byService[service] = {
      queued: state.queues[service].length,
      active: state.activeTickets[service] ? 1 : 0,
    };
    snapshot.metrics.totalQueued += state.queues[service].length;
    snapshot.metrics.totalActive += state.activeTickets[service] ? 1 : 0;
  }

  return snapshot;
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'Queue chatbot online' });
});

app.get('/api/state', (req, res) => {
  res.json(getSnapshot());
});

app.post('/api/tickets', (req, res) => {
  const { customerName, service, notes } = req.body || {};

  if (!customerName || !customerName.trim()) {
    return res.status(400).json({
      ok: false,
      message: 'Debes indicar el nombre del cliente para crear un ticket.',
    });
  }

  const normalizedService = (service && service.trim()) || 'Consultas generales';
  const ticket = makeTicket({ customerName, service: normalizedService, notes });
  ensureQueueExists(ticket.service);
  state.queues[ticket.service].push(ticket);
  pushHistory('created', `Ticket ${summarizeTicket(ticket)} agregado a la cola de ${ticket.service}.`, ticket);

  res.status(201).json({
    ok: true,
    message: `✅ Ticket #${ticket.id} creado para ${ticket.customerName} en ${ticket.service}. Estado: inicial.`,
    ticket,
    state: getSnapshot(),
  });
});

app.post('/api/tickets/next/:service', (req, res) => {
  const service = decodeURIComponent(req.params.service);
  ensureQueueExists(service);

  if (state.queues[service].length === 0) {
    return res.status(400).json({
      ok: false,
      message: `La cola de ${service} está vacía. No hay tickets pendientes.`,
      state: getSnapshot(),
    });
  }

  const ticket = state.queues[service].shift();
  ticket.status = 'processed';
  ticket.attendedAt = new Date().toISOString();
  state.activeTickets[service] = ticket;

  pushHistory('served', `Ticket #${ticket.id} pasó a estado procesado en ${service}.`, ticket);

  res.json({
    ok: true,
    message: `⏳ Ticket #${ticket.id} de ${ticket.customerName} está ahora en estado procesado para ${service}.`,
    ticket,
    state: getSnapshot(),
  });
});

app.post('/api/tickets/:id/requeue', (req, res) => {
  const id = Number(req.params.id);
  let foundService = null;

  for (const service of state.services) {
    if (state.activeTickets[service] && state.activeTickets[service].id === id) {
      foundService = service;
      break;
    }
  }

  if (!foundService) {
    return res.status(400).json({
      ok: false,
      message: 'No hay un ticket activo para reencolar.',
      state: getSnapshot(),
    });
  }

  const ticket = { ...state.activeTickets[foundService], status: 'initial' };
  state.activeTickets[foundService] = null;
  state.queues[foundService].push(ticket);
  pushHistory('requeued', `Ticket #${ticket.id} regresó al estado inicial y fue reencolado en ${foundService}.`, ticket);

  res.json({
    ok: true,
    message: `↩️  El ticket #${ticket.id} regresó a inicial y fue reencolado al final de ${foundService}.`,
    ticket,
    state: getSnapshot(),
  });
});

app.post('/api/tickets/:id/close', (req, res) => {
  const id = Number(req.params.id);
  let ticket = null;
  let foundService = null;

  for (const service of state.services) {
    if (state.activeTickets[service] && state.activeTickets[service].id === id) {
      ticket = state.activeTickets[service];
      state.activeTickets[service] = null;
      foundService = service;
      break;
    }

    const index = state.queues[service].findIndex((item) => item.id === id);
    if (index >= 0) {
      ticket = state.queues[service].splice(index, 1)[0];
      foundService = service;
      break;
    }
  }

  if (!ticket) {
    return res.status(404).json({
      ok: false,
      message: `No se encontró el ticket #${id}.`,
      state: getSnapshot(),
    });
  }

  ticket.status = 'closed';
  pushHistory('closed', `Ticket #${ticket.id} cerrado en ${foundService}.`, ticket);

  res.json({
    ok: true,
    message: `✅ Ticket #${ticket.id} cerrado con éxito en ${foundService}.`,
    ticket,
    state: getSnapshot(),
  });
});

function parseTicketRequest(message) {
  const msg = message.trim();
  const lower = msg.toLowerCase();

  if (!msg) return { action: 'help' };

  if (/(estado|fila|cola|status|mostrar).*(soporte|facturación|consulta|devolución)/.test(lower)) {
    let service = null;
    if (/soporte/.test(lower)) service = 'Soporte técnico';
    else if (/factur/.test(lower)) service = 'Facturación';
    else if (/consulta/.test(lower)) service = 'Consultas generales';
    else if (/devol/.test(lower)) service = 'Devoluciones';
    return { action: 'status', service };
  }

  if (/(cola|fila|estado|mostrar|lista|status)/.test(lower)) {
    return { action: 'status' };
  }

  if (/(siguiente|atender|llamar|next|servir)/.test(lower)) {
    let service = null;
    if (/soporte/.test(lower)) service = 'Soporte técnico';
    else if (/factur/.test(lower)) service = 'Facturación';
    else if (/consulta/.test(lower)) service = 'Consultas generales';
    else if (/devol/.test(lower)) service = 'Devoluciones';
    return { action: 'next', service };
  }

  if (/(reencolar|requeue|volver a la cola|retroceder)/.test(lower)) {
    return { action: 'requeue' };
  }

  if (/(cerrar|close|finalizar|solucionado)/.test(lower)) {
    const match = msg.match(/#?(\d+)/);
    return { action: 'close', ticketId: match ? Number(match[1]) : null };
  }

  if (/(ayuda|help|menu|comandos|servicios)/.test(lower)) {
    return { action: 'help' };
  }

  if (/(nuevo|crear|agregar|añadir|registrar)/.test(lower) || /(ticket|cliente)/.test(lower)) {
    let customerName = 'Cliente';
    let service = 'Consultas generales';

    if (/soporte/.test(lower)) service = 'Soporte técnico';
    else if (/factur/.test(lower)) service = 'Facturación';
    else if (/devol/.test(lower)) service = 'Devoluciones';
    else if (/consulta/.test(lower)) service = 'Consultas generales';

    const nameMatch = msg.match(/(?:para|de|cliente|persona)\s+([A-Za-zÀ-ÿ0-9\s]+?)(?:\s+|$)/i);
    if (nameMatch) {
      customerName = (nameMatch[1] || 'Cliente').trim();
    }

    return { action: 'create', customerName, service };
  }

  return { action: 'help' };
}

app.post('/api/chat', (req, res) => {
  const { message } = req.body || {};

  if (!message || !message.trim()) {
    return res.status(400).json({
      ok: false,
      message: 'Escribe un mensaje para que el chatbot pueda ayudarte.',
      state: getSnapshot(),
    });
  }

  const intent = parseTicketRequest(message);

  if (intent.action === 'status') {
    const snapshot = getSnapshot();

    if (intent.service) {
      const queue = snapshot.queues[intent.service] || [];
      const active = snapshot.activeTickets[intent.service];
      const queueText = queue.length
        ? queue.map((t) => `#${t.id} · ${t.customerName} · ${t.status}`).join('\n')
        : 'Sin tickets pendientes.';
      const activeText = active ? `#${active.id} · ${active.customerName} · ${active.status}` : 'Ninguno';

      return res.json({
        ok: true,
        message: `Estado de ${intent.service}:\n${queueText}\n\nProcesado: ${activeText}`,
        state: snapshot,
      });
    }

    const allQueues = state.services.map((svc) => {
      const queue = snapshot.queues[svc] || [];
      const active = snapshot.activeTickets[svc];
      return `${svc}: ${queue.length} en fila${active ? `, procesando #${active.id}` : ''}`;
    }).join('\n');

    return res.json({
      ok: true,
      message: `Estado general:\n${allQueues}`,
      state: snapshot,
    });
  }

  if (intent.action === 'next') {
    if (!intent.service) {
      return res.status(400).json({
        ok: false,
        message: 'Indica qué servicio: "siguiente Soporte", "siguiente Facturación", etc.',
        state: getSnapshot(),
      });
    }

    ensureQueueExists(intent.service);
    if (state.queues[intent.service].length === 0) {
      return res.status(400).json({
        ok: false,
        message: `La cola de ${intent.service} está vacía.`,
        state: getSnapshot(),
      });
    }

    const ticket = state.queues[intent.service].shift();
    ticket.status = 'processed';
    ticket.attendedAt = new Date().toISOString();
    state.activeTickets[intent.service] = ticket;
    pushHistory('served', `Ticket #${ticket.id} pasó a procesado en ${intent.service}.`, ticket);

    return res.json({
      ok: true,
      message: `⏳ Ticket #${ticket.id} de ${ticket.customerName} pasó a estado procesado en ${intent.service}.`,
      state: getSnapshot(),
    });
  }

  if (intent.action === 'requeue') {
    let foundService = null;
    for (const svc of state.services) {
      if (state.activeTickets[svc]) {
        foundService = svc;
        break;
      }
    }

    if (!foundService) {
      return res.status(400).json({
        ok: false,
        message: 'No hay ningún ticket activo para reencolar.',
        state: getSnapshot(),
      });
    }

    const ticket = { ...state.activeTickets[foundService], status: 'initial' };
    state.activeTickets[foundService] = null;
    state.queues[foundService].push(ticket);
    pushHistory('requeued', `Ticket #${ticket.id} volvió a inicial y se reencoló en ${foundService}.`, ticket);

    return res.json({
      ok: true,
      message: `↩️  El ticket #${ticket.id} volvió a inicial y fue reencolado al final de ${foundService}.`,
      state: getSnapshot(),
    });
  }

  if (intent.action === 'close') {
    const ticketId = intent.ticketId;
    if (!ticketId) {
      return res.status(400).json({
        ok: false,
        message: 'Debes indicar el número del ticket a cerrar. Ejemplo: cerrar #12',
        state: getSnapshot(),
      });
    }

    let ticket = null;
    let foundService = null;

    for (const svc of state.services) {
      if (state.activeTickets[svc] && state.activeTickets[svc].id === ticketId) {
        ticket = state.activeTickets[svc];
        state.activeTickets[svc] = null;
        foundService = svc;
        break;
      }

      const idx = state.queues[svc].findIndex((item) => item.id === ticketId);
      if (idx >= 0) {
        ticket = state.queues[svc].splice(idx, 1)[0];
        foundService = svc;
        break;
      }
    }

    if (!ticket) {
      return res.status(404).json({
        ok: false,
        message: `No existe el ticket #${ticketId}.`,
        state: getSnapshot(),
      });
    }

    ticket.status = 'closed';
    pushHistory('closed', `Ticket #${ticket.id} quedó cerrado en ${foundService}.`, ticket);

    return res.json({
      ok: true,
      message: `✅ Ticket #${ticket.id} cerrado con éxito en ${foundService}.`,
      state: getSnapshot(),
    });
  }

  if (intent.action === 'create') {
    const ticket = makeTicket({
      customerName: intent.customerName,
      service: intent.service,
    });
    ensureQueueExists(ticket.service);
    state.queues[ticket.service].push(ticket);
    pushHistory('created', `Ticket #${ticket.id} creado en ${ticket.service}.`, ticket);

    return res.json({
      ok: true,
      message: `✅ Ticket #${ticket.id} creado para ${ticket.customerName} en ${ticket.service}. Estado: inicial.`,
      state: getSnapshot(),
    });
  }

  return res.json({
    ok: true,
    message: 'Comandos:\n- Nuevo ticket para Ana por soporte\n- Siguiente Soporte\n- Estado Facturación\n- Cerrar #12\n- El ciclo es: inicial → procesado → cerrado',
    state: getSnapshot(),
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Ticket queue chatbot running on http://localhost:${PORT}`);
});
