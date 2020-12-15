import React, { PureComponent } from 'react';
import { withTracker } from 'meteor/react-meteor-data';
import TimeWindowChatItem from './component';
import ChatService from '../../service';

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
    // const { message } = ;
    const messages = this.props.message.content;

    const user = this.props.message.sender;
    const messageKey = this.props.message.key;
    const time = this.props.message.time;
    return (
      <TimeWindowChatItem
        {
        ...{
          read: this.props.message.read,
          messages,
          isDefaultPoll,
          user,
          time,
          messageKey,
          handleReadMessage: ChatService.updateUnreadMessage,
          ...this.props,
        }
        }
      />
    );
  }
}
