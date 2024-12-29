const withMT = require("@material-tailwind/react/utils/withMT");

module.exports = withMT({
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {},
    colors: {
      transparent: 'transparent',
      primary: '#272727',
      secondary : '#000000',
    },
    fontFamily: {
      sans: ["hubFont", "sans-serif"],
    },
  },
  plugins: [],
});

