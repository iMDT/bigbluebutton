import React, {
  useEffect,
  useContext,
  createContext,
  useReducer,
} from 'react';

import Users from '/imports/api/users';
import Auth from '/imports/ui/services/auth';

export const ACTIONS = {
  TEST: 'test',
  ADDED: 'added',
  CHANGED: 'changed',
  REMOVED: 'removed',
  USER_STATUS_CHANGED: 'user_status_changed',
};

const ROLE_MODERATOR = Meteor.settings.public.user.role_moderator;

export const getGroupingTime = () => Meteor.settings.public.chat.grouping_messages_window;
export const getGroupChatId = () => Meteor.settings.public.chat.public_group_id;
export const getLoginTime = () => (Users.findOne({ userId: Auth.userID }) || {}).loginTime || 0;

const generateTimeWindow = (timestamp) => {
  const groupingTime = getGroupingTime();
  dateInMilliseconds = Math.floor(timestamp);
  groupIndex = Math.floor(dateInMilliseconds / 30000)
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
    // const sender = Users.findOne({ userId: message.sender.id }, { fields: { avatar: 1, role: 1 } });
    const {
      _id,
      ...restMsg
    } = msg;
    // console.log('restMsg', restMsg, senderData);
    const senderInfo = {
      id: senderData.userId,
      avatar: senderData?.avatar,
      color: senderData.color,
      isModerator: senderData?.role === ROLE_MODERATOR,
      name: senderData.name,
      isOnline: !!senderData,
    };

    const indexValue = chatIndex ? (chatIndex + 1) : 1;
    const messageKey = key + '-' + indexValue;
    const tempGroupMessage = {
      [messageKey]: {
        ...restMsg,
        key: messageKey,
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
        chatIndexes: {},
        preJoinMessages: {},
        posJoinMessages: {},
      };
    } else {
      state[msg.chatId] = {
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
    console.log('ChatContext::formatMsg::msgBuilder::tempGroupMessage', tempGroupMessage);
    
    const messageGroupsKeys = Object.keys(tempGroupMessage);
    messageGroupsKeys.forEach(key => messageGroups[key] = tempGroupMessage[key]);
  } else {
    if (groupMessage) {
      if (groupMessage.sender.id === stateMessages.lastSender.id) {
        messageGroups[keyName + '-' + stateMessages.chatIndexes[keyName]] = {
          ...groupMessage,
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

      return {
        ...state,
        ...action.value,
      };
    }
    case ACTIONS.ADDED: {
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
      if (state[msg.chatId]){
        delete state[msg.chatId];
      }
      return state;
    }
    case ACTIONS.USER_STATUS_CHANGED: {
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
    default: {
      throw new Error('Unexpected action');
    }
  }
};

export const ChatContextProvider = (props) => {
  const [chatContextState, chatContextDispatch] = useReducer(reducer, {});
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