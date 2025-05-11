import * as signalR from '@microsoft/signalr'

const connection = new signalR.HubConnectionBuilder()
    .withUrl('https://messengertester.somee.com/chatHub', {
        accessTokenFactory: () => localStorage.getItem('token')
    })
    .withAutomaticReconnect() // авто-переподключение
    .build()

// Запуск подключения
export async function startSignalRConnection() {
    try {
        await connection.start()
        console.log('SignalR подключен')
    } catch (err) {
        console.error('Ошибка подключения SignalR:', err)
        setTimeout(() => startSignalRConnection(), 5000)
    }
}

// Слушатель входящих сообщений
export function onNewMessage(callback) {
    connection.on('ReceiveMessage', (message) => {
        callback(message)
    })
}

// Отправка сообщения через SignalR
export function sendMessageToHub(chatId, userId, content) {
    connection.invoke('SendMessage', chatId, userId, content)
}