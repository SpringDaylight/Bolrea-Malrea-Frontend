export type RouletteItem = {
  label: string;
  probability: string;
  popcornGain: number;
  expGain: number;
};

export const rouletteItems: RouletteItem[] = [
  { label: "기본팝콘", probability: "50%", popcornGain: 3, expGain: 15 },
  { label: "핫도그세트", probability: "25%", popcornGain: 6, expGain: 20 },
  { label: "팝콘콤보", probability: "15%", popcornGain: 10, expGain: 30 },
  { label: "오징어콤보", probability: "9%", popcornGain: 15, expGain: 50 },
  { label: "치킨잭팟", probability: "1%", popcornGain: 20, expGain: 100 },
];
