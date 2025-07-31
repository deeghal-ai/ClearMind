# Day 3: Roadmap Tab Implementation - Complete Step-by-Step Guide

## Morning Setup (30 minutes)

### Step 1: Verify Day 2 Completion
```bash
# Start your dev server
npm run dev

# Verify feeds are working
# Check Supabase has feed data
# Ensure no console errors
```

### Step 2: Enhance Roadmap Schema
Run this in your Supabase SQL editor:
```sql
-- Drop existing progress table to recreate with better structure
DROP TABLE IF EXISTS progress CASCADE;

-- Enhanced roadmaps table with better structure
ALTER TABLE roadmaps 
ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT '🎯',
ADD COLUMN IF NOT EXISTS difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')) DEFAULT 'beginner',
ADD COLUMN IF NOT EXISTS estimated_hours INTEGER DEFAULT 20;

-- Better progress tracking with stage-level detail
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

-- Clear existing data
TRUNCATE roadmaps CASCADE;

-- Insert comprehensive roadmap data
INSERT INTO roadmaps (slug, name, description, icon, difficulty, estimated_hours, stages) VALUES
(
  'langchain-mastery',
  'LangChain Mastery',
  'Master LangChain from basics to advanced agent orchestration',
  '🔗',
  'intermediate',
  40,
  '[
    {
      "title": "LangChain Fundamentals",
      "description": "Understand core concepts, chains, and prompt templates",
      "estimatedMinutes": 180,
      "resources": [
        {"type": "docs", "title": "Official Getting Started", "url": "https://python.langchain.com/docs/get_started/introduction", "description": "Official introduction to LangChain"},
        {"type": "video", "title": "LangChain Explained in 13 Minutes", "url": "https://www.youtube.com/watch?v=aywZrzNaKjs", "description": "Quick overview of key concepts"},
        {"type": "article", "title": "Building Your First Chain", "url": "https://blog.langchain.dev/getting-started-with-langchain/", "description": "Step-by-step first chain tutorial"}
      ],
      "practicePrompt": "Build a simple chain that takes a topic and generates a haiku about it",
      "checkpoints": [
        "Understand what LangChain is and why it exists",
        "Set up your development environment",
        "Create your first simple chain",
        "Work with prompt templates"
      ]
    },
    {
      "title": "Working with LLMs and Chat Models",
      "description": "Master different model types, parameters, and streaming",
      "estimatedMinutes": 240,
      "resources": [
        {"type": "docs", "title": "LLMs vs Chat Models", "url": "https://python.langchain.com/docs/modules/model_io/models/", "description": "Understanding model types"},
        {"type": "code", "title": "Model Parameters Guide", "url": "https://github.com/langchain-ai/langchain/tree/master/docs/docs/modules/model_io", "description": "Temperature, tokens, and more"},
        {"type": "video", "title": "Streaming Responses", "url": "https://www.youtube.com/watch?v=streaming_example", "description": "Implement streaming for better UX"}
      ],
      "practicePrompt": "Create a chatbot that can maintain conversation context and stream responses",
      "checkpoints": [
        "Understand the difference between LLMs and Chat Models",
        "Configure model parameters effectively",
        "Implement streaming responses",
        "Handle errors and rate limits gracefully"
      ]
    },
    {
      "title": "Memory and State Management",
      "description": "Add conversation memory and manage state in your applications",
      "estimatedMinutes": 300,
      "resources": [
        {"type": "docs", "title": "Memory Types", "url": "https://python.langchain.com/docs/modules/memory/", "description": "ConversationBufferMemory and more"},
        {"type": "article", "title": "Persistent Memory with Redis", "url": "https://blog.example.com/langchain-redis", "description": "Scale memory beyond local storage"},
        {"type": "code", "title": "Custom Memory Implementation", "url": "https://github.com/langchain-ai/langchain/tree/master/libs/langchain/langchain/memory", "description": "Build your own memory class"}
      ],
      "practicePrompt": "Build a customer service bot that remembers previous interactions across sessions",
      "checkpoints": [
        "Implement ConversationBufferMemory",
        "Use ConversationSummaryMemory for long conversations",
        "Create persistent memory with a database",
        "Build custom memory for specific use cases"
      ]
    },
    {
      "title": "Document Loaders and Text Splitters",
      "description": "Load and process documents for RAG applications",
      "estimatedMinutes": 240,
      "resources": [
        {"type": "docs", "title": "Document Loaders", "url": "https://python.langchain.com/docs/modules/data_connection/document_loaders/", "description": "Load PDFs, websites, and more"},
        {"type": "video", "title": "Optimal Text Splitting", "url": "https://www.youtube.com/watch?v=text_splitting", "description": "Chunk size and overlap strategies"},
        {"type": "article", "title": "Preprocessing Best Practices", "url": "https://www.pinecone.io/learn/preprocessing-for-rag/", "description": "Clean data for better retrieval"}
      ],
      "practicePrompt": "Create a system that can ingest a PDF and answer questions about its content",
      "checkpoints": [
        "Load documents from multiple sources",
        "Understand different text splitting strategies",
        "Handle various document formats",
        "Optimize chunk size for your use case"
      ]
    },
    {
      "title": "Embeddings and Vector Stores",
      "description": "Transform text to vectors and implement semantic search",
      "estimatedMinutes": 360,
      "resources": [
        {"type": "docs", "title": "Embeddings Guide", "url": "https://python.langchain.com/docs/modules/data_connection/text_embedding/", "description": "Understanding text embeddings"},
        {"type": "video", "title": "Choosing Vector Databases", "url": "https://www.youtube.com/watch?v=vector_db_comparison", "description": "Pinecone vs Weaviate vs Chroma"},
        {"type": "code", "title": "Hybrid Search Implementation", "url": "https://github.com/langchain-ai/langchain/blob/master/docs/docs/use_cases/question_answering/how_to/hybrid.ipynb", "description": "Combine semantic and keyword search"}
      ],
      "practicePrompt": "Build a semantic search engine for your personal notes or documentation",
      "checkpoints": [
        "Generate embeddings with OpenAI or HuggingFace",
        "Store vectors in a vector database",
        "Implement similarity search",
        "Optimize retrieval with metadata filtering"
      ]
    },
    {
      "title": "Building RAG Applications",
      "description": "Combine retrieval with generation for powerful Q&A systems",
      "estimatedMinutes": 480,
      "resources": [
        {"type": "docs", "title": "RAG Tutorial", "url": "https://python.langchain.com/docs/use_cases/question_answering/", "description": "End-to-end RAG implementation"},
        {"type": "article", "title": "Advanced RAG Techniques", "url": "https://www.anyscale.com/blog/a-comprehensive-guide-for-building-rag-based-llm-applications-part-1", "description": "Re-ranking, HyDE, and more"},
        {"type": "video", "title": "Production RAG Systems", "url": "https://www.youtube.com/watch?v=production_rag", "description": "Scale and optimize RAG"}
      ],
      "practicePrompt": "Create a RAG system for your company documentation that includes source citations",
      "checkpoints": [
        "Build a basic RAG pipeline",
        "Implement source citations",
        "Add re-ranking for better results",
        "Handle out-of-context questions gracefully"
      ]
    },
    {
      "title": "Agents and Tools",
      "description": "Create autonomous agents that can use tools to solve complex tasks",
      "estimatedMinutes": 600,
      "resources": [
        {"type": "docs", "title": "Agents Overview", "url": "https://python.langchain.com/docs/modules/agents/", "description": "Understanding LangChain agents"},
        {"type": "code", "title": "Custom Tools", "url": "https://python.langchain.com/docs/modules/agents/tools/custom_tools", "description": "Build your own agent tools"},
        {"type": "video", "title": "ReAct Pattern Deep Dive", "url": "https://www.youtube.com/watch?v=react_pattern", "description": "How agents think and act"}
      ],
      "practicePrompt": "Build an agent that can search the web, do calculations, and write code to solve problems",
      "checkpoints": [
        "Create an agent with built-in tools",
        "Build custom tools for your agent",
        "Implement different agent types (ReAct, Plan-and-Execute)",
        "Add error handling and retry logic"
      ]
    },
    {
      "title": "Production Deployment",
      "description": "Deploy LangChain applications with monitoring and optimization",
      "estimatedMinutes": 480,
      "resources": [
        {"type": "article", "title": "LangChain in Production", "url": "https://www.anyscale.com/blog/llm-chains-in-production", "description": "Best practices and pitfalls"},
        {"type": "docs", "title": "LangSmith Tracing", "url": "https://docs.smith.langchain.com/", "description": "Monitor and debug your chains"},
        {"type": "video", "title": "Cost Optimization", "url": "https://www.youtube.com/watch?v=cost_optimization", "description": "Reduce API costs by 90%"}
      ],
      "practicePrompt": "Deploy your RAG application with proper error handling, monitoring, and cost tracking",
      "checkpoints": [
        "Set up proper error handling and fallbacks",
        "Implement request caching",
        "Add monitoring and observability",
        "Optimize for cost and latency"
      ]
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
  '[
    {
      "title": "RAG Fundamentals",
      "description": "Understand the core concepts of retrieval-augmented generation",
      "estimatedMinutes": 180,
      "resources": [
        {"type": "article", "title": "What is RAG?", "url": "https://www.pinecone.io/learn/retrieval-augmented-generation/", "description": "Comprehensive RAG introduction"},
        {"type": "paper", "title": "Original RAG Paper", "url": "https://arxiv.org/abs/2005.11401", "description": "The research that started it all"},
        {"type": "video", "title": "RAG Explained Simply", "url": "https://www.youtube.com/watch?v=rag_explained", "description": "Visual explanation of RAG"}
      ],
      "practicePrompt": "Implement a basic RAG system using a small document set",
      "checkpoints": [
        "Understand why RAG is needed",
        "Learn the RAG pipeline components",
        "Identify use cases for RAG",
        "Understand RAG limitations"
      ]
    },
    {
      "title": "Text Processing for RAG",
      "description": "Master document processing, chunking strategies, and preprocessing",
      "estimatedMinutes": 240,
      "resources": [
        {"type": "article", "title": "Chunking Strategies", "url": "https://www.pinecone.io/learn/chunking-strategies/", "description": "How to split text effectively"},
        {"type": "code", "title": "Advanced Text Processing", "url": "https://github.com/example/text-processing", "description": "Clean and structure your data"},
        {"type": "docs", "title": "Document Loaders Deep Dive", "url": "https://python.langchain.com/docs/modules/data_connection/document_loaders/", "description": "Handle any document type"}
      ],
      "practicePrompt": "Process a complex PDF with tables and images for RAG",
      "checkpoints": [
        "Choose optimal chunk sizes",
        "Handle document metadata",
        "Process tables and structured data",
        "Clean and normalize text"
      ]
    },
    {
      "title": "Embeddings Deep Dive",
      "description": "Master embedding models, fine-tuning, and optimization",
      "estimatedMinutes": 300,
      "resources": [
        {"type": "article", "title": "Choosing Embedding Models", "url": "https://www.sbert.net/docs/pretrained_models.html", "description": "Compare different embedding models"},
        {"type": "video", "title": "Fine-tuning Embeddings", "url": "https://www.youtube.com/watch?v=embedding_finetuning", "description": "Improve domain-specific performance"},
        {"type": "code", "title": "Embedding Optimization", "url": "https://github.com/example/embedding-optimization", "description": "Reduce dimensions, improve speed"}
      ],
      "practicePrompt": "Compare 3 different embedding models on your domain data",
      "checkpoints": [
        "Understand embedding model architectures",
        "Choose the right model for your use case",
        "Implement embedding caching",
        "Fine-tune embeddings for your domain"
      ]
    },
    {
      "title": "Vector Databases",
      "description": "Master vector storage, indexing, and retrieval at scale",
      "estimatedMinutes": 360,
      "resources": [
        {"type": "docs", "title": "Pinecone Guide", "url": "https://docs.pinecone.io/", "description": "Production vector database"},
        {"type": "docs", "title": "Weaviate Tutorial", "url": "https://weaviate.io/developers/weaviate", "description": "Open-source alternative"},
        {"type": "article", "title": "Vector DB Comparison", "url": "https://thenewstack.io/compare-vector-databases/", "description": "Choose the right database"}
      ],
      "practicePrompt": "Implement the same RAG system in 2 different vector databases",
      "checkpoints": [
        "Set up a vector database",
        "Understand indexing strategies",
        "Implement metadata filtering",
        "Optimize query performance"
      ]
    },
    {
      "title": "Advanced Retrieval Techniques",
      "description": "Implement hybrid search, re-ranking, and query expansion",
      "estimatedMinutes": 420,
      "resources": [
        {"type": "article", "title": "Hybrid Search", "url": "https://www.pinecone.io/learn/hybrid-search/", "description": "Combine semantic and keyword search"},
        {"type": "paper", "title": "ColBERT Re-ranking", "url": "https://arxiv.org/abs/2004.12832", "description": "Neural re-ranking for better results"},
        {"type": "code", "title": "Query Expansion", "url": "https://github.com/example/query-expansion", "description": "Improve recall with query rewriting"}
      ],
      "practicePrompt": "Implement hybrid search with re-ranking for your RAG system",
      "checkpoints": [
        "Implement BM25 + semantic search",
        "Add a re-ranking layer",
        "Build query expansion",
        "Optimize retrieval metrics"
      ]
    },
    {
      "title": "RAG Evaluation",
      "description": "Measure and improve your RAG system performance",
      "estimatedMinutes": 360,
      "resources": [
        {"type": "article", "title": "RAG Evaluation Framework", "url": "https://www.anyscale.com/blog/evaluating-rag-pipelines", "description": "Metrics and methodologies"},
        {"type": "code", "title": "RAGAS Library", "url": "https://github.com/explodinggradients/ragas", "description": "Automated RAG evaluation"},
        {"type": "paper", "title": "Benchmarking RAG", "url": "https://arxiv.org/abs/2309.01431", "description": "Academic evaluation methods"}
      ],
      "practicePrompt": "Build an evaluation suite for your RAG system with 5+ metrics",
      "checkpoints": [
        "Implement retrieval metrics (MRR, NDCG)",
        "Measure generation quality",
        "Build end-to-end evaluation",
        "Create a benchmark dataset"
      ]
    }
  ]'::jsonb
),
(
  'prompt-engineering',
  'Advanced Prompt Engineering',
  'Master the art and science of prompting LLMs effectively',
  '✍️',
  'beginner',
  25,
  '[
    {
      "title": "Prompt Engineering Basics",
      "description": "Understand the fundamentals of effective prompting",
      "estimatedMinutes": 120,
      "resources": [
        {"type": "docs", "title": "OpenAI Prompt Guide", "url": "https://platform.openai.com/docs/guides/prompt-engineering", "description": "Official best practices"},
        {"type": "article", "title": "Prompt Engineering Guide", "url": "https://www.promptingguide.ai/", "description": "Comprehensive prompting resource"},
        {"type": "video", "title": "Prompting Fundamentals", "url": "https://www.youtube.com/watch?v=prompt_basics", "description": "Visual introduction to prompting"}
      ],
      "practicePrompt": "Transform a vague prompt into a detailed, effective one",
      "checkpoints": [
        "Understand prompt components",
        "Learn about model behavior",
        "Write clear instructions",
        "Use appropriate formatting"
      ]
    },
    {
      "title": "Advanced Prompting Techniques",
      "description": "Master few-shot, chain-of-thought, and other advanced techniques",
      "estimatedMinutes": 240,
      "resources": [
        {"type": "paper", "title": "Chain-of-Thought Paper", "url": "https://arxiv.org/abs/2201.11903", "description": "The technique that changed prompting"},
        {"type": "article", "title": "Few-Shot Learning", "url": "https://www.promptingguide.ai/techniques/fewshot", "description": "Examples improve performance"},
        {"type": "code", "title": "Prompting Patterns", "url": "https://github.com/dair-ai/Prompt-Engineering-Guide", "description": "Reusable prompt templates"}
      ],
      "practicePrompt": "Implement chain-of-thought prompting for a complex reasoning task",
      "checkpoints": [
        "Master zero-shot prompting",
        "Implement few-shot learning",
        "Use chain-of-thought reasoning",
        "Apply self-consistency"
      ]
    },
    {
      "title": "Prompt Optimization",
      "description": "Systematically improve and optimize your prompts",
      "estimatedMinutes": 300,
      "resources": [
        {"type": "article", "title": "Automatic Prompt Engineering", "url": "https://blog.example.com/automatic-prompt-optimization", "description": "Let AI improve your prompts"},
        {"type": "paper", "title": "DSPy Framework", "url": "https://arxiv.org/abs/2310.03714", "description": "Declarative prompt optimization"},
        {"type": "video", "title": "A/B Testing Prompts", "url": "https://www.youtube.com/watch?v=prompt_testing", "description": "Data-driven prompt improvement"}
      ],
      "practicePrompt": "Create a prompt optimization pipeline with automatic testing",
      "checkpoints": [
        "Set up prompt versioning",
        "Implement A/B testing",
        "Use automatic optimization",
        "Track performance metrics"
      ]
    }
  ]'::jsonb
);

-- Create a function to get roadmap with progress
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
```

## Build Core Roadmap Components (1.5 hours)

### Step 3: Create Progress Store
Create `src/lib/stores/roadmap.js`:
```javascript
import { writable, derived } from 'svelte/store';
import { supabase } from '$lib/supabase';

function createRoadmapStore() {
  const { subscribe, set, update } = writable({
    roadmaps: [],
    selectedRoadmap: null,
    progress: {},
    loading: false,
    error: null
  });

  return {
    subscribe,
    
    async loadRoadmaps() {
      update(s => ({ ...s, loading: true, error: null }));
      
      try {
        const { data, error } = await supabase
          .from('roadmaps')
          .select('*')
          .order('difficulty', { ascending: true });
        
        if (error) throw error;
        
        update(s => ({ 
          ...s, 
          roadmaps: data || [],
          selectedRoadmap: data?.[0] || null,
          loading: false 
        }));
        
        return data;
      } catch (error) {
        update(s => ({ ...s, error: error.message, loading: false }));
        return null;
      }
    },
    
    async loadProgress(userId, roadmapId) {
      try {
        const { data, error } = await supabase
          .rpc('get_roadmap_with_progress', {
            p_user_id: userId,
            p_roadmap_id: roadmapId
          });
        
        if (error) throw error;
        
        if (data?.[0]) {
          update(s => ({
            ...s,
            progress: {
              ...s.progress,
              [roadmapId]: data[0].progress
            }
          }));
        }
        
        return data?.[0]?.progress;
      } catch (error) {
        console.error('Error loading progress:', error);
        return null;
      }
    },
    
    async toggleStage(userId, roadmapId, stageIndex, completed) {
      try {
        const { error } = await supabase
          .from('user_progress')
          .upsert({
            user_id: userId,
            roadmap_id: roadmapId,
            stage_index: stageIndex,
            completed: completed,
            completed_at: completed ? new Date().toISOString() : null,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,roadmap_id,stage_index'
          });
        
        if (error) throw error;
        
        // Reload progress to get updated counts
        await this.loadProgress(userId, roadmapId);
        
        return true;
      } catch (error) {
        console.error('Error toggling stage:', error);
        return false;
      }
    },
    
    selectRoadmap(roadmap) {
      update(s => ({ ...s, selectedRoadmap: roadmap }));
    }
  };
}

export const roadmapStore = createRoadmapStore();

// Derived store for current progress
export const currentProgress = derived(
  roadmapStore,
  $store => {
    if (!$store.selectedRoadmap) return null;
    return $store.progress[$store.selectedRoadmap.id] || {
      completed_stages: 0,
      total_stages: $store.selectedRoadmap.stages?.length || 0,
      percentage: 0,
      stage_progress: []
    };
  }
);
```

### Step 4: Create Roadmap Card Component
Create `src/lib/components/RoadmapCard.svelte`:
```svelte
<script>
  import { createEventDispatcher } from 'svelte';
  
  export let roadmap;
  export let progress = null;
  export let active = false;
  
  const dispatch = createEventDispatcher();
  
  const difficultyColors = {
    beginner: 'green',
    intermediate: 'yellow',
    advanced: 'red'
  };
  
  const difficultyLabels = {
    beginner: 'Beginner Friendly',
    intermediate: 'Some Experience Required',
    advanced: 'Advanced Level'
  };
  
  $: progressPercentage = progress?.percentage || 0;
  $: isCompleted = progress?.is_completed || false;
</script>

<button
  on:click={() => dispatch('select', roadmap)}
  class="w-full text-left p-6 rounded-lg border-2 transition-all duration-200 hover:shadow-lg
         {active 
           ? 'border-blue-500 bg-blue-50 shadow-md' 
           : 'border-zen-gray-200 bg-white hover:border-zen-gray-300'}"
>
  <div class="flex items-start justify-between mb-3">
    <div class="flex items-center gap-3">
      <span class="text-3xl">{roadmap.icon}</span>
      <div>
        <h3 class="font-semibold text-lg {active ? 'text-blue-900' : 'text-zen-gray-800'}">
          {roadmap.name}
        </h3>
        <p class="text-sm text-zen-gray-600 mt-1">
          {roadmap.stages?.length || 0} stages • ~{roadmap.estimated_hours}h
        </p>
      </div>
    </div>
    
    {#if isCompleted}
      <span class="flex items-center gap-1 text-green-600 text-sm font-medium">
        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
        </svg>
        Completed
      </span>
    {/if}
  </div>
  
  <p class="text-sm text-zen-gray-600 mb-4 line-clamp-2">
    {roadmap.description}
  </p>
  
  <div class="space-y-3">
    <!-- Difficulty Badge -->
    <div class="flex items-center gap-2">
      <span class="text-xs font-medium px-2 py-1 rounded
                   {roadmap.difficulty === 'beginner' ? 'bg-green-100 text-green-700' :
                    roadmap.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'}">
        {difficultyLabels[roadmap.difficulty]}
      </span>
    </div>
    
    <!-- Progress Bar -->
    {#if progress && progress.completed_stages > 0}
      <div>
        <div class="flex justify-between text-xs text-zen-gray-600 mb-1">
          <span>Progress</span>
          <span>{progressPercentage}%</span>
        </div>
        <div class="w-full bg-zen-gray-200 rounded-full h-2 overflow-hidden">
          <div 
            class="h-full rounded-full transition-all duration-500 ease-out
                   {isCompleted ? 'bg-green-500' : 'bg-blue-500'}"
            style="width: {progressPercentage}%"
          />
        </div>
        <p class="text-xs text-zen-gray-500 mt-1">
          {progress.completed_stages} of {progress.total_stages} stages completed
        </p>
      </div>
    {:else if progress}
      <p class="text-xs text-zen-gray-500">
        Not started yet • Ready to begin your journey?
      </p>
    {/if}
  </div>
</button>

<style>
  .line-clamp-2 {
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }
</style>
```

### Step 5: Create Stage Component
Create `src/lib/components/RoadmapStage.svelte`:
```svelte
<script>
  import { createEventDispatcher } from 'svelte';
  import { slide } from 'svelte/transition';
  
  export let stage;
  export let index;
  export let completed = false;
  export let expanded = false;
  export let userId;
  
  const dispatch = createEventDispatcher();
  
  const resourceIcons = {
    docs: '📄',
    video: '🎥',
    article: '📰',
    code: '💻',
    paper: '📚'
  };
  
  function toggleComplete() {
    dispatch('toggle', { index, completed: !completed });
  }
  
  function getEstimatedTime(minutes) {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
</script>

<div class="border rounded-lg {completed ? 'bg-green-50 border-green-200' : 'bg-white border-zen-gray-200'}">
  <button
    on:click={() => expanded = !expanded}
    class="w-full p-4 text-left hover:bg-zen-gray-50 transition-colors rounded-lg"
  >
    <div class="flex items-start gap-4">
      <!-- Checkbox -->
      <label class="flex items-center mt-0.5" on:click|stopPropagation>
        <input
          type="checkbox"
          checked={completed}
          on:change={toggleComplete}
          class="w-5 h-5 text-blue-600 rounded border-zen-gray-300 focus:ring-blue-500"
        />
      </label>
      
      <!-- Content -->
      <div class="flex-1">
        <div class="flex items-start justify-between gap-4">
          <div class="flex-1">
            <h3 class="font-medium {completed ? 'text-green-800' : 'text-zen-gray-800'}">
              {index + 1}. {stage.title}
            </h3>
            <p class="text-sm text-zen-gray-600 mt-1">
              {stage.description}
            </p>
            {#if stage.estimatedMinutes}
              <p class="text-xs text-zen-gray-500 mt-2">
                ⏱️ Estimated time: {getEstimatedTime(stage.estimatedMinutes)}
              </p>
            {/if}
          </div>
          
          <!-- Expand Arrow -->
          <svg 
            class="w-5 h-5 text-zen-gray-400 transform transition-transform flex-shrink-0 mt-0.5
                   {expanded ? 'rotate-180' : ''}"
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </div>
  </button>
  
  {#if expanded}
    <div transition:slide class="px-4 pb-4 border-t border-zen-gray-100 mt-2">
      <!-- Checkpoints -->
      {#if stage.checkpoints?.length > 0}
        <div class="mt-4">
          <h4 class="font-medium text-sm text-zen-gray-700 mb-2">Learning Objectives:</h4>
          <ul class="space-y-1">
            {#each stage.checkpoints as checkpoint}
              <li class="flex items-start gap-2 text-sm text-zen-gray-600">
                <span class="text-blue-500 mt-0.5">•</span>
                <span>{checkpoint}</span>
              </li>
            {/each}
          </ul>
        </div>
      {/if}
      
      <!-- Resources -->
      {#if stage.resources?.length > 0}
        <div class="mt-4">
          <h4 class="font-medium text-sm text-zen-gray-700 mb-2">Resources:</h4>
          <div class="space-y-2">
            {#each stage.resources as resource}
              
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                class="flex items-start gap-3 p-3 rounded-lg bg-zen-gray-50 hover:bg-zen-gray-100 transition-colors group"
              >
                <span class="text-lg flex-shrink-0">
                  {resourceIcons[resource.type] || '🔗'}
                </span>
                <div class="flex-1 min-w-0">
                  <p class="font-medium text-sm text-blue-600 group-hover:underline">
                    {resource.title}
                  </p>
                  {#if resource.description}
                    <p class="text-xs text-zen-gray-600 mt-0.5">
                      {resource.description}
                    </p>
                  {/if}
                </div>
                <svg class="w-4 h-4 text-zen-gray-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            {/each}
          </div>
        </div>
      {/if}
      
      <!-- Practice Prompt -->
      {#if stage.practicePrompt}
        <div class="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <h4 class="font-medium text-sm text-blue-800 mb-1">💡 Practice Project:</h4>
          <p class="text-sm text-blue-700">{stage.practicePrompt}</p>
          <button 
            on:click={() => dispatch('askAI', { stage, prompt: stage.practicePrompt })}
            class="mt-2 text-xs font-medium text-blue-600 hover:text-blue-700 underline"
          >
            Get AI help with this →
          </button>
        </div>
      {/if}
    </div>
  {/if}
</div>
```

### Step 6: Create Progress Summary Component
Create `src/lib/components/RoadmapProgress.svelte`:
```svelte
<script>
  import { tweened } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';
  
  export let progress;
  export let roadmapName;
  
  const percentageTween = tweened(0, {
    duration: 1000,
    easing: cubicOut
  });
  
  $: percentageTween.set(progress?.percentage || 0);
  $: daysActive = progress?.started_at 
    ? Math.floor((Date.now() - new Date(progress.started_at).getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  
  function getMotivationalMessage(percentage) {
    if (percentage === 0) return "Ready to start your journey? 🚀";
    if (percentage < 25) return "Great start! Keep the momentum going! 💪";
    if (percentage < 50) return "You're making solid progress! 🎯";
    if (percentage < 75) return "Over halfway there! You've got this! 🔥";
    if (percentage < 100) return "Almost there! The finish line is in sight! 🏁";
    return "Congratulations! You've mastered this roadmap! 🎉";
  }
</script>

<div class="card-zen bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
  <div class="flex items-center justify-between mb-4">
    <h2 class="text-lg font-semibold text-zen-gray-800">Your Progress</h2>
    {#if progress?.started_at}
      <span class="text-sm text-zen-gray-600">
        {daysActive} day{daysActive !== 1 ? 's' : ''} on this journey
      </span>
    {/if}
  </div>
  
  <!-- Big Progress Circle -->
  <div class="flex items-center justify-center my-8">
    <div class="relative w-32 h-32">
      <svg class="w-32 h-32 transform -rotate-90">
        <!-- Background circle -->
        <circle
          cx="64"
          cy="64"
          r="56"
          stroke-width="12"
          stroke="#e5e5e5"
          fill="none"
        />
        <!-- Progress circle -->
        <circle
          cx="64"
          cy="64"
          r="56"
          stroke-width="12"
          stroke="url(#gradient)"
          fill="none"
          stroke-linecap="round"
          stroke-dasharray={351.86}
          stroke-dashoffset={351.86 - (351.86 * $percentageTween / 100)}
          class="transition-all duration-1000 ease-out"
        />
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#3b82f6" />
            <stop offset="100%" style="stop-color:#8b5cf6" />
          </linearGradient>
        </defs>
      </svg>
      <div class="absolute inset-0 flex items-center justify-center">
        <div class="text-center">
          <span class="text-3xl font-bold text-zen-gray-800">
            {Math.round($percentageTween)}%
          </span>
          <p class="text-xs text-zen-gray-600">Complete</p>
        </div>
      </div>
    </div>
  </div>
  
  <!-- Stats -->
  <div class="grid grid-cols-2 gap-4 mb-4">
    <div class="text-center p-3 bg-white/50 rounded-lg">
      <p class="text-2xl font-semibold text-blue-600">
        {progress?.completed_stages || 0}
      </p>
      <p class="text-xs text-zen-gray-600">Stages Completed</p>
    </div>
    <div class="text-center p-3 bg-white/50 rounded-lg">
      <p class="text-2xl font-semibold text-purple-600">
        {progress?.total_stages || 0}
      </p>
      <p class="text-xs text-zen-gray-600">Total Stages</p>
    </div>
  </div>
  
  <!-- Motivational Message -->
  <p class="text-center text-sm font-medium text-zen-gray-700">
    {getMotivationalMessage($percentageTween)}
  </p>
  
  {#if progress?.last_activity}
    <p class="text-center text-xs text-zen-gray-500 mt-2">
      Last activity: {new Date(progress.last_activity).toLocaleDateString()}
    </p>
  {/if}
</div>
```

## Build the Main Roadmap Page (2 hours)

### Step 7: Create the Complete Roadmap Page
Replace `src/routes/roadmap/+page.svelte`:
```svelte
<script>
  import { onMount } from 'svelte';
  import { roadmapStore, currentProgress } from '$lib/stores/roadmap';
  import { user } from '$lib/stores/user';
  import RoadmapCard from '$lib/components/RoadmapCard.svelte';
  import RoadmapStage from '$lib/components/RoadmapStage.svelte';
  import RoadmapProgress from '$lib/components/RoadmapProgress.svelte';
  import { goto } from '$app/navigation';
  
  let userId = '';
  let selectedView = 'overview'; // 'overview' or 'detailed'
  let expandedStages = new Set();
  let searchQuery = '';
  
  onMount(async () => {
    // Initialize user
    user.init();
    const unsubscribe = user.subscribe(u => {
      userId = u.id;
    });
    
    // Load roadmaps
    await roadmapStore.loadRoadmaps();
    
    // Load progress for first roadmap
    const unsub = roadmapStore.subscribe(async (state) => {
      if (state.selectedRoadmap && userId) {
        await roadmapStore.loadProgress(userId, state.selectedRoadmap.id);
      }
    });
    
    return () => {
      unsubscribe();
      unsub();
    };
  });
  
  async function selectRoadmap(roadmap) {
    roadmapStore.selectRoadmap(roadmap);
    if (userId) {
      await roadmapStore.loadProgress(userId, roadmap.id);
    }
    selectedView = 'detailed';
  }
  
  async function toggleStage(event) {
    const { index, completed } = event.detail;
    if (!$roadmapStore.selectedRoadmap || !userId) return;
    
    await roadmapStore.toggleStage(
      userId,
      $roadmapStore.selectedRoadmap.id,
      index,
      completed
    );
  }
  
  function expandAll() {
    if ($roadmapStore.selectedRoadmap) {
      $roadmapStore.selectedRoadmap.stages.forEach((_, i) => {
        expandedStages.add(i);
      });
      expandedStages = expandedStages;
    }
  }
  
  function collapseAll() {
    expandedStages.clear();
    expandedStages = expandedStages;
  }
  
  function askAI(event) {
    const { stage, prompt } = event.detail;
    // Store context for AI chat
    const context = {
      type: 'roadmap',
      roadmap: $roadmapStore.selectedRoadmap.name,
      stage: stage.title,
      prompt: prompt
    };
    
    localStorage.setItem('learningos_ai_context', JSON.stringify(context));
    goto('/chat');
  }
  
  function isStageCompleted(stageIndex) {
    const stageProgress = $currentProgress?.stage_progress || [];
    return stageProgress.find(sp => sp.stage_index === stageIndex)?.completed || false;
  }
  
  // Filter stages based on search
  $: filteredStages = $roadmapStore.selectedRoadmap?.stages.filter(stage => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      stage.title.toLowerCase().includes(query) ||
      stage.description.toLowerCase().includes(query) ||
      stage.resources?.some(r => r.title.toLowerCase().includes(query))
    );
  }) || [];
</script>

<div class="max-w-6xl mx-auto">
  {#if $roadmapStore.loading}
    <!-- Loading State -->
    <div class="space-y-4">
      <div class="h-8 w-48 bg-zen-gray-200 rounded animate-pulse"></div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {#each Array(3) as _}
          <div class="h-48 bg-zen-gray-200 rounded-lg animate-pulse"></div>
        {/each}
      </div>
    </div>
  {:else if $roadmapStore.error}
    <!-- Error State -->
    <div class="card-zen bg-red-50 border-red-200">
      <p class="text-red-600">Error: {$roadmapStore.error}</p>
    </div>
  {:else if selectedView === 'overview'}
    <!-- Roadmap Selection View -->
    <div class="space-y-6">
      <div>
        <h1 class="text-2xl font-semibold">Choose Your Learning Path</h1>
        <p class="text-zen-gray-600 mt-1">
          Select a roadmap to start your structured learning journey
        </p>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {#each $roadmapStore.roadmaps as roadmap}
          <RoadmapCard 
            {roadmap}
            progress={$roadmapStore.progress[roadmap.id]}
            active={$roadmapStore.selectedRoadmap?.id === roadmap.id}
            on:select={(e) => selectRoadmap(e.detail)}
          />
        {/each}
      </div>
    </div>
  {:else if $roadmapStore.selectedRoadmap}
    <!-- Detailed Roadmap View -->
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div class="flex items-center gap-3">
          <button
            on:click={() => selectedView = 'overview'}
            class="p-2 hover:bg-zen-gray-100 rounded-lg transition-colors"
            title="Back to roadmaps"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 class="text-2xl font-semibold flex items-center gap-2">
              <span>{$roadmapStore.selectedRoadmap.icon}</span>
              {$roadmapStore.selectedRoadmap.name}
            </h1>
            <p class="text-zen-gray-600 text-sm">
              {$roadmapStore.selectedRoadmap.description}
            </p>
          </div>
        </div>
        
        <div class="flex items-center gap-2">
          <button
            on:click={expandAll}
            class="text-sm text-zen-gray-600 hover:text-zen-gray-800"
          >
            Expand All
          </button>
          <span class="text-zen-gray-400">|</span>
          <button
            on:click={collapseAll}
            class="text-sm text-zen-gray-600 hover:text-zen-gray-800"
          >
            Collapse All
          </button>
        </div>
      </div>
      
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Main Content -->
        <div class="lg:col-span-2 space-y-6">
          <!-- Search -->
          <div class="relative">
            <input
              bind:value={searchQuery}
              type="text"
              placeholder="Search stages, resources..."
              class="w-full pl-10 pr-4 py-2 border border-zen-gray-300 rounded-lg"
            />
            <svg 
              class="absolute left-3 top-2.5 w-5 h-5 text-zen-gray-400" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          
          <!-- Stages -->
          <div class="space-y-3">
            {#each filteredStages as stage, index}
              {@const originalIndex = $roadmapStore.selectedRoadmap.stages.indexOf(stage)}
              <RoadmapStage
                {stage}
                index={originalIndex}
                completed={isStageCompleted(originalIndex)}
                expanded={expandedStages.has(originalIndex)}
                {userId}
                on:toggle={toggleStage}
                on:askAI={askAI}
              />
            {/each}
            
            {#if filteredStages.length === 0}
              <div class="text-center py-8 text-zen-gray-500">
                No stages match your search
              </div>
            {/if}
          </div>
        </div>
        
        <!-- Sidebar -->
        <div class="space-y-6">
          <!-- Progress Summary -->
          <RoadmapProgress 
            progress={$currentProgress}
            roadmapName={$roadmapStore.selectedRoadmap.name}
          />
          
          <!-- Quick Actions -->
          <div class="card-zen">
            <h3 class="font-semibold mb-3">Quick Actions</h3>
            <div class="space-y-2">
              <button
                on:click={() => {
                  const context = {
                    type: 'roadmap',
                    roadmap: $roadmapStore.selectedRoadmap.name,
                    completedStages: $currentProgress?.completed_stages || 0,
                    currentStage: $roadmapStore.selectedRoadmap.stages[$currentProgress?.completed_stages || 0]?.title
                  };
                  localStorage.setItem('learningos_ai_context', JSON.stringify(context));
                  goto('/chat');
                }}
                class="w-full text-left p-3 rounded-lg hover:bg-zen-gray-50 transition-colors flex items-center gap-3"
              >
                <span class="text-lg">💬</span>
                <div>
                  <p class="font-medium text-sm">Ask AI for Help</p>
                  <p class="text-xs text-zen-gray-600">Get guidance on current stage</p>
                </div>
              </button>
              
              <button
                on:click={() => {
                  const notes = `# ${$roadmapStore.selectedRoadmap.name} Progress\n\n` +
                    `Completed: ${$currentProgress?.completed_stages || 0}/${$currentProgress?.total_stages || 0} stages\n\n` +
                    $roadmapStore.selectedRoadmap.stages.map((stage, i) => 
                      `${isStageCompleted(i) ? '✅' : '⬜'} ${stage.title}`
                    ).join('\n');
                  
                  navigator.clipboard.writeText(notes);
                  alert('Progress copied to clipboard!');
                }}
                class="w-full text-left p-3 rounded-lg hover:bg-zen-gray-50 transition-colors flex items-center gap-3"
              >
                <span class="text-lg">📋</span>
                <div>
                  <p class="font-medium text-sm">Export Progress</p>
                  <p class="text-xs text-zen-gray-600">Copy as markdown</p>
                </div>
              </button>
            </div>
          </div>
          
          <!-- Learning Tips -->
          <div class="card-zen bg-blue-50 border-blue-200">
            <h3 class="font-semibold text-blue-900 mb-2">💡 Learning Tips</h3>
            <ul class="space-y-2 text-sm text-blue-800">
              <li class="flex items-start gap-2">
                <span class="text-blue-500 mt-0.5">•</span>
                <span>Focus on understanding, not just completing stages</span>
              </li>
              <li class="flex items-start gap-2">
                <span class="text-blue-500 mt-0.5">•</span>
                <span>Build projects with each new concept you learn</span>
              </li>
              <li class="flex items-start gap-2">
                <span class="text-blue-500 mt-0.5">•</span>
                <span>Take notes and review them regularly</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>
```

## Add Gamification Elements (1 hour)

### Step 8: Create Achievement System
Create `src/lib/components/Achievements.svelte`:
```svelte
<script>
  export let progress;
  export let allRoadmapsProgress;
  
  const achievements = [
    {
      id: 'first_stage',
      name: 'First Steps',
      description: 'Complete your first stage',
      icon: '🎯',
      check: (p) => p.some(rp => rp.completed_stages >= 1)
    },
    {
      id: 'halfway',
      name: 'Halfway There',
      description: 'Reach 50% on any roadmap',
      icon: '🏃',
      check: (p) => p.some(rp => rp.percentage >= 50)
    },
    {
      id: 'completionist',
      name: 'Completionist',
      description: 'Complete an entire roadmap',
      icon: '🏆',
      check: (p) => p.some(rp => rp.is_completed)
    },
    {
      id: 'polymath',
      name: 'Polymath',
      description: 'Start 3 different roadmaps',
      icon: '🧠',
      check: (p) => p.filter(rp => rp.completed_stages > 0).length >= 3
    },
    {
      id: 'dedicated',
      name: 'Dedicated Learner',
      description: 'Complete 10 stages total',
      icon: '⭐',
      check: (p) => p.reduce((sum, rp) => sum + rp.completed_stages, 0) >= 10
    }
  ];
  
  $: unlockedAchievements = achievements.filter(a => 
    a.check(Object.values(allRoadmapsProgress || {}))
  );
  
  $: lockedAchievements = achievements.filter(a => 
    !a.check(Object.values(allRoadmapsProgress || {}))
  );
</script>

<div class="card-zen">
  <h3 class="font-semibold mb-4">🏅 Achievements</h3>
  
  {#if unlockedAchievements.length > 0}
    <div class="grid grid-cols-2 gap-2 mb-4">
      {#each unlockedAchievements as achievement}
        <div class="p-3 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
          <div class="text-2xl mb-1">{achievement.icon}</div>
          <p class="font-medium text-sm">{achievement.name}</p>
          <p class="text-xs text-zen-gray-600">{achievement.description}</p>
        </div>
      {/each}
    </div>
  {/if}
  
  {#if lockedAchievements.length > 0}
    <details class="text-sm">
      <summary class="cursor-pointer text-zen-gray-600 hover:text-zen-gray-800">
        {lockedAchievements.length} locked achievements
      </summary>
      <div class="grid grid-cols-2 gap-2 mt-2">
        {#each lockedAchievements as achievement}
          <div class="p-3 bg-zen-gray-50 rounded-lg border border-zen-gray-200 opacity-50">
            <div class="text-2xl mb-1 grayscale">{achievement.icon}</div>
            <p class="font-medium text-sm">{achievement.name}</p>
            <p class="text-xs text-zen-gray-500">{achievement.description}</p>
          </div>
        {/each}
      </div>
    </details>
  {/if}
</div>
```

### Step 9: Create Study Timer Component
Create `src/lib/components/StudyTimer.svelte`:
```svelte
<script>
  import { onMount, onDestroy } from 'svelte';
  
  export let onSessionComplete = () => {};
  
  let minutes = 25;
  let seconds = 0;
  let isRunning = false;
  let interval;
  let sessionType = 'focus'; // 'focus' or 'break'
  
  const presets = [
    { name: 'Pomodoro', focus: 25, break: 5 },
    { name: 'Deep Work', focus: 50, break: 10 },
    { name: 'Quick Study', focus: 15, break: 3 }
  ];
  
  function startTimer() {
    isRunning = true;
    interval = setInterval(() => {
      if (seconds === 0) {
        if (minutes === 0) {
          completeSession();
          return;
        }
        minutes--;
        seconds = 59;
      } else {
        seconds--;
      }
    }, 1000);
  }
  
  function pauseTimer() {
    isRunning = false;
    clearInterval(interval);
  }
  
  function resetTimer() {
    pauseTimer();
    minutes = 25;
    seconds = 0;
  }
  
  function completeSession() {
    pauseTimer();
    
    // Play notification sound
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGY3Oy9diMFl2z9As+EggKDfp5yvWw9CltH0NTwb2IfDVR58+mNbDkLCGndyqSIbwF9IMzGmWs9IgGIyNnwz3kgh6r0AxdkPyABnOLK2ZNbJwMBvuy6k3c6CwGwpvfVCgGDfKJpvms+gIB8pGu+bE/zuvMAc3cxA4JtUO24JQCQZX7yiSsAhnsSmgcAkGl38oo0AJB9PoUwAJRtWeq1LAKNeYNwyD0Ai3t7+vsyAI15PWAVAJVlUOm1NwOGfYNwy0MAhHx9/v41AIdxS/OLXwCEeYBwxUAAiXuLetowAJNpVOuxOQKNe4Jvyz8Ajnl68oo3AIV7gXDD');
    audio.play();
    
    // Switch session type
    if (sessionType === 'focus') {
      sessionType = 'break';
      minutes = 5;
      seconds = 0;
      onSessionComplete();
    } else {
      sessionType = 'focus';
      minutes = 25;
      seconds = 0;
    }
  }
  
  function setPreset(preset) {
    resetTimer();
    minutes = sessionType === 'focus' ? preset.focus : preset.break;
  }
  
  onDestroy(() => {
    if (interval) clearInterval(interval);
  });
  
  $: formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
</script>

<div class="card-zen text-center">
  <h3 class="font-semibold mb-4">⏱️ Study Timer</h3>
  
  <div class="mb-4">
    <div class="text-4xl font-mono font-bold mb-2 
                {sessionType === 'focus' ? 'text-blue-600' : 'text-green-600'}">
      {formattedTime}
    </div>
    <p class="text-sm text-zen-gray-600">
      {sessionType === 'focus' ? '🎯 Focus Time' : '☕ Break Time'}
    </p>
  </div>
  
  <div class="flex justify-center gap-2 mb-4">
    {#if !isRunning}
      <button
        on:click={startTimer}
        class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
      >
        Start
      </button>
    {:else}
      <button
        on:click={pauseTimer}
        class="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
      >
        Pause
      </button>
    {/if}
    <button
      on:click={resetTimer}
      class="px-4 py-2 bg-zen-gray-300 text-zen-gray-700 rounded-lg hover:bg-zen-gray-400"
    >
      Reset
    </button>
  </div>
  
  <div class="space-y-1">
    {#each presets as preset}
      <button
        on:click={() => setPreset(preset)}
        class="text-xs text-zen-gray-600 hover:text-blue-600"
      >
        {preset.name} ({preset.focus}m)
      </button>
    {/each}
  </div>
</div>
```

## Testing and Polish (1 hour)

### Step 10: Add Keyboard Shortcuts
Update `src/routes/roadmap/+page.svelte` to add keyboard navigation:
```javascript
// Add this to the script section
function handleKeypress(e) {
  if (!$roadmapStore.selectedRoadmap || selectedView !== 'detailed') return;
  
  // Cmd/Ctrl + K to search
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    document.querySelector('input[type="text"]')?.focus();
  }
  
  // Numbers 1-9 to toggle stages
  if (e.key >= '1' && e.key <= '9' && !e.ctrlKey && !e.metaKey) {
    const stageIndex = parseInt(e.key) - 1;
    if (stageIndex < filteredStages.length) {
      toggleStage({ detail: { 
        index: $roadmapStore.selectedRoadmap.stages.indexOf(filteredStages[stageIndex]), 
        completed: !isStageCompleted($roadmapStore.selectedRoadmap.stages.indexOf(filteredStages[stageIndex]))
      }});
    }
  }
  
  // E to expand all, C to collapse all
  if (e.key === 'e' && !e.ctrlKey && !e.metaKey) {
    expandAll();
  } else if (e.key === 'c' && !e.ctrlKey && !e.metaKey) {
    collapseAll();
  }
}

// Add to template
<svelte:window on:keydown={handleKeypress} />
```

### Step 11: Add Success Animations
Create `src/lib/components/SuccessAnimation.svelte`:
```svelte
<script>
  import { fly, fade } from 'svelte/transition';
  import { onMount } from 'svelte';
  
  export let show = false;
  export let message = 'Great job!';
  
  onMount(() => {
    if (show) {
      setTimeout(() => {
        show = false;
      }, 3000);
    }
  });
</script>

{#if show}
  <div 
    class="fixed bottom-8 right-8 z-50"
    in:fly={{ y: 50, duration: 300 }}
    out:fade={{ duration: 200 }}
  >
    <div class="bg-green-500 text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3">
      <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
      </svg>
      <div>
        <p class="font-semibold">{message}</p>
        <p class="text-sm opacity-90">Keep up the great work!</p>
      </div>
    </div>
  </div>
{/if}
```

### Step 12: Test Everything
```bash
# 1. Test roadmap loading
npm run dev
# Navigate to /roadmap
# Should see 3 roadmaps

# 2. Test progress tracking
# Click on a roadmap
# Check some stages
# Verify progress bar updates
# Refresh page - progress should persist

# 3. Test search
# Search for "embedding" or "chain"
# Verify filtering works

# 4. Test keyboard shortcuts
# Press 1-9 to toggle stages
# Press E to expand all
# Press C to collapse all

# 5. Test AI context
# Click "Ask AI for Help"
# Should navigate to chat with context
```

### Step 13: Deploy Updates
```bash
# Commit changes
git add .
git commit -m "Day 3: Complete roadmap implementation with progress tracking"

# Deploy to Vercel
vercel --prod
```

## Summary and Checklist

✅ **Working Features:**
- [ ] 3 comprehensive learning roadmaps (LangChain, RAG, Prompt Engineering)
- [ ] Stage-by-stage progress tracking
- [ ] Progress persistence in Supabase
- [ ] Visual progress indicators (circles, bars)
- [ ] Expandable stages with resources
- [ ] Resource links with icons
- [ ] Search/filter functionality
- [ ] Keyboard shortcuts
- [ ] AI context preparation
- [ ] Achievement system
- [ ] Study timer (Pomodoro)
- [ ] Export progress as markdown
- [ ] Mobile responsive design

✅ **Data Features:**
- [ ] User progress saves per stage
- [ ] Overall roadmap progress calculation
- [ ] Last activity tracking
- [ ] Completion timestamps
- [ ] Progress survives page refresh

✅ **Polish:**
- [ ] Smooth animations
- [ ] Loading states
- [ ] Empty states
- [ ] Success feedback
- [ ] Motivational messages
- [ ] Progress celebration

The roadmap system is now fully functional with:
1. **Rich content structure** - Each stage has objectives, resources, and practice prompts
2. **Granular progress tracking** - Track individual stage completion
3. **Visual feedback** - Progress bars, percentages, and achievements
4. **AI integration prep** - Context passing for tomorrow's chat feature
5. **Gamification** - Achievements and study timer for engagement

**Next Steps for Day 4:**
- Build context-aware AI chat
- Integrate roadmap context into chat
- Add streaming responses
- Create chat history