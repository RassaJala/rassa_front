/// <reference types="vite/client" />

// React Native global that @/common/apiErrors.ts guards with `typeof __DEV__`.
// The web app never defines it at runtime — declaring it keeps the shared
// module type-checkable from the web project.
declare const __DEV__: boolean;
