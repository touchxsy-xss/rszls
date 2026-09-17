export const promptCategories = ["全部", "人物", "地点", "照片故事", "人生事件"] as const;

export function isValidExperimentDay(day: number) {
  return Number.isInteger(day) && day >= 1 && day <= 7;
}
