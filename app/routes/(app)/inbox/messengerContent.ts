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
export const POST_MARKER = '[Post]';
const STICKER_HEART_BODY = '❤️ (стикер)';
const REACTION_REMOVED_BODY = '[реаксия бардошта шуд]';
const REACTION_PREFIX = '[реаксия: ';
const UNSUPPORTED_TYPE_PREFIX = '[навъи дастгирӣнашуда: ';

export type MessengerContent =
  // A shared Reel/Post — the backend never has real media bytes for these (Instagram only ever
  // sends a web permalink, confirmed live 2026-08-24, see InstagramPayloadParser), so there's no
  // player: caption + a link out to view it on Instagram.
  | { kind: 'sharedPost'; label: 'reel' | 'post'; caption: string | null; permalink: string | null }
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

/** Body shape is "MARKER[ caption]\n<permalink>" — the permalink line is optional (older messages, or no url in the webhook). */
function parseSharedPost(body: string, marker: string, label: 'reel' | 'post'): MessengerContent {
  const rest = body.slice(marker.length);
  const newlineIndex = rest.indexOf('\n');
  const captionPart = (newlineIndex === -1 ? rest : rest.slice(0, newlineIndex)).trim();
  const permalinkPart = newlineIndex === -1 ? '' : rest.slice(newlineIndex + 1).trim();
  return {
    kind: 'sharedPost',
    label,
    caption: captionPart.length > 0 ? captionPart : null,
    permalink: permalinkPart.length > 0 ? permalinkPart : null,
  };
}

/** Null means "nothing special — render this message the normal way for its type". */
export function classifyMessengerContent({ type, body }: MessengerContentInput): MessengerContent | null {
  if (type === 'Video' && body?.startsWith(REEL_MARKER)) {
    return parseSharedPost(body, REEL_MARKER, 'reel');
  }

  if (type === 'Video' && body?.startsWith(POST_MARKER)) {
    return parseSharedPost(body, POST_MARKER, 'post');
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
