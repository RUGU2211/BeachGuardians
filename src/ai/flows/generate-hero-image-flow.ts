'use server';
/**
 * @fileOverview AI flow to generate a hero image based on a prompt.
 *
 * - generateHeroImage - A function that handles hero image generation.
 * - GenerateHeroImageInput - The input type for the generateHeroImage function.
 * - GenerateHeroImageOutput - The return type for the generateHeroImage function.
 */

import { generateEventImage } from '@/lib/dalle';
import {z} from 'genkit';

const GenerateHeroImageInputSchema = z.object({
  eventName: z.string().describe("The name of the event."),
  eventDescription: z.string().describe("A brief description of the event."),
  style: z.string().describe("The desired artistic style for the poster (e.g., modern, vintage, colorful)."),
  format: z.enum(["poster", "banner"]).default("poster").describe("The desired format: 'poster' (portrait) or 'banner' (landscape)."),
});
export type GenerateHeroImageInput = z.infer<typeof GenerateHeroImageInputSchema>;

const GenerateHeroImageOutputSchema = z.object({
  imageDataUri: z.string().describe("The generated image, as a URL."),
});
export type GenerateHeroImageOutput = z.infer<typeof GenerateHeroImageOutputSchema>;

export async function generateHeroImage(input: GenerateHeroImageInput): Promise<GenerateHeroImageOutput> {
  // Build the prompt
  const aspect = input.format === 'banner' ? 'landscape banner (16:9)' : 'portrait poster (4:5)';
  const prompt = `
    Create a high-quality, visually striking event ${input.format} for a beach cleanup event.
    Event Name: "${input.eventName}"
    Description: "${input.eventDescription}"
    Artistic Style: ${input.style}, vibrant, hopeful, and inspiring.
    Format: ${aspect}
    The image should be in a ${aspect} aspect ratio, suitable for use on social media.
    Do NOT include any text or writing.
    Focus on powerful, inspiring imagery: clean beaches, volunteers in action, marine life, and a hopeful, vibrant atmosphere.
  `;
  const imageUrl = await generateEventImage({ prompt, format: input.format });
  return { imageDataUri: imageUrl };
}
