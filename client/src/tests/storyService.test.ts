import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StoryService } from '../services/storyService';
import type { Story, Node, Link } from '../types/story';

describe('StoryService', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  it('getStory returns data on success', async () => {
    const mockStory: Partial<Story> = { id: 'story-1', title: 'Test Story' };
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockStory
    });

    const result = await StoryService.getStory('story-1');
    expect(result.status).toBe(200);
    expect(result.data).toEqual(mockStory);
    expect(global.fetch).toHaveBeenCalledWith('/api/stories/story-1');
  });

  it('getStory returns error on 404', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 404
    });

    const result = await StoryService.getStory('story-does-not-exist');
    expect(result.status).toBe(404);
    expect(result.error).toBeDefined();
  });

  it('saveNode sends payload and returns data', async () => {
    const mockNode: Partial<Node> = { title: 'New Node' };
    const updatedNode: Partial<Node> = { id: 'node-1', title: 'New Node' };
    
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => updatedNode
    });

    const result = await StoryService.saveNode('story-1', mockNode);
    expect(result.status).toBe(200);
    expect(result.data).toEqual(updatedNode);
    expect(global.fetch).toHaveBeenCalledWith('/api/stories/story-1/nodes', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify(mockNode)
    }));
  });

  it('createLink sends payload without id and returns created link', async () => {
    const linkPayload: Omit<Link, 'id'> = { sourceNodeId: 'node-1', targetNodeId: 'node-2', label: 'Next' };
    const createdLink: Link = { id: 'link-1', ...linkPayload };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => createdLink
    });

    const result = await StoryService.createLink(linkPayload);
    expect(result.status).toBe(201);
    expect(result.data).toEqual(createdLink);
    expect(global.fetch).toHaveBeenCalledWith('/api/stories/node-1/links', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify(linkPayload)
    }));
  });

  it('network failure returns 500 status', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

    const result = await StoryService.getStory('story-1');
    expect(result.status).toBe(500);
    expect(result.error).toBe('Network error');
  });
});
