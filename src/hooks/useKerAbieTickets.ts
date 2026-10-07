import { useCallback, useEffect, useState } from 'react';
import { ApiService } from '../services/api.service';
import type { KerTicket, KerTicketMessage, KerTicketPriority } from '../types';

/**
 * Ticket list/detail/create/reply for the helpdesk package — mirrors
 * useKerAbieKnowledgeBase's shape. Session preservation (which ticket(s)
 * belong to this device) rides on the same sessionId ApiService already
 * attaches to every request as x-session-id (see provider/KerAbieProvider,
 * which seeds it via StorageService's 7-day-TTL entry) — no extra storage
 * needed here.
 */
export function useKerAbieTickets() {
  const [tickets, setTickets] = useState<KerTicket[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ApiService.get<{ data: KerTicket[] }>('/public/tickets');
      setTickets(res.data ?? []);
    } catch {
      // keep previous list on error
    } finally {
      setLoading(false);
    }
  }, []);

  const getTicket = useCallback(async (id: number): Promise<{ ticket: KerTicket; messages: KerTicketMessage[] } | null> => {
    try {
      return await ApiService.get(`/public/tickets/${id}`);
    } catch {
      return null;
    }
  }, []);

  const createTicket = useCallback(async (params: {
    subject: string;
    message: string;
    priority?: KerTicketPriority;
    name?: string;
    email?: string;
  }): Promise<{ ticketId: number } | null> => {
    try {
      const res = await ApiService.post<{ ticketId: number }>('/public/tickets', params);
      fetchTickets();
      return res;
    } catch {
      return null;
    }
  }, [fetchTickets]);

  const replyToTicket = useCallback(async (id: number, body: string): Promise<boolean> => {
    try {
      await ApiService.post(`/public/tickets/${id}/reply`, { body });
      return true;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  return { tickets, loading, fetchTickets, getTicket, createTicket, replyToTicket };
}
