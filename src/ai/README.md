# AI Module

This module contains all AI/LLM integration logic, prompt templates, and analysis utilities.

## Structure

- **services/** - AI integration services
  - `prompt.service.ts` - Generate analytical prompts for ChatGPT/Claude

- **prompts/** - Prompt templates and utilities
  - Strategic scheduling prompts
  - Time audit prompts
  - Task decomposition prompts
  - Burnout risk prompts

- **schemas/** - JSON schema definitions for AI responses

- **parsers/** - Parse AI responses into structured data

- **models/** - AI-specific data models and types

- **adapters/** - Adapt AI services for different LLM providers

- **pipelines/** - Multi-step AI processing pipelines

## Current Implementation

- **Prompt Generation**: Generate analytical prompts formatted for ChatGPT/Claude
- **Token Optimization**: Pre-process data to minimize token overhead
- **Response Templates**: Structured output for AI analysis

## Future Enhancements

- Direct API integration with OpenAI/Anthropic
- Streaming response handling
- Multi-step reasoning chains
- Caching and response history
- Provider abstraction layer

## Usage

```typescript
import { AiPromptService } from '@ai/services';

// Generate prompts
const prompts = aiPromptService.generatePrompts(tasks);

// Copy to ChatGPT/Claude for analysis
```
