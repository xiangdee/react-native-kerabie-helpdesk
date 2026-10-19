import { ApiService } from '../services/api.service';

/** What the app needs to take part in a call: where it stands, and a short-lived pass to join its LiveKit room. */
export interface CallJoin {
  callId: number;
  status: 'QUEUED' | 'RINGING' | 'ACTIVE' | string;
  video: boolean;
  handler: 'HUMAN' | 'AI' | null;
  /** Place in the queue (1 = next), only while the call is waiting. */
  queuePosition?: number;
  livekit: { url: string; token: string };
}

export const CallService = {
  /** Starts a call. If the visitor already has one going, they are put back into it. */
  start(video: boolean): Promise<CallJoin> {
    return ApiService.post<CallJoin>('/public/widget/calls', { video });
  },

  /** The call this visitor is in right now, so an app that was closed can rejoin it. */
  async current(): Promise<CallJoin | null> {
    const res = await ApiService.get<{ call: CallJoin | null }>('/public/widget/calls/current');
    return res.call;
  },

  /** Hangs up, or cancels a call nobody has answered yet. */
  end(callId: number): Promise<{ success: boolean }> {
    return ApiService.post(`/public/widget/calls/${callId}/end`, {});
  },
};
