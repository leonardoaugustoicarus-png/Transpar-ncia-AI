
import { GoogleGenAI } from "@google/genai";

const API_KEY = process.env.API_KEY || "";

export const removeBackground = async (base64Image: string): Promise<string> => {
  const cleanBase64 = base64Image.split(',')[1] || base64Image;
  const mimeType = base64Image.split(';')[0].split(':')[1] || 'image/png';

  const ai = new GoogleGenAI({ apiKey: API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType: mimeType,
            },
          },
          {
            text: "Extract the main subject from this image with professional precision. Remove the entire background and make it fully transparent (use the alpha channel). Ensure that edges, especially fine details like hair, fur, or complex silhouettes, are clean and sharp. Output only the PNG image with transparency. Do not include any background colors, text, or logos.",
          },
        ],
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }

    throw new Error("Não foi possível processar a imagem. Tente uma imagem mais clara.");
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};
