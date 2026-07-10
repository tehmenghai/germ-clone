/* ============================================================
   content.jsx — the corpus answers, in germayne's voice.
   Tone: warm, encouraging, analogy-first, lightly informal.
   (Fully tunable once we ingest his real transcripts.)
   Citations: <sup class="cite" data-cite="N">N</sup>
   ============================================================ */

const TOPICS = {
  overfit: {
    id:'overfit', module:'3.3 · 3.4', viz:'biasvar',
    q:'Why does my decision tree overfit, and how do I stop it?',
    chip:'Why does my decision tree overfit?',
    route:'topic=overfitting · modules [3.3, 3.4] · type=conceptual',
    rewrite:'"why overfit?" → "causes of overfitting; bias-variance; tree depth; pruning; regularization"',
    retrieve1:'6 chunks — lesson 3.3 §decision-trees, transcript 3.3 @00:41',
    retrieve2:'+3 chunks (prereq: bias-variance tradeoff, module 3.2)',
    react:'thought: needs the error-vs-complexity picture · act: render(bias-variance) · obs: ok',
    reflect:'v1 claimed "always prune" without support → softened & re-grounded',
    evalP1:{f:0.71,r:0.88,c:0.60}, evalP2:{f:0.91,r:0.88,c:0.84},
    explain:{
      eli5:`<p>Okay, imagine a student who <b>memorises</b> every past exam paper word-for-word instead of understanding the ideas. They'll ace those exact papers — but throw them a slightly new question and they're lost. That's your tree <sup class="cite" data-cite="1">1</sup>.</p>
      <p>A deep decision tree keeps splitting until every training example sits in its own little box. Perfect on training data, hopeless on anything new. The fix? Don't let it go so deep — make it learn the <em>pattern</em>, not the <em>paper</em>.</p>`,
      standard:`<p>A decision tree overfits when it grows deep enough to capture <b>noise</b> in the training set rather than the underlying signal — it keeps splitting until each leaf is nearly pure <sup class="cite" data-cite="1">1</sup>. Training error drops to near zero while test error climbs: the classic <b>high-variance</b> corner of the bias–variance tradeoff <sup class="cite" data-cite="2">2</sup>.</p>
      <p>To rein it in, constrain capacity: cap <code>max_depth</code>, raise <code>min_samples_leaf</code>, or <b>prune</b> weak splits after the fact. And the big one — <b>ensemble</b> it: a random forest averages many de-correlated trees, which cuts variance dramatically <sup class="cite" data-cite="3">3</sup>.</p>`,
      rigorous:`<p>Expected test error decomposes as <b>bias² + variance + irreducible noise</b> <sup class="cite" data-cite="2">2</sup>. An unconstrained CART tree is a low-bias, high-variance estimator: with enough depth it interpolates the training sample, so bias→0 but variance dominates generalisation error <sup class="cite" data-cite="1">1</sup>.</p>
      <p>Capacity controls (<code>max_depth</code>, <code>min_samples_leaf</code>, cost-complexity pruning α) trade a little bias for a large variance reduction. Bagging averages B i.i.d.-ish trees, scaling variance by ≈ρ + (1−ρ)/B; random feature subsampling lowers the pairwise correlation ρ, which is precisely why random forests generalise better <sup class="cite" data-cite="3">3</sup>.</p>`
    },
    code:`from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import cross_val_score

# An unconstrained tree memorises the training set
deep = DecisionTreeClassifier()              # grows until pure -> overfits
shallow = DecisionTreeClassifier(
    max_depth=4,            # cap capacity
    min_samples_leaf=10,    # no tiny noisy leaves
    ccp_alpha=0.01)         # cost-complexity pruning

# Ensembling cuts variance the most
forest = RandomForestClassifier(
    n_estimators=300, max_features="sqrt")

for name, clf in [("deep", deep), ("pruned", shallow), ("forest", forest)]:
    score = cross_val_score(clf, X, y, cv=5).mean()
    print(f"{name:8s} cv-accuracy = {score:.3f}")`,
    math:[
      {eq:`E&#8202;[(y &minus; <span class="v hat">f</span>(x))<sup>2</sup>] = Bias(<span class="v hat">f</span>)<sup>2</sup> + Var(<span class="v hat">f</span>) + &sigma;<sup>2</sup>`,
       note:'The error decomposition. A deep tree drives Bias → 0 but lets Var grow. Pruning trades a little bias for a large drop in variance.'},
      {eq:`Var<sub>rf</sub> = <span class="v">&rho;&sigma;<sup>2</sup></span> + <span class="v">(1 &minus; &rho;)/B &middot; &sigma;<sup>2</sup></span>`,
       note:'Averaging B trees shrinks the second term; sampling features lowers the correlation ρ, shrinking the first. That is the whole idea of random forests.'}
    ],
    sources:[
      {id:1, mod:'3.3', file:'lesson.md · §decision-trees', ts:'', snip:'A fully grown tree partitions the space until each leaf is pure, fitting noise as if it were signal.'},
      {id:2, mod:'3.2', file:'transcript', ts:'01:04:20', snip:'…so total error is bias squared plus variance plus the noise you can never remove — keep that picture in your head.'},
      {id:3, mod:'3.4', file:'lesson.md · §ensembles', ts:'', snip:'Random forests decorrelate the trees by sampling features, which is what makes the variance reduction real.'}
    ]
  },

  reg: {
    id:'reg', module:'3.4', viz:'reg',
    q:'What is the difference between L1 and L2 regularization, and when do I use each?',
    chip:'L1 vs L2 regularization — when to use each?',
    route:'topic=regularization · module [3.4] · type=conceptual+comparative',
    rewrite:'+"Lasso Ridge", +"sparsity", +"feature selection", +"coefficient shrinkage", +"elastic net"',
    retrieve1:'6 chunks — lesson 3.4 §regularization, textbook ISLR ch.6',
    retrieve2:'+3 chunks (elastic net; transcript 3.4 @00:48)',
    react:'thought: the geometry sells it · act: render(L1 diamond vs L2 circle) · obs: ok',
    reflect:'v1 said "L1 always better" → unsupported, dropped; added correlated-features caveat',
    evalP1:{f:0.74,r:0.85,c:0.66}, evalP2:{f:0.92,r:0.89,c:0.84},
    explain:{
      eli5:`<p>Both are ways of telling your model: <b>"don't get carried away."</b> Big coefficients = an over-excited model. Regularization gently pulls them back toward zero <sup class="cite" data-cite="1">1</sup>.</p>
      <p>The difference is the <em>personality</em>. <b>L2 (Ridge)</b> shrinks everything a bit, like trimming all the hedges evenly. <b>L1 (Lasso)</b> is ruthless — it pushes the useless coefficients <em>all the way to zero</em> and just deletes those features <sup class="cite" data-cite="2">2</sup>.</p>`,
      standard:`<p>Both add a penalty on coefficient size to the loss, discouraging an over-flexible fit <sup class="cite" data-cite="1">1</sup>. <b>L2 (Ridge)</b> penalises the <em>squared</em> magnitude — it shrinks weights smoothly toward zero but rarely <em>to</em> zero, which is great when many features each contribute a little <sup class="cite" data-cite="1">1</sup>.</p>
      <p><b>L1 (Lasso)</b> penalises the <em>absolute</em> magnitude. Its diamond-shaped constraint has corners on the axes, so the solution often lands exactly on an axis — driving some weights to zero and doing automatic <b>feature selection</b> <sup class="cite" data-cite="2">2</sup>. Rule of thumb: L1 when you expect sparsity, L2 for correlated predictors, and <b>elastic net</b> when you want both <sup class="cite" data-cite="3">3</sup>.</p>`,
      rigorous:`<p>Ridge solves min ‖y−Xβ‖² + λ‖β‖₂², a smooth, strictly convex objective with the closed form β̂ = (XᵀX + λI)⁻¹Xᵀy — always unique, even when XᵀX is singular <sup class="cite" data-cite="1">1</sup>.</p>
      <p>Lasso solves min ‖y−Xβ‖² + λ‖β‖₁. The ℓ₁ ball is non-differentiable at the axes; geometrically the elliptical loss contours first touch this diamond at a vertex, yielding exact zeros — a sparse solution <sup class="cite" data-cite="2">2</sup>. Elastic net, λ₁‖β‖₁ + λ₂‖β‖₂², keeps L1 sparsity while the L2 term restores strict convexity and handles correlated groups <sup class="cite" data-cite="3">3</sup>.</p>`
    },
    code:`from sklearn.linear_model import Ridge, Lasso, ElasticNet

ridge = Ridge(alpha=1.0)        # L2: shrink all coefficients smoothly
lasso = Lasso(alpha=0.1)        # L1: drives some coefficients to exactly 0
enet  = ElasticNet(alpha=0.1, l1_ratio=0.5)   # blend of both

lasso.fit(X, y)
kept = (lasso.coef_ != 0).sum()
print(f"Lasso kept {kept} of {X.shape[1]} features")   # feature selection!

# Higher alpha (lambda) => stronger penalty => more shrinkage / more zeros`,
    math:[
      {eq:`<span class="v hat">&beta;</span><sub>ridge</sub> = arg min<sub>&beta;</sub> &#8201; &#8741;y &minus; X&beta;&#8741;<sup>2</sup> + &lambda;&#8201;<span class="v">&#8741;&beta;&#8741;<sub>2</sub><sup>2</sup></span>`,
       note:'Ridge — the squared (ℓ₂) penalty. Smooth and strictly convex, it shrinks every coefficient but keeps them all in the model.'},
      {eq:`<span class="v hat">&beta;</span><sub>lasso</sub> = arg min<sub>&beta;</sub> &#8201; &#8741;y &minus; X&beta;&#8741;<sup>2</sup> + &lambda;&#8201;<span class="v">&#8741;&beta;&#8741;<sub>1</sub></span>`,
       note:'Lasso — the absolute (ℓ₁) penalty. Its diamond constraint has corners on the axes, so the optimum often sets some βⱼ exactly to 0: feature selection.'}
    ],
    sources:[
      {id:1, mod:'3.4', file:'lesson.md · §regularization', ts:'', snip:'Ridge adds an L2 penalty λ∑βⱼ²; it shrinks coefficients but keeps every feature in the model.'},
      {id:2, mod:'ISLR', file:'ch.6.2 · The Lasso', ts:'', snip:'The lasso yields sparse models — ones that involve only a subset of the variables.'},
      {id:3, mod:'3.4', file:'transcript', ts:'00:48:12', snip:'…so elastic net combines both penalties, which you want when your predictors are correlated.'}
    ]
  },

  knn: {
    id:'knn', module:'3.2 · 3.3', viz:'knn',
    q:'How does K-Nearest Neighbors work, and how do I choose k?',
    chip:'How do I choose k in KNN?',
    route:'topic=knn · modules [3.2, 3.3] · type=conceptual+how-to',
    rewrite:'+"k selection", +"decision boundary", +"bias variance k", +"cross-validation k"',
    retrieve1:'5 chunks — lesson 3.2 §knn, transcript 3.3 @00:22',
    retrieve2:'+2 chunks (bias-variance link; choosing k via CV)',
    react:'thought: show how the boundary changes with k · act: render(knn boundary) · obs: ok',
    reflect:'v1 missed the even-k tie issue → added "use odd k" note',
    evalP1:{f:0.80,r:0.83,c:0.70}, evalP2:{f:0.90,r:0.88,c:0.86},
    explain:{
      eli5:`<p>KNN is the simplest idea in ML: <b>"you are who your neighbours are."</b> To classify a new point, look at the <em>k</em> closest examples and take a vote <sup class="cite" data-cite="1">1</sup>.</p>
      <p>Pick <em>k</em> too small (like k=1) and one weird neighbour can flip your answer — jumpy and over-sensitive. Too big and you're polling the whole town, washing out the local detail. The sweet spot is in between — and please use an <b>odd k</b> so votes can't tie <sup class="cite" data-cite="2">2</sup>.</p>`,
      standard:`<p>KNN is a <b>lazy</b>, non-parametric classifier: it stores the training set and, for a new point, finds the <em>k</em> nearest examples (by Euclidean distance, usually) and predicts the majority class <sup class="cite" data-cite="1">1</sup>. No training phase — all the work happens at query time.</p>
      <p><em>k</em> controls the bias–variance balance. Small <em>k</em> → a jagged boundary that hugs every point (low bias, high variance). Large <em>k</em> → a smooth boundary that may ignore real structure (high bias, low variance) <sup class="cite" data-cite="2">2</sup>. Choose it with cross-validation, keep it odd, and always scale your features first <sup class="cite" data-cite="3">3</sup>.</p>`,
      rigorous:`<p>KNN estimates P(y=c | x) by the local label frequency in the neighbourhood N_k(x). As n→∞ with k→∞ and k/n→0, the 1-NN error is bounded by twice the Bayes error, and KNN is consistent <sup class="cite" data-cite="1">1</sup>.</p>
      <p>Effective complexity scales like <b>n/k</b> degrees of freedom: small k → high variance, large k → high bias <sup class="cite" data-cite="2">2</sup>. The Euclidean metric makes feature scaling essential, and performance degrades in high dimensions (curse of dimensionality) as neighbourhoods stop being local <sup class="cite" data-cite="3">3</sup>.</p>`
    },
    code:`from sklearn.neighbors import KNeighborsClassifier
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import cross_val_score

# ALWAYS scale features — KNN uses raw distances
best_k, best_score = None, -1
for k in range(1, 26, 2):          # odd k avoids ties
    clf = make_pipeline(StandardScaler(),
                        KNeighborsClassifier(n_neighbors=k))
    s = cross_val_score(clf, X, y, cv=5).mean()
    if s > best_score:
        best_k, best_score = k, s

print(f"best k = {best_k}  (cv-accuracy {best_score:.3f})")`,
    math:[
      {eq:`<span class="v hat">y</span>(x) = arg max<sub>c</sub> &#8201; &sum;<sub>&#8201;i &isin; N<sub>k</sub>(x)</sub> &#8201; <span class="v">&#120793;</span>(y<sub>i</sub> = c)`,
       note:'Predict the class with the most votes among the k nearest neighbours. N_k(x) is the set of the k closest training points; 𝟙(·) is the indicator.'},
      {eq:`d(x, x<sub>i</sub>) = <span class="v">&radic;&#8202;&sum;<sub>j</sub>&#8201;(x<sub>j</sub> &minus; x<sub>ij</sub>)<sup>2</sup></span>`,
       note:'Euclidean distance — which is exactly why you must standardise features first, or the largest-scale feature dominates the vote.'}
    ],
    sources:[
      {id:1, mod:'3.2', file:'lesson.md · §knn', ts:'', snip:'KNN makes no assumptions about the data — it simply votes among the k closest stored examples.'},
      {id:2, mod:'3.3', file:'transcript', ts:'00:22:40', snip:'…small k gives you a wiggly boundary, big k smooths it out — that is bias and variance again.'},
      {id:3, mod:'3.2', file:'lesson.md · §preprocessing', ts:'', snip:'Distance-based methods need feature scaling; standardise before you fit KNN.'}
    ]
  },

  grad: {
    id:'grad', module:'3.7', viz:'grad',
    q:'How does gradient descent train a neural network, and what does the learning rate do?',
    chip:'What does the learning rate do in gradient descent?',
    route:'topic=optimization · module [3.7] · type=conceptual+how-to',
    rewrite:'+"learning rate", +"step size", +"backpropagation", +"convergence divergence", +"loss surface"',
    retrieve1:'6 chunks — lesson 3.7 §training, transcript 3.7 @00:55',
    retrieve2:'+2 chunks (learning-rate effects; overshoot/divergence)',
    react:'thought: animate the descent on a loss bowl · act: render(gradient descent) · obs: ok',
    reflect:'v1 conflated batch vs SGD → clarified the distinction',
    evalP1:{f:0.78,r:0.86,c:0.64}, evalP2:{f:0.93,r:0.90,c:0.85},
    explain:{
      eli5:`<p>Picture standing on a foggy hill, trying to reach the valley. You can't see far, so you feel which way is <b>downhill</b> and take a step. Repeat. That's gradient descent — the valley is the lowest error <sup class="cite" data-cite="1">1</sup>.</p>
      <p>The <b>learning rate</b> is your step size. Tiny steps → you'll get there eventually, but slowly. Huge steps → you leap clear over the valley and bounce around, never settling <sup class="cite" data-cite="2">2</sup>. Goldilocks: not too big, not too small.</p>`,
      standard:`<p>Training = minimising a loss function. Gradient descent computes the gradient (the direction of steepest increase) of the loss w.r.t. each weight, then steps the <em>opposite</em> way: <code>w ← w − η·∇L</code> <sup class="cite" data-cite="1">1</sup>. <b>Backpropagation</b> is just the chain rule computing those gradients efficiently across layers.</p>
      <p>The <b>learning rate η</b> is the single most important knob. Too small and training crawls; too large and the updates overshoot the minimum and can <b>diverge</b> <sup class="cite" data-cite="2">2</sup>. In practice we use mini-batch SGD (a few samples per step) plus adaptive optimisers like Adam and a learning-rate schedule <sup class="cite" data-cite="3">3</sup>.</p>`,
      rigorous:`<p>For parameters θ and loss L, the update is θ<sub>t+1</sub> = θ<sub>t</sub> − η∇L(θ<sub>t</sub>). On a quadratic with Hessian H, convergence requires η &lt; 2/λ<sub>max</sub>(H); above that the iteration is unstable and diverges <sup class="cite" data-cite="2">2</sup>. The condition number λ<sub>max</sub>/λ<sub>min</sub> sets how zig-zaggy the path is — anisotropic bowls are slow, which is why we normalise inputs <sup class="cite" data-cite="1">1</sup>.</p>
      <p>Mini-batch SGD replaces ∇L with a noisy unbiased estimate; the noise scales with η/batch-size and actually helps escape sharp minima. Momentum and Adam precondition the step to fix poor conditioning <sup class="cite" data-cite="3">3</sup>.</p>`
    },
    code:`# One step of (batch) gradient descent, by hand
import numpy as np

def train(X, y, eta=0.1, epochs=200):
    w = np.zeros(X.shape[1])
    for _ in range(epochs):
        y_hat = X @ w                       # forward pass
        grad  = X.T @ (y_hat - y) / len(y)  # ∂L/∂w  (MSE)
        w     = w - eta * grad              # step downhill
    return w

# eta too large  -> grad explodes, w oscillates / diverges
# eta too small  -> converges, but very slowly
# In real nets: backprop gives the gradients, Adam adapts eta`,
    math:[
      {eq:`<span class="v">&theta;</span><sub>t+1</sub> = <span class="v">&theta;</span><sub>t</sub> &minus; <span class="v">&eta;</span> &#8201; &nabla;<sub>&theta;</sub> L(&theta;<sub>t</sub>)`,
       note:'The update rule. η is the learning rate (step size); ∇L points uphill, so we step the opposite way to go down.'},
      {eq:`stable &hArr; <span class="v">&eta; &lt; 2 / &lambda;<sub>max</sub>(H)</span>`,
       note:'On a quadratic bowl with Hessian H, steps larger than this overshoot and diverge — exactly what you see when you crank η in the visual.'}
    ],
    sources:[
      {id:1, mod:'3.7', file:'lesson.md · §training', ts:'', snip:'We move each weight in the direction that reduces the loss — that is all gradient descent is.'},
      {id:2, mod:'3.7', file:'transcript', ts:'00:55:10', snip:'…if the learning rate is too high you overshoot and the loss blows up; too low and you wait forever.'},
      {id:3, mod:'3.7', file:'lesson.md · §optimizers', ts:'', snip:'Adam adapts the step size per parameter, which is why it often just works out of the box.'}
    ]
  }
};

const TOPIC_ORDER = ['overfit','reg','knn','grad'];

function routeQuery(text){
  const t = (text||'').toLowerCase();
  if(/overfit|decision tree|prune|bias.?varianc|max_depth/.test(t)) return 'overfit';
  if(/l1|l2|lasso|ridge|regular|sparsit|elastic|penalt/.test(t)) return 'reg';
  if(/knn|nearest neighbou?r|\bk\b|neighbou?r/.test(t)) return 'knn';
  if(/gradient|descent|learning rate|backprop|optimi|train.* net|loss surface|epoch/.test(t)) return 'grad';
  return null;
}

Object.assign(window, { TOPICS, TOPIC_ORDER, routeQuery });
