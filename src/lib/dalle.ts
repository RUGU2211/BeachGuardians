// Vertex AI Imagen 3 for image generation using REST API with API Key
// Using the same project as Firebase for consistency
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT_ID || "shoreline-tzs9g-47d06";
const LOCATION = process.env.GOOGLE_CLOUD_LOCATION || "us-central1";
const MODEL = "imagen-3.0-generate-001";
const VERTEX_AI_API_KEY = process.env.VERTEX_AI_API_KEY || process.env.GOOGLE_CLOUD_API_KEY;

export async function generateEventImage({ prompt, format = 'poster' }: { prompt: string; format?: 'poster' | 'banner' }): Promise<string | null> {
  // Return null if Vertex AI API key is not configured
  if (!VERTEX_AI_API_KEY) {
    console.warn('Vertex AI API key not configured. Skipping image generation.');
    return null;
  }

  try {
    console.log('[IMAGEN] Generating using Vertex AI Imagen 3...');
    console.log('[IMAGEN] Format:', format);
    console.log('[IMAGEN] Project:', PROJECT_ID, 'Location:', LOCATION);
    
    // Vertex AI Imagen API endpoint using API key
    // Using the Generative AI API endpoint format with API key (similar to Gemini API)
    // Try both endpoint formats
    let apiUrl = `https://aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL}:predict?key=${VERTEX_AI_API_KEY}`;
    
    // Alternative endpoint format (if the above doesn't work)
    // const apiUrl = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL}:predict?key=${VERTEX_AI_API_KEY}`;

    // Request body for Imagen 3
    const requestBody = {
      instances: [{
        prompt: prompt
      }],
      parameters: {
        sampleCount: 1,
        aspectRatio: format === 'banner' ? '16:9' : '1:1',
        safetyFilterLevel: "block_some",
        personGeneration: "allow_all",
      }
    };

    console.log('[IMAGEN] Calling Vertex AI Imagen API...');

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[IMAGEN] API Error:', errorText);
      console.error('[IMAGEN] Response status:', response.status);
      return null;
    }

    const data = await response.json();
    console.log('[IMAGEN] Response received:', Object.keys(data));
    
    // Extract image from response
    // Response format: { predictions: [{ bytesBase64Encoded: "..." }] }
    if (data.predictions && data.predictions.length > 0) {
      const prediction = data.predictions[0];
      
      // Check for base64 encoded image
      if (prediction.bytesBase64Encoded) {
        console.log('[IMAGEN] Found base64 image');
        return `data:image/png;base64,${prediction.bytesBase64Encoded}`;
      }
      
      // Alternative: Check for image URL
      if (prediction.imageUrl) {
        console.log('[IMAGEN] Found image URL');
        return prediction.imageUrl;
      }
    }

    console.warn('[IMAGEN] Unexpected response format:', JSON.stringify(data).substring(0, 500));
    return null;
    
  } catch (error: any) {
    console.error('[IMAGEN] Error generating event image:', error);
    if (error?.response) {
      console.error('[IMAGEN] API Error Response:', error.response);
    }
    if (error?.message) {
      console.error('[IMAGEN] Error Message:', error.message);
    }
    if (error?.stack) {
      console.error('[IMAGEN] Error Stack:', error.stack.substring(0, 500));
    }
    return null;
  }
}
