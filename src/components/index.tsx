import noop from '@jswork/noop';
import classNames from 'classnames';
import React, { Component, HTMLAttributes } from 'react';

const CLASS_NAME = 'react-dnd-list';
const VERSION = '__VERSION__';

export type ReactDndListProps = {
  /**
   * Additional CSS class names to apply to the component.
   */
  className?: string;
  /**
   * Default value.
   */
  value?: any;
  /**
   * The change handler.
   */
  onChange?: Function;
} & HTMLAttributes<HTMLDivElement>;

export default class ReactDndList extends Component<ReactDndListProps> {
  static displayName = CLASS_NAME;
  static version = VERSION;
  static defaultProps = { onChange: noop };

  handleClick = () => {
    console.log('click me!');
  };

  render() {
    const { className, value, onChange, ...rest } = this.props;

    return (
      <div data-component={CLASS_NAME} className={classNames(CLASS_NAME, className)}{...rest}>
        <button onClick={this.handleClick}>
          Enjoy coding~
        </button>
      </div>
    );
  }
}
