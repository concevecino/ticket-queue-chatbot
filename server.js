const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const state = {
  queue: [],
  history: [],
  activeTicket: null,
  nextTicketId: 1,
};

function summarizeTicket(ticket) {
  return `#${ticket.id} · ${ticket.customerName} · ${ticket.service}`;
}

function makeTicket({ customerName, service, notes }) {
  const customer = (customerName || 'Cliente').trim();
  const issue = (service || 'Atención general').trim();
  const details = (notes || '').trim();

  return {
    id: state.nextTicketId++,
    customerName: customer,
    service: issue,
    notes: details,
    status: 'waiting',
    createdAt: new Date().toISOString(),
    attendedAt: null,
  };
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
  return {
    queue: state.queue,
    activeTicket: state.activeTicket,
    history: state.history.slice(-10),
    metrics: {
      queued: state.queue.length,
      active: state.activeTicket ? 1 : 0,
      completed: state.history.filter((item) => item.type === 'closed').length,
    },
  };
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

  const ticket = makeTicket({ customerName, service, notes });
  state.queue.push(ticket);
  pushHistory('created', `Ticket ${summarizeTicket(ticket)} agregado a la cola.`, ticket);

  res.status(201).json({
    ok: true,
    message: `Ticket #${ticket.id} creado para ${ticket.customerName}.`,
    ticket,
    state: getSnapshot(),
  });
});

app.post('/api/tickets/next', (req, res) => {
  if (state.queue.length === 0) {
    return res.status(400).json({
      ok: false,
      message: 'La cola está vacía. No hay tickets pendientes.',
      state: getSnapshot(),
    });
  }

  const ticket = state.queue.shift();
  ticket.status = 'in_service';
  ticket.attendedAt = new Date().toISOString();
  state.activeTicket = ticket;

  pushHistory('served', `Se está atendiendo a ${ticket.customerName} en ${ticket.service}.`, ticket);

  res.json({
    ok: true,
    message: `Ahora atiendo a ${ticket.customerName} en ${ticket.service}.`,
    ticket,
    state: getSnapshot(),
  });
});

app.post('/api/tickets/:id/requeue', (req, res) => {
  const id = Number(req.params.id);

  if (!state.activeTicket || state.activeTicket.id !== id) {
    return res.status(400).json({
      ok: false,
      message: 'No hay un ticket activo para reencolar.',
      state: getSnapshot(),
    });
  }

  const ticket = { ...state.activeTicket, status: 'waiting' };
  state.activeTicket = null;
  state.queue.push(ticket);
  pushHistory('requeued', `Ticket #${ticket.id} reencolado al final de la fila.`, ticket);

  res.json({
    ok: true,
    message: `El ticket #${ticket.id} fue reencolado al final.`,
    ticket,
    state: getSnapshot(),
  });
});

app.post('/api/tickets/:id/close', (req, res) => {
  const id = Number(req.params.id);

  let ticket = null;

  if (state.activeTicket && state.activeTicket.id === id) {
    ticket = state.activeTicket;
    state.activeTicket = null;
  } else {
    const index = state.queue.findIndex((item) => item.id === id);
    if (index >= 0) {
      ticket = state.queue.splice(index, 1)[0];
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
  pushHistory('closed', `Ticket #${ticket.id} cerrado.`, ticket);

  res.json({
    ok: true,
    message: `Ticket #${ticket.id} cerrado con éxito.`,
    ticket,
    state: getSnapshot(),
  });
});

function parseTicketRequest(message) {
  const msg = message.trim();
  const lower = msg.toLowerCase();

  if (!msg) return { action: 'help' };

  if (/(cola|fila|estado|mostrar|lista|status)/.test(lower)) {
    return { action: 'status' };
  }

  if (/(siguiente|atender|llamar|next|servir)/.test(lower)) {
    return { action: 'next' };
  }

  if (/(reencolar|requeue|volver a la cola|retroceder)/.test(lower)) {
    return { action: 'requeue' };
  }

  if (/(cerrar|close|finalizar|solucionado)/.test(lower)) {
    const match = msg.match(/#?(\d+)/);
    return { action: 'close', ticketId: match ? Number(match[1]) : null };
  }

  if (/(ayuda|help|menu|comandos)/.test(lower)) {
    return { action: 'help' };
  }

  if (/(nuevo|crear|agregar|añadir|registrar)/.test(lower) || /(ticket|cliente|persona)/.test(lower)) {
    let customerName = 'Cliente';
    let service = 'Atención general';

    const nameMatch = msg.match(/(?:para|de|cliente|persona)\s+([A-Za-zÀ-ÿ0-9\s]+?)(?:\s+(?:por|servicio|tema|asunto|porque)\s+(.+)|$)/i);
    if (nameMatch) {
      customerName = (nameMatch[1] || 'Cliente').trim();
      if (nameMatch[2]) service = nameMatch[2].trim();
    }

    const explicitService = msg.match(/(?:por|servicio|tema|asunto)\s+(.+)$/i);
    if (explicitService) service = explicitService[1].trim();

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
    const queueText = snapshot.queue.length
      ? snapshot.queue.map((ticket) => `#${ticket.id} · ${ticket.customerName} · ${ticket.service}`).join('\n')
      : 'Sin tickets pendientes.';

    return res.json({
      ok: true,
      message: `Estado de la fila:\n${queueText}\n\nTicket activo: ${snapshot.activeTicket ? `#${snapshot.activeTicket.id} · ${snapshot.activeTicket.customerName}` : 'Ninguno'}`,
      state: snapshot,
    });
  }

  if (intent.action === 'next') {
    if (state.queue.length === 0) {
      return res.status(400).json({
        ok: false,
        message: 'La cola está vacía. No hay ticket para atender.',
        state: getSnapshot(),
      });
    }

    const ticket = state.queue.shift();
    ticket.status = 'in_service';
    ticket.attendedAt = new Date().toISOString();
    state.activeTicket = ticket;
    pushHistory('served', `Se atendió a ${ticket.customerName}.`, ticket);

    return res.json({
      ok: true,
      message: `Ahora atiendo a ${ticket.customerName} en ${ticket.service}.`,
      state: getSnapshot(),
    });
  }

  if (intent.action === 'requeue') {
    if (!state.activeTicket) {
      return res.status(400).json({
        ok: false,
        message: 'No hay ningún ticket activo para reencolar.',
        state: getSnapshot(),
      });
    }

    const ticket = { ...state.activeTicket, status: 'waiting' };
    state.activeTicket = null;
    state.queue.push(ticket);
    pushHistory('requeued', `Ticket #${ticket.id} reencolado al final.`, ticket);

    return res.json({
      ok: true,
      message: `El ticket #${ticket.id} fue reencolado al final de la fila.`,
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
    if (state.activeTicket && state.activeTicket.id === ticketId) {
      ticket = state.activeTicket;
      state.activeTicket = null;
    } else {
      const idx = state.queue.findIndex((item) => item.id === ticketId);
      if (idx >= 0) ticket = state.queue.splice(idx, 1)[0];
    }

    if (!ticket) {
      return res.status(404).json({
        ok: false,
        message: `No existe el ticket #${ticketId}.`,
        state: getSnapshot(),
      });
    }

    ticket.status = 'closed';
    pushHistory('closed', `Ticket #${ticket.id} cerrado.`, ticket);

    return res.json({
      ok: true,
      message: `Ticket #${ticket.id} cerrado con éxito.`,
      state: getSnapshot(),
    });
  }

  if (intent.action === 'create') {
    const ticket = makeTicket({
      customerName: intent.customerName,
      service: intent.service,
    });
    state.queue.push(ticket);
    pushHistory('created', `Ticket #${ticket.id} creado.`, ticket);

    return res.json({
      ok: true,
      message: `Ticket #${ticket.id} creado para ${ticket.customerName}. Servicio: ${ticket.service}.`,
      state: getSnapshot(),
    });
  }

  return res.json({
    ok: true,
    message: 'Comandos disponibles:\n- Nuevo ticket para Ana por soporte\n- Siguiente\n- Estado\n- Cerrar #12\n- Reencolar\n- Ayuda',
    state: getSnapshot(),
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Ticket queue chatbot running on http://localhost:${PORT}`);
});
