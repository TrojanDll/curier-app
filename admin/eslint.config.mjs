import nextConfig from "eslint-config-next";
import tseslint from "typescript-eslint";

/**
 * ESLint flat config (ESLint 9).
 * Используем готовый набор Next.js (next/core-web-vitals + next/typescript +
 * react/react-hooks/jsx-a11y/import) и добавляем небольшие override-ы под
 * наш стиль кода. Плагин @typescript-eslint должен быть подключён в том же
 * объекте конфигурации, где используются его правила.
 */
const config = [
    ...nextConfig,
    {
        plugins: {
            "@typescript-eslint": tseslint.plugin,
        },
        rules: {
            "@typescript-eslint/no-unused-vars": [
                "warn",
                {
                    argsIgnorePattern: "^_",
                    varsIgnorePattern: "^_",
                    caughtErrorsIgnorePattern: "^_",
                    destructuredArrayIgnorePattern: "^_",
                },
            ],
            "no-console": "off",
            "react/no-unescaped-entities": "off",
        },
    },
];

export default config;
