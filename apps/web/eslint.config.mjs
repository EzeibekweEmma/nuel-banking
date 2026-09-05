import eslint from '@eslint/js';
import { globalIgnores } from 'eslint/config';
import nextPlugin from '@next/eslint-plugin-next';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import tseslint from 'typescript-eslint';

const tsconfigRootDir = dirname(fileURLToPath(import.meta.url));

export default tseslint.config(
  globalIgnores(['.next/**', 'next-env.d.ts', 'out/**', 'build/**']),
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: { '@next/next': nextPlugin },
    rules: nextPlugin.configs.recommended.rules,
    languageOptions: { parserOptions: { tsconfigRootDir } },
  },
);
