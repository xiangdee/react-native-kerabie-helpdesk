/** The screens the agent can ask your app to show. The app decides how each one looks; the agent only asks and waits. */
export type AgentUiToolName =
  | 'show_items'
  | 'pick_saved_address'
  | 'request_address_input'
  | 'confirm_action'
  | 'pick_schedule'
  | 'open_screen';

export interface AgentItem {
  id: string;
  name: string;
  subtitle?: string;
  price?: string;
  image?: string;
}

/** What each screen is asked for. */
export interface AgentUiPayloads {
  show_items: { title: string; items: AgentItem[] };
  pick_saved_address: { purpose: string };
  request_address_input: { purpose: string };
  confirm_action: { summary: string };
  pick_schedule: { purpose: string; earliest?: string };
  open_screen: { screen: string };
}

/**
 * Shows the screen and resolves with the customer's answer, which the agent reads back:
 *   show_items → the tapped item id, or "none"
 *   pick_saved_address → the chosen address id, or "none" to type a new one
 *   request_address_input → the typed address
 *   confirm_action → "yes" or "no"
 *   pick_schedule → an ISO 8601 date and time with the timezone
 *   open_screen → "opened"
 * An object is sent as JSON. Throwing tells the agent the customer did not answer.
 */
export type AgentUiHandler<T extends AgentUiToolName> = (payload: AgentUiPayloads[T]) => Promise<string | Record<string, unknown>>;

export type AgentUiHandlers = { [T in AgentUiToolName]?: AgentUiHandler<T> };

/**
 * Something your app does for the agent on the device, such as adding to the app's own cart or starting its checkout.
 * The agent sees it as a tool named `action_<name>`, calls it with the arguments you describe, and tells the customer
 * what `run` returned.
 */
export interface AgentAction {
  /** When the agent should use it (10 characters or more). */
  description: string;
  /** The inputs as JSON Schema, for example `{ type: 'object', properties: { itemId: { type: 'string' } }, required: ['itemId'] }`. Leave out for an action that takes none. */
  parameters?: { type: 'object'; properties: Record<string, unknown>; required?: string[] };
  /** Runs it in your app and returns a short result the agent can say ("Added 2 x Ofada rice"). Throw to tell the agent it failed. */
  run: (args: Record<string, any>) => Promise<string | Record<string, unknown>>;
}

/** Actions by name (snake_case, for example `add_to_cart`). */
export type AgentActions = Record<string, AgentAction>;

/**
 * The AI agent of your app, for the chat (works in Expo Go) and, in a development build, for voice. Pass it to
 * `<KerAbieProvider agent={...}>`; the voice agent button takes the same three things.
 */
export interface KerAbieAgentConfig {
  /** Called whenever a message is sent. Return the signed-in customer's token (the one your own API accepts), or nothing when nobody is signed in. */
  getUserToken?: GetAgentUserToken;
  /** Your app's screens for the agent. A list, a confirmation and an address box are built in; add the rest (saved addresses, date picker, opening screens). */
  ui?: AgentUiHandlers;
  /** Things your app does for the agent on the device (add to the app's own cart, start its checkout). Each becomes a tool the agent can call. */
  actions?: AgentActions;
}

/**
 * What the agent knows about the customer. Return their sign-in token (the one your own API accepts) so tools that act on
 * their account can run as them. Return nothing when nobody is signed in: the agent then only uses public tools.
 */
export type GetAgentUserToken = () => Promise<string | null | undefined> | string | null | undefined;
