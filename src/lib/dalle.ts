// Google Gemini 2.0 Flash API for image generation (No Vertex AI Required)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

export async function generateEventImage({ prompt, format = 'poster' }: { prompt: string; format?: 'poster' | 'banner' }): Promise<string | null> {
  // Return null if Gemini API key is not configured
  if (!GEMINI_API_KEY) {
    console.warn('Gemini API key not configured. Skipping image generation.');
    return null;
  }

  try {
    const apiKey = GEMINI_API_KEY;
    
    // Use Gemini 2.0 Flash Experimental for native image generation
    // Model: gemini-2.0-flash-exp (supports native image generation)
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;
    
    // Prepare the request payload for Gemini 2.0 Flash image generation
    const requestBody = {
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        responseModalities: ["IMAGE"], // Request image generation
        temperature: 0.7,
      }
    };

    console.log('[GEMINI IMAGE GEN] Calling Gemini 2.0 Flash for image generation...');
    console.log('[GEMINI IMAGE GEN] Format:', format, 'Model: gemini-2.0-flash-exp');

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[GEMINI IMAGE GEN] API Error:', errorText);
      console.error('[GEMINI IMAGE GEN] Response status:', response.status);
      return null;
    }

    const data = await response.json();
    console.log('[GEMINI IMAGE GEN] Response received:', Object.keys(data));
    
    // Extract image from Gemini 2.0 Flash response
    // Response format: { candidates: [{ content: { parts: [{ inlineData: { mimeType, data } }] } }] }
    if (data.candidates && data.candidates.length > 0) {
      const candidate = data.candidates[0];
      if (candidate.content && candidate.content.parts) {
        for (const part of candidate.content.parts) {
          // Check for inline image data
          if (part.inlineData) {
            const mimeType = part.inlineData.mimeType || 'image/png';
            const imageData = part.inlineData.data;
            if (imageData) {
              console.log('[GEMINI IMAGE GEN] Found inline image data');
              return `data:${mimeType};base64,${imageData}`;
            }
          }
          // Check for image URL
          if (part.url) {
            console.log('[GEMINI IMAGE GEN] Found image URL');
            return part.url;
          }
        }
      }
    }

    console.warn('[GEMINI IMAGE GEN] Unexpected response format:', JSON.stringify(data).substring(0, 500));
    return null;
  } catch (error: any) {
    console.error('[GEMINI IMAGE GEN] Error generating event image:', error);
    if (error?.message) {
      console.error('[GEMINI IMAGE GEN] Error Message:', error.message);
    }
    if (error?.stack) {
      console.error('[GEMINI IMAGE GEN] Error Stack:', error.stack.substring(0, 500));
    }
    return null;
  }
}
