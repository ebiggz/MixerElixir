module.exports = {
    "parserOptions": {
        "ecmaVersion": 9
    },
    "env": {
      "browser": true,
      "es6": true
    },
    "extends": "eslint:recommended",
    "rules": {
        "no-console": 0, // Enable the use of console
        "indent": [1, "tab"],
        "quotes": [
            "error",
            "single"
        ],
        "semi": [
            "error",
            "always"
        ],
        "space-before-function-paren": [
            "error",
            "never"
        ],
        "no-undef": "warn",
        "no-unused-vars": "warn"
    },
    "globals": {
        "$": false,
        "chrome": false,
        "Vue": false
    }
};
