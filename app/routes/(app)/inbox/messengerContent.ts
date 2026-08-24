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
export const STORY_MARKER = '[Story]';
const STICKER_HEART_BODY = '❤️ (стикер)';
const REACTION_REMOVED_BODY = '[реаксия бардошта шуд]';
const REACTION_PREFIX = '[реаксия: ';
const UNSUPPORTED_TYPE_PREFIX = '[навъи дастгирӣнашуда: ';

export type MessengerContent =
  // A shared Reel/Post/Story. Reel is the odd one out — confirmed live (2026-08-24) Instagram
  // only ever gives a web permalink for it, no real media bytes, so it's a link card, no player.
  // Post and Story (confirmed live 2026-08-25) both turn out to carry a real downloadable CDN
  // asset — normal player, badged, with permalink as a bonus link underneath. permalink comes
  // from message.externalContentUrl (a dedicated field), never parsed out of body text.
  | { kind: 'sharedPost'; label: 'reel' | 'post' | 'story'; caption: string | null; permalink: string | null }
  // permalink here dies within ~24h of the ORIGINAL story (Instagram deletes it) — the frontend
  // shows that as a caveat since there's no reliable way to know exactly when from here.
  | { kind: 'storyReply'; text: string; permalink: string | null }
  | { kind: 'storyMention'; permalink: string | null }
  | { kind: 'stickerHeart' }
  | { kind: 'reaction'; emoji: string }
  | { kind: 'reactionRemoved' }
  | { kind: 'unsupportedType'; rawType: string };

export interface MessengerContentInput {
  type: MessageType;
  body: string | null;
  externalContentUrl?: string | null;
}

function captionAfterMarker(body: string, marker: string): string | null {
  const caption = body.slice(marker.length).trim();
  return caption.length > 0 ? caption : null;
}

/** Null means "nothing special — render this message the normal way for its type". */
export function classifyMessengerContent({ type, body, externalContentUrl }: MessengerContentInput): MessengerContent | null {
  if (type === 'Video' && body?.startsWith(REEL_MARKER)) {
    return { kind: 'sharedPost', label: 'reel', caption: captionAfterMarker(body, REEL_MARKER), permalink: externalContentUrl ?? null };
  }

  if (type === 'Video' && body?.startsWith(POST_MARKER)) {
    return { kind: 'sharedPost', label: 'post', caption: captionAfterMarker(body, POST_MARKER), permalink: externalContentUrl ?? null };
  }

  if (type === 'Video' && body?.startsWith(STORY_MARKER)) {
    return { kind: 'sharedPost', label: 'story', caption: captionAfterMarker(body, STORY_MARKER), permalink: externalContentUrl ?? null };
  }

  if (type === 'StoryReply') {
    const permalink = externalContentUrl ?? null;
    return body ? { kind: 'storyReply', text: body, permalink } : { kind: 'storyMention', permalink };
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
