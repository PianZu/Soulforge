// Define the type as a string literal union
export type WeaponType = 'sword' | 'bow' | 'magic';

// Re-export as a value for runtime (TypeScript will strip the type, but this ensures the file has an export)
export const WeaponTypeValues = ['sword', 'bow', 'magic'] as const;

