import React, { PureComponent } from 'react';
import { withTracker } from 'meteor/react-meteor-data';
import TimeWindowChatItem from './component';

const isDefaultPoll = (pollText) => {
  const pollValue = pollText.replace(/<br\/>|[ :|%\n\d+]/g, '');
  switch (pollValue) {
    case 'A': case 'AB': case 'ABC': case 'ABCD':
    case 'ABCDE': case 'YesNo': case 'TrueFalse':
      return true;
    default:
      return false;
  }
};
export default class TimeWindowChatItemContainer extends PureComponent {
  render() {
    console.log('TimeWindowChatItemContainer::render', { ...this.props });
    const { message } = this.props;
    const messages = message.content;

    const user = message.sender;
    const messageKey = message.key;
    const { time } = message;
    return (
      <TimeWindowChatItem
        {
        ...{
          messages,
          isDefaultPoll,
          user,
          time,
          messageKey,
          ...this.props,
        }
        }
      />
    );
  }
}
