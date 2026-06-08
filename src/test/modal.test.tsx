import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@/utils/zodResolver';
import { Modal } from '@/components/ui';
import { ConfirmDialogProvider, useConfirmStore } from '@/components/ConfirmDialog';
import { memberSchema, type MemberFormData } from '@/utils/schemas';

afterEach(() => {
  cleanup();
  useConfirmStore.getState().hide();
});

describe('Modal', () => {
  it('renders children exactly once (no mobile/desktop duplication)', () => {
    render(
      <Modal open title="Test" onClose={() => {}}>
        <input name="full_name" aria-label="full_name" />
      </Modal>,
    );
    // Duplicated children (mobile + desktop copies) would yield 2 inputs and
    // break react-hook-form registration + React DOM reconciliation.
    expect(document.querySelectorAll('input[name="full_name"]').length).toBe(1);
  });

  it('does not render children when closed', () => {
    render(
      <Modal open={false} title="Test" onClose={() => {}}>
        <input name="full_name" />
      </Modal>,
    );
    expect(document.querySelectorAll('input[name="full_name"]').length).toBe(0);
  });

  it('validates a hook-form inside the modal without crashing (shows zod error once)', async () => {
    function Form() {
      const { register, handleSubmit, formState: { errors } } = useForm<MemberFormData>({
        resolver: zodResolver(memberSchema),
      });
      return (
        <Modal open title="Add" onClose={() => {}}>
          <form onSubmit={handleSubmit(() => {})}>
            <input aria-label="full_name" {...register('full_name')} />
            {errors.full_name && <span role="alert">{errors.full_name.message}</span>}
            <button type="submit">Simpan</button>
          </form>
        </Modal>
      );
    }
    render(<Form />);
    // Exactly one submit button — duplication would render two.
    const buttons = screen.getAllByRole('button', { name: 'Simpan' });
    expect(buttons).toHaveLength(1);

    await userEvent.click(buttons[0]);

    // The zod resolver must map the empty required field to a single visible
    // error message (not throw an uncaught ZodError).
    await waitFor(() => {
      const alerts = screen.getAllByRole('alert');
      expect(alerts).toHaveLength(1);
      expect(alerts[0]).toHaveTextContent('Nama wajib diisi');
    });
  });
});

describe('ConfirmDialogProvider', () => {
  it('renders its actions exactly once (no mobile/desktop duplication)', () => {
    useConfirmStore.getState().show({ title: 'Hapus?', message: 'Yakin?', onConfirm: () => {} });
    render(<ConfirmDialogProvider />);
    // Duplicated mobile + desktop copies would render two of each action.
    expect(screen.getAllByRole('button', { name: 'Konfirmasi' })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'Batal' })).toHaveLength(1);
  });
});
