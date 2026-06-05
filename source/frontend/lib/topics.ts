// Single source of truth for query → topic detection.
//
// Previously three call sites kept their own keyword tables and drifted:
//   - MLWorkspace.detectTopic   (drove the math tab + viz)
//   - VizPanel.detectViz        (drove which viz renders — had extra synonyms)
//   - page.detectActiveModules  (drove the Matrix coverage-bar highlight)
// The drift was user-visible: e.g. "underfit" matched the viz but not the math tab.
// All three now import from here.

export type TopicId =
  | "bias-variance"
  | "regularization"
  | "knn"
  | "gradient-descent"
  | "confusion-matrix";

interface TopicDef {
  id: TopicId;
  /** Lowercased substrings that route a query to this topic. */
  keywords: string[];
  /** Course modules this topic lights up in the coverage bar. */
  modules: string[];
}

// Order matters: first match wins. Keep more specific topics above broader ones.
const TOPICS: TopicDef[] = [
  {
    id: "confusion-matrix",
    keywords: ["confusion matrix", "precision", "recall", "f1", "false positive", "false negative", "true positive"],
    modules: ["3.3"],
  },
  {
    id: "bias-variance",
    keywords: ["bias", "variance", "overfit", "underfit"],
    modules: ["3.3", "3.4"],
  },
  {
    id: "regularization",
    keywords: ["regular", "lasso", "ridge", "elastic"],
    modules: ["3.4"],
  },
  {
    id: "knn",
    keywords: ["knn", "nearest", "neighbour", "neighbor"],
    modules: ["3.2", "3.3"],
  },
  {
    id: "gradient-descent",
    keywords: ["gradient", "descent", "sgd", "adam", "learning rate"],
    modules: ["3.7"],
  },
];

/** Returns the matched topic id, or null when no topic applies. */
export function detectTopic(query: string): TopicId | null {
  const q = query.toLowerCase();
  for (const t of TOPICS) {
    if (t.keywords.some((k) => q.includes(k))) return t.id;
  }
  return null;
}

/** Module ids to highlight in the Matrix coverage bar for a query (empty if none). */
export function detectActiveModules(query: string): string[] {
  const id = detectTopic(query);
  if (!id) return [];
  return TOPICS.find((t) => t.id === id)!.modules;
}
