import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const gradeNumericToGPA = (gradeNumeric: number): number => {
  // Kenyan scale: A=12, A-=11, B+=10, B=9, B-=8, C+=7, C=6, C-=5, D+=4, D=3, D-=2, E=1
  // GPA scale: A=4.0, A-=3.7, B+=3.3, B=3.0, B-=2.7, C+=2.3, C=2.0, C-=1.7, D+=1.3, D=1.0, D-=0.7, E=0
  const conversionMap: { [key: number]: number } = {
    12: 4.0, 11: 3.7, 10: 3.3, 9: 3.0, 8: 2.7, 7: 2.3,
    6: 2.0, 5: 1.7, 4: 1.3, 3: 1.0, 2: 0.7, 1: 0.0
  };
  const rounded = Math.round(gradeNumeric);
  return conversionMap[rounded] ?? (gradeNumeric / 3);
};
