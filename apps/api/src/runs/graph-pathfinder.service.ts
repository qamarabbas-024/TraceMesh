import { Injectable, Logger } from '@nestjs/common';
import { DiscoveredEntity } from '@tracemesh/shared';

export interface PathStep {
  fromEntity: string;
  toEntity: string;
  relationType: string;
  confidence: number;
}

export interface ShortestPathResult {
  sourceEntity: string;
  targetEntity: string;
  pathFound: boolean;
  degreesOfSeparation: number;
  pathNodes: string[];
  steps: PathStep[];
  bridgeEntities: string[];
}

@Injectable()
export class GraphPathfinderService {
  private readonly logger = new Logger(GraphPathfinderService.name);

  public findShortestPath(
    entities: DiscoveredEntity[],
    sourceValue: string,
    targetValue: string,
  ): ShortestPathResult {
    const src = sourceValue.trim().toLowerCase();
    const dst = targetValue.trim().toLowerCase();

    // Construct adjacency list from entities
    const adj = new Map<string, Array<{ to: string; rel: string; conf: number }>>();

    const addEdge = (u: string, v: string, rel: string, conf: number) => {
      if (!adj.has(u)) adj.set(u, []);
      adj.get(u)!.push({ to: v, rel, conf });
      if (!adj.has(v)) adj.set(v, []);
      adj.get(v)!.push({ to: u, rel, conf });
    };

    // Synthesize relational linkages among entities
    for (let i = 0; i < entities.length; i++) {
      const e1 = entities[i].value.toLowerCase();
      for (let j = i + 1; j < entities.length; j++) {
        const e2 = entities[j].value.toLowerCase();
        if (entities[i].sourceTool === entities[j].sourceTool) {
          addEdge(e1, e2, `co_discovered_by_${entities[i].sourceTool}`, entities[i].confidence || 0.8);
        }
      }
    }

    // BFS Queue: [current, path]
    const queue: Array<{ node: string; path: string[]; steps: PathStep[] }> = [
      { node: src, path: [src], steps: [] },
    ];
    const visited = new Set<string>([src]);

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (current.node === dst) {
        const bridgeNodes = current.path.slice(1, -1);
        return {
          sourceEntity: sourceValue,
          targetEntity: targetValue,
          pathFound: true,
          degreesOfSeparation: current.path.length - 1,
          pathNodes: current.path,
          steps: current.steps,
          bridgeEntities: bridgeNodes,
        };
      }

      const neighbors = adj.get(current.node) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor.to)) {
          visited.add(neighbor.to);
          queue.push({
            node: neighbor.to,
            path: [...current.path, neighbor.to],
            steps: [
              ...current.steps,
              {
                fromEntity: current.node,
                toEntity: neighbor.to,
                relationType: neighbor.rel,
                confidence: neighbor.conf,
              },
            ],
          });
        }
      }
    }

    return {
      sourceEntity: sourceValue,
      targetEntity: targetValue,
      pathFound: false,
      degreesOfSeparation: -1,
      pathNodes: [],
      steps: [],
      bridgeEntities: [],
    };
  }
}
