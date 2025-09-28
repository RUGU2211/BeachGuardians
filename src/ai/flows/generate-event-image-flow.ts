'use server';
/**
 * @fileOverview AI flow to generate an image for an event.
 *
 * - generateEventImage - A function that handles event image generation.
 * - GenerateEventImageInput - The input type for the generateEventImage function.
 * - GenerateEventImageOutput - The return type for the generateEventImage function.
 */

import { generateEventImage as generateDalleEventImage } from '@/lib/dalle';
import {z} from 'genkit';

const GenerateEventImageInputSchema = z.object({
  eventName: z.string().describe('The name of the event.'),
  eventDescription: z.string().describe('A brief description of the event.'),
  format: z.enum(["poster", "banner"]).default("poster").describe("The desired format: 'poster' (portrait) or 'banner' (landscape)."),
});
export type GenerateEventImageInput = z.infer<typeof GenerateEventImageInputSchema>;

const GenerateEventImageOutputSchema = z.object({
  imageDataUri: z.string().describe("The generated image for the event, as a URL."),
});
export type GenerateEventImageOutput = z.infer<typeof GenerateEventImageOutputSchema>;

export async function generateEventImage(input: GenerateEventImageInput): Promise<GenerateEventImageOutput> {
  try {
    const aspect = input.format === 'banner' ? 'landscape banner (16:9)' : 'portrait poster (4:5)';
    const prompt = `Create a high-quality promotional ${input.format} for a beach cleanup event.\nEvent Name: "${input.eventName}"\nDescription: "${input.eventDescription}"\nFormat: ${aspect}\nArtistic style: vibrant, inspiring, digital art.\nDo NOT include any text or writing. Focus on clean beaches, volunteers in action, and marine life.`;

    const imageUrl = await generateDalleEventImage({ prompt });
    
    if (imageUrl) {
      return { imageDataUri: imageUrl };
    } else {
      // Return a placeholder image if generation fails or API key is not available
      const placeholderUrl = "https://placehold.co/800x1000/4ade80/ffffff?text=Beach+Cleanup+Poster";
      return { imageDataUri: input.format === 'banner' ? 'https://placehold.co/1200x675/4ade80/ffffff?text=Beach+Cleanup+Banner' : placeholderUrl };
    }
  } catch (error) {
    console.error('Error in generateEventImage flow:', error);
    // Return a placeholder image on error
    const placeholderUrl = input.format === 'banner'
      ? 'https://placehold.co/1200x675/4ade80/ffffff?text=Beach+Cleanup+Banner'
      : 'https://placehold.co/800x1000/4ade80/ffffff?text=Beach+Cleanup+Poster';
    return { imageDataUri: placeholderUrl };
  }
}
