import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { GenerateStep } from '../components/stories/steps/GenerateStep';
import { useGenerationStore } from '../store/generationStore';

// TICKET: GenerateStep must start chapter generation with the payload the
// server's generateChapterSchema accepts — storyId present and chapterIndex ≥ 1
// (a { chapterIndex: 0 } payload is rejected with VALIDATION_ERROR).
describe('GenerateStep (generate payload)', () => {
  it('starts chapter generation with storyId + chapterIndex 1', () => {
    const start = vi.fn();
    useGenerationStore.setState({ start });
    render(<GenerateStep storyId="6aac0c11c42db22d12590d7c" />);

    fireEvent.click(screen.getByTestId('generate-start'));

    expect(start).toHaveBeenCalledWith('chapter', '6aac0c11c42db22d12590d7c', {
      storyId: '6aac0c11c42db22d12590d7c',
      chapterIndex: 1,
    });
  });
});
