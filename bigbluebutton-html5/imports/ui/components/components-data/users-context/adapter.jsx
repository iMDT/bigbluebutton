import React, { useMemo, useContext, useEffect } from 'react';
import Users from '/imports/api/users';
import { UsersContext, ACTIONS } from './context';

const Adapter = () => {
  const usingUsersContext = useContext(UsersContext);
  const { dispatch } = usingUsersContext;
  useEffect(() => {
    const usersCursor = Users.find({}, { sort: { timestamp: 1 } });
    usersCursor.observe({
      added: (obj) => {
        console.log("usersAdapter::observe::added", obj);
        dispatch({
          type: ACTIONS.ADDED,
          value: {
            user: obj,
          },
        });
      },
      changed: (obj) => {
        dispatch({
          type: ACTIONS.CHANGED,
          value: {
            user: obj,
          },
        });
      },
      removed: (obj) => {
        dispatch({
          type: ACTIONS.REMOVED,
          value: {
            user: obj,
          },
        });
      },
    });
  }, []);

  return null;
};

export default Adapter;
