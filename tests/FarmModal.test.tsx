import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { FarmModal } from '../components/FarmModal';
import { LanguageProvider } from '../contexts/LanguageContext';

test('rejected farm save stays open and submits once', async () => {
  const user = userEvent.setup();
  let rejectSave: (error: Error) => void = () => undefined;
  const pendingSave = new Promise<void>((_resolve, reject) => {
    rejectSave = reject;
  });
  const onSave = vi.fn().mockReturnValue(pendingSave);
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

  render(
    <LanguageProvider>
      <FarmModal
        mode="add"
        farm={null}
        onSave={onSave}
        onClose={vi.fn()}
        onDelete={vi.fn()}
      />
    </LanguageProvider>
  );

  await user.type(screen.getByLabelText(/farm name/i), 'North Field');
  const area = screen.getByLabelText(/area/i);
  await user.clear(area);
  await user.type(area, '12');
  const saveButton = screen.getByRole('button', { name: /save/i });
  fireEvent.click(saveButton);
  fireEvent.click(saveButton);

  expect(onSave).toHaveBeenCalledTimes(1);
  await act(async () => {
    rejectSave(new Error('Farm save failed'));
    await pendingSave.catch(() => undefined);
  });
  expect(await screen.findByRole('alert')).toHaveTextContent('Farm save failed');
  expect(screen.getByLabelText(/farm name/i)).toHaveValue('North Field');
  consoleError.mockRestore();
});
