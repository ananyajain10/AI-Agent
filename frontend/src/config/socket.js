import socket from "socket.io-client";

let socketInstance = null;

export const InitializeSocket = (projectId) => {
    socketInstance = socket(import.meta.env.VITE_API_URL, {
        auth: {
            token : localStorage.getItem('token')
        },
        query: {
            projectId
        }
    });

    return socketInstance;
}

export const recieveMessage = (eventName, callBack) => {
    socketInstance.on(eventName, callBack);
}

export const sendMessage = (eventName, data) => {
    socketInstance.emit(eventName, data);
}