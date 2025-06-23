// This file is machine-generated - edit with care!

'use server';

/**
 * @fileOverview AI tool helps admins automatically generate social media content (fliers, captions, posts) based on clean-up event data.
 *
 * - generateSocialMediaPost - A function that handles the generation of social media content for clean-up events.
 * - GenerateSocialMediaPostInput - The input type for the generateSocialMediaPost function.
 * - GenerateSocialMediaPostOutput - The return type for the generateSocialMediaPost function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateSocialMediaPostInputSchema = z.object({
  eventName: z.string().describe('The name of the clean-up event.'),
  eventDate: z.string().describe('The date of the clean-up event (e.g., YYYY-MM-DD).'),
  eventLocation: z.string().describe('The location of the clean-up event.'),
  eventDescription: z.string().describe('A brief description of the clean-up event.'),
  targetAudience: z.string().describe('The target audience for the social media post (e.g., families, students, local residents).'),
  callToAction: z.string().describe('The desired call to action (e.g., register now, learn more, spread the word).'),
  desiredTone: z.string().describe('The desired tone of the social media post (e.g., informative, urgent, friendly).'),
});

export type GenerateSocialMediaPostInput = z.infer<typeof GenerateSocialMediaPostInputSchema>;

const GenerateSocialMediaPostOutputSchema = z.object({
  socialMediaPost: z.string().describe('The generated social media post content.'),
});

export type GenerateSocialMediaPostOutput = z.infer<typeof GenerateSocialMediaPostOutputSchema>;

const prompt = ai.definePrompt({
  name: 'generateSocialMediaPostPrompt',
  input: {schema: GenerateSocialMediaPostInputSchema},
  output: {schema: GenerateSocialMediaPostOutputSchema},
  prompt: `You are a social media expert specializing in creating engaging content for environmental clean-up events.

  Based on the information provided, generate a social media post that promotes the event and encourages participation.
  Consider the target audience, desired tone, and call to action to create a compelling message.

  Event Name: {{{eventName}}}
  Event Date: {{{eventDate}}}
  Event Location: {{{eventLocation}}}
  Event Description: {{{eventDescription}}}
  Target Audience: {{{targetAudience}}}
  Call to Action: {{{callToAction}}}
  Desired Tone: {{{desiredTone}}}

  Social Media Post:`, 
});

export const generateSocialMediaPostFlow = ai.defineFlow(
  {
    name: 'generateSocialMediaPostFlow',
    inputSchema: GenerateSocialMediaPostInputSchema,
    outputSchema: GenerateSocialMediaPostOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
