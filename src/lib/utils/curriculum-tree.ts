import type { CurriculumNode } from '@/types/domain';

// ============================================================
// CurriculumTreeNode
// ============================================================
// A curriculum node with its children nested.
// Used for rendering the tree UI.
// ============================================================
export interface CurriculumTreeNode extends CurriculumNode {
  children: CurriculumTreeNode[];
}

// ============================================================
// buildTree
// ============================================================
// Takes a flat array of curriculum_nodes from the database
// and builds a nested tree structure.
// ============================================================
export function buildTree(nodes: CurriculumNode[]): CurriculumTreeNode[] {
  const nodeMap = new Map<string, CurriculumTreeNode>();
  const roots: CurriculumTreeNode[] = [];

  // First pass: wrap each node with an empty children array
  for (const node of nodes) {
    nodeMap.set(node.id, { ...node, children: [] });
  }

  // Second pass: link children to parents
  for (const node of nodes) {
    const treeNode = nodeMap.get(node.id)!;

    if (node.parent_id && nodeMap.has(node.parent_id)) {
      nodeMap.get(node.parent_id)!.children.push(treeNode);
    } else {
      roots.push(treeNode);
    }
  }

  // Sort children by sequence_order at every level
  function sortChildren(node: CurriculumTreeNode): void {
    node.children.sort((a, b) => a.sequence_order - b.sequence_order);
    node.children.forEach(sortChildren);
  }

  roots.sort((a, b) => a.sequence_order - b.sequence_order);
  roots.forEach(sortChildren);

  return roots;
}

// ============================================================
// countNodes
// ============================================================
// Counts total nodes in a tree (recursive)
// ============================================================
export function countNodes(nodes: CurriculumTreeNode[]): number {
  let count = 0;
  for (const node of nodes) {
    count += 1 + countNodes(node.children);
  }
  return count;
}

// ============================================================
// flattenTree
// ============================================================
// Flattens a tree back into a list (for search highlighting)
// ============================================================
export function flattenTree(nodes: CurriculumTreeNode[]): CurriculumNode[] {
  const result: CurriculumNode[] = [];
  for (const node of nodes) {
    result.push(node);
    result.push(...flattenTree(node.children));
  }
  return result;
}

// ============================================================
// LEVEL_CONFIG
// ============================================================
// Display configuration for each curriculum level.
// ============================================================
export const LEVEL_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string; indent: number; addChildLabel: string; addChildLevel: string | null }
> = {
  area: {
    label: 'Area',
    color: 'text-purple-700',
    bgColor: 'bg-purple-50 border-purple-200',
    indent: 0,
    addChildLabel: 'Add Strand',
    addChildLevel: 'strand',
  },
  strand: {
    label: 'Strand',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50 border-blue-200',
    indent: 1,
    addChildLabel: 'Add Outcome',
    addChildLevel: 'outcome',
  },
  outcome: {
    label: 'Outcome',
    color: 'text-green-700',
    bgColor: 'bg-green-50 border-green-200',
    indent: 2,
    addChildLabel: 'Add Activity',
    addChildLevel: 'activity',
  },
  activity: {
    label: 'Activity',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50 border-amber-200',
    indent: 3,
    addChildLabel: '',
    addChildLevel: null,
  },
};
