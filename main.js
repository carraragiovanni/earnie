const supabase = window.supabase.createClient(
    'https://wjjenusuwyxispmuwspn.supabase.co', 
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqamVudXN1d3l4aXNwbXV3c3BuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDcxOTYyMzEsImV4cCI6MjAyMjc3MjIzMX0.pkcb5ZglJR_Me61WYYyqbGwUjDUhRNvfHqJMEvi9AIs'
);

document.addEventListener('DOMContentLoaded', async () => {

    // Attempt to get the current user's details
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
        console.error('No user logged in or error fetching user:', error);
        window.location.href = '/auth.html';
        return;
    }

    // Check if the user exists in your custom users table
    const { data: users, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('user_id', user.id);

    if (userError) {
        console.error('Error fetching user from custom users table:', userError);
        return;
    }

    // If the user doesn't exist in the custom users table, insert them
    if (users.length === 0) {
        const { data: newUser, error: newUserError } = await supabase
            .from('users')
            .insert([
                { id: user.user_id, email: user.email }
                // Add any other user details you might have and want to store
            ]);

        if (newUserError) {
            console.error('Error inserting user into custom users table:', newUserError);
            return;
        }

        console.log('New user added to custom users table:', newUser);
    } else {
        console.log('User already exists in custom users table:', users[0]);
    }

    // Add event listener for form submission
    document.getElementById('new-conversation-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const phoneNumber = document.getElementById('phone-number').value.trim();
        const messageBody = document.getElementById('message-body').value.trim();

        // Assuming you have a 'conversations' table where each phone number corresponds to a unique conversation
        // And a 'messages' table for storing individual messages linked to those conversations
        // Adjust the logic below based on your actual database schema

        // Step 1: Insert a new conversation or find an existing one by phone number
        // This example simplifies by always creating a new conversation for each message
        const { data: conversationData, error: conversationError } = await supabase
            .from('conversations')
            .insert([{ phone_number: phoneNumber, user_id: user.id , ai_assist_enabled: false}]);

        if (conversationError) {
            console.error('Error creating conversation:', conversationError);
            alert('Failed to create conversation.');
            return;
        }

        const conversationId = conversationData[0].id;

        // Step 2: Insert the message linked to the conversation
        const { error: messageError } = await supabase
            .from('messages')
            .insert([{ body: messageBody, conversation_id: conversationId }]);

        if (messageError) {
            console.error('Error inserting message:', messageError);
            alert('Failed to send message.');
            return;
        }

        alert('Message sent successfully!');
        // Here you would typically also include the logic to update the UI with the new message
        // And potentially a server-side call to Telnyx to actually send the message, which is not shown here
    });
});
