// Comprehensive learning roadmaps for AI/ML topics
export const ROADMAPS = {
  'langchain-fundamentals': {
    id: 'langchain-fundamentals',
    slug: 'langchain-fundamentals',
    name: 'LangChain Fundamentals',
    description: 'Master the basics of LangChain for building AI applications',
    difficulty: 'Beginner',
    estimatedTime: '2-3 weeks',
    tags: ['LangChain', 'LLM', 'Python', 'AI Applications'],
    stages: [
      {
        id: 'intro',
        title: 'Introduction to LangChain',
        description: 'Understand what LangChain is, its core concepts, and why it matters for AI development',
        estimatedTime: '3-4 hours',
        learningObjectives: [
          'Understand the LangChain ecosystem',
          'Learn about chains, prompts, and agents',
          'Set up your development environment'
        ],
        resources: [
          {
            type: 'docs',
            title: 'Official LangChain Documentation',
            url: 'https://python.langchain.com/docs/get_started/introduction',
            description: 'Complete getting started guide'
          },
          {
            type: 'video',
            title: 'LangChain Explained in 13 Minutes',
            url: 'https://www.youtube.com/watch?v=aywZrzNaKjs',
            description: 'Quick overview of core concepts'
          },
          {
            type: 'tutorial',
            title: 'LangChain Quickstart Guide',
            url: 'https://python.langchain.com/docs/get_started/quickstart',
            description: 'Hands-on tutorial for beginners'
          }
        ],
        prerequisites: ['Basic Python knowledge', 'Understanding of APIs']
      },
      {
        id: 'chains-prompts',
        title: 'Chains and Prompt Engineering',
        description: 'Learn to create effective prompts and chain multiple operations together',
        estimatedTime: '4-5 hours',
        learningObjectives: [
          'Master prompt template creation',
          'Build sequential chains',
          'Implement prompt engineering best practices'
        ],
        resources: [
          {
            type: 'docs',
            title: 'Prompt Templates Guide',
            url: 'https://python.langchain.com/docs/modules/model_io/prompts/',
            description: 'Complete guide to prompt engineering'
          },
          {
            type: 'tutorial',
            title: 'Building Your First Chain',
            url: 'https://python.langchain.com/docs/modules/chains/',
            description: 'Step-by-step chain building tutorial'
          },
          {
            type: 'example',
            title: 'LangChain Chain Examples',
            url: 'https://github.com/langchain-ai/langchain/tree/master/docs/docs/modules/chains',
            description: 'Real-world chain implementations'
          }
        ]
      },
      {
        id: 'memory-state',
        title: 'Memory and State Management',
        description: 'Add conversation memory and maintain state across interactions',
        estimatedTime: '3-4 hours',
        learningObjectives: [
          'Implement conversation memory',
          'Manage different memory types',
          'Build stateful applications'
        ],
        resources: [
          {
            type: 'docs',
            title: 'Memory Types in LangChain',
            url: 'https://python.langchain.com/docs/modules/memory/',
            description: 'Comprehensive memory management guide'
          },
          {
            type: 'tutorial',
            title: 'Conversation Memory Tutorial',
            url: 'https://python.langchain.com/docs/modules/memory/how_to/buffer',
            description: 'Practical memory implementation'
          }
        ]
      },
      {
        id: 'vector-stores',
        title: 'Vector Stores and Retrieval',
        description: 'Integrate vector databases for semantic search and retrieval',
        estimatedTime: '5-6 hours',
        learningObjectives: [
          'Set up vector databases',
          'Implement semantic search',
          'Build retrieval-augmented generation (RAG)'
        ],
        resources: [
          {
            type: 'docs',
            title: 'Vector Stores Documentation',
            url: 'https://python.langchain.com/docs/modules/data_connection/vectorstores/',
            description: 'Complete vector store integration guide'
          },
          {
            type: 'tutorial',
            title: 'Building a RAG Application',
            url: 'https://python.langchain.com/docs/use_cases/question_answering/',
            description: 'End-to-end RAG implementation'
          }
        ]
      },
      {
        id: 'agents',
        title: 'Agents and Tools',
        description: 'Create intelligent agents that can use tools and make decisions',
        estimatedTime: '4-5 hours',
        learningObjectives: [
          'Build LangChain agents',
          'Integrate external tools',
          'Implement decision-making logic'
        ],
        resources: [
          {
            type: 'docs',
            title: 'Agents Documentation',
            url: 'https://python.langchain.com/docs/modules/agents/',
            description: 'Complete agent development guide'
          },
          {
            type: 'example',
            title: 'Agent Tool Examples',
            url: 'https://python.langchain.com/docs/modules/agents/tools/',
            description: 'Ready-to-use tool integrations'
          }
        ]
      }
    ]
  },

  'rag-mastery': {
    id: 'rag-mastery',
    slug: 'rag-mastery',
    name: 'RAG Implementation Mastery',
    description: 'Build production-ready Retrieval-Augmented Generation systems',
    difficulty: 'Intermediate',
    estimatedTime: '3-4 weeks',
    tags: ['RAG', 'Vector Databases', 'Embeddings', 'Production'],
    stages: [
      {
        id: 'rag-fundamentals',
        title: 'RAG Fundamentals',
        description: 'Understand the core concepts and architecture of RAG systems',
        estimatedTime: '4-5 hours',
        learningObjectives: [
          'Understand RAG architecture',
          'Learn about embeddings and vector search',
          'Explore different RAG patterns'
        ],
        resources: [
          {
            type: 'paper',
            title: 'Original RAG Paper',
            url: 'https://arxiv.org/abs/2005.11401',
            description: 'The foundational research paper'
          },
          {
            type: 'article',
            title: 'RAG Explained Simply',
            url: 'https://www.pinecone.io/learn/retrieval-augmented-generation/',
            description: 'Beginner-friendly RAG explanation'
          }
        ]
      },
      {
        id: 'embeddings-vectordb',
        title: 'Embeddings and Vector Databases',
        description: 'Master text embeddings and vector database operations',
        estimatedTime: '5-6 hours',
        learningObjectives: [
          'Generate and work with embeddings',
          'Set up vector databases (Pinecone, Weaviate, Chroma)',
          'Implement similarity search'
        ],
        resources: [
          {
            type: 'tutorial',
            title: 'OpenAI Embeddings Guide',
            url: 'https://platform.openai.com/docs/guides/embeddings',
            description: 'Official embeddings documentation'
          },
          {
            type: 'tutorial',
            title: 'Pinecone Quickstart',
            url: 'https://docs.pinecone.io/docs/quickstart',
            description: 'Vector database setup and usage'
          }
        ]
      },
      {
        id: 'advanced-rag',
        title: 'Advanced RAG Techniques',
        description: 'Implement sophisticated RAG patterns and optimizations',
        estimatedTime: '6-7 hours',
        learningObjectives: [
          'Multi-query retrieval',
          'Re-ranking and filtering',
          'Hybrid search strategies'
        ],
        resources: [
          {
            type: 'article',
            title: 'Advanced RAG Techniques',
            url: 'https://blog.langchain.dev/semi-structured-multi-modal-rag/',
            description: 'Cutting-edge RAG implementations'
          }
        ]
      }
    ]
  },

  'ai-evaluation': {
    id: 'ai-evaluation',
    slug: 'ai-evaluation',
    name: 'AI Model Evaluation & Testing',
    description: 'Learn to properly evaluate and test AI systems in production',
    difficulty: 'Advanced',
    estimatedTime: '2-3 weeks',
    tags: ['Evaluation', 'Testing', 'Metrics', 'LLM Ops'],
    stages: [
      {
        id: 'eval-fundamentals',
        title: 'Evaluation Fundamentals',
        description: 'Understanding different types of AI evaluation and when to use them',
        estimatedTime: '3-4 hours',
        learningObjectives: [
          'Learn evaluation types and metrics',
          'Understand bias and fairness testing',
          'Design evaluation frameworks'
        ],
        resources: [
          {
            type: 'docs',
            title: 'LangChain Evaluation Guide',
            url: 'https://python.langchain.com/docs/guides/evaluation/',
            description: 'Comprehensive evaluation strategies'
          },
          {
            type: 'paper',
            title: 'Holistic Evaluation of Language Models',
            url: 'https://arxiv.org/abs/2211.09110',
            description: 'HELM evaluation framework paper'
          }
        ]
      },
      {
        id: 'automated-testing',
        title: 'Automated Testing Pipelines',
        description: 'Build automated testing and evaluation pipelines',
        estimatedTime: '5-6 hours',
        learningObjectives: [
          'Create test datasets',
          'Implement automated evaluation',
          'Set up CI/CD for AI models'
        ],
        resources: [
          {
            type: 'tutorial',
            title: 'LangSmith Evaluation',
            url: 'https://docs.smith.langchain.com/',
            description: 'Production evaluation platform'
          }
        ]
      }
    ]
  },

  'production-llmops': {
    id: 'production-llmops',
    slug: 'production-llmops',
    name: 'Production LLMOps',
    description: 'Deploy and operate LLM applications in production environments',
    difficulty: 'Advanced',
    estimatedTime: '4-5 weeks',
    tags: ['Production', 'DevOps', 'Monitoring', 'Scaling'],
    stages: [
      {
        id: 'deployment',
        title: 'LLM Deployment Strategies',
        description: 'Learn different approaches to deploying LLM applications',
        estimatedTime: '4-5 hours',
        learningObjectives: [
          'Compare deployment options',
          'Implement API wrappers',
          'Handle scaling and load balancing'
        ],
        resources: [
          {
            type: 'guide',
            title: 'LLM Deployment Best Practices',
            url: 'https://www.databricks.com/blog/llm-deployment-best-practices',
            description: 'Production deployment strategies'
          }
        ]
      },
      {
        id: 'monitoring',
        title: 'Monitoring and Observability',
        description: 'Monitor LLM applications in production',
        estimatedTime: '3-4 hours',
        learningObjectives: [
          'Set up logging and metrics',
          'Monitor model performance',
          'Implement alerting systems'
        ],
        resources: [
          {
            type: 'docs',
            title: 'LangSmith Monitoring',
            url: 'https://docs.smith.langchain.com/monitoring',
            description: 'Production monitoring tools'
          }
        ]
      }
    ]
  }
};

// Helper functions
export function getAllRoadmaps() {
  return Object.values(ROADMAPS);
}

export function getRoadmapById(id) {
  return ROADMAPS[id] || null;
}

export function getRoadmapsByDifficulty(difficulty) {
  return Object.values(ROADMAPS).filter(roadmap => roadmap.difficulty === difficulty);
}

export function getRoadmapsByTag(tag) {
  return Object.values(ROADMAPS).filter(roadmap => 
    roadmap.tags.some(t => t.toLowerCase().includes(tag.toLowerCase()))
  );
}

export function getDifficultyColor(difficulty) {
  switch (difficulty.toLowerCase()) {
    case 'beginner': return 'bg-green-50 text-green-700 border-green-200';
    case 'intermediate': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    case 'advanced': return 'bg-red-50 text-red-700 border-red-200';
    default: return 'bg-gray-50 text-gray-700 border-gray-200';
  }
}

export function getResourceIcon(type) {
  const icons = {
    'docs': '📚',
    'video': '🎥',
    'tutorial': '🛠️',
    'paper': '📄',
    'article': '📝',
    'example': '💡',
    'guide': '🗺️',
    'book': '📖'
  };
  return icons[type] || '🔗';
}