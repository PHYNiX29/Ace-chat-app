document.getElementById('uploadForm').addEventListener('submit', async (event) => {
    event.preventDefault();

    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];
    console.log(file);

    const reader = new FileReader();
    
    // This reads the file as a buffer to send it via WebSocket
    reader.onload = function(event) {
        const fileBuffer = event.target.result;

        // Emit the file data through the socket
        socket.emit('upload', {
            fileBuffer: fileBuffer,
            originalname: file.name,
            mimetype: file.type,
        });

        console.log('File upload request sent via socket.');
    };

    reader.onerror = function(error) {
        console.error("File reading error:", error);
    };

    // Start reading the file
    reader.readAsArrayBuffer(file);
});

const socket = io();

const input = document.querySelector("#input-txt");
const chatbox = document.querySelector(".chatTxt");

function createMessageElement(value){
    const newTextElement = document.createElement("div");
    newTextElement.textContent = value;
    newTextElement.classList.add("chatMessage")
    chatbox.append(newTextElement)
}

async function sendData(message) {
    socket.emit('private_message', { message });
    createMessageElement(message);
}
socket.emit('register-admin', "connected");

let cache = [];
async function fetchChats() {
    const response = await fetch("/allChatsAdmin");
    const data = await response.json();
    if (cache.length <= data.messages.length) {
        let newMessages = data.messages.slice(cache.length);
        newMessages.forEach(element => {
            createMessageElement(element);
        });
        cache = data.messages;
        input.value = "";
    }
}

socket.on('recieve_message', (data) => {
    console.log("Received");
    const { message } = data;
    cache.push(message);
    createMessageElement(message);
});

input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        sendData(input.value);
    }
});

fetchChats();
// setInterval(fetchChats, 100);

// Event listener for socket connection to handle upload responses
socket.on('error', (data) => {
    console.error('Upload error:', data.error);
    // Handle the error display logic (e.g., show a message to the user)
});

socket.on('upload_success', (data) => {
    console.log('File uploaded successfully:', data.message);
    // Handle success display (e.g., show a success message)
});
