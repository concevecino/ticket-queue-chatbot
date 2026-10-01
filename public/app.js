const chatLog = document.getElementById('chat-log');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const ticketForm = document.getElementById('ticket-form');
const totalQueued = document.getElementById('total-queued');
const totalActive = document.getElementById('total-active');
const totalCompleted = document.getElementById('total-completed');
const servicesList = document.getElementById('services-list');

function addMessage(role, text) {
  const el = document.createElement('div');
  el.className = `message ${role}`;
  el.innerHTML = `<span>${String(text).replace(/\n/g, '<br />')}</span>`;
  chatLog.appendChild(el);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function getStateClass(status) {
  if (status === 'initial') return 'state-initial';
  if (status === 'processed') return 'state-processed';
  if (status === 'closed') return 'state-closed';
  return '';
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
          <span>Procesando: <span class="queue-badge">${metrics.active}</span></span>
        </div>
      `;
      div.addEventListener('click', () => {
        chatInput.value = `estado ${service}`;
        chatInput.focus();
      });
      servicesList.appendChild(div);
    });
  }
}

async function fetchState() {
  const res = await fetch('/api/state');
  const state = await res.json();
  renderStats(state);
  return state;
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
    addMessage('bot', data.message);
    renderStats(data.state);
    ticketForm.reset();
  } else {
    addMessage('bot', data.message || 'No se pudo crear el ticket.');
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

fetchState();
