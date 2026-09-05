# Steganography Detection Heuristics & Analysis

## Detection Methodology
TraceMesh implements passive raster analysis to detect hidden payloads within visual assets:
- **LSB (Least Significant Bit) Variance**: Scans for anomalous entropy in lower bit planes.
- **Chi-Square Attack**: Calculates statistical distribution of pairs of values (PoVs).
- **Metadata Anomaly Check**: Flags trailing payload bytes after standard EOF markers (e.g., `0xFFD9` for JPEG, `IEND` chunk for PNG).
