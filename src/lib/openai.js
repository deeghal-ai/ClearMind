// Real OpenAI integration for client-side use
// Note: API key is loaded from environment variables

import OpenAI from 'openai';

class OpenAIChat {
  constructor() {
    this.apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    this.isDemo = !this.apiKey || this.apiKey.includes('your-key-here');
    
    console.log('🔍 DEBUG: API Key exists?', !!this.apiKey);
    console.log('🔍 DEBUG: API Key preview:', this.apiKey ? this.apiKey.substring(0, 8) + '...' : 'NONE');
    console.log('🔍 DEBUG: API Key length:', this.apiKey ? this.apiKey.length : 0);
    console.log('🔍 DEBUG: Contains your-key-here?', this.apiKey ? this.apiKey.includes('your-key-here') : false);
    console.log('🔍 DEBUG: isDemo =', this.isDemo);
    
    if (!this.isDemo) {
      this.openai = new OpenAI({
        apiKey: this.apiKey,
        dangerouslyAllowBrowser: true
      });
    }
    
    console.log(this.isDemo ? '🔧 Using demo mode' : '🤖 Using real OpenAI API');
  }

  buildSystemMessage(context) {
    let systemMessage = `You are a helpful AI learning assistant focused on technical education, particularly in AI, machine learning, and software development. You provide clear, accurate, and practical guidance. Always be encouraging and supportive of the learner's journey.`;
    
    if (!context || context.type !== 'roadmap') {
      return systemMessage;
    }
    
    systemMessage += `\n\nCONTEXT: The user is currently learning ${context.roadmap || 'a technical topic'}.`;
    
    if (context.stage) {
      systemMessage += ` They are currently on the stage: "${context.stage}".`;
    }
    
    if (context.completedStages && context.totalStages) {
      systemMessage += ` They have completed ${context.completedStages} out of ${context.totalStages} stages so far.`;
    }
    
    if (context.difficulty) {
      systemMessage += ` This is a ${context.difficulty} level learning path.`;
    }
    
    if (context.stageDescription) {
      systemMessage += `\n\nCURRENT STAGE DETAILS: ${context.stageDescription}`;
    }
    
    systemMessage += `\n\nINSTRUCTIONS: 
- Provide guidance specific to their current learning stage and roadmap
- Offer practical examples and encourage hands-on practice
- If they're stuck, provide hints and guidance rather than complete solutions
- Connect your responses to their specific learning journey when relevant
- Be encouraging and acknowledge their progress`;
    
    return systemMessage;
  }

  async sendMessage(messages, context = {}) {
    if (this.isDemo) {
      // Demo responses based on context
      return this.getDemoResponse(messages, context);
    }
    
    try {
      // Build system message with context
      const systemMessage = this.buildSystemMessage(context);
      
      // Prepare messages for OpenAI
      const openaiMessages = [
        { role: 'system', content: systemMessage },
        ...messages.map(m => ({ 
          role: m.role, 
          content: m.content 
        }))
      ];
      
      // Call real OpenAI API
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: openaiMessages,
        temperature: 0.7,
        max_tokens: 1000
      });
      
      return completion.choices[0].message;
      
    } catch (error) {
      console.error('OpenAI API error:', error);
      // Fallback to demo response on error
      return this.getDemoResponse(messages, context);
    }
  }

  getDemoResponse(messages, context) {
    const lastMessage = messages[messages.length - 1]?.content || '';
    
    return new Promise((resolve) => {
      setTimeout(() => {
        let response = this.generateContextualResponse(lastMessage, context);
        resolve({
          role: 'assistant',
          content: response
        });
      }, 1000 + Math.random() * 1500);
    });
  }

  generateContextualResponse(message, context) {
    const responses = {
      roadmap: [
        `Great question about ${context.roadmap || 'your learning path'}! Let me help you understand this better.`,
        `I can see you're working on ${context.stage || 'an important concept'}. Here's what I recommend...`,
        `Based on your progress (${context.completedStages || 0}/${context.totalStages || 0} stages completed), let's focus on...`,
        `For the ${context.difficulty || 'current'} level topic you're studying, I suggest...`
      ],
      general: [
        "That's an excellent question! Let me break this down for you step by step.",
        "I'd be happy to help you understand this concept better. Here's how I'd explain it...",
        "Great topic! This is fundamental to understanding AI and machine learning. Let me explain...",
        "I can help clarify that for you. The key points to understand are...",
        "That's a common question many learners have. Here's a practical explanation..."
      ]
    };

    const contextResponses = responses[context.type] || responses.general;
    const baseResponse = contextResponses[Math.floor(Math.random() * contextResponses.length)];

    // Add context-specific career advice for roadmap topics
    if (context.type === 'roadmap' && message.toLowerCase().includes('career')) {
      const roadmapCareers = {
        'langchain': ['LLM Application Developer', 'AI Solutions Engineer', 'Conversational AI Developer', 'LLM Integration Specialist'],
        'rag': ['AI Research Engineer', 'Knowledge Systems Developer', 'Information Retrieval Specialist', 'AI Product Manager'],
        'llmops': ['MLOps Engineer', 'AI Platform Engineer', 'Production ML Engineer', 'AI Infrastructure Specialist'],
        'evaluation': ['AI Quality Assurance Engineer', 'ML Model Validator', 'AI Ethics Researcher', 'AI Testing Specialist']
      };
      
      const roadmapKey = context.roadmap?.toLowerCase();
      const careers = roadmapCareers[Object.keys(roadmapCareers).find(key => roadmapKey?.includes(key))] || 
                     ['AI Engineer', 'Machine Learning Engineer', 'Data Scientist', 'AI Researcher'];
      
      return `${baseResponse}\n\nBased on your focus on **${context.roadmap}**, here are some excellent career paths:\n\n**Direct Career Options:**\n${careers.map(career => `• **${career}**`).join('\n')}\n\n**Skills This Roadmap Builds:**\n• Technical expertise in ${context.roadmap?.toLowerCase()}\n• Understanding of production AI systems\n• Experience with AI/ML tools and frameworks\n• Problem-solving with cutting-edge technology\n\n**Next Steps:**\n1. Complete this roadmap to build solid fundamentals\n2. Build 2-3 portfolio projects demonstrating these skills\n3. Contribute to open-source AI projects\n4. Network with AI professionals on LinkedIn/Twitter\n5. Apply for internships or entry-level positions\n\n**Salary Range:** $80k-$200k+ depending on experience and location.\n\nWould you like specific advice on any of these career paths?`;
    }

    if (message.toLowerCase().includes('langchain')) {
      return `${baseResponse}\n\nLangChain is a powerful framework for building applications with Large Language Models (LLMs). Here are the key concepts:\n\n**Core Components:**\n- **Chains**: Sequences of calls to LLMs or other utilities\n- **Prompts**: Templates for formatting input to LLMs\n- **Memory**: Persistent state between chain calls\n- **Agents**: LLMs that can use tools and make decisions\n\n**Getting Started:**\n1. Install: \`pip install langchain\`\n2. Choose your LLM (OpenAI, Hugging Face, etc.)\n3. Create simple chains first\n4. Add memory and agents as needed\n\nWould you like me to show you a specific example?`;
    }

    if (message.toLowerCase().includes('rag')) {
      return `${baseResponse}\n\nRAG (Retrieval-Augmented Generation) combines the power of retrieval systems with generative AI. Here's how it works:\n\n**The RAG Process:**\n1. **Index**: Store documents in a vector database\n2. **Retrieve**: Find relevant documents for a query\n3. **Generate**: Use retrieved context to generate responses\n\n**Key Benefits:**\n- Up-to-date information (not limited by training data)\n- Factual accuracy (grounded in retrieved documents)\n- Transparency (can cite sources)\n\n**Implementation Steps:**\n1. Chunk your documents\n2. Generate embeddings\n3. Store in vector database (Pinecone, Weaviate, etc.)\n4. Retrieve relevant chunks for queries\n5. Use as context for LLM generation\n\nWant to dive deeper into any of these steps?`;
    }

    // Smart universal handler for roadmap context
    if (context.type === 'roadmap' && context.roadmap) {
      return this.generateSmartRoadmapResponse(message, context, baseResponse);
    }

    return `${baseResponse}\n\nI notice you're asking about "${message}". This is a great topic to explore! \n\nTo give you the most helpful response, could you tell me:\n- What's your current level with this topic?\n- Are you looking for a conceptual explanation or practical implementation?\n- Is this related to a specific project you're working on?\n\nI'm here to help you learn at whatever pace works best for you!`;
  }

  generateSmartRoadmapResponse(message, context, baseResponse) {
    const msg = message.toLowerCase();
    const roadmap = context.roadmap?.toLowerCase() || '';
    const stage = context.stage?.toLowerCase() || '';
    
    // Career-focused responses
    if (msg.includes('career') || msg.includes('job') || msg.includes('work')) {
      const roadmapCareers = {
        'langchain': ['LLM Application Developer', 'AI Solutions Engineer', 'Conversational AI Developer', 'LLM Integration Specialist'],
        'rag': ['AI Research Engineer', 'Knowledge Systems Developer', 'Information Retrieval Specialist', 'AI Product Manager'],
        'llmops': ['MLOps Engineer', 'AI Platform Engineer', 'Production ML Engineer', 'AI Infrastructure Specialist'],
        'evaluation': ['AI Quality Assurance Engineer', 'ML Model Validator', 'AI Ethics Researcher', 'AI Testing Specialist']
      };
      
      const roadmapKey = Object.keys(roadmapCareers).find(key => roadmap.includes(key));
      const careers = roadmapCareers[roadmapKey] || ['AI Engineer', 'Machine Learning Engineer', 'Data Scientist', 'AI Researcher'];
      
      return `${baseResponse}\n\nBased on your focus on **${context.roadmap}**, here are some excellent career paths:\n\n**Direct Career Options:**\n${careers.map(career => `• **${career}**`).join('\n')}\n\n**Skills This Roadmap Builds:**\n• Technical expertise in ${roadmap}\n• Understanding of production AI systems\n• Experience with AI/ML tools and frameworks\n• Problem-solving with cutting-edge technology\n\n**Next Steps:**\n1. Complete this roadmap to build solid fundamentals\n2. Build 2-3 portfolio projects demonstrating these skills\n3. Contribute to open-source AI projects\n4. Network with AI professionals on LinkedIn/Twitter\n5. Apply for internships or entry-level positions\n\n**Salary Range:** $80k-$200k+ depending on experience and location.\n\nWould you like specific advice on any of these career paths?`;
    }

    // Evaluation-specific responses
    if (msg.includes('eval') || msg.includes('evaluation') || msg.includes('metric') || msg.includes('measure')) {
      const evalConcepts = {
        'langchain': ['Chain evaluation', 'Prompt effectiveness metrics', 'Response quality scoring', 'Latency measurement', 'Cost tracking'],
        'rag': ['Retrieval precision/recall', 'Answer relevance scoring', 'Source accuracy validation', 'Context quality metrics', 'End-to-end pipeline evaluation'],
        'llmops': ['Model performance monitoring', 'Drift detection', 'A/B testing frameworks', 'Production metrics', 'SLA compliance tracking'],
        'evaluation': ['Automated evaluation pipelines', 'Human evaluation protocols', 'Bias detection metrics', 'Fairness assessments', 'Benchmark comparisons']
      };
      
      const roadmapKey = Object.keys(evalConcepts).find(key => roadmap.includes(key));
      const concepts = evalConcepts[roadmapKey] || ['Model accuracy', 'Performance metrics', 'Quality assessment', 'Validation techniques'];
      
      return `${baseResponse}\n\n**Yes! Evaluation concepts are crucial for ${context.roadmap}:**\n\n**Key Evaluation Areas:**\n${concepts.map(concept => `• **${concept}**`).join('\n')}\n\n**Why Evaluation Matters Here:**\n• Ensures your ${roadmap} systems work reliably in production\n• Helps you identify and fix issues before they impact users\n• Provides data-driven insights for system improvements\n• Critical for maintaining trust in AI systems\n\n**Practical Applications:**\n1. Set up automated evaluation pipelines\n2. Define success metrics for your use case\n3. Create test datasets for continuous validation\n4. Monitor system performance over time\n5. Compare different approaches objectively\n\n**Given your current stage (${context.stage})**, I'd recommend focusing on understanding how evaluation fits into your ${roadmap} workflow.\n\nWhat specific evaluation challenges are you thinking about?`;
    }

    // Project/implementation focused
    if (msg.includes('project') || msg.includes('build') || msg.includes('implement') || msg.includes('practice')) {
      return `${baseResponse}\n\n**Great question about building projects with ${context.roadmap}!**\n\n**Context:** You're on ${context.stage} (${context.completedStages}/${context.totalStages} stages completed)\n\n**Project Ideas for Your Level:**\n• **Beginner**: Simple implementation following tutorials\n• **Intermediate**: Combine multiple concepts from this roadmap\n• **Advanced**: Build production-ready solutions with monitoring\n\n**For ${context.roadmap} specifically, consider:**\n1. Start with the fundamentals you've learned so far\n2. Build something that solves a real problem you care about\n3. Document your process and learnings\n4. Share your work to get feedback from the community\n\n**Current Stage Focus:**\nSince you're working on \"${context.stage}\", I'd suggest building a project that specifically practices those concepts. This will reinforce your learning and give you hands-on experience.\n\nWhat kind of project interests you most - something practical for work, a personal learning exercise, or maybe an open-source contribution?`;
    }

    // Concept/theory focused  
    if (msg.includes('concept') || msg.includes('understand') || msg.includes('explain') || msg.includes('learn')) {
      return `${baseResponse}\n\n**Understanding ${context.roadmap} Concepts**\n\n**Your Learning Context:**\n• Currently on: ${context.stage}\n• Progress: ${context.completedStages}/${context.totalStages} stages completed\n• Difficulty: ${context.difficulty} level\n\n**About "${message}":**\nThis is a great question that connects directly to your ${context.roadmap} journey. The concepts you're asking about are fundamental to understanding how ${roadmap} works in practice.\n\n**Learning Approach:**\n1. **Theory First**: Understand the core principles\n2. **See Examples**: Look at real-world implementations  \n3. **Hands-on Practice**: Build something small to test your understanding\n4. **Connect the Dots**: See how this fits into the bigger ${roadmap} picture\n\n**For Your Current Stage:**\nSince you're working on \"${context.stage}\", this question shows you're thinking deeply about the material. That's exactly the right mindset for mastering ${roadmap}.\n\nWould you like me to break down the specific concepts you're curious about, or would you prefer to see how they apply in practice?`;
    }

    // Default contextual response for anything else
    return `${baseResponse}\n\n**Great question about "${message}" in the context of ${context.roadmap}!**\n\n**Your Learning Context:**\n• Current Focus: ${context.stage}\n• Progress: ${context.completedStages}/${context.totalStages} stages completed\n• Roadmap: ${context.roadmap} (${context.difficulty} level)\n\n**This is particularly relevant because:**\n• It connects to the concepts you're currently learning\n• Understanding this will help you progress in your ${roadmap} journey\n• It's the kind of question that shows deep thinking about the material\n\n**To give you the most helpful answer:**\n• Are you looking for a conceptual explanation or practical examples?\n• How does this relate to what you're currently working on in \"${context.stage}\"?\n• Would you like me to connect this to the broader ${roadmap} learning path?\n\nI'm here to help you master these concepts at whatever pace works best for you!`;
  }

  // Enhanced demo response that uses intelligent context
  getDemoResponseWithIntelligentPrompt(messages, context) {
    const lastMessage = messages[messages.length - 1]?.content || '';
    const systemPrompt = context.systemPrompt || '';
    
    return new Promise((resolve) => {
      setTimeout(() => {
        let response = this.generateIntelligentDemoResponse(lastMessage, systemPrompt);
        resolve({
          role: 'assistant',
          content: response
        });
      }, 1000 + Math.random() * 1500);
    });
  }

  generateIntelligentDemoResponse(message, systemPrompt) {
    console.log('🔍 DEBUG OpenAI: generateIntelligentDemoResponse called');
    console.log('🔍 DEBUG OpenAI: message =', message);
    console.log('🔍 DEBUG OpenAI: systemPrompt length =', systemPrompt.length);
    
    // Extract key context from the intelligent system prompt
    const isLowEnergy = systemPrompt.includes('Lower energy') || systemPrompt.includes('Energy: Low');
    const isHighEnergy = systemPrompt.includes('High energy') || systemPrompt.includes('Energy: High');
    const isStruggling = systemPrompt.includes('struggling') || systemPrompt.includes('Struggling');
    const isAmazing = systemPrompt.includes('Amazing!') || systemPrompt.includes('motivated and ready');
    const hasGoalsCompleted = systemPrompt.includes('Excellent progress') || systemPrompt.includes('All goals completed');
    const hasLearningTime = systemPrompt.includes('Learning Time:');
    const hasStreak = systemPrompt.includes('Learning Streak:');
    
    console.log('🔍 DEBUG OpenAI: Context flags - struggling:', isStruggling, 'lowEnergy:', isLowEnergy, 'highEnergy:', isHighEnergy);
    
    // FIRST: Use the existing good contextual response system
    // Extract context info from system prompt for the old system
    const contextForOldSystem = this.extractContextFromSystemPrompt(systemPrompt);
    console.log('🔍 DEBUG OpenAI: Extracted context for old system:', contextForOldSystem);
    
    let baseResponse = this.generateContextualResponse(message, contextForOldSystem);
    
    // THEN: Add mood/energy adaptation as a prefix
    let moodPrefix = '';
    
    if (isStruggling) {
      moodPrefix = "I can see you're having a challenging learning day - that's completely normal! Let me help you work through this step by step.\n\n";
    } else if (isAmazing && isHighEnergy) {
      moodPrefix = "I love this energy! 🚀 You're feeling amazing and have high energy - perfect for diving deep into complex concepts.\n\n";
    } else if (isHighEnergy) {
      moodPrefix = "Great energy level! You're ready for some solid learning today.\n\n";
    } else if (isLowEnergy) {
      moodPrefix = "I notice your energy is a bit lower today. Let's keep things practical and not too overwhelming.\n\n";
    }
    
    // Combine mood context with the good existing response
    let response = moodPrefix + baseResponse;
    
    // Add motivational context at the end
    let motivationalSuffix = '';
    
    if (hasStreak) {
      const streakMatch = systemPrompt.match(/Learning Streak: (\d+) days/);
      if (streakMatch) {
        const days = parseInt(streakMatch[1]);
        if (days >= 7) {
          motivationalSuffix += `\n\n🔥 By the way, ${days} days of consistent learning is incredible! You're building a powerful habit.`;
        } else if (days >= 3) {
          motivationalSuffix += `\n\n💪 Nice ${days}-day streak! Consistency like this is how expertise is built.`;
        }
      }
    }
    
    if (hasGoalsCompleted) {
      motivationalSuffix += "\n\n🎉 I noticed you've made excellent progress on your goals today. Keep up the momentum!";
    }
    
    const finalResponse = response + motivationalSuffix;
    console.log('🎯 DEBUG OpenAI: Final response length:', finalResponse.length);
    console.log('🎯 DEBUG OpenAI: Final response preview:', finalResponse.substring(0, 100) + '...');
    return finalResponse;
  }

  // Extract context info from our new system prompt format for the old system
  extractContextFromSystemPrompt(systemPrompt) {
    // Default context
    let context = { type: 'general' };
    
    // Check if it mentions roadmap context
    if (systemPrompt.includes('Working on:')) {
      context.type = 'roadmap';
      
      // Extract roadmap name
      const roadmapMatch = systemPrompt.match(/Working on: ([^(]+)/);
      if (roadmapMatch) {
        context.roadmap = roadmapMatch[1].trim();
      }
      
      // Extract current stage
      const stageMatch = systemPrompt.match(/Next Stage: ([^\n]+)/);
      if (stageMatch) {
        context.stage = stageMatch[1].trim();
      }
      
      // Extract completion info
      const progressMatch = systemPrompt.match(/(\d+)% complete/);
      if (progressMatch) {
        const percentage = parseInt(progressMatch[1]);
        // Estimate stages based on percentage (rough estimate)
        context.completedStages = Math.floor(percentage / 10);
        context.totalStages = 10;
        context.difficulty = percentage > 70 ? 'advanced' : percentage > 30 ? 'intermediate' : 'beginner';
      }
    }
    
    return context;
  }



  // Stream-like response for better UX
  async *streamResponse(messages, context = {}) {
    console.log('🔍 DEBUG OpenAI: streamResponse called with context:', context);
    console.log('🔍 DEBUG OpenAI: isDemo =', this.isDemo);
    console.log('🔍 DEBUG OpenAI: has systemPrompt =', !!context.systemPrompt);
    
    if (this.isDemo) {
      console.log('🔧 DEBUG: DEFINITELY IN DEMO MODE');
      // Demo streaming - use intelligent system prompt if provided
      let response;
      if (context.systemPrompt) {
        console.log('🎯 DEBUG OpenAI: Using intelligent system prompt IN DEMO MODE');
        // Use the new intelligent system prompt for demo responses
        response = await this.getDemoResponseWithIntelligentPrompt(messages, context);
      } else {
        console.log('⚠️ DEBUG OpenAI: No systemPrompt, falling back to old method IN DEMO MODE');
        // Fallback to old method for backward compatibility
        response = await this.sendMessage(messages, context);
      }
      
      const words = response.content.split(' ');
      
      for (let i = 0; i < words.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 50));
        yield words.slice(0, i + 1).join(' ');
      }
      return;
    }
    
    try {
      // Real OpenAI streaming - use intelligent system prompt if provided
      const systemMessage = context.systemPrompt || this.buildSystemMessage(context);
      console.log('🎯 DEBUG: Using system message length:', systemMessage.length);
      
      const openaiMessages = [
        { role: 'system', content: systemMessage },
        ...messages.map(m => ({ role: m.role, content: m.content }))
      ];
      
      console.log('🔄 DEBUG: About to call OpenAI API...');
      const stream = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: openaiMessages,
        temperature: 0.7,
        max_tokens: 1000,
        stream: true
      });
      console.log('✅ DEBUG: OpenAI API call successful, streaming response...');
      
      let fullResponse = '';
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content || '';
        if (text) {
          fullResponse += text;
          yield fullResponse;
        }
      }
      console.log('✅ DEBUG: OpenAI streaming completed. Response length:', fullResponse.length);
      
    } catch (error) {
      console.error('🚨 CRITICAL: OpenAI API call failed!', error);
      console.error('🚨 Falling back to demo mode. Check your API key and network!');
      
      // Fallback to intelligent demo response (not the old generic one!)
      if (context.systemPrompt) {
        console.log('🚨 FALLBACK: Using intelligent demo fallback because OpenAI failed!');
        const response = await this.getDemoResponseWithIntelligentPrompt(messages, context);
        const words = response.content.split(' ');
        for (let i = 0; i < words.length; i++) {
          await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 50));
          yield words.slice(0, i + 1).join(' ');
        }
      } else {
        console.log('🚨 FALLBACK: Using old demo fallback because OpenAI failed!');
        const response = await this.getDemoResponse(messages, context);
        yield response.content;
      }
    }
  }
}

export const openaiChat = new OpenAIChat();