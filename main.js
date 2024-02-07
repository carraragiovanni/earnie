document.addEventListener('DOMContentLoaded', () => {
    // Initialize Supabase client with your project parameters
    const supabase = window.supabase.createClient(
        'https://wjjenusuwyxispmuwspn.supabase.co', 
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqamVudXN1d3l4aXNwbXV3c3BuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDcxOTYyMzEsImV4cCI6MjAyMjc3MjIzMX0.pkcb5ZglJR_Me61WYYyqbGwUjDUhRNvfHqJMEvi9AIs'
    );

    // Check if user is logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
            console.log('User is logged in');
            // Optionally, fetch and display conversations or other user-specific data here
            // fetchConversations();
        } else {
            // No user session found, redirect to the login page
            window.location.href = '/auth.html';
        }
    });
});

// Example function to fetch conversations (you need to implement this based on your data model)
async function fetchConversations() {
    const { data, error } = await supabase
        .from('conversations')
        .select('*');

    if (error) {
        console.error('Error fetching conversations:', error);
    } else {
        const container = document.getElementById('conversations-container');
        data.forEach(conversation => {
            const div = document.createElement('div');
            div.textContent = `Conversation ID: ${conversation.conversation_id}`; // Adjust according to your data fields
            container.appendChild(div);
        });
    }
}
