import React from 'react';
import cx from 'classnames';

const CLASS_NAME = 'react-dnd-list';
const VERSION = '__VERSION__';

export interface ReactDndListProps {
  /**
   * Additional CSS class names to apply to the component.
   */
  className?: string;
  /**
   * The content of the button.
   */
  children: React.ReactNode;
}

const ReactDndList = (props: ReactDndListProps) => {
  const { className, ...rest } = props;
  return <button className={cx(CLASS_NAME, className)} {...rest} />;
};

ReactDndList.defaultProps = {};
ReactDndList.version = VERSION;

export default ReactDndList;