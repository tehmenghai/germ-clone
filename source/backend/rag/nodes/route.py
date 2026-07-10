"""
route node — classifies the student query to one of modules 3.1–3.10.
Returns: mod (str), stage_events.
"""
import re

from llm.dispatch import complete
from rag.state import GraphState
from schemas.events import StageEvent

_SYSTEM = """\
You are a course module classifier for an ML course covering modules 3.1–3.10:
  3.1  Probability & Statistics for ML
  3.2  Introduction to ML (basic supervised/unsupervised concepts, KNN classification,
       decision trees; choosing "k" here means the number of neighbors in KNN)
  3.3  Supervised Learning
  3.4  Supervised Learning — Advanced
  3.5  Unsupervised Learning (clustering, k-means, PCA; choosing "k" here means the
       number of clusters in k-means — distinct from KNN's "k" in 3.2)
  3.6  Time Series Data & Forecasting
  3.7  Neural Networks & Deep Learning
  3.8  Computer Vision
  3.9  NLP
  3.10 NLP — Advanced

Some terms share a name across modules (e.g. "k" is a hyperparameter in both KNN [3.2]
and k-means [3.5]) — classify by what the question is actually about, not by keyword
overlap: predicting a label for labeled/classification data is 3.2 (KNN); grouping
unlabeled data into clusters is 3.5 (k-means).

Reply with ONLY the module number (e.g. "3.3"). No other text."""


async def route_node(state: GraphState) -> dict:
    resp = await complete(
        [
            {"role": "system", "content": _SYSTEM},
            {"role": "user", "content": state["query"]},
        ]
    )
    mod = resp.strip().split()[0]
    if not re.match(r"^3\.\d+$", mod):
        mod = "3.1"
    return {
        "mod": mod,
        "stage_events": [StageEvent(stage="route", status="done", detail=f"→ module {mod}")],
    }
