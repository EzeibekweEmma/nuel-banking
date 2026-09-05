import eslint from '@eslint/js';
import { globalIgnores } from 'eslint/config';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import tseslint from 'typescript-eslint';

const tsconfigRootDir = dirname(fileURLToPath(import.meta.url));

export default tseslint.config(
  globalIgnores(['dist/**', 'coverage/**']),
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { parserOptions: { tsconfigRootDir } },
  },
);
