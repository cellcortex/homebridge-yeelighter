import babel from "rollup-plugin-babel";
import resolve from "rollup-plugin-node-resolve";
import commonjs from "rollup-plugin-commonjs";

const extensions = [".ts", ".js"];

export default {
  input: "src/index.ts",
  output: {
    file: "dist/index.js",
    format: "cjs"
  },
  plugins: [
    resolve({
      jsnext: true,
      extensions
    }),
    babel({
      extensions,
      exclude: "node_modules/**" // only transpile our source code
    }),
    commonjs({
      include: "node_modules/**",
      namedExports: {
        // "node_modules/homebridge/lib/platformAccessory.js": ["PlatformAccessory"]
        // "node_modules/hap-nodejs": ["hap-nodejs"]
        // "node_modules/react-dom/index.js": ["render", "createElement", "findDOMNode", "createPortal"],
        // "node_modules/react-is/index.js": ["isForwardRef"]
      }
    })
  ]
};
