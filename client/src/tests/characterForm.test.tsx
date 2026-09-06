import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CharacterForm } from '../components/characters/CharacterForm';
import { CharacterRelationshipsEditor } from '../components/characters/CharacterRelationshipsEditor';
import { makeCharacter } from './fixtures';

// TICKET-38: CharacterForm + CharacterRelationshipsEditor.
describe('TICKET-38 — CharacterForm', () => {
  it('renders required fields and saves a draft on submit', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<CharacterForm onSave={onSave} />);

    expect(screen.getByLabelText('Name *')).toBeInTheDocument();
    expect(screen.getByLabelText('Role *')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /appearance/i })).toBeInTheDocument();

    await user.type(screen.getByLabelText('Name *'), 'Rook');
    await user.click(screen.getByRole('button', { name: /create character/i }));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0]).toMatchObject({ name: 'Rook', role: 'protagonist' });
  });

  it('validates empty name', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<CharacterForm onSave={onSave} />);
    await user.click(screen.getByRole('button', { name: /create character/i }));
    expect(onSave).not.toHaveBeenCalled();
  });

  it('pre-fills with initial character', () => {
    render(<CharacterForm initial={makeCharacter()} onSave={vi.fn()} />);
    expect(screen.getByLabelText('Name *')).toHaveValue('Elara');
    expect(screen.getByLabelText('Role *')).toHaveValue('protagonist');
  });
});

describe('TICKET-38 — CharacterRelationshipsEditor', () => {
  it('excludes self from candidates', () => {
    const alice = makeCharacter({ _id: 'a', name: 'Alice' });
    const bob = makeCharacter({ _id: 'b', name: 'Bob' });
    render(
      <CharacterRelationshipsEditor characterId="a" available={[alice, bob]} value={[]} onChange={vi.fn()} />,
    );
    const select = screen.getByLabelText('Choose character');
    // Alice must not appear as an option.
    expect(select.querySelectorAll('option').length).toBe(2); // "Select character…" + Bob
    expect(Array.from(select.querySelectorAll('option')).map((o) => o.textContent)).not.toContain('Alice');
  });

  it('displays existing relationships with type label', () => {
    const alice = makeCharacter({ _id: 'a', name: 'Alice' });
    const bob = makeCharacter({ _id: 'b', name: 'Bob' });
    render(
      <CharacterRelationshipsEditor
        characterId="a"
        available={[alice, bob]}
        value={[{ characterId: 'b', relationType: 'friend' }]}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText(/Bob/)).toBeInTheDocument();
    expect(screen.getByText('(friend)')).toBeInTheDocument();
  });

  it('calls onChange when adding a relationship', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const alice = makeCharacter({ _id: 'a', name: 'Alice' });
    const bob = makeCharacter({ _id: 'b', name: 'Bob' });
    render(
      <CharacterRelationshipsEditor characterId="a" available={[alice, bob]} value={[]} onChange={onChange} />,
    );
    await user.selectOptions(screen.getByLabelText('Choose character'), 'b');
    await user.click(screen.getByRole('button', { name: /add/i }));
    expect(onChange).toHaveBeenCalledWith([{ characterId: 'b', relationType: 'friend' }]);
  });
});