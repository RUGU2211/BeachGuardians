'use server';

/**
 * @fileOverview A cleanup event summarization AI agent.
 *
 * - summarizeCleanupEvent - A function that handles the cleanup event summarization process.
 * - SummarizeCleanupEventInput - The input type for the summarizeCleanupEvent function.
 * - SummarizeCleanupEventOutput - The return type for the summarizeCleanupEvent function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeCleanupEventInputSchema = z.object({
  eventName: z.string().describe('The name of the cleanup event.'),
  location: z.string().describe('The location of the cleanup event.'),
  date: z.string().describe('The date of the cleanup event (YYYY-MM-DD).'),
  totalVolunteers: z.number().describe('The total number of volunteers who participated.'),
  totalWasteCollectedKg: z.number().describe('The total weight of waste collected in kilograms.'),
  typesOfWasteCollected: z.string().describe('A comma separated list of the types of waste collected.'),
  notableObservations: z.string().describe('Any notable observations during the cleanup event.'),
});
export type SummarizeCleanupEventInput = z.infer<typeof SummarizeCleanupEventInputSchema>;

const SummarizeCleanupEventOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the cleanup event.'),
});
export type SummarizeCleanupEventOutput = z.infer<typeof SummarizeCleanupEventOutputSchema>;

export async function summarizeCleanupEvent(input: SummarizeCleanupEventInput): Promise<SummarizeCleanupEventOutput> {
  const hasGemini = !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
  if (hasGemini) {
    try {
      return await summarizeCleanupEventFlow(input);
    } catch (e) {
      console.warn('Genkit cleanup summary failed; using fallback.', e);
    }
  }

  const summary = `${input.eventName} — ${input.location} (${input.date})
Volunteers: ${input.totalVolunteers}
Total Waste Collected: ${input.totalWasteCollectedKg} kg
Types of Waste: ${input.typesOfWasteCollected || 'N/A'}
Notable Observations: ${input.notableObservations || 'None reported'}

This event showcased strong community engagement and tangible environmental impact. Continued outreach and education will help reduce waste and strengthen local stewardship.`;

  return { summary };
}

const prompt = ai.definePrompt({
  name: 'summarizeCleanupEventPrompt',
  input: {schema: SummarizeCleanupEventInputSchema},
  output: {schema: SummarizeCleanupEventOutputSchema},
  prompt: `You are an AI assistant specializing in creating summaries of cleanup events.

  Based on the following information, generate a concise summary of the cleanup event that can be used in impact reports and shared with stakeholders.

  Event Name: {{{eventName}}}
  Location: {{{location}}}
  Date: {{{date}}}
  Total Volunteers: {{{totalVolunteers}}}
  Total Waste Collected (kg): {{{totalWasteCollectedKg}}}
  Types of Waste Collected: {{{typesOfWasteCollected}}}
  Notable Observations: {{{notableObservations}}}
  `,
});

const summarizeCleanupEventFlow = ai.defineFlow(
  {
    name: 'summarizeCleanupEventFlow',
    inputSchema: SummarizeCleanupEventInputSchema,
    outputSchema: SummarizeCleanupEventOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
