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

const supabase = window.supabase.createClient('https://wjjenusuwyxispmuwspn.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqamVudXN1d3l4aXNwbXV3c3BuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDcxOTYyMzEsImV4cCI6MjAyMjc3MjIzMX0.pkcb5ZglJR_Me61WYYyqbGwUjDUhRNvfHqJMEvi9AIs');

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

document.getElementById('new-conversation-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const phoneNumber = document.getElementById('phone-number').value.trim();
    const messageBody = document.getElementById('message-body').value.trim();
    const user = supabase.auth.user();

    if (!phoneNumber || !messageBody || !user) {
        alert('Missing information');
        return;
    }

    // Step 1: Insert the new message into the 'messages' table, assuming each message initiates a new conversation
    const { data: messageData, error: messageError } = await supabase
        .from('messages')
        .insert([
            // Adjust according to your schema. Example assumes conversation_id is managed internally or through another logic
            { body: messageBody, phone_number: phoneNumber, user_id: user.id }
        ]);

    if (messageError) {
        console.error('Error inserting message:', messageError);
        alert('Failed to send message.');
        return;
    }

    console.log('Message sent:', messageData);
    alert('Message sent successfully!');

    // After message insertion, you could also call the Telnyx API server-side to send the SMS
    // This part should be handled securely server-side
});
