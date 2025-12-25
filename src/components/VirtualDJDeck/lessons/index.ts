/**
 * Lesson Index - All available tutorial lessons
 */

import { TutorialLesson } from '../tutorialTypes';
import { yourFirstMixLesson } from './yourFirstMix';
import { beatmatching101Lesson } from './beatmatching101';

// All available lessons in recommended order
export const allLessons: TutorialLesson[] = [
  yourFirstMixLesson,
  beatmatching101Lesson,
];

// Export individual lessons for direct imports
export { yourFirstMixLesson } from './yourFirstMix';
export { beatmatching101Lesson } from './beatmatching101';

// Get lesson by ID
export function getLessonById(id: string): TutorialLesson | undefined {
  return allLessons.find(lesson => lesson.id === id);
}

// Get next lesson after current one
export function getNextLesson(currentLessonId: string): TutorialLesson | undefined {
  const currentIndex = allLessons.findIndex(lesson => lesson.id === currentLessonId);
  if (currentIndex >= 0 && currentIndex < allLessons.length - 1) {
    return allLessons[currentIndex + 1];
  }
  return undefined;
}
