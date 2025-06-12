
'use server';
/**
 * @fileOverview AI flow to generate an image for an event.
 *
 * - generateEventImage - A function that handles event image generation.
 * - GenerateEventImageInput - The input type for the generateEventImage function.
 * - GenerateEventImageOutput - The return type for the generateEventImage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateEventImageInputSchema = z.object({
  eventName: z.string().describe('The name of the event.'),
  eventDescription: z.string().describe('A brief description of the event.'),
});
export type GenerateEventImageInput = z.infer<typeof GenerateEventImageInputSchema>;

const GenerateEventImageOutputSchema = z.object({
  imageDataUri: z.string().describe("The generated image for the event, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
});
export type GenerateEventImageOutput = z.infer<typeof GenerateEventImageOutputSchema>;

export async function generateEventImage(input: GenerateEventImageInput): Promise<GenerateEventImageOutput> {
  return generateEventImageFlow(input);
}

// Gemini 2.0 Flash experimental image generation model
const imageModel = 'googleai/gemini-2.0-flash-exp';

const generateEventImageFlow = ai.defineFlow(
  {
    name: 'generateEventImageFlow',
    inputSchema: GenerateEventImageInputSchema,
    outputSchema: GenerateEventImageOutputSchema,
  },
  async (input) => {
    const { media } = await ai.generate({
      model: imageModel,
      prompt: `Generate a visually appealing and relevant image for a community event focused on environmental cleanup or local gathering.
Event Name: "${input.eventName}"
Event Description: "${input.eventDescription}"
The image should evoke themes of nature, community spirit, and positive action. Avoid text in the image.`,
      config: {
        responseModalities: ['TEXT', 'IMAGE'], // Must include both for this model
      },
    });

    if (!media?.url) {
      throw new Error('Image generation failed or returned no media URL.');
    }
    
    return { imageDataUri: media.url };
  }
);
