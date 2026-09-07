export interface Character {
  id: string;
  name: string;
  description: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface Node {
  id: string;
  storyId: string;
  title: string;
  content: string;
  characters: string[];
  isStartNode: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Link {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  label: string;
  condition?: string;
}

export interface Story {
  id: string;
  title: string;
  authorId: string;
  description: string;
  published: boolean;
  nodes: Node[];
  links: Link[];
  createdAt: string;
  updatedAt: string;
}
