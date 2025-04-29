import { FlatCompat } from "@eslint/eslintrc";
import tseslint from "typescript-eslint";
import importPlugin from "eslint-plugin-import";

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
});

export default tseslint.config(
  {
    ignores: [".next"],
  },
  ...compat.extends("next/core-web-vitals"),
  {
    files: ["**/*.ts", "**/*.tsx"],
    extends: [
      ...tseslint.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
    ],
    plugins: {
      import: importPlugin,
    },
    rules: {
      "@typescript-eslint/array-type": "off",
      "@typescript-eslint/consistent-type-definitions": "off",
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/no-misused-promises": [
        "error",
        { checksVoidReturn: { attributes: false } },
      ],
      // "no-console": "error",
      "import/order": [
          "warn",
          {
            "groups": [
              "builtin",   // Node内置
              "external",  // npm包
              "internal",  // 项目内部
              "parent",    // 父目录
              "sibling",   // 同级
              "index"      // 目录索引
            ],
            "pathGroups": [
              {
                "pattern": "react",
                "group": "external",
                "position": "before"
              },
              {
                "pattern": "@/**",  // 给别名路径特殊待遇
                "group": "internal",
                "position": "before"
              }
            ],
            "newlines-between": "always", // 分组间空行
            // 一定要手动修改下方的值，因为pathGroupsExcludedImportTypes
            // 的默认值是["builtin", "external", "object"]，
            // 因此，假如我们不重新赋值，那么我们在pathGroups中
            // 定义的有关react的配置，就会被排除（因为它属于external），设置的position: before
            // 并不会生效，我们会发现eslint还是提示我们应该将antd在react之前import
            // 所以再强调一遍，一定要修改pathGroupsExcludedImportTypes的值
            "pathGroupsExcludedImportTypes": ["builtin"],
            "alphabetize": {              // 字母表排序
              "order": "asc",
              "caseInsensitive": true
            }
          }
        ]
    },
  },
  {
    linterOptions: {
      reportUnusedDisableDirectives: true,
    },
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
  },
);
