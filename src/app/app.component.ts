import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TicketService } from './services/ticket.service';
import { ChatMessage, Ticket, TicketState } from './models/ticket.model';

@Component({
  selector: 'app-root',
  template: `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="brand">
          <div class="brand-mark">Q</div>
          <div>
            <h1>QueueBot</h1>
            <p>Colas por servicio</p>
          </div>
        </div>

        <div class="panel">
          <h2>Resumen</h2>
          <div class="stat-grid">
            <div>
              <span>En fila</span>
              <strong>{{ state?.metrics?.totalQueued ?? 0 }}</strong>
            </div>
            <div>
              <span>Procesando</span>
              <strong>{{ state?.metrics?.totalActive ?? 0 }}</strong>
            </div>
            <div>
              <span>Cerrados</span>
              <strong>{{ state?.metrics?.totalCompleted ?? 0 }}</strong>
            </div>
          </div>
        </div>

        <div class="panel">
          <h2>Crear ticket</h2>
          <form [formGroup]="ticketForm" (ngSubmit)="createTicket()">
            <label>
              Cliente
              <input formControlName="customerName" placeholder="Ej: Ana García" />
            </label>
            <label>
              Servicio
              <select formControlName="service">
                <option *ngFor="let service of services" [value]="service">{{ service }}</option>
              </select>
            </label>
            <label>
              Notas
              <textarea formControlName="notes" rows="3" placeholder="Detalles opcionales"></textarea>
            </label>
            <button type="submit" [disabled]="ticketForm.invalid || loading">{{ loading ? 'Creando...' : 'Agregar ticket' }}</button>
          </form>
        </div>
      </aside>

      <main class="chat-panel">
        <header class="chat-header">
          <p class="eyebrow">Asistente</p>
          <h2>Chatbot de atención</h2>
        </header>

        <div class="chat-log">
          <div *ngFor="let msg of messages" class="message" [class.user]="msg.role === 'user'">
            <span>{{ msg.content }}</span>
          </div>
        </div>

        <form class="chat-form" [formGroup]="chatForm" (ngSubmit)="sendChat()">
          <input formControlName="message" type="text" placeholder="Escribe un comando o solicitud..." autocomplete="off" />
          <button type="submit" [disabled]="chatForm.invalid || loading">Enviar</button>
        </form>

        <div class="tickets-panel" *ngIf="allTickets.length">
          <h2>Tickets</h2>
          <div class="ticket-list">
            <div *ngFor="let ticket of allTickets" class="ticket-card" [ngClass]="'state-' + ticket.status">
              <div class="ticket-header">
                <strong>#{{ ticket.id }}</strong>
                <span>{{ getStatusLabel(ticket.status) }}</span>
              </div>
              <div class="ticket-info">
                <div><label>Cliente:</label> {{ ticket.customerName }}</div>
                <div><label>Servicio:</label> {{ ticket.service }}</div>
                <div *ngIf="ticket.notes"><label>Notas:</label> {{ ticket.notes }}</div>
              </div>
              <div class="ticket-actions">
                <button *ngIf="ticket.status === 'initial'" (click)="dispatch(ticket.id)">Despachar</button>
                <button *ngIf="ticket.status === 'processed'" (click)="close(ticket.id)">Cerrar</button>
                <button *ngIf="ticket.status === 'processed'" class="secondary" (click)="requeue(ticket.id)">Reencolar</button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  `,
  styles: [
    `
      .app-shell { display: grid; grid-template-columns: 360px 1fr; gap: 24px; min-height: 100vh; padding: 24px; }
      .sidebar, .chat-panel { background: rgba(15, 23, 42, 0.78); border: 1px solid rgba(148, 163, 184, 0.18); border-radius: 22px; box-shadow: 0 18px 40px rgba(15, 23, 42, 0.35); }
      .sidebar { padding: 20px; }
      .brand { display: flex; align-items: center; gap: 14px; margin-bottom: 18px; }
      .brand-mark { width: 50px; height: 50px; display: grid; place-items: center; border-radius: 14px; background: linear-gradient(135deg, #5eead4, #7dd3fc); color: #062a2b; font-weight: 800; }
      .brand h1 { margin: 0; font-size: 1.25rem; }
      .brand p { margin: 4px 0 0; color: #94a3b8; }
      .panel { background: rgba(23, 34, 53, 0.9); border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 18px; padding: 16px; margin-bottom: 18px; }
      .panel h2 { margin: 0 0 12px; font-size: 1rem; }
      .stat-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
      .stat-grid div { background: rgba(148, 163, 184, 0.06); border-radius: 12px; padding: 12px 8px; display: flex; flex-direction: column; gap: 6px; text-align: center; }
      .stat-grid span { color: #94a3b8; font-size: 0.78rem; }
      .stat-grid strong { font-size: 1.3rem; }
      label { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; color: #94a3b8; }
      input, textarea, select { width: 100%; border: 1px solid rgba(148, 163, 184, 0.2); background: rgba(15, 23, 42, 0.8); color: #e2e8f0; border-radius: 10px; padding: 10px 12px; }
      button { width: 100%; border: none; border-radius: 10px; padding: 11px 14px; background: linear-gradient(135deg, #5eead4, #7dd3fc); color: #062a2b; font-weight: 700; }
      button.secondary { background: rgba(169, 183, 255, 0.12); color: #7dd3fc; border: 1px solid rgba(125, 211, 252, 0.4); }
      .chat-panel { display: flex; flex-direction: column; overflow: hidden; }
      .chat-header { padding: 18px 22px; border-bottom: 1px solid rgba(148, 163, 184, 0.18); background: rgba(15, 23, 42, 0.6); }
      .eyebrow { margin: 0; color: #5eead4; text-transform: uppercase; letter-spacing: 0.12em; font-size: 0.72rem; }
      .chat-header h2 { margin: 8px 0 0; }
      .chat-log { flex: 1; padding: 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; }
      .message { max-width: 80%; border-radius: 16px; padding: 12px 14px; background: rgba(96, 165, 250, 0.12); border: 1px solid rgba(96, 165, 250, 0.2); }
      .message.user { align-self: flex-end; background: rgba(45, 212, 191, 0.18); border-color: rgba(94, 234, 212, 0.25); }
      .chat-form { display: flex; gap: 12px; padding: 16px 20px 20px; border-top: 1px solid rgba(148, 163, 184, 0.18); background: rgba(15, 23, 42, 0.75); }
      .chat-form input { flex: 1; margin: 0; }
      .tickets-panel { padding: 0 20px 20px; }
      .ticket-list { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px; }
      .ticket-card { background: rgba(23, 34, 53, 0.9); border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 14px; padding: 14px; }
      .state-initial { border-left: 4px solid #60a5fa; }
      .state-processed { border-left: 4px solid #fbbf24; }
      .state-closed { border-left: 4px solid #22c55e; }
      .ticket-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
      .ticket-info { display: flex; flex-direction: column; gap: 6px; color: #e2e8f0; }
      .ticket-info label { margin: 0; display: inline; color: #94a3b8; font-size: 0.8rem; }
      .ticket-actions { display: flex; gap: 8px; margin-top: 12px; }
      .ticket-actions button { flex: 1; }
      @media (max-width: 920px) { .app-shell { grid-template-columns: 1fr; padding: 16px; } }
    `
  ]
})
export class AppComponent {
  state: TicketState | null = null;
  messages: ChatMessage[] = [{ role: 'bot', content: 'Hola, soy el bot de colas por servicio. Puedes pedirme: "nuevo ticket para Ana por soporte", "siguiente", "estado" o "cerrar #12".' }];
  loading = false;
  ticketForm: FormGroup;
  chatForm: FormGroup;

  constructor(private ticketService: TicketService, private fb: FormBuilder) {
    this.ticketForm = this.fb.group({
      customerName: ['', Validators.required],
      service: ['Soporte técnico', Validators.required],
      notes: ['']
    });

    this.chatForm = this.fb.group({
      message: ['', Validators.required]
    });

    this.ticketService.state$.subscribe((state) => {
      this.state = state;
    });
  }

  get services(): string[] {
    return this.state?.services ?? ['Soporte técnico', 'Facturación', 'Consultas generales', 'Devoluciones'];
  }

  get allTickets(): Ticket[] {
    if (!this.state) return [];
    const tickets: Ticket[] = [];
    Object.values(this.state.queues).forEach((queue) => tickets.push(...queue));
    Object.values(this.state.activeTickets).forEach((ticket) => {
      if (ticket) tickets.push(ticket);
    });
    return tickets.sort((a, b) => b.id - a.id);
  }

  createTicket(): void {
    if (this.ticketForm.invalid) return;
    const { customerName, service, notes } = this.ticketForm.value;
    this.loading = true;
    this.ticketService.createTicket({ customerName, service, notes }).subscribe({
      next: (res) => {
        this.loading = false;
        if (res.message) this.messages.push({ role: 'bot', content: res.message });
        this.ticketForm.reset({ service: 'Soporte técnico' });
      },
      error: () => {
        this.loading = false;
        this.messages.push({ role: 'bot', content: 'No se pudo crear el ticket.' });
      }
    });
  }

  sendChat(): void {
    const message = this.chatForm.value.message?.trim();
    if (!message) return;
    this.messages.push({ role: 'user', content: message });
    this.chatForm.reset();
    this.loading = true;
    this.ticketService.sendChat(message).subscribe({
      next: (res) => {
        this.loading = false;
        if (res.message) this.messages.push({ role: 'bot', content: res.message });
      },
      error: () => {
        this.loading = false;
        this.messages.push({ role: 'bot', content: 'No se pudo procesar el mensaje.' });
      }
    });
  }

  dispatch(id: number): void {
    this.ticketService.dispatchTicket(id).subscribe();
  }

  close(id: number): void {
    this.ticketService.closeTicket(id).subscribe();
  }

  requeue(id: number): void {
    this.ticketService.requeueTicket(id).subscribe();
  }

  getStatusLabel(status: string): string {
    return {
      initial: 'Creado',
      processed: 'Despachado',
      closed: 'Cerrado'
    }[status] ?? status;
  }
}
