
'use server';
/**
 * @fileOverview AI flow to generate a hero image based on a prompt.
 *
 * - generateHeroImage - A function that handles hero image generation.
 * - GenerateHeroImageInput - The input type for the generateHeroImage function.
 * - GenerateHeroImageOutput - The return type for the generateHeroImage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateHeroImageInputSchema = z.object({
  prompt: z.string().describe('The prompt to generate the image from.'),
});
export type GenerateHeroImageInput = z.infer<typeof GenerateHeroImageInputSchema>;

const GenerateHeroImageOutputSchema = z.object({
  imageDataUri: z.string().describe("The generated image, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
});
export type GenerateHeroImageOutput = z.infer<typeof GenerateHeroImageOutputSchema>;

export async function generateHeroImage(input: GenerateHeroImageInput): Promise<GenerateHeroImageOutput> {
  return generateHeroImageFlow(input);
}

const imageModel = 'googleai/gemini-2.0-flash-exp';

const generateHeroImageFlow = ai.defineFlow(
  {
    name: 'generateHeroImageFlow',
    inputSchema: GenerateHeroImageInputSchema,
    outputSchema: GenerateHeroImageOutputSchema,
  },
  async (input) => {
    const { media } = await ai.generate({
      model: imageModel,
      prompt: `Generate a visually appealing hero image for a website. The image should be suitable for a landing page.
Theme: "${input.prompt}"
The image should be high quality, engaging, and ideally fit a landscape aspect ratio suitable for 600x400 display. Avoid text in the image.`,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    if (!media?.url) {
      throw new Error('Image generation failed or returned no media URL.');
    }
    
    return { imageDataUri: media.url };
  }
);
