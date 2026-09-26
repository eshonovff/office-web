import type { AutomationTriggerConfig } from './commentAutomation';

export type FlowNodeType = 'message' | 'condition' | 'action' | 'note';

export const FLOW_TRIGGER_TYPES = ['instagram_comment', 'instagram_dm'] as const;
export type FlowTriggerType = (typeof FLOW_TRIGGER_TYPES)[number];

// Ports used as FromPort on a FlowEdge — condition uses match/nomatch, message
// buttons use `button:{index}`, everything else has a single `default` output.
export const FLOW_PORT_DEFAULT = 'default';
export const FLOW_PORT_MATCH = 'match';
export const FLOW_PORT_NOMATCH = 'nomatch';
export function buttonPort(index: number): string {
  return `button:${index}`;
}

export interface MessageBlock {
  type: 'text' | 'image' | 'video' | 'audio' | 'file';
  text: string | null;
  mediaId: string | null;
  // Small base64 thumbnail generated server-side at upload time — mediaId (Meta's
  // attachment_id) is opaque and can't be fetched back as a viewable image, so this
  // is the only way to show a preview after a page reload.
  previewDataUri?: string | null;
  // Text blocks only: other wordings of the same message — the bot sends each contact one of
  // text + variants (office-api MessageTextPicker), so not everyone gets the identical text.
  variants?: string[] | null;
}

export interface UploadFlowMediaResult {
  mediaId: string;
  blockType: 'image' | 'video' | 'audio' | 'file';
  previewDataUri?: string | null;
}

export interface MessageButton {
  title: string;
  action: 'next' | 'url';
  url: string | null;
  allowRepeat: boolean;
}

export interface MessageNodeConfig {
  blocks: MessageBlock[];
  buttons: MessageButton[];
}

export type ConditionField = 'subscription' | 'tags' | 'variable' | 'time' | 'date' | 'weekday' | string;
export type ConditionOp = 'equals' | 'not_equals' | 'contains' | 'has' | 'not_has' | 'before' | 'after';

export interface ConditionRule {
  field: ConditionField;
  op: ConditionOp;
  value: string;
}

export interface ConditionNodeConfig {
  match: 'all' | 'any';
  rules: ConditionRule[];
}

export type ActionKind =
  'delay' | 'add_tags' | 'remove_tags' | 'set_variable' | 'collect_input' | 'http_request' | 'goto_flow' | 'conversion';

export interface ActionNodeConfig {
  kind: ActionKind;
  delayMinutes?: number | null;
  tags?: string[] | null;
  variableKey?: string | null;
  variableValue?: string | null;
  httpUrl?: string | null;
  httpMethod?: string | null;
  httpBodyTemplate?: string | null;
  targetFlowId?: string | null;
}

export interface NoteNodeConfig {
  text: string;
}

export type FlowNodeConfig = MessageNodeConfig | ConditionNodeConfig | ActionNodeConfig | NoteNodeConfig;

export interface FlowListItem {
  id: string;
  channelId: string;
  name: string;
  isActive: boolean;
  triggerType: string;
  nodeCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface FlowNodeDto {
  id: string;
  type: FlowNodeType;
  config: unknown;
  x: number;
  y: number;
}

export interface FlowEdgeDto {
  id: string;
  fromNodeId: string;
  fromPort: string;
  toNodeId: string;
}

export interface FlowDetail {
  id: string;
  channelId: string;
  name: string;
  isActive: boolean;
  triggerType: string;
  triggerConfig: AutomationTriggerConfig;
  nodes: FlowNodeDto[];
  edges: FlowEdgeDto[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateFlowRequest {
  name: string;
  triggerType: FlowTriggerType;
  triggerConfig: AutomationTriggerConfig;
}

export type UpdateFlowRequest = CreateFlowRequest;

export interface FlowNodeInput {
  id: string;
  type: FlowNodeType;
  config: unknown;
  x: number;
  y: number;
}

export interface FlowEdgeInput {
  id: string;
  fromNodeId: string;
  fromPort: string;
  toNodeId: string;
}

export interface UpdateFlowGraphRequest {
  nodes: FlowNodeInput[];
  edges: FlowEdgeInput[];
}

export interface FlowNodeStat {
  nodeId: string;
  contactCount: number;
}

export interface FlowFailure {
  sessionId: string;
  error: string;
  createdAt: string;
}

/** How many people clicked one "next" button of a message (each once). */
export interface FlowButtonStat {
  nodeId: string;
  buttonIndex: number;
  contactCount: number;
}

export interface FlowStats {
  totalSessions: number;
  finishedSessions: number;
  activeOrWaitingSessions: number;
  failedSessions: number;
  nodes: FlowNodeStat[];
  recentFailures: FlowFailure[];
  buttons: FlowButtonStat[];
  /** People who reached the goal («Мақсад») step — each once, all time. */
  conversions: number;
}

export interface FlowTemplateListItem {
  id: string;
  name: string;
  description: string | null;
}
