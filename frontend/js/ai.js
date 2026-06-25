/* =============================================================
   PERSONAL DIARY - ai.js
   Modular AI Logic for Mood Detection and Summarization.
   This uses heuristics but is structured asynchronously to 
   allow easy replacement with an API (like Gemini) in the future.
   ============================================================= */

class AIManager {
    /**
     * Analyzes text and returns a predicted mood.
     * @param {string} text - The diary entry text.
     * @returns {Promise<string>} - Resolves to 'Happy', 'Sad', 'Angry', 'Excited', or 'Neutral'.
     */
    static async detectMood(text) {
        if (!text || text.trim() === '') return 'Neutral';

        // Simulate network delay for realism
        await new Promise(res => setTimeout(res, 600));

        const lowerText = text.toLowerCase();
        
        const moodKeywords = {
            Happy: ['happy', 'joy', 'wonderful', 'great', 'good', 'smile', 'love', 'fantastic', 'amazing', 'glad'],
            Sad: ['sad', 'cry', 'depressed', 'terrible', 'awful', 'down', 'miss', 'heartbreak', 'lonely', 'tears', 'hurt'],
            Angry: ['angry', 'mad', 'furious', 'hate', 'annoyed', 'frustrated', 'rage', 'stupid', 'worst', 'irritated'],
            Excited: ['excited', 'thrilled', 'wow', 'omg', 'can\'t wait', 'awesome', 'pumped', 'best']
        };

        let scores = { Happy: 0, Sad: 0, Angry: 0, Excited: 0 };

        for (const [mood, words] of Object.entries(moodKeywords)) {
            for (const word of words) {
                // Count occurrences of each keyword
                const regex = new RegExp(`\\b${word}\\b`, 'g');
                const matches = lowerText.match(regex);
                if (matches) {
                    scores[mood] += matches.length;
                }
            }
        }

        let maxScore = 0;
        let detectedMood = 'Neutral';

        for (const [mood, score] of Object.entries(scores)) {
            if (score > maxScore) {
                maxScore = score;
                detectedMood = mood;
            }
        }

        return detectedMood;
    }

    /**
     * Generates a short summary of the given text.
     * @param {string} text - The diary entry text.
     * @returns {Promise<string>} - A shortened summary.
     */
    static async summarizeText(text) {
        if (!text || text.trim() === '') return '';

        // Simulate network delay
        await new Promise(res => setTimeout(res, 800));

        // Simple heuristic: Take the first sentence or two.
        // A real AI would perform abstractive summarization.
        const sentences = text.match(/[^.!?]+[.!?]+/g);
        
        if (!sentences || sentences.length <= 1) {
            // If it's very short, just return the text up to 100 chars
            return text.length > 100 ? text.substring(0, 97) + '...' : text;
        }

        // Return first two sentences as summary
        let summary = sentences.slice(0, 2).join(' ').trim();
        if (summary.length > 150) {
            summary = summary.substring(0, 147) + '...';
        }
        
        return summary;
    }
}
