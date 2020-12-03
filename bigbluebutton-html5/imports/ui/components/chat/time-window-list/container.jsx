import React, { PureComponent } from 'react';
import { withTracker } from 'meteor/react-meteor-data';
import TimeWindowList from './component';
import ChatService from '../service';

export default class TimeWindowListContainer extends PureComponent {
  render() {
    const { chatId } = this.props;
    const hasUnreadMessages = ChatService.hasUnreadMessages(chatId);
    const scrollPosition = ChatService.getScrollPosition(chatId);
    const lastReadMessageTime = ChatService.lastReadMessageTime(chatId);
    console.log('TimeWindowListContainer::render', { ...this.props });
    return (
      <TimeWindowList
        {
        ...{
          ...this.props,
          hasUnreadMessages,
          scrollPosition,
          lastReadMessageTime,
          handleScrollUpdate: ChatService.updateScrollPosition,
          handleReadMessage: ChatService.updateUnreadMessage,
        }
        }
      />
    );
  }
}
