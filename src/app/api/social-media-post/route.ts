import { generateSocialMediaPostFlow } from '@/ai/flows/generate-social-media-post';
import { appRoute } from '@genkit-ai/next';
 
export const POST = appRoute(generateSocialMediaPostFlow); 