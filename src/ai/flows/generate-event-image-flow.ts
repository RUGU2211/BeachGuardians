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
  const aspect = input.format === 'banner' ? 'landscape banner (16:9)' : 'portrait poster (4:5)';
  const prompt = `
    Create a high-quality, visually appealing event ${input.format} for a community event focused on environmental cleanup or local gathering.
    Event Name: "${input.eventName}"
    Event Description: "${input.eventDescription}"
    Artistic Style: vibrant, hopeful, and inspiring.
    Format: ${aspect}
    The image should be in a ${aspect} aspect ratio, suitable for use on social media.
    Do NOT include any text or writing.
    Evoke themes of nature, community spirit, and positive action.
  `;
  const imageUrl = await generateDalleEventImage({ prompt, format: input.format });
  return { imageDataUri: imageUrl };
}
