from __future__ import annotations

import argparse
import json
from collections import defaultdict, deque
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any
import xml.etree.ElementTree as ET

GRAPHML_NS = {"g": "http://graphml.graphdrawing.org/xmlns"}
DEFAULT_SOURCE_GRAPH = Path(r"C:\Users\Admin\Desktop\可视化图\dickens_v2\graph_chunk_entity_relation.graphml")
DEFAULT_OUTPUT_JSON = Path("apps/main-platform/public/trace/trace-knowledge-graph-reduced.json")
DEFAULT_OUTPUT_STATS = Path("apps/main-platform/public/trace/trace-knowledge-graph-stats.json")
DEFAULT_TARGET_RATIO = 0.06
DEFAULT_MIN_CENTER_TREES = 5

NODE_COLOR_PALETTE = ["#6367FF", "#8494FF", "#C9BEFF", "#FFDBFD"]


def pick_node_color(group_key: str) -> str:
    if not group_key:
        return NODE_COLOR_PALETTE[0]
    idx = sum(ord(ch) for ch in group_key) % len(NODE_COLOR_PALETTE)
    return NODE_COLOR_PALETTE[idx]


@dataclass
class ParsedEdge:
    source: str
    target: str
    weight: float
    description: str


def truncate_text(text: str, limit: int) -> str:
    cleaned = " ".join(text.replace("<SEP>", "\n").split())
    if len(cleaned) <= limit:
        return cleaned
    return f"{cleaned[: limit - 1]}…"


def parse_graphml(path: Path) -> tuple[dict[str, dict[str, str]], list[ParsedEdge]]:
    root = ET.parse(path).getroot()

    key_name_map: dict[str, str] = {}
    for key_el in root.findall("g:key", GRAPHML_NS):
        key_id = key_el.attrib.get("id")
        attr_name = key_el.attrib.get("attr.name")
        if key_id and attr_name:
            key_name_map[key_id] = attr_name

    nodes: dict[str, dict[str, str]] = {}
    for node_el in root.findall(".//g:node", GRAPHML_NS):
        node_id = node_el.attrib.get("id")
        if not node_id:
            continue
        attrs: dict[str, str] = {}
        for data_el in node_el.findall("g:data", GRAPHML_NS):
            key_id = data_el.attrib.get("key")
            if not key_id:
                continue
            attr_name = key_name_map.get(key_id, key_id)
            attrs[attr_name] = (data_el.text or "").strip()
        nodes[node_id] = attrs

    edges: list[ParsedEdge] = []
    for edge_el in root.findall(".//g:edge", GRAPHML_NS):
        source = edge_el.attrib.get("source")
        target = edge_el.attrib.get("target")
        if not source or not target:
            continue

        attrs: dict[str, str] = {}
        for data_el in edge_el.findall("g:data", GRAPHML_NS):
            key_id = data_el.attrib.get("key")
            if not key_id:
                continue
            attr_name = key_name_map.get(key_id, key_id)
            attrs[attr_name] = (data_el.text or "").strip()

        try:
            weight = float(attrs.get("weight", "1"))
        except ValueError:
            weight = 1.0

        edges.append(
            ParsedEdge(
                source=source,
                target=target,
                weight=weight,
                description=attrs.get("description", ""),
            )
        )

    return nodes, edges


def build_adjacency(edges: list[ParsedEdge]) -> dict[str, list[tuple[str, float]]]:
    adjacency: dict[str, list[tuple[str, float]]] = defaultdict(list)
    for edge in edges:
        adjacency[edge.source].append((edge.target, edge.weight))
        adjacency[edge.target].append((edge.source, edge.weight))
    return adjacency


def pick_center_roots(
    all_nodes: dict[str, dict[str, str]],
    adjacency: dict[str, list[tuple[str, float]]],
    min_center_trees: int,
) -> list[str]:
    degree_sorted = sorted(
        all_nodes.keys(),
        key=lambda node_id: len(adjacency.get(node_id, [])),
        reverse=True,
    )
    roots = [node_id for node_id in degree_sorted if len(adjacency.get(node_id, [])) >= 2][:min_center_trees]
    if len(roots) < min_center_trees:
        for node_id in degree_sorted:
            if node_id in roots:
                continue
            roots.append(node_id)
            if len(roots) >= min_center_trees:
                break
    return roots


def expand_tree_nodes(
    root: str,
    adjacency: dict[str, list[tuple[str, float]]],
    degree_map: dict[str, int],
    budget: int,
) -> set[str]:
    selected = {root}
    queue = deque([(root, 0)])

    while queue and len(selected) < budget:
        current, depth = queue.popleft()
        if depth >= 2:
            continue

        neighbors = adjacency.get(current, [])
        ranked_neighbors = sorted(
            neighbors,
            key=lambda item: (item[1], degree_map.get(item[0], 0)),
            reverse=True,
        )

        for neighbor, _weight in ranked_neighbors:
            if neighbor in selected:
                continue
            selected.add(neighbor)
            queue.append((neighbor, depth + 1))
            if len(selected) >= budget:
                break

    return selected


def reduce_graph(
    all_nodes: dict[str, dict[str, str]],
    all_edges: list[ParsedEdge],
    target_ratio: float,
    min_center_trees: int,
) -> tuple[set[str], list[ParsedEdge], list[str]]:
    adjacency = build_adjacency(all_edges)
    degree_map = {node_id: len(adjacency.get(node_id, [])) for node_id in all_nodes}

    target_node_count = max(min_center_trees * 28, int(round(len(all_nodes) * target_ratio)))
    center_roots = pick_center_roots(all_nodes, adjacency, min_center_trees)
    tree_budget = max(28, target_node_count // max(1, len(center_roots)))

    kept_nodes: set[str] = set()
    for root in center_roots:
        kept_nodes |= expand_tree_nodes(root, adjacency, degree_map, tree_budget)

    degree_sorted = sorted(all_nodes.keys(), key=lambda n: degree_map.get(n, 0), reverse=True)

    if len(kept_nodes) < target_node_count:
        connected_candidates = [
            node_id
            for node_id in degree_sorted
            if node_id not in kept_nodes and any(nei in kept_nodes for nei, _ in adjacency.get(node_id, []))
        ]
        for node_id in connected_candidates:
            kept_nodes.add(node_id)
            if len(kept_nodes) >= target_node_count:
                break

    if len(kept_nodes) < target_node_count:
        for node_id in degree_sorted:
            if node_id in kept_nodes:
                continue
            kept_nodes.add(node_id)
            if len(kept_nodes) >= target_node_count:
                break

    if len(kept_nodes) > target_node_count:
        must_keep = set(center_roots)
        optional_nodes = [
            node_id
            for node_id in degree_sorted
            if node_id in kept_nodes and node_id not in must_keep
        ]
        trimmed = set(center_roots)
        for node_id in optional_nodes:
            trimmed.add(node_id)
            if len(trimmed) >= target_node_count:
                break
        kept_nodes = trimmed

    kept_edges = [
        edge
        for edge in all_edges
        if edge.source in kept_nodes and edge.target in kept_nodes
    ]

    return kept_nodes, kept_edges, center_roots


def to_vis_payload(
    all_nodes: dict[str, dict[str, str]],
    kept_nodes: set[str],
    kept_edges: list[ParsedEdge],
    center_roots: list[str],
    source_graph_size: int,
    target_ratio: float,
) -> dict[str, Any]:
    adjacency = build_adjacency(kept_edges)
    degree_map = {node_id: len(adjacency.get(node_id, [])) for node_id in kept_nodes}

    vis_nodes: list[dict[str, Any]] = []
    for node_id in kept_nodes:
        attrs = all_nodes.get(node_id, {})
        entity_type = attrs.get("entity_type", "unknown")
        color = pick_node_color(entity_type)
        degree = degree_map.get(node_id, 0)
        is_center = node_id in center_roots

        size = 10 + min(14, degree)
        if is_center:
            size += 8

        description = attrs.get("description") or attrs.get("entity_id") or node_id
        vis_nodes.append(
            {
                "id": node_id,
                "label": truncate_text(node_id, 26),
                "title": truncate_text(description, 420),
                "group": entity_type,
                "color": color,
                "shape": "dot",
                "size": size,
            }
        )

    vis_edges: list[dict[str, Any]] = []
    for edge in kept_edges:
        width = 1.0 + min(3.5, max(0.0, edge.weight))
        vis_edges.append(
            {
                "from": edge.source,
                "to": edge.target,
                "width": round(width, 2),
                "title": truncate_text(edge.description or f"{edge.source} ↔ {edge.target}", 320),
                "smooth": True,
                "color": "rgba(0,71,255,0.32)",
            }
        )

    payload: dict[str, Any] = {
        "meta": {
            "generatedAt": datetime.now().isoformat(timespec="seconds"),
            "sourceNodeCount": len(all_nodes),
            "sourceEdgeCount": None,
            "keptNodeCount": len(vis_nodes),
            "keptEdgeCount": len(vis_edges),
            "targetRatio": target_ratio,
            "sourceGraphBytes": source_graph_size,
            "centerRoots": center_roots,
        },
        "nodes": sorted(vis_nodes, key=lambda item: item["size"], reverse=True),
        "edges": sorted(vis_edges, key=lambda item: item["width"], reverse=True),
    }

    return payload


def main() -> None:
    parser = argparse.ArgumentParser(description="Build reduced TraceWindow knowledge graph data.")
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE_GRAPH)
    parser.add_argument("--output-json", type=Path, default=DEFAULT_OUTPUT_JSON)
    parser.add_argument("--output-stats", type=Path, default=DEFAULT_OUTPUT_STATS)
    parser.add_argument("--target-ratio", type=float, default=DEFAULT_TARGET_RATIO)
    parser.add_argument("--min-center-trees", type=int, default=DEFAULT_MIN_CENTER_TREES)
    args = parser.parse_args()

    source = args.source
    output_json = args.output_json
    output_stats = args.output_stats
    target_ratio = args.target_ratio
    min_center_trees = args.min_center_trees

    nodes, edges = parse_graphml(source)
    kept_nodes, kept_edges, center_roots = reduce_graph(
        nodes,
        edges,
        target_ratio=target_ratio,
        min_center_trees=min_center_trees,
    )

    payload = to_vis_payload(
        all_nodes=nodes,
        kept_nodes=kept_nodes,
        kept_edges=kept_edges,
        center_roots=center_roots,
        source_graph_size=source.stat().st_size,
        target_ratio=target_ratio,
    )
    payload["meta"]["sourceEdgeCount"] = len(edges)

    output_json.parent.mkdir(parents=True, exist_ok=True)
    output_stats.parent.mkdir(parents=True, exist_ok=True)

    serialized = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    output_json.write_text(serialized, encoding="utf-8")

    output_size = output_json.stat().st_size
    stats = {
        "source": {
            "nodeCount": len(nodes),
            "edgeCount": len(edges),
            "graphBytes": source.stat().st_size,
        },
        "output": {
            "nodeCount": len(payload["nodes"]),
            "edgeCount": len(payload["edges"]),
            "graphBytes": output_size,
            "nodeRatio": round(len(payload["nodes"]) / max(1, len(nodes)), 4),
            "sizeRatio": round(output_size / max(1, source.stat().st_size), 4),
        },
        "constraints": {
            "targetRatio": target_ratio,
            "minCenterTrees": min_center_trees,
            "actualCenterTrees": len(center_roots),
            "centerRoots": center_roots,
        },
    }
    output_stats.write_text(json.dumps(stats, ensure_ascii=False, indent=2), encoding="utf-8")

    print(json.dumps(stats, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
