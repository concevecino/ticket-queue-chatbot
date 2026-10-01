const chatLog = document.getElementById('chat-log');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const ticketForm = document.getElementById('ticket-form');
const totalQueued = document.getElementById('total-queued');
const totalActive = document.getElementById('total-active');
const totalCompleted = document.getElementById('total-completed');
const servicesList = document.getElementById('services-list');
const ticketsList = document.getElementById('tickets-list');

function addMessage(role, text) {
  const el = document.createElement('div');
  el.className = `message ${role}`;
  el.innerHTML = `<span>${String(text).replace(/\n/g, '<br />')}</span>`;
  chatLog.appendChild(el);
  chatLog.scrollTop = chatLog.scrollHeight;
  // Limitar a últimos 5 mensajes
  const messages = chatLog.querySelectorAll('.message');
  if (messages.length > 5) {
    messages[0].remove();
  }
}

function getStateClass(status) {
  if (status === 'initial') return 'state-initial';
  if (status === 'processed') return 'state-processed';
  if (status === 'closed') return 'state-closed';
  return '';
}

function getStateLabel(status) {
  if (status === 'initial') return 'Creado';
  if (status === 'processed') return 'Despachado';
  if (status === 'closed') return 'Cerrado';
  return status;
}

function renderTickets(state) {
  ticketsList.innerHTML = '';
  
  if (!state.queues) return;

  // Recopilar todos los tickets de todas las colas
  const allTickets = [];
  for (const service in state.queues) {
    const queueTickets = state.queues[service] || [];
    queueTickets.forEach(t => {
      allTickets.push({ ...t, service });
    });
  }

  // Agregar tickets activos
  for (const service in state.activeTickets) {
    const activeTicket = state.activeTickets[service];
    if (activeTicket) {
      allTickets.push({ ...activeTicket, service });
    }
  }

  // Ordenar por ID descendente
  allTickets.sort((a, b) => b.id - a.id);

  // Renderizar tarjetas
  allTickets.forEach(ticket => {
    const card = document.createElement('div');
    card.className = 'ticket-card';
    
    const createdAt = new Date(ticket.createdAt).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });

    card.innerHTML = `
      <div class="ticket-header">
        <div class="ticket-id">#${ticket.id}</div>
        <span class="ticket-state ${getStateClass(ticket.status)}">${getStateLabel(ticket.status)}</span>
      </div>
      
      <div class="ticket-info">
        <div class="ticket-info-row">
          <span class="ticket-info-label">Cliente:</span>
          <strong>${ticket.customerName}</strong>
        </div>
        <div class="ticket-info-row">
          <span class="ticket-info-label">Servicio:</span>
          <strong>${ticket.service}</strong>
        </div>
        <div class="ticket-info-row">
          <span class="ticket-info-label">Creado:</span>
          <span>${createdAt}</span>
        </div>
        ${ticket.notes ? `
          <div class="ticket-info-row">
            <span class="ticket-info-label">Notas:</span>
            <span>${ticket.notes}</span>
          </div>
        ` : ''}
      </div>

      <div class="ticket-actions" id="actions-${ticket.id}">
        ${ticket.status === 'initial' ? `
          <button class="btn-dispatch" onclick="transitionTicket(${ticket.id}, 'processed')">
            Despachar
          </button>
        ` : ''}
        ${ticket.status === 'processed' ? `
          <button class="btn-close" onclick="transitionTicket(${ticket.id}, 'closed')">
            Cerrar
          </button>
        ` : ''}
        ${ticket.status === 'closed' ? `
          <span style="text-align: center; width: 100%; color: var(--success);">✅ Completado</span>
        ` : ''}
      </div>
    `;

    ticketsList.appendChild(card);
  });
}

function renderStats(state = { metrics: { totalQueued: 0, totalActive: 0, totalCompleted: 0, byService: {} } }) {
  totalQueued.textContent = state.metrics?.totalQueued ?? 0;
  totalActive.textContent = state.metrics?.totalActive ?? 0;
  totalCompleted.textContent = state.metrics?.totalCompleted ?? 0;

  servicesList.innerHTML = '';
  if (state.services && state.metrics.byService) {
    state.services.forEach((service) => {
      const metrics = state.metrics.byService[service] || { queued: 0, active: 0 };
      const div = document.createElement('div');
      div.className = 'service-item';
      div.innerHTML = `
        <div class="service-name">${service}</div>
        <div class="service-status">
          <span>En fila: <span class="queue-badge">${metrics.queued}</span></span>
          <span>Despachados: <span class="queue-badge">${metrics.active}</span></span>
        </div>
      `;
      servicesList.appendChild(div);
    });
  }

  renderTickets(state);
}

async function fetchState() {
  const res = await fetch('/api/state');
  const state = await res.json();
  renderStats(state);
  return state;
}

async function transitionTicket(ticketId, newStatus) {
  let endpoint = '';
  let message = '';

  if (newStatus === 'processed') {
    endpoint = `/api/tickets/${ticketId}/dispatch`;
    message = 'despachando';
  } else if (newStatus === 'closed') {
    endpoint = `/api/tickets/${ticketId}/close`;
    message = 'cerrando';
  }

  try {
    const res = await fetch(endpoint, { method: 'POST' });
    const data = await res.json();
    
    if (data.ok) {
      addMessage('bot', `✅ ${data.message}`);
      renderStats(data.state);
    } else {
      addMessage('bot', `❌ Error: ${data.message}`);
    }
  } catch (err) {
    addMessage('bot', `❌ Error al ${message} el ticket`);
  }
}

async function sendChatMessage(message) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });

  const data = await res.json();
  renderStats(data.state);
  addMessage('bot', data.message || 'No hubo respuesta del chatbot.');
}

async function createTicket(event) {
  event.preventDefault();
  const payload = {
    customerName: document.getElementById('customer-name').value,
    service: document.getElementById('service-select').value,
    notes: document.getElementById('ticket-notes').value,
  };

  const res = await fetch('/api/tickets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (data.ok) {
    addMessage('bot', `✅ ${data.message}`);
    renderStats(data.state);
    ticketForm.reset();
  } else {
    addMessage('bot', `❌ ${data.message || 'No se pudo crear el ticket.'}`);
  }
}

chatForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const text = chatInput.value.trim();
  if (!text) return;

  addMessage('user', text);
  chatInput.value = '';
  await sendChatMessage(text);
});

ticketForm.addEventListener('submit', createTicket);

// Actualizar estado cada 2 segundos
setInterval(fetchState, 2000);
fetchState();
