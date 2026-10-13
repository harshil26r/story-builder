import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const { pageFlipMock } = vi.hoisted(() => ({
  pageFlipMock: {
    flipNext: vi.fn(),
    flipPrev: vi.fn(),
    flip: vi.fn(),
    turnToPage: vi.fn(),
    getPageCount: vi.fn(() => 6),
    getCurrentPageIndex: vi.fn(() => 0),
  },
}));

// react-pageflip drives a real StPageFlip (canvas/DOM transforms) — stub it so
// the component's own wiring can be verified in jsdom.
vi.mock('react-pageflip', async () => {
  const React = await import('react');
  const MockFlipBook = React.forwardRef<unknown, { children?: React.ReactNode }>((props, ref) => {
    React.useImperativeHandle(ref, () => ({ pageFlip: () => pageFlipMock }));
    return React.createElement('div', { 'data-testid': 'flipbook' }, props.children);
  });
  MockFlipBook.displayName = 'MockFlipBook';
  return { default: MockFlipBook };
});

import { BookReadingAnimation } from '../components/auth/BookReadingAnimation';

// TICKET — Auth book uses react-pageflip for a realistic page-turn.
describe('BookReadingAnimation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pageFlipMock.getPageCount.mockReturnValue(6);
    pageFlipMock.getCurrentPageIndex.mockReturnValue(0);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the flip book with the opening chapter manuscript', () => {
    render(<BookReadingAnimation />);
    expect(screen.getByTestId('flipbook')).toBeInTheDocument();
    expect(screen.getAllByText('The Living Manuscript').length).toBeGreaterThan(0);
    expect(screen.getByText(/golden leaves/i)).toBeInTheDocument();
  });

  it('advances the book when the next control is used', async () => {
    const user = userEvent.setup();
    render(<BookReadingAnimation />);
    await user.click(screen.getByRole('button', { name: /next page/i }));
    expect(pageFlipMock.flipNext).toHaveBeenCalledTimes(1);
  });

  it('goes back when the previous control is used', async () => {
    const user = userEvent.setup();
    pageFlipMock.getCurrentPageIndex.mockReturnValue(2);
    render(<BookReadingAnimation />);
    await user.click(screen.getByRole('button', { name: /previous page/i }));
    expect(pageFlipMock.flipPrev).toHaveBeenCalledTimes(1);
  });

  it('auto-turns pages on an interval and pauses when toggled', () => {
    vi.useFakeTimers();
    render(<BookReadingAnimation />);

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(pageFlipMock.flipNext).toHaveBeenCalled();

    pageFlipMock.flipNext.mockClear();
    act(() => {
      screen.getByRole('button', { name: /pause reading/i }).click();
    });
    act(() => {
      vi.advanceTimersByTime(8000);
    });
    expect(pageFlipMock.flipNext).not.toHaveBeenCalled();
  });
});
