-- Additional Learning Roadmaps for LearningOS
-- Run this in your Supabase SQL Editor to add more roadmaps

INSERT INTO roadmaps (slug, name, description, icon, difficulty, estimated_hours, tags, stages) VALUES
(
  'prompt-engineering-mastery',
  'Advanced Prompt Engineering',
  'Master the art and science of prompting LLMs effectively',
  '✍️',
  'beginner',
  20,
  ARRAY['Prompt Engineering', 'LLM', 'AI Communication', 'Optimization'],
  '[
    {
      "id": "prompt-basics",
      "title": "Prompt Engineering Fundamentals",
      "description": "Learn the core principles of effective prompting",
      "estimatedTime": "3-4 hours",
      "learningObjectives": [
        "Understand prompt components and structure",
        "Learn about model behavior and limitations",
        "Master basic prompting techniques"
      ],
      "resources": [
        {
          "type": "docs",
          "title": "OpenAI Prompt Engineering Guide",
          "url": "https://platform.openai.com/docs/guides/prompt-engineering",
          "description": "Official best practices from OpenAI"
        },
        {
          "type": "article",
          "title": "Prompt Engineering Guide",
          "url": "https://www.promptingguide.ai/",
          "description": "Comprehensive prompting resource"
        }
      ],
      "practicePrompt": "Create 5 different prompts for the same task and compare their effectiveness"
    },
    {
      "id": "advanced-techniques",
      "title": "Advanced Prompting Techniques",
      "description": "Master chain-of-thought, few-shot, and other advanced methods",
      "estimatedTime": "4-5 hours",
      "learningObjectives": [
        "Implement chain-of-thought reasoning",
        "Use few-shot and zero-shot techniques",
        "Apply self-consistency methods"
      ],
      "resources": [
        {
          "type": "paper",
          "title": "Chain-of-Thought Prompting",
          "url": "https://arxiv.org/abs/2201.11903",
          "description": "The seminal paper on CoT reasoning"
        },
        {
          "type": "article",
          "title": "Few-Shot Learning Guide",
          "url": "https://www.promptingguide.ai/techniques/fewshot",
          "description": "Examples improve performance"
        }
      ],
      "practicePrompt": "Build a complex reasoning task using chain-of-thought prompting"
    },
    {
      "id": "prompt-optimization",
      "title": "Prompt Optimization & Testing",
      "description": "Systematically improve and evaluate your prompts",
      "estimatedTime": "4-5 hours",
      "learningObjectives": [
        "Set up prompt versioning and testing",
        "Implement A/B testing for prompts",
        "Use automated optimization techniques"
      ],
      "resources": [
        {
          "type": "code",
          "title": "Prompt Testing Framework",
          "url": "https://github.com/prompttools-ai/prompttools",
          "description": "Tools for systematic prompt evaluation"
        },
        {
          "type": "article",
          "title": "Prompt Optimization Strategies",
          "url": "https://lilianweng.github.io/posts/2023-03-15-prompt-engineering/",
          "description": "Research-backed optimization methods"
        }
      ],
      "practicePrompt": "Create an A/B testing framework for your prompts with success metrics"
    }
  ]'::jsonb
),
(
  'machine-learning-fundamentals',
  'Machine Learning Fundamentals',
  'Build a solid foundation in machine learning concepts and algorithms',
  '🤖',
  'beginner',
  45,
  ARRAY['Machine Learning', 'Python', 'Mathematics', 'Data Science'],
  '[
    {
      "id": "ml-introduction",
      "title": "Introduction to Machine Learning",
      "description": "Understand what ML is, types of learning, and key concepts",
      "estimatedTime": "4-5 hours",
      "learningObjectives": [
        "Understand supervised vs unsupervised learning",
        "Learn about bias-variance tradeoff",
        "Grasp overfitting and underfitting concepts"
      ],
      "resources": [
        {
          "type": "video",
          "title": "Andrew Ng ML Course",
          "url": "https://www.coursera.org/learn/machine-learning",
          "description": "Classic introduction to ML"
        },
        {
          "type": "docs",
          "title": "Scikit-learn User Guide",
          "url": "https://scikit-learn.org/stable/user_guide.html",
          "description": "Practical ML with Python"
        }
      ],
      "practicePrompt": "Implement a simple linear regression from scratch in Python"
    },
    {
      "id": "data-preprocessing",
      "title": "Data Preprocessing & Feature Engineering",
      "description": "Learn to clean and prepare data for machine learning",
      "estimatedTime": "6-7 hours",
      "learningObjectives": [
        "Handle missing data and outliers",
        "Perform feature scaling and normalization",
        "Create meaningful features from raw data"
      ],
      "resources": [
        {
          "type": "docs",
          "title": "Pandas Documentation",
          "url": "https://pandas.pydata.org/docs/",
          "description": "Data manipulation with pandas"
        },
        {
          "type": "article",
          "title": "Feature Engineering Guide",
          "url": "https://www.kaggle.com/learn/feature-engineering",
          "description": "Kaggle Learn feature engineering"
        }
      ],
      "practicePrompt": "Clean and engineer features for a real-world dataset from Kaggle"
    },
    {
      "id": "supervised-learning",
      "title": "Supervised Learning Algorithms",
      "description": "Master classification and regression algorithms",
      "estimatedTime": "8-10 hours",
      "learningObjectives": [
        "Implement decision trees and random forests",
        "Understand SVM and logistic regression",
        "Learn ensemble methods and boosting"
      ],
      "resources": [
        {
          "type": "article",
          "title": "Random Forests Explained",
          "url": "https://towardsdatascience.com/understanding-random-forest-58381e0602d2",
          "description": "Deep dive into random forests"
        },
        {
          "type": "code",
          "title": "ML Algorithms from Scratch",
          "url": "https://github.com/eriklindernoren/ML-From-Scratch",
          "description": "Implement algorithms from scratch"
        }
      ],
      "practicePrompt": "Build a classification model comparing 3 different algorithms"
    },
    {
      "id": "model-evaluation",
      "title": "Model Evaluation & Validation",
      "description": "Learn to properly evaluate and validate ML models",
      "estimatedTime": "5-6 hours",
      "learningObjectives": [
        "Understand cross-validation techniques",
        "Use appropriate metrics for different problems",
        "Implement proper train/validation/test splits"
      ],
      "resources": [
        {
          "type": "article",
          "title": "Model Evaluation Metrics",
          "url": "https://scikit-learn.org/stable/modules/model_evaluation.html",
          "description": "Comprehensive metrics guide"
        },
        {
          "type": "video",
          "title": "Cross-Validation Explained",
          "url": "https://www.youtube.com/watch?v=fSytzGwwBVw",
          "description": "Visual explanation of CV"
        }
      ],
      "practicePrompt": "Evaluate a model using 5 different metrics and cross-validation"
    }
  ]'::jsonb
),
(
  'deep-learning-pytorch',
  'Deep Learning with PyTorch',
  'Learn neural networks and deep learning using PyTorch framework',
  '🧠',
  'intermediate',
  60,
  ARRAY['Deep Learning', 'PyTorch', 'Neural Networks', 'Computer Vision'],
  '[
    {
      "id": "pytorch-basics",
      "title": "PyTorch Fundamentals",
      "description": "Learn PyTorch tensors, autograd, and basic operations",
      "estimatedTime": "6-8 hours",
      "learningObjectives": [
        "Understand PyTorch tensors and operations",
        "Learn automatic differentiation with autograd",
        "Build your first neural network"
      ],
      "resources": [
        {
          "type": "docs",
          "title": "PyTorch Official Tutorial",
          "url": "https://pytorch.org/tutorials/beginner/basics/intro.html",
          "description": "Official PyTorch getting started guide"
        },
        {
          "type": "video",
          "title": "PyTorch for Deep Learning",
          "url": "https://www.youtube.com/watch?v=Z_ikDlimN6A",
          "description": "Comprehensive PyTorch course"
        }
      ],
      "practicePrompt": "Build a simple feedforward network to classify MNIST digits"
    },
    {
      "id": "cnn-computer-vision",
      "title": "Convolutional Neural Networks",
      "description": "Master CNNs for computer vision tasks",
      "estimatedTime": "8-10 hours",
      "learningObjectives": [
        "Understand convolution and pooling operations",
        "Build CNN architectures from scratch",
        "Implement transfer learning"
      ],
      "resources": [
        {
          "type": "article",
          "title": "CNN Explainer",
          "url": "https://poloclub.github.io/cnn-explainer/",
          "description": "Interactive CNN visualization"
        },
        {
          "type": "docs",
          "title": "PyTorch Vision Tutorial",
          "url": "https://pytorch.org/tutorials/beginner/blitz/cifar10_tutorial.html",
          "description": "CNN tutorial with CIFAR-10"
        }
      ],
      "practicePrompt": "Build a CNN to classify images and achieve >90% accuracy on CIFAR-10"
    },
    {
      "id": "rnn-nlp",
      "title": "Recurrent Neural Networks & NLP",
      "description": "Learn RNNs, LSTMs, and natural language processing",
      "estimatedTime": "8-10 hours",
      "learningObjectives": [
        "Understand RNN and LSTM architectures",
        "Implement text classification and generation",
        "Learn attention mechanisms"
      ],
      "resources": [
        {
          "type": "article",
          "title": "Understanding LSTMs",
          "url": "https://colah.github.io/posts/2015-08-Understanding-LSTMs/",
          "description": "Visual guide to LSTM networks"
        },
        {
          "type": "docs",
          "title": "PyTorch NLP Tutorial",
          "url": "https://pytorch.org/tutorials/intermediate/char_rnn_classification_tutorial.html",
          "description": "Character-level RNN tutorial"
        }
      ],
      "practicePrompt": "Build a text generator using LSTM that can write in a specific style"
    },
    {
      "id": "advanced-architectures",
      "title": "Advanced Architectures & Deployment",
      "description": "Learn transformers, GANs, and model deployment",
      "estimatedTime": "10-12 hours",
      "learningObjectives": [
        "Understand transformer architecture",
        "Implement basic GAN models",
        "Deploy models for production use"
      ],
      "resources": [
        {
          "type": "article",
          "title": "Attention Is All You Need",
          "url": "https://arxiv.org/abs/1706.03762",
          "description": "The transformer paper"
        },
        {
          "type": "docs",
          "title": "PyTorch Model Deployment",
          "url": "https://pytorch.org/tutorials/intermediate/flask_rest_api_tutorial.html",
          "description": "Deploy models with Flask"
        }
      ],
      "practicePrompt": "Build and deploy a transformer model for text classification"
    }
  ]'::jsonb
),
(
  'data-science-pipeline',
  'End-to-End Data Science',
  'Master the complete data science workflow from data to deployment',
  '📊',
  'intermediate',
  50,
  ARRAY['Data Science', 'Python', 'Statistics', 'Visualization', 'MLOps'],
  '[
    {
      "id": "data-collection",
      "title": "Data Collection & APIs",
      "description": "Learn to gather data from various sources including APIs and web scraping",
      "estimatedTime": "5-6 hours",
      "learningObjectives": [
        "Use REST APIs to collect data",
        "Implement web scraping ethically",
        "Work with databases and SQL"
      ],
      "resources": [
        {
          "type": "article",
          "title": "Web Scraping with Python",
          "url": "https://realpython.com/beautiful-soup-web-scraper-python/",
          "description": "Beautiful Soup tutorial"
        },
        {
          "type": "docs",
          "title": "Requests Documentation",
          "url": "https://docs.python-requests.org/",
          "description": "Python HTTP library"
        }
      ],
      "practicePrompt": "Build a data pipeline that collects data from 3 different sources"
    },
    {
      "id": "exploratory-analysis",
      "title": "Exploratory Data Analysis",
      "description": "Master data exploration and visualization techniques",
      "estimatedTime": "6-8 hours",
      "learningObjectives": [
        "Perform statistical analysis of datasets",
        "Create meaningful visualizations",
        "Identify patterns and anomalies"
      ],
      "resources": [
        {
          "type": "docs",
          "title": "Matplotlib Gallery",
          "url": "https://matplotlib.org/stable/gallery/index.html",
          "description": "Visualization examples"
        },
        {
          "type": "article",
          "title": "EDA Best Practices",
          "url": "https://towardsdatascience.com/exploratory-data-analysis-8fc1cb20fd15",
          "description": "Comprehensive EDA guide"
        }
      ],
      "practicePrompt": "Perform complete EDA on a business dataset and present insights"
    },
    {
      "id": "statistical-modeling",
      "title": "Statistical Modeling & Hypothesis Testing",
      "description": "Apply statistical methods to validate findings and build models",
      "estimatedTime": "7-8 hours",
      "learningObjectives": [
        "Conduct hypothesis testing",
        "Perform regression analysis",
        "Understand statistical significance"
      ],
      "resources": [
        {
          "type": "article",
          "title": "Statistics for Data Science",
          "url": "https://towardsdatascience.com/statistics-for-data-science-part-1-c1585b27eda4",
          "description": "Statistical concepts explained"
        },
        {
          "type": "docs",
          "title": "SciPy Stats Tutorial",
          "url": "https://docs.scipy.org/doc/scipy/tutorial/stats.html",
          "description": "Statistical functions in Python"
        }
      ],
      "practicePrompt": "Design and conduct an A/B test to validate a business hypothesis"
    },
    {
      "id": "model-deployment",
      "title": "Model Deployment & Monitoring",
      "description": "Deploy models to production and monitor their performance",
      "estimatedTime": "8-10 hours",
      "learningObjectives": [
        "Deploy models using Flask/FastAPI",
        "Implement model monitoring",
        "Set up automated retraining"
      ],
      "resources": [
        {
          "type": "article",
          "title": "MLOps Best Practices",
          "url": "https://ml-ops.org/",
          "description": "Production ML practices"
        },
        {
          "type": "docs",
          "title": "FastAPI Documentation",
          "url": "https://fastapi.tiangolo.com/",
          "description": "Modern API framework"
        }
      ],
      "practicePrompt": "Deploy a complete ML pipeline with monitoring and automated updates"
    }
  ]'::jsonb
),
(
  'computer-vision-opencv',
  'Computer Vision with OpenCV',
  'Master computer vision techniques using OpenCV and Python',
  '👁️',
  'intermediate',
  40,
  ARRAY['Computer Vision', 'OpenCV', 'Image Processing', 'Python'],
  '[
    {
      "id": "opencv-fundamentals",
      "title": "OpenCV Basics & Image Processing",
      "description": "Learn fundamental image operations and transformations",
      "estimatedTime": "5-6 hours",
      "learningObjectives": [
        "Load, display, and save images",
        "Perform basic image transformations",
        "Apply filters and morphological operations"
      ],
      "resources": [
        {
          "type": "docs",
          "title": "OpenCV Python Tutorial",
          "url": "https://docs.opencv.org/4.x/d6/d00/tutorial_py_root.html",
          "description": "Official OpenCV Python guide"
        },
        {
          "type": "video",
          "title": "OpenCV Course for Beginners",
          "url": "https://www.youtube.com/watch?v=oXlwWbU8l2o",
          "description": "Comprehensive OpenCV tutorial"
        }
      ],
      "practicePrompt": "Build an image enhancement tool with multiple filters and effects"
    },
    {
      "id": "feature-detection",
      "title": "Feature Detection & Matching",
      "description": "Learn to detect and match features in images",
      "estimatedTime": "6-7 hours",
      "learningObjectives": [
        "Detect corners and edges",
        "Extract and match keypoints",
        "Implement object tracking"
      ],
      "resources": [
        {
          "type": "article",
          "title": "Feature Detection Explained",
          "url": "https://docs.opencv.org/4.x/df/d54/tutorial_py_features_meaning.html",
          "description": "Understanding image features"
        },
        {
          "type": "code",
          "title": "OpenCV Feature Detection",
          "url": "https://github.com/opencv/opencv/tree/master/samples/python",
          "description": "Official OpenCV examples"
        }
      ],
      "practicePrompt": "Create a panorama stitching application using feature matching"
    },
    {
      "id": "object-detection",
      "title": "Object Detection & Recognition",
      "description": "Implement object detection using classical and deep learning methods",
      "estimatedTime": "8-10 hours",
      "learningObjectives": [
        "Use cascade classifiers for detection",
        "Implement template matching",
        "Apply deep learning models for detection"
      ],
      "resources": [
        {
          "type": "article",
          "title": "YOLO Object Detection",
          "url": "https://pjreddie.com/darknet/yolo/",
          "description": "Real-time object detection"
        },
        {
          "type": "docs",
          "title": "OpenCV DNN Module",
          "url": "https://docs.opencv.org/4.x/d2/d58/tutorial_table_of_content_dnn.html",
          "description": "Deep neural networks in OpenCV"
        }
      ],
      "practicePrompt": "Build a real-time object detection system using your webcam"
    }
  ]'::jsonb
),
(
  'nlp-transformers',
  'Natural Language Processing with Transformers',
  'Master modern NLP using transformer models and Hugging Face',
  '🗣️',
  'advanced',
  55,
  ARRAY['NLP', 'Transformers', 'BERT', 'Hugging Face', 'Language Models'],
  '[
    {
      "id": "nlp-preprocessing",
      "title": "Text Preprocessing & Tokenization",
      "description": "Learn modern text preprocessing techniques",
      "estimatedTime": "4-5 hours",
      "learningObjectives": [
        "Understand tokenization strategies",
        "Learn about subword tokenization",
        "Handle multilingual text processing"
      ],
      "resources": [
        {
          "type": "docs",
          "title": "Hugging Face Tokenizers",
          "url": "https://huggingface.co/docs/tokenizers/",
          "description": "Fast tokenization library"
        },
        {
          "type": "article",
          "title": "Tokenization Explained",
          "url": "https://blog.floydhub.com/tokenization-nlp/",
          "description": "Deep dive into tokenization"
        }
      ],
      "practicePrompt": "Build a custom tokenizer for a specific domain or language"
    },
    {
      "id": "transformer-architecture",
      "title": "Understanding Transformer Architecture",
      "description": "Deep dive into the transformer model architecture",
      "estimatedTime": "6-8 hours",
      "learningObjectives": [
        "Understand self-attention mechanism",
        "Learn about positional encoding",
        "Grasp encoder-decoder architecture"
      ],
      "resources": [
        {
          "type": "article",
          "title": "The Illustrated Transformer",
          "url": "https://jalammar.github.io/illustrated-transformer/",
          "description": "Visual guide to transformers"
        },
        {
          "type": "paper",
          "title": "Attention Is All You Need",
          "url": "https://arxiv.org/abs/1706.03762",
          "description": "Original transformer paper"
        }
      ],
      "practicePrompt": "Implement a simplified transformer from scratch in PyTorch"
    },
    {
      "id": "pretrained-models",
      "title": "Working with Pre-trained Models",
      "description": "Learn to use and fine-tune pre-trained transformer models",
      "estimatedTime": "7-8 hours",
      "learningObjectives": [
        "Use BERT, GPT, and T5 models",
        "Fine-tune models for specific tasks",
        "Implement transfer learning strategies"
      ],
      "resources": [
        {
          "type": "docs",
          "title": "Hugging Face Transformers",
          "url": "https://huggingface.co/docs/transformers/",
          "description": "Comprehensive transformers library"
        },
        {
          "type": "article",
          "title": "Fine-tuning BERT",
          "url": "https://mccormickml.com/2019/07/22/BERT-fine-tuning/",
          "description": "Step-by-step BERT fine-tuning"
        }
      ],
      "practicePrompt": "Fine-tune a BERT model for sentiment analysis on custom data"
    },
    {
      "id": "advanced-nlp-tasks",
      "title": "Advanced NLP Applications",
      "description": "Build complex NLP systems for real-world applications",
      "estimatedTime": "10-12 hours",
      "learningObjectives": [
        "Implement question-answering systems",
        "Build text summarization models",
        "Create conversational AI systems"
      ],
      "resources": [
        {
          "type": "article",
          "title": "Building QA Systems",
          "url": "https://huggingface.co/transformers/task_summary.html#question-answering",
          "description": "Question answering with transformers"
        },
        {
          "type": "code",
          "title": "NLP Project Examples",
          "url": "https://github.com/huggingface/transformers/tree/master/examples",
          "description": "Real-world NLP applications"
        }
      ],
      "practicePrompt": "Build a complete QA system that can answer questions about documents"
    }
  ]'::jsonb
);