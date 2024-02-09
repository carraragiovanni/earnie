// Correct import paths for app.js based on the given structure
import { supabase } from './supabaseClient.js';
import { checkAuth } from './auth/auth.js'; // Corrected path
import { fetchConversations } from './db/conversation.js'; // Corrected path
import { logError } from './utils/utils.js'; // Path was correct

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const user = await checkAuth(supabase); // Ensure checkAuth accepts supabase client if needed
        if (!user) {
            window.location.href = '/auth.html';
            return;
        }

        const conversations = await fetchConversations(supabase); // Ensure fetchConversations accepts supabase client if needed
        console.log(conversations);
    } catch (error) {
        logError(error);
    }
});
