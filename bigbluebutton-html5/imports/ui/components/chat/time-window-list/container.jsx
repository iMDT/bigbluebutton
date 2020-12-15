import React, { PureComponent } from 'react';
import { withTracker } from 'meteor/react-meteor-data';
import TimeWindowList from './component';
import Auth from '/imports/ui/services/auth';
import ChatService, { UserSentMessageCollection } from '../service';
export default class TimeWindowListContainer extends PureComponent {
  render() {
    const { chatId } = this.props;
    const hasUnreadMessages = ChatService.hasUnreadMessages(chatId);
    const scrollPosition = ChatService.getScrollPosition(chatId);
    const lastReadMessageTime = ChatService.lastReadMessageTime(chatId);
    const userSentMessage = UserSentMessageCollection.findOne({ userId: Auth.userID, sent: true });
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
          userSentMessage,
          setUserSentMessage: ChatService.setUserSentMessage,
        }
        }
      />
    );
  }
}
