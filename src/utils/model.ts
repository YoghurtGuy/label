import { GoogleGenAI } from "@google/genai";

import { env } from "@/env";
import { urlToGenerativePart } from "@/utils/image";

export interface OCRResult {
  text: string;
  model: string;
}

/**
 * 使用 Gemini 进行 OCR 识别
 */
async function ocrWithGemini(
  imageUrl: string,
  prompt?: string,
): Promise<OCRResult> {
  const genAI = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY! });

  const imagePart = await urlToGenerativePart(imageUrl);
  const contents = [
    imagePart,
    { text: prompt ?? env.PROMPT ?? "识别图片中的文字" },
  ];

  const response = await genAI.models.generateContent({
    model: "gemini-2.5-flash",
    contents: contents,
  });

  if (!response.text) {
    throw new Error("Gemini 识别失败");
  }

  return {
    text: response.text,
    model: "Gemini",
  };
}

/**
 * 使用豆包模型进行 OCR 识别
 */
async function ocrWithDoubao(
  imageUrl: string,
  prompt?: string,
): Promise<OCRResult> {
  const response = await fetch(
    "https://ark.cn-beijing.volces.com/api/v3/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.DOUBAO_API_KEY}`,
      },
      body: JSON.stringify({
        model: env.DOUBAO_MODEL_NAME,
        thinking: {
          type: env.DOUBAO_IS_THINKING ? "enabled" : "disabled",
        },
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: imageUrl,
                },
              },
              {
                type: "text",
                text: prompt ?? env.PROMPT ?? "识别图片中的文字",
              },
            ],
          },
        ],
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `豆包 API 调用失败: ${response.status} ${response.statusText} - ${errorText}`,
    );
  }

  const data = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string;
      };
    }>;
  };

  if (!data.choices?.[0]?.message?.content) {
    throw new Error("豆包识别失败：未返回有效内容");
  }

  return {
    text: data.choices[0].message.content,
    model: "豆包",
  };
}

/**
 * 自动选择可用的模型进行 OCR 识别
 * 优先级：GEMINI_API_KEY > DOUBAO_API_KEY
 */
export async function performOCR(
  imageUrl: string,
  prompt?: string,
): Promise<OCRResult> {
  if (env.GEMINI_API_KEY) {
    return ocrWithGemini(imageUrl, prompt);
  } else if (env.DOUBAO_API_KEY) {
    return ocrWithDoubao(imageUrl, prompt);
  } else {
    throw new Error(
      "未配置任何可用的 API Key (GEMINI_API_KEY 或 DOUBAO_API_KEY)",
    );
  }
}
