import React, {
  useEffect,
  useContext,
  createContext,
  useReducer,
} from 'react';

import Users from '/imports/api/users';
import Auth from '/imports/ui/services/auth';
import ChatLogger from '/imports/ui/components/chat/chat-logger/ChatLogger';

const CHAT_CONFIG = Meteor.settings.public.chat;
const PUBLIC_CHAT_KEY = CHAT_CONFIG.public_id;
const PUBLIC_GROUP_CHAT_KEY = CHAT_CONFIG.public_group_id;

export const ACTIONS = {
  TEST: 'test',
  ADDED: 'added',
  CHANGED: 'changed',
  REMOVED: 'removed',
  USER_STATUS_CHANGED: 'user_status_changed',
  LAST_READ_MESSAGE_TIMESTAMP_CHANGED: 'last_read_message_timestamp_changed',
};

const ROLE_MODERATOR = Meteor.settings.public.user.role_moderator;

export const getGroupingTime = () => Meteor.settings.public.chat.grouping_messages_window;
export const getGroupChatId = () => Meteor.settings.public.chat.public_group_id;
export const getLoginTime = () => (Users.findOne({ userId: Auth.userID }) || {}).loginTime || 0;

const generateTimeWindow = (timestamp) => {
  const groupingTime = getGroupingTime();
  dateInMilliseconds = Math.floor(timestamp);
  groupIndex = Math.floor(dateInMilliseconds / groupingTime)
  date = groupIndex * 30000;
  return date;
}

export const ChatContext = createContext();

const formatMsg = ({ msg, senderData }, state) => {
  const timeWindow = generateTimeWindow(msg.timestamp);
  const userId = msg.sender.id;
  const keyName = userId + '-' + timeWindow;

  const msgBuilder = ({msg, senderData}, chat) => {
    const msgTimewindow = generateTimeWindow(msg.timestamp);
    const key = msg.sender.id + '-' + msgTimewindow;
    const chatIndex = chat?.chatIndexes[key];
    const {
      _id,
      ...restMsg
    } = msg;
    const senderInfo = {
      id: senderData?.userId || msg.sender.id,
      avatar: senderData?.avatar,
      color: senderData?.color ,
      isModerator: senderData?.role === ROLE_MODERATOR, // TODO: get isModerator from message
      name: senderData?.name || msg.sender.name,
      isOnline: !!senderData,
    };

    const indexValue = chatIndex ? (chatIndex + 1) : 1;
    const messageKey = key + '-' + indexValue;
    const tempGroupMessage = {
      [messageKey]: {
        ...restMsg,
        key: messageKey,
        lastTimestamp: msg.timestamp,
        read: msg.chatId === PUBLIC_CHAT_KEY && msg.timestamp <= getLoginTime() ? true : false,
        content: [
          { id: msg.id, text: msg.message, time: msg.timestamp },
        ],
        sender: senderInfo,
      }
    };
  
    return [tempGroupMessage, msg.sender, indexValue];
  };

  let stateMessages = state[msg.chatId];

  if (!stateMessages) {
    if (msg.chatId === getGroupChatId()) {
      state[msg.chatId] = {
        count: 0,
        chatIndexes: {},
        preJoinMessages: {},
        posJoinMessages: {},
      };
    } else {
      state[msg.chatId] = {
        count: 0,
        lastSender: '',
        chatIndexes: {},
        messageGroups: {},
      };
      stateMessages = state[msg.chatId];
    }

    stateMessages = state[msg.chatId];
  }

  const forPublicChat = msg.timestamp < getLoginTime() ? stateMessages.preJoinMessages : stateMessages.posJoinMessages;
  const forPrivateChat = stateMessages.messageGroups;
  const messageGroups = msg.chatId === getGroupChatId() ? forPublicChat : forPrivateChat;
  const timewindowIndex = stateMessages.chatIndexes[keyName];
  const groupMessage = messageGroups[keyName + '-' + timewindowIndex];

  if (!groupMessage || (groupMessage && groupMessage.sender.id !== stateMessages.lastSender.id)) {
    const [tempGroupMessage, sender, newIndex] = msgBuilder({msg, senderData}, stateMessages);
    stateMessages.lastSender = sender;
    stateMessages.chatIndexes[keyName] = newIndex;
    stateMessages.lastTimewindow = keyName + '-' + newIndex;
    ChatLogger.trace('ChatContext::formatMsg::msgBuilder::tempGroupMessage', tempGroupMessage);
    
    const messageGroupsKeys = Object.keys(tempGroupMessage);
    messageGroupsKeys.forEach(key => messageGroups[key] = tempGroupMessage[key]);
    stateMessages.count = (stateMessages.count + 1);
  } else {
    if (groupMessage) {
      if (groupMessage.sender.id === stateMessages.lastSender.id) {
        messageGroups[keyName + '-' + stateMessages.chatIndexes[keyName]] = {
          ...groupMessage,
          lastTimestamp: msg.timestamp,

          read: msg.chatId === PUBLIC_CHAT_KEY && msg.timestamp <= getLoginTime() ? true : false,
          content: [
            ...groupMessage.content,
            { id: msg.id, text: msg.message, time: msg.timestamp }
          ],
        };
      }
    }
  }

  return state;
}



const reducer = (state, action) => {
  switch (action.type) {
    case ACTIONS.TEST: {
      ChatLogger.info(ACTIONS.TEST);
      return {
        ...state,
        ...action.value,
      };
    }
    case ACTIONS.ADDED: {
      ChatLogger.info(ACTIONS.ADDED);
      const newState = formatMsg(action.value, state);
      return {...newState};
    }
    case ACTIONS.CHANGED: {
      return {
        ...state,
        ...action.value,
      };
    }
    case ACTIONS.REMOVED: {
      ChatLogger.info(ACTIONS.REMOVED);
      if (state[msg.chatId]){
        delete state[msg.chatId];
      }
      return state;
    }
    case ACTIONS.USER_STATUS_CHANGED: {
      ChatLogger.info(ACTIONS.USER_STATUS_CHANGED);
      const newState = {
        ...state,
      };
      const affectedChats = [];
      // select all groups of users
      Object.keys(newState).forEach(chatId => {
        const affectedGroups = Object.keys(newState[chatId])
          .filter(groupId => groupId.startsWith(action.value.userId));
        if (affectedGroups.length) {
          affectedChats[chatId] = affectedGroups;
        }
      });

      //Apply change to new state
      Object.keys(affectedChats).forEach((chatId) => {
        // force new reference
        newState[chatId] = {
          ...newState[chatId]
        };
        //Apply change
        affectedChats[chatId].forEach(groupId => {
          newState[chatId][groupId] = {
            ...newState[chatId][groupId]
          };
          newState[chatId][groupId].status = action.value.status;
        });
      });
      return newState
    }
    case ACTIONS.LAST_READ_MESSAGE_TIMESTAMP_CHANGED: {
      ChatLogger.info(ACTIONS.LAST_READ_MESSAGE_TIMESTAMP_CHANGED);
      const { timestamp, chatId } = action.value;
      const newState = {
        ...state,
      };
      const selectedChatId = chatId === PUBLIC_CHAT_KEY ? PUBLIC_GROUP_CHAT_KEY : chatId;
      const chat = state[selectedChatId];
      ['posJoinMessages','preJoinMessages','messageGroups'].forEach( messageGroupName => {
        const messageGroup = chat[messageGroupName];
        if (messageGroup){
          const timeWindowsids = Object.keys(messageGroup);
          timeWindowsids.forEach( timeWindowId => {
            const timeWindow = messageGroup[timeWindowId];
            if(timeWindow) {
              if (!timeWindow.read) {
                if (timeWindow.lastTimestamp <= timestamp){
                  newState[selectedChatId][messageGroupName][timeWindowId] = {
                    ...timeWindow,
                    read: true,
                  };
                  newState[selectedChatId] = {
                    ...newState[selectedChatId],
                    count: (newState[selectedChatId].count - 1) < 0 ? 0 : (newState[selectedChatId].count - 1),
                  };
                  newState[selectedChatId][messageGroupName] = {
                    ...newState[selectedChatId][messageGroupName],
                  };
                  newState[chatId === PUBLIC_CHAT_KEY ? PUBLIC_GROUP_CHAT_KEY : chatId][messageGroupName][timeWindowId] = {
                    ...newState[selectedChatId][messageGroupName][timeWindowId],
                  };
                }
              }
            }
          });
        }

      });
      return newState;
    }
    default: {
      throw new Error(`Unexpected action: ${JSON.stringify(action)}`);
    }
  }
};

export const ChatContextProvider = (props) => {
  const [chatContextState, chatContextDispatch] = useReducer(reducer, {});
  ChatLogger.debug('dispatch', chatContextDispatch);
  return (
    <ChatContext.Provider value={
      {
        dispatch: chatContextDispatch,
        chats: chatContextState,
        ...props,
      }
    }
    >
      {props.children}
    </ChatContext.Provider>
  );
}


export const ContextConsumer = Component => props => (
  <ChatContext.Consumer>
    {contexts => <Component {...props} {...contexts} />}
  </ChatContext.Consumer>
);

export default {
  ContextConsumer,
  ChatContextProvider,
}