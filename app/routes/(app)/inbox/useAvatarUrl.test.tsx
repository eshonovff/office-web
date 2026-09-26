import { render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { customerChatsApi } from '~/api/customerChats';
import { conversationsApi } from '~/api/conversations';
import { ContactAvatar } from '~/routes/(account)/chats/components/ContactAvatar';
import type { InboxApi } from './inboxApi';
import { useAvatarUrl } from './useAvatarUrl';

vi.mock('~/api/customerChats', async (importOriginal) => ({
  ...(await importOriginal<typeof import('~/api/customerChats')>()),
  customerChatsApi: { getMediaBlob: vi.fn(), getThumbnailBlob: vi.fn(), cancelMessage: vi.fn() },
}));
vi.mock('~/api/conversations', () => ({
  conversationsApi: { getMediaBlob: vi.fn(), getThumbnailBlob: vi.fn(), cancelMessage: vi.fn() },
}));

let n = 0;
const unique = (base: string) => `${base}?v=${++n}`; // the blob cache lives for the page — one path per test

function api(getThumbnailBlob: InboxApi['getThumbnailBlob']): InboxApi {
  return { getMediaBlob: vi.fn(), getThumbnailBlob, cancelMessage: vi.fn(), messagesQueryKey: (id) => [id] };
}

describe('useAvatarUrl', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('URL', { ...URL, createObjectURL: vi.fn(() => 'blob:avatar'), revokeObjectURL: vi.fn() });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetches our own copy with the token, once for every place that shows it', async () => {
    const get = vi.fn(async () => new Blob(['jpg']));
    const path = unique('/api/conversations/c1/avatar');
    const first = renderHook(() => useAvatarUrl(path, api(get)));
    const second = renderHook(() => useAvatarUrl(path, api(get)));

    await waitFor(() => expect(first.result.current).toBe('blob:avatar'));
    await waitFor(() => expect(second.result.current).toBe('blob:avatar'));
    expect(get).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledWith(path);
  });

  it('never sends the token to another address', async () => {
    const get = vi.fn(async () => new Blob(['jpg']));
    const { result } = renderHook(() => useAvatarUrl('https://scontent.cdninstagram.com/expired.jpg', api(get)));
    renderHook(() => useAvatarUrl('//evil.example/api/x', api(get)));

    await new Promise((r) => setTimeout(r, 10));
    expect(result.current).toBeNull();
    expect(get).not.toHaveBeenCalled();
  });

  it('is nothing without a picture, or when it cannot be fetched', async () => {
    const get = vi.fn(async () => {
      throw Object.assign(new Error('nf'), { response: { status: 404 } });
    });
    const none = renderHook(() => useAvatarUrl(null, api(get)));
    const failed = renderHook(() => useAvatarUrl(unique('/api/conversations/c2/avatar'), api(get)));

    await waitFor(() => expect(get).toHaveBeenCalledTimes(1));
    expect(none.result.current).toBeNull();
    expect(failed.result.current).toBeNull();
  });
});

describe('ContactAvatar (мизоҷ)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('URL', { ...URL, createObjectURL: vi.fn(() => 'blob:contact'), revokeObjectURL: vi.fn() });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the picture fetched with the мизоҷ's token — never through the staff API", async () => {
    vi.mocked(customerChatsApi.getThumbnailBlob).mockResolvedValue(new Blob(['jpg']));
    const path = unique('/api/public/conversations/c1/avatar');
    const { container } = render(<ContactAvatar name="Нилуфар" url={path} />);

    await waitFor(() => expect(container.querySelector('img')).toHaveAttribute('src', 'blob:contact'));
    expect(customerChatsApi.getThumbnailBlob).toHaveBeenCalledWith(path);
    expect(conversationsApi.getThumbnailBlob).not.toHaveBeenCalled();
  });

  it('shows the initial while there is no picture', () => {
    render(<ContactAvatar name="@nilufar" url={null} />);
    expect(screen.getByText('N')).toBeInTheDocument();
    expect(customerChatsApi.getThumbnailBlob).not.toHaveBeenCalled();
  });
});
