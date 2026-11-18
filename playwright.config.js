import { defineConfig } from '@playwright/test';
export default defineConfig({testDir:'./e2e',timeout:30000,use:{launchOptions:{args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']},baseURL:'http://127.0.0.1:5173'},webServer:{command:'npm run dev -- --port 5173',url:'http://127.0.0.1:5173',reuseExistingServer:false}});
