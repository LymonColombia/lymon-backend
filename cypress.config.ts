import { defineConfig } from 'cypress';
import webpackPreprocessor from '@cypress/webpack-preprocessor';
import path from 'path';
import fs from 'fs';

function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return {};

  const env: Record<string, string> = {};
  const content = fs.readFileSync(envPath, 'utf-8');
  content.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      const value = valueParts.join('=').trim();
      env[key.trim()] = value;
    }
  });
  return env;
}

const envVars = loadEnv();

export default defineConfig({
  e2e: {
    specPattern: 'cypress/security/**/*.cy.ts',
    supportFile: 'cypress/support/index.ts',
    video: false,
    screenshotOnRunFailure: false,
    requestTimeout: 10000,
    responseTimeout: 10000,
    setupNodeEvents(on) {
      on(
        'file:preprocessor',
        webpackPreprocessor({
          webpackOptions: {
            resolve: { extensions: ['.ts', '.js'] },
            module: {
              rules: [
                {
                  test: /\.ts$/,
                  use: [
                    {
                      loader: 'ts-loader',
                      options: {
                        configFile: path.resolve(
                          __dirname,
                          'cypress/tsconfig.json',
                        ),
                        transpileOnly: true,
                      },
                    },
                  ],
                  exclude: /node_modules/,
                },
              ],
            },
          },
        }),
      );
    },
  },
  env: {
    BASE_URL:
      process.env.BASE_URL || envVars.BASE_URL || 'http://127.0.0.1:3000',
    AUTH_EMAIL:
      process.env.AUTH_EMAIL ||
      envVars.AUTH_EMAIL ||
      'villajaramillofelipe4@gmail.com',
    AUTH_PASSWORD:
      process.env.AUTH_PASSWORD || envVars.AUTH_PASSWORD || 'SecurePass123!',
    PROPERTY_ID:
      process.env.PROPERTY_ID ||
      envVars.PROPERTY_ID ||
      '69d96bc1de51ea1f09cd03ae',
  },
});
