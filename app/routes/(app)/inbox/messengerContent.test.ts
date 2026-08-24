import { describe, expect, it } from 'vitest';
import { classifyMessengerContent } from './messengerContent';

describe('classifyMessengerContent', () => {
  it('returns null for a plain text message', () => {
    expect(classifyMessengerContent({ type: 'Text', body: 'Салом!' })).toBeNull();
  });

  it('returns null for a plain image/video/audio/file — only markers on Text/Video/StoryReply are special', () => {
    expect(classifyMessengerContent({ type: 'Image', body: null })).toBeNull();
    expect(classifyMessengerContent({ type: 'Video', body: null })).toBeNull();
    expect(classifyMessengerContent({ type: 'Video', body: 'a regular caption' })).toBeNull();
  });

  it('recognizes a Reel with a title', () => {
    expect(classifyMessengerContent({ type: 'Video', body: '[Reel] Cool clip' })).toEqual({
      kind: 'sharedPost',
      label: 'reel',
      caption: 'Cool clip',
      permalink: null,
    });
  });

  it('recognizes a Reel with no title as having a null caption', () => {
    expect(classifyMessengerContent({ type: 'Video', body: '[Reel]' })).toEqual({
      kind: 'sharedPost',
      label: 'reel',
      caption: null,
      permalink: null,
    });
  });

  it('takes the permalink from the dedicated externalContentUrl field, not from body text', () => {
    // An earlier version embedded the url on a second body line — this is the fix: body carries
    // only the caption, externalContentUrl is a real message field the backend now sets directly.
    expect(
      classifyMessengerContent({ type: 'Video', body: '[Reel] Cool clip', externalContentUrl: 'https://www.instagram.com/reel/abc/' })
    ).toEqual({
      kind: 'sharedPost',
      label: 'reel',
      caption: 'Cool clip',
      permalink: 'https://www.instagram.com/reel/abc/',
    });
  });

  it('recognizes a shared Post the same way, distinct from a Reel', () => {
    expect(
      classifyMessengerContent({ type: 'Video', body: '[Post] Sunset', externalContentUrl: 'https://www.instagram.com/p/xyz/' })
    ).toEqual({
      kind: 'sharedPost',
      label: 'post',
      caption: 'Sunset',
      permalink: 'https://www.instagram.com/p/xyz/',
    });
  });

  it('recognizes a shared Story the same way as a Post — real downloadable media, confirmed live', () => {
    expect(
      classifyMessengerContent({ type: 'Video', body: '[Story]', externalContentUrl: 'https://lookaside.fbsbx.com/ig_messaging_cdn/?asset_id=1' })
    ).toEqual({
      kind: 'sharedPost',
      label: 'story',
      caption: null,
      permalink: 'https://lookaside.fbsbx.com/ig_messaging_cdn/?asset_id=1',
    });
  });

  it('has a null permalink when externalContentUrl is not given', () => {
    expect(classifyMessengerContent({ type: 'Video', body: '[Reel] Cool clip' })).toEqual({
      kind: 'sharedPost',
      label: 'reel',
      caption: 'Cool clip',
      permalink: null,
    });
  });

  it('recognizes a story reply (text present), carrying the permalink too', () => {
    expect(
      classifyMessengerContent({ type: 'StoryReply', body: 'nice story!', externalContentUrl: 'https://www.instagram.com/stories/x/1/' })
    ).toEqual({
      kind: 'storyReply',
      text: 'nice story!',
      permalink: 'https://www.instagram.com/stories/x/1/',
    });
  });

  it('recognizes a story mention (no text) — the only signal StoryReply gives for it', () => {
    expect(classifyMessengerContent({ type: 'StoryReply', body: null })).toEqual({ kind: 'storyMention', permalink: null });
  });

  it('recognizes the heart sticker', () => {
    expect(classifyMessengerContent({ type: 'Text', body: '❤️ (стикер)' })).toEqual({ kind: 'stickerHeart' });
  });

  it('recognizes a reaction with its emoji', () => {
    expect(classifyMessengerContent({ type: 'Text', body: '[реаксия: ❤]' })).toEqual({ kind: 'reaction', emoji: '❤' });
  });

  it('recognizes an unreact (reaction removed)', () => {
    expect(classifyMessengerContent({ type: 'Text', body: '[реаксия бардошта шуд]' })).toEqual({ kind: 'reactionRemoved' });
  });

  it('recognizes an unsupported-attachment-type marker and extracts the raw type', () => {
    expect(classifyMessengerContent({ type: 'Text', body: '[навъи дастгирӣнашуда: sticker]' })).toEqual({
      kind: 'unsupportedType',
      rawType: 'sticker',
    });
  });
});
