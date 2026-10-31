import { useEffect, useRef } from 'react';
import { useRoomContext } from '@livekit/react-native';
import type { AgentActions, AgentUiHandlers } from '../../agent/types';

/** Method name the voice agent calls for a screen (kerabie-voice-agent/src/ui.ts uses the same prefix). */
export const UI_RPC_PREFIX = 'kerabie.ui.';
/** Method name the voice agent calls for one of the app's actions. */
export const ACTION_RPC_PREFIX = 'kerabie.action.';

/**
 * Inside the call's room: answers the agent's requests for a screen by running the app's handler for it. Anything a
 * handler throws reaches the agent as "the customer did not answer", never as an error on screen.
 */
export function AgentRpcBridge({ handlers, actions = {} }: { handlers: AgentUiHandlers; actions?: AgentActions }) {
  const room = useRoomContext();
  // The newest handlers are used without registering again on every render.
  const latest = useRef(handlers);
  latest.current = handlers;
  const latestActions = useRef(actions);
  latestActions.current = actions;
  const names = Object.keys(handlers).sort().join(',');
  const actionNames = Object.keys(actions).sort().join(',');

  useEffect(() => {
    const methods = names ? names.split(',') : [];
    for (const name of methods) {
      room.registerRpcMethod(`${UI_RPC_PREFIX}${name}`, async (data) => {
        const handler = (latest.current as Record<string, ((p: unknown) => Promise<unknown>) | undefined>)[name];
        if (!handler) throw new Error('This screen is not available');
        let payload: unknown = {};
        try { payload = data.payload ? JSON.parse(data.payload) : {}; } catch { /* an unreadable request is treated as empty */ }
        const answer = await handler(payload);
        return typeof answer === 'string' ? answer : JSON.stringify(answer);
      });
    }
    const acts = actionNames ? actionNames.split(',') : [];
    for (const name of acts) {
      room.registerRpcMethod(`${ACTION_RPC_PREFIX}${name}`, async (data) => {
        const action = latestActions.current[name];
        if (!action) throw new Error('This action is not available');
        let args: Record<string, any> = {};
        try { args = data.payload ? JSON.parse(data.payload) : {}; } catch { /* an unreadable request is treated as empty */ }
        const result = await action.run(args);
        return typeof result === 'string' ? result : JSON.stringify(result);
      });
    }
    return () => {
      methods.forEach((name) => room.unregisterRpcMethod(`${UI_RPC_PREFIX}${name}`));
      acts.forEach((name) => room.unregisterRpcMethod(`${ACTION_RPC_PREFIX}${name}`));
    };
  }, [room, names, actionNames]);

  return null;
}
