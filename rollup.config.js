import typescript from 'rollup-plugin-typescript2'
import commonjs from '@rollup/plugin-commonjs'
import external from 'rollup-plugin-peer-deps-external'
import json from '@rollup/plugin-json'
import nodeResolve from '@rollup/plugin-node-resolve'
import sourceMaps from 'rollup-plugin-sourcemaps'

import pkg from './package.json'

export default {
  input: 'src/index.ts',
  output: [
    {
      file: pkg.main,
      format: 'es',
      sourcemap: true
    }
  ],
  plugins: [
    external(),
    json(),
    typescript({ exclude: '/test/**', useTsconfigDeclarationDir: true }),
    commonjs(),
    nodeResolve({ browser: true, preferBuiltins: true }),
    sourceMaps()
  ]
}
