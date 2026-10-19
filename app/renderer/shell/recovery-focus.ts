/** Return the button index to focus when Tab would leave the modal. */
export function wrappedFocusIndex(current: number, count: number, shift: boolean): number | null {
  if (count < 1) return null;
  if (shift && current === 0) return count - 1;
  if (!shift && current === count - 1) return 0;
  return null;
}
