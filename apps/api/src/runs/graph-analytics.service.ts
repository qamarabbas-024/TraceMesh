import { Injectable, Logger } from '@nestjs/common';
import { DiscoveredEntity } from '@tracemesh/shared';

export interface GraphNodeMetrics {
  entityId: string;
  degree: number;
  pageRank: number;
  betweenness: number;
  communityId: number;
  isBridgeNode: boolean;
  isHighValuePivot: boolean;
}

export interface GraphAnalyticsResult {
  nodeMetrics: Map<string, GraphNodeMetrics>;
  communitiesCount: number;
  topPivots: { entityId: string; label: string; score: number }[];
  graphDensity: number;
}

@Injectable()
export class GraphAnalyticsService {
  private readonly logger = new Logger(GraphAnalyticsService.name);

  /**
   * Performs PageRank, Betweenness Centrality, and Community Detection on an entity graph.
   */
  public analyze(entities: DiscoveredEntity[]): GraphAnalyticsResult {
    if (!entities || entities.length === 0) {
      return {
        nodeMetrics: new Map(),
        communitiesCount: 0,
        topPivots: [],
        graphDensity: 0,
      };
    }

    const nodeIds = entities.map((e, idx) => e.value || `node_${idx}`);
    const n = nodeIds.length;

    // 1. Build Adjacency Matrix & Edge Lists based on shared metadata / common parents
    const adj: Map<string, Set<string>> = new Map();
    for (const id of nodeIds) {
      adj.set(id, new Set());
    }

    for (let i = 0; i < n; i++) {
      const e1 = entities[i];
      const id1 = nodeIds[i];
      for (let j = i + 1; j < n; j++) {
        const e2 = entities[j];
        const id2 = nodeIds[j];

        // Connect if same sourceTool, shared metadata IP/domain, or hierarchical link
        const shareTool = e1.sourceTool === e2.sourceTool;
        const shareType = e1.type === e2.type;
        const metadataCross = this.hasMetadataLink(e1, e2);

        if (metadataCross || (shareTool && shareType)) {
          adj.get(id1)!.add(id2);
          adj.get(id2)!.add(id1);
        }
      }
    }

    // 2. Degree Centrality
    const degrees: Map<string, number> = new Map();
    let totalEdges = 0;
    for (const [id, neighbors] of adj.entries()) {
      degrees.set(id, neighbors.size);
      totalEdges += neighbors.size;
    }
    totalEdges = totalEdges / 2;

    const maxEdges = n > 1 ? (n * (n - 1)) / 2 : 1;
    const graphDensity = Math.min(1, totalEdges / maxEdges);

    // 3. PageRank Algorithm (Power iteration with damping factor d = 0.85)
    const damping = 0.85;
    const iterations = 20;
    let pageRank: Map<string, number> = new Map();
    for (const id of nodeIds) pageRank.set(id, 1 / n);

    for (let iter = 0; iter < iterations; iter++) {
      const nextRank: Map<string, number> = new Map();
      const base = (1 - damping) / n;

      for (const id of nodeIds) {
        let rankSum = 0;
        for (const neighborId of adj.get(id)!) {
          const neighborDegree = degrees.get(neighborId) || 1;
          rankSum += (pageRank.get(neighborId) || 0) / neighborDegree;
        }
        nextRank.set(id, base + damping * rankSum);
      }
      pageRank = nextRank;
    }

    // 4. Brandes' Betweenness Centrality
    const betweenness: Map<string, number> = new Map();
    for (const id of nodeIds) betweenness.set(id, 0);

    for (const s of nodeIds) {
      const S: string[] = [];
      const P: Map<string, string[]> = new Map();
      const sigma: Map<string, number> = new Map();
      const d: Map<string, number> = new Map();

      for (const id of nodeIds) {
        P.set(id, []);
        sigma.set(id, 0);
        d.set(id, -1);
      }

      sigma.set(s, 1);
      d.set(s, 0);
      const Q: string[] = [s];

      while (Q.length > 0) {
        const v = Q.shift()!;
        S.push(v);
        const distV = d.get(v)!;

        for (const w of adj.get(v)!) {
          if (d.get(w)! < 0) {
            Q.push(w);
            d.set(w, distV + 1);
          }
          if (d.get(w) === distV + 1) {
            sigma.set(w, sigma.get(w)! + sigma.get(v)!);
            P.get(w)!.push(v);
          }
        }
      }

      const delta: Map<string, number> = new Map();
      for (const id of nodeIds) delta.set(id, 0);

      while (S.length > 0) {
        const w = S.pop()!;
        const sigmaW = sigma.get(w)!;
        for (const v of P.get(w)!) {
          const sigmaV = sigma.get(v)!;
          const c = (sigmaV / sigmaW) * (1 + delta.get(w)!);
          delta.set(v, delta.get(v)! + c);
        }
        if (w !== s) {
          betweenness.set(w, betweenness.get(w)! + delta.get(w)!);
        }
      }
    }

    // 5. Community Detection (Connected Component & Label Propagation)
    const visited = new Set<string>();
    const communityMap = new Map<string, number>();
    let currentCommunity = 1;

    for (const id of nodeIds) {
      if (!visited.has(id)) {
        const queue = [id];
        visited.add(id);
        while (queue.length > 0) {
          const curr = queue.shift()!;
          communityMap.set(curr, currentCommunity);
          for (const neighbor of adj.get(curr)!) {
            if (!visited.has(neighbor)) {
              visited.add(neighbor);
              queue.push(neighbor);
            }
          }
        }
        currentCommunity++;
      }
    }

    // 6. Aggregate Node Metrics & High-Value Pivot Scoring
    const metricsMap = new Map<string, GraphNodeMetrics>();
    const topPivots: { entityId: string; label: string; score: number }[] = [];

    for (let i = 0; i < n; i++) {
      const entity = entities[i];
      const id = nodeIds[i];
      const deg = degrees.get(id) || 0;
      const pr = pageRank.get(id) || 0;
      const bw = betweenness.get(id) || 0;
      const commId = communityMap.get(id) || 1;

      const isBridge = bw > 0 && deg > 1;
      const compositeScore = (pr * 100) + (bw * 2) + (deg * 1.5) + (entity.confidence * 10);
      const isHighValue = compositeScore > 15;

      const metrics: GraphNodeMetrics = {
        entityId: id,
        degree: deg,
        pageRank: parseFloat(pr.toFixed(5)),
        betweenness: parseFloat(bw.toFixed(3)),
        communityId: commId,
        isBridgeNode: isBridge,
        isHighValuePivot: isHighValue,
      };

      metricsMap.set(id, metrics);

      // Attach metrics directly to entity metadata
      entity.metadata = {
        ...(entity.metadata || {}),
        graphMetrics: {
          degree: deg,
          pageRank: metrics.pageRank,
          betweenness: metrics.betweenness,
          communityId: commId,
          isBridgeNode: isBridge,
          isHighValuePivot: isHighValue,
        },
      };

      if (isHighValue) {
        topPivots.push({
          entityId: id,
          label: entity.label || id,
          score: parseFloat(compositeScore.toFixed(2)),
        });
      }
    }

    topPivots.sort((a, b) => b.score - a.score);

    return {
      nodeMetrics: metricsMap,
      communitiesCount: currentCommunity - 1,
      topPivots: topPivots.slice(0, 5),
      graphDensity: parseFloat(graphDensity.toFixed(4)),
    };
  }

  private hasMetadataLink(e1: DiscoveredEntity, e2: DiscoveredEntity): boolean {
    if (!e1.metadata || !e2.metadata) return false;
    // Check if e1 and e2 reference the same IP, host, or domain
    for (const k1 of Object.keys(e1.metadata)) {
      const v1 = String(e1.metadata[k1]);
      for (const k2 of Object.keys(e2.metadata)) {
        const v2 = String(e2.metadata[k2]);
        if (v1 && v2 && v1.length > 3 && v1 === v2) {
          return true;
        }
      }
    }
    return false;
  }
}
