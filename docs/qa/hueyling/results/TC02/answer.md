G
germ//clonePASS 0.8
◷ agent trace
OVERFITTING IN NEURAL NETWORKS

Overfitting occurs when a neural network learns the training data too well, resulting in poor performance on unseen data.

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
next
	​


— next parameter value (output of the update rule)

x
curr
	​


— current parameter value (input of the update rule)

α

— learning rate

dx
df
	​


— derivative of the loss function with respect to the parameter

The update rule is used to update the parameters of a neural network during training. The next parameter value (

x
next
	​


) is calculated by subtracting the product of the learning rate (

α

) and the derivative of the loss function (

dx
df
	​


) from the current parameter value (

x
curr
	​


).

TERM-BY-TERM EXPLANATION
x
next
	​


: The next parameter value is calculated by subtracting the product of the learning rate and the derivative of the loss function from the current parameter value. This ensures that the parameters are updated in a way that minimizes the loss function.

α

: The learning rate determines how quickly the parameters are updated. A higher learning rate can lead to faster convergence but also increases the risk of overshooting the optimal solution.

dx
df
	​


: The derivative of the loss function with respect to the parameter measures the sensitivity of the loss function to changes in the parameter. This value is used to update the parameters during training.

WORKED CONSEQUENCE

Consider a neural network that is trained on a dataset with a complex non-linear relationship between the input and output variables. If the learning rate is too high, the network may overfit the training data and fail to generalize well to new data. In this case, the update rule can be adjusted by reducing the learning rate or adding regularization techniques such as dropout or L2 regularization.

EXAMPLE

Suppose we have a neural network that is trained on a dataset of images with a complex non-linear relationship between the pixel values and the class labels. We want to adjust the learning rate to prevent overfitting. If we start with a high learning rate, the network may overfit the training data and fail to generalize well to new data.

| |

x
curr
	​


|

α

|

dx
df
	​


| |---|----------------------|----------|-----------------| | 1 | Initial parameter value | High | Derivative of loss function | | 2 | Updated parameter value | Low | Revised derivative |

In this example, we start with a high learning rate and calculate the updated parameter value using the update rule. We then reduce the learning rate to low and recalculate the updated parameter value using the revised derivative.

By adjusting the learning rate and adding regularization techniques, we can prevent overfitting and improve the generalization of the neural network on new data.

REFERENCES

[1] Deep Learning by Ian Goodfellow, Yoshua Bengio, Aaron Courville [2] Pattern Recognition and Machine Learning by Christopher Bishop [3] Neural Networks and Deep Learning by Christopher Bishop [4] Machine Learning: A Probabilistic Perspective by Kevin P. Murphy [5] Deep Learning with Python by François Chollet

＋ notebook
⌥ 5 sources
switch difficulty in header ↑
[1]
mod 3.8 · 3.8 - Computer Vision_Recording.transcript.vtt
02:07:04

“**Q:** Why is it difficult for us to understand what a model "sees" or learns internally? **A:** There are, of course, methods to go and reverse engineer and try to guess what they're saying. Keyword”

[2]
mod 3.8 · 3.8 - Computer Vision_Recording.transcript.vtt
01:49:40

“The hidden layer, just like what I mentioned, you can put very big. But if you put very big, it's learning very complex expressions, with a high tendency to overfit. Your hidden unit typically is the ”

[3]
mod 3.7 · 3.7 - Neural Network and Deep Learning_annotated_Recording.transcript.vtt
00:55:08

“**Q:** Is my feature selected correctly, or is something wrong with my model? **A:** I believe I mentioned that R-square is not a reliable metric. What is the way to validate? You have been taught how”

[4]
mod 3.8 · 3.8 - Computer Vision_Recording.transcript.vtt
02:29:19

“**Q:** I think you probably don't turn it on, so… Of course, during training, you don't turn it on, it's to prevent overfitting. Then, if you turn it on during production, wouldn't it be overfitting a”

[5]
mod 3.7 · 3.7 - Neural Network and Deep Learning_annotated_Recording.transcript.vtt
02:08:00

“In practice, the decision is complex because you need to decide how many hidden layers and how many nodes within those layers. The bigger the node count, the more complex and prone to overfitting it m”