import { generateFiles } from 'fumadocs-openapi';
import { openapi } from '../lib/openapi.js';

void generateFiles({
  input: openapi,
  output: './content/docs/api',
  per: 'tag',
  includeDescription: true,
});
