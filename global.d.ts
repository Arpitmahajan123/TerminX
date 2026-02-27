// Fix React 19 type compatibility with React Native
// React 19 removed `key` from JSX element props, causing errors when using `key` on components
declare namespace JSX {
  interface IntrinsicAttributes {
    key?: string | number | null | undefined;
  }
}
