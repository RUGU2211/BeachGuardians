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
  eventDate: z.string().optional().describe('The date of the event.'),
  eventLocation: z.string().optional().describe('The location of the event.'),
  format: z.enum(["poster", "banner"]).default("poster").describe("The desired format: 'poster' (portrait) or 'banner' (landscape)."),
  style: z.string().optional().describe('The artistic style (e.g., modern, vintage, charity, bold).'),
  colorScheme: z.string().optional().describe('The color scheme (e.g., blue-green, red-white, teal-yellow).'),
  designTheme: z.string().optional().describe('The design theme (e.g., charity, community, environmental).'),
  callToAction: z.string().optional().describe('The call to action text.'),
  additionalPrompt: z.string().optional().describe('Additional design details or specific elements to include.'),
});
export type GenerateEventImageInput = z.infer<typeof GenerateEventImageInputSchema>;

const GenerateEventImageOutputSchema = z.object({
  imageDataUri: z.string().describe("The generated image for the event, as a URL."),
});
export type GenerateEventImageOutput = z.infer<typeof GenerateEventImageOutputSchema>;

export async function generateEventImage(input: GenerateEventImageInput): Promise<GenerateEventImageOutput> {
  try {
    const aspect = input.format === 'banner' ? 'landscape banner (16:9 aspect ratio)' : 'portrait poster (4:5 aspect ratio, vertical orientation)';
    
    // Build comprehensive prompt for advanced charity-style poster
    const colorSchemeDescriptions: Record<string, string> = {
      'blue-green': 'ocean blue and vibrant green colors, representing water and nature',
      'red-white': 'bold red and clean white colors, creating strong visual impact',
      'teal-yellow': 'vibrant teal and warm yellow colors, energetic and uplifting',
      'orange-blue': 'warm orange and cool blue colors, creating dynamic contrast',
      'purple-pink': 'creative purple and pink colors, modern and inspiring',
      'earth-tones': 'natural earth tones like brown, beige, and green, organic feel',
      'gradient': 'smooth gradient transitions from light to dark, modern aesthetic'
    };

    const designThemeDescriptions: Record<string, string> = {
      'charity': 'professional charity/NGO poster style with emotional appeal, includes images of people, clear typography hierarchy, call-to-action buttons, contact information sections',
      'community': 'friendly community event style, warm and inviting, includes diverse people, community symbols',
      'environmental': 'nature-focused design with environmental symbols, green themes, nature imagery',
      'action': 'dynamic action-oriented design with movement, energy, active volunteers in motion',
      'elegant': 'sophisticated elegant design with refined typography, subtle colors, premium feel',
      'youth': 'youth-friendly energetic design with bold colors, fun elements, engaging visuals'
    };

    const styleDescriptions: Record<string, string> = {
      'modern': 'modern contemporary design with clean lines, bold typography, geometric shapes',
      'vintage': 'vintage retro style with classic typography, aged textures, nostalgic feel',
      'minimalist': 'minimalist design with lots of white space, simple elements, focused composition',
      'colorful': 'vibrant colorful design with multiple bright colors, energetic and eye-catching',
      'professional': 'professional corporate style with structured layout, clear hierarchy, business-like',
      'charity': 'charity/NGO poster style with emotional imagery, clear messaging, professional layout',
      'bold': 'bold impactful design with strong contrasts, large typography, powerful visuals'
    };

    const colorDesc = colorSchemeDescriptions[input.colorScheme || 'blue-green'] || 'vibrant colors';
    const themeDesc = designThemeDescriptions[input.designTheme || 'charity'] || 'professional charity poster style';
    const styleDesc = styleDescriptions[input.style || 'modern'] || 'modern design';

    // Format date if provided
    let dateText = '';
    if (input.eventDate) {
      try {
        const date = new Date(input.eventDate);
        dateText = date.toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
      } catch {
        dateText = input.eventDate;
      }
    }

    // Build comprehensive prompt optimized for DALL-E 3
    // DALL-E 3 cannot generate readable text, so we focus on visual design elements
    let prompt = `Create a professional charity/NGO event poster design for a beach cleanup event. `;
    prompt += `${aspect} format, ${styleDesc} style. `;
    prompt += `Color palette: ${colorDesc}. `;
    prompt += `Design theme: ${themeDesc}. `;
    
    prompt += `\nVisual Composition:\n`;
    prompt += `- Professional poster layout with distinct visual sections and zones\n`;
    prompt += `- Large title area at the top (visual space for text, no actual text)\n`;
    prompt += `- Central focal point with inspiring imagery\n`;
    prompt += `- Bottom section for event details (visual space for date/location info)\n`;
    prompt += `- Side panels or decorative elements framing the composition\n`;
    
    prompt += `\nVisual Elements to Include:\n`;
    prompt += `- Diverse volunteers actively cleaning the beach, smiling and engaged\n`;
    prompt += `- Clean, pristine beach environment with clear blue water\n`;
    prompt += `- Marine life like dolphins, sea turtles, or fish swimming in clean water\n`;
    prompt += `- Community symbols: hands joining together, heart shapes, globe/world map elements\n`;
    prompt += `- Environmental symbols: leaves, waves, sun, nature elements\n`;
    prompt += `- Geometric shapes and decorative borders in ${colorDesc} colors\n`;
    prompt += `- Visual hierarchy with large central image and smaller supporting elements\n`;
    
    if (input.eventLocation) {
      prompt += `- Subtle visual reference to "${input.eventLocation}" location (beach scenery, landmarks)\n`;
    }
    
    prompt += `\nDesign Style Details:\n`;
    prompt += `- ${styleDesc} aesthetic\n`;
    prompt += `- ${colorDesc} color scheme throughout\n`;
    prompt += `- Professional charity poster layout similar to NGO event posters\n`;
    prompt += `- Balanced composition with clear visual flow\n`;
    prompt += `- High-quality, print-ready design\n`;
    prompt += `- Inspiring and hopeful atmosphere\n`;
    
    if (input.additionalPrompt) {
      prompt += `\nAdditional Visual Elements:\n`;
      prompt += `- ${input.additionalPrompt}\n`;
    }
    
    prompt += `\nImportant: Create a complete, professional poster design with all visual elements, graphics, and layout structure. The design should have clear sections for title, main imagery, and event details. Use ${colorDesc} colors and ${styleDesc} style. Make it visually striking and professional, similar to high-quality charity/NGO event posters. Focus on powerful visual storytelling through imagery, colors, and composition.`;

    console.log('[POSTER GENERATION] Starting image generation with prompt length:', prompt.length);
    console.log('[POSTER GENERATION] Format:', input.format, 'Style:', input.style, 'Color:', input.colorScheme, 'Theme:', input.designTheme);
    
    const imageUrl = await generateDalleEventImage({ prompt, format: input.format });
    
    if (imageUrl) {
      console.log('[POSTER GENERATION] Successfully generated image:', imageUrl.substring(0, 100) + '...');
      return { imageDataUri: imageUrl };
    } else {
      // Log why generation failed
      console.warn('[POSTER GENERATION] Image generation returned null. Check if Vertex AI credentials are configured and Imagen API is enabled.');
      // Return a placeholder image if generation fails or API key is not available
      const placeholderUrl = "https://placehold.co/800x1000/4ade80/ffffff?text=Beach+Cleanup+Poster";
      return { imageDataUri: input.format === 'banner' ? 'https://placehold.co/1200x675/4ade80/ffffff?text=Beach+Cleanup+Banner' : placeholderUrl };
    }
  } catch (error: any) {
    console.error('[POSTER GENERATION] Error in generateEventImage flow:', error);
    if (error?.message) {
      console.error('[POSTER GENERATION] Error message:', error.message);
    }
    if (error?.stack) {
      console.error('[POSTER GENERATION] Error stack:', error.stack);
    }
    // Return a placeholder image on error
    const placeholderUrl = input.format === 'banner'
      ? 'https://placehold.co/1200x675/4ade80/ffffff?text=Beach+Cleanup+Banner'
      : 'https://placehold.co/800x1000/4ade80/ffffff?text=Beach+Cleanup+Poster';
    return { imageDataUri: placeholderUrl };
  }
}
