export function validateDisplayName(value: unknown): string | null {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('displayName' in value) ||
    typeof value.displayName !== 'string'
  ) {
    return null;
  }

  const displayName = value.displayName.trim();

  if (displayName.length === 0 || displayName.length > 100) {
    return null;
  }

  return displayName;
}

export function validatesDeleteConfirmation(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    'confirmation' in value &&
    value.confirmation === 'DELETE'
  );
}
