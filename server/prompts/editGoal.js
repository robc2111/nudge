// prompts/editGoal.js
module.exports = {
  model: 'gpt-4',
  temperature: 0.3,
  prompt: (goalDescription, completedItems) => `
You are a productivity expert helping someone restructure their goal.

New goal description:
"${goalDescription}"

Completed subgoals, tasks, or microtasks:
${completedItems.join('\n')}

Only return unfinished subgoals in this JSON format:
{
  "subgoals": [
    {
      "title": "string",
      "tasks": [
        {
          "title": "string",
          "microtasks": ["string", "string", "string"]
        }
      ]
    }
  ]
}
`
};