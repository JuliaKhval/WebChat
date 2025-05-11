import * as signalR from '@microsoft/signalr'

let connection = null

export function initSignalRConnection() {
    const token = localStorage.getItem('token')

    connection = new signalR.HubConnectionBuilder()
        .withUrl("https://messengertester.somee.com/chatHub ", {
            accessTokenFactory: () => token,
        })
        .withAutomaticReconnect()
        .build()

    // Подключение к хабу
    connection.start()
        .then(() => console.log('SignalR подключён'))
        .catch((err) => {
            console.error('Ошибка подключения SignalR:', err)
        })

    return connection
}

// Безопасный вызов метода
export async function safeInvoke(methodName, ...args) {
    if (!connection || connection.state !== signalR.HubConnectionState.Connected) {
        console.warn(`Не могу вызвать ${methodName}: SignalR не подключён`)
        return
    }

    try {
        await connection.invoke(methodName, ...args)
    } catch (error) {
        console.error(`Ошибка при вызове ${methodName}:`, error)
    }
}

// Подписки на события
export function onReceiveMessage(callback) {
    connection.on('ReceiveMessage', callback)
}

export function onMessageEdited(callback) {
    connection.on('MessageEdited', callback)
}

export function onMessageDeleted(callback) {
    connection.on('MessageDeleted', callback)
}

// Присоединиться к группе чата
export function joinChat(chatId, userId) {
    if (connection && connection.state === signalR.HubConnectionState.Connected) {
        connection.invoke('JoinChat', chatId.toString(), userId.toString())
    }
}