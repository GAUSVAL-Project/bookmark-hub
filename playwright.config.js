import { defineConfig } from '@playwright/test';
const baseURL=process.env.TEST_BASE_URL||'http://127.0.0.1:4173/bookmark-hub/';
export default defineConfig({testDir:'./tests/browser',timeout:60000,use:{baseURL,channel:process.env.BROWSER_CHANNEL||'chrome'},webServer:process.env.TEST_BASE_URL?undefined:{command:'node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4173',url:baseURL,reuseExistingServer:!process.env.CI}});
