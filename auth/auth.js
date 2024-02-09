import { supabase } from '../supabaseClient.js';

export async function checkAuth() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw new Error(error.message);
    return user;
}