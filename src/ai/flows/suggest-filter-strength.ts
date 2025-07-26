'use server';

/**
 * @fileOverview This file defines a Genkit flow for suggesting filter strengths based on the uploaded image.
 *
 * - suggestFilterStrength - A function that handles the process of suggesting filter strengths.
 * - SuggestFilterStrengthInput - The input type for the suggestFilterStrength function.
 * - SuggestFilterStrengthOutput - The return type for the suggestFilterStrength function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestFilterStrengthInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo to be converted into sketch, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  filterType: z.enum(['pencil', 'charcoal']).describe('The type of sketch filter to apply.'),
});
export type SuggestFilterStrengthInput = z.infer<typeof SuggestFilterStrengthInputSchema>;

const SuggestFilterStrengthOutputSchema = z.object({
  suggestedStrength: z
    .number()
    .min(0)
    .max(1)
    .describe('The suggested strength of the filter, between 0 and 1.'),
  stylisticGuidance: z
    .string()
    .describe('Stylistic guidance for the user based on the image content.'),
});
export type SuggestFilterStrengthOutput = z.infer<typeof SuggestFilterStrengthOutputSchema>;

export async function suggestFilterStrength(input: SuggestFilterStrengthInput): Promise<SuggestFilterStrengthOutput> {
  return suggestFilterStrengthFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestFilterStrengthPrompt',
  input: {schema: SuggestFilterStrengthInputSchema},
  output: {schema: SuggestFilterStrengthOutputSchema},
  prompt: `You are an AI assistant that suggests the optimal strength for a given sketch filter based on an uploaded image. You also provide stylistic guidance to the user.

  Consider the composition, lighting, and content of the image to suggest a filter strength between 0 and 1. A value closer to 0 indicates a subtle effect, while a value closer to 1 indicates a strong effect.

  Also provide stylistic guidance, which are short tips (max 2 sentences) tailored to the image and filter, to help the user create the most visually appealing sketch.

  Here is the image:
  {{media url=photoDataUri}}

  Filter Type: {{filterType}}
  `,
});

const suggestFilterStrengthFlow = ai.defineFlow(
  {
    name: 'suggestFilterStrengthFlow',
    inputSchema: SuggestFilterStrengthInputSchema,
    outputSchema: SuggestFilterStrengthOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
