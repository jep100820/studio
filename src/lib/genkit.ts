'use server';
import { genkit, configureGenkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

configureGenkit({
  plugins: [
    googleAI({
      apiVersion: ['v1', 'v1beta'],
    }),
  ],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});

export { ai } from 'genkit/ai';
