import { getCustomerHubAccessToken } from '~/lib/signalr';
import { createHubStore } from '~/store/createHubStore';

// The мизоҷ's realtime connection (CustomerHub): the server puts it in the group of the
// customer in its own token only, and sends bare "ChatUpdated" {conversationId} signals.
export const useCustomerHub = createHubStore('/hubs/customer', getCustomerHubAccessToken);
