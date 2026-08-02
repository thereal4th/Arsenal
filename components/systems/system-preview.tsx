"use client";

import { useMemo } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  ReactFlow,
  ReactFlowProvider,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { TechniqueNode, type TechniqueNodeData } from "./technique-node";
import type { SystemGraph } from "@/lib/types";

const nodeTypes = { technique: TechniqueNode };

/** Read-only rendering of a system, used on public share pages. */
export function SystemPreview({ system }: { system: SystemGraph }) {
  const nodes = useMemo<Node<TechniqueNodeData>[]>(
    () =>
      system.nodes.map((n) => ({
        id: n.id,
        type: "technique",
        position: n.position,
        draggable: false,
        data: {
          label: n.label,
          detail: n.detail,
          kind: n.kind,
          // Linked notes stay private, so the shared view never offers a way in.
          noteId: null,
          cover: null,
        },
      })),
    [system.nodes],
  );

  const edges = useMemo<Edge[]>(
    () =>
      system.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.label || undefined,
        type: "smoothstep",
        markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
        style: { stroke: "var(--border-strong)", strokeWidth: 1.5 },
      })),
    [system.edges],
  );

  return (
    <ReactFlowProvider>
      <div className="h-[70vh] w-full overflow-hidden rounded-[12px] border border-[var(--border)] bg-[var(--bg)]">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.25, maxZoom: 1 }}
          minZoom={0.2}
          maxZoom={1.5}
          nodesConnectable={false}
          elementsSelectable={false}
          proOptions={{ hideAttribution: false }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={22}
            size={1}
            color="rgba(255,255,255,0.07)"
          />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
    </ReactFlowProvider>
  );
}
