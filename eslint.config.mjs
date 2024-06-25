import globals from "globals";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default [...compat.extends("google"), {
    languageOptions: {
        globals: {
            ...globals.commonjs,
            ...globals.node,
        },

        ecmaVersion: 11,
        sourceType: "commonjs",
    },

    rules: {
        indent: 0,
        "max-len": "off",
        "comma-dangle": "off",
        "eol-last": "off",
        "object-curly-spacing": "off",

        "space-before-function-paren": ["error", {
            anonymous: "never",
            named: "never",
            asyncArrow: "always",
        }],
    },
}];