import * as signalR from '@microsoft/signalr'

let connection = null

export function useChatHub() {
    const startConnection = async () => {
        connection = new signalR.HubConnectionBuilder()
            .withUrl("https://messengertester.somee.com/chatHub")
            .withAutomaticReconnect()
            .build()

        try {
            await connection.start()
            console.log('SignalR успешно подключён')
        } catch (err) {
            console.error('Ошибка подключения SignalR:', err)
        }
    }

    const joinChat = async (chatId, userId) => {
        await connection.invoke('JoinChat', chatId.toString(), userId.toString())
    }

    const leaveChat = async (chatId, userId) => {
        await connection.invoke('LeaveChat', chatId.toString(), userId.toString())
    }
/*
    const sendMessage = async (chatId, userId, messageContent) => {
        await connection.invoke('SendMessage', chatId.toString(), userId.toString(), messageContent)
    }

    const onReceiveMessage = (callback) => {
        connection.on('ReceiveMessage', callback)
    }

    const onMessageEdited = (callback) => {
        connection.on('MessageEdited', callback)
    }

    const onMessageDeleted = (callback) => {
        connection.on('MessageDeleted', callback)
    }*/

    return {
        startConnection,
        joinChat,
        leaveChat,
        /*sendMessage,
        onReceiveMessage,
        onMessageEdited,
        onMessageDeleted*/
    }
}