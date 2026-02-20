"use client";

import {
  createCurriculumNode,
  deleteCurriculumNode,
  reorderCurriculumNode,
  searchCurriculumNodes,
  toggleNodeVisibility,
  updateCurriculumNode,
} from "@/lib/actions/curriculum";
import type { CurriculumTreeNode } from "@/lib/utils/curriculum-tree";
import { LEVEL_CONFIG } from "@/lib/utils/curriculum-tree";
import type { CurriculumLevel } from "@/types/domain";
import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";

interface CurriculumTreeViewProps {
  instanceId: string;
  initialTree: CurriculumTreeNode[];
  canManage: boolean;
}

export function CurriculumTreeView({
  instanceId,
  initialTree,
  canManage,
}: CurriculumTreeViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Set<string> | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(() => {
    // Start with areas expanded
    const initial = new Set<string>();
    initialTree.forEach((area) => initial.add(area.id));
    return initial;
  });
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const toggleExpanded = useCallback((nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    const all = new Set<string>();
    function walk(nodes: CurriculumTreeNode[]) {
      for (const node of nodes) {
        if (node.children.length > 0) all.add(node.id);
        walk(node.children);
      }
    }
    walk(initialTree);
    setExpandedNodes(all);
  }, [initialTree]);

  const collapseAll = useCallback(() => {
    setExpandedNodes(new Set());
  }, []);

  // Search handler
  async function handleSearch(query: string) {
    setSearchQuery(query);

    if (!query.trim()) {
      setSearchResults(null);
      return;
    }

    const result = await searchCurriculumNodes(instanceId, query.trim());
    if (result.data) {
      const ids = new Set(result.data.map((n) => n.id));
      setSearchResults(ids);

      // Expand all ancestors of matching nodes so they're visible
      // (We need to find parent chains - since we have the flat initial tree,
      //  we can walk the tree structure)
      const toExpand = new Set<string>();
      function findAncestors(
        nodes: CurriculumTreeNode[],
        targetIds: Set<string>,
        ancestors: string[],
      ) {
        for (const node of nodes) {
          const currentPath = [...ancestors, node.id];
          if (targetIds.has(node.id)) {
            ancestors.forEach((a) => toExpand.add(a));
          }
          findAncestors(node.children, targetIds, currentPath);
        }
      }
      findAncestors(initialTree, ids, []);
      setExpandedNodes((prev) => new Set([...prev, ...toExpand]));
    }
  }

  function refresh() {
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative flex-1 sm:max-w-md">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search outcomes..."
            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-[length:var(--text-sm)] focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <svg
            className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
            />
          </svg>
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery("");
                setSearchResults(null);
              }}
              className="absolute right-3 top-2.5 text-muted-foreground hover:text-gray-600"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18 18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>

        {/* Expand/collapse controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={expandAll}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-[length:var(--text-xs)] font-medium text-foreground hover:bg-background"
          >
            Expand All
          </button>
          <button
            onClick={collapseAll}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-[length:var(--text-xs)] font-medium text-foreground hover:bg-background"
          >
            Collapse All
          </button>
          {canManage && (
            <AddNodeInline
              instanceId={instanceId}
              parentId={null}
              level="area"
              label="Add Area"
              onCreated={refresh}
            />
          )}
        </div>
      </div>

      {/* Search results info */}
      {searchResults && (
        <p className="text-[length:var(--text-xs)] text-muted-foreground">
          {searchResults.size} result{searchResults.size !== 1 ? "s" : ""} found
          for &ldquo;{searchQuery}&rdquo;
        </p>
      )}

      {/* Tree */}
      <div className="rounded-lg border border-gray-200 bg-background">
        {initialTree.length === 0 ? (
          <div className="p-8 text-center text-[length:var(--text-sm)] text-muted-foreground">
            This curriculum is empty. Add an area to get started.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {initialTree.map((node) => (
              <TreeNode
                key={node.id}
                node={node}
                instanceId={instanceId}
                expandedNodes={expandedNodes}
                searchResults={searchResults}
                canManage={canManage}
                onToggleExpand={toggleExpanded}
                onRefresh={refresh}
                isPending={isPending}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// TreeNode - recursive tree node component
// ============================================================
interface TreeNodeProps {
  node: CurriculumTreeNode;
  instanceId: string;
  expandedNodes: Set<string>;
  searchResults: Set<string> | null;
  canManage: boolean;
  onToggleExpand: (id: string) => void;
  onRefresh: () => void;
  isPending: boolean;
}

function TreeNode({
  node,
  instanceId,
  expandedNodes,
  searchResults,
  canManage,
  onToggleExpand,
  onRefresh,
  isPending,
}: TreeNodeProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(node.title);
  const [isActioning, setIsActioning] = useState(false);

  const config = LEVEL_CONFIG[node.level];
  const isExpanded = expandedNodes.has(node.id);
  const hasChildren = node.children.length > 0;
  const isMatch = searchResults?.has(node.id) ?? false;
  const indent = config.indent;

  // If searching and this node (and none of its descendants) match, hide it
  if (searchResults && !isMatch && !hasDescendantMatch(node, searchResults)) {
    return null;
  }

  async function handleSaveEdit() {
    if (!editTitle.trim() || editTitle.trim() === node.title) {
      setIsEditing(false);
      setEditTitle(node.title);
      return;
    }

    setIsActioning(true);
    await updateCurriculumNode(node.id, { title: editTitle.trim() });
    setIsEditing(false);
    setIsActioning(false);
    onRefresh();
  }

  async function handleDelete() {
    if (!confirm(`Delete "${node.title}" and all its children?`)) return;
    setIsActioning(true);
    await deleteCurriculumNode(node.id);
    setIsActioning(false);
    onRefresh();
  }

  async function handleToggleVisibility() {
    setIsActioning(true);
    await toggleNodeVisibility(node.id);
    setIsActioning(false);
    onRefresh();
  }

  async function handleReorder(direction: "up" | "down") {
    setIsActioning(true);
    await reorderCurriculumNode(node.id, direction);
    setIsActioning(false);
    onRefresh();
  }

  return (
    <div>
      <div
        className={`group flex items-center gap-2 px-4 py-2.5 transition-colors hover:bg-background ${
          node.is_hidden ? "opacity-50" : ""
        } ${isMatch ? "bg-amber-50" : ""}`}
        style={{ paddingLeft: `${indent * 24 + 16}px` }}
      >
        {/* Expand/collapse toggle */}
        <button
          onClick={() => onToggleExpand(node.id)}
          className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded text-muted-foreground hover:text-gray-600 ${
            !hasChildren ? "invisible" : ""
          }`}
        >
          <svg
            className={`h-3.5 w-3.5 transition-transform ${isExpanded ? "rotate-90" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m8.25 4.5 7.5 7.5-7.5 7.5"
            />
          </svg>
        </button>

        {/* Level badge */}
        <span
          className={`inline-flex flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${config.color} ${config.bgColor} border`}
        >
          {config.label}
        </span>

        {/* Title (editable) */}
        {isEditing ? (
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleSaveEdit}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSaveEdit();
              if (e.key === "Escape") {
                setIsEditing(false);
                setEditTitle(node.title);
              }
            }}
            autoFocus
            className="min-w-0 flex-1 rounded border border-amber-300 px-2 py-0.5 text-[length:var(--text-sm)] focus:outline-none focus:ring-1 focus:ring-ring"
          />
        ) : (
          <span
            className={`min-w-0 flex-1 truncate text-[length:var(--text-sm)] ${
              node.is_hidden
                ? "italic text-muted-foreground line-through"
                : "text-foreground"
            }`}
            onDoubleClick={() => {
              if (canManage) {
                setIsEditing(true);
                setEditTitle(node.title);
              }
            }}
          >
            {node.title}
          </span>
        )}

        {/* Child count */}
        {hasChildren && !isExpanded && (
          <span className="flex-shrink-0 text-[length:var(--text-xs)] text-muted-foreground">
            ({node.children.length})
          </span>
        )}

        {/* Action buttons (visible on hover) */}
        {canManage && !isEditing && (
          <div className="flex flex-shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            {/* Edit */}
            <ActionBtn
              title="Rename"
              onClick={() => {
                setIsEditing(true);
                setEditTitle(node.title);
              }}
              disabled={isActioning}
            >
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
                />
              </svg>
            </ActionBtn>

            {/* Move up */}
            <ActionBtn
              title="Move up"
              onClick={() => handleReorder("up")}
              disabled={isActioning}
            >
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.5 15.75l7.5-7.5 7.5 7.5"
                />
              </svg>
            </ActionBtn>

            {/* Move down */}
            <ActionBtn
              title="Move down"
              onClick={() => handleReorder("down")}
              disabled={isActioning}
            >
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                />
              </svg>
            </ActionBtn>

            {/* Toggle visibility */}
            <ActionBtn
              title={node.is_hidden ? "Show" : "Hide"}
              onClick={handleToggleVisibility}
              disabled={isActioning}
            >
              {node.is_hidden ? (
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                  />
                </svg>
              ) : (
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88"
                  />
                </svg>
              )}
            </ActionBtn>

            {/* Delete */}
            <ActionBtn
              title="Delete"
              onClick={handleDelete}
              disabled={isActioning}
              danger
            >
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                />
              </svg>
            </ActionBtn>
          </div>
        )}
      </div>

      {/* Children */}
      {isExpanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              instanceId={instanceId}
              expandedNodes={expandedNodes}
              searchResults={searchResults}
              canManage={canManage}
              onToggleExpand={onToggleExpand}
              onRefresh={onRefresh}
              isPending={isPending}
            />
          ))}
        </div>
      )}

      {/* Add child button (at the bottom of expanded children) */}
      {isExpanded && canManage && config.addChildLevel && (
        <div style={{ paddingLeft: `${(indent + 1) * 24 + 16}px` }}>
          <AddNodeInline
            instanceId={instanceId}
            parentId={node.id}
            level={config.addChildLevel as CurriculumLevel}
            label={config.addChildLabel}
            onCreated={onRefresh}
          />
        </div>
      )}
    </div>
  );
}

// ============================================================
// AddNodeInline - inline form to add a new child node
// ============================================================
interface AddNodeInlineProps {
  instanceId: string;
  parentId: string | null;
  level: CurriculumLevel;
  label: string;
  onCreated: () => void;
}

function AddNodeInline({
  instanceId,
  parentId,
  level,
  label,
  onCreated,
}: AddNodeInlineProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleCreate() {
    if (!title.trim()) return;

    setIsLoading(true);
    const result = await createCurriculumNode({
      instanceId,
      parentId,
      level,
      title: title.trim(),
    });

    setIsLoading(false);

    if (result.data) {
      setTitle("");
      setIsOpen(false);
      onCreated();
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1 px-2 py-1.5 text-[length:var(--text-xs)] text-muted-foreground transition-colors hover:text-amber-600"
      >
        <svg
          className="h-3.5 w-3.5"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 4.5v15m7.5-7.5h-15"
          />
        </svg>
        {label}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 px-2 py-1.5">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleCreate();
          if (e.key === "Escape") {
            setIsOpen(false);
            setTitle("");
          }
        }}
        placeholder={`New ${level}...`}
        autoFocus
        className="min-w-0 flex-1 rounded border border-gray-300 px-2 py-1 text-[length:var(--text-xs)] focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
      />
      <button
        onClick={handleCreate}
        disabled={isLoading || !title.trim()}
        className="rounded bg-amber-600 px-2 py-1 text-[length:var(--text-xs)] font-medium text-primary-foreground hover:bg-amber-700 disabled:opacity-50"
      >
        {isLoading ? "..." : "Add"}
      </button>
      <button
        onClick={() => {
          setIsOpen(false);
          setTitle("");
        }}
        className="rounded border border-gray-300 px-2 py-1 text-[length:var(--text-xs)] text-gray-600 hover:bg-background"
      >
        Cancel
      </button>
    </div>
  );
}

// ============================================================
// ActionBtn - small icon button for tree node actions
// ============================================================
function ActionBtn({
  title,
  onClick,
  disabled,
  danger,
  children,
}: {
  title: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      title={title}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      disabled={disabled}
      className={`rounded p-1 transition-colors disabled:opacity-50 ${
        danger
          ? "text-muted-foreground hover:bg-red-50 hover:text-red-600"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

// ============================================================
// Helper: Check if any descendant of a node matches search
// ============================================================
function hasDescendantMatch(
  node: CurriculumTreeNode,
  searchResults: Set<string>,
): boolean {
  for (const child of node.children) {
    if (searchResults.has(child.id)) return true;
    if (hasDescendantMatch(child, searchResults)) return true;
  }
  return false;
}
