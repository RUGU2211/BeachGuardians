
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
  return generateHeatmapImageFlow(input);
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
