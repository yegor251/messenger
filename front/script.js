class ChatApp {
    constructor() {
        this.socket = null;
        this.activeChat = null;
        this.chats = {};
        this.globalName = null;

        this.initEventListeners();

        document.addEventListener('click', (e) => {
            const input = document.getElementById('newChatInput');
            const newChatButton = document.getElementById('newChatButton');

            if (!input.contains(e.target) && !newChatButton.contains(e.target)) {
                input.style.display = 'none';
                input.value = '';
            }
        });
    }

    initEventListeners() {
        document.getElementById('loginButton').addEventListener('click', () => this.handleAuth('login'));
        document.getElementById('registerButton').addEventListener('click', () => this.handleAuth('register'));
        document.getElementById('sendMessageButton').addEventListener('click', () => this.sendMessage());
        document.getElementById('newChatButton').addEventListener('click', () => this.showNewChatInput());
        document.getElementById('newChatInput').addEventListener('keypress', (e) => this.createNewChat(e));
    }

    async handleAuth(action) {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const url = action === 'login' ? '/users/login/' : '/users/register/';
        const data = { username, password };

        try {
            const response = await fetch(`http://127.0.0.1:8000${url}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            const result = await response.json();
            if (result.message || result.user_id) {
                this.globalName = username;
                this.startChat(username, password);
            } else {
                alert(result.error || 'An error occurred');
            }
        } catch (error) {
            console.error('Authentication error:', error);
            alert('Failed to authenticate. Please try again.');
        }
    }

    startChat(username, password) {
        document.getElementById('auth-container').style.display = 'none';
        document.getElementById('chat-container').style.display = 'flex';

        this.socket = new WebSocket(`ws://127.0.0.1:8000/ws/chat/?username=${username}&password=${password}`);
        this.socket.onmessage = (event) => this.handleSocketMessage(event);
    }

    handleSocketMessage(event) {
        const data = JSON.parse(event.data);
        if (data.action === 'all_conversations') {
            this.renderChats(data.data);
        } else if (data.action === 'new_message') {
            this.handleIncomingChatMessage(data.data);
        } else if (data.action === 'mark_as_read') {
            this.handleMarkAsRead(data.data);
        }
    }

    handleMarkAsRead(data) {
        const { reader } = data;
        this.chats[reader] = this.chats[reader].map((msg) => ({
                ...msg,
                is_read: true,
        }));
        if (this.activeChat === reader) {
            this.renderChat(reader);
        }
    }

    renderChats(chats) {
        this.chats = chats;
        const chatsList = document.getElementById('chatsList');
        chatsList.innerHTML = '';

        Object.keys(chats).forEach((username) => {
            this.addChat(username);
        });
    }

    addChat(name) {
        const chatsList = document.getElementById('chatsList');
        const chatItem = document.createElement('div');
        chatItem.textContent = name;
        chatItem.addEventListener('click', () => this.renderChat(name));
        chatsList.appendChild(chatItem);
    }

    renderChat(username) {
        const messagesList = document.getElementById('messagesList');
        this.openChat(username);

        if (!this.chats[username]) {
            this.chats[username] = [];
        }

        this.chats[username].forEach((msg) => {
            const messageItem = document.createElement('div');
            messageItem.textContent = `${msg.sender}: ${msg.text}`;

            // Визуальное отображение статуса прочтения
            if (msg.sender === this.globalName) {
                messageItem.style.backgroundColor = msg.is_read ? '#28a745' : '#007bff';
                messageItem.style.color = 'white';
                messageItem.style.alignSelf = 'flex-end';
            } else {
                messageItem.style.backgroundColor = '#e5e7eb';
            }

            messageItem.style.borderRadius = '8px';
            messageItem.style.margin = '5px';
            messageItem.style.padding = '10px';
            messageItem.style.maxWidth = '60%';

            messagesList.appendChild(messageItem);
        });

        // Отправка запроса на сервер для пометки сообщений как прочитанных
        const unreadMessages = this.chats[username].some((msg) => !msg.is_read && msg.sender !== this.globalName);
        if (unreadMessages) {
            this.socket.send(JSON.stringify({
                action: 'mark_as_read',
                recipient: username,
            }));
        }
    }

    openChat(name) {
        this.activeChat = name;
        const messagesList = document.getElementById('messagesList');
        messagesList.innerHTML = `<h3>${name}</h3>`;
    }

    sendMessage() {
        const messageInput = document.getElementById('messageInput');
        const text = messageInput.value;

        if (text && this.activeChat) {
            if (!this.chats[this.activeChat]) this.chats[this.activeChat] = [];
            this.chats[this.activeChat].push({ sender: this.globalName, text });

            this.renderChat(this.activeChat);

            this.socket.send(JSON.stringify({
                action: 'send_message',
                recipient: this.activeChat,
                text,
            }));

            messageInput.value = '';
        }
    }

    showNewChatInput() {
        const input = document.getElementById('newChatInput');
        input.style.display = 'flex';
        input.focus();
    }

    createNewChat(e) {
        if (e.key === 'Enter') {
            const chatName = e.target.value.trim();
            if (chatName) {
                this.addChat(chatName);
                e.target.value = '';
                e.target.style.display = 'none';
            }
        }
    }

    handleIncomingChatMessage(message) {
        const { sender, text } = message;

        if (!this.chats[sender]) {
            this.chats[sender] = [];
            this.addChat(sender);
        }

        this.chats[sender].push(message);

        if (this.activeChat === sender) {
            this.renderChat(sender);
        }
    }
}

// Initialize the app
new ChatApp();
