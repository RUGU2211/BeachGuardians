
'use server';
/**
 * @fileOverview AI flow to generate text for a certificate of participation.
 *
 * - generateCertificateText - A function that handles certificate text generation.
 * - GenerateCertificateTextInput - The input type for the function.
 * - GenerateCertificateTextOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateCertificateTextInputSchema = z.object({
  volunteerName: z.string().describe('The name of the volunteer receiving the certificate.'),
  eventName: z.string().describe('The name of the event the volunteer participated in.'),
  eventDate: z.string().describe('The date of the event (e.g., YYYY-MM-DD).'),
});
export type GenerateCertificateTextInput = z.infer<typeof GenerateCertificateTextInputSchema>;

const GenerateCertificateTextOutputSchema = z.object({
  certificateText: z.string().describe('The generated text for the certificate.'),
});
export type GenerateCertificateTextOutput = z.infer<typeof GenerateCertificateTextOutputSchema>;

export async function generateCertificateText(input: GenerateCertificateTextInput): Promise<GenerateCertificateTextOutput> {
  const hasGemini = !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
  if (hasGemini) {
    try {
      return await generateCertificateTextFlow(input);
    } catch (e) {
      console.warn('Genkit certificate generation failed; using fallback.', e);
    }
  }

  const certificateText = `This certificate is proudly presented to ${input.volunteerName} in recognition of their dedicated participation in the ${input.eventName} held on ${input.eventDate}. Your commitment to protecting our environment is highly valued. Thank you for making a difference!

[Signature of Organizer] — BeachGuardians`;

  return { certificateText };
}

const prompt = ai.definePrompt({
  name: 'generateCertificateTextPrompt',
  input: {schema: GenerateCertificateTextInputSchema},
  output: {schema: GenerateCertificateTextOutputSchema},
  prompt: `You are an AI assistant tasked with generating text for a certificate of participation.

  Create a short, congratulatory certificate text for a volunteer.
  The text should acknowledge their participation in a specific environmental cleanup event.

  Volunteer Name: {{{volunteerName}}}
  Event Name: {{{eventName}}}
  Event Date: {{{eventDate}}}

  The text should be formal yet appreciative, highlighting their contribution to environmental protection.
  Include a placeholder for a signature line like "[Signature of Organizer]".

  Example structure:
  "This certificate is proudly presented to [Volunteer Name] in recognition of their dedicated participation in the [Event Name] held on [Event Date]. Your commitment to protecting our environment is highly valued. Thank you for making a difference! [Signature of Organizer] - BeachGuardians"

  Generate the certificate text:`,
});

const generateCertificateTextFlow = ai.defineFlow(
  {
    name: 'generateCertificateTextFlow',
    inputSchema: GenerateCertificateTextInputSchema,
    outputSchema: GenerateCertificateTextOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error('Certificate text generation failed to produce output.');
    }
    return output;
  }
);
