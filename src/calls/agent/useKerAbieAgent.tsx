import React, { useCallback, useMemo } from 'react';
import { useKerAbieCall } from '../useKerAbieCall';
import { AgentRpcBridge } from './AgentRpcBridge';
import { useAgentUi } from '../../agent/AgentUi';
import type { KerAbieAgentConfig } from '../../agent/types';

export const DEFAULT_AGENT_NAME = 'Kerabie Agent';

/** The same three things as the provider's `agent` prop. */
export type KerAbieAgentOptions = KerAbieAgentConfig;

/**
 * The in-app voice agent: a call to the AI that can use your tools as the signed-in customer and ask your app to show
 * screens. Needs the LiveKit packages and a development build (not Expo Go), like calls. Use it through
 * `<KerAbieAgentButton />`, or render `<KerAbieCallModal call={agent.call} inRoom={agent.inRoom} />` yourself.
 */
export function useKerAbieAgent({ getUserToken, ui, actions, manageAudioSession, otherCallActive }: KerAbieAgentOptions & { manageAudioSession?: boolean; otherCallActive?: boolean } = {}) {
  const { handlers, element, names } = useAgentUi(ui);

  const prepare = useCallback(async () => {
    const token = (await getUserToken?.()) || undefined;
    const appActions = Object.entries(actions ?? {}).map(([name, a]) => ({ name, description: a.description, ...(a.parameters ? { parameters: a.parameters } : {}) }));
    return { userToken: token, uiTools: names, appActions };
  }, [getUserToken, names, actions]);

  const call = useKerAbieCall({ prepare, manageAudioSession, otherCallActive });

  const inRoom = useMemo(
    () => (
      <>
        <AgentRpcBridge handlers={handlers} actions={actions} />
        {element}
      </>
    ),
    [handlers, actions, element],
  );

  return { call, inRoom, available: call.available, start: () => call.start(false) };
}

export type KerAbieAgent = ReturnType<typeof useKerAbieAgent>;
