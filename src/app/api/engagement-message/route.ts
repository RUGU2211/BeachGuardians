import { suggestEngagementMessageFlow } from '@/ai/flows/suggest-engagement-message';
import { appRoute } from '@genkit-ai/next';

export const POST = appRoute(suggestEngagementMessageFlow); 