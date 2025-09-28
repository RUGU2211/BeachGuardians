import OpenAI from "openai";

// Initialize OpenAI only if API key is available
const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

export async function generateEventImage({ prompt }: { prompt: string }): Promise<string | null> {
  // Return null if OpenAI is not configured
  if (!openai) {
    console.warn('OpenAI API key not configured. Skipping image generation.');
    return null;
  }

  try {
    const size = "1024x1024";
    const response = await openai.images.generate({
      prompt,
      n: 1,
      size,
      response_format: "url",
    });
    return response.data[0].url || null;
  } catch (error) {
    console.error('Error generating event image:', error);
    return null;
  }
}