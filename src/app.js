import { logError } from './utils/utils.js'; 
import { checkAuth } from './api/auth/auth.js';
import { fetchConversations } from './conversation/conversations.js';

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const user = await checkAuth(supabase);
        if (!user) {
            window.location.href = '/auth.html';
            return;
        }

        const teamId = user.teamId;

        const conversations = await fetchConversations(teamId);
        console.log(conversations);
    } catch (error) {
        logError(error);
    }
});