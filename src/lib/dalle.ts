import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateEventImage() {
  const size = "1024x1024";
  const prompt = "A beautiful beach with volunteers cleaning, digital art, no text";
  const response = await openai.images.generate({
    prompt,
    n: 1,
    size,
    response_format: "url",
  });
  return response.data[0].url;
} 