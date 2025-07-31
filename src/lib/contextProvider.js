// Context provider for AI chat integration
import { getAllRoadmaps, getRoadmapById } from './roadmapData.js';
import { ProgressTracker } from './progressTracker.js';

export class ContextProvider {
  constructor(userId) {
    this.userId = userId;
    this.progressTracker = new ProgressTracker(userId);
    this.learningState = null; // Will be set by tracker data
  }

  // Set current learning state from tracker
  setLearningState(trackerData) {
    this.learningState = {
      mood: trackerData.mood,
      energyLevel: trackerData.energyLevel,
      learningMinutes: trackerData.learningMinutes,
      focusSessions: trackerData.focusSessions,
      todaysGoals: trackerData.todaysGoals || [],
      completedGoals: trackerData.completedGoals || [],
      keyLearning: trackerData.keyLearning,
      reflection: trackerData.reflection,
      streakInfo: trackerData.streakInfo,
      roadmapProgress: trackerData.todaysLog?.roadmap_progress
    };
  }

  // Generate context for roadmap-related queries
  getRoadmapContext(roadmapId = null) {
    const context = {
      type: 'roadmap',
      timestamp: new Date().toISOString(),
      data: {}
    };

    if (roadmapId) {
      // Specific roadmap context
      const roadmap = getRoadmapById(roadmapId);
      const progress = this.progressTracker.getProgress(roadmapId);
      
      if (roadmap) {
        context.data = {
          currentRoadmap: {
            id: roadmap.id,
            name: roadmap.name,
            description: roadmap.description,
            difficulty: roadmap.difficulty,
            tags: roadmap.tags,
            totalStages: roadmap.stages.length
          },
          progress: {
            completedStages: progress.completedStages.length,
            currentStage: progress.currentStage,
            completionPercentage: progress.completionPercentage,
            completedStageIds: progress.completedStages
          },
          currentStageDetails: this.getCurrentStageDetails(roadmap, progress),
          nextStageDetails: this.getNextStageDetails(roadmap, progress)
        };
      }
    } else {
      // General roadmap context
      const allRoadmaps = getAllRoadmaps();
      const allProgress = this.progressTracker.getAllProgress();
      
      context.data = {
        availableRoadmaps: allRoadmaps.map(roadmap => ({
          id: roadmap.id,
          name: roadmap.name,
          description: roadmap.description,
          difficulty: roadmap.difficulty,
          tags: roadmap.tags,
          stageCount: roadmap.stages.length
        })),
        userProgress: Object.entries(allProgress).map(([roadmapId, progress]) => ({
          roadmapId,
          completed: progress.completedStages.length,
          total: progress.totalStages,
          percentage: progress.completionPercentage
        })),
        statistics: this.progressTracker.getStatistics()
      };
    }

    return context;
  }

  // Generate context for general AI queries
  getGeneralContext() {
    const statistics = this.progressTracker.getStatistics();
    
    return {
      type: 'general',
      timestamp: new Date().toISOString(),
      data: {
        userStats: statistics,
        activeRoadmaps: this.getActiveRoadmaps(),
        recentActivity: this.getRecentActivity()
      }
    };
  }

  // Generate context for feed-related queries
  getFeedContext(recentFeeds = []) {
    return {
      type: 'feeds',
      timestamp: new Date().toISOString(),
      data: {
        recentTopics: this.extractTopicsFromFeeds(recentFeeds),
        feedSources: recentFeeds.map(feed => feed.source),
        itemCount: recentFeeds.reduce((sum, feed) => sum + feed.items.length, 0)
      }
    };
  }

  // Get current stage details for a roadmap
  getCurrentStageDetails(roadmap, progress) {
    const currentStageIndex = progress.currentStage;
    const currentStage = roadmap.stages[currentStageIndex];
    
    if (!currentStage) return null;
    
    return {
      id: currentStage.id,
      title: currentStage.title,
      description: currentStage.description,
      estimatedTime: currentStage.estimatedTime,
      learningObjectives: currentStage.learningObjectives || [],
      resources: currentStage.resources || [],
      isCompleted: progress.completedStages.includes(currentStage.id)
    };
  }

  // Get next stage details for a roadmap
  getNextStageDetails(roadmap, progress) {
    for (const stage of roadmap.stages) {
      if (!progress.completedStages.includes(stage.id)) {
        return {
          id: stage.id,
          title: stage.title,
          description: stage.description,
          estimatedTime: stage.estimatedTime,
          learningObjectives: stage.learningObjectives || [],
          prerequisites: stage.prerequisites || []
        };
      }
    }
    return null; // All stages completed
  }

  // Get active roadmaps (started but not completed)
  getActiveRoadmaps() {
    const allProgress = this.progressTracker.getAllProgress();
    const allRoadmaps = getAllRoadmaps();
    
    return allRoadmaps
      .filter(roadmap => {
        const progress = allProgress[roadmap.id];
        return progress && progress.completedStages.length > 0 && progress.completionPercentage < 100;
      })
      .map(roadmap => {
        const progress = allProgress[roadmap.id];
        return {
          id: roadmap.id,
          name: roadmap.name,
          progress: progress.completionPercentage,
          nextStage: this.getNextStageDetails(roadmap, progress)
        };
      });
  }

  // Get recent learning activity
  getRecentActivity() {
    const allProgress = this.progressTracker.getAllProgress();
    const activities = [];
    
    Object.entries(allProgress).forEach(([roadmapId, progress]) => {
      const roadmap = getRoadmapById(roadmapId);
      if (roadmap && progress.completedStages.length > 0) {
        activities.push({
          roadmapName: roadmap.name,
          completedStages: progress.completedStages.length,
          totalStages: roadmap.stages.length,
          lastUpdated: progress.lastUpdated
        });
      }
    });
    
    // Sort by last updated
    return activities
      .sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated))
      .slice(0, 5); // Last 5 activities
  }

  // Extract topics from feed items
  extractTopicsFromFeeds(feeds) {
    const topics = new Set();
    
    feeds.forEach(feed => {
      feed.items.forEach(item => {
        // Simple topic extraction from titles
        const title = item.title.toLowerCase();
        
        // AI/ML related keywords
        const keywords = [
          'langchain', 'llm', 'gpt', 'ai', 'machine learning', 'neural network',
          'transformer', 'embedding', 'vector', 'rag', 'retrieval', 'fine-tuning',
          'prompt engineering', 'agent', 'chatbot', 'nlp', 'computer vision'
        ];
        
        keywords.forEach(keyword => {
          if (title.includes(keyword)) {
            topics.add(keyword);
          }
        });
      });
    });
    
    return Array.from(topics).slice(0, 10); // Top 10 topics
  }

  // Generate context summary for AI prompts
  generateContextSummary(contextType, contextData = null) {
    switch (contextType) {
      case 'roadmap':
        return this.generateRoadmapSummary(contextData);
      case 'general':
        return this.generateGeneralSummary();
      case 'feeds':
        return this.generateFeedsSummary(contextData);
      default:
        return this.generateGeneralSummary();
    }
  }

  generateRoadmapSummary(roadmapId) {
    const context = this.getRoadmapContext(roadmapId);
    const { currentRoadmap, progress, currentStageDetails, nextStageDetails } = context.data;
    
    if (!currentRoadmap) {
      return "The user is browsing available learning roadmaps but hasn't selected a specific one yet.";
    }
    
    let summary = `The user is working on the "${currentRoadmap.name}" roadmap (${currentRoadmap.difficulty} level). `;
    summary += `They have completed ${progress.completedStages} out of ${currentRoadmap.totalStages} stages (${progress.completionPercentage}% complete). `;
    
    if (nextStageDetails) {
      summary += `Their next stage is "${nextStageDetails.title}": ${nextStageDetails.description}. `;
      if (nextStageDetails.prerequisites?.length > 0) {
        summary += `Prerequisites for this stage: ${nextStageDetails.prerequisites.join(', ')}. `;
      }
    } else {
      summary += `They have completed all stages in this roadmap! `;
    }
    
    if (currentRoadmap.tags?.length > 0) {
      summary += `This roadmap covers: ${currentRoadmap.tags.join(', ')}.`;
    }
    
    return summary;
  }

  generateGeneralSummary() {
    const statistics = this.progressTracker.getStatistics();
    const activeRoadmaps = this.getActiveRoadmaps();
    
    let summary = `The user has started ${statistics.roadmapsStarted} learning roadmaps and completed ${statistics.totalStagesCompleted} stages total. `;
    
    if (activeRoadmaps.length > 0) {
      summary += `They are currently active in ${activeRoadmaps.length} roadmaps: `;
      summary += activeRoadmaps.map(rm => `${rm.name} (${rm.progress}% complete)`).join(', ') + '. ';
    }
    
    if (statistics.roadmapsCompleted > 0) {
      summary += `They have fully completed ${statistics.roadmapsCompleted} roadmaps. `;
    }
    
    return summary;
  }

  generateFeedsSummary(feeds) {
    if (!feeds || feeds.length === 0) {
      return "The user is looking at their AI/ML feeds but no recent content is available.";
    }
    
    const context = this.getFeedContext(feeds);
    const { recentTopics, feedSources, itemCount } = context.data;
    
    let summary = `The user has ${itemCount} recent items from ${feedSources.length} sources: ${feedSources.join(', ')}. `;
    
    if (recentTopics.length > 0) {
      summary += `Recent topics include: ${recentTopics.join(', ')}. `;
    }
    
    return summary;
  }

  // Generate intelligent system prompt based on complete user context
  generateIntelligentSystemPrompt(contextType, contextData = null) {
    
    const basePersonality = this.buildPersonalityFromState();
    const activityContext = this.buildActivityContext(contextType, contextData);
    const motivationalContext = this.buildMotivationalContext();
    const temporalContext = this.buildTemporalContext();

    const systemPrompt = `You are an AI learning mentor who deeply understands your user's current state and needs. You have extensive knowledge about career paths, technical implementations, and learning strategies.

CRITICAL BEHAVIOR RULES:
- NEVER ask "what do you need help with" or "please provide more details" when you have context about their current learning stage
- ALWAYS provide proactive, intelligent responses based on their roadmap stage, mood, energy, and goals  
- For generic requests like "can you help me", immediately provide relevant help based on their current context
- Be assertive and confident in inferring what they need based on available information

${basePersonality}

${activityContext}

${motivationalContext}

${temporalContext}

SPECIALIZED KNOWLEDGE BASE:

CAREER GUIDANCE BY ROADMAP:
- LangChain: LLM Application Developer, AI Solutions Engineer, Conversational AI Developer, LLM Integration Specialist ($90k-$180k)
- RAG: AI Research Engineer, Knowledge Systems Developer, Information Retrieval Specialist, AI Product Manager ($95k-$200k)
- LLMOps: MLOps Engineer, AI Platform Engineer, Production ML Engineer, AI Infrastructure Specialist ($100k-$220k)
- Evaluation: AI Quality Assurance Engineer, ML Model Validator, AI Ethics Researcher, AI Testing Specialist ($85k-$190k)
- General AI: AI Engineer, Machine Learning Engineer, Data Scientist, AI Researcher ($80k-$200k+)

TECHNICAL IMPLEMENTATION GUIDANCE:
- LangChain: Focus on Chains (sequences of LLM calls), Prompts (templates), Memory (persistent state), Agents (LLMs with tools). Start with: pip install langchain, choose LLM provider, create simple chains, add memory/agents as needed.
- RAG: Process = Index documents → Retrieve relevant chunks → Generate with context. Steps: 1) Chunk documents, 2) Generate embeddings, 3) Store in vector DB (Pinecone/Weaviate), 4) Retrieve for queries, 5) Use as LLM context.
- Evaluation: Set up automated pipelines, define success metrics, create test datasets, monitor performance over time. Key concepts: precision/recall, answer relevance, bias detection, A/B testing.

CRITICAL: FOR GENERIC HELP REQUESTS ("can you help me", "help me with this", etc.):
DO NOT ask for clarification. Instead, AUTOMATICALLY provide helpful content based on their current context:

IMMEDIATE RESPONSE RULES:
- If user is on "Prompt Engineering Fundamentals" stage → Provide prompt engineering techniques, examples, and best practices
- If user is struggling + low energy → Focus on review, encouragement, and breaking down complex topics  
- If user has high energy + good progress → Challenge with advanced concepts and connections
- If user is on any specific roadmap stage → Provide stage-specific guidance and next steps

RESPONSE PATTERNS FOR SPECIFIC QUERIES:
- Career questions: Always provide specific career paths, skills built by this roadmap, concrete next steps (portfolio projects, networking, applications), and realistic salary expectations
- Technical questions: Give step-by-step implementations, code examples, best practices, and practical applications  
- Concept questions: Break down theory → show examples → suggest hands-on practice → connect to bigger picture
- Project questions: Suggest appropriate difficulty based on their current stage, provide specific project ideas, recommend documentation and sharing strategies

EXAMPLE RESPONSES FOR GENERIC HELP:
- User on "Prompt Engineering" + struggling → "I can see you're working on prompt engineering fundamentals and having a challenging day. Let me help with some practical techniques: 1) Start with clear, specific instructions 2) Use examples in your prompts 3) Try the 'role-based' approach (e.g., 'You are an expert...'). Since your energy is lower today, let's focus on mastering one technique at a time. Which prompting challenge are you facing?"

CONTEXTUAL INTELLIGENCE:
- If user is on "Prompt Engineering Fundamentals" stage, proactively offer prompt techniques, examples, and best practices
- If user has low energy + struggling mood, focus on review, encouragement, and breaking down complex topics
- If user has high energy + good progress, challenge them with advanced concepts and connections between topics
- Always reference their specific roadmap progress (e.g., "Since you're X stages into Y roadmap...")
- Connect responses to their actual learning goals and recent activity

RESPONSE GUIDELINES:
- Keep responses focused and actionable (2-3 sentences for quick questions, detailed for complex topics)
- Always consider their current mood, energy, and learning progress when crafting responses
- If they're low energy or struggling, offer encouragement and suggest easier next steps
- If they're high energy, challenge them with deeper concepts and connections
- Reference their specific goals and recent progress when relevant
- Adapt your tone: supportive for struggling, celebratory for achievements, challenging for high performers
- Always relate advice back to their current learning stage and roadmap progress
- Suggest practical next steps that align with their current capabilities and state`;

    return systemPrompt;
  }

  buildPersonalityFromState() {
    if (!this.learningState) {
      return "USER STATE: Limited information available about the user's current learning state.";
    }

    const { mood, energyLevel, todaysGoals, completedGoals, learningMinutes, streakInfo } = this.learningState;
    
    let personality = "USER'S CURRENT STATE:\n";

    // Mood-based personality adjustment
    if (mood) {
      switch (mood) {
        case 'amazing':
          personality += "- Mood: Amazing! 🤩 They're highly motivated and ready for challenges\n";
          break;
        case 'good':
          personality += "- Mood: Good 😊 They're positive and receptive to learning\n";
          break;
        case 'okay':
          personality += "- Mood: Okay 😐 They may need encouragement to stay motivated\n";
          break;
        case 'struggling':
          personality += "- Mood: Struggling 😔 Be extra supportive and suggest manageable steps\n";
          break;
      }
    }

    // Energy-based approach
    if (energyLevel) {
      if (energyLevel >= 4) {
        personality += `- Energy: High (${energyLevel}/5) ⚡ Perfect for complex concepts and deep learning\n`;
      } else if (energyLevel >= 3) {
        personality += `- Energy: Moderate (${energyLevel}/5) 💪 Good for structured learning and practice\n`;
      } else {
        personality += `- Energy: Lower (${energyLevel}/5) 😴 Suggest lighter content and review\n`;
      }
    }

    // Goal progress context
    if (todaysGoals && todaysGoals.length > 0) {
      const completionRate = (completedGoals.length / todaysGoals.length) * 100;
      if (completionRate >= 80) {
        personality += `- Today's Progress: Excellent! 🎉 Completed ${completedGoals.length}/${todaysGoals.length} goals\n`;
      } else if (completionRate >= 50) {
        personality += `- Today's Progress: Good momentum 👍 ${completedGoals.length}/${todaysGoals.length} goals completed\n`;
      } else if (completedGoals.length > 0) {
        personality += `- Today's Progress: Getting started 🚀 ${completedGoals.length}/${todaysGoals.length} goals completed\n`;
      } else {
        personality += `- Today's Progress: Ready to begin 💪 ${todaysGoals.length} goals set\n`;
      }
    }

    // Learning time context
    if (learningMinutes > 0) {
      if (learningMinutes >= 120) {
        personality += `- Learning Time: Excellent focus! ${learningMinutes} minutes today 🔥\n`;
      } else if (learningMinutes >= 60) {
        personality += `- Learning Time: Great progress! ${learningMinutes} minutes today ⏰\n`;
      } else {
        personality += `- Learning Time: Good start! ${learningMinutes} minutes today 📚\n`;
      }
    }

    // Streak motivation
    if (streakInfo?.current > 0) {
      personality += `- Learning Streak: ${streakInfo.current} days! 🔥 Keep the momentum!\n`;
    }

    return personality;
  }

  buildActivityContext(contextType, contextData) {
    let context = "\nCURRENT ACTIVITY CONTEXT:\n";

    switch (contextType) {
      case 'roadmap':
        if (contextData?.roadmap && contextData?.stage) {
          context += `- Working on: "${contextData.roadmap}" roadmap\n`;
          context += `- Current Stage: "${contextData.stage}"\n`;
          if (contextData.difficulty) {
            context += `- Difficulty: ${contextData.difficulty} level\n`;
          }
          if (contextData.prompt) {
            context += `- Current Task: ${contextData.prompt}\n`;
          }
        } else if (contextData?.roadmapId) {
          const roadmapContext = this.getRoadmapContext(contextData.roadmapId);
          const { currentRoadmap, progress, currentStageDetails, nextStageDetails } = roadmapContext.data;
          
          if (currentRoadmap) {
            context += `- Working on: ${currentRoadmap.name} (${progress.completionPercentage}% complete)\n`;
            if (nextStageDetails) {
              context += `- Next Stage: ${nextStageDetails.title}\n`;
              context += `- Stage Focus: ${nextStageDetails.description}\n`;
            }
          }
        } else {
          context += "- Context: Help with roadmap learning, provide stage-specific guidance\n";
        }
        break;

      case 'feeds':
        context += "- Context: User is browsing AI/ML content feeds\n";
        context += "- Help with: Understanding concepts, making connections, identifying next steps\n";
        if (contextData?.recentArticles) {
          context += `- Recent articles: ${contextData.recentArticles.map(a => a.title).slice(0, 3).join(', ')}\n`;
        }
        break;

      case 'tracker':
        context += "- Context: User is in daily tracking mode, reflecting on learning\n";
        context += "- Help with: Progress reflection, goal planning, motivation\n";
        if (this.learningState?.keyLearning) {
          context += `- Today's key learning: ${this.learningState.keyLearning}\n`;
        }
        break;

      default:
        context += "- Context: General learning conversation\n";
    }

    return context;
  }

  buildMotivationalContext() {
    if (!this.learningState) return "";

    let motivation = "\nMOTIVATIONAL CONTEXT:\n";
    
    const { todaysGoals, completedGoals, streakInfo, roadmapProgress } = this.learningState;

    // Goal-based motivation
    if (todaysGoals && todaysGoals.length > 0) {
      const remaining = todaysGoals.length - completedGoals.length;
      if (remaining === 0) {
        motivation += "- All goals completed today! Time to celebrate and maybe set stretch goals 🎉\n";
      } else if (remaining <= 2) {
        motivation += `- Almost there! Only ${remaining} goal(s) left for today 💪\n`;
      } else {
        motivation += `- ${remaining} goals remaining today - let's break them into smaller steps 🎯\n`;
      }
    }

    // Streak-based motivation
    if (streakInfo?.current >= 7) {
      motivation += "- Amazing consistency! You're building a powerful learning habit 🔥\n";
    } else if (streakInfo?.current >= 3) {
      motivation += "- Great streak building! Consistency is key to learning success 📈\n";
    }

    // Roadmap progress motivation
    if (roadmapProgress && Object.keys(roadmapProgress).length > 0) {
      motivation += "- Making roadmap progress today! Every step builds your expertise 🗺️\n";
    }

    return motivation;
  }

  buildTemporalContext() {
    const hour = new Date().getHours();
    let timeContext = "\nTIME-BASED GUIDANCE:\n";

    if (hour < 9) {
      timeContext += "- Morning: Peak focus time! Great for new concepts and challenging material 🌅\n";
    } else if (hour < 14) {
      timeContext += "- Midday: High energy period! Perfect for active learning and problem-solving ☀️\n";
    } else if (hour < 18) {
      timeContext += "- Afternoon: Good for practice, review, and consolidating knowledge 🌤️\n";
    } else if (hour < 22) {
      timeContext += "- Evening: Ideal for reflection, light reading, and planning tomorrow 🌅\n";
    } else {
      timeContext += "- Late night: Consider lighter content or planning. Rest is important for learning! 🌙\n";
    }

    return timeContext;
  }
}