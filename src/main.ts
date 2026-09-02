import { createSSRApp } from "vue";
import App from "./App.vue";
import { identityRuntime } from "./application/identity/runtime";
export function createApp() {
  const app = createSSRApp(App);
  void identityRuntime.initialize();
  return {
    app,
  };
}
