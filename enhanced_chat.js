const userIdInput = document.getElementById('userIdInput');
const connectButton = document.getElementById('connectButton');
const chat = document.getElementById('chat');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const fileInput = document.getElementById('fileInput');
const fileButton = document.getElementById('fileButton');

let localConnection;
let remoteConnection;
let sendChannel;
let receiveChannel;
let socket;
let roomId;

function handleReceiveMessage(event) {
    if (typeof event.data === 'string') {
        const message = document.createElement('div');
        message.textContent = 'Friend: ' + event.data;
        chat.appendChild(message);
    } else {
        const blob = new Blob([event.data]);
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'file';
        link.textContent = 'Download file';
        chat.appendChild(link);
    }
}

function createConnection() {
    localConnection = new RTCPeerConnection();
    sendChannel = localConnection.createDataChannel('sendChannel');
    sendChannel.onmessage = handleReceiveMessage;

    localConnection.onicecandidate = e => {
        if (e.candidate) {
            socket.send(JSON.stringify({ type: 'candidate', candidate: e.candidate, roomId }));
        }
    };

    localConnection.ondatachannel = e => {
        receiveChannel = e.channel;
        receiveChannel.onmessage = handleReceiveMessage;
    };

    socket.onmessage = async event => {
        const message = JSON.parse(event.data);

        if (message.roomId !== roomId) return;

        if (message.type === 'offer') {
            await localConnection.setRemoteDescription(new RTCSessionDescription(message.offer));
            const answer = await localConnection.createAnswer();
            await localConnection.setLocalDescription(answer);
            socket.send(JSON.stringify({ type: 'answer', answer, roomId }));
        } else if (message.type === 'answer') {
            await localConnection.setRemoteDescription(new RTCSessionDescription(message.answer));
        } else if (message.type === 'candidate') {
            await localConnection.addIceCandidate(new RTCIceCandidate(message.candidate));
        }
    };
}

sendButton.onclick = () => {
    const message = document.createElement('div');
    message.textContent = 'You: ' + messageInput.value;
    chat.appendChild(message);

    sendChannel.send(messageInput.value);
    messageInput.value = '';
};

fileButton.onclick = () => {
    const file = fileInput.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = () => {
            const arrayBuffer = reader.result;
            sendChannel.send(arrayBuffer);
        };
        reader.readAsArrayBuffer(file);
    }
};

connectButton.onclick = () => {
    roomId = userIdInput.value;

    socket = new WebSocket('wss://your-signaling-server.example.com');
    socket.onopen = () => {
        createConnection();
        socket.send(JSON.stringify({ type: 'join', roomId }));
    };

    socket.onmessage = async event => {
        const message = JSON.parse(event.data);

        if (message.roomId !== roomId) return;

        if (message.type === 'join') {
            const offer = await localConnection.createOffer();
            await localConnection.setLocalDescription(offer);
            socket.send(JSON.stringify({ type: 'offer', offer, roomId }));
        }
    };
};
