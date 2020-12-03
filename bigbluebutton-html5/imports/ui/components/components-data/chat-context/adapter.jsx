import React, { useMemo, useContext, useEffect } from 'react';
import { GroupChatMsg } from '/imports/api/group-chat-msg';
import { ChatContext, ACTIONS } from './context';
import { UsersContext } from '../users-context/context';

let usersData = {};

const Adapter = () => {
  const usingChatContext = useContext(ChatContext);
  const { dispatch } = usingChatContext;
  const usingUsersContext = useContext(UsersContext);
  const { users } = usingUsersContext;
  console.log('chatAdapter::body::users', users);
  useEffect(()=> {
    usersData = users;
  }, [usingUsersContext]);

  useEffect(() => {
    const chatCursor = GroupChatMsg.find({}, { sort: { timestamp: 1 } });
    chatCursor.observe({
      added: (obj) => {
        console.log('chatAdapter::observe::added', usersData);
        dispatch({
          type: ACTIONS.ADDED,
          value: {
            msg: obj,
            senderData: usersData[obj.sender.id],
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
  }, []);

  return null;
};

export default Adapter;
