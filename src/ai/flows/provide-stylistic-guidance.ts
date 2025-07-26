// This file is machine-generated - edit at your own risk.

'use server';

/**
 * @fileOverview Provides stylistic guidance and filter suggestions based on the content of the uploaded image.
 *
 * - provideStylisticGuidance - A function that provides stylistic guidance.
 * - ProvideStylisticGuidanceInput - The input type for the provideStylisticGuidance function.
 * - ProvideStylisticGuidanceOutput - The return type for the provideStylisticGuidance function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ProvideStylisticGuidanceInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo to provide stylistic guidance for, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ProvideStylisticGuidanceInput = z.infer<typeof ProvideStylisticGuidanceInputSchema>;

const ProvideStylisticGuidanceOutputSchema = z.object({
  suggestedFilter: z.string().describe('The suggested filter to use for the image.'),
  guidance: z.string().describe('Stylistic guidance for the user.'),
});
export type ProvideStylisticGuidanceOutput = z.infer<typeof ProvideStylisticGuidanceOutputSchema>;

export async function provideStylisticGuidance(
  input: ProvideStylisticGuidanceInput
): Promise<ProvideStylisticGuidanceOutput> {
  return provideStylisticGuidanceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'provideStylisticGuidancePrompt',
  input: {schema: ProvideStylisticGuidanceInputSchema},
  output: {schema: ProvideStylisticGuidanceOutputSchema},
  prompt: `You are an AI assistant designed to provide stylistic guidance for images.

  Based on the content of the image, suggest a suitable sketch filter (e.g., pencil, charcoal, watercolor) and provide stylistic guidance to help the user explore different artistic interpretations.

  Consider the image's composition, subject matter, and overall aesthetic.

  Here is the image: {{media url=photoDataUri}}

  Respond with a JSON object that contains the suggested filter and stylistic guidance.
`,
});

const provideStylisticGuidanceFlow = ai.defineFlow(
  {
    name: 'provideStylisticGuidanceFlow',
    inputSchema: ProvideStylisticGuidanceInputSchema,
    outputSchema: ProvideStylisticGuidanceOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
