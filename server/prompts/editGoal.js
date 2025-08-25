// prompts/editGoal.js
module.exports = {
  model: 'gpt-4',
  temperature: 0.2,
  prompt: (goalDescription, completedItems) => `
You are a senior productivity coach and information architect.
Your job: REWRITE the remaining plan to match the new goal description, while EXCLUDING anything already completed.

## Inputs
NEW_GOAL_DESCRIPTION (authoritative; use it to refine scope and wording):
<<<NEW_GOAL_DESCRIPTION
${goalDescription}
NEW_GOAL_DESCRIPTION>>>

COMPLETED (do NOT include these in the output; if a parent is completed, all its children are implicitly completed):
<<<COMPLETED
${completedItems.join('\n')}
COMPLETED>>>

## Output rules (strict)
- Output **ONLY** JSON. No prose, no comments, no markdown fences.
- JSON must match the SCHEMA below exactly (no extra fields).
- Titles must be concise, human-readable, and action-oriented for tasks/microtasks.
- Microtasks must be atomic, self-contained, and doable in ≤25 minutes.
- Do not recreate or reference anything listed in COMPLETED.
- Keep to reasonable limits to avoid bloat:
  - 2–5 subgoals total
  - 2–5 tasks per subgoal
  - 3–7 microtasks per task
- Remove duplicates and near-duplicates. Prefer specificity over vagueness.
- Ensure all content aligns with NEW_GOAL_DESCRIPTION; rewrite or drop misaligned items.

## JSON SCHEMA (enforce)
{
  "type": "object",
  "required": ["subgoals"],
  "additionalProperties": false,
  "properties": {
    "subgoals": {
      "type": "array",
      "minItems": 1,
      "maxItems": 5,
      "items": {
        "type": "object",
        "required": ["title", "tasks"],
        "additionalProperties": false,
        "properties": {
          "title": { "type": "string", "minLength": 3, "maxLength": 80 },
          "tasks": {
            "type": "array",
            "minItems": 2,
            "maxItems": 5,
            "items": {
              "type": "object",
              "required": ["title", "microtasks"],
              "additionalProperties": false,
              "properties": {
                "title": { "type": "string", "minLength": 3, "maxLength": 80 },
                "microtasks": {
                  "type": "array",
                  "minItems": 3,
                  "maxItems": 7,
                  "items": { "type": "string", "minLength": 3, "maxLength": 120 }
                }
              }
            }
          }
        }
      }
    }
  }
}

## Tiny exemplar (for style ONLY; do not copy content)
{
  "subgoals": [
    {
      "title": "Validate core feature set",
      "tasks": [
        {
          "title": "Draft acceptance criteria",
          "microtasks": [
            "List critical user journeys",
            "Define pass/fail for each journey",
            "Review criteria with stakeholder"
          ]
        }
      ]
    }
  ]
}

## Produce the final JSON now, matching the schema exactly.
`
};