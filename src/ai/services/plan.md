# AI Structured Input/Output Execution Plan

This document outlines the 5-part execution plan to integrate structured AI schemas (`GoalInput`, `MilestoneOutput`, `TaskOutput`, `PlanOutput`, `ReflectionOutput`) into ProductivityFlow's AI features.

## Part 1: Schema Definition Validation
**Goal:** Ensure the AI interfaces are properly defined and accessible.
**Files to Modify:** 
- `src/ai/schemas/ai.schema.ts` (Already created)
**Action:** 
Verify that the schemas perfectly map to the `Task` and `Subtask` interfaces in `TaskService` so that future "Import Task" features can map LLM outputs 1:1 to the local database.

## Part 2: Implement Goal & Plan Prompting
**Goal:** Enable the system to ask an LLM to generate a comprehensive project plan from a high-level goal.
**Files to Modify:** 
- `src/ai/services/prompt.service.ts`
**Action:** 
Add a `generateGoalPrompt(goal: GoalInput, relevantTasks: Task[])` method. This method will inject the user's goal and current tasks, explicitly requesting the LLM to output a JSON string conforming exactly to the `PlanOutput` and `MilestoneOutput` TypeScript schemas.

## Part 3: Implement Task Decomposition Prompting
**Goal:** Allow users to break down complex tasks into smaller, structured sub-tasks.
**Files to Modify:** 
- `src/ai/services/prompt.service.ts`
**Action:** 
Add a `generateTaskDecompositionPrompt(task: Task)` method. This will prompt the LLM to output an array of `TaskOutput` objects, representing actionable, estimated, and categorized sub-tasks that can eventually be ingested by the app.

## Part 4: Implement Task Reflection Prompting
**Goal:** Provide structured analytical feedback on a user's completed tasks or week.
**Files to Modify:** 
- `src/ai/services/prompt.service.ts`
**Action:** 
Add a `generateReflectionPrompt(tasks: Task[])` method. This will feed completed tasks, focus scores, and time-elapsed data to the LLM, requesting a `ReflectionOutput` JSON containing key learnings, actionable insights, and sentiment.

## Part 5: UI Integration in AI Features View
**Goal:** Surface the new structured prompt generators to the user.
**Files to Modify:** 
- `src/features/planning-ai/components/planning-ai-view/ai-features-view.component.ts`
- `src/features/planning-ai/components/planning-ai-view/ai-features-view.component.html`
**Action:** 
1. Add a UI form (inputs for Description, Desired Outcome, Timeframe) to capture `GoalInput`.
2. Add buttons/actions to trigger the Goal, Decomposition, and Reflection prompts.
3. Update the prompt display list to handle the newly generated JSON-schema-based prompts alongside the existing analytical prompts.

---

### Next Steps
Once this plan is approved:
1. We will execute the code changes starting from Part 2.
2. `Skills.md` will be updated to reflect the new schemas and Prompt Service capabilities under the **AI-Powered Insights** section.