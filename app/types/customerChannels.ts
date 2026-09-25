// Mirrors office-api Features/CustomerChannels/CustomerChannelsEndpoints.cs (CustomerChannelDto).
export interface CustomerChannel {
  id: string;
  type: 'Instagram' | 'Facebook' | 'WhatsApp';
  name: string;
  isActive: boolean;
  /** Meta refused the token — automations stopped until the мизоҷ reconnects. */
  requiresReconnect: boolean;
  webhookSetupWarning: string | null;
  createdAt: string;
}
