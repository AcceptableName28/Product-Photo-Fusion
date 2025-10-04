import { GoogleGenAI, Modality, GenerateContentResponse, Type } from "@google/genai";

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = (error) => reject(error);
  });
};

export const generatePromptSuggestions = async (characterImageFile: File, productImageFile: File): Promise<string[]> => {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable not set");
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const characterBase64 = await fileToBase64(characterImageFile);
    const productBase64 = await fileToBase64(productImageFile);

    const prompt = `Analyze the following two images. Image 1 contains a character, and Image 2 contains a product. Based on your analysis, generate exactly 4 short, creative, and actionable prompt suggestions for how to combine them. The suggestions should be phrased as commands (e.g., "Make the character wear the [product]"). Return the suggestions as a JSON object with a single key "suggestions" containing an array of strings.`;
    
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
            parts: [
                { inlineData: { data: characterBase64, mimeType: characterImageFile.type } },
                { inlineData: { data: productBase64, mimeType: productImageFile.type } },
                { text: prompt },
            ],
        },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    suggestions: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                    },
                },
                required: ["suggestions"],
            },
        },
    });
    
    const jsonResponse = JSON.parse(response.text);
    return jsonResponse.suggestions || [];
};


export const generateFusedImage = async (characterImageFile: File, productImageFile: File, userPrompt: string): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const characterBase64 = await fileToBase64(characterImageFile);
  const productBase64 = await fileToBase64(productImageFile);

  const defaultInstruction = 'Make the character from the first image interact with or use the product from the second image.';
  const userInstruction = userPrompt && userPrompt.trim() !== '' ? userPrompt : defaultInstruction;

  const prompt = `You are an expert image editor. Your task is to realistically merge a product into a character's image.

**Goal:** ${userInstruction}

**Image 1 (Character Image):** This is the main subject and the base for the final image.
**Image 2 (Product Image):** This contains the product to be integrated with the character.

**Strict Rules:**
1.  **Combine:** Generate a new image where the character from Image 1 is interacting with or wearing the product from Image 2, as described in the goal.
2.  **Full Product Integration:** The *entire* product from Image 2 must be realistically integrated. **Do not just copy a logo, graphic, or texture from the product.** For example, if the goal is for the character to wear a t-shirt from Image 2, the final image must show the character wearing the *complete t-shirt* (including its color, shape, and fabric), not just the graphic from the t-shirt pasted onto their original clothing.
3.  **High-Fidelity Detail Transfer:** All visual details from the product in Image 2 must be transferred. This includes all graphics, logos, text, patterns, and textures. Ensure the final representation is a faithful and complete reproduction of the product's design.
4.  **Preserve Style:** The final image's artistic style, lighting, and overall aesthetic MUST exactly match the Character Image (Image 1).
5.  **Preserve Dimensions:** The final image MUST have the same dimensions and aspect ratio as the Character Image (Image 1).
6.  **No Additions:** Do not add any new elements, characters, or complex backgrounds. Only modify what is necessary to combine the character and product naturally.
`;


  const response: GenerateContentResponse = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        {
          inlineData: {
            data: characterBase64,
            mimeType: characterImageFile.type,
          },
        },
        {
          inlineData: {
            data: productBase64,
            mimeType: productImageFile.type,
          },
        },
        {
          text: prompt,
        },
      ],
    },
    config: {
      responseModalities: [Modality.IMAGE, Modality.TEXT],
    },
  });

  if (response.promptFeedback?.blockReason || response.candidates?.[0]?.finishReason === 'SAFETY') {
    throw new Error('SAFETY_POLICY_VIOLATION');
  }

  for (const part of response.candidates?.[0]?.content?.parts ?? []) {
    if (part.inlineData) {
      const base64ImageBytes: string = part.inlineData.data;
      const mimeType = part.inlineData.mimeType;
      return `data:${mimeType};base64,${base64ImageBytes}`;
    }
  }

  throw new Error("No image was generated. The model may have refused the prompt.");
};