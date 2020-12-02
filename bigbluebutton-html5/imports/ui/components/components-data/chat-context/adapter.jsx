import React, { useMemo, useContext, useEffect } from 'react';
import { GroupChatMsg } from '/imports/api/group-chat-msg';
import { ChatContext, ACTIONS } from './context';
import { UsersContext } from '../users-context/context';

const Adapter = () => {
  
  const usingChatContext = useContext(ChatContext);
  const { dispatch } = usingChatContext;
  const usingUsersContext = useContext(UsersContext);
  const { users } = usingUsersContext;
  console.log('shailon', usingUsersContext);
  useEffect(() => {
    const chatCursor = GroupChatMsg.find({}, { sort: { timestamp: 1 } });
   
    chatCursor.observe({
      added: (obj) => {
        console.log('chatAdapter::observe::added', users);
        dispatch({
          type: ACTIONS.ADDED,
          value: {
            msg: obj,
            senderData: users[obj.sender.id],
          },
        });
      },
      changed: (obj) => {
        dispatch({
          type: ACTIONS.CHANGED,
          value: {
            msg: obj,
          },
        });
      },
      removed: (obj) => {
        dispatch({
          type: ACTIONS.REMOVED,
          value: {
            msg: obj,
          },
        });
      },
    });
  }, users);

  return null;
};

export default Adapter;
