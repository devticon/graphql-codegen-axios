import { Config } from './_types';

export const runPrettierIfExists = async (config: Config, content: string) => {
  if (config.prettier === false) {
    return content;
  }
  try {
    const prettier = require('prettier');
    return prettier.format(content, { parser: 'typescript' });
  } catch (e) {
    return content;
  }
};
