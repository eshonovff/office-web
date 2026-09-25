// Same bounds as the backend (AutomationTriggerConfig.MaxPublicReplies / MaxPublicReplyLength).
export const MAX_PUBLIC_REPLIES = 5;
export const MAX_PUBLIC_REPLY_LENGTH = 300;

/** Every variant must say something when the reply is on (off = an empty list, also valid). */
export function publicRepliesValid(value: string[]): boolean {
  return (
    value.length <= MAX_PUBLIC_REPLIES && value.every((r) => r.trim().length > 0 && r.length <= MAX_PUBLIC_REPLY_LENGTH)
  );
}
