export function inputNumber(event: Event): number | null {
  const value = Number((event.target as HTMLInputElement).value);
  return Number.isFinite(value) ? value : null;
}

export function isEditableTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}
