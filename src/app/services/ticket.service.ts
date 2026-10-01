import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, interval } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { ApiResponse, TicketState } from '../models/ticket.model';

@Injectable({ providedIn: 'root' })
export class TicketService {
  private apiUrl = `${environment.apiUrl}/api`;
  private stateSubject = new BehaviorSubject<TicketState | null>(null);
  state$ = this.stateSubject.asObservable();

  constructor(private http: HttpClient) {
    this.startPolling();
  }

  startPolling(): void {
    interval(2000)
      .pipe(
        switchMap(() => this.fetchState()),
        tap((state) => this.stateSubject.next(state))
      )
      .subscribe();
  }

  fetchState(): Observable<TicketState> {
    return this.http.get<TicketState>(`${this.apiUrl}/state`);
  }

  createTicket(payload: { customerName: string; service: string; notes?: string }): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/tickets`, payload).pipe(
      tap((res) => {
        if (res.state) this.stateSubject.next(res.state);
      })
    );
  }

  dispatchTicket(ticketId: number): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/tickets/${ticketId}/dispatch`, {}).pipe(
      tap((res) => {
        if (res.state) this.stateSubject.next(res.state);
      })
    );
  }

  closeTicket(ticketId: number): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/tickets/${ticketId}/close`, {}).pipe(
      tap((res) => {
        if (res.state) this.stateSubject.next(res.state);
      })
    );
  }

  requeueTicket(ticketId: number): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/tickets/${ticketId}/requeue`, {}).pipe(
      tap((res) => {
        if (res.state) this.stateSubject.next(res.state);
      })
    );
  }

  sendChat(message: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/chat`, { message }).pipe(
      tap((res) => {
        if (res.state) this.stateSubject.next(res.state);
      })
    );
  }
}
