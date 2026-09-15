import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('plain form user.click', () => {
  it('triggers submit on plain form', async () => {
    const user = userEvent.setup();
    let submitted = false;
    render(
      <form onSubmit={(e) => { e.preventDefault(); submitted = true; console.log('SUBMIT HANDLER RAN'); }}>
        <input type="text" aria-label="name" required />
        <button type="submit" aria-label="Go">Go</button>
      </form>,
    );
    await user.type(screen.getByLabelText('name'), 'hello');
    await user.click(screen.getByRole('button', { name: /go/i }));
    console.log('submitted:', submitted);
    expect(submitted).toBe(true);
  });
});