import { afterEach, describe, expect, it } from 'vitest';
import { loadScript } from './loadScript';

function resolveScript(src: string) {
  const script = document.head.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
  script?.onload?.(new Event('load'));
}

function rejectScript(src: string) {
  const script = document.head.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
  script?.onerror?.(new Event('error'));
}

describe('loadScript', () => {
  afterEach(() => {
    document.head.querySelectorAll('script').forEach((el) => el.remove());
  });

  it('injects exactly one <script> tag for a given src, even when called twice concurrently', () => {
    const src = 'https://example.com/a.js';

    loadScript(src);
    loadScript(src);

    expect(document.head.querySelectorAll(`script[src="${src}"]`)).toHaveLength(1);
  });

  it('resolves the same promise instance for repeated calls with the same src', () => {
    const src = 'https://example.com/b.js';

    const first = loadScript(src);
    const second = loadScript(src);

    expect(first).toBe(second);
    resolveScript(src);
    return expect(first).resolves.toBeUndefined();
  });

  it('rejects when the script fails to load', () => {
    const src = 'https://example.com/c.js';

    const promise = loadScript(src);
    rejectScript(src);

    return expect(promise).rejects.toThrow(`Failed to load script: ${src}`);
  });
});
