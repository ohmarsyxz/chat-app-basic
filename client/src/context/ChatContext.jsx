import { createContext, useCallback, useEffect, useState } from "react";
import { baseUrl, getRequest, postRequest } from "../utils/services";
import { io } from "socket.io-client";

export const ChatContext = createContext();

export const ChatContextProvider = ({ children, user }) => {
  const [userChats, setUserChats] = useState([]);
  const [isUserChatsLoading, setIsUserChatsLoading] = useState(false);
  const [userChatsError, setUserChatsError] = useState(null);
  const [potentialChats, setPotentialChats] = useState([]);
  const [currentChat, setCurrentChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isMessagesLoading, setIsMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState(null);
  const [sendTextMessageError, setSendTextMessageError] = useState(null);
  const [newMessage, setNewMessage] = useState(null);
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [allUsers, setAllUsers] = useState([]);

  // initial socket
  useEffect(() => {
    const newSocket = io("http://localhost:3000");
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [user]);

  // add online users
  useEffect(() => {
    if (socket === null) return;
    socket.emit("addNewUser", user?._id);
    socket.on("getOnlineUsers", (res) => {
      setOnlineUsers(res);
    });
    return () => {
      socket.off("getOnlineUsers");
    };
  }, [socket]);

  // send message
  useEffect(() => {
    if (socket === null) return;

    const recipientId = currentChat?.members?.find((id) => id !== user?._id);

    socket.emit("sendMessage", { ...newMessage, recipientId });
  }, [newMessage]);

  // receive message and notifications
  useEffect(() => {
    if (socket === null) return;

    socket.on("getMessage", (res) => {
      if (currentChat?._id !== res.chatId) return;

      setMessages((prev) => [...prev, res]);
    });

    socket.on("getNotification", (res) => {
      const isChatOpen = currentChat?.members.some((id) => id === res.senderId);

      if (isChatOpen) {
        setNotifications((prev) => [{ ...res, isRead: true }, ...prev]);
      } else {
        setNotifications((prev) => [res, ...prev]);
      }
    });

    return () => {
      socket.off("getMessage");
      socket.off("getNotification");
    };
  }, [socket, currentChat]);

  useEffect(() => {
    const getUsers = async () => {
      if (!user?._id) return;

      try {
        const response = await getRequest(`${baseUrl}/users`);

        if (response.error) {
          console.error("Error fetching users:", response);
          return;
        }

        const pChats = response.filter((u) => {
          if (user._id === u._id) return false;

          if (!userChats?.length) return true;

          const isChatCreated = userChats.some((chat) =>
            chat.members.includes(u._id)
          );

          return !isChatCreated;
        });

        setPotentialChats(pChats);
        setAllUsers(response);
      } catch (error) {
        console.error("Failed to fetch users:", error);
      }
    };

    getUsers();
  }, [user?._id, userChats]);

  useEffect(() => {
    const getUserChats = async () => {
      if (!user?._id) return;

      setIsUserChatsLoading(true);
      setUserChatsError(null);

      try {
        const response = await getRequest(`${baseUrl}/chats/${user._id}`);

        if (response.error) {
          setUserChatsError(response);
          return;
        }

        setUserChats(response);
      } catch (error) {
        setUserChatsError(error.message);
      } finally {
        setIsUserChatsLoading(false);
      }
    };

    getUserChats();
  }, [user?._id]);

  useEffect(() => {
    const getMessages = async () => {
      if (!currentChat?._id) return;

      setIsMessagesLoading(true);
      setMessagesError(null);

      try {
        const response = await getRequest(
          `${baseUrl}/messages/${currentChat._id}`
        );

        if (response.error) {
          setMessagesError(response);
          return;
        }

        setMessages(response);
      } catch (error) {
        setMessagesError(error.message);
      } finally {
        setIsMessagesLoading(false);
      }
    };

    getMessages();
  }, [currentChat?._id]);

  const sendTextMessage = useCallback(
    async (textMessage, sender, currentChatId, setTextMessage) => {
      if (!textMessage) return console.log("You must type something...");

      const response = await postRequest(
        `${baseUrl}/messages`,
        JSON.stringify({
          chatId: currentChatId,
          senderId: sender._id,
          text: textMessage,
        })
      );

      if (response.error) {
        return setSendTextMessageError(response);
      }

      setNewMessage(response);
      setMessages((prev) => [...prev, response]);
      setTextMessage("");
    },
    []
  );

  const updateCurrentChat = useCallback((chat) => {
    setCurrentChat(chat);
  }, []);

  const createChat = useCallback(async (firstId, secondId) => {
    if (!firstId || !secondId) return;

    try {
      const response = await postRequest(
        `${baseUrl}/chats`,
        JSON.stringify({ firstId, secondId })
      );

      if (response.error) {
        console.error("Error creating chat:", response);
        return;
      }

      setUserChats((prev) => [...prev, response]);
      setCurrentChat(response);
    } catch (error) {
      console.error("Failed to create chat:", error);
    }
  }, []);

  const sendMessage = useCallback(
    async (message) => {
      if (!currentChat?._id || !user?._id || !message) return;

      try {
        const response = await postRequest(
          `${baseUrl}/messages`,
          JSON.stringify({
            chatId: currentChat._id,
            senderId: user._id,
            text: message,
          })
        );

        if (response.error) {
          console.error("Error sending message:", response);
          return;
        }

        setMessages((prev) => [...prev, response]);
      } catch (error) {
        console.error("Failed to send message:", error);
      }
    },
    [currentChat?._id, user?._id]
  );

  const markAllNotificationsAsRead = useCallback((notifications) => {
    const mNotifications = notifications.map((n) => {
      return { ...n, isRead: true };
    });
    setNotifications(mNotifications);
  }, []);

  const markNotificationsAsRead = useCallback(
    (n, userChats, user, notifications) => {
      // find chat to open

      const desiredChat = userChats.find((chat) => {
        const chatMembers = [user._id, n.senderId];
        const isDesiredChat = chat?.members.every((member) => {
          return chatMembers.includes(member);
        });
        return isDesiredChat;
      });

      // mark notification as read
      const mNotifications = notifications.map((el) => {
        if (n.senderId === el.senderId) {
          return { ...n, isRead: true };
        } else {
          return el;
        }
      });

      updateCurrentChat(desiredChat);
      setNotifications(mNotifications);
    },
    []
  );

  const markThisUserNotificationAsRead = useCallback(
    (thisUserNotifications, notifications) => {
      // mark notifications as read

      const mNotifications = notifications.map((el) => {
        let notification;

        thisUserNotifications.forEach((n) => {
          if (n.senderId === el.senderId) {
            notification = { ...n, isRead: true };
          } else {
            notification = el;
          }
        });

        return notification;
      });
      setNotifications(mNotifications);
    },
    []
  );

  return (
    <ChatContext.Provider
      value={{
        userChats,
        isUserChatsLoading,
        userChatsError,
        potentialChats,
        currentChat,
        messages,
        isMessagesLoading,
        messagesError,
        createChat,
        updateCurrentChat,
        sendMessage,
        sendTextMessage,
        onlineUsers,
        notifications,
        allUsers,
        markAllNotificationsAsRead,
        markNotificationsAsRead,
        markThisUserNotificationAsRead,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
