"""Assembled LangGraph for ToC generation."""

from langgraph.graph import END, StateGraph

from ai_service.graph.nodes import (
    critique_node,
    draft_node,
    interrogate_node,
    retrieve_node,
)
from ai_service.graph.state import TocState


def build_toc_graph():
    graph = StateGraph(TocState)
    graph.add_node("interrogate", interrogate_node)
    graph.add_node("retrieve", retrieve_node)
    graph.add_node("draft", draft_node)
    graph.add_node("critique", critique_node)

    graph.set_entry_point("interrogate")
    graph.add_edge("interrogate", "retrieve")
    graph.add_edge("retrieve", "draft")
    graph.add_edge("draft", "critique")
    graph.add_edge("critique", END)

    return graph.compile()


toc_graph = build_toc_graph()
