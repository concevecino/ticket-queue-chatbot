const chatLog = document.getElementById('chat-log');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const ticketForm = document.getElementById('ticket-form');
const queuedCount = document.getElementById('queued-count');
const activeCount = document.getElementById('active-count');
const completedCount = document.getElementById('completed-count');

function addMessage(role, text) {
  const el = document.createElement('div');
  el.className = `message ${role}`;
  el.innerHTML = `<span>${String(text).replace(/\n/g, '<br />')}</span>`;
  chatLog.appendChild(el);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function renderStats(state = { metrics: { queued: 0, active: 0, completed: 0 } }) {
  queuedCount.textContent = state.metrics?.queued ?? 0;
  activeCount.textContent = state.metrics?.active ?? 0;
  completedCount.textContent = state.metrics?.completed ?? 0;
}

async function fetchState() {
  const res = await fetch('/api/state');
  const state = await res.json();
  renderStats(state);
}

async function sendChatMessage(message) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });

  const data = await res.json();
  renderStats(data.state || { metrics: { queued: 0, active: 0, completed: 0 } });
  addMessage('bot', data.message || 'No hubo respuesta del chatbot.');
}

async function createTicket(event) {
  event.preventDefault();
  const payload = {
    customerName: document.getElementById('customer-name').value,
    service: document.getElementById('service-name').value,
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

async function triggerAction(action) {
  if (action === 'status') {
    await sendChatMessage('estado');
    return;
  }

  if (action === 'next') {
    const res = await fetch('/api/tickets/next', { method: 'POST' });
    const data = await res.json();
    renderStats(data.state || { metrics: { queued: 0, active: 0, completed: 0 } });
    addMessage('bot', data.message || 'No se pudo atender el siguiente ticket.');
    return;
  }

  if (action === 'requeue') {
    const state = await fetch('/api/state').then((r) => r.json());
    const id = state.activeTicket?.id ?? 0;
    const res = await fetch(`/api/tickets/${id}/requeue`, { method: 'POST' });
    const data = await res.json();
    renderStats(data.state || { metrics: { queued: 0, active: 0, completed: 0 } });
    addMessage('bot', data.message || 'No se pudo reencolar.');
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
document.querySelectorAll('[data-action]').forEach((button) => {
  button.addEventListener('click', () => triggerAction(button.dataset.action));
});

fetchState();
