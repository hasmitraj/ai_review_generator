import OpenAI from "openai";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generates an AI reply to a customer message with the specified tone
 * @param message - The customer message to respond to
 * @param tone - The desired tone for the reply (e.g., "Polite", "Friendly", "Apologetic")
 * @returns A promise that resolves to the generated reply as plain text
 * @throws Error if OpenAI API key is not configured or if the API call fails
 */
export async function generateAIReply(
  message: string,
  tone: string,
): Promise<string> {
  try {
    // Validate API key is configured
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    // Validate inputs
    if (!message || !tone) {
      throw new Error("Message and tone are required");
    }

    // Production-safe prompt for e-commerce review replies
    const systemPrompt = `You are a professional customer support agent for an e-commerce business. Generate a ${tone} reply to customer reviews following these strict rules:

1. Maximum 60 words - be concise and direct
2. Match the review sentiment - if positive, be appreciative; if negative, be empathetic and solution-focused
3. Use brand-safe language - professional, respectful, and appropriate for all audiences
4. No emojis or special characters
5. No promises or commitments unless the review specifically requires a resolution or follow-up action
6. Focus on acknowledging the customer's feedback and expressing gratitude or addressing concerns appropriately

Write only the reply text, nothing else.`;

    const userPrompt = `Customer review: ${message}`;

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 90, // ~60 words = approximately 80-90 tokens
    });

    // Extract and return the plain text response
    const reply = completion.choices[0]?.message?.content;

    if (!reply) {
      throw new Error("No reply generated from OpenAI");
    }


    return reply.trim();
  } catch (error) {
    // Handle errors gracefully
    if (error instanceof OpenAI.APIError) {
      console.error("OpenAI API Error:", error.status, error.message);
      throw new Error(
        `OpenAI API error: ${error.message}. Please check your API key and try again.`,
      );
    }

    if (error instanceof Error) {
      console.error("Error generating AI reply:", error.message);
      throw error;
    }

    // Handle unknown errors
    console.error("Unknown error generating AI reply:", error);
    throw new Error(
      "An unexpected error occurred while generating the reply. Please try again.",
    );
  }
}

