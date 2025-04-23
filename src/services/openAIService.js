// openAIService.js

// Define the functions that can be called by the OpenAI model
const functions = [
  {
    name: "get_file_content",
    description: "Retrieve the content of a specific file from a GitHub repository.",
    parameters: {
      type: "object",
      properties: {
        file_path: {
          type: "string",
          description: "The path to the file within the repository (e.g., 'src/app.js')."
        }
      },
      required: ["file_path"]
    }
  },
  {
    name: "commit_file",
    description: "Commit and push changes to a specific file in a GitHub repository.",
    parameters: {
      type: "object",
      properties: {
        file_path: {
          type: "string",
          description: "The path to the file being updated."
        },
        new_content: {
          type: "string",
          description: "The updated content of the file."
        },
        commit_message: {
          type: "string",
          description: "A short message describing the change."
        }
      },
      required: ["file_path", "new_content", "commit_message"]
    }
  }
];

/**
 * Send a message to the OpenAI API and receive a response.
 * 
 * @param {string} openaiKey - The OpenAI API key.
 * @param {Array} messages - The messages to send in the request.
 * @param {string} modelId - The ID of the model to use (e.g. "gpt-4o-2024-08-06").
 * @returns {Promise<Object>} - The response from the OpenAI API.
 */
export async function sendOpenAIMessage(openaiKey, messages, modelId = "gpt-4o-2024-08-06") {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: modelId,
      messages,
      functions,
    })
  });

  const data = await response.json();

  if (!data.choices) {
    throw new Error(`OpenAI API returned an unexpected response:\n\n${JSON.stringify(data, null, 2)}`);
  }

  return data;
}
