-- LearningOS Database Schema for Roadmap Progress Tracking
-- Run this in your Supabase SQL editor

-- Drop existing tables if they exist
DROP TABLE IF EXISTS user_progress CASCADE;
DROP TABLE IF EXISTS roadmap_progress CASCADE;
DROP TABLE IF EXISTS roadmaps CASCADE;

-- Enhanced roadmaps table
CREATE TABLE roadmaps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT DEFAULT '🎯',
  difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')) DEFAULT 'beginner',
  estimated_hours INTEGER DEFAULT 20,
  tags TEXT[] DEFAULT '{}',
  stages JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stage-level progress tracking
CREATE TABLE user_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  roadmap_id UUID REFERENCES roadmaps(id) ON DELETE CASCADE,
  stage_index INTEGER NOT NULL,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  time_spent_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, roadmap_id, stage_index)
);

-- Overall roadmap progress summary
CREATE TABLE roadmap_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  roadmap_id UUID REFERENCES roadmaps(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  completed_stages INTEGER DEFAULT 0,
  total_stages INTEGER NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, roadmap_id)
);

-- Create indexes for performance
CREATE INDEX idx_user_progress_lookup ON user_progress(user_id, roadmap_id);
CREATE INDEX idx_roadmap_progress_lookup ON roadmap_progress(user_id, roadmap_id);

-- Function to update roadmap progress when stage is completed
CREATE OR REPLACE FUNCTION update_roadmap_progress()
RETURNS TRIGGER AS $$
DECLARE
  total_count INTEGER;
  completed_count INTEGER;
BEGIN
  -- Count total and completed stages
  SELECT COUNT(*), COUNT(*) FILTER (WHERE completed = true)
  INTO total_count, completed_count
  FROM user_progress
  WHERE user_id = NEW.user_id AND roadmap_id = NEW.roadmap_id;
  
  -- Update or insert roadmap progress
  INSERT INTO roadmap_progress (
    user_id, 
    roadmap_id, 
    completed_stages, 
    total_stages,
    last_activity,
    is_completed,
    completed_at
  )
  VALUES (
    NEW.user_id,
    NEW.roadmap_id,
    completed_count,
    total_count,
    NOW(),
    completed_count = total_count,
    CASE WHEN completed_count = total_count THEN NOW() ELSE NULL END
  )
  ON CONFLICT (user_id, roadmap_id)
  DO UPDATE SET
    completed_stages = completed_count,
    total_stages = total_count,
    last_activity = NOW(),
    is_completed = completed_count = total_count,
    completed_at = CASE WHEN completed_count = total_count THEN NOW() ELSE NULL END;
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_roadmap_progress_trigger
AFTER INSERT OR UPDATE ON user_progress
FOR EACH ROW
EXECUTE FUNCTION update_roadmap_progress();

-- Function to get roadmap with progress
CREATE OR REPLACE FUNCTION get_roadmap_with_progress(
  p_user_id TEXT,
  p_roadmap_id UUID
)
RETURNS TABLE (
  roadmap JSON,
  progress JSON
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    row_to_json(r.*) as roadmap,
    COALESCE(
      json_build_object(
        'started_at', rp.started_at,
        'last_activity', rp.last_activity,
        'completed_stages', rp.completed_stages,
        'total_stages', rp.total_stages,
        'is_completed', rp.is_completed,
        'percentage', ROUND((rp.completed_stages::numeric / NULLIF(rp.total_stages, 0)) * 100),
        'stage_progress', COALESCE(
          json_agg(
            json_build_object(
              'stage_index', up.stage_index,
              'completed', up.completed,
              'completed_at', up.completed_at,
              'notes', up.notes
            ) ORDER BY up.stage_index
          ) FILTER (WHERE up.stage_index IS NOT NULL),
          '[]'::json
        )
      ),
      json_build_object(
        'started_at', NULL,
        'completed_stages', 0,
        'total_stages', jsonb_array_length(r.stages),
        'is_completed', false,
        'percentage', 0,
        'stage_progress', '[]'::json
      )
    ) as progress
  FROM roadmaps r
  LEFT JOIN roadmap_progress rp ON rp.roadmap_id = r.id AND rp.user_id = p_user_id
  LEFT JOIN user_progress up ON up.roadmap_id = r.id AND up.user_id = p_user_id
  WHERE r.id = p_roadmap_id
  GROUP BY r.id, r.slug, r.name, r.description, r.icon, r.difficulty, r.estimated_hours, r.stages, r.created_at,
           rp.started_at, rp.last_activity, rp.completed_stages, rp.total_stages, rp.is_completed;
END;
$$ LANGUAGE plpgsql;

-- Insert comprehensive roadmap data
INSERT INTO roadmaps (slug, name, description, icon, difficulty, estimated_hours, tags, stages) VALUES
(
  'langchain-fundamentals',
  'LangChain Fundamentals',
  'Master the basics of LangChain for building AI applications',
  '🔗',
  'beginner',
  25,
  ARRAY['LangChain', 'LLM', 'Python', 'AI Applications'],
  '[
    {
      "id": "intro",
      "title": "Introduction to LangChain",
      "description": "Understand what LangChain is, its core concepts, and why it matters for AI development",
      "estimatedTime": "3-4 hours",
      "learningObjectives": [
        "Understand the LangChain ecosystem",
        "Learn about chains, prompts, and agents",
        "Set up your development environment"
      ],
      "resources": [
        {
          "type": "docs",
          "title": "Official LangChain Documentation",
          "url": "https://python.langchain.com/docs/get_started/introduction",
          "description": "Complete getting started guide"
        },
        {
          "type": "video",
          "title": "LangChain in 13 Minutes",
          "url": "https://www.youtube.com/watch?v=aywZrzNaKjs",
          "description": "Quick overview of key concepts"
        }
      ],
      "practicePrompt": "Set up a Python environment and create your first simple LangChain application"
    },
    {
      "id": "setup",
      "title": "Environment Setup",
      "description": "Set up Python environment and install LangChain dependencies",
      "estimatedTime": "2-3 hours",
      "learningObjectives": [
        "Install Python and virtual environment",
        "Install LangChain and dependencies",
        "Configure API keys securely"
      ],
      "resources": [
        {
          "type": "docs",
          "title": "Installation Guide",
          "url": "https://python.langchain.com/docs/get_started/installation",
          "description": "Step-by-step installation"
        }
      ],
      "practicePrompt": "Create a virtual environment and test your LangChain installation"
    },
    {
      "id": "basic-chains",
      "title": "Basic Chains",
      "description": "Learn to create and use basic LangChain chains",
      "estimatedTime": "4-5 hours",
      "learningObjectives": [
        "Understand chain concepts",
        "Create simple chains",
        "Chain multiple operations together"
      ],
      "resources": [
        {
          "type": "docs",
          "title": "Chains Guide",
          "url": "https://python.langchain.com/docs/modules/chains/",
          "description": "Comprehensive chains documentation"
        }
      ],
      "practicePrompt": "Build a chain that processes user input through multiple steps"
    },
    {
      "id": "prompt-templates",
      "title": "Prompt Templates",
      "description": "Master prompt engineering with LangChain templates",
      "estimatedTime": "3-4 hours",
      "learningObjectives": [
        "Create dynamic prompt templates",
        "Use few-shot prompting",
        "Handle different input types"
      ],
      "resources": [
        {
          "type": "docs",
          "title": "Prompt Templates",
          "url": "https://python.langchain.com/docs/modules/model_io/prompts/",
          "description": "Template creation guide"
        }
      ],
      "practicePrompt": "Create a template that adapts based on user preferences"
    }
  ]'::jsonb
),
(
  'rag-mastery',
  'RAG & Vector Database Mastery',
  'Build production-ready retrieval-augmented generation systems',
  '🔍',
  'intermediate',
  35,
  ARRAY['RAG', 'Vector Database', 'Embeddings', 'Retrieval'],
  '[
    {
      "id": "rag-intro",
      "title": "RAG Fundamentals",
      "description": "Understand the core concepts of retrieval-augmented generation",
      "estimatedTime": "3-4 hours",
      "learningObjectives": [
        "Understand why RAG is needed",
        "Learn the RAG pipeline components",
        "Identify use cases for RAG"
      ],
      "resources": [
        {
          "type": "article",
          "title": "What is RAG?",
          "url": "https://www.pinecone.io/learn/retrieval-augmented-generation/",
          "description": "Comprehensive RAG introduction"
        }
      ],
      "practicePrompt": "Implement a basic RAG system using a small document set"
    },
    {
      "id": "embeddings",
      "title": "Embeddings Deep Dive",
      "description": "Master embedding models, fine-tuning, and optimization",
      "estimatedTime": "5-6 hours",
      "learningObjectives": [
        "Understand embedding model architectures",
        "Choose the right model for your use case",
        "Implement embedding caching"
      ],
      "resources": [
        {
          "type": "article",
          "title": "Choosing Embedding Models",
          "url": "https://www.sbert.net/docs/pretrained_models.html",
          "description": "Compare different embedding models"
        }
      ],
      "practicePrompt": "Compare 3 different embedding models on your domain data"
    },
    {
      "id": "vector-databases",
      "title": "Vector Databases",
      "description": "Master vector storage, indexing, and retrieval at scale",
      "estimatedTime": "6-7 hours",
      "learningObjectives": [
        "Set up a vector database",
        "Understand indexing strategies",
        "Implement metadata filtering"
      ],
      "resources": [
        {
          "type": "docs",
          "title": "Pinecone Guide",
          "url": "https://docs.pinecone.io/",
          "description": "Production vector database"
        }
      ],
      "practicePrompt": "Implement the same RAG system in 2 different vector databases"
    }
  ]'::jsonb
),
(
  'ai-evaluation',
  'AI Evaluation & Testing',
  'Learn to systematically evaluate and improve AI systems',
  '📊',
  'advanced',
  30,
  ARRAY['Evaluation', 'Testing', 'Metrics', 'AI Safety'],
  '[
    {
      "id": "eval-fundamentals",
      "title": "Evaluation Fundamentals",
      "description": "Understand the importance and basics of AI evaluation",
      "estimatedTime": "3-4 hours",
      "learningObjectives": [
        "Understand evaluation importance",
        "Learn different evaluation types",
        "Identify evaluation challenges"
      ],
      "resources": [
        {
          "type": "article",
          "title": "AI Evaluation Guide",
          "url": "https://www.example.com/ai-evaluation",
          "description": "Comprehensive evaluation introduction"
        }
      ],
      "practicePrompt": "Design an evaluation framework for a simple AI task"
    },
    {
      "id": "metrics",
      "title": "Evaluation Metrics",
      "description": "Master different metrics for measuring AI performance",
      "estimatedTime": "4-5 hours",
      "learningObjectives": [
        "Understand accuracy vs precision vs recall",
        "Learn domain-specific metrics",
        "Choose appropriate metrics"
      ],
      "resources": [
        {
          "type": "docs",
          "title": "ML Metrics Guide",
          "url": "https://scikit-learn.org/stable/modules/model_evaluation.html",
          "description": "Comprehensive metrics documentation"
        }
      ],
      "practicePrompt": "Implement 5 different evaluation metrics for an NLP task"
    }
  ]'::jsonb
),
(
  'llmops',
  'LLMOps & Production',
  'Deploy and maintain LLM applications in production',
  '🚀',
  'advanced',
  40,
  ARRAY['LLMOps', 'Production', 'Deployment', 'Monitoring'],
  '[
    {
      "id": "production-fundamentals",
      "title": "Production Fundamentals",
      "description": "Understand the challenges of running LLMs in production",
      "estimatedTime": "4-5 hours",
      "learningObjectives": [
        "Understand production challenges",
        "Learn about latency and cost optimization",
        "Plan for scalability"
      ],
      "resources": [
        {
          "type": "article",
          "title": "LLMs in Production",
          "url": "https://www.anyscale.com/blog/llm-applications-in-production",
          "description": "Production best practices"
        }
      ],
      "practicePrompt": "Design a production architecture for an LLM application"
    },
    {
      "id": "monitoring",
      "title": "Monitoring & Observability",
      "description": "Monitor LLM applications and track performance",
      "estimatedTime": "5-6 hours",
      "learningObjectives": [
        "Set up monitoring dashboards",
        "Track key metrics",
        "Implement alerting"
      ],
      "resources": [
        {
          "type": "docs",
          "title": "LangSmith Tracing",
          "url": "https://docs.smith.langchain.com/",
          "description": "Monitor and debug your chains"
        }
      ],
      "practicePrompt": "Set up monitoring for an LLM application with custom metrics"
    }
  ]'::jsonb
);