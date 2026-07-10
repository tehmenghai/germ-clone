G
germ//clonePASS 0.82
◷ agent trace
Learning Rate in Gradient Descent
INTUITION

Gradient descent is an optimization algorithm used to minimize the loss function of a neural network. The learning rate controls how quickly we move towards the optimal weights.

KEY EQUATION
x
next
	​

=x
curr
	​

−α
dx
df
	​

x
curr
	​


— current parameter value

α

— learning rate

dx
df
	​


— derivative of the loss function with respect to the parameters

TERM-BY-TERM EXPLANATION

The key equation in gradient descent is:

x
next
	​

=x
curr
	​

−α
dx
df
	​


This equation updates the current parameter value (`

x
curr
	​


) by subtracting a multiple of its derivative with respect to itself (

dx
df
	​


`). The learning rate (

α

) controls how much we move in this direction. A small

α

means we take smaller steps, while a large

α

means we take bigger steps.

CONSEQUENCE

If the learning rate is too large, the algorithm may overshoot and diverge from the optimal solution. On the other hand, if it's too small, the algorithm may not make progress at all.

A common choice for the learning rate is a hyperparameter that can be tuned using techniques such as grid search or Bayesian optimization.

WORKED EXAMPLE

Suppose we have a neural network with two weights:

W
1
	​


and

W
2
	​


. We want to minimize the loss function

L(W
1
	​

,W
2
	​

)=(W
1
	​

⋅X+W
2
	​

)
T
(Y)

, where X and Y are input and output vectors, respectively.

To find the optimal weights, we use gradient descent:

Compute the derivative of the loss function with respect to
W
1
	​


and

W
2
	​


:

dW
1
	​

dL
	​

=X
T
(Y)

and

dW
2
	​

dL
	​

=(X+Y)
T
Choose a small learning rate
α

, say 0.01.

Update the weights:
W
1
	​

←W
1
	​

−α
dW
1
	​

dL
	​


and

W
2
	​

←W
2
	​

−α
dW
2
	​

dL
	​


By repeating this process, we can find the optimal values of

W
1
	​


and $W_2` that minimize the loss function.

`python import numpy as np

# Define the loss function and its derivative def L(W, X, Y): return (np.dot(W, X) + W[1]) @ Y

def dL_dW(W, X, Y): return X @ Y

# Set up the learning rate and initial weights alpha = 0.01 W_init = np.array([0.5, 0.2])

# Train the model for a few iterations for i in range(1000): W_curr = W_init + alpha * dL_dW(W_init, X, Y) print("Iteration", i+1, "Weights:", W_curr)

`

Note that this is just a simple example to illustrate the concept of learning rate in gradient descent. In practice, you would need to consider more complex scenarios, such as regularization and batch normalization.

REFERENCES

[1] Gradient Descent [2] Normalization [3] Loss Functions

＋ notebook
⌥ 3 sources
switch difficulty in header ↑
[1]
mod 3.7 · 3.7 - Neural Network and Deep Learning_annotated_Recording.transcript.vtt
02:01:33

“Would it work if W3 is very good, but W1 and W2 are bad? It won't work. It's just like a basketball team. You have LeBron James, but everyone else is not good. It won't work. Only one shooter, and the”

[2]
mod 3.8 · 3.8 - Computer Vision_Recording.transcript.vtt
02:23:02

“Another important concept is normalization. It's a common practice to normalize data before feeding it into neural networks. This can be done as a preprocessing step using standard scaling (standardiz”

[3]
mod 3.7 · 3.7 - Neural Network and Deep Learning_annotated_Recording.transcript.vtt
01:35:25

“We've talked about gradient descent, how a neural network looks, and how to make it nonlinear. Now, we're moving towards finding the optimal weights, W. To find the best W, we need a way to measure 'b”