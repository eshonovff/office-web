import type { MessageType } from '~/types/message';

/**
 * Instagram/Facebook (Messenger Platform) send several message shapes that
 * don't have their own MessageType on the backend — Office.Api's
 * InstagramPayloadParser/FacebookPayloadParser deliberately reuse Video/Text/
 * StoryReply with a recognizable marker in `body` instead (see the "Real
 * limitation, not silently glossed over" comments on those parsers' Reel/
 * sticker/reaction cases). This module is the frontend half of that
 * contract: it has to pattern-match the same markers the backend emits.
 *
 * story_reply and story_mention are the one pair genuinely indistinguishable
 * here — both arrive as MessageType.StoryReply, and the only signal left is
 * whether `body` (the reply text) is present. A mention has no body.
 */

export const REEL_MARKER = '[Reel]';
const STICKER_HEART_BODY = '❤️ (стикер)';
const REACTION_REMOVED_BODY = '[реаксия бардошта шуд]';
const REACTION_PREFIX = '[реаксия: ';
const UNSUPPORTED_TYPE_PREFIX = '[навъи дастгирӣнашуда: ';

export type MessengerContent =
  | { kind: 'reel'; caption: string | null }
  | { kind: 'storyReply'; text: string }
  | { kind: 'storyMention' }
  | { kind: 'stickerHeart' }
  | { kind: 'reaction'; emoji: string }
  | { kind: 'reactionRemoved' }
  | { kind: 'unsupportedType'; rawType: string };

export interface MessengerContentInput {
  type: MessageType;
  body: string | null;
}

/** Null means "nothing special — render this message the normal way for its type". */
export function classifyMessengerContent({ type, body }: MessengerContentInput): MessengerContent | null {
  if (type === 'Video' && body?.startsWith(REEL_MARKER)) {
    const caption = body.slice(REEL_MARKER.length).trim();
    return { kind: 'reel', caption: caption.length > 0 ? caption : null };
  }

  if (type === 'StoryReply') {
    return body ? { kind: 'storyReply', text: body } : { kind: 'storyMention' };
  }

  if (type === 'Text' && body) {
    if (body === STICKER_HEART_BODY) return { kind: 'stickerHeart' };
    if (body === REACTION_REMOVED_BODY) return { kind: 'reactionRemoved' };

    if (body.startsWith(REACTION_PREFIX) && body.endsWith(']')) {
      return { kind: 'reaction', emoji: body.slice(REACTION_PREFIX.length, -1) };
    }

    if (body.startsWith(UNSUPPORTED_TYPE_PREFIX) && body.endsWith(']')) {
      return { kind: 'unsupportedType', rawType: body.slice(UNSUPPORTED_TYPE_PREFIX.length, -1) };
    }
  }

  return null;
}
