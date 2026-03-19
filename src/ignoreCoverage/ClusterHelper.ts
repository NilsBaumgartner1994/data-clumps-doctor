/**
 * Builds an undirected graph from a data-clumps dictionary and runs DFS to find
 * connected components (clusters). Returns a map of node → cluster info.
 *
 * Cluster types:
 *  - 1: isolated node (one class)
 *  - 2: pair (two classes)
 *  - 3: three or more classes
 */
export function buildClusterInfoFromDataClumps(data_clumps_dict: Record<string, any>): Record<string, { cluster_id: number; cluster_type: number }> {
  const data_clumps_keys = Object.keys(data_clumps_dict);

  // Build undirected graph: node = class/interface key, edge = data clump relationship
  const graph: Record<string, Set<string>> = {};
  for (const data_clump_key of data_clumps_keys) {
    const data_clump = data_clumps_dict[data_clump_key];
    const from_class = data_clump.from_class_or_interface_key;
    const to_class = data_clump.to_class_or_interface_key;

    if (!graph[from_class]) {
      graph[from_class] = new Set<string>();
    }
    if (!graph[to_class]) {
      graph[to_class] = new Set<string>();
    }
    graph[from_class].add(to_class);
    graph[to_class].add(from_class);
  }

  // DFS to find connected components and assign cluster IDs
  const visited: Record<string, boolean> = {};
  const nodeClusterInfo: Record<string, { cluster_id: number; cluster_type: number }> = {};
  let cluster_id = 0;

  function dfs(node: string): string[] {
    visited[node] = true;
    const members: string[] = [node];
    for (const neighbor of graph[node]) {
      if (!visited[neighbor]) {
        members.push(...dfs(neighbor));
      }
    }
    return members;
  }

  for (const node of Object.keys(graph)) {
    if (!visited[node]) {
      cluster_id++;
      const members = dfs(node);
      const cluster_size = members.length;
      const cluster_type = cluster_size === 1 ? 1 : cluster_size === 2 ? 2 : 3;
      for (const member of members) {
        nodeClusterInfo[member] = { cluster_id, cluster_type };
      }
    }
  }

  return nodeClusterInfo;
}
