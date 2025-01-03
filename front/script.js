let socket = null;
let activeChat = null;
let chats = {};
let global_name = null;

// Handle login/register
document.getElementById('loginButton').addEventListener('click', () => handleAuth('login'));
document.getElementById('registerButton').addEventListener('click', () => handleAuth('register'));

async function handleAuth(action) {
    const username = document.getElementById('username').value;
    global_name = username
    const password = document.getElementById('password').value;
    const url = action === 'login' ? '/users/login/' : '/users/register/';
    const data = { username, password };

    const response = await fetch(`http://127.0.0.1:8000${url}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });

    const result = await response.json();
    if (result.message || result.user_id) {
        startChat(username, password);
    } else {
        alert(result.error || 'Error occurred');
    }
}

function startChat(username, password) {
    document.getElementById('auth-container').style.display = 'none';
    document.getElementById('chat-container').style.display = 'flex';

    socket = new WebSocket(`ws://127.0.0.1:8000/ws/chat/?username=${username}&password=${password}`);
    socket.onmessage = handleSocketMessage;
}

function handleSocketMessage(event) {
    const data = JSON.parse(event.data);
    console.log(data)
    if (data.action === 'all_conversations') {
        renderChats(data.data);
    } else if (data.action === 'new_message') {
        handleIncomingChatMessage(data.data);
    }
}

function renderChat(username){
    const messagesList = document.getElementById('messagesList');
    openChat(username)

    if (!chats[username]) {
        chats[username] = []
    };

    chats[username].forEach((msg) => {
        const messageItem = document.createElement('div');
        messageItem.textContent = `${msg.sender}: ${msg.text}`;
        messagesList.appendChild(messageItem);
    })
}

function openChat(name) {
    activeChat = name;
    document.getElementById('messagesList').innerHTML = `<h3>${name}</h3>`;
}

function addChat(name) {
    const chatsList = document.getElementById('chatsList');
    const chatItem = document.createElement('div');
    chatItem.textContent = name;
    console.log('add')
    chatItem.onclick = () => {
        console.log('ee')
        activeChat = name;
        renderChat(name)
    };
    chatsList.appendChild(chatItem);
}

function renderChats(list) {
    const chatsList = document.getElementById('chatsList');
    chats = list
    chatsList.innerHTML = '';
    console.log(list)
    Object.keys(list).forEach((username) => {
        addChat(username)
    });
}

document.getElementById('sendMessageButton').addEventListener('click', () => {
    const messageInput = document.getElementById('messageInput');
    const text = messageInput.value;
    console.log(text, activeChat)
    if (text && activeChat) {
        if (!chats[activeChat]) chats[activeChat] = []
        chats[activeChat].push({sender: global_name, text: messageInput.value});
        console.log('send')
        renderChat(activeChat)
        socket.send(JSON.stringify({ action: 'send_message', recipient: activeChat, text }));
        messageInput.value = '';
    }
});

document.getElementById('newChatButton').addEventListener('click', () => {
    const input = document.getElementById('newChatInput');
    input.style.display = 'flex'
    input.focus();
});

document.getElementById('newChatInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const chatName = e.target.value.trim();
        if (chatName) {
            addChat(chatName);
            e.target.value = '';
            e.target.style.display = 'none'
        }
    }
});

function handleIncomingChatMessage(message) {
    const { sender, text, recipient } = message;

    // Добавляем сообщение в соответствующий чат
    if (!chats[sender]) {
        chats[sender] = []
        addChat(sender);
    };
    chats[sender].push(message);

    // Если чат активный, обновляем интерфейс
    console.log(sender)
    if (activeChat === sender) {
        renderChat(sender)
    }
}