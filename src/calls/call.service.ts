import { ApiService } from '../services/api.service';

/** What the app needs to take part in a call: where it stands, and a short-lived pass to join its LiveKit room. */
export interface CallJoin {
  callId: number;
  status: 'QUEUED' | 'RINGING' | 'ACTIVE' | string;
  video: boolean;
  handler: 'HUMAN' | 'AI' | null;
  /** True while a person is ringing this customer: they answer or decline before joining the room. */
  incoming?: boolean;
  /** Who is calling, when a person rang the customer. */
  agentName?: string;
  /** Place in the queue (1 = next), only while the call is waiting. */
  queuePosition?: number;
  livekit: { url: string; token: string };
}

/** Who the customer is and which screens the app can show, for the AI agent's account tools and pickers. */
export interface AgentSession {
  userToken?: string;
  uiTools?: string[];
  /** The actions the app registered, described for the agent. */
  appActions?: { name: string; description: string; parameters?: Record<string, unknown> }[];
}

export const CallService = {
  /** Starts a call. If the visitor already has one going, they are put back into it. */
  start(video: boolean, agent?: AgentSession): Promise<CallJoin> {
    return ApiService.post<CallJoin>('/public/widget/calls', { video, ...(agent?.userToken ? { userToken: agent.userToken } : {}), ...(agent?.uiTools?.length ? { uiTools: agent.uiTools } : {}), ...(agent?.appActions?.length ? { appActions: agent.appActions } : {}) });
  },

  /** The call this visitor is in right now, so an app that was closed can rejoin it. */
  async current(): Promise<CallJoin | null> {
    const res = await ApiService.get<{ call: CallJoin | null }>('/public/widget/calls/current');
    return res.call;
  },

  /** Picks up a call a person started. */
  answer(callId: number): Promise<CallJoin> {
    return ApiService.post<CallJoin>(`/public/widget/calls/${callId}/answer`, {});
  },

  /** Hangs up, or cancels a call nobody has answered yet. */
  end(callId: number): Promise<{ success: boolean }> {
    return ApiService.post(`/public/widget/calls/${callId}/end`, {});
  },
};
