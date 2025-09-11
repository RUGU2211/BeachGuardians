'use server';
/**
 * @fileOverview AI flow to generate a conceptual heatmap image.
 *
 * - generateHeatmapImage - A function that handles heatmap image generation.
 * - GenerateHeatmapImageInput - The input type for the function.
 * - GenerateHeatmapImageOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateHeatmapImageInputSchema = z.object({
  prompt: z.string().describe('The prompt to generate the heatmap image from, describing the type of activity or data to visualize.'),
});
export type GenerateHeatmapImageInput = z.infer<typeof GenerateHeatmapImageInputSchema>;

const GenerateHeatmapImageOutputSchema = z.object({
  imageDataUri: z.string().describe("The generated image, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
});
export type GenerateHeatmapImageOutput = z.infer<typeof GenerateHeatmapImageOutputSchema>;

export async function generateHeatmapImage(input: GenerateHeatmapImageInput): Promise<GenerateHeatmapImageOutput> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    // Fallback: return a placeholder image to avoid breaking dashboard
    return {
      imageDataUri: 'data:image/svg+xml;base64,' + Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400"><rect width="800" height="400" fill="#f5f5f5"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#999" font-family="Arial" font-size="16">Heatmap unavailable (missing API key)</text></svg>`).toString('base64')
    };
  }

  const maxRetries = 3;
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      // Execute the flow and return the result on success
      return await generateHeatmapImageFlow(input);
    } catch (error: any) {
      attempt++;
      console.error(`Attempt ${attempt} failed for generateHeatmapImage:`, error);

      // If this was the last attempt, re-throw the error to be handled by the caller
      if (attempt >= maxRetries) {
        throw new Error(`Failed to generate heatmap image after ${maxRetries} attempts. Last error: ${error.message}`);
      }
      
      // Optional: Wait for a short period before retrying (e.g., exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
  // This part should not be reachable, but is here to satisfy TypeScript
  throw new Error('Exited heatmap generation loop unexpectedly.');
}

const imageModel = 'googleai/gemini-2.0-flash-exp';

const generateHeatmapImageFlow = ai.defineFlow(
  {
    name: 'generateHeatmapImageFlow',
    inputSchema: GenerateHeatmapImageInputSchema,
    outputSchema: GenerateHeatmapImageOutputSchema,
  },
  async (input) => {
    const { media } = await ai.generate({
      model: imageModel,
      prompt: `Generate an abstract visual representation of a heatmap.
Theme: "${input.prompt}"
The image should depict varying intensities of activity or data density across a conceptual geographical area.
Use illustrative colors (like reds for high intensity, blues/greens for low intensity) and density patterns.
The style should be clean and modern, suitable for a dashboard. Avoid any text, numbers, or specific real-world map details or legends. Aim for a 800x400 aspect ratio if possible.`,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    if (!media?.url) {
      throw new Error('Heatmap image generation failed or returned no media URL.');
    }
    
    return { imageDataUri: media.url };
  }
);
