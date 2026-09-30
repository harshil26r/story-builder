import { describe, it, expect } from 'vitest';
import type { Character, Node, Link, Story } from '../types/story';

describe('Story Domain Models', () => {
  it('instantiates valid Character', () => {
    const char: Character = {
      id: 'char-1',
      name: 'Hero',
      description: 'The main character',
      createdAt: new Date().toISOString(),
    };
    expect(char.id).toBe('char-1');
    expect(char.avatarUrl).toBeUndefined();
  });

  it('instantiates valid Node', () => {
    const node: Node = {
      id: 'node-1',
      storyId: 'story-1',
      title: 'Beginning',
      content: 'Once upon a time',
      characters: ['char-1'],
      isStartNode: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(node.characters).toBeInstanceOf(Array);
    expect(node.characters[0]).toBe('char-1');
    expect(typeof node.isStartNode).toBe('boolean');
  });

  it('instantiates valid Link', () => {
    const link: Link = {
      id: 'link-1',
      sourceNodeId: 'node-1',
      targetNodeId: 'node-2',
      label: 'Go outside',
    };
    expect(link.sourceNodeId).toBe('node-1');
    expect(link.targetNodeId).toBe('node-2');
  });

  it('instantiates valid Story', () => {
    const node: Node = {
      id: 'node-1',
      storyId: 'story-1',
      title: 'Beginning',
      content: 'Once upon a time',
      characters: [],
      isStartNode: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const link: Link = {
      id: 'link-1',
      sourceNodeId: 'node-1',
      targetNodeId: 'node-2',
      label: 'Next',
    };

    const story: Story = {
      id: 'story-1',
      title: 'My Story',
      authorId: 'author-1',
      description: 'A great story',
      published: false,
      nodes: [node],
      links: [link],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    expect(story.nodes.length).toBe(1);
    expect(story.links.length).toBe(1);
  });
});
