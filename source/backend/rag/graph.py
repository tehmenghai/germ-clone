"""
LangGraph StateGraph — 9-stage agentic RAG pipeline with reloop.

Stages: route → rewrite → retrieve1 → react → reflect → evaluate1
        → [pass] compose
        → [reloop] retrieve2 → evaluate2 → compose

Reloop condition: mean(f, r, c) < 0.80 after evaluate1.
"""
from langgraph.graph import END, START, StateGraph

from rag.nodes.compose import compose_node
from rag.nodes.evaluate import evaluate1_node, evaluate2_node
from rag.nodes.react import react_node
from rag.nodes.reflect import reflect_node
from rag.nodes.retrieve import retrieve1_node, retrieve2_node
from rag.nodes.rewrite import rewrite_node
from rag.nodes.route import route_node
from rag.state import GraphState


def _pass_or_reloop(state: GraphState) -> str:
    scores = state.get("scores_1")
    if scores is None:
        return "reloop"
    mean = (scores.f + scores.r + scores.c) / 3
    return "pass" if mean >= 0.80 else "reloop"


def build_graph():
    g = StateGraph(GraphState)

    g.add_node("route", route_node)
    g.add_node("rewrite", rewrite_node)
    g.add_node("retrieve1", retrieve1_node)
    g.add_node("react", react_node)
    g.add_node("reflect", reflect_node)
    g.add_node("evaluate1", evaluate1_node)
    g.add_node("retrieve2", retrieve2_node)
    g.add_node("evaluate2", evaluate2_node)
    g.add_node("compose", compose_node)

    g.add_edge(START, "route")
    g.add_edge("route", "rewrite")
    g.add_edge("rewrite", "retrieve1")
    g.add_edge("retrieve1", "react")
    g.add_edge("react", "reflect")
    g.add_edge("reflect", "evaluate1")
    g.add_conditional_edges(
        "evaluate1",
        _pass_or_reloop,
        {"pass": "compose", "reloop": "retrieve2"},
    )
    g.add_edge("retrieve2", "evaluate2")
    g.add_edge("evaluate2", "compose")
    g.add_edge("compose", END)

    return g.compile()
