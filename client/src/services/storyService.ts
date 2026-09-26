import type { Story, Node, Link } from '../types/story';

export interface StoryServiceResponse<T> {
  data?: T;
  error?: string;
  status: number;
}

export class StoryService {
  static async getStory(storyId: string): Promise<StoryServiceResponse<Story>> {
    try {
      const response = await fetch(`/api/stories/${storyId}`);
      if (!response.ok) {
        return { status: response.status, error: 'Failed to fetch story' };
      }
      const data = await response.json();
      return { status: response.status, data };
    } catch (error) {
      return { status: 500, error: 'Network error' };
    }
  }

  static async saveNode(storyId: string, node: Partial<Node>): Promise<StoryServiceResponse<Node>> {
    try {
      const response = await fetch(`/api/stories/${storyId}/nodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(node),
      });
      if (!response.ok) {
        return { status: response.status, error: 'Failed to save node' };
      }
      const data = await response.json();
      return { status: response.status, data };
    } catch (error) {
      return { status: 500, error: 'Network error' };
    }
  }

  static async createLink(link: Omit<Link, 'id'>): Promise<StoryServiceResponse<Link>> {
    try {
      const response = await fetch(`/api/stories/${link.sourceNodeId}/links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(link),
      });
      if (!response.ok) {
        return { status: response.status, error: 'Failed to create link' };
      }
      const data = await response.json();
      return { status: response.status, data };
    } catch (error) {
      return { status: 500, error: 'Network error' };
    }
  }
}
