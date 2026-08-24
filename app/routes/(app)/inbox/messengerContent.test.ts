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

  it('recognizes a Reel permalink on the second line, separate from the caption', () => {
    expect(classifyMessengerContent({ type: 'Video', body: '[Reel] Cool clip\nhttps://www.instagram.com/reel/abc/' })).toEqual({
      kind: 'sharedPost',
      label: 'reel',
      caption: 'Cool clip',
      permalink: 'https://www.instagram.com/reel/abc/',
    });
  });

  it('recognizes a shared Post the same way, distinct from a Reel', () => {
    expect(classifyMessengerContent({ type: 'Video', body: '[Post] Sunset\nhttps://www.instagram.com/p/xyz/' })).toEqual({
      kind: 'sharedPost',
      label: 'post',
      caption: 'Sunset',
      permalink: 'https://www.instagram.com/p/xyz/',
    });
  });

  it('recognizes a story reply (text present)', () => {
    expect(classifyMessengerContent({ type: 'StoryReply', body: 'nice story!' })).toEqual({
      kind: 'storyReply',
      text: 'nice story!',
    });
  });

  it('recognizes a story mention (no text) — the only signal StoryReply gives for it', () => {
    expect(classifyMessengerContent({ type: 'StoryReply', body: null })).toEqual({ kind: 'storyMention' });
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
