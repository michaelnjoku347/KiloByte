import type { AgeRating } from '../types'

export function ageLabel(age: AgeRating | undefined): string {
  if (age === '16') return '16+'
  if (age === '13') return '13+'
  if (age === '10') return '10+'
  return 'Everyone'
}
