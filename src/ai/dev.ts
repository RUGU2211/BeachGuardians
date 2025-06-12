
import { config } from 'dotenv';
config();

import '@/ai/flows/suggest-engagement-message.ts';
import '@/ai/flows/summarize-cleanup-event.ts';
import '@/ai/flows/generate-social-media-post.ts';
import '@/ai/flows/generate-event-image-flow.ts';
import '@/ai/flows/generate-hero-image-flow.ts'; // Added new flow

