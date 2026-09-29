import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// Teach tailwind-merge our custom font size so `text-tally` isn't mistaken for a colour.
const twMerge = extendTailwindMerge({
  extend: { classGroups: { 'font-size': [{ text: ['tally'] }] } }
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
