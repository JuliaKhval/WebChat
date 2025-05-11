import * as signalR from '@microsoft/signalr'

let connection = null;
let currentUserId = null;
let currentChatId = null;

async function connectSignalR() {
    const token = localStorage.getItem("token");

    connection = new signalR.HubConnectionBuilder()
        .withUrl("https://messengertester.somee.com/chatHub", {
            accessTokenFactory: () => localStorage.getItem("token")
        })
        .build();

    // Получение новых сообщений
    connection.on("ReceiveMessage", (chatId, userId, message) => {
        if (chatId === currentChatId) {
            addMessageToDOM(chatId, userId, message);
        }
    });

    // Редактирование сообщения
    connection.on("MessageEdited", (chatId, messageId, newText) => {
        const msgEl = document.querySelector(`[data-message-id="${messageId}"]`);
        if (msgEl) {
            msgEl.innerHTML = `[${msgEl.dataset.userId}]: ${newText}`;
        }
    });

    // Удаление сообщения
    connection.on("MessageDeleted", (chftId, messageId) => {
        const msgEl = document.querySelector(`[data-message-id="${messageId}"]`);
        if (msgEl) {
            msgEl.remove();
        }
    });

    try {
        await connection.start();
        console.log("SignalR подключён");
        if (currentUserId) {
            await loadChats(currentUserId);
        }
    } catch (err) {
        console.error("Ошибка подключения к SignalR:", err);
    }
}