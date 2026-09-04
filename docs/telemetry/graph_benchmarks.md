# 3D Force-Directed Graph Physics Benchmarks

## Benchmark Telemetry
- **Hardware Profile**: 8-Core CPU / Dedicated WebGL Context
- **Simulation Node Scale**: 10,000 entities, 25,000 edges
- **Mean Physics Step**: ~1.4ms per iteration
- **FPS Target**: 60 FPS sustained
- **Spatial Partitioning**: Octree-based Barnes-Hut repulsion ($O(N \log N)$)

## Edge Rendering Optimization
- InstancedBufferGeometry for multi-hop relationship links
- Alpha channel fading on dynamic search queries
