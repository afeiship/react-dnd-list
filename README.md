# react-dnd-list
> A lightweight, accessible draggable list component built with dnd-kit.

[![version][version-image]][version-url]
[![license][license-image]][license-url]
[![size][size-image]][size-url]
[![download][download-image]][download-url]

## installation
```shell
npm install -S @jswork/react-dnd-list
```

## usage
1. import css
  ```scss
  @import "~@jswork/react-dnd-list/dist/style.css";

  // or use sass
  @import "~@jswork/react-dnd-list/dist/style.scss";

  // customize your styles:
  $react-dnd-list-options: ()
  ```
2. import js
  ```js
  import React from 'react';
  import ReactDndList from '@jswork/react-dnd-list';

  export default () => {
    return (
      <div className="p-5 border w-4/5 mx-auto mt-10 bg-gray-100 rounded-md hover:bg-gray-200">
        <ReactDndList className="debug-red inline-block p-1" />
      </div>
    );
  };

  ```

## preview
- https://afeiship.github.io/react-dnd-list/

## license
Code released under [the MIT license](https://github.com/afeiship/react-dnd-list/blob/master/LICENSE.txt).

[version-image]: https://img.shields.io/npm/v/@jswork/react-dnd-list
[version-url]: https://npmjs.org/package/@jswork/react-dnd-list

[license-image]: https://img.shields.io/npm/l/@jswork/react-dnd-list
[license-url]: https://github.com/afeiship/react-dnd-list/blob/master/LICENSE.txt

[size-image]: https://img.shields.io/bundlephobia/minzip/@jswork/react-dnd-list
[size-url]: https://github.com/afeiship/react-dnd-list/blob/master/dist/react-dnd-list.min.js

[download-image]: https://img.shields.io/npm/dm/@jswork/react-dnd-list
[download-url]: https://www.npmjs.com/package/@jswork/react-dnd-list
