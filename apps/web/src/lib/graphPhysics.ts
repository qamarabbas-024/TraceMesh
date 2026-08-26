export interface PhysicsNode {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  isRoot?: boolean;
  cluster?: string;
  pinned?: boolean;
}

export interface PhysicsEdge {
  source: string;
  target: string;
  length: number;
  strength: number;
}

export class ForceGraphSimulation {
  nodes: Map<string, PhysicsNode> = new Map();
  edges: PhysicsEdge[] = [];
  damping: number = 0.88;
  repulsion: number = 2400;
  centerStrength: number = 0.04;

  constructor(nodes: PhysicsNode[] = [], edges: PhysicsEdge[] = []) {
    nodes.forEach((n) => this.nodes.set(n.id, { ...n }));
    this.edges = edges;
  }

  update(delta: number = 0.016) {
    const nodeList = Array.from(this.nodes.values());

    // 1. Center gravity pull
    for (const node of nodeList) {
      if (node.pinned || node.isRoot) continue;
      node.vx -= node.x * this.centerStrength;
      node.vy -= node.y * this.centerStrength;
    }

    // 2. Node-to-Node Coulomb Repulsion
    for (let i = 0; i < nodeList.length; i++) {
      for (let j = i + 1; j < nodeList.length; j++) {
        const n1 = nodeList[i];
        const n2 = nodeList[j];

        const dx = n2.x - n1.x;
        const dy = n2.y - n1.y;
        const distSq = dx * dx + dy * dy + 100; // avoid div by 0
        const dist = Math.sqrt(distSq);

        const force = (this.repulsion / distSq) * delta * 60;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        if (!n1.pinned && !n1.isRoot) {
          n1.vx -= fx;
          n1.vy -= fy;
        }
        if (!n2.pinned && !n2.isRoot) {
          n2.vx += fx;
          n2.vy += fy;
        }
      }
    }

    // 3. Edge Spring Attraction
    for (const edge of this.edges) {
      const src = this.nodes.get(edge.source);
      const tgt = this.nodes.get(edge.target);
      if (!src || !tgt) continue;

      const dx = tgt.x - src.x;
      const dy = tgt.y - src.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const displacement = dist - edge.length;
      const force = displacement * edge.strength * delta * 60;

      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;

      if (!src.pinned && !src.isRoot) {
        src.vx += fx;
        src.vy += fy;
      }
      if (!tgt.pinned && !tgt.isRoot) {
        tgt.vx -= fx;
        tgt.vy -= fy;
      }
    }

    // 4. Integrate Velocities with Damping
    for (const node of nodeList) {
      if (node.pinned || node.isRoot) {
        node.vx = 0;
        node.vy = 0;
        continue;
      }

      node.vx *= this.damping;
      node.vy *= this.damping;

      node.x += node.vx * delta * 60;
      node.y += node.vy * delta * 60;
    }
  }

  setNodePosition(id: string, x: number, y: number, pinned: boolean = true) {
    const node = this.nodes.get(id);
    if (node) {
      node.x = x;
      node.y = y;
      node.pinned = pinned;
      node.vx = 0;
      node.vy = 0;
    }
  }
}
