const API_URL = '/api/groq/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';
const VISION_MODEL = 'qwen/qwen3.6-27b';

export function groqKey(): string {
  return import.meta.env.VITE_GROQ_API_KEY ?? '';
}

export async function groqChat(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
): Promise<string> {
  const key = groqKey();
  if (!key) throw new Error('VITE_GROQ_API_KEY not set');

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ model: MODEL, messages, temperature: 0 }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Groq API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  return data.choices[0].message.content as string;
}

export interface FoodNutrition {
  cal: number;
  protein: number;
  fat: number;
  carbs: number;
}

const NUTRITION_SYSTEM = `Ты помощник-диетолог. Пользователь назовёт продукт питания.
Верни JSON-объект с нутриентами на 100 граммов:
{"cal":число,"protein":число,"fat":число,"carbs":число}
Отвечай ТОЛЬКО JSON-объектом, без пояснений.`;

export async function autoFillNutrition(foodName: string): Promise<FoodNutrition> {
  const raw = await groqChat([
    { role: 'system', content: NUTRITION_SYSTEM },
    { role: 'user', content: foodName },
  ]);
  const json = raw.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '');
  return JSON.parse(json) as FoodNutrition;
}

export interface ParsedFoodEntry {
  name: string;
  grams: number;
  cal: number;
  protein: number;
  fat: number;
  carbs: number;
}

const PARSE_SYSTEM = `Ты помощник-диетолог. Пользователь напишет, что он съел.
Верни JSON-массив объектов. Каждый объект — один продукт:
{"name":"название","grams":число,"cal":число,"protein":число,"fat":число,"carbs":число}
где cal, protein, fat, carbs — уже пересчитаны на указанное количество граммов.
Если граммы не указаны — используй типичную порцию.
Отвечай ТОЛЬКО JSON-массивом, без пояснений.`;

export async function parseFoodText(text: string): Promise<ParsedFoodEntry[]> {
  const raw = await groqChat([
    { role: 'system', content: PARSE_SYSTEM },
    { role: 'user', content: text },
  ]);
  const json = raw.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '');
  return JSON.parse(json) as ParsedFoodEntry[];
}

export async function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const MAX = 1024;
      const scale = Math.min(1, MAX / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.onerror = reject;
    img.src = url;
  });
}

const PHOTO_PROMPT = `Определи все блюда и продукты на фото, оцени вес порции и КБЖУ.
Верни JSON-массив объектов, каждый — один продукт:
{"name":"название","grams":число,"cal":число,"protein":число,"fat":число,"carbs":число}
где cal, protein, fat, carbs — уже пересчитаны на оценённые граммы.
Отвечай ТОЛЬКО JSON-массивом, без пояснений.`;

export async function parseFoodPhoto(dataUrl: string): Promise<ParsedFoodEntry[]> {
  const key = groqKey();
  if (!key) throw new Error('VITE_GROQ_API_KEY not set');

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: VISION_MODEL,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: dataUrl } },
            { type: 'text', text: PHOTO_PROMPT },
          ],
        },
      ],
      temperature: 0,
    }),
  });

  if (res.status === 429) throw new Error('Слишком много запросов — подожди минуту и попробуй снова');
  if (!res.ok) throw new Error(`Groq API error ${res.status}: ${await res.text()}`);

  const data = await res.json();
  const raw = (data.choices[0].message.content as string).trim()
    .replace(/<think>[\s\S]*?<\/think>\s*/i, '')
    .replace(/^```json\n?/, '').replace(/\n?```$/, '');
  return JSON.parse(raw) as ParsedFoodEntry[];
}
