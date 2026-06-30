import type { Food } from './types';

export function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function defaultFoods(): Food[] {
  return [
    {
      id: uid(), name: 'Куриная грудь (варёная)', cal: 165, protein: 31, fat: 3.6, carbs: 0,
      portions: [{ label: '½ грудки', grams: 80 }, { label: '1 грудка', grams: 160 }],
    },
    {
      id: uid(), name: 'Рис (варёный)', cal: 130, protein: 2.7, fat: 0.3, carbs: 28,
      portions: [{ label: 'маленькая порция', grams: 150 }, { label: 'большая порция', grams: 250 }],
    },
    {
      id: uid(), name: 'Гречка (варёная)', cal: 110, protein: 4, fat: 1, carbs: 21,
      portions: [{ label: 'порция', grams: 200 }],
    },
    {
      id: uid(), name: 'Овсянка (варёная)', cal: 88, protein: 3, fat: 1.5, carbs: 15,
      portions: [{ label: 'тарелка', grams: 250 }],
    },
    {
      id: uid(), name: 'Яйцо куриное', cal: 155, protein: 13, fat: 11, carbs: 1.1,
      portions: [{ label: '1 шт (S)', grams: 50 }, { label: '1 шт (M)', grams: 60 }, { label: '1 шт (L)', grams: 70 }],
    },
    {
      id: uid(), name: 'Молоко 2.5%', cal: 52, protein: 2.8, fat: 2.5, carbs: 4.7,
      portions: [{ label: 'стакан', grams: 200 }, { label: 'кружка', grams: 250 }],
    },
    {
      id: uid(), name: 'Творог 5%', cal: 121, protein: 17, fat: 5, carbs: 1.8,
      portions: [{ label: 'пачка 200г', grams: 200 }],
    },
    {
      id: uid(), name: 'Хлеб ржаной', cal: 259, protein: 6.6, fat: 1.2, carbs: 48,
      portions: [{ label: '1 кусок', grams: 30 }, { label: '2 куска', grams: 60 }],
    },
    { id: uid(), name: 'Картофель (варёный)', cal: 82, protein: 2, fat: 0.1, carbs: 17 },
    {
      id: uid(), name: 'Говядина (тушёная)', cal: 218, protein: 25, fat: 13, carbs: 0,
      portions: [{ label: 'порция', grams: 150 }],
    },
    {
      id: uid(), name: 'Лосось (запечённый)', cal: 206, protein: 20, fat: 13, carbs: 0,
      portions: [{ label: 'кусок', grams: 130 }],
    },
    {
      id: uid(), name: 'Яблоко', cal: 52, protein: 0.3, fat: 0.2, carbs: 14,
      portions: [{ label: 'маленькое', grams: 100 }, { label: 'среднее', grams: 150 }, { label: 'большое', grams: 200 }],
    },
    {
      id: uid(), name: 'Банан', cal: 89, protein: 1.1, fat: 0.3, carbs: 23,
      portions: [{ label: 'маленький', grams: 80 }, { label: 'средний', grams: 120 }],
    },
    {
      id: uid(), name: 'Апельсин', cal: 47, protein: 0.9, fat: 0.1, carbs: 12,
      portions: [{ label: '1 шт', grams: 150 }],
    },
    { id: uid(), name: 'Огурец', cal: 15, protein: 0.7, fat: 0.1, carbs: 2.5 },
    { id: uid(), name: 'Помидор', cal: 18, protein: 0.9, fat: 0.2, carbs: 3.9 },
    {
      id: uid(), name: 'Масло подсолнечное', cal: 884, protein: 0, fat: 100, carbs: 0,
      portions: [{ label: '1 ст. л.', grams: 10 }],
    },
    {
      id: uid(), name: 'Греческий йогурт', cal: 59, protein: 10, fat: 0.4, carbs: 3.6,
      portions: [{ label: 'стакан', grams: 150 }],
    },
    {
      id: uid(), name: 'Миндаль', cal: 579, protein: 21, fat: 50, carbs: 22,
      portions: [{ label: 'горсть (~20 шт)', grams: 28 }],
    },
    {
      id: uid(), name: 'Макароны (варёные)', cal: 158, protein: 5.8, fat: 0.9, carbs: 31,
      portions: [{ label: 'порция', grams: 200 }],
    },
  ];
}
