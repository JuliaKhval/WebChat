import * as signalR from '@microsoft/signalr';

let connection = null;

export function useChatHub() {
    const startConnection = async () => {
        connection = new signalR.HubConnectionBuilder()
            .withUrl("https://messengertester.somee.com/chatHub")
            .withAutomaticReconnect()
            .build();

        try {
            await connection.start();
            console.log('SignalR Connected');
        } catch (err) {
            console.error('SignalR Connection Error:', err);
        }
    };

    const joinChat = async (chatId, userId) => {
        await connection.invoke('JoinChat', chatId, userId);
    };

    const leaveChat = async (chatId, userId) => {
        await connection.invoke('LeaveChat', chatId, userId);
    };

    const sendMessage = async (chatId, userId, message) => {
        await connection.invoke('SendMessage', chatId, userId, message);
    };

    const onReceiveMessage = (callback) => {
        connection.on("ReceiveMessage", callback);
    };

    const onUserJoined = (callback) => {
        connection.on("UserJoined", callback);
    };

    const onUserLeft = (callback) => {
        connection.on("UserLeft", callback);
    };

    const onMessageEdited = (callback) => {
        connection.on("MessageEdited", callback);
    };

    const onMessageDeleted = (callback) => {
        connection.on("MessageDeleted", callback);
    };

    return {
        startConnection,
        joinChat,
        leaveChat,
        sendMessage,
        onReceiveMessage,
        onUserJoined,
        onUserLeft,
        onMessageEdited,
        onMessageDeleted
    };
}