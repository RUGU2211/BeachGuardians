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
  lastParticipationDate: z.string().describe('Last participation date in YYYY-MM-DD format.'),
  totalEventsAttended: z.number().describe('Total number of events the volunteer has attended.'),
  preferredCommunicationStyle: z.enum(['friendly', 'professional', 'casual', 'motivational']).describe('Preferred communication style.'),
});
export type SuggestEngagementMessageInput = z.infer<typeof SuggestEngagementMessageInputSchema>;

const SuggestEngagementMessageOutputSchema = z.object({
  message: z.string().describe('A personalized engagement message for the volunteer.'),
});
export type SuggestEngagementMessageOutput = z.infer<typeof SuggestEngagementMessageOutputSchema>;

const prompt = ai.definePrompt({
  name: 'suggestEngagementMessagePrompt',
  input: {schema: SuggestEngagementMessageInputSchema},
  output: {schema: SuggestEngagementMessageOutputSchema},
  prompt: `You are an AI assistant that writes concise, supportive engagement messages to re-engage volunteers.

  Use the volunteer's name, last participation date, total events attended, and preferred communication style to craft a short message (4–6 sentences) that:
  - Appreciates their contributions
  - References the last participation date naturally
  - Encourages them to join upcoming efforts
  - Matches the preferred communication style

  Volunteer Name: {{{volunteerName}}}
  Last Participation Date: {{{lastParticipationDate}}}
  Total Events Attended: {{{totalEventsAttended}}}
  Preferred Communication Style: {{{preferredCommunicationStyle}}}

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

export async function suggestEngagementMessage(
  input: SuggestEngagementMessageInput
): Promise<SuggestEngagementMessageOutput> {
  const hasGemini = !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);

  if (hasGemini) {
    try {
      return await suggestEngagementMessageFlow(input);
    } catch (e) {
      console.warn('Genkit engagement message failed; using fallback.', e);
    }
  }

  const style = input.preferredCommunicationStyle;
  const stylePhrase = style ? `in a ${style} style` : 'in a friendly style';
  const attended = input.totalEventsAttended ?? 0;
  const lastDate = input.lastParticipationDate;
  const joinedTimes = attended === 1 ? '1 event' : `${attended} events`;
  const message = `Hi ${input.volunteerName},

Thank you for your contributions — you’ve joined ${joinedTimes}. Your last cleanup was on ${lastDate}.
We’d love to have you back for our upcoming efforts along the coast.
Your energy makes a real difference for our beaches and community.
If you’re up for it, we’ll share the next event details soon ${stylePhrase}.

— BeachGuardians`;

  return { message };
}
