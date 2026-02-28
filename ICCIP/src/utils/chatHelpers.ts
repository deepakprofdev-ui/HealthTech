import { ChatPayload } from '../types';

/**
 * Safely parses the raw string from the database.
 * If it's a new JSON stringified payload, returns it.
 * If it's an old legacy plaintext message, wraps it in a Payload interface.
 */
export function parseMessageContent(messageString: string): ChatPayload {
    try {
        const parsed = JSON.parse(messageString);
        if (parsed && typeof parsed.text === 'string') {
            return parsed as ChatPayload;
        }
    } catch (e) {
        // Ignore JSON parse errors for legacy plaintext messages
    }
    return {
        text: messageString,
        status: 'read' // Legacy messages can be assumed read
    };
}
