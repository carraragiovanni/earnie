import { supabase } from './supabaseClient.js';
import { checkAuth } from './auth/auth.js';
import { fetchConversations } from './db/conversation.js';
import { logError } from './utils/utils.js';

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const user = await checkAuth();
        if (!user) {
            window.location.href = '/auth.html';
            return;
        }

        const conversations = await fetchConversations();
        console.log(conversations);
    } catch (error) {
        logError(error);
    }
});
