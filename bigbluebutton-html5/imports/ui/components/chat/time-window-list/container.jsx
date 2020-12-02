import React, { PureComponent } from 'react';
import { withTracker } from 'meteor/react-meteor-data';
import TimeWindowList from './component';
import ChatService from '../service';

class TimeWindowListContainer extends PureComponent {
  render() {
    console.log('TimeWindowListContainer::render', { ...this.props });
    return (
      <TimeWindowList {...this.props} />
    );
  }
}

export default withTracker(({ chatId }) => {
  const hasUnreadMessages = ChatService.hasUnreadMessages(chatId);
  const scrollPosition = ChatService.getScrollPosition(chatId);
  const lastReadMessageTime = ChatService.lastReadMessageTime(chatId);
  console.log('TimeWindowListContainer::withTracker');
  return {
    hasUnreadMessages,
    scrollPosition,
    lastReadMessageTime,
    handleScrollUpdate: ChatService.updateScrollPosition,
    handleReadMessage: ChatService.updateUnreadMessage,
  };
})(TimeWindowListContainer);
