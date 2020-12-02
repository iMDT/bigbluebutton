import React, { PureComponent } from 'react';
import { findDOMNode } from 'react-dom';
import PropTypes from 'prop-types';
import { defineMessages, injectIntl } from 'react-intl';
import _ from 'lodash';
import Button from '/imports/ui/components/button/component';
import {
  List, AutoSizer, CellMeasurer, CellMeasurerCache,
} from 'react-virtualized';
import { styles } from './styles';
import TimeWindowChatItem from './time-window-chat-item/container';



const CHAT_CONFIG = Meteor.settings.public.chat;
const PUBLIC_CHAT_KEY = CHAT_CONFIG.public_id;
const SYSTEM_CHAT_TYPE = CHAT_CONFIG.type_system;

const propTypes = {
  messages: PropTypes.arrayOf(PropTypes.object).isRequired,
  scrollPosition: PropTypes.number,
  chatId: PropTypes.string.isRequired,
  hasUnreadMessages: PropTypes.bool.isRequired,
  handleScrollUpdate: PropTypes.func.isRequired,
  intl: PropTypes.shape({
    formatMessage: PropTypes.func.isRequired,
  }).isRequired,
  id: PropTypes.string.isRequired,
  lastReadMessageTime: PropTypes.number,
  handleReadMessage: PropTypes.func.isRequired,
};

const defaultProps = {
  scrollPosition: null,
  lastReadMessageTime: 0,
  contextChat: {
    messageGroups:{},
    preJoinMessages:{},
    posJoinMessages:{},
  }
};

const intlMessages = defineMessages({
  moreMessages: {
    id: 'app.chat.moreMessages',
    description: 'Chat message when the user has unread messages below the scroll',
  },
  emptyLogLabel: {
    id: 'app.chat.emptyLogLabel',
    description: 'aria-label used when chat log is empty',
  },
});



const sysMessagesIds = {
  welcomeId: `${SYSTEM_CHAT_TYPE}-welcome-msg`,
  moderatorId: `${SYSTEM_CHAT_TYPE}-moderator-msg`
 };

class TimeWindowList extends PureComponent {
  constructor(props) {
    super(props);
    this.cache = new CellMeasurerCache({
      fixedWidth: true,
      minHeight: 18,
    });
    
    this.userScrolledBack = false;
    this.handleScrollUpdate = _.debounce(this.handleScrollUpdate.bind(this), 150);
    this.rowRender = this.rowRender.bind(this);
    this.resizeRow = this.resizeRow.bind(this);
    this.systemMessagesResized = {};

    this.state = {
      scrollArea: null,
      shouldScrollToPosition: false,
      scrollPosition: 0,
      userScrolledBack: false,
      lastMessage: {},
    };

    this.listRef = null;
    this.virualRef = null;

    this.lastWidth = 0;

    this.scrollInterval = null;
  }

  componentDidMount() {
    const {
      scrollPosition,
    } = this.props;
    this.scrollTo(scrollPosition);

    const { childNodes } = this.messageListWrapper;
    this.virualRef = childNodes ? childNodes[0].firstChild : null;

    if (this.virualRef) {
      this.virualRef.style.direction = document.documentElement.dir;
    }
  
    this.scrollInterval = setInterval(() => {
      const {
        scrollArea,
      } = this.state;

      if (scrollArea.scrollTop + scrollArea.offsetHeight === scrollArea.scrollHeight) {
        this.setState({
          userScrolledBack: false,
        });
      }
    }, 100);
    
  }

  componentDidUpdate(prevProps) {
    console.log('TimeWindowList::componentDidUpdate', {...this.props}, {...prevProps});
    if (this.virualRef) {
      if (this.virualRef.style.direction !== document.documentElement.dir) {
        this.virualRef.style.direction = document.documentElement.dir;
      }
    }

    const {
      scrollPosition,
      chatId,
      timeWindowsValues,
    } = this.props;

    const {
      chatId: prevChatId,
      timeWindowsValues: prevTimeWindowsValues,
    } = prevProps;

    const {
      lastMessage: stateLastMsg,
    } = this.state;

    if (prevChatId !== chatId) {
      this.cache.clearAll();
      setTimeout(() => this.scrollTo(scrollPosition), 300);
    } 

    const lastMsg = timeWindowsValues[timeWindowsValues.length - 1];
    const prevLastMsg = prevTimeWindowsValues[prevTimeWindowsValues.length - 1];

    if (lastMsg?.content?.length > prevLastMsg?.content?.length
      || lastMsg?.id !== stateLastMsg?.id) {
      this.resizeRow(timeWindowsValues.length-1);
    }

    
  }

  componentWillUnmount() {
    clearInterval(this.scrollInterval);
  }

  handleScrollUpdate(position, target) {
    const {
      handleScrollUpdate,
    } = this.props;

    if (position !== null && position + target?.offsetHeight === target?.scrollHeight) {
      // I used one because the null value is used to notify that
      // the user has sent a message and the message list should scroll to bottom
      handleScrollUpdate(1);
      return;
    }

    handleScrollUpdate(position || 1);
  }

  resizeRow(idx) {
    this.cache.clear(idx);
    if (this.listRef) {
      this.listRef.recomputeRowHeights(idx);
      //    this.listRef.forceUpdate();
    }
  }

  scrollTo(position = null) {
    if (position) {
      setTimeout(() => this.setState({
        shouldScrollToPosition: true,
        scrollPosition: position,
      }), 200);
    }
  }

  rowRender({
    index,
    parent,
    style,
    key,
  }) {
    const {
      handleReadMessage,
      lastReadMessageTime,
      id,
      timeWindowsValues,
    } = this.props;
    
    const { scrollArea, } = this.state;
    const message = timeWindowsValues[index];
  
    // it's to get an accurate size of the welcome message because it changes after initial render
    if (message.sender === null && !this.systemMessagesResized[index]) {
      setTimeout(() => this.resizeRow(index), 500);
      this.systemMessagesResized[index] = true;
    }

    return (
      <CellMeasurer
        key={key}
        cache={this.cache}
        columnIndex={0}
        parent={parent}
        rowIndex={index}
      >
        <span
          style={style}
          key={`span-${key}-${index}`}
        >
          <TimeWindowChatItem
            style={style}
            handleReadMessage={handleReadMessage}
            key={key}
            message={message}
            messageId={message.id}
            chatAreaId={id}
            lastReadMessageTime={lastReadMessageTime}
            scrollArea={scrollArea}
          />
        </span>
      </CellMeasurer>
    );
  }

  renderUnreadNotification() {
    const {
      intl,
      hasUnreadMessages,
    } = this.props;
    const { userScrolledBack } = this.state;

    if (hasUnreadMessages && userScrolledBack) {
      return (
        <Button
          aria-hidden="true"
          className={styles.unreadButton}
          color="primary"
          size="sm"
          key="unread-messages"
          label={intl.formatMessage(intlMessages.moreMessages)}
          onClick={()=> this.setState({
            userScrolledBack: false,
          })}
        />
      );
    }

    return null;
  }

  render() {
    const {
      timeWindowsValues,
    } = this.props;
    const {
      scrollArea,
      userScrolledBack,
    } = this.state;
    console.log('TimeWindowList::render', {...this.props},  {...this.state});

    return (
      [<div 
        onMouseDown={()=> {
          this.setState({
            userScrolledBack: true,
          });
        }}
        onWheel={(e) => {
          if (e.deltaY < 0) {
            this.setState({
              userScrolledBack: true,
            });
            this.userScrolledBack = true
          }
        }}
        className={styles.messageListWrapper}
        key="chat-list"
        data-test="chatMessages"
        ref={node => this.messageListWrapper = node}
      >
        <AutoSizer>
          {({ height, width }) => {
            if (width !== this.lastWidth) {
              this.lastWidth = width;
              this.cache.clearAll();
            }
            
            return (
              <List
                ref={(ref) => {
                  if (ref !== null) {
                    this.listRef = ref;

                    if (!scrollArea) {
                      this.setState({ scrollArea: findDOMNode(this.listRef) });
                    }
                  }
                }}
                isScrolling={true}
                rowHeight={this.cache.rowHeight}
                className={styles.messageList}
                rowRenderer={this.rowRender}
                rowCount={timeWindowsValues.length}
                height={height}
                width={width}
                overscanRowCount={5}
                deferredMeasurementCache={this.cache}
                scrollToIndex={!userScrolledBack ? timeWindowsValues.length - 1 : undefined}
              />
            );
          }}
        </AutoSizer>
      </div>,
      this.renderUnreadNotification()]
    );
  }
}

TimeWindowList.propTypes = propTypes;
TimeWindowList.defaultProps = defaultProps;

export default injectIntl(TimeWindowList);
