import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { projectsApi } from '~/api/projects';
import { makeQueryClient } from '~/lib/query-client';
import type { Label } from '~/types/project';
import { ManageLabelsModal } from './ManageLabelsModal';

vi.mock('~/api/projects', () => ({
  projectsApi: {
    listLabels: vi.fn(),
    createLabel: vi.fn(),
    updateLabel: vi.fn(),
    deleteLabel: vi.fn(),
  },
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

function makeLabel(overrides: Partial<Label> = {}): Label {
  return { id: 'label-1', name: 'Bug', color: '#ef4444', ...overrides };
}

function renderModal(onClose = vi.fn()) {
  const queryClient = makeQueryClient();
  return {
    onClose,
    ...render(
      <QueryClientProvider client={queryClient}>
        <ManageLabelsModal projectId="project-1" open onClose={onClose} />
      </QueryClientProvider>
    ),
  };
}

describe('ManageLabelsModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists existing labels', async () => {
    vi.mocked(projectsApi.listLabels).mockResolvedValue([makeLabel(), makeLabel({ id: 'label-2', name: 'Feature' })]);
    renderModal();

    await waitFor(() => expect(screen.getByText('Bug')).toBeInTheDocument());
    expect(screen.getByText('Feature')).toBeInTheDocument();
  });

  it('creates a new label from the add row', async () => {
    vi.mocked(projectsApi.listLabels).mockResolvedValue([]);
    vi.mocked(projectsApi.createLabel).mockResolvedValue(makeLabel({ id: 'label-new', name: 'Urgent' }));
    const user = userEvent.setup();
    renderModal();

    const input = await screen.findByPlaceholderText('fields.name');
    await user.type(input, 'Urgent');
    await user.click(screen.getByText('addLabel'));

    await waitFor(() =>
      expect(projectsApi.createLabel).toHaveBeenCalledWith('project-1', expect.objectContaining({ name: 'Urgent' }))
    );
  });

  it('does not allow creating a label with an empty name', async () => {
    vi.mocked(projectsApi.listLabels).mockResolvedValue([]);
    renderModal();

    await screen.findByText('addLabel');
    expect(screen.getByText('addLabel').closest('button')).toBeDisabled();
    expect(projectsApi.createLabel).not.toHaveBeenCalled();
  });

  it('edits a label name inline and saves', async () => {
    vi.mocked(projectsApi.listLabels).mockResolvedValue([makeLabel()]);
    vi.mocked(projectsApi.updateLabel).mockResolvedValue(makeLabel({ name: 'Bugfix' }));
    const user = userEvent.setup();
    renderModal();

    await screen.findByText('Bug');
    const editButtons = screen.getAllByRole('button');
    // First icon button on the row is the pencil (edit) trigger.
    await user.click(editButtons.find((b) => b.querySelector('svg.lucide-pencil')) ?? editButtons[0]);

    const input = screen.getByDisplayValue('Bug');
    await user.clear(input);
    await user.type(input, 'Bugfix');
    await user.click(screen.getByText('actions.save'));

    await waitFor(() =>
      expect(projectsApi.updateLabel).toHaveBeenCalledWith('project-1', 'label-1', expect.objectContaining({ name: 'Bugfix' }))
    );
  });

  it('asks for confirmation before deleting a label', async () => {
    vi.mocked(projectsApi.listLabels).mockResolvedValue([makeLabel()]);
    const user = userEvent.setup();
    renderModal();

    await screen.findByText('Bug');
    const buttons = screen.getAllByRole('button');
    await user.click(buttons.find((b) => b.querySelector('svg.lucide-trash2')) ?? buttons[buttons.length - 1]);

    expect(screen.getByText('deleteLabelConfirmTitle')).toBeInTheDocument();
    expect(projectsApi.deleteLabel).not.toHaveBeenCalled();
  });
});
