// Assuming user-related DB operations other than those in conversation.js
import { supabase } from '../supabaseClient.js';

export async function getUserDetails(userId) {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId);
    if (error) throw new Error(error.message);
    return data;
}