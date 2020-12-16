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
  useEffect(() => {
    usersData = users;
  }, [usingUsersContext]);

  useEffect(() => {
    const alreadyDispatched = new Set();
    const notDispatchedCount = { count: 100 };
    const diffAndDispatch = () => {
      setTimeout(() => {
        const chatCursor = GroupChatMsg.find({}, { reactive: false }).fetch();
        const notDispatched = chatCursor.filter(objMsg => !alreadyDispatched.has(objMsg._id));
        notDispatchedCount.count = notDispatched.length;
        
        notDispatched.forEach((msg) => {
          dispatch({
            type: ACTIONS.ADDED,
            value: {
              msg,
              senderData: usersData[msg.sender.id],
            },
          });
          alreadyDispatched.add(msg._id);
        });
        diffAndDispatch();
      }, notDispatchedCount.count >= 10 ? 1000 : 500);
    };
    diffAndDispatch();
    // chatCursor.observe({
    //   added: (obj) => {
    //     console.log('added test 1');
    //     return;
    //     dispatch({
    //       type: ACTIONS.ADDED,
    //       value: {
    //         msg: obj,
    //         senderData: {},
    //       },
    //     });
    //   },
    //   changed: (obj) => {
    //     return;
    //     dispatch({
    //       type: ACTIONS.CHANGED,
    //       value: {
    //         msg: obj,
    //       },
    //     });
    //   },
    //   removed: (obj) => {
    //     return;
    //     dispatch({
    //       type: ACTIONS.REMOVED,
    //       value: {
    //         msg: obj,
    //       },
    //     });
    //   },
    // });
  }, []);

  return null;
};

export default Adapter;
