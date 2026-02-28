/**
 * Generates a role-prefixed public display ID.
 *   patient   → PAT-0042
 *   physician → PHY-0017
 * Both users can see each other's IDs in chat and UI.
 */
export function getDisplayId(id: number, role: string): string {
    const prefix = role === 'physician' ? 'PHY' : 'PAT';
    return `${prefix}-${String(id).padStart(4, '0')}`;
}
