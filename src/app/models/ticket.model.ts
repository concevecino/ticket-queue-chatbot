export interface Ticket {
  id: number;
  customerName: string;
  service: string;
  notes?: string;
  status: 'initial' | 'processed' | 'closed';
  createdAt: string;
  attendedAt?: string | null;
  closedAt?: string | null;
}

export interface TicketState {
  queues: Record<string, Ticket[]>;
  activeTickets: Record<string, Ticket | null>;
  services: string[];
  metrics: {
    totalQueued: number;
    totalActive: number;
    totalCompleted: number;
    byService: Record<string, { queued: number; active: number }>;
  };
}

export interface ChatMessage {
  role: 'user' | 'bot';
  content: string;
  timestamp?: Date;
}

export interface ApiResponse {
  ok: boolean;
  message: string;
  ticket?: Ticket;
  state?: TicketState;
}
