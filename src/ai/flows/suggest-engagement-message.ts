'use server';

/**
 * @fileOverview Generates personalized volunteer engagement messages based on past contributions and upcoming events.
 *
 * - suggestEngagementMessage - A function that generates personalized volunteer engagement messages.
 * - SuggestEngagementMessageInput - The input type for the suggestEngagementMessage function.
 * - SuggestEngagementMessageOutput - The return type for the suggestEngagementMessage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestEngagementMessageInputSchema = z.object({
  volunteerName: z.string().describe('The name of the volunteer.'),
  pastContributions: z.string().describe('A summary of the volunteer\'s past contributions, including events attended and waste collected.'),
  upcomingEvents: z.string().describe('A description of upcoming events that the volunteer might be interested in.'),
  preferredTone: z.string().optional().describe('The preferred tone of the message (e.g., friendly, formal, enthusiastic).'),
});
export type SuggestEngagementMessageInput = z.infer<typeof SuggestEngagementMessageInputSchema>;

const SuggestEngagementMessageOutputSchema = z.object({
  engagementMessage: z.string().describe('A personalized engagement message for the volunteer.'),
});
export type SuggestEngagementMessageOutput = z.infer<typeof SuggestEngagementMessageOutputSchema>;

const prompt = ai.definePrompt({
  name: 'suggestEngagementMessagePrompt',
  input: {schema: SuggestEngagementMessageInputSchema},
  output: {schema: SuggestEngagementMessageOutputSchema},
  prompt: `You are an AI assistant designed to create personalized engagement messages for volunteers.

  Based on the volunteer's past contributions, upcoming events, and preferred tone, generate a message that encourages continued participation.

  Volunteer Name: {{{volunteerName}}}
  Past Contributions: {{{pastContributions}}}
  Upcoming Events: {{{upcomingEvents}}}
  Preferred Tone: {{{preferredTone}}}

  Engagement Message:`,
});

export const suggestEngagementMessageFlow = ai.defineFlow(
  {
    name: 'suggestEngagementMessageFlow',
    inputSchema: SuggestEngagementMessageInputSchema,
    outputSchema: SuggestEngagementMessageOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
